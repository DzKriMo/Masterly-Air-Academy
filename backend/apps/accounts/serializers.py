from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.contrib.auth.password_validation import validate_password
from django.contrib.contenttypes.models import ContentType
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
        user_data = {
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

        # Include instructor profile for flight/chief instructors
        if user.role in ('flight_instructor', 'chief_flight_instructor'):
            try:
                from apps.students.models import FlightInstructor
                fi = FlightInstructor.objects.get(user=user)
                user_data['instructor'] = {
                    'id': str(fi.id),
                    'authorized_aircraft_types': fi.authorized_aircraft_types or [],
                    'license_number': fi.license_number or '',
                    'total_flight_hours': float(fi.total_flight_hours),
                }
            except Exception:
                pass

        data['user'] = user_data

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


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'password', 'role', 'status', 'is_active', 'last_login_at', 'date_joined']
        read_only_fields = ['id', 'last_login_at', 'date_joined']

    def create(self, validated_data):
        password = validated_data.pop('password')
        role = validated_data.get('role', '')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        # Auto-assign to the corresponding Django group based on role
        if role:
            from django.contrib.auth.models import Group
            try:
                group = Group.objects.get(name=role)
                user.groups.add(group)
            except Group.DoesNotExist:
                pass  # Group not seeded yet — admin can assign manually
        return user


class ProfileUpdateSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True,
                                      validators=[validate_password])
    password_confirmation = serializers.CharField(write_only=True, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    nationality = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_current_password(self, value):
        # Skip validation when not changing password
        if not value:
            return value
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value

    def validate(self, data):
        password = data.get('password', '')
        password_confirmation = data.get('password_confirmation', '')

        # Only validate password match if password fields are provided
        if password or password_confirmation:
            if password != password_confirmation:
                raise serializers.ValidationError(
                    {'password_confirmation': 'Passwords do not match.'}
                )
        return data

    def save(self):
        user = self.context['request'].user

        # Only change password if password field is provided
        if self.validated_data.get('password'):
            user.set_password(self.validated_data['password'])
            user.save()

        # Update Student model fields if the user has a student profile
        from apps.students.models import Student
        try:
            student = Student.objects.get(user=user)
            if 'address' in self.validated_data:
                student.address = self.validated_data['address']
            if 'phone' in self.validated_data:
                student.phone = self.validated_data['phone']
            if 'nationality' in self.validated_data:
                student.nationality = self.validated_data['nationality']
            student.save()
        except Student.DoesNotExist:
            pass

        return user


class PermissionSerializer(serializers.ModelSerializer):
    content_type_name = serializers.SerializerMethodField()

    class Meta:
        model = Permission
        fields = ['id', 'name', 'codename', 'content_type', 'content_type_name']

    def get_content_type_name(self, obj):
        return obj.content_type.model


class GroupSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()
    permission_count = serializers.SerializerMethodField()
    permissions = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Permission.objects.all(), required=False
    )

    class Meta:
        model = Group
        fields = ['id', 'name', 'user_count', 'permission_count', 'permissions']

    def get_user_count(self, obj):
        return obj.user_set.count()

    def get_permission_count(self, obj):
        return obj.permissions.count()
