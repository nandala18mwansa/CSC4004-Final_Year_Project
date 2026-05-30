from django.contrib import admin
from .models import Budget, Expense, Approval


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ('department', 'total_amount', 'fiscal_year', 'allocated_date')


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('description', 'amount', 'status', 'requested_by', 'date_requested')
    list_filter = ('status',)


@admin.register(Approval)
class ApprovalAdmin(admin.ModelAdmin):
    list_display = ('expense', 'approved_by', 'date_approved')
