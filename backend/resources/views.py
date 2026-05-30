from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsAdminOrManagerOrReadOnly, IsOwnerOrAdminOrManager
from .models import Resource, Allocation
from .serializers import ResourceSerializer, AllocationSerializer
from users.models import User

class ResourceViewSet(viewsets.ModelViewSet):
    queryset = Resource.objects.all()
    serializer_class = ResourceSerializer
    permission_classes = [IsAuthenticated, IsAdminOrManagerOrReadOnly]

class AllocationViewSet(viewsets.ModelViewSet):
    queryset = Allocation.objects.all()
    serializer_class = AllocationSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdminOrManager]

    def perform_create(self, serializer):
        allocated_to = self.request.user
        if self.request.user.role in ['ADMIN', 'MANAGER'] and 'allocated_to' in self.request.data:
            try:
                allocated_to_id = self.request.data.get('allocated_to')
                if allocated_to_id:
                    allocated_to = User.objects.get(id=allocated_to_id)
            except User.DoesNotExist:
                pass
        serializer.save(allocated_to=allocated_to)

