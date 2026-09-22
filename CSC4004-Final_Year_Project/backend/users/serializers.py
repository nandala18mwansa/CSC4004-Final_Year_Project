from rest_framework import serializers
from .models import User, UserGroupCategory, Notification, RecipientGroup


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
            'is_superuser',
            'is_active',
        )
        read_only_fields = ('is_superuser',)


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
            'is_active',
        )

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
