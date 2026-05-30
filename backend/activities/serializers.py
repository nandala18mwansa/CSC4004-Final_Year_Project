from rest_framework import serializers
from .models import Activity

class ActivitySerializer(serializers.ModelSerializer):
    organizer_username = serializers.CharField(source='organizer.username', read_only=True)

    class Meta:
        model = Activity
        fields = '__all__'
