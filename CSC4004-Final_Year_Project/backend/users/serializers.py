from rest_framework import serializers
from django.utils import timezone
from .models import (User, UserGroupCategory, Notification, RecipientGroup, Announcement,
                     AnnouncementCategory, AnnouncementAttachment)


class UserGroupCategorySerializer(serializers.ModelSerializer):
    user_count = serializers.IntegerField(source='users.count', read_only=True)

    class Meta:
        model = UserGroupCategory
        fields = ('id', 'name', 'description', 'user_count', 'created_at')


class UserSerializer(serializers.ModelSerializer):
    user_category_name = serializers.CharField(source='user_category.name', read_only=True)

    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'department',
            'user_category',
            'user_category_name',
            'has_finance_privilege',
            'has_finance_balance_access',
            'has_resource_privilege',
            'has_activity_privilege',
            'has_control_privilege',
            'has_announcement_view',
            'has_announcement_create',
            'has_announcement_publish',
            'has_announcement_archive',
            'has_announcement_manage_all',
            'has_developer_options',
            'has_destructive_maintenance',
            'is_superuser',
            'is_active',
        )
        read_only_fields = ('is_superuser',)


class UserDirectorySerializer(serializers.ModelSerializer):
    """Minimal user data for authenticated participant and recipient pickers."""
    user_category_name = serializers.CharField(source='user_category.name', read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 'role',
            'department', 'user_category', 'user_category_name',
        )
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'password', 'email', 'department', 'user_category')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data.get('email', ''),
            role='STAFF',
            department=validated_data.get('department', ''),
            user_category=validated_data.get('user_category'),
        )
        return user


class AdminCreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'password',
            'email',
            'role',
            'department',
            'user_category',
            'has_finance_privilege',
            'has_finance_balance_access',
            'has_resource_privilege',
            'has_activity_privilege',
            'has_control_privilege',
            'has_announcement_view',
            'has_announcement_create',
            'has_announcement_publish',
            'has_announcement_archive',
            'has_announcement_manage_all',
            'has_developer_options',
            'has_destructive_maintenance',
            'is_active',
        )

    def validate(self, attrs):
        role = attrs.get('role', getattr(self.instance, 'role', 'STAFF'))
        if role != 'ADMIN':
            attrs['has_developer_options'] = False
            attrs['has_destructive_maintenance'] = False
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data.get('email', ''),
            role=validated_data.get('role', 'STAFF'),
            department=validated_data.get('department', ''),
            user_category=validated_data.get('user_category'),
            has_finance_privilege=validated_data.get('has_finance_privilege', False),
            has_finance_balance_access=validated_data.get('has_finance_balance_access', False),
            has_resource_privilege=validated_data.get('has_resource_privilege', False),
            has_activity_privilege=validated_data.get('has_activity_privilege', False),
            has_control_privilege=validated_data.get('has_control_privilege', False),
            has_announcement_view=validated_data.get('has_announcement_view', False),
            has_announcement_create=validated_data.get('has_announcement_create', False),
            has_announcement_publish=validated_data.get('has_announcement_publish', False),
            has_announcement_archive=validated_data.get('has_announcement_archive', False),
            has_announcement_manage_all=validated_data.get('has_announcement_manage_all', False),
            has_developer_options=validated_data.get('has_developer_options', False),
            has_destructive_maintenance=validated_data.get('has_destructive_maintenance', False),
            is_active=validated_data.get('is_active', True)
        )
        return user


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = (
            'id',
            'notification_type',
            'title',
            'message',
            'link',
            'is_read',
            'created_at',
        )
        read_only_fields = ('id', 'notification_type', 'title', 'message', 'link', 'created_at')


class RecipientGroupSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True, required=False)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    member_count = serializers.IntegerField(source='members.count', read_only=True)
    member_usernames = serializers.SerializerMethodField()
    member_details = serializers.SerializerMethodField()

    class Meta:
        model = RecipientGroup
        fields = (
            'id',
            'name',
            'description',
            'is_active',
            'created_by',
            'created_by_username',
            'members',
            'member_count',
            'member_usernames',
            'member_details',
            'created_at',
        )
        read_only_fields = ('id', 'created_by', 'created_at')

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError('Group name cannot be blank.')
        qs = RecipientGroup.objects.filter(name__iexact=name)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f'A participant group with the name "{name}" already exists.')
        return name

    def get_member_usernames(self, obj):
        return list(obj.members.values_list('username', flat=True))

    def get_member_details(self, obj):
        return [
            {
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'name': f"{u.first_name} {u.last_name}".strip() or u.username,
            }
            for u in obj.members.filter(is_active=True)
        ]


class AnnouncementCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AnnouncementCategory
        fields = ('id', 'name', 'is_active', 'created_at')
        read_only_fields = ('id', 'is_active', 'created_at')

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError('Category name cannot be blank.')
        existing = AnnouncementCategory.objects.filter(name__iexact=name)
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError('An announcement category with this name already exists.')
        return name


class AnnouncementAttachmentSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = AnnouncementAttachment
        fields = ('id', 'original_filename', 'content_type', 'size', 'created_at', 'download_url')
        read_only_fields = fields

    def get_download_url(self, obj):
        return f'/api/announcements/{obj.announcement_id}/attachments/{obj.id}/download/'


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    delivery_summary = serializers.SerializerMethodField()
    attachments = AnnouncementAttachmentSerializer(many=True, read_only=True)
    SHARED_MODULES = {
        'budgets', 'ledger', 'expenses', 'reports', 'assets', 'activities', 'other',
    }

    class Meta:
        model = Announcement
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at', 'updated_at', 'publish_at')

    def get_delivery_summary(self, obj):
        return {
            'sent': obj.deliveries.filter(status='SENT').count(),
            'failed': obj.deliveries.filter(status='FAILED').count(),
            'pending': obj.deliveries.filter(status='PENDING').count(),
        }

    def validate_shared_modules(self, value):
        if not isinstance(value, list) or any(
            not isinstance(item, str) or item not in self.SHARED_MODULES for item in value
        ):
            raise serializers.ValidationError('Choose one or more supported DMS information areas.')
        return list(dict.fromkeys(value))

    def validate_category(self, value):
        name = value.strip()
        if not AnnouncementCategory.objects.filter(name__iexact=name, is_active=True).exists():
            raise serializers.ValidationError('Choose an existing announcement category or create a new one first.')
        return name

    def validate(self, attrs):
        expiry = attrs.get('expires_at', getattr(self.instance, 'expires_at', None))
        if expiry and expiry <= timezone.now():
            raise serializers.ValidationError({'expires_at': 'Expiry must be in the future.'})
        return attrs
