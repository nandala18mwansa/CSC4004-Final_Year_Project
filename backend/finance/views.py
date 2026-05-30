from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from users.permissions import IsAdminOrManagerOrReadOnly, IsOwnerOrAdminOrManager, IsManagerOrAdmin
from .models import Budget, Expense, Approval
from .serializers import BudgetSerializer, ExpenseSerializer, ApprovalSerializer


class BudgetViewSet(viewsets.ModelViewSet):
    queryset = Budget.objects.all()
    serializer_class = BudgetSerializer
    permission_classes = [IsAuthenticated, IsAdminOrManagerOrReadOnly]


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
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

        old_status = instance.status
        updated_instance = serializer.save()
        new_status = updated_instance.status

        if old_status != new_status:
            if new_status == 'APPROVED':
                Approval.objects.update_or_create(
                    expense=updated_instance,
                    defaults={'approved_by': user, 'comments': self.request.data.get('comments', '')}
                )
            elif new_status in ['REJECTED', 'PENDING']:
                Approval.objects.filter(expense=updated_instance).delete()


class ApprovalViewSet(viewsets.ModelViewSet):
    queryset = Approval.objects.all()
    serializer_class = ApprovalSerializer
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

