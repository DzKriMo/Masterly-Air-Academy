from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from .serializers import UserSerializer, ProfileUpdateSerializer
from apps.core.models import AuditLog

User = get_user_model()


class LoginThrottle(AnonRateThrottle):
    rate = '5/minute'
    scope = 'login'


class CurrentUserView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'success': True,
            'data': {
                'id': str(user.id),
                'name': user.get_full_name() or user.email,
                'email': user.email,
                'role': user.role,
                'status': user.status,
                'is_active': user.is_active,
                'last_login_at': user.last_login_at,
                'created_at': user.date_joined,
                'permissions': user.permissions_list,
                'roles': user.role_list,
            },
        })


class UpdateProfileView(views.APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        serializer = ProfileUpdateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'success': True,
            'message': 'Profile updated',
        })


class LogoutView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        AuditLog.objects.create(
            user=request.user,
            action='logout',
            entity='User',
            entity_id=request.user.id,
            new_values={'email': request.user.email},
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
        )
        return Response({
            'success': True,
            'message': 'Logged out',
        })
