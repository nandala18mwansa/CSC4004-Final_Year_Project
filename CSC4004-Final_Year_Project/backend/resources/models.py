from django.utils import timezone
from django.db import models
from django.conf import settings
import uuid
from activities.models import Activity


def resource_report_ref():
    return f"RR-{uuid.uuid4().hex[:10].upper()}"


class ResourceCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_resource_categories',
    )

    class Meta:
        db_table = 'resource_categories'
        verbose_name_plural = 'Resource categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Resource(models.Model):
    STATUS_CHOICES = (
        ('AVAILABLE', 'Available'),
        ('BOOKED', 'Booked / Reserved'),
        ('IN_USE', 'In Use'),
        ('UNAVAILABLE', 'Unavailable'),
        ('MAINTENANCE', 'Maintenance'),
        ('UNDER_REPAIR', 'Under Repair'),
        ('RETIRED', 'Retired'),
    )
    CONDITION_CHOICES = (
        ('NEW', 'New'),
        ('GOOD', 'Good'),
        ('FAIR', 'Fair'),
        ('POOR', 'Poor'),
        ('DAMAGED', 'Damaged'),
        ('UNDER_REPAIR', 'Under Repair'),
    )
    resource_id = models.CharField(max_length=80, unique=True, null=True, blank=True)
    name = models.CharField(max_length=100)
    category = models.ForeignKey(ResourceCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='resources')
    assigned_room = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='attached_resources',
        help_text='Optional room or venue this resource belongs to.',
    )
    location = models.CharField(max_length=150, blank=True, default='', help_text='Assigned room name or physical location')
    is_portable = models.BooleanField(default=False)
    condition = models.CharField(max_length=30, choices=CONDITION_CHOICES, default='GOOD')
    description = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')
    date_added = models.DateField(auto_now_add=True, null=True)

    class Meta:
        db_table = 'resources'
        ordering = ['resource_id', 'name']

    def __str__(self):
        return f"{self.resource_id or '-'} - {self.name}"


class ResourceLocationHistory(models.Model):
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name='location_history')
    previous_location = models.CharField(max_length=150, blank=True, default='')
    new_location = models.CharField(max_length=150)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'resource_location_history'
        ordering = ['-changed_at']

    def __str__(self):
        return f"{self.resource.name}: {self.previous_location} -> {self.new_location}"


class ResourceInspection(models.Model):
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name='inspections')
    previous_condition = models.CharField(max_length=30, blank=True, default='')
    current_condition = models.CharField(max_length=30)
    inspection_date = models.DateField(default=timezone.now)
    remarks = models.TextField(blank=True, default='')
    inspected_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'resource_inspections'
        ordering = ['-inspection_date', '-created_at']

    def __str__(self):
        return f"{self.resource.name} inspected on {self.inspection_date} ({self.current_condition})"


class ResourceStatusHistory(models.Model):
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name='status_history')
    previous_status = models.CharField(max_length=20, blank=True, default='')
    new_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'resource_status_history'
        ordering = ['-changed_at']

    def __str__(self):
        return f"{self.resource.name}: {self.previous_status} -> {self.new_status}"


class Allocation(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending Approval'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    )

    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name='allocations')
    allocated_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='allocations')
    activity = models.ForeignKey(Activity, on_delete=models.SET_NULL, null=True, blank=True, related_name='resource_allocations')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    purpose = models.CharField(max_length=200, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_resource_bookings')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        db_table = 'allocations'

    def __str__(self):
        return f"{self.resource.name} allocated to {self.allocated_to.username}"


class ResourceReportRequest(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('REJECTED', 'Rejected'),
    )
    FORMAT_CHOICES = (
        ('PDF', 'PDF'),
        ('EXCEL', 'Excel (.xlsx)'),
        ('CSV', 'CSV (.csv)'),
    )
    REPORT_TYPE_CHOICES = (
        ('RESOURCE_REGISTER', 'Resource Register'),
    )

    reference = models.CharField(max_length=24, unique=True, default=resource_report_ref, editable=False)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='resource_report_requests')
    report_type = models.CharField(max_length=40, choices=REPORT_TYPE_CHOICES, default='RESOURCE_REGISTER')
    report_format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default='PDF')
    filters = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    rejection_reason = models.TextField(blank=True, default='')
    response_notes = models.TextField(blank=True, default='')
    generated_report = models.FileField(upload_to='resource_reports/%Y/%m/', blank=True, null=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name='processed_resource_report_requests')

    class Meta:
        db_table = 'resource_report_requests'
        ordering = ['-requested_at']

    def __str__(self):
        return f"{self.reference} by {self.requested_by.username} ({self.status})"
