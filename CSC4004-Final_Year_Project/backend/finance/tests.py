from decimal import Decimal

from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import Approval, Budget, BudgetTransaction, Expense
from users.models import User


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class DirectExpenseTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.finance_user = User.objects.create(
            username='finance-admin', email='finance-admin@example.com', role='ADMIN', is_active=True, has_finance_privilege=True,
        )
        cls.staff_user = User.objects.create(username='staff-requester', is_active=True)
        cls.finance_manager = User.objects.create(
            username='finance-manager', email='finance-manager@example.com', role='MANAGER', is_active=True, has_finance_privilege=True,
        )
        cls.budget = Budget.objects.create(department='Engineering', total_amount=Decimal('10000.00'))

    def setUp(self):
        self.client = APIClient()

    def test_admin_posts_direct_expense_to_ledger(self):
        self.client.force_authenticate(self.finance_user)
        response = self.client.post('/api/expenses/', {
            'description': 'Project equipment', 'amount': '6000.00', 'budget': self.budget.pk,
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], 'APPROVED')
        self.assertEqual(response.data['requested_by'], self.finance_user.pk)
        self.assertEqual(Approval.objects.filter(expense__budget=self.budget).count(), 0)
        self.budget.refresh_from_db()
        self.assertEqual(self.budget.current_balance, Decimal('4000.00'))
        transaction = BudgetTransaction.objects.get(expense_id=response.data['id'])
        self.assertEqual(transaction.action_type, 'DEDUCTION')
        self.assertEqual(transaction.balance_before, Decimal('10000.00'))
        self.assertEqual(transaction.balance_after, Decimal('4000.00'))

    def test_direct_expense_cannot_exceed_budget(self):
        self.client.force_authenticate(self.finance_user)
        response = self.client.post('/api/expenses/', {
            'description': 'Over budget', 'amount': '12000.00', 'budget': self.budget.pk,
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('Not enough funds in the selected budget category', str(response.data))
        self.assertEqual(Expense.objects.count(), 0)
        self.assertEqual(BudgetTransaction.objects.count(), 0)

    def test_staff_expense_remains_a_pending_request(self):
        self.client.force_authenticate(self.staff_user)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post('/api/expenses/', {
                'description': 'Staff request', 'amount': '500.00', 'budget': self.budget.pk,
            }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], 'PENDING')
        self.assertEqual(response.data['requested_by'], self.staff_user.pk)
        self.assertEqual({recipient for message in mail.outbox for recipient in message.to}, {
            'finance-admin@example.com', 'finance-manager@example.com',
        })
        self.budget.refresh_from_db()
        self.assertEqual(self.budget.current_balance, Decimal('10000.00'))

    def test_finance_privileged_non_admin_still_requests_expense(self):
        self.client.force_authenticate(self.finance_manager)
        response = self.client.post('/api/expenses/', {
            'description': 'Manager request', 'amount': '6000.00', 'budget': self.budget.pk,
        }, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['status'], 'PENDING')
        self.budget.refresh_from_db()
        self.assertEqual(self.budget.current_balance, Decimal('10000.00'))

    def test_approval_rejects_request_above_selected_budget_balance(self):
        self.client.force_authenticate(self.staff_user)
        request_response = self.client.post('/api/expenses/', {
            'description': 'Over-budget request', 'amount': '12000.00', 'budget': self.budget.pk,
        }, format='json')
        self.assertEqual(request_response.status_code, 201, request_response.data)

        self.client.force_authenticate(self.finance_user)
        approval = self.client.post(f"/api/expenses/{request_response.data['id']}/approve/", {}, format='json')
        self.assertEqual(approval.status_code, 400)
        self.assertIn('Not enough funds in the selected budget category', str(approval.data))
        expense = Expense.objects.get(pk=request_response.data['id'])
        self.assertEqual(expense.status, 'PENDING')
        self.budget.refresh_from_db()
        self.assertEqual(self.budget.current_balance, Decimal('10000.00'))
