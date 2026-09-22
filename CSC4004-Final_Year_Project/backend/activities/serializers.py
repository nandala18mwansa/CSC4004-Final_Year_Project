import re
from rest_framework import serializers
from .models import Activity, ActivityType
from users.models import User, RecipientGroup


class ActivityTypeSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True, required=False)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    activity_count = serializers.IntegerField(source='activities.count', read_only=True)

    class Meta:
        model = ActivityType
        fields = (
            'id',
            'name',
            'description',
            'is_active',
            'created_by',
            'created_by_username',
            'activity_count',
            'created_at',
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'activity_count')

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError('Activity type name cannot be blank.')
        qs = ActivityType.objects.filter(name__iexact=name)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f'An Activity Type with the name "{name}" already exists.')
        return name


class ActivitySerializer(serializers.ModelSerializer):
    organizer_username = serializers.CharField(source='organizer.username', read_only=True)
    activity_type_name = serializers.SerializerMethodField()
    participant_usernames = serializers.SerializerMethodField()
    participant_category_names = serializers.SerializerMethodField()
    recipient_group_names = serializers.SerializerMethodField()
    participant_summary = serializers.SerializerMethodField()
    unique_recipient_count = serializers.SerializerMethodField()
    reminder_emails = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = '__all__'
        read_only_fields = (
            'organizer',
            'submitted_by',
            'submitted_at',
            'approval_status',
            'reviewed_by',
            'reviewed_at',
            'rejection_reason',
        )

    def validate(self, attrs):
        title = attrs.get('title') or getattr(self.instance, 'title', '')
        if not title.strip():
            raise serializers.ValidationError({'title': 'Activity title is required.'})

        start_date = attrs.get('start_date') or getattr(self.instance, 'start_date', None)
        end_date = attrs.get('end_date') or getattr(self.instance, 'end_date', None)

        if start_date and end_date and end_date <= start_date:
            raise serializers.ValidationError({'end_date': 'End date must be after start date.'})

        external_text = attrs.get('external_participants', '')
        if external_text:
            parts = re.split(r'[\s,;]+', external_text.strip())
            for part in parts:
                p = part.strip()
                if p and not re.match(r'^[^@]+@[^@]+\.[^@]+$', p):
                    raise serializers.ValidationError({'external_participants': f'Invalid email address: "{p}"'})

        return attrs

    def get_activity_type_name(self, obj):
        return obj.activity_type.name if obj.activity_type else 'General Activity'

    def get_participant_usernames(self, obj):
        return list(obj.participants.values_list('username', flat=True))

    def get_participant_category_names(self, obj):
        return list(obj.participant_categories.values_list('name', flat=True))

    def get_recipient_group_names(self, obj):
        return list(obj.recipient_groups.values_list('name', flat=True))

    def get_unique_recipient_count(self, obj):
        seen = set()
        if obj.include_all_staff:
            return User.objects.filter(is_active=True).count()
        for u in obj.participants.filter(is_active=True):
            seen.add(u.id)
        for g in obj.recipient_groups.filter(is_active=True):
            for u in g.members.filter(is_active=True):
                seen.add(u.id)
        for cat in obj.participant_categories.all():
            for u in cat.users.filter(is_active=True):
                seen.add(u.id)
        if obj.organizer_id:
            seen.add(obj.organizer_id)
        return len(seen)

    def get_participant_summary(self, obj):
        if obj.include_all_staff:
            count = User.objects.filter(is_active=True).count()
            return f"All Staff · {count} participants"

        group_names = list(obj.recipient_groups.filter(is_active=True).values_list('name', flat=True))
        indiv_count = obj.participants.filter(is_active=True).count()
        total_count = self.get_unique_recipient_count(obj)

        if group_names and indiv_count > 0:
            if len(group_names) == 1:
                return f"{group_names[0]} + {indiv_count} individual{'s' if indiv_count > 1 else ''} · {total_count} participants"
            return f"{group_names[0]} (+{len(group_names)-1} groups, {indiv_count} indiv.) · {total_count} participants"
        elif group_names:
            if len(group_names) == 1:
                return f"{group_names[0]} · {total_count} participants"
            return f"{', '.join(group_names)} · {total_count} participants"
        elif indiv_count > 0:
            return f"{indiv_count} individual participant{'s' if indiv_count > 1 else ''} · {total_count} total"
        elif obj.external_participants:
            return "External participants only"
        return "No participants assigned"

    def get_reminder_emails(self, obj):
        recipients = set()
        if obj.include_all_staff:
            recipients.update(
                User.objects.filter(is_active=True).exclude(email='').values_list('email', flat=True)
            )
        recipients.update(obj.participants.exclude(email='').values_list('email', flat=True))
        for g in obj.recipient_groups.filter(is_active=True):
            recipients.update(g.members.filter(is_active=True).exclude(email='').values_list('email', flat=True))
        for category in obj.participant_categories.all():
            recipients.update(category.users.filter(is_active=True).exclude(email='').values_list('email', flat=True))
        if obj.organizer and obj.organizer.email:
            recipients.add(obj.organizer.email)
        return sorted(recipients)
