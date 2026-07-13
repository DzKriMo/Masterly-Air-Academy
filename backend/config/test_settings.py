"""
Test settings for Masterly Air Academy.

Overrides the database backend to SQLite and replaces Redis with
local-memory cache so tests can run without external services.
"""
from .settings import *  # noqa: F403

# ---------- Database ----------
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
        'TEST': {
            'NAME': ':memory:',
        },
    }
}

# ---------- Cache (avoid Redis requirement) ----------
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

# Session backend using local-memory cache (not Redis)
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'

# ---------- Disable Celery (tasks run synchronously if called) ----------
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# ---------- DRF (plain JSON for easier assertion) ----------
REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = (  # noqa: F405
    'rest_framework.renderers.JSONRenderer',
)

# ---------- Password validators (relax for test users) ----------
AUTH_PASSWORD_VALIDATORS = []

# ---------- Storage (local file system, not S3/MinIO) ----------
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# ---------- Disable Meilisearch ----------
MEILISEARCH_HOST = ''
MEILISEARCH_API_KEY = ''
