from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    """Custom permission to check if user is admin."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'ADMIN'

class IsManagerOrAdmin(permissions.BasePermission):
    """Custom permission to check if user is manager or admin."""
    def has_permission(self, request, view):
        return (
            request.user 
            and request.user.is_authenticated 
            and request.user.role in ['ADMIN', 'MANAGER']
        )

class IsOwnerOrAdminOrManager(permissions.BasePermission):
    """
    Object-level permission to only allow organizers/owners to edit an object.
    Admins and Managers can edit anything.
    """
    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
            
        # Admins and Managers have full access
        if request.user.role in ['ADMIN', 'MANAGER']:
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
            
        # Write methods require ADMIN or MANAGER role
        return request.user.role in ['ADMIN', 'MANAGER']
