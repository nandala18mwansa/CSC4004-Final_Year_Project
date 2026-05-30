from rest_framework import serializers
from .models import Budget, Expense, Approval


class BudgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Budget
        fields = '__all__'


class ExpenseSerializer(serializers.ModelSerializer):
    requested_by_username = serializers.CharField(
        source='requested_by.username', read_only=True
    )

    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ('requested_by',)


class ApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Approval
        fields = '__all__'
