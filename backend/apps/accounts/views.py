from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.utils import timezone
from rest_framework import status, views, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import (
    UserSerializer, UserCreateSerializer, ProfileUpdateSerializer,
    CustomTokenObtainPairSerializer, GroupSerializer, PermissionSerializer,
)
from apps.accounts.permissions import HasRolePermission
from apps.core.models import AuditLog

User = get_user_model()


class CurrentUserView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {
            'id': str(user.id),
            'name': user.get_full_name() or user.email,
            'email': user.email,
            'role': user.role,
            'status': user.status,
            'is_active': user.is_active,
            'last_login_at': user.last_login_at,
            'last_login_ip': user.last_login_ip,
            'created_at': user.date_joined,
            'permissions': user.permissions_list,
            'roles': user.role_list,
        }

        # Include instructor profile for flight/chief instructors
        if user.role in ('flight_instructor', 'chief_flight_instructor'):
            try:
                from apps.students.models import FlightInstructor
                fi = FlightInstructor.objects.get(user=user)
                data['instructor'] = {
                    'id': str(fi.id),
                    'authorized_aircraft_types': fi.authorized_aircraft_types or [],
                    'license_number': fi.license_number or '',
                    'total_flight_hours': float(fi.total_flight_hours),
                }
            except Exception:
                pass  # Instructor profile may not exist yet

        return Response({
            'success': True,
            'data': data,
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
                photo_path = str(student.photo)
                data['photo'] = f'/media/{photo_path}'
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

        ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
        ALLOWED_MIME = {'image/jpeg', 'image/png', 'image/webp'}
        MAX_SIZE = 5 * 1024 * 1024  # 5 MB

        if file.size > MAX_SIZE:
            return Response({'error': 'Photo must be under 5 MB'}, status=400)
        if file.content_type not in ALLOWED_MIME:
            return Response({'error': 'Invalid image type'}, status=400)

        # Persist through the default (MinIO/S3) storage backend so uploads
        # survive container recreates and are reachable over MEDIA_URL.
        import os, uuid
        from django.core.files.storage import default_storage
        ext = os.path.splitext(file.name)[1].lower() or '.jpg'
        if ext not in ALLOWED_EXTENSIONS:
            return Response({'error': 'Invalid image type'}, status=400)
        local_name = f'photo_{uuid.uuid4().hex}{ext}'
        key = default_storage.save(f'students/photos/{local_name}', file)
        student.photo = key
        try:
            student.save()
        except Exception as e:
            return Response({'error': f'Failed to save photo: {str(e)}'}, status=500)

        return Response({
            'photo': f'/media/{key}',
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

        # Revoke the refresh token so a leaked session cannot be reused.
        refresh_token = request.data.get('refresh') or ''
        if refresh_token:
            try:
                from rest_framework_simplejwt.tokens import RefreshToken
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                # Invalid/expired tokens are already unusable; nothing to revoke.
                pass

        return Response({
            'success': True,
            'message': 'Logged out',
        })


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'users.view'
    filterset_fields = ['role', 'status', 'is_active']
    search_fields = ['email', 'username', 'first_name', 'last_name']

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        password = request.data.get('password', '')

        if str(user.id) == str(request.user.id):
            current = request.data.get('current_password', '')
            if not current:
                return Response({'error': 'Current password is required to change your own password'}, status=status.HTTP_400_BAD_REQUEST)
            if not request.user.check_password(current):
                return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)

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


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        return response


class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all().prefetch_related('permissions')
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'users.view'


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'users.view'
