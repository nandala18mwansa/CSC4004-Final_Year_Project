from rest_framework import serializers
from .models import Budget, Expense, Approval, BudgetTransaction, FinancialSummaryRequest, FinanceNotification, FinanceAuditLog
from users.permissions import has_finance_balance_access


class BudgetSerializer(serializers.ModelSerializer):
    utilization_percent = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = '__all__'
        read_only_fields = ('current_balance', 'allocated_date')

    def get_utilization_percent(self, obj):
        if not obj.total_amount:
            return 0
        return round(float((obj.total_amount - obj.current_balance) / obj.total_amount * 100), 2)

    def validate_total_amount(self, value):
        if value < 0:
            raise serializers.ValidationError('Budget amount cannot be negative.')
        return value

    def validate(self, attrs):
        start = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end = attrs.get('end_date', getattr(self.instance, 'end_date', None))
        if start and end and start > end:
            raise serializers.ValidationError({'end_date': 'End date cannot be before start date.'})
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request and not has_finance_balance_access(request.user):
            data.pop('total_amount', None)
            data.pop('current_balance', None)
            data.pop('utilization_percent', None)
        return data


class ExpenseSerializer(serializers.ModelSerializer):
    requested_by_username = serializers.CharField(source='requested_by.username', read_only=True)
    processed_by_username = serializers.CharField(source='processed_by.username', read_only=True)
    budget_department = serializers.CharField(source='budget.department', read_only=True)

    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ('reference', 'requested_by', 'processed_by', 'date_requested', 'date_processed', 'status', 'rejection_reason')

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Expense amount must be greater than zero.')
        return value


class ApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Approval
        fields = '__all__'
        read_only_fields = ('expense', 'approved_by', 'date_approved')


class BudgetTransactionSerializer(serializers.ModelSerializer):
    performed_by_username = serializers.CharField(source='performed_by.username', read_only=True)
    budget_department = serializers.CharField(source='budget.department', read_only=True)
    expense_reference = serializers.CharField(source='expense.reference', read_only=True)
    expense_description = serializers.CharField(source='expense.description', read_only=True)

    class Meta:
        model = BudgetTransaction
        fields = '__all__'
        read_only_fields = (
            'id', 'reference', 'budget', 'expense', 'action_type',
            'amount', 'balance_before', 'balance_after', 'timestamp',
            'performed_by', 'notes',
        )


class FinancialSummaryRequestSerializer(serializers.ModelSerializer):
    requested_by_username = serializers.CharField(source='requested_by.username', read_only=True)
    processed_by_username = serializers.CharField(source='processed_by.username', read_only=True)
    report_url = serializers.SerializerMethodField()

    class Meta:
        model = FinancialSummaryRequest
        fields = '__all__'
        read_only_fields = ('reference', 'requested_by', 'status', 'rejection_reason', 'response_notes', 'generated_report', 'requested_at', 'processed_at', 'processed_by')

    def get_report_url(self, obj):
        if not obj.generated_report:
            return None
        request = self.context.get('request')
        url = obj.generated_report.url
        return request.build_absolute_uri(url) if request else url

    def validate_report_format(self, value):
        value = str(value).upper()
        if value not in ('PDF', 'CSV'):
            raise serializers.ValidationError('Report format must be PDF or CSV.')
        return value

    def validate(self, attrs):
        start = attrs.get('report_start', getattr(self.instance, 'report_start', None))
        end = attrs.get('report_end', getattr(self.instance, 'report_end', None))
        if self.instance is None and (not start or not end):
            raise serializers.ValidationError({'report_start': 'Start date is required.', 'report_end': 'End date is required.'})
        if start and end and start > end:
            raise serializers.ValidationError({'report_end': 'End date cannot be before start date.'})
        return attrs


class FinanceNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinanceNotification
        fields = '__all__'
        read_only_fields = ('recipient', 'kind', 'title', 'message', 'expense', 'report_request', 'created_at')


class FinanceAuditLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username', read_only=True)
    class Meta:
        model = FinanceAuditLog
        fields = '__all__'
        read_only_fields = (
            'id', 'actor', 'action', 'object_type', 'object_reference',
            'details', 'created_at',
        )
