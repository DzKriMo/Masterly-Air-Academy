import uuid

from django.conf import settings
from django.db import models


class LandingSectionStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    PUBLISHED = 'published', 'Published'


class LandingSection(models.Model):
    """A region of the public landing page.

    ``key`` is a fixed slug identifying the region (hero, about, programs,
    why_us, accreditations, gallery, videos, testimonials). ``content`` holds
    the working (draft) JSON block list edited by social managers; publishing
    snapshots it into ``published_content`` alongside a monotonic version so
    the public page only ever sees approved content and can be rolled back.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=120)
    description = models.CharField(max_length=255, blank=True, null=True)
    content = models.JSONField(default=dict, blank=True)
    status = models.CharField(
        max_length=20, choices=LandingSectionStatus.choices,
        default=LandingSectionStatus.DRAFT,
    )
    published_version = models.IntegerField(default=0)
    published_content = models.JSONField(default=dict, blank=True, null=True)
    sort_order = models.IntegerField(default=0)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='landing_sections',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'landing_sections'
        ordering = ['sort_order', 'key']
        verbose_name = 'Landing Section'
        verbose_name_plural = 'Landing Sections'

    def __str__(self):
        return self.title or self.key


class LandingMedia(models.Model):
    """A reusable media asset (image/video) stored in MinIO under ``landing/``.

    Media uploaded here is intentionally public-facing (marketing content), so
    the public landing page can stream it without authentication via
    ``/api/landing/media/<key>``.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    file_key = models.CharField(max_length=500, unique=True)
    mime_type = models.CharField(max_length=100, blank=True, null=True)
    file_size = models.BigIntegerField(default=0)
    alt_text = models.CharField(max_length=255, blank=True, null=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='landing_media',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'landing_media'
        ordering = ['-created_at']
        verbose_name = 'Landing Media'
        verbose_name_plural = 'Landing Media'

    def __str__(self):
        return self.name
