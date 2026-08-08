import mimetypes
import os
import uuid

from django.core.files.storage import default_storage
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import HasRolePermission
from apps.core.uploads import validate_upload

from .models import LandingSection, LandingMedia
from .serializers import LandingSectionSerializer, PublicLandingSectionSerializer, LandingMediaSerializer

MEDIA_PREFIX = 'landing/'


def _content_type_for_key(key, mime_hint=None):
    if mime_hint:
        return mime_hint
    guess, _ = mimetypes.guess_type(key)
    return guess or 'application/octet-stream'


class LandingSectionViewSet(viewsets.ModelViewSet):
    queryset = LandingSection.objects.all()
    serializer_class = LandingSectionSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'landing.manage'
    filterset_fields = ['key', 'status']

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Snapshot the current draft as the public content (version++)."""
        section = self.get_object()
        section.published_content = section.content or []
        section.published_version = (section.published_version or 0) + 1
        section.status = 'published'
        section.updated_by = request.user
        section.updated_at = timezone.now()
        section.save(update_fields=['published_content', 'published_version', 'status', 'updated_by', 'updated_at'])
        return Response(LandingSectionSerializer(section, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['post'])
    def rollback(self, request, pk=None):
        """Restore the working draft to the last published snapshot."""
        section = self.get_object()
        if not section.published_version or section.published_content is None:
            return Response({'error': 'No published version to roll back to'}, status=400)
        section.content = section.published_content
        section.updated_by = request.user
        section.updated_at = timezone.now()
        section.save(update_fields=['content', 'updated_by', 'updated_at'])
        return Response(LandingSectionSerializer(section, context=self.get_serializer_context()).data)


class LandingMediaViewSet(viewsets.ModelViewSet):
    queryset = LandingMedia.objects.all()
    serializer_class = LandingMediaSerializer
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'landing.manage'
    filterset_fields = ['mime_type']

    def perform_create(self, serializer):
        file = self.request.FILES.get('file')
        if not file:
            raise ValidationError({'file': ['No file provided']})
        validate_upload(file)
        ext = os.path.splitext(file.name)[1].lower() or '.bin'
        key = default_storage.save(f'{MEDIA_PREFIX}{uuid.uuid4().hex}{ext}', file)
        serializer.save(
            file_key=key,
            mime_type=getattr(file, 'content_type', None) or 'application/octet-stream',
            file_size=file.size,
            uploaded_by=self.request.user,
        )

    def perform_destroy(self, instance):
        try:
            if instance.file_key:
                default_storage.delete(instance.file_key)
        except Exception:
            pass
        instance.delete()


class PublicLandingView(APIView):
    """GET /api/landing/ — published landing sections, no auth required."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        qs = LandingSection.objects.filter(status='published').order_by('sort_order', 'key')
        return Response(PublicLandingSectionSerializer(qs, many=True).data)


class PublicMediaStreamView(APIView):
    """GET /api/landing/media/<key> — stream public marketing media.

    Only keys under the ``landing/`` prefix are served. Range requests are
    supported (video seeking) via ``_stream_from_storage``.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, key):
        from apps.ground_training.views import _stream_from_storage
        if not key or not key.startswith(MEDIA_PREFIX):
            return Response({'error': 'Not found'}, status=404)
        if not default_storage.exists(key):
            return Response({'error': 'Not found'}, status=404)
        mime_hint = None
        try:
            mime_hint = LandingMedia.objects.filter(file_key=key).values_list('mime_type', flat=True).first()
        except Exception:
            mime_hint = None
        content_type = _content_type_for_key(key, mime_hint)
        filename = os.path.basename(key)
        response = _stream_from_storage(
            key,
            content_type=content_type,
            filename=filename,
            inline=True,
            request=request,
        )
        if response is None:
            return Response({'error': 'Not found'}, status=404)
        return response
