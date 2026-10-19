from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver
from django.utils.deconstruct import deconstructible
import uuid


@deconstructible
class PrivateAnnouncementStorage(FileSystemStorage):
    """Store announcement files outside the publicly served media directory."""
    def __init__(self):
        super().__init__(location=settings.BASE_DIR / 'private_announcement_files', base_url=None)


def announcement_attachment_path(instance, filename):
    suffix = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'bin'
    return f'announcements/{instance.announcement_id}/{uuid.uuid4().hex}.{suffix}'


class UserGroupCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_group_categories'
        verbose_name_plural = 'User group categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('STAFF', 'Staff'),
        ('MANAGER', 'Manager'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='STAFF')
    department = models.CharField(max_length=100, blank=True, null=True, default='')
    user_category = models.ForeignKey(
        UserGroupCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users'
    )
    has_finance_privilege = models.BooleanField(
        default=False,
        help_text='Grants privilege to create, edit, and submit finance requests.'
    )
    has_finance_balance_access = models.BooleanField(
        default=False,
        help_text='Grants privilege to view departmental balance and budget overview figures.'
    )
    has_resource_privilege = models.BooleanField(
        default=False,
        help_text='Grants privilege to create, edit, and manage department resources and assets.'
    )
    has_activity_privilege = models.BooleanField(
        default=False,
        help_text='Grants privilege to create, edit, reschedule, and manage departmental activities.'
    )
    has_control_privilege = models.BooleanField(
        default=False,
        help_text='Grants privilege to access Control & Access and manage user accounts.'
    )
    has_announcement_view = models.BooleanField(default=False)
    has_announcement_create = models.BooleanField(default=False)
    has_announcement_publish = models.BooleanField(default=False)
    has_announcement_archive = models.BooleanField(default=False)
    has_announcement_manage_all = models.BooleanField(default=False)
    has_developer_options = models.BooleanField(default=False)
    has_destructive_maintenance = models.BooleanField(default=False)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    @property
    def is_admin(self):
        return self.role == 'ADMIN'

    def can_manage_finance(self):
        return self.is_superuser or self.has_finance_privilege

    def can_view_finance_balances(self):
        return self.is_superuser or self.has_finance_privilege or self.has_finance_balance_access

    def can_manage_resources(self):
        return self.is_superuser or self.has_resource_privilege

    def can_manage_activities(self):
        return self.is_superuser or self.has_activity_privilege

    def can_manage_control(self):
        return self.is_superuser or self.has_control_privilege


class RecipientGroup(models.Model):
    name = models.CharField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_recipient_groups'
    )
    members = models.ManyToManyField(
        'users.User',
        blank=True,
        related_name='recipient_groups'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'recipient_groups'
        ordering = ['name']

    def __str__(self):
        return self.name


class Announcement(models.Model):
    STATUS_CHOICES = (('DRAFT', 'Draft'), ('PUBLISHED', 'Published'), ('ARCHIVED', 'Archived'))
    PRIORITY_CHOICES = (('NORMAL', 'Normal'), ('IMPORTANT', 'Important'), ('URGENT', 'Urgent'))
    title = models.CharField(max_length=200)
    message = models.TextField()
    category = models.CharField(max_length=40, default='GENERAL')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='NORMAL')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    publish_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    include_all_staff = models.BooleanField(default=False)
    shared_modules = models.JSONField(default=list, blank=True)
    audience_users = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='targeted_announcements')
    audience_groups = models.ManyToManyField(RecipientGroup, blank=True, related_name='announcements')
    audience_categories = models.ManyToManyField(UserGroupCategory, blank=True, related_name='announcements')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='created_announcements')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'announcements'
        ordering = ['-publish_at', '-created_at']


class AnnouncementCategory(models.Model):
    name = models.CharField(max_length=40, unique=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'announcement_categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class AnnouncementAttachment(models.Model):
    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(storage=PrivateAnnouncementStorage(), upload_to=announcement_attachment_path)
    original_filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100)
    size = models.PositiveIntegerField()
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='uploaded_announcement_attachments')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'announcement_attachments'
        ordering = ['created_at', 'id']


@receiver(post_delete, sender=AnnouncementAttachment)
def remove_announcement_attachment_file(sender, instance, **kwargs):
    if instance.file:
        instance.file.delete(save=False)


class AnnouncementDelivery(models.Model):
    STATUS_CHOICES = (('PENDING', 'Pending'), ('SENT', 'Sent'), ('FAILED', 'Failed'))
    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE, related_name='deliveries')
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='announcement_deliveries')
    email = models.EmailField(blank=True, default='')
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default='PENDING')
    attempts = models.PositiveSmallIntegerField(default=0)
    last_error = models.CharField(max_length=300, blank=True, default='')
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'announcement_deliveries'
        constraints = [models.UniqueConstraint(fields=['announcement', 'recipient'], name='uniq_announcement_recipient')]


class SystemMaintenanceState(models.Model):
    is_active = models.BooleanField(default=False)
    message = models.CharField(max_length=300, default='The system is temporarily unavailable for maintenance.')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'system_maintenance_state'


class MaintenanceAuditLog(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    action = models.CharField(max_length=40)
    scope = models.CharField(max_length=200, blank=True, default='')
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'maintenance_audit_log'
        ordering = ['-created_at']


class Notification(models.Model):
    TYPE_CHOICES = (
        ('GENERAL', 'General Notification'),
        ('ACTIVITY_INVITE', 'Activity Invitation'),
        ('ACTIVITY_UPDATE', 'Activity Update'),
        ('ACTIVITY_CANCEL', 'Activity Cancelled'),
        ('EXPENSE_SUBMITTED', 'Expense Submitted'),
        ('EXPENSE_APPROVED', 'Expense Approved'),
        ('EXPENSE_REJECTED', 'Expense Rejected'),
        ('REPORT_READY', 'Financial Report Ready'),
        ('REPORT_REJECTED', 'Financial Report Rejected'),
        ('ACTIVITY_SUBMITTED', 'Activity Submitted'),
        ('ACTIVITY_APPROVED', 'Activity Approved'),
        ('ACTIVITY_REJECTED', 'Activity Rejected'),
        ('RESOURCE_ASSIGNED', 'Resource Assigned'),
        ('RESOURCE_TRANSFER', 'Resource Location Transferred'),
        ('RESOURCE_BOOKING', 'Resource Booking'),
        ('RESOURCE_APPROVED', 'Resource Booking Approved'),
        ('RESOURCE_REJECTED', 'Resource Booking Rejected'),
    )
    recipient = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='dms_notifications'
    )
    notification_type = models.CharField(
        max_length=40,
        choices=TYPE_CHOICES,
        default='GENERAL'
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    link = models.CharField(max_length=255, blank=True, default='')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'dms_notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.notification_type}] {self.title} -> {self.recipient.username}"
