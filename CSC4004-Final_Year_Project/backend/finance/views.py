import csv
from datetime import date
from decimal import Decimal, InvalidOperation
from io import BytesIO, StringIO

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.mail import EmailMessage, send_mail
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q, Sum
from django.http import HttpResponse, FileResponse
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.permissions import IsFinancePrivileged, has_finance_privilege
from users.notifications import notify_user, notify_users
from .models import (Budget, Expense, Approval, BudgetTransaction, report_ref,
                     FinancialSummaryRequest, FinanceNotification, FinanceAuditLog)
from .serializers import (BudgetSerializer, ExpenseSerializer, ApprovalSerializer,
                          BudgetTransactionSerializer, FinancialSummaryRequestSerializer,
                          FinanceNotificationSerializer, FinanceAuditLogSerializer)
from .reports import _money, _render_report_file, _report_filename, _format_date

MONEY_ZERO = Decimal('0.00')


class FinancePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


def _date_param(value, field_name, required=False):
    if not value:
        if required:
            raise ValidationError({field_name: 'This date is required.'})
        return None
    parsed = parse_date(str(value))
    if not parsed:
        raise ValidationError({field_name: 'Use YYYY-MM-DD.'})
    return parsed


def _movement(tx):
    if tx.action_type in ('TOP_UP', 'REFUND'):
        return tx.amount
    if tx.action_type == 'DEDUCTION':
        return -tx.amount
    # REJECTION is legacy/non-cash. ADJUSTMENT is represented by before/after.
    if tx.action_type == 'ADJUSTMENT':
        return tx.balance_after - tx.balance_before
    return MONEY_ZERO


def _filter_transactions(qs, start=None, end=None, budget_id=None, action_type=None):
    if start:
        qs = qs.filter(timestamp__date__gte=start)
    if end:
        qs = qs.filter(timestamp__date__lte=end)
    if budget_id:
        qs = qs.filter(budget_id=budget_id)
    if action_type:
        qs = qs.filter(action_type=action_type.upper())
    return qs


def _collect_financial_report(start=None, end=None, budget_id=None, action_type=None, reference=None):
    if start and end and start > end:
        raise ValidationError({'end': 'End date cannot be before start date.'})

    base = BudgetTransaction.objects.select_related('budget', 'expense', 'performed_by')
    period_qs = _filter_transactions(base, start, end, budget_id, action_type)

    # Opening balance is derived from all cash movements before the selected period.
    opening_qs = base
    if budget_id:
        opening_qs = opening_qs.filter(budget_id=budget_id)
    if start:
        opening_qs = opening_qs.filter(timestamp__date__lt=start)
    else:
        opening_qs = opening_qs.none()
    opening_balance = sum((_movement(tx) for tx in opening_qs.iterator()), MONEY_ZERO)

    income = period_qs.filter(action_type='TOP_UP').aggregate(v=Sum('amount'))['v'] or MONEY_ZERO
    deductions = period_qs.filter(action_type='DEDUCTION').aggregate(v=Sum('amount'))['v'] or MONEY_ZERO
    refunds = period_qs.filter(action_type='REFUND').aggregate(v=Sum('amount'))['v'] or MONEY_ZERO
    adjustments = sum((_movement(tx) for tx in period_qs.filter(action_type='ADJUSTMENT').iterator()), MONEY_ZERO)
    net_movement = income - deductions + refunds + adjustments
    closing_balance = opening_balance + net_movement

    statement = []
    running = opening_balance
    for tx in period_qs.order_by('timestamp', 'id'):
        movement = _movement(tx)
        debit = -movement if movement < 0 else MONEY_ZERO
        credit = movement if movement > 0 else MONEY_ZERO
        if budget_id:
            before, after = tx.balance_before, tx.balance_after
        else:
            before, after = running, running + movement
        running += movement
        statement.append({
            'date': timezone.localtime(tx.timestamp).date(),
            'reference': tx.reference,
            'type': tx.action_type,
            'description': tx.notes or (tx.expense.description if tx.expense else ''),
            'budget': tx.budget.department if tx.budget else '',
            'debit': debit,
            'credit': credit,
            'balance_before': before,
            'balance_after': after,
            'performed_by': tx.performed_by.username if tx.performed_by else 'System',
        })

    expense_qs = Expense.objects.select_related('budget', 'requested_by', 'processed_by')
    if start:
        expense_qs = expense_qs.filter(date_requested__date__gte=start)
    if end:
        expense_qs = expense_qs.filter(date_requested__date__lte=end)
    if budget_id:
        expense_qs = expense_qs.filter(budget_id=budget_id)

    return {
        'reference': reference or report_ref(),
        'generated_at': timezone.localtime(timezone.now()),
        'period': {'start': start, 'end': end},
        'summary': {
            'opening_balance': opening_balance,
            'funds_added': income,
            'approved_expenditure': deductions,
            'refunds': refunds,
            'adjustments': adjustments,
            'net_movement': net_movement,
            'closing_balance': closing_balance,
            'pending_expenses': expense_qs.filter(status='PENDING').count(),
            'approved_expenses': expense_qs.filter(status='APPROVED').count(),
            'rejected_expenses': expense_qs.filter(status='REJECTED').count(),
        },
        'statement': statement,
    }


