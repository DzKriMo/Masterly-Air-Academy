from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status, views, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .serializers import UserSerializer, UserCreateSerializer, ProfileUpdateSerializer
from apps.accounts.permissions import HasRolePermission
from apps.core.models import AuditLog

User = get_user_model()


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

    def post(self, request):
        """Upload profile photo."""
        from apps.students.models import Student
        try:
            student = Student.objects.get(user=request.user)
        except Student.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=404)

        file = request.FILES.get('photo')
        if not file:
            return Response({'error': 'No photo provided'}, status=400)

        student.photo = file
        student.save()
        return Response({
            'photo_url': student.photo.url if student.photo else None,
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


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'accounts.manage'
    filterset_fields = ['role', 'status', 'is_active']
    search_fields = ['email', 'username']

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        password = request.data.get('password', '')
        if len(password) < 8:
            return Response({'error': 'Password must be at least 8 characters'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(password)
        user.save()
        return Response({'status': 'password reset'})

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        return Response(UserSerializer(user).data)
