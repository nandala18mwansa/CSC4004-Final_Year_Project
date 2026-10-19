from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from users.models import User
from .models import ResourceReportRequest


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class ResourceReviewEmailTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.requester = User.objects.create_user(
            username='report-requester', password='test-pass', email='requester@example.com',
        )
        cls.reviewer = User.objects.create_user(
            username='asset-reviewer', password='test-pass', email='reviewer@example.com',
            has_resource_privilege=True,
        )

    def test_pending_resource_report_emails_resource_reviewers(self):
        client = APIClient()
        client.force_authenticate(self.requester)

        response = client.post('/api/resource-report-requests/', {
            'report_type': 'RESOURCE_REGISTER', 'report_format': 'CSV', 'filters': {},
        }, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['status'], 'PENDING')
        self.assertEqual(ResourceReportRequest.objects.count(), 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['reviewer@example.com'])
        self.assertIn(response.data['reference'], mail.outbox[0].body)
