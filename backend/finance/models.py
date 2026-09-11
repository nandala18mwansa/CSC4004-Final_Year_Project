from django.db import models
from django.conf import settings

class Budget(models.Model):
    department = models.CharField(max_length=100)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    current_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    fiscal_year = models.CharField(max_length=100, blank=True, null=True)
    allocated_date = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"{self.department} Budget"

class Expense(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    )
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='expenses')
    budget = models.ForeignKey(Budget, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    date_requested = models.DateTimeField(auto_now_add=True)
    date_processed = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_expenses')

    def __str__(self):
        return f"{self.description} - {self.amount}"

class Approval(models.Model):
    expense = models.OneToOneField(Expense, on_delete=models.CASCADE, related_name='approval')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='approvals')
    date_approved = models.DateTimeField(auto_now_add=True)
    comments = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Approval for {self.expense}"

class BudgetTransaction(models.Model):
    ACTION_CHOICES = (
        ('TOP_UP', 'Funds Added'),
        ('DEDUCTION', 'Expense Approved'),
        ('REJECTION', 'Expense Rejected'),
    )
    budget = models.ForeignKey(Budget, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    expense = models.ForeignKey(Expense, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    action_type = models.CharField(max_length=30, choices=ACTION_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    balance_after = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    timestamp = models.DateTimeField(auto_now_add=True)
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.action_type} - ZMK {self.amount} on {self.timestamp}"
