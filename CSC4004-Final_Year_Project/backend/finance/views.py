from decimal import Decimal, InvalidOperation

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from users.permissions import IsAdminOrManagerOrReadOnly, IsOwnerOrAdminOrManager, IsManagerOrAdmin, IsAdmin
from .models import Budget, Expense, Approval, BudgetTransaction
from .serializers import BudgetSerializer, ExpenseSerializer, ApprovalSerializer, BudgetTransactionSerializer


class BudgetViewSet(viewsets.ModelViewSet):
    queryset = Budget.objects.all().order_by('-id')
    serializer_class = BudgetSerializer
    permission_classes = [IsAuthenticated, IsAdminOrManagerOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if not (user and user.is_authenticated):
            return Budget.objects.none()
        if user.role == 'STAFF' and user.department:
            qs = Budget.objects.filter(department__icontains=user.department).order_by('-id')
            if qs.exists():
                return qs
        return Budget.objects.all().order_by('-id')

    def perform_create(self, serializer):
        budget = serializer.save()
        if not budget.current_balance:
            budget.current_balance = budget.total_amount
            budget.save()
        
        BudgetTransaction.objects.create(
            budget=budget,
            action_type='TOP_UP',
            amount=budget.total_amount,
            balance_after=budget.current_balance,
            performed_by=self.request.user,
            notes=f"Initial department budget allocation for {budget.department}"
        )

    @action(detail=True, methods=['post', 'patch'], permission_classes=[IsAuthenticated, IsAdmin])
    def add_funds(self, request, pk=None):
        """Admin-only endpoint to set or top-up department budget funds."""
        budget = self.get_object()
        amount_str = request.data.get('amount')
        notes = request.data.get('notes', 'Department cash top-up')
        
        if not amount_str:
            return Response({'detail': 'Amount is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            add_amount = Decimal(str(amount_str))
        except (InvalidOperation, ValueError):
            return Response({'detail': 'Invalid amount provided.'}, status=status.HTTP_400_BAD_REQUEST)

        if add_amount <= 0:
            return Response({'detail': 'Amount must be greater than zero.'}, status=status.HTTP_400_BAD_REQUEST)

        budget.total_amount += Decimal(str(add_amount))
        budget.current_balance += Decimal(str(add_amount))
        budget.save()

        BudgetTransaction.objects.create(
            budget=budget,
            action_type='TOP_UP',
            amount=add_amount,
            balance_after=budget.current_balance,
            performed_by=request.user,
            notes=notes
        )

        return Response(BudgetSerializer(budget).data)


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all().order_by('-id')
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdminOrManager]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Expense.objects.none()
        if user.role == 'STAFF':
            return Expense.objects.filter(requested_by=user)
        return Expense.objects.all()

    def perform_create(self, serializer):
        serializer.save(requested_by=self.request.user)

    def perform_update(self, serializer):
        instance = self.get_object()
        user = self.request.user

        if user.role == 'STAFF':
            if 'status' in serializer.validated_data and serializer.validated_data['status'] != instance.status:
                raise PermissionDenied("Staff members cannot change the status of an expense request.")
            if instance.status != 'PENDING':
                raise PermissionDenied("Cannot modify an expense request that has already been processed.")

        if instance.status != 'PENDING':
            locked_fields = {'amount', 'budget', 'description'}
            if locked_fields.intersection(serializer.validated_data):
                raise PermissionDenied("Processed expense requests cannot be edited. Reverse the status first.")

        old_status = instance.status
        old_budget = instance.budget
        old_amount = instance.amount
        new_status = serializer.validated_data.get('status', instance.status)

        if old_status != new_status and new_status == 'APPROVED':
            target_budget = serializer.validated_data.get('budget', instance.budget)
            requested_amount = serializer.validated_data.get('amount', instance.amount)
            if not target_budget:
                raise PermissionDenied("An expense must be assigned to a budget before approval.")
            if target_budget.current_balance < requested_amount:
                raise PermissionDenied("This budget does not have enough available funds for approval.")

        updated_instance = serializer.save()

        if old_status != new_status:
            updated_instance.date_processed = timezone.now()
            updated_instance.processed_by = user
            updated_instance.save()

            target_budget = updated_instance.budget

            if new_status == 'APPROVED':
                Approval.objects.update_or_create(
                    expense=updated_instance,
                    defaults={'approved_by': user, 'comments': self.request.data.get('comments', '')}
                )

                target_budget.current_balance -= updated_instance.amount
                target_budget.save()

                BudgetTransaction.objects.create(
                    budget=target_budget,
                    expense=updated_instance,
                    action_type='DEDUCTION',
                    amount=updated_instance.amount,
                    balance_after=target_budget.current_balance,
                    performed_by=user,
                    notes=f"Expense approved: {updated_instance.description}"
                )

            elif new_status in ['REJECTED', 'PENDING']:
                Approval.objects.filter(expense=updated_instance).delete()

                refund_budget = old_budget or target_budget
                if old_status == 'APPROVED' and refund_budget:
                    refund_budget.current_balance += old_amount
                    refund_budget.save()

                BudgetTransaction.objects.create(
                    budget=refund_budget,
                    expense=updated_instance,
                    action_type='REJECTION',
                    amount=old_amount,
                    balance_after=refund_budget.current_balance if refund_budget else Decimal('0.00'),
                    performed_by=user,
                    notes=f"Expense status changed to {new_status}: {updated_instance.description}"
                )


class ApprovalViewSet(viewsets.ModelViewSet):
    queryset = Approval.objects.all()
    serializer_class = ApprovalSerializer
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]


class BudgetTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BudgetTransaction.objects.all().order_by('-timestamp')
    serializer_class = BudgetTransactionSerializer
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]
