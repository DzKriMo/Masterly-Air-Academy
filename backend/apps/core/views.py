from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from apps.accounts.permissions import HasRolePermission
from apps.students.models import Student
from apps.ground_training.models import Course
from apps.flight_training.models import Aircraft
from .models import SystemSetting, AuditLog
from .serializers import SystemSettingSerializer, AuditLogSerializer
from .search import search_meilisearch, MEILI_AVAILABLE


class SystemSettingViewSet(viewsets.ModelViewSet):
    queryset = SystemSetting.objects.all()
    serializer_class = SystemSettingSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'settings.manage'


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related('user').all().order_by('-created_at')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'audit_logs.view'
    search_fields = ['action', 'entity', 'user__email']
    filterset_fields = ['action', 'entity']


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_view(request):
    q = request.query_params.get('q', '')
    if not q: return Response({'results': []})

    user = request.user
    is_staff = user.role != 'student'

    # Students may only search the courses they are enrolled in; staff get the
    # full roster. Roster enumeration is denied for students.
    student = getattr(user, 'student_profile', None)
    if user.role == 'student':
        try:
            student = Student.objects.get(user=user)
        except Student.DoesNotExist:
            student = None

    def _scoped_courses():
        qs = Course.objects.filter(title__icontains=q)
        if student is not None:
            qs = qs.filter(enrollments__student=student)
        return qs.distinct()[:5]

    # Try Meilisearch first, fall back to DB queries
    from apps.core.search import search_meilisearch, MEILI_AVAILABLE

    if MEILI_AVAILABLE:
        hits = search_meilisearch(q)
        if hits:
            results = []
            for hit in hits[:20]:
                htype = hit.get('type', 'unknown')
                if user.role == 'student':
                    if htype == 'student' or htype == 'aircraft':
                        continue
                    if htype == 'course' and student is not None:
                        enrolled = Course.objects.filter(
                            id=hit.get('id'), enrollments__student=student
                        ).exists()
                        if not enrolled:
                            continue
                results.append({
                    'type': htype,
                    'title': hit.get('full_name') or hit.get('title') or hit.get('registration', ''),
                    'id': hit.get('id', ''),
                    'subtitle': hit.get('program') or hit.get('subject_code') or hit.get('manufacturer', ''),
                    'status': hit.get('status', ''),
                })
            return Response({'results': results, 'source': 'meilisearch'})

    # DB fallback
    results = []
    if is_staff:
        for s in Student.objects.filter(first_name__icontains=q)[:5]:
            results.append({'type': 'student', 'title': s.full_name, 'id': str(s.id)})
    for c in _scoped_courses():
        results.append({'type': 'course', 'title': c.title, 'id': str(c.id)})
    if is_staff:
        for a in Aircraft.objects.filter(registration__icontains=q)[:3]:
            results.append({'type': 'aircraft', 'title': a.registration, 'id': str(a.id)})
    return Response({'results': results, 'source': 'database'})


class TriggerBackupView(APIView):
    """POST /api/system/backup/ — trigger a manual database backup."""
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'settings.manage'
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'backup'

    def post(self, request):
        import subprocess, os, gzip
        from django.conf import settings
        from django.core.mail import mail_admins
        try:
            db_settings = settings.DATABASES['default']
            env = os.environ.copy()
            env['PGPASSWORD'] = db_settings['PASSWORD']
            result = subprocess.run(
                ['pg_dump', '-h', db_settings['HOST'], '-p', str(db_settings['PORT']),
                 '-U', db_settings['USER'], db_settings['NAME']],
                capture_output=True, text=True, timeout=60, env=env
            )
            if result.returncode != 0:
                try:
                    mail_admins('Backup failed', result.stderr[:2000])
                except Exception:
                    pass
                return Response({'error': 'Database backup failed'}, status=500)
            # Save to backup dir
            backup_dir = os.path.join(settings.BASE_DIR, '..', 'backups')
            os.makedirs(backup_dir, exist_ok=True)
            filename = f'manual_backup_{timezone.now().strftime("%Y%m%d_%H%M")}.sql.gz'
            with gzip.open(os.path.join(backup_dir, filename), 'wb') as f:
                f.write(result.stdout.encode())
            return Response({'status': 'ok', 'file': filename})
        except Exception:
            return Response({'error': 'Database backup failed'}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_media_token(request):
    """POST /api/media-token/ — mint a short-lived signed media URL token.

    Body: {resource: <object pk>}. The returned token may only be used to
    fetch that one resource and expires after MEDIA_TOKEN_MAX_AGE seconds,
    so it is safe to embed in <video>/<iframe> src URLs.
    """
    from apps.accounts.authentication import sign_media_token, MEDIA_TOKEN_MAX_AGE
    resource = str(request.data.get('resource') or '').strip()
    if not resource:
        return Response({'error': 'resource is required'}, status=400)
    return Response({
        'media_token': sign_media_token(request.user.id, resource),
        'max_age': MEDIA_TOKEN_MAX_AGE,
    })
