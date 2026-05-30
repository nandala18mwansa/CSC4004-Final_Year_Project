from rest_framework import generics, permissions, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import User
from .serializers import UserSerializer, RegisterSerializer


class RegisterView(generics.CreateAPIView):
    """POST-only view to register a new user."""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class ProfileView(generics.RetrieveAPIView):
    """GET view that returns the currently authenticated user's details."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserListView(generics.ListAPIView):
    """GET view that returns all users."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]


from .permissions import IsAdmin


class UserManagementViewSet(viewsets.ModelViewSet):
    """Admin-only viewset for managing user roles and responsibilities."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    
    @action(detail=True, methods=['patch'])
    def assign_role(self, request, pk=None):
        """Assign a role to a user."""
        user = self.get_object()
        role = request.data.get('role')
        department = request.data.get('department')
        
        if role and role in dict(User.ROLE_CHOICES):
            user.role = role
        if department:
            user.department = department
        
        user.save()
        return Response(UserSerializer(user).data)
