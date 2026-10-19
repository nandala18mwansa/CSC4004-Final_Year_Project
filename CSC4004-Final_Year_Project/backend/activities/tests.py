from datetime import timedelta

from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from activities.models import Activity
from resources.models import Allocation, Resource
from users.models import User


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class ActivityResourceReservationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.scheduler = User.objects.create(
            username='scheduler', email='scheduler@example.com', is_active=True, has_activity_privilege=True,
        )
        cls.resource = Resource.objects.create(
            resource_id='ROOM-1', name='Planning Room', is_portable=False, status='AVAILABLE',
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.scheduler)
        self.start = timezone.now() + timedelta(days=2)
        self.end = self.start + timedelta(hours=2)

    def payload(self, title):
        return {
            'title': title, 'description': 'Planning session',
            'start_date': self.start.isoformat(), 'end_date': self.end.isoformat(),
            'resource_ids': [self.resource.pk],
        }

    def test_future_event_reservation_marks_nonportable_resource_in_use(self):
        response = self.client.post('/api/activities/', self.payload('Planning event'), format='json')

        self.assertEqual(response.status_code, 201, response.data)
        reservation = Allocation.objects.get(activity_id=response.data['id'], resource=self.resource)
        self.assertEqual(reservation.status, 'APPROVED')
        self.resource.refresh_from_db()
        self.assertEqual(self.resource.status, 'IN_USE')
        self.assertEqual(response.data['resource_summary'][0]['id'], self.resource.pk)

    def test_pending_event_marks_resource_in_use_only_after_approval(self):
        requester = User.objects.create_user(username='event-requester', password='test-pass')
        self.client.force_authenticate(requester)
        response = self.client.post('/api/activities/', self.payload('Staff planning event'), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        reservation = Allocation.objects.get(activity_id=response.data['id'], resource=self.resource)
        self.assertEqual(reservation.status, 'PENDING')
        self.resource.refresh_from_db()
        self.assertEqual(self.resource.status, 'AVAILABLE')

        self.client.force_authenticate(self.scheduler)
        approval = self.client.post(f"/api/activities/{response.data['id']}/approve/", {}, format='json')
        self.assertEqual(approval.status_code, 200, approval.data)
        reservation.refresh_from_db()
        self.resource.refresh_from_db()
        self.assertEqual(reservation.status, 'APPROVED')
        self.assertEqual(self.resource.status, 'IN_USE')

    def test_pending_activity_emails_activity_reviewers(self):
        requester = User.objects.create_user(
            username='email-requester', password='test-pass', email='requester@example.com',
        )
        self.client.force_authenticate(requester)
        response = self.client.post('/api/activities/', self.payload('Reviewable activity'), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['approval_status'], 'PENDING')
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['scheduler@example.com'])

    def test_approved_event_marks_portable_asset_booked(self):
        portable = Resource.objects.create(
            resource_id='LAPTOP-1', name='Portable laptop', is_portable=True, status='AVAILABLE',
        )
        payload = self.payload('Portable asset event')
        payload['resource_ids'] = [portable.pk]
        response = self.client.post('/api/activities/', payload, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        portable.refresh_from_db()
        self.assertEqual(portable.status, 'BOOKED')

    def test_selecting_room_also_reserves_and_books_its_attached_assets(self):
        attached_asset = Resource.objects.create(
            resource_id='ROOM-LAPTOP-1', name='Room laptop', is_portable=True,
            assigned_room=self.resource, status='AVAILABLE',
        )
        response = self.client.post('/api/activities/', self.payload('Room event'), format='json')
        self.assertEqual(response.status_code, 201, response.data)

        reservations = Allocation.objects.filter(activity_id=response.data['id'])
        self.assertEqual(set(reservations.values_list('resource_id', flat=True)), {self.resource.pk, attached_asset.pk})
        self.resource.refresh_from_db()
        attached_asset.refresh_from_db()
        self.assertEqual(self.resource.status, 'IN_USE')
        self.assertEqual(attached_asset.status, 'BOOKED')

    def test_cancelling_event_releases_reserved_resource(self):
        response = self.client.post('/api/activities/', self.payload('Cancelled event'), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        cancelled = self.client.post(f"/api/activities/{response.data['id']}/cancel/", {'reason': 'No longer required'}, format='json')
        self.assertEqual(cancelled.status_code, 200, cancelled.data)
        self.resource.refresh_from_db()
        self.assertEqual(self.resource.status, 'AVAILABLE')

    def test_overlapping_event_resource_reservation_is_rejected(self):
        Activity.objects.create(
            title='Existing event', description='Existing', start_date=self.start, end_date=self.end,
            organizer=self.scheduler, approval_status='APPROVED', status='SCHEDULED',
        )
        existing = Activity.objects.get(title='Existing event')
        Allocation.objects.create(
            resource=self.resource, allocated_to=self.scheduler, activity=existing,
            start_time=self.start, end_time=self.end, purpose=existing.title, status='APPROVED',
        )

        response = self.client.post('/api/activities/', self.payload('Conflicting event'), format='json')

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Allocation.objects.filter(resource=self.resource).count(), 1)
