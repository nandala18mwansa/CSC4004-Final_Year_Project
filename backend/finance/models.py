from django.db import models
from django.conf import settings

class Budget(models.Model):
    department = models.CharField(max_length=100)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    allocated_date = models.DateField(auto_now_add=True)
    fiscal_year = models.CharField(max_length=9) # e.g. 2026-2027

    def __str__(self):
        return f"{self.department} Budget ({self.fiscal_year})"

class Expense(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    )
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='expenses')
    budget = models.ForeignKey(Budget, on_delete=models.SET_NULL, null=True, related_name='expenses')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    date_requested = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.description} - {self.amount}"

class Approval(models.Model):
    expense = models.OneToOneField(Expense, on_delete=models.CASCADE, related_name='approval')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='approvals')
    date_approved = models.DateTimeField(auto_now_add=True)
    comments = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Approval for {self.expense}"
