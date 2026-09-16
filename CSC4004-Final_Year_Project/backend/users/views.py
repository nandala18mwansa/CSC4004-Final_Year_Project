from rest_framework import generics, permissions, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import User
from .permissions import IsAdmin
from .serializers import UserSerializer, RegisterSerializer


from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.exceptions import AuthenticationFailed


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username_or_email = attrs.get(self.username_field)
        user = None

        if username_or_email:
            user = User.objects.filter(username=username_or_email).first()
            if not user and '@' in username_or_email:
                user = User.objects.filter(email=username_or_email).first()

            if user:
                attrs[self.username_field] = user.username
                if not user.is_active:
                    raise AuthenticationFailed("login failed, account blocked")

        try:
            data = super().validate(attrs)
            return data
        except Exception as exc:
            if user and not user.is_active:
                raise AuthenticationFailed("login failed, account blocked")
            raise exc


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


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
    """GET view that returns all users for administrators."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]


from .serializers import UserSerializer, RegisterSerializer, AdminCreateUserSerializer
class UserManagementViewSet(viewsets.ModelViewSet):
    """Admin-only viewset for adding, managing, blocking, and deleting users."""
    queryset = User.objects.all().order_by('-id')
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        if self.action == 'create':
            return AdminCreateUserSerializer
        return UserSerializer

    @action(detail=True, methods=['patch'])
    def assign_role(self, request, pk=None):
        """Assign role, department, and email to a user."""
        user = self.get_object()
        role = request.data.get('role')
        department = request.data.get('department')
        email = request.data.get('email')
        
        if role and role in dict(User.ROLE_CHOICES):
            user.role = role
        if department is not None:
            user.department = department
        if email is not None:
            user.email = email
        
        user.save()
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=['patch'])
    def toggle_block(self, request, pk=None):
        """Block or unblock user access."""
        user = self.get_object()
        is_active = request.data.get('is_active')
        if is_active is not None:
            user.is_active = bool(is_active)
        else:
            user.is_active = not user.is_active
        user.save()
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=['patch'])
    def reset_password(self, request, pk=None):
        """Reset a user's password."""
        user = self.get_object()
        new_password = request.data.get('password')
        if not new_password:
            return Response({'detail': 'New password is required.'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save()
        return Response({'detail': f'Password for {user.username} has been updated successfully.'})
