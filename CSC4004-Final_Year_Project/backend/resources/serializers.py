from rest_framework import serializers
from .models import Resource, Allocation

class ResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resource
        fields = '__all__'

class AllocationSerializer(serializers.ModelSerializer):
    allocated_to_username = serializers.CharField(source='allocated_to.username', read_only=True)
    resource_name = serializers.CharField(source='resource.name', read_only=True)
    activity_title = serializers.CharField(source='activity.title', read_only=True, default=None, allow_null=True)

    class Meta:
        model = Allocation
        fields = '__all__'
        read_only_fields = ('allocated_to',)

    def validate(self, attrs):
        resource = attrs.get('resource') or getattr(self.instance, 'resource', None)
        start_time = attrs.get('start_time') or getattr(self.instance, 'start_time', None)
        end_time = attrs.get('end_time') or getattr(self.instance, 'end_time', None)

        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({'end_time': 'End time must be after start time.'})

        if resource and resource.status != 'AVAILABLE':
            raise serializers.ValidationError({'resource': 'This resource is not available for booking.'})

        if resource and start_time and end_time:
            overlapping_allocations = Allocation.objects.filter(
                resource=resource,
                start_time__lt=end_time,
                end_time__gt=start_time,
            )
            if self.instance:
                overlapping_allocations = overlapping_allocations.exclude(pk=self.instance.pk)

            if overlapping_allocations.exists():
                raise serializers.ValidationError({
                    'resource': 'This resource is already booked for the selected time.'
                })

        return attrs
