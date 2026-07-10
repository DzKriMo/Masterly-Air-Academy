from rest_framework.permissions import BasePermission


class HasRolePermission(BasePermission):
    """
    Checks if the user has a specific Django permission.
    Usage on ViewSet: permission_classes = [IsAuthenticated, HasRolePermission]
                      required_permission = 'students.view'
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        required = getattr(view, 'required_permission', None)
        if not required:
            return True

        # System admin has all permissions
        if request.user.role == 'system_admin':
            return True

        if request.user.is_superuser:
            return True

        return request.user.has_perm(required)


class IsOwnerOrAdmin(BasePermission):
    """
    Object-level permission: only the resource owner or admins can access.
    """

    def has_object_permission(self, request, view, obj):
        if request.user.role in ['system_admin', 'admin_responsible', 'admin_agent']:
            return True
        if request.user.is_superuser:
            return True

        # Check if object has a 'user' attribute (the owner)
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'student') and hasattr(obj.student, 'user'):
            return obj.student.user == request.user

        return False
