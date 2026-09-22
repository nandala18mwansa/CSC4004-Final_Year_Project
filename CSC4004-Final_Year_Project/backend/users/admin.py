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
            'has_resource_privilege',
            'has_activity_privilege',
        )}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Extra Info', {'fields': (
            'role',
            'department',
            'user_category',
            'has_finance_privilege',
            'has_resource_privilege',
            'has_activity_privilege',
        )}),
    )
    list_display = ('username', 'email', 'role', 'department', 'user_category', 'is_active')
    list_filter = ('role', 'user_category', 'has_finance_privilege', 'has_resource_privilege', 'has_activity_privilege')
