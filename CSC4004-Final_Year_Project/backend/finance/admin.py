from django.contrib import admin
from .models import Budget, Expense, Approval, BudgetTransaction, FinancialSummaryRequest, FinanceNotification, FinanceAuditLog

@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display=('department','total_amount','current_balance','fiscal_year','allocated_date')

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display=('reference','description','amount','status','requested_by','date_requested')
    list_filter=('status','budget'); search_fields=('reference','description','requested_by__username')

@admin.register(Approval)
class ApprovalAdmin(admin.ModelAdmin): list_display=('expense','approved_by','date_approved')

@admin.register(BudgetTransaction)
class BudgetTransactionAdmin(admin.ModelAdmin):
    list_display=('reference','action_type','amount','balance_before','balance_after','performed_by','timestamp')
    list_filter=('action_type','budget'); search_fields=('reference','notes','expense__reference')

@admin.register(FinancialSummaryRequest)
class FinancialSummaryRequestAdmin(admin.ModelAdmin):
    list_display=('reference','requested_by','report_start','report_end','report_format','status','processed_by','processed_at')
    list_filter=('status','report_format')

@admin.register(FinanceNotification)
class FinanceNotificationAdmin(admin.ModelAdmin): list_display=('recipient','kind','title','is_read','created_at')

@admin.register(FinanceAuditLog)
class FinanceAuditLogAdmin(admin.ModelAdmin): list_display=('actor','action','object_type','object_reference','created_at')
