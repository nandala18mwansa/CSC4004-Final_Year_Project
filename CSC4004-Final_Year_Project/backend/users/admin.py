from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserGroupCategory


@admin.register(UserGroupCategory)
class UserGroupCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name', 'description')


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Extra Info', {'fields': (
            'role',
            'department',
            'user_category',
            'has_finance_privilege',
            'has_finance_balance_access',
            'has_resource_privilege',
            'has_activity_privilege',
            'has_control_privilege',
            'has_announcement_view', 'has_announcement_create', 'has_announcement_publish', 'has_announcement_archive',
            'has_announcement_manage_all', 'has_developer_options', 'has_destructive_maintenance',
        )}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Extra Info', {'fields': (
            'role',
            'department',
            'user_category',
            'has_finance_privilege',
            'has_finance_balance_access',
            'has_resource_privilege',
            'has_activity_privilege',
            'has_control_privilege',
            'has_announcement_view', 'has_announcement_create', 'has_announcement_publish', 'has_announcement_archive',
            'has_announcement_manage_all', 'has_developer_options', 'has_destructive_maintenance',
        )}),
    )
    list_display = ('username', 'email', 'role', 'department', 'user_category', 'is_active')
    list_filter = (
        'role',
        'user_category',
        'has_finance_privilege',
        'has_finance_balance_access',
        'has_resource_privilege',
        'has_activity_privilege',
        'has_control_privilege',
        'has_announcement_view', 'has_announcement_create', 'has_announcement_publish', 'has_announcement_archive',
        'has_announcement_manage_all', 'has_developer_options', 'has_destructive_maintenance',
    )
