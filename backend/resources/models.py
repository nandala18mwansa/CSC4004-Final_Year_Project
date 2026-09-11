from django.db import models
from django.conf import settings
from activities.models import Activity

class Resource(models.Model):
    CATEGORY_CHOICES = (
        ('ROOMS', 'Rooms & Venues'),
        ('HARDWARE', 'IT & Hardware'),
        ('VEHICLES', 'Vehicles'),
        ('AV', 'Audio / Visual'),
        ('LAB', 'Laboratory & Equipment'),
        ('GENERAL', 'General Office Assets'),
    )
    STATUS_CHOICES = (
        ('AVAILABLE', 'Available'),
        ('IN_USE', 'In Use'),
        ('MAINTENANCE', 'Maintenance'),
    )
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='GENERAL')
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')

    def __str__(self):
        return self.name

class Allocation(models.Model):
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name='allocations')
    allocated_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='allocations')
    activity = models.ForeignKey(Activity, on_delete=models.SET_NULL, null=True, blank=True, related_name='resource_allocations')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()

    def __str__(self):
        return f"{self.resource.name} allocated to {self.allocated_to.username}"