def _decimal_from_request(value, field_name='amount'):
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        raise ValidationError({field_name: 'A valid amount is required.'})
    if amount <= 0:
        raise ValidationError({field_name: 'Amount must be greater than zero.'})
    return amount


def _audit(actor, action, obj, details=''):
    FinanceAuditLog.objects.create(actor=actor, action=action, object_type=obj.__class__.__name__,
                                   object_reference=getattr(obj, 'reference', str(obj.pk)), details=details)


def _notify(recipient, kind, title, message, expense=None, report_request=None):
    notification = FinanceNotification.objects.create(recipient=recipient, kind=kind, title=title, message=message,
                                                      expense=expense, report_request=report_request)
    notification_type = {
        'EXPENSE_APPROVED': 'EXPENSE_APPROVED',
        'EXPENSE_REJECTED': 'EXPENSE_REJECTED',
        'REPORT_READY': 'REPORT_READY',
        'REPORT_REJECTED': 'REPORT_REJECTED',
        'ACTION_REQUIRED': 'GENERAL',
    }.get(kind, 'GENERAL')
    notify_user(recipient, title, message, notification_type=notification_type, link='/finance', send_email=False)
    return notification


def _notify_finance_team(title, message, expense=None, report_request=None):
    User = get_user_model()
    recipients = User.objects.filter(Q(is_superuser=True) | Q(has_finance_privilege=True), is_active=True).distinct()
    notifications = [
        FinanceNotification(
            recipient=u,
            kind='ACTION_REQUIRED',
            title=title,
            message=message,
            expense=expense,
            report_request=report_request,
        )
        for u in recipients
    ]
    if notifications:
        FinanceNotification.objects.bulk_create(notifications)
    notify_users(
        recipients=recipients,
        title=title,
        message=message,
        notification_type='EXPENSE_SUBMITTED' if expense else 'GENERAL',
        link='/finance',
        send_email=False,
    )


