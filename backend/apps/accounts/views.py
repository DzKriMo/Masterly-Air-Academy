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

    def get(self, request):
        """Return current profile data for pre-filling forms."""
        from apps.students.models import Student
        data = {
            'address': '', 'phone': '', 'nationality': '', 'photo': None,
        }
        try:
            student = Student.objects.get(user=request.user)
            data['address'] = student.address or ''
            data['phone'] = student.phone or ''
            data['nationality'] = student.nationality or ''
            if student.photo:
                data['photo'] = student.photo.url if hasattr(student.photo, 'url') else f'/media/{student.photo}'
        except Student.DoesNotExist:
            pass
        return Response(data)

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

        # Save to local storage (MinIO bucket may not exist)
        import os, uuid
        from django.conf import settings
        ext = os.path.splitext(file.name)[1] or '.jpg'
        local_name = f'photo_{uuid.uuid4().hex}{ext}'
        local_dir = os.path.join(settings.MEDIA_ROOT, 'students', 'photos')
        os.makedirs(local_dir, exist_ok=True)
        local_path = os.path.join(local_dir, local_name)
        with open(local_path, 'wb+') as dest:
            for chunk in file.chunks():
                dest.write(chunk)
        student.photo = f'students/photos/{local_name}'
        try:
            student.save()
        except Exception as e:
            return Response({'error': f'Failed to save photo: {str(e)}'}, status=500)

        return Response({
            'photo': f'/media/students/photos/{local_name}',
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

    def get_permissions(self):
        # Allow all authenticated users to list users (for message recipient picker)
        if self.action == 'list':
            return [IsAuthenticated()]
        return super().get_permissions()

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
