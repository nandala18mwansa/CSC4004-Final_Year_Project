from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsOwnerOrAdminOrManager
from .models import Activity
from .serializers import ActivitySerializer

class ActivityViewSet(viewsets.ModelViewSet):
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdminOrManager]

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)

