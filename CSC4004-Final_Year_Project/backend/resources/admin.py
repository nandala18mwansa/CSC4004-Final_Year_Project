from django.contrib import admin
from .models import Resource, ResourceCategory, Allocation, ResourceReportRequest


@admin.register(ResourceCategory)
class ResourceCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'manager')
    search_fields = ('name', 'description', 'manager__username')


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ('resource_id', 'name', 'category', 'assigned_room', 'status')
    list_filter = ('status', 'category')
    search_fields = ('resource_id', 'name', 'description')


@admin.register(Allocation)
class AllocationAdmin(admin.ModelAdmin):
    list_display = ('resource', 'allocated_to', 'activity', 'start_time', 'end_time')


@admin.register(ResourceReportRequest)
class ResourceReportRequestAdmin(admin.ModelAdmin):
    list_display = ('reference', 'requested_by', 'report_format', 'status', 'requested_at', 'processed_by')
    list_filter = ('status', 'report_format', 'requested_at')
    search_fields = ('reference', 'requested_by__username', 'requested_by__email')
    readonly_fields = ('reference', 'requested_at', 'processed_at')
