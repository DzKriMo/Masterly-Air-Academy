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

        # System admin and superusers bypass all checks
        if request.user.role == 'system_admin' or request.user.is_superuser:
            return True

        all_perms = request.user.get_all_permissions()

        # Exact match
        if required in all_perms or any(p.endswith(f'.{required}') for p in all_perms):
            return True

        # view_own, evaluate, manage all satisfy view (queryset scoping handles restriction)
        if '.' in required:
            domain, action = required.rsplit('.', 1)
            if action in ('view', 'manage'):
                # Check for any domain permission that implies access
                implied = [f'{domain}.view_own', f'{domain}.evaluate', f'{domain}.manage']
                for perm in implied:
                    if perm in all_perms or any(p.endswith(f'.{perm}') for p in all_perms):
                        return True

        return False


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
