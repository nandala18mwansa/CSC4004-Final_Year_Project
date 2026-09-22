from decimal import Decimal
import uuid

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


def _ref(prefix):
    return f"{prefix}-{uuid.uuid4().hex[:10].upper()}"


def expense_ref(): return _ref('EXP')
def transaction_ref(): return _ref('TXN')
def report_ref(): return _ref('FR')


class Budget(models.Model):
    department = models.CharField(max_length=100)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0.00'))])
    current_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0.00'))])
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    fiscal_year = models.CharField(max_length=100, blank=True, null=True)
    allocated_date = models.DateField(auto_now_add=True)

    class Meta:
        db_table = 'budgets'
        ordering = ['department', '-id']

    def __str__(self):
        return f"{self.department} Budget"

    def save(self, *args, **kwargs):
        if self._state.adding and self.total_amount and self.current_balance in (None, Decimal('0.00')):
            self.current_balance = self.total_amount
        super().save(*args, **kwargs)


class Expense(models.Model):
    STATUS_CHOICES = (('PENDING', 'Pending'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected'))
    reference = models.CharField(max_length=24, unique=True, default=expense_ref, editable=False)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='expenses')
    budget = models.ForeignKey(Budget, on_delete=models.PROTECT, null=True, blank=True, related_name='expenses')
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    rejection_reason = models.TextField(blank=True, null=True)
    date_requested = models.DateTimeField(auto_now_add=True)
    date_processed = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name='processed_expenses')

    class Meta:
        db_table = 'expenses'
        ordering = ['-date_requested']

    def __str__(self):
        return f"{self.reference} - {self.description} - {self.amount}"


class Approval(models.Model):
    expense = models.OneToOneField(Expense, on_delete=models.PROTECT, related_name='approval')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='approvals')
    date_approved = models.DateTimeField(auto_now_add=True)
    comments = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'approvals'


class BudgetTransaction(models.Model):
    ACTION_CHOICES = (
        ('TOP_UP', 'Funds Added'),
        ('DEDUCTION', 'Expense Approved'),
        ('REFUND', 'Expense Reversal'),
        ('ADJUSTMENT', 'Controlled Adjustment'),
        ('REJECTION', 'Legacy Rejection Event'),
    )
    reference = models.CharField(max_length=24, unique=True, default=transaction_ref, editable=False)
    budget = models.ForeignKey(Budget, on_delete=models.PROTECT, null=True, blank=True, related_name='transactions')
    expense = models.ForeignKey(Expense, on_delete=models.PROTECT, null=True, blank=True, related_name='transactions')
    action_type = models.CharField(max_length=30, choices=ACTION_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    balance_before = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    balance_after = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    timestamp = models.DateTimeField(auto_now_add=True)
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'transactions'
        ordering = ['-timestamp', '-id']

    def __str__(self):
        return f"{self.reference} - {self.action_type} - ZMW {self.amount}"


class FinancialSummaryRequest(models.Model):
    STATUS_CHOICES = (('PENDING', 'Pending'), ('COMPLETED', 'Completed'), ('REJECTED', 'Rejected'))
    FORMAT_CHOICES = (('PDF', 'PDF'), ('EXCEL', 'Excel (.xlsx)'), ('CSV', 'CSV (.csv)'))
    reference = models.CharField(max_length=24, unique=True, default=report_ref, editable=False)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='financial_summary_requests')
    reason = models.TextField()
    report_start = models.DateField(null=True, blank=True)
    report_end = models.DateField(null=True, blank=True)
    report_format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default='PDF')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    rejection_reason = models.TextField(blank=True, null=True)
    response_notes = models.TextField(blank=True, null=True)
    generated_report = models.FileField(upload_to='financial_reports/%Y/%m/', blank=True, null=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name='processed_summary_requests')

    class Meta:
        db_table = 'financial_summary_requests'
        ordering = ['-requested_at']

    def __str__(self):
        return f"{self.reference} by {self.requested_by.username} ({self.status})"


class FinanceNotification(models.Model):
    KIND_CHOICES = (
        ('EXPENSE_APPROVED', 'Expense approved'), ('EXPENSE_REJECTED', 'Expense rejected'),
        ('REPORT_READY', 'Report ready'), ('REPORT_REJECTED', 'Report rejected'),
        ('ACTION_REQUIRED', 'Action required'),
    )
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='finance_notifications')
    kind = models.CharField(max_length=30, choices=KIND_CHOICES)
    title = models.CharField(max_length=160)
    message = models.TextField()
    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    report_request = models.ForeignKey(FinancialSummaryRequest, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'finance_notifications'
        ordering = ['-created_at']


class FinanceAuditLog(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True)
    action = models.CharField(max_length=80)
    object_type = models.CharField(max_length=50)
    object_reference = models.CharField(max_length=50, blank=True)
    details = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'finance_audit_log'
        ordering = ['-created_at']
