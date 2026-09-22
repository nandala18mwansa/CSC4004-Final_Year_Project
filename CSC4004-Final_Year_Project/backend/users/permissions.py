from rest_framework import permissions


def has_finance_privilege(user):
    return bool(user and user.is_authenticated and (user.is_superuser or user.has_finance_privilege))


def has_finance_balance_access(user):
    return bool(
        user
        and user.is_authenticated
        and (user.is_superuser or user.has_finance_privilege or user.has_finance_balance_access)
    )


def has_resource_privilege(user):
    return bool(user and user.is_authenticated and (user.is_superuser or user.has_resource_privilege))


def has_activity_privilege(user):
    return bool(user and user.is_authenticated and (user.is_superuser or user.has_activity_privilege))


def has_control_privilege(user):
    return bool(user and user.is_authenticated and (user.is_superuser or user.role == 'ADMIN'))


class IsAdmin(permissions.BasePermission):
    """Only users explicitly allowed to manage Control & Access."""
    def has_permission(self, request, view):
        return has_control_privilege(request.user)

class IsManagerOrAdmin(permissions.BasePermission):
    """Custom permission to check if user is manager or admin."""
    def has_permission(self, request, view):
        return (
            request.user 
            and request.user.is_authenticated 
            and request.user.role in ['ADMIN', 'MANAGER']
        )


class IsFinancePrivileged(permissions.BasePermission):
    """Only admins and users explicitly given finance privileges."""
    def has_permission(self, request, view):
        return has_finance_privilege(request.user)


class IsFinanceBalanceViewer(permissions.BasePermission):
    """Only admins and users explicitly allowed to view finance balances."""
    def has_permission(self, request, view):
        return has_finance_balance_access(request.user)


class IsActivityPrivilegedOrReadOnly(permissions.BasePermission):
    """Authenticated staff can submit activities; privileged users manage approvals."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return True

class IsOwnerOrAdminOrManager(permissions.BasePermission):
    """
    Object-level permission to only allow organizers/owners to edit an object.
    Admins and Managers can edit anything.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
            
        if request.user.is_superuser:
            return True

        if hasattr(obj, 'organizer') and has_activity_privilege(request.user):
            return True

        if hasattr(obj, 'resource') and has_resource_privilege(request.user):
            return True
            
        # Check ownership based on standard field names
        if hasattr(obj, 'requested_by'):
            return obj.requested_by == request.user
        if hasattr(obj, 'organizer'):
            return obj.organizer == request.user
        if hasattr(obj, 'allocated_to'):
            return obj.allocated_to == request.user
            
        return False

class IsAdminOrManagerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to allow read-only access to authenticated users,
    but write access only to admins or managers.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
            
        # Safe methods are allowed for any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True
            
        return request.user.is_superuser
