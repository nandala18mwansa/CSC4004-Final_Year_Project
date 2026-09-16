from rest_framework import serializers
from .models import Budget, Expense, Approval, BudgetTransaction


class BudgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Budget
        fields = '__all__'

    def validate_total_amount(self, value):
        if value < 0:
            raise serializers.ValidationError('Budget amount cannot be negative.')
        return value

    def validate_current_balance(self, value):
        if value < 0:
            raise serializers.ValidationError('Current balance cannot be negative.')
        return value


class ExpenseSerializer(serializers.ModelSerializer):
    requested_by_username = serializers.CharField(
        source='requested_by.username', read_only=True
    )
    processed_by_username = serializers.CharField(
        source='processed_by.username', read_only=True
    )

    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ('requested_by', 'processed_by', 'date_processed')

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Expense amount must be greater than zero.')
        return value


class ApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Approval
        fields = '__all__'


class BudgetTransactionSerializer(serializers.ModelSerializer):
    performed_by_username = serializers.CharField(
        source='performed_by.username', read_only=True
    )

    class Meta:
        model = BudgetTransaction
        fields = '__all__'
