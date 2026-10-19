"""Exercise the HTTPS email adapter without sending email or using a database."""

import base64
import json
from unittest.mock import patch
from types import SimpleNamespace

from django.core.mail import EmailMultiAlternatives
from django.test import SimpleTestCase, override_settings
from requests import Response

from anymail.exceptions import AnymailAPIError


@override_settings(
    EMAIL_BACKEND='anymail.backends.brevo.EmailBackend',
    ANYMAIL={'BREVO_API_KEY': 'test-key-not-a-real-credential', 'REQUESTS_TIMEOUT': 10},
)
class BrevoEmailTests(SimpleTestCase):
    def message(self):
        return EmailMultiAlternatives(
            subject='[DMS] Activity Invitation',
            body='Your activity is scheduled.',
            from_email='DMS <sender@example.com>',
            to=['participant@example.com'],
        )

    def response(self, status, data):
        response = Response()
        response.status_code = status
        response._content = json.dumps(data).encode()
        response.headers['Content-Type'] = 'application/json'
        return response

    @patch('requests.Session.send')
    def test_invitation_preserves_recipient_and_calendar_attachment(self, send):
        send.return_value = self.response(201, {'messageId': '<test@example.com>'})
        calendar = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n'
        message = self.message()
        message.attach('invite.ics', calendar, 'text/calendar; method=REQUEST; charset=UTF-8')
        self.assertEqual(message.send(), 1)
        request = send.call_args.args[0]
        self.assertEqual(request.url, 'https://api.brevo.com/v3/smtp/email')
        self.assertEqual(request.headers['api-key'], 'test-key-not-a-real-credential')
        payload = json.loads(request.body)
        self.assertEqual(payload['to'], [{'email': 'participant@example.com'}])
        self.assertEqual(payload['textContent'], message.body)
        self.assertEqual(payload['attachment'][0]['name'], 'invite.ics')
        self.assertEqual(base64.b64decode(payload['attachment'][0]['content']).decode(), calendar)

    @patch('requests.Session.send')
    def test_provider_rejection_is_reported(self, send):
        send.return_value = self.response(401, {'code': 'unauthorized', 'message': 'Invalid API key'})
        with self.assertRaises(AnymailAPIError):
            self.message().send(fail_silently=False)

    @patch('requests.Session.send')
    def test_silent_send_failure_does_not_report_success(self, send):
        send.return_value = self.response(401, {'code': 'unauthorized', 'message': 'Invalid API key'})
        self.assertEqual(self.message().send(fail_silently=True), 0)

    @patch('users.notifications.Notification.objects.create')
    @patch('requests.Session.send')
    def test_notification_survives_rejected_email_and_logs_reason(self, send, create):
        from users.notifications import notify_user

        send.return_value = self.response(401, {'code': 'unauthorized', 'message': 'Invalid API key'})
        recipient = SimpleNamespace(username='test', email='participant@example.com')
        with self.assertLogs('users.notifications', level='WARNING') as logs:
            notification = notify_user(recipient, 'Invitation', 'Test activity')
        self.assertIs(notification, create.return_value)
        self.assertIn('Invalid API key', '\n'.join(logs.output))
        self.assertNotIn('test-key-not-a-real-credential', '\n'.join(logs.output))