def _send_expense_email(expense_id):
    expense = Expense.objects.select_related('requested_by', 'budget', 'processed_by').get(pk=expense_id)
    if not expense.requested_by.email:
        return
    body = [f"Hello {expense.requested_by.username},", '', f"Your expense request {expense.reference} has been {expense.status.lower()}.",
            f"Description: {expense.description}", f"Amount: {_money(expense.amount)}"]
    if expense.status == 'REJECTED':
        body.append(f"Reason: {expense.rejection_reason}")
    send_mail(f"Expense {expense.reference}: {expense.status.title()}", '\n'.join(body),
              getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@department.local'), [expense.requested_by.email], fail_silently=True)


class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = FinancePagination

    def get_queryset(self):
        qs = Budget.objects.all()
        if not has_finance_privilege(self.request.user):
            return qs.none()  # ordinary users do not browse departmental budget details
        q = self.request.query_params.get('search')
        if q: qs = qs.filter(Q(department__icontains=q) | Q(fiscal_year__icontains=q))
        return qs

    def _require_finance(self):
        if not has_finance_privilege(self.request.user): raise PermissionDenied('Finance privilege required.')

    def perform_create(self, serializer):
        self._require_finance()
        with transaction.atomic():
            budget = serializer.save()
            before = MONEY_ZERO
            if budget.total_amount > 0:
                BudgetTransaction.objects.create(budget=budget, action_type='TOP_UP', amount=budget.total_amount,
                    balance_before=before, balance_after=budget.current_balance, performed_by=self.request.user,
                    notes=f'Initial allocation for {budget.department}')
            _audit(self.request.user, 'BUDGET_CREATED', budget, f'Initial allocation {_money(budget.total_amount)}')

    def perform_update(self, serializer):
        self._require_finance()
        if 'total_amount' in serializer.validated_data:
            raise ValidationError({'total_amount': 'Use Add Funds; allocated money cannot be edited directly.'})
        obj = serializer.save(); _audit(self.request.user, 'BUDGET_UPDATED', obj)

    def perform_destroy(self, instance):
        raise ValidationError({'detail': 'Financial budgets cannot be deleted. Keep them for audit history.'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsFinancePrivileged], url_path='add-funds')
    def add_funds(self, request, pk=None):
        amount = _decimal_from_request(request.data.get('amount'))
        with transaction.atomic():
            budget = Budget.objects.select_for_update().get(pk=pk)
            before = budget.current_balance
            budget.total_amount += amount; budget.current_balance += amount
            budget.save(update_fields=['total_amount','current_balance'])
            tx = BudgetTransaction.objects.create(budget=budget, action_type='TOP_UP', amount=amount,
                balance_before=before, balance_after=budget.current_balance, performed_by=request.user,
                notes=str(request.data.get('notes') or 'Funds added'))
            _audit(request.user, 'FUNDS_ADDED', tx, f'{_money(before)} -> {_money(budget.current_balance)}')
        return Response(BudgetSerializer(budget, context={'request': request}).data)


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = FinancePagination

    def get_queryset(self):
        qs = Expense.objects.select_related('budget','requested_by','processed_by')
        if not has_finance_privilege(self.request.user): qs = qs.filter(requested_by=self.request.user)
        status_value = self.request.query_params.get('status')
        budget = self.request.query_params.get('budget')
        q = self.request.query_params.get('search')
        start = _date_param(self.request.query_params.get('start'), 'start')
        end = _date_param(self.request.query_params.get('end'), 'end')
        if status_value: qs = qs.filter(status=status_value.upper())
        if budget: qs = qs.filter(budget_id=budget)
        if q: qs = qs.filter(Q(reference__icontains=q)|Q(description__icontains=q)|Q(requested_by__username__icontains=q))
        if start: qs = qs.filter(date_requested__date__gte=start)
        if end: qs = qs.filter(date_requested__date__lte=end)
        return qs.order_by('-date_requested')

    def perform_create(self, serializer):
        expense = serializer.save(requested_by=self.request.user)
        _audit(self.request.user, 'EXPENSE_REQUESTED', expense)
        _notify_finance_team('New expense request', f'{expense.reference} for {_money(expense.amount)} requires review.', expense=expense)

    def perform_update(self, serializer):
        expense = self.get_object()
        if expense.status != 'PENDING': raise PermissionDenied('Processed expenses are immutable.')
        if expense.requested_by_id != self.request.user.id and not has_finance_privilege(self.request.user): raise PermissionDenied()
        updated = serializer.save(); _audit(self.request.user, 'EXPENSE_UPDATED', updated)

    def perform_destroy(self, instance):
        if instance.status != 'PENDING': raise PermissionDenied('Processed expenses cannot be deleted.')
        if instance.requested_by_id != self.request.user.id and not has_finance_privilege(self.request.user): raise PermissionDenied()
        _audit(self.request.user, 'EXPENSE_CANCELLED', instance); instance.delete()

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsFinancePrivileged])
    def approve(self, request, pk=None):
        with transaction.atomic():
            expense = Expense.objects.select_for_update().select_related('budget','requested_by').get(pk=pk)
            if expense.status != 'PENDING': raise ValidationError({'status': 'Only pending expenses can be approved.'})
            if expense.requested_by_id == request.user.id: raise PermissionDenied('You cannot approve your own expense request.')
            if not expense.budget: raise ValidationError({'budget': 'Assign a budget before approval.'})
            budget = Budget.objects.select_for_update().get(pk=expense.budget_id)
            today = timezone.localdate()
            if budget.start_date and today < budget.start_date: raise ValidationError({'budget': 'This budget is not active yet.'})
            if budget.end_date and today > budget.end_date: raise ValidationError({'budget': 'This budget has expired.'})
            if budget.current_balance < expense.amount: raise ValidationError({'budget': 'Insufficient available funds.'})
            before = budget.current_balance
            budget.current_balance -= expense.amount; budget.save(update_fields=['current_balance'])
            expense.status='APPROVED'; expense.processed_by=request.user; expense.date_processed=timezone.now(); expense.rejection_reason=None
            expense.save(update_fields=['status','processed_by','date_processed','rejection_reason'])
            Approval.objects.create(expense=expense, approved_by=request.user, comments=str(request.data.get('comments') or ''))
            tx = BudgetTransaction.objects.create(budget=budget, expense=expense, action_type='DEDUCTION', amount=expense.amount,
                balance_before=before, balance_after=budget.current_balance, performed_by=request.user,
                notes=f'Approved expense {expense.reference}: {expense.description}')
            _audit(request.user, 'EXPENSE_APPROVED', expense, f'{tx.reference}; {_money(before)} -> {_money(budget.current_balance)}')
            _notify(expense.requested_by, 'EXPENSE_APPROVED', 'Expense request approved',
                    f'{expense.reference} for {_money(expense.amount)} was approved.', expense=expense)
            transaction.on_commit(lambda eid=expense.id: _send_expense_email(eid))
        return Response(ExpenseSerializer(expense, context={'request':request}).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsFinancePrivileged])
    def reject(self, request, pk=None):
        reason = str(request.data.get('reason') or request.data.get('rejection_reason') or '').strip()
        if not reason: raise ValidationError({'reason': 'A rejection reason is required.'})
        with transaction.atomic():
            expense = Expense.objects.select_for_update().select_related('requested_by').get(pk=pk)
            if expense.status != 'PENDING': raise ValidationError({'status': 'Only pending expenses can be rejected.'})
            if expense.requested_by_id == request.user.id: raise PermissionDenied('You cannot reject your own expense request.')
            expense.status='REJECTED'; expense.rejection_reason=reason; expense.processed_by=request.user; expense.date_processed=timezone.now()
            expense.save(update_fields=['status','rejection_reason','processed_by','date_processed'])
            _audit(request.user, 'EXPENSE_REJECTED', expense, reason)
            _notify(expense.requested_by, 'EXPENSE_REJECTED', 'Expense request rejected', f'{expense.reference} was rejected. Reason: {reason}', expense=expense)
            transaction.on_commit(lambda eid=expense.id: _send_expense_email(eid))
        return Response(ExpenseSerializer(expense, context={'request':request}).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsFinancePrivileged])
    def reverse(self, request, pk=None):
        reason = str(request.data.get('reason') or '').strip()
        if not reason: raise ValidationError({'reason':'A reversal reason is required.'})
        with transaction.atomic():
            expense = Expense.objects.select_for_update().select_related('budget').get(pk=pk)
            if expense.status != 'APPROVED': raise ValidationError({'status':'Only an approved expense can be reversed.'})
            if BudgetTransaction.objects.filter(expense=expense, action_type='REFUND').exists(): raise ValidationError({'status':'This expense has already been reversed.'})
            budget = Budget.objects.select_for_update().get(pk=expense.budget_id)
            before=budget.current_balance; budget.current_balance += expense.amount; budget.save(update_fields=['current_balance'])
            tx=BudgetTransaction.objects.create(budget=budget, expense=expense, action_type='REFUND', amount=expense.amount,
                balance_before=before, balance_after=budget.current_balance, performed_by=request.user,
                notes=f'Reversal of {expense.reference}. Reason: {reason}')
            _audit(request.user,'EXPENSE_REVERSED',expense,f'{tx.reference}. {reason}')
        return Response({'detail':'Expense financial posting reversed.', 'transaction':BudgetTransactionSerializer(tx).data})


class ApprovalViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Approval.objects.select_related('expense','approved_by').all().order_by('-date_approved')
    serializer_class = ApprovalSerializer; permission_classes=[IsAuthenticated,IsFinancePrivileged]; pagination_class=FinancePagination


class BudgetTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BudgetTransactionSerializer
    permission_classes = [IsAuthenticated, IsFinancePrivileged]
    pagination_class = FinancePagination

    def perform_content_negotiation(self, request, force=False):
        if getattr(self, 'action', None) == 'financial_report':
            from rest_framework.renderers import BaseRenderer
            class PassthroughRenderer(BaseRenderer):
                media_type = '*/*'
                format = 'any'
                def render(self, data, accepted_media_type=None, renderer_context=None):
                    return data
            return (PassthroughRenderer(), '*/*')
        return super().perform_content_negotiation(request, force)

    def get_queryset(self):
        qs = BudgetTransaction.objects.select_related('budget', 'expense', 'performed_by')
        start = _date_param(self.request.query_params.get('start'), 'start')
        end = _date_param(self.request.query_params.get('end'), 'end')
        qs = _filter_transactions(qs, start, end, self.request.query_params.get('budget'), self.request.query_params.get('type'))
        q = self.request.query_params.get('search')
        if q:
            qs = qs.filter(Q(reference__icontains=q) | Q(notes__icontains=q) | Q(expense__reference__icontains=q))
        return qs.order_by('-timestamp', '-id')

    @action(detail=False, methods=['get'], url_path='financial-report')
    def financial_report(self, request):
        start = _date_param(request.query_params.get('start'), 'start')
        end = _date_param(request.query_params.get('end'), 'end')
        fmt = str(request.query_params.get('report_format') or request.query_params.get('format') or 'PDF').upper()
        if fmt not in ('PDF', 'EXCEL', 'XLSX', 'CSV'):
            raise ValidationError({'format': 'Use PDF, EXCEL, or CSV.'})
        if fmt == 'XLSX':
            fmt = 'EXCEL'
        report = _collect_financial_report(start, end, request.query_params.get('budget'), request.query_params.get('type'))
        if not report['statement']:
            from rest_framework.exceptions import NotFound
            raise NotFound('No financial transactions found for the specified interval.')
        content, ctype = _render_report_file(report, fmt)
        response = HttpResponse(content, content_type=ctype)
        filename = _report_filename(fmt, start, end, report.get('reference'))
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        budgets=Budget.objects.all(); expenses=Expense.objects.all()
        allocated=budgets.aggregate(v=Sum('total_amount'))['v'] or MONEY_ZERO
        available=budgets.aggregate(v=Sum('current_balance'))['v'] or MONEY_ZERO
        pending=expenses.filter(status='PENDING')
        alerts=[]
        for b in budgets:
            if b.total_amount and (b.current_balance/b.total_amount) <= Decimal('0.10'):
                alerts.append({'type':'LOW_BALANCE','budget_id':b.id,'message':f'{b.department} has 10% or less remaining.'})
        return Response({'total_allocated':allocated,'available_balance':available,'approved_expenditure':allocated-available,
                         'pending_expenses':pending.count(),'attention':alerts[:5],
                         'pending_expense_preview':ExpenseSerializer(pending.order_by('date_requested')[:5],many=True,context={'request':request}).data,
                         'pending_report_requests':FinancialSummaryRequest.objects.filter(status='PENDING').count()})


