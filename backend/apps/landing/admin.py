from django.contrib import admin

from .models import LandingSection, LandingMedia


@admin.register(LandingSection)
class LandingSectionAdmin(admin.ModelAdmin):
    list_display = ['key', 'title', 'status', 'sort_order', 'published_version', 'updated_at']
    list_filter = ['status']
    search_fields = ['key', 'title']


@admin.register(LandingMedia)
class LandingMediaAdmin(admin.ModelAdmin):
    list_display = ['name', 'mime_type', 'file_size', 'created_at']
    search_fields = ['name', 'alt_text']
