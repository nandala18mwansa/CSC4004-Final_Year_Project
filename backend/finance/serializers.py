from rest_framework import serializers
from .models import Budget, Expense, Approval, BudgetTransaction


class BudgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Budget
        fields = '__all__'


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
