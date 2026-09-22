from django.contrib.auth.models import AbstractUser
from django.db import models


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
