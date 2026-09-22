from rest_framework import serializers
from .models import Resource, ResourceCategory, Allocation


class ResourceCategorySerializer(serializers.ModelSerializer):
    manager_username = serializers.CharField(source='manager.username', read_only=True)
    resource_count = serializers.IntegerField(source='resources.count', read_only=True)

    class Meta:
        model = ResourceCategory
        fields = '__all__'

class ResourceSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_manager = serializers.IntegerField(source='category.manager_id', read_only=True)
    category_manager_username = serializers.CharField(source='category.manager.username', read_only=True)
    assigned_room_name = serializers.CharField(source='assigned_room.name', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Resource
        fields = '__all__'

    def validate(self, attrs):
        if not (attrs.get('resource_id') or getattr(self.instance, 'resource_id', None)):
            raise serializers.ValidationError({'resource_id': 'Resource ID is required.'})
        if not (attrs.get('category') or getattr(self.instance, 'category', None)):
            raise serializers.ValidationError({'category': 'Resource category is required.'})
        assigned_room = attrs.get('assigned_room') or getattr(self.instance, 'assigned_room', None)
        if self.instance and assigned_room and assigned_room.pk == self.instance.pk:
            raise serializers.ValidationError({'assigned_room': 'A resource cannot be attached to itself.'})
        status = attrs.get('status') or getattr(self.instance, 'status', None) or 'AVAILABLE'
        condition = attrs.get('condition') or getattr(self.instance, 'condition', None) or 'GOOD'
        if status == 'AVAILABLE' and condition in {'UNDER_REPAIR', 'DAMAGED'}:
            raise serializers.ValidationError({
                'status': 'A resource under repair or damaged cannot be marked Available.'
            })
        return attrs

class AllocationSerializer(serializers.ModelSerializer):
    allocated_to_username = serializers.CharField(source='allocated_to.username', read_only=True)
    resource_name = serializers.CharField(source='resource.name', read_only=True)
    activity_title = serializers.CharField(source='activity.title', read_only=True, default=None, allow_null=True)
    reviewed_by_username = serializers.CharField(source='reviewed_by.username', read_only=True)

    class Meta:
        model = Allocation
        fields = '__all__'
        read_only_fields = ('allocated_to', 'status', 'reviewed_by', 'reviewed_at', 'rejection_reason')

    def validate(self, attrs):
        resource = attrs.get('resource') or getattr(self.instance, 'resource', None)
        start_time = attrs.get('start_time') or getattr(self.instance, 'start_time', None)
        end_time = attrs.get('end_time') or getattr(self.instance, 'end_time', None)

        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({'end_time': 'End time must be after start time.'})

        bookable_statuses = {'AVAILABLE'}
        unbookable_conditions = {'UNDER_REPAIR', 'DAMAGED'}
        if resource and resource.status not in bookable_statuses:
            raise serializers.ValidationError({'resource': 'This resource is not available for booking.'})
        if resource and resource.condition in unbookable_conditions:
            raise serializers.ValidationError({'resource': 'This resource condition does not allow booking.'})

        if resource and start_time and end_time:
            overlapping_allocations = Allocation.objects.filter(
                resource=resource,
                start_time__lt=end_time,
                end_time__gt=start_time,
                status__in=['PENDING', 'APPROVED'],
            )
            if self.instance:
                overlapping_allocations = overlapping_allocations.exclude(pk=self.instance.pk)

            if overlapping_allocations.exists():
                raise serializers.ValidationError({
                    'resource': 'This resource is already booked for the selected time.'
                })

        return attrs
