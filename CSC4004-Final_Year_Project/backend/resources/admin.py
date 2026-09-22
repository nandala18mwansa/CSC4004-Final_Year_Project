from django.contrib import admin
from .models import Resource, ResourceCategory, Allocation


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
