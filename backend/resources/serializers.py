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

