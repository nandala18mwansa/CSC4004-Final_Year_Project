from rest_framework import generics, permissions, viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import EmailMultiAlternatives
from django.core.validators import validate_email
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from .models import User, UserGroupCategory, Notification, RecipientGroup
from .permissions import IsAdmin, has_activity_privilege
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    AdminCreateUserSerializer,
    UserGroupCategorySerializer,
    NotificationSerializer,
    RecipientGroupSerializer,
)

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
    """GET view that returns users for participant selection and collaboration."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = str(request.data.get('email') or '').strip().lower()
        generic = {
            'detail': 'If an account exists for this email address, a password reset link has been sent.'
        }

        try:
            validate_email(email)
        except DjangoValidationError:
            return Response({'email': 'Enter a valid email address.'}, status=status.HTTP_400_BAD_REQUEST)

        users = User.objects.filter(email__iexact=email, is_active=True)
        for user in users:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password/{uid}/{token}"
            subject = '[DMS] Password Reset Request'
            text_body = (
                "THE UNIVERSITY OF ZAMBIA\n"
                "Department of Computing & Informatics\n"
                "Departmental Management System\n\n"
                "Password Reset Request\n\n"
                "A password reset was requested for your DMS account.\n\n"
                "Use the secure link below to create a new password.\n\n"
                f"{reset_link}\n\n"
                "If you did not request this password reset, you may ignore this email."
            )
            html_body = f"""
                <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
                  <h2 style="margin-bottom: 4px;">THE UNIVERSITY OF ZAMBIA</h2>
                  <div>Department of Computing &amp; Informatics</div>
                  <div>Departmental Management System</div>
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 18px 0;" />
                  <h3>Password Reset Request</h3>
                  <p>A password reset was requested for your DMS account.</p>
                  <p>Use the secure link below to create a new password.</p>
                  <p>
                    <a href="{reset_link}" style="display:inline-block;background:#ea580c;color:#ffffff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600;">
                      Reset Password
                    </a>
                  </p>
                  <p style="color:#64748b;font-size:13px;">If you did not request this password reset, you may ignore this email.</p>
                </div>
            """
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_body,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@department.local'),
                to=[user.email],
            )
            msg.attach_alternative(html_body, 'text/html')
            msg.send(fail_silently=True)

        return Response(generic)


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        password = request.data.get('password') or ''
        confirm_password = request.data.get('confirm_password') or ''

        if password != confirm_password:
            return Response({'confirm_password': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist, DjangoValidationError):
            return Response({'detail': 'This password reset link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({'detail': 'This password reset link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(password, user=user)
        except DjangoValidationError as exc:
            return Response({'password': list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save(update_fields=['password'])
        return Response({'detail': 'Your password has been reset successfully. You can now sign in.'})


class UserGroupCategoryViewSet(viewsets.ModelViewSet):
    """Admin-managed categories for grouping users by staff area or function."""
    queryset = UserGroupCategory.objects.all().order_by('name')
    serializer_class = UserGroupCategorySerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]


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
        """Assign role, department, category, email, and module privileges to a user."""
        user = self.get_object()
        editing_self = user.pk == request.user.pk
        role = request.data.get('role')
        department = request.data.get('department')
        email = request.data.get('email')
        user_category = request.data.get('user_category')

        protected_self_fields = {
            'role',
            'has_finance_privilege',
            'has_finance_balance_access',
            'has_resource_privilege',
            'has_activity_privilege',
            'is_active',
        }
        if editing_self and protected_self_fields.intersection(request.data.keys()):
            return Response(
                {'detail': 'You cannot change your own access level, privileges, or account status.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if role and role in dict(User.ROLE_CHOICES):
            user.role = role
        if department is not None:
            user.department = department
        if email is not None:
            user.email = email
        if user_category is not None:
            user.user_category_id = user_category or None

        for field in (
            'has_finance_privilege',
            'has_finance_balance_access',
            'has_resource_privilege',
            'has_activity_privilege',
        ):
            if field in request.data:
                setattr(user, field, bool(request.data.get(field)))
        if 'is_active' in request.data:
            user.is_active = bool(request.data.get('is_active'))
        
        user.save()
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=['patch'])
    def toggle_block(self, request, pk=None):
        """Block or unblock user access."""
        user = self.get_object()
        if user.pk == request.user.pk:
            return Response(
                {'detail': 'You cannot block your own administrator account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
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
        confirm_password = request.data.get('confirm_password')
        if not new_password:
            return Response({'detail': 'New password is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if confirm_password is not None and new_password != confirm_password:
            return Response({'detail': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            return Response({'password': list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save()
        return Response({'detail': f'Password for {user.username} has been updated successfully.'})

    def destroy(self, request, *args, **kwargs):
        """Archive accounts by deactivating them so historical records remain intact."""
        user = self.get_object()
        if user.pk == request.user.pk:
            return Response(
                {'detail': 'You cannot archive your own administrator account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.request.user.dms_notifications.all().order_by('-created_at')

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        count = request.user.dms_notifications.filter(is_read=False).count()
        return Response({'unread_count': count})

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return Response({'status': 'marked as read'})

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        request.user.dms_notifications.filter(is_read=False).update(is_read=True)
        return Response({'status': 'all marked as read'})


class RecipientGroupViewSet(viewsets.ModelViewSet):
    serializer_class = RecipientGroupSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = RecipientGroup.objects.all().prefetch_related('members')

    def get_queryset(self):
        qs = RecipientGroup.objects.all().prefetch_related('members')
        include_all = self.request.query_params.get('all', 'false').lower() in ['true', '1']
        if not include_all:
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        if not has_activity_privilege(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Activities & Events privilege required.")
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        if not has_activity_privilege(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Activities & Events privilege required.")
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        if not has_activity_privilege(request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Activities & Events privilege required.")
        instance = self.get_object()
        if instance.activities.exists():
            return Response(
                {'detail': 'Cannot delete this participant group because historical activities reference it. Deactivate it instead.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        if not has_activity_privilege(request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Activities & Events privilege required.")
        group = self.get_object()
        group.is_active = not group.is_active
        group.save(update_fields=['is_active'])
        return Response(RecipientGroupSerializer(group).data)
