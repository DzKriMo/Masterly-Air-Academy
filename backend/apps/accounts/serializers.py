from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


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
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirmation = serializers.CharField(write_only=True, required=True)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value

    def validate(self, data):
        if data['password'] != data['password_confirmation']:
            raise serializers.ValidationError({'password_confirmation': 'Passwords do not match.'})
        return data

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['password'])
        user.save()
        return user
