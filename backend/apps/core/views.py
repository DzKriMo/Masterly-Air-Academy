from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
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
    required_permission = 'accounts.manage'


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

    # Try Meilisearch first, fall back to DB queries
    from apps.core.search import search_meilisearch, MEILI_AVAILABLE

    if MEILI_AVAILABLE:
        hits = search_meilisearch(q)
        if hits:
            results = []
            for hit in hits[:20]:
                results.append({
                    'type': hit.get('type', 'unknown'),
                    'title': hit.get('full_name') or hit.get('title') or hit.get('registration', ''),
                    'id': hit.get('id', ''),
                    'subtitle': hit.get('program') or hit.get('subject_code') or hit.get('manufacturer', ''),
                    'status': hit.get('status', ''),
                })
            return Response({'results': results, 'source': 'meilisearch'})

    # DB fallback
    results = []
    for s in Student.objects.filter(first_name__icontains=q)[:5]:
        results.append({'type': 'student', 'title': s.full_name, 'id': str(s.id)})
    for c in Course.objects.filter(title__icontains=q)[:5]:
        results.append({'type': 'course', 'title': c.title, 'id': str(c.id)})
    for a in Aircraft.objects.filter(registration__icontains=q)[:3]:
        results.append({'type': 'aircraft', 'title': a.registration, 'id': str(a.id)})
    return Response({'results': results, 'source': 'database'})


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasRolePermission])
def trigger_backup(request):
    """POST /api/system/backup/ — trigger a manual database backup."""
    import subprocess, os, gzip
    from django.conf import settings
    from django.db import connections
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
            return Response({'error': result.stderr or 'pg_dump failed'}, status=500)
        # Save to backup dir
        backup_dir = os.path.join(settings.BASE_DIR, '..', 'backups')
        os.makedirs(backup_dir, exist_ok=True)
        filename = f'manual_backup_{timezone.now().strftime("%Y%m%d_%H%M")}.sql.gz'
        with gzip.open(os.path.join(backup_dir, filename), 'wb') as f:
            f.write(result.stdout.encode())
        return Response({'status': 'ok', 'file': filename})
    except Exception as e:
        return Response({'error': str(e)}, status=500)
