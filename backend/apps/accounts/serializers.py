from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.core.models import AuditLog

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT serializer that:
    - Blocks deactivated users
    - Returns user data + permissions in the response
    - Logs successful login to audit log
    """

    def validate(self, attrs):
        email = attrs.get('email') or attrs.get(self.username_field)
        password = attrs.get('password')

        # Check if user exists and is active BEFORE attempting auth
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            pass
        else:
            if not user.is_active:
                raise serializers.ValidationError(
                    'Your account has been deactivated. Contact an administrator.'
                )

        # Standard JWT validation
        data = super().validate(attrs)

        # Add user info to response
        user = self.user
        data['user'] = {
            'id': str(user.id),
            'name': user.get_full_name() or user.email,
            'email': user.email,
            'role': user.role,
            'status': user.status,
            'is_active': user.is_active,
            'last_login_at': user.last_login_at.isoformat() if user.last_login_at else None,
            'permissions': list(user.get_all_permissions()),
            'roles': list(user.groups.values_list('name', flat=True)),
        }

        # Update last login
        user.last_login_at = timezone.now()
        user.last_login_ip = self.context.get('request').META.get('REMOTE_ADDR', '')
        user.save(update_fields=['last_login_at', 'last_login_ip'])

        # Audit log
        request = self.context.get('request')
        AuditLog.objects.create(
            user=user,
            action='login',
            entity='User',
            entity_id=user.id,
            new_values={'email': user.email},
            ip_address=request.META.get('REMOTE_ADDR', '') if request else '',
            user_agent=(request.META.get('HTTP_USER_AGENT', '')[:500]
                        if request else ''),
        )

        return data


class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'name', 'role', 'status', 'is_active',
            'last_login_at', 'date_joined', 'permissions', 'roles',
        ]

    def get_name(self, obj):
        return obj.get_full_name() or obj.email

    def get_permissions(self, obj):
        return list(obj.get_all_permissions())

    def get_roles(self, obj):
        return list(obj.groups.values_list('name', flat=True))


class ProfileUpdateSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, required=True)
    password = serializers.CharField(write_only=True, required=True,
                                      validators=[validate_password])
    password_confirmation = serializers.CharField(write_only=True, required=True)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value

    def validate(self, data):
        if data['password'] != data['password_confirmation']:
            raise serializers.ValidationError(
                {'password_confirmation': 'Passwords do not match.'}
            )
        return data

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['password'])
        user.save()
        return user
