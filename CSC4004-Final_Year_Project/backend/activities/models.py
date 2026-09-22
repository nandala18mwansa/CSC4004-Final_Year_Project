from django.db import models
from django.conf import settings
from django.utils.http import urlencode
from django.utils.dateparse import parse_datetime


def build_google_calendar_link(activity):
    start_dt = activity.start_date
    if isinstance(start_dt, str):
        start_dt = parse_datetime(start_dt)
    end_dt = activity.end_date
    if isinstance(end_dt, str):
        end_dt = parse_datetime(end_dt)

    if not start_dt or not end_dt:
        return ''

    params = {
        'action': 'TEMPLATE',
        'text': activity.title,
        'details': activity.description or '',
        'dates': (
            f"{start_dt.strftime('%Y%m%dT%H%M%SZ')}/"
            f"{end_dt.strftime('%Y%m%dT%H%M%SZ')}"
        ),
    }
    if activity.location:
        params['location'] = activity.location
    return f"https://calendar.google.com/calendar/render?{urlencode(params)}"


class ActivityType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_activity_types'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'activity_types'
        ordering = ['name']

    def __str__(self):
        return self.name


class Activity(models.Model):
    STATUS_CHOICES = (
        ('PENDING_APPROVAL', 'Pending Approval'),
        ('SCHEDULED', 'Scheduled'),
        ('RESCHEDULED', 'Rescheduled'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
        ('REJECTED', 'Rejected'),
    )
    APPROVAL_STATUS_CHOICES = (
        ('PENDING', 'Pending Approval'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    )

    title = models.CharField(max_length=200)
    description = models.TextField()
    activity_type = models.ForeignKey(
        ActivityType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activities'
    )
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='PENDING_APPROVAL')
    location = models.CharField(max_length=200, blank=True, default='')
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    organizer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='organized_activities')
    submitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='submitted_activities')
    submitted_at = models.DateTimeField(auto_now_add=True, null=True)
    approval_status = models.CharField(max_length=20, choices=APPROVAL_STATUS_CHOICES, default='PENDING')
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_activities')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, default='')
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='activities_to_attend')
    participant_categories = models.ManyToManyField('users.UserGroupCategory', blank=True, related_name='activities')
    recipient_groups = models.ManyToManyField('users.RecipientGroup', blank=True, related_name='activities')
    external_participants = models.TextField(blank=True, default='', help_text='Comma/semicolon/newline-separated emails')
    include_all_staff = models.BooleanField(default=False)
    send_email_reminders = models.BooleanField(default=True)
    reminder_minutes_before = models.PositiveIntegerField(default=60)
    google_calendar_link = models.TextField(blank=True, default='')
    google_event_id = models.CharField(max_length=255, blank=True, null=True)
    sequence = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        db_table = 'activities'
    
    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        calendar_link = build_google_calendar_link(self)
        if self.google_calendar_link != calendar_link:
            self.google_calendar_link = calendar_link
            super().save(update_fields=['google_calendar_link'])
