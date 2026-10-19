from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from tempfile import TemporaryDirectory
from pathlib import Path

from .models import Announcement, AnnouncementDelivery, MaintenanceAuditLog, Notification, SystemMaintenanceState, User


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class AnnouncementAndMaintenanceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.publisher = User.objects.create(
            username='publisher', email='publisher@example.com', role='ADMIN', is_active=True,
            has_announcement_create=True, has_announcement_publish=True,
            has_announcement_manage_all=True, has_developer_options=True,
        )
        cls.publisher.set_password('developer-pass')
        cls.publisher.save(update_fields=['password'])
        cls.recipient = User.objects.create(username='recipient', email='recipient@example.com', is_active=True)
        cls.outside_audience = User.objects.create(username='outside', email='outside@example.com', is_active=True)
        cls.staff_user = User.objects.create_user(
            username='ordinary', email='ordinary@example.com', password='ordinary-pass', is_active=True,
        )

    def setUp(self):
        self.client = APIClient()

    def test_published_announcement_emails_only_selected_audience_once(self):
        self.client.force_authenticate(self.publisher)
        response = self.client.post('/api/announcements/', {
            'title': 'Office update', 'message': 'The meeting room will be closed tomorrow.',
            'audience_users': [self.recipient.pk], 'shared_modules': ['budgets', 'assets'],
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        announcement_id = response.data['id']
        with self.captureOnCommitCallbacks(execute=True):
            published = self.client.post(f'/api/announcements/{announcement_id}/publish/', {}, format='json')
        self.assertEqual(published.status_code, 200, published.data)
        self.assertEqual(AnnouncementDelivery.objects.filter(announcement_id=announcement_id, status='SENT').count(), 1)
        self.assertEqual([message.to for message in mail.outbox], [['recipient@example.com']])
        self.client.post(f'/api/announcements/{announcement_id}/publish/', {}, format='json')
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Budgets: http://127.0.0.1:5173/finance?section=budgets', mail.outbox[0].body)
        self.assertIn('Assets: http://127.0.0.1:5173/resources', mail.outbox[0].body)

    def test_announcement_visibility_is_limited_to_recipients_without_view_privilege(self):
        self.client.force_authenticate(self.publisher)
        response = self.client.post('/api/announcements/', {
            'title': 'Recipient-only update', 'message': 'Only selected staff should see this.',
            'audience_users': [self.recipient.pk],
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        announcement_id = response.data['id']
        with self.captureOnCommitCallbacks(execute=True):
            published = self.client.post(f'/api/announcements/{announcement_id}/publish/', {}, format='json')
        self.assertEqual(published.status_code, 200, published.data)

        self.client.force_authenticate(self.recipient)
        recipient_list = self.client.get('/api/announcements/')
        self.assertEqual(recipient_list.status_code, 200)
        self.assertIn(announcement_id, [item['id'] for item in recipient_list.data])

        self.outside_audience.has_announcement_view = True
        self.outside_audience.save(update_fields=['has_announcement_view'])
        self.client.force_authenticate(self.outside_audience)
        outside_list = self.client.get('/api/announcements/')
        self.assertEqual(outside_list.status_code, 200)
        self.assertNotIn(announcement_id, [item['id'] for item in outside_list.data])

    def test_non_admin_cannot_use_developer_options_even_with_flag(self):
        manager = User.objects.create(
            username='developer-manager', role='MANAGER', has_developer_options=True,
            has_destructive_maintenance=True, is_active=True,
        )
        self.client.force_authenticate(manager)
        response = self.client.get('/api/developer-options/status/')
        self.assertEqual(response.status_code, 403)

    def test_ordinary_api_access_is_blocked_during_maintenance(self):
        SystemMaintenanceState.objects.create(pk=1, is_active=True, updated_by=self.publisher)
        refresh = RefreshToken.for_user(self.staff_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        response = self.client.get('/api/users/')
        self.assertEqual(response.status_code, 401)

    def test_developer_admin_can_sign_in_and_turn_off_maintenance(self):
        SystemMaintenanceState.objects.create(pk=1, is_active=True, updated_by=self.publisher)
        login = self.client.post('/api/token/', {
            'username': 'publisher', 'password': 'developer-pass',
        }, format='json')
        self.assertEqual(login.status_code, 200, login.data)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        response = self.client.get('/api/developer-options/status/')
        self.assertEqual(response.status_code, 200, response.data)

    def test_authorized_maintainer_can_reach_maintenance_controls(self):
        SystemMaintenanceState.objects.create(pk=1, is_active=True, updated_by=self.publisher)
        refresh = RefreshToken.for_user(self.publisher)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        response = self.client.get('/api/developer-options/status/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data['maintenance_mode'])

    def test_profile_returns_new_module_privileges(self):
        self.client.force_authenticate(self.publisher)
        response = self.client.get('/api/profile/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data['has_announcement_create'])
        self.assertTrue(response.data['has_developer_options'])

    def test_data_clearing_requires_privilege_and_exact_confirmation(self):
        self.client.force_authenticate(self.publisher)
        Notification.objects.create(recipient=self.recipient, title='Keep until confirmed', message='Test notification')
        denied = self.client.get('/api/developer-options/clear-preview/?scope=notifications')
        self.assertEqual(denied.status_code, 403)

        self.publisher.has_destructive_maintenance = True
        self.publisher.save(update_fields=['has_destructive_maintenance'])
        preview = self.client.get('/api/developer-options/clear-preview/?scope=notifications')
        self.assertEqual(preview.status_code, 200, preview.data)
        self.assertEqual(preview.data['counts']['users.Notification'], 1)
        self.assertEqual(Notification.objects.count(), 1)

        rejected = self.client.post('/api/developer-options/clear-data/', {
            'scope': 'notifications', 'confirmation': 'CLEAR EVERYTHING',
        }, format='json')
        self.assertEqual(rejected.status_code, 400)
        self.assertEqual(Notification.objects.count(), 1)

        cleared = self.client.post('/api/developer-options/clear-data/', {
            'scope': 'notifications', 'confirmation': 'CLEAR NOTIFICATION DATA',
        }, format='json')
        self.assertEqual(cleared.status_code, 200, cleared.data)
        self.assertEqual(Notification.objects.count(), 0)
        self.assertTrue(MaintenanceAuditLog.objects.filter(action='BUSINESS_DATA_CLEARED', scope='notifications').exists())

    def test_business_backup_can_restore_selected_scope_in_test_database(self):
        self.publisher.has_destructive_maintenance = True
        self.publisher.save(update_fields=['has_destructive_maintenance'])
        self.client.force_authenticate(self.publisher)
        with TemporaryDirectory() as backup_dir, override_settings(BASE_DIR=Path(backup_dir)):
            Notification.objects.create(recipient=self.recipient, title='Before backup', message='Restored notification')
            created = self.client.post('/api/developer-options/backups/create/', {}, format='json')
            self.assertEqual(created.status_code, 201, created.data)
            backup_id = created.data['backup_id']
            Notification.objects.create(recipient=self.recipient, title='After backup', message='Should be replaced')
            restored = self.client.post('/api/developer-options/backups/restore/', {
                'backup_id': backup_id,
                'confirmation': f'RESTORE DMS BACKUP {backup_id}',
            }, format='json')
            self.assertEqual(restored.status_code, 200, restored.data)
            self.assertEqual(list(Notification.objects.values_list('title', flat=True)), ['Before backup'])
