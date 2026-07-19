from rest_framework.permissions import BasePermission

# Map shorthand domain names used by export views to full domain names used in the seeder
DOMAIN_ALIASES = {
    'flights': 'flight_training',
    'audit': 'audit_logs',
    'invoices': 'invoicing',
}


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

        if '.' in required:
            domain, action = required.rsplit('.', 1)

            # Resolve domain aliases (e.g. flights → flight_training)
            resolved_domain = DOMAIN_ALIASES.get(domain, domain)

            # view_own, evaluate, manage all satisfy view (queryset scoping handles restriction)
            if action in ('view', 'manage'):
                implied = [f'{domain}.view_own', f'{domain}.evaluate', f'{domain}.manage',
                           f'{resolved_domain}.view_own', f'{resolved_domain}.evaluate', f'{resolved_domain}.manage']
                for perm in implied:
                    if perm in all_perms or any(p.endswith(f'.{perm}') for p in all_perms):
                        return True

            # export is implied by any permission in the domain (view, view_own, evaluate, manage)
            if action == 'export':
                implied_actions = ['view', 'view_own', 'evaluate', 'manage', 'create', 'update']
                for act in implied_actions:
                    for dom in [domain, resolved_domain]:
                        candidate = f'{dom}.{act}'
                        if candidate in all_perms or any(p.endswith(f'.{candidate}') for p in all_perms):
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
