from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication


class MaintenanceAwareJWTAuthentication(JWTAuthentication):
    """Keep approved maintainers able to access the system during maintenance."""
    def authenticate(self, request):
        result = super().authenticate(request)
        if request.path.startswith('/api/developer-options/') or request.path in {
            '/api/token/', '/api/token/refresh/',
        }:
            return result
        try:
            from .models import SystemMaintenanceState
            maintenance = SystemMaintenanceState.objects.first()
        except Exception:
            maintenance = None
        if maintenance and maintenance.is_active:
            if result is None:
                raise AuthenticationFailed('The system is temporarily in maintenance mode. Please try again later.')
            user, _token = result
            if not (user.is_superuser or (user.role == 'ADMIN' and user.has_developer_options)):
                raise AuthenticationFailed('The system is temporarily in maintenance mode. Please try again later.')
        return result