class FinancialSummaryRequestViewSet(viewsets.ModelViewSet):
    serializer_class=FinancialSummaryRequestSerializer; permission_classes=[IsAuthenticated]; pagination_class=FinancePagination

    def get_queryset(self):
        qs=FinancialSummaryRequest.objects.select_related('requested_by','processed_by')
        if not has_finance_privilege(self.request.user): qs=qs.filter(requested_by=self.request.user)
        st=self.request.query_params.get('status')
        if st: qs=qs.filter(status=st.upper())
        return qs.order_by('-requested_at')

    def perform_create(self, serializer):
        obj=serializer.save(requested_by=self.request.user); _audit(self.request.user,'REPORT_REQUESTED',obj,obj.reason)
        _notify_finance_team('New financial report request', f'{obj.reference} requires review.', report_request=obj)

    def perform_update(self, serializer):
        raise PermissionDenied('Report requests are processed using Approve or Reject actions.')

    def perform_destroy(self, instance):
        if instance.status != 'PENDING' or instance.requested_by_id != self.request.user.id:
            raise PermissionDenied('Only your own pending report request can be cancelled.')
        _audit(self.request.user,'REPORT_REQUEST_CANCELLED',instance); instance.delete()

    @action(detail=True,methods=['post'],permission_classes=[IsAuthenticated,IsFinancePrivileged])
    def approve(self,request,pk=None):
        with transaction.atomic():
            obj=FinancialSummaryRequest.objects.select_for_update().select_related('requested_by').get(pk=pk)
            if obj.status!='PENDING': raise ValidationError({'status':'Only pending report requests can be approved.'})
            if obj.requested_by_id == request.user.id: raise PermissionDenied('You cannot approve your own report request.')
            report=_collect_financial_report(obj.report_start,obj.report_end,reference=obj.reference)
            content,ctype=_render_report_file(report,obj.report_format)
            filename=_report_filename(obj.report_format,obj.report_start,obj.report_end,obj.reference)
            obj.generated_report.save(filename,ContentFile(content),save=False)
            obj.status='COMPLETED'; obj.processed_by=request.user; obj.processed_at=timezone.now(); obj.rejection_reason=None
            obj.response_notes='Approved. The generated report is available for download.'; obj.save()
            _audit(request.user,'REPORT_APPROVED',obj,filename)
            _notify(obj.requested_by,'REPORT_READY','Financial report ready',f'{obj.reference} was approved and the report is ready.',report_request=obj)
            def send_report_email(rid=obj.id):
                r=FinancialSummaryRequest.objects.select_related('requested_by').get(pk=rid)
                if not r.requested_by.email: return
                email=EmailMessage(subject=f'Financial report {r.reference} is ready', body='Your financial report request was approved. The report is attached and is also available in the system.',
                    from_email=getattr(settings,'DEFAULT_FROM_EMAIL','noreply@department.local'),to=[r.requested_by.email])
                email.attach(filename,content,ctype); email.send(fail_silently=True)
            transaction.on_commit(send_report_email)
        return Response(FinancialSummaryRequestSerializer(obj,context={'request':request}).data)

    @action(detail=True,methods=['post'],permission_classes=[IsAuthenticated,IsFinancePrivileged])
    def reject(self,request,pk=None):
        reason=str(request.data.get('reason') or request.data.get('rejection_reason') or '').strip()
        if not reason: raise ValidationError({'reason':'A rejection reason is required.'})
        with transaction.atomic():
            obj=FinancialSummaryRequest.objects.select_for_update().select_related('requested_by').get(pk=pk)
            if obj.status!='PENDING': raise ValidationError({'status':'Only pending report requests can be rejected.'})
            if obj.requested_by_id == request.user.id: raise PermissionDenied('You cannot reject your own report request.')
            obj.status='REJECTED'; obj.rejection_reason=reason; obj.processed_by=request.user; obj.processed_at=timezone.now(); obj.response_notes=''
            obj.save(update_fields=['status','rejection_reason','processed_by','processed_at','response_notes'])
            _audit(request.user,'REPORT_REJECTED',obj,reason)
            _notify(obj.requested_by,'REPORT_REJECTED','Financial report request rejected',f'{obj.reference} was rejected. Reason: {reason}',report_request=obj)
            if obj.requested_by.email:
                transaction.on_commit(lambda: send_mail(f'Financial report {obj.reference}: Rejected',f'Your report request was rejected.\nReason: {reason}',
                    getattr(settings,'DEFAULT_FROM_EMAIL','noreply@department.local'),[obj.requested_by.email],fail_silently=True))
        return Response(FinancialSummaryRequestSerializer(obj,context={'request':request}).data)

    @action(detail=True,methods=['get'],url_path='download')
    def download(self,request,pk=None):
        obj=self.get_object()
        if obj.status!='COMPLETED' or not obj.generated_report: raise ValidationError({'report':'The report is not available.'})
        return FileResponse(obj.generated_report.open('rb'),as_attachment=True,filename=obj.generated_report.name.rsplit('/',1)[-1])


class FinanceNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class=FinanceNotificationSerializer; permission_classes=[IsAuthenticated]; pagination_class=FinancePagination
    def get_queryset(self): return FinanceNotification.objects.filter(recipient=self.request.user).order_by('-created_at')
    @action(detail=True,methods=['post'],url_path='mark-read')
    def mark_read(self,request,pk=None):
        obj=self.get_object(); obj.is_read=True; obj.save(update_fields=['is_read']); return Response(self.get_serializer(obj).data)
    @action(detail=False,methods=['post'],url_path='mark-all-read')
    def mark_all_read(self,request):
        count=self.get_queryset().filter(is_read=False).update(is_read=True); return Response({'updated':count})


class FinanceAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset=FinanceAuditLog.objects.select_related('actor').all(); serializer_class=FinanceAuditLogSerializer
    permission_classes=[IsAuthenticated,IsFinancePrivileged]; pagination_class=FinancePagination
