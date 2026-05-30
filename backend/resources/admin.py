from django.contrib import admin
from .models import Resource, Allocation


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'status')
    list_filter = ('status',)


@admin.register(Allocation)
class AllocationAdmin(admin.ModelAdmin):
    list_display = ('resource', 'allocated_to', 'activity', 'start_time', 'end_time')
