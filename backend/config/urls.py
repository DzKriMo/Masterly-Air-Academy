from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include

# ── Admin Site Branding ──────────────────────────────────
admin.site.site_header = 'Masterly Administration'
admin.site.site_title = 'Masterly Air Academy'
admin.site.index_title = 'Dashboard'

def health_check(request):
    return JsonResponse({'status': 'ok'})

urlpatterns = [
    # Django Admin
    path('django-admin/', admin.site.urls),

    # Health check
    path('health/', health_check, name='health_check'),

    # API
    path('api/', include('config.api_urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
