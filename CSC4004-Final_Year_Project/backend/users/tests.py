from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from users.models import User
from finance.models import Budget, Expense, Approval, BudgetTransaction
from resources.models import Resource, Allocation

class RolePermissionsTestCase(APITestCase):
    def setUp(self):
        # Create users with different roles
        self.admin_user = User.objects.create_user(
            username='admin', password='password123', role='ADMIN', email='admin@test.com'
        )
        self.manager_user = User.objects.create_user(
            username='manager', password='password123', role='MANAGER',
            email='manager@test.com', has_finance_privilege=True
        )
        self.plain_manager_user = User.objects.create_user(
            username='plainmanager', password='password123', role='MANAGER', email='plainmanager@test.com'
        )
        self.staff_user1 = User.objects.create_user(
            username='staff1', password='password123', role='STAFF', email='staff1@test.com'
        )
        self.staff_user2 = User.objects.create_user(
            username='staff2', password='password123', role='STAFF', email='staff2@test.com'
        )

        # Create a budget
        self.budget = Budget.objects.create(
            department='Engineering', total_amount=10000.00, fiscal_year='2026-2027'
        )

        # Create resources
        self.resource = Resource.objects.create(
            name='Laptop A', description='Test laptop', status='AVAILABLE'
        )

        # Create expenses
        self.expense_staff1 = Expense.objects.create(
            requested_by=self.staff_user1,
            budget=self.budget,
            amount=500.00,
            description='Staff 1 expense request',
            status='PENDING'
        )

    def login(self, username):
        user = User.objects.get(username=username)
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    # --- BUDGET PERMISSIONS TESTS ---
    def test_staff_cannot_create_budget(self):
        self.login('staff1')
        url = reverse('budget-list')
        data = {'department': 'Marketing', 'total_amount': 5000.00, 'fiscal_year': '2026-2027'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_can_create_budget(self):
        self.login('manager')
        url = reverse('budget-list')
        data = {'department': 'Marketing', 'total_amount': 5000.00, 'fiscal_year': '2026-2027'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_public_registration_cannot_assign_privileged_role(self):
        response = self.client.post(reverse('register'), {
            'username': 'intruder',
            'password': 'strong-password-123',
            'email': 'intruder@test.com',
            'role': 'ADMIN',
            'department': 'Engineering',
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.get(username='intruder').role, 'STAFF')

    def test_staff_cannot_list_users(self):
        self.login('staff1')
        response = self.client.get(reverse('user-list'))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_list_users(self):
        self.login('admin')
        response = self.client.get(reverse('user-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # --- EXPENSE PERMISSIONS & FILTERING TESTS ---
    def test_staff_only_views_own_expenses(self):
        self.login('staff2') # No expenses for staff2
        url = reverse('expense-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should not see staff1's expense
        self.assertEqual(len(response.data), 0)

    def test_manager_views_all_expenses(self):
        self.login('manager')
        url = reverse('expense-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should see staff1's expense
        self.assertEqual(len(response.data), 1)

    def test_staff_cannot_change_status(self):
        self.login('staff1')
        url = reverse('expense-detail', kwargs={'pk': self.expense_staff1.id})
        data = {'status': 'APPROVED'}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_can_approve_expense_and_creates_approval(self):
        self.login('manager')
        url = reverse('expense-detail', kwargs={'pk': self.expense_staff1.id})
        data = {'status': 'APPROVED', 'comments': 'Approved by manager'}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'APPROVED')

        # Check if Approval object is created
        approval_exists = Approval.objects.filter(expense=self.expense_staff1).exists()
        self.assertTrue(approval_exists)
        approval = Approval.objects.get(expense=self.expense_staff1)
        self.assertEqual(approval.approved_by, self.manager_user)
        self.assertEqual(approval.comments, 'Approved by manager')
        self.budget.refresh_from_db()
        self.assertEqual(self.budget.current_balance, Decimal('9500.00'))
        self.assertTrue(
            BudgetTransaction.objects.filter(
                expense=self.expense_staff1,
                action_type='DEDUCTION',
                amount=Decimal('500.00'),
                balance_after=Decimal('9500.00'),
            ).exists()
        )

    def test_manager_without_finance_privilege_cannot_approve_expense(self):
        expense = Expense.objects.create(
            requested_by=self.plain_manager_user,
            budget=self.budget,
            amount=250.00,
            description='Plain manager own expense',
            status='PENDING'
        )
        self.login('plainmanager')
        response = self.client.patch(
            reverse('expense-detail', kwargs={'pk': expense.id}),
            {'status': 'APPROVED'}
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_reject_expense_requires_reason(self):
        self.login('manager')
        response = self.client.patch(
            reverse('expense-detail', kwargs={'pk': self.expense_staff1.id}),
            {'status': 'REJECTED'}
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_finance_user_can_reject_expense_with_reason(self):
        self.login('manager')
        response = self.client.patch(
            reverse('expense-detail', kwargs={'pk': self.expense_staff1.id}),
            {'status': 'REJECTED', 'rejection_reason': 'Receipt missing'}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.expense_staff1.refresh_from_db()
        self.budget.refresh_from_db()
        self.assertEqual(self.expense_staff1.status, 'REJECTED')
        self.assertEqual(self.expense_staff1.rejection_reason, 'Receipt missing')
        self.assertEqual(self.budget.current_balance, Decimal('10000.00'))

    def test_cannot_approve_expense_without_budget(self):
        expense = Expense.objects.create(
            requested_by=self.staff_user1,
            budget=None,
            amount=100.00,
            description='Unbudgeted request',
            status='PENDING'
        )
        self.login('manager')
        response = self.client.patch(reverse('expense-detail', kwargs={'pk': expense.id}), {'status': 'APPROVED'})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_approve_expense_with_insufficient_budget_balance(self):
        self.budget.current_balance = 100.00
        self.budget.save()
        self.login('manager')
        response = self.client.patch(
            reverse('expense-detail', kwargs={'pk': self.expense_staff1.id}),
            {'status': 'APPROVED'}
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- RESOURCE & ALLOCATION PERMISSIONS TESTS ---
    def test_staff_cannot_create_resource(self):
        self.login('staff1')
        url = reverse('resource-list')
        data = {'name': 'Projector X', 'description': 'Office projector', 'status': 'AVAILABLE'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_allocation_defaults_to_self(self):
        self.login('staff1')
        url = reverse('allocation-list')
        data = {
            'resource': self.resource.id,
            'start_time': '2026-06-01T10:00:00Z',
            'end_time': '2026-06-01T12:00:00Z',
            'allocated_to': self.staff_user2.id # Try to allocate to staff_user2
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Should be allocated to staff1, ignoring staff2 request input
        self.assertEqual(response.data['allocated_to'], self.staff_user1.id)

    def test_allocation_end_time_must_be_after_start_time(self):
        self.login('staff1')
        response = self.client.post(reverse('allocation-list'), {
            'resource': self.resource.id,
            'start_time': '2026-06-01T12:00:00Z',
            'end_time': '2026-06-01T10:00:00Z',
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_book_unavailable_resource(self):
        self.resource.status = 'MAINTENANCE'
        self.resource.save()
        self.login('staff1')
        response = self.client.post(reverse('allocation-list'), {
            'resource': self.resource.id,
            'start_time': '2026-06-01T10:00:00Z',
            'end_time': '2026-06-01T12:00:00Z',
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_book_overlapping_resource_time(self):
        Allocation.objects.create(
            resource=self.resource,
            allocated_to=self.staff_user1,
            start_time='2026-06-01T10:00:00Z',
            end_time='2026-06-01T12:00:00Z',
        )
        self.login('staff2')
        response = self.client.post(reverse('allocation-list'), {
            'resource': self.resource.id,
            'start_time': '2026-06-01T11:00:00Z',
            'end_time': '2026-06-01T13:00:00Z',
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
