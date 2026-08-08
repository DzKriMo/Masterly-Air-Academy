import os
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ['SECRET_KEY']

DEBUG = os.environ.get('DEBUG', 'false').lower() == 'true'

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1,api').split(',')

INSTALLED_APPS = [
    'unfold',
    'unfold.contrib.filters',
    'unfold.contrib.forms',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'storages',
    'django_celery_beat',
    # Local apps
    'apps.core',
    'apps.accounts',
    'apps.students',
    'apps.ground_training',
    'apps.flight_training',
    'apps.administration',
    'apps.quality_safety',
    'apps.exams',
    'apps.notifications',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'apps.core.middleware.RequestIdMiddleware',
    'apps.core.middleware.RequestLogMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
DB_PASSWORD = os.environ.get('DB_PASSWORD')
if not DB_PASSWORD:
    raise ImproperlyConfigured(
        'DB_PASSWORD is required. Set it in the environment or your .env file (see .env.example).'
    )

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'HOST': os.environ.get('DB_HOST', 'db'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'NAME': os.environ.get('DB_NAME', 'masterly'),
        'USER': os.environ.get('DB_USER', 'masterly'),
        'PASSWORD': DB_PASSWORD,
        'CONN_MAX_AGE': 600,
        'OPTIONS': {
            'connect_timeout': 10,
        },
    }
}

# Redis / Cache
REDIS_HOST = os.environ.get('REDIS_HOST', 'redis')
REDIS_PORT = os.environ.get('REDIS_PORT', '6379')
REDIS_PASSWORD = os.environ.get('REDIS_PASSWORD', '')
REDIS_URL = f'redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}'

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': f'{REDIS_URL}/1',
    }
}

SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

AUTH_USER_MODEL = 'accounts.User'

# Internationalization
LANGUAGE_CODE = 'en'
TIME_ZONE = 'Africa/Algiers'
USE_I18N = True
USE_TZ = True

# i18n: Models use manual title_en/title_fr/title_ar fields (not django-modeltranslation)
# Frontend uses useTranslation() hook with inline key/value pairs

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost,http://127.0.0.1,http://185.185.80.188:7788,https://185.185.80.188.nip.io').split(',')
CORS_ALLOW_CREDENTIALS = True

# Security (secure defaults; override per environment)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'false').lower() == 'true'
SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'false' if DEBUG else 'true').lower() == 'true'
CSRF_COOKIE_SECURE = os.environ.get('CSRF_COOKIE_SECURE', 'false' if DEBUG else 'true').lower() == 'true'
CSRF_TRUSTED_ORIGINS = os.environ.get('CSRF_TRUSTED_ORIGINS', os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost,https://185.185.80.188.nip.io')).split(',')
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'

# httpOnly-cookie JWT auth for the SPA (access/refresh JWTs in cookies).
# Keep the header-based authenticators so API tooling / curl / tests still work.
MAA_COOKIE_SECURE = os.environ.get('MAA_COOKIE_SECURE', 'false' if DEBUG else 'true').lower() == 'true'
MAA_COOKIE_SAMESITE = os.environ.get('MAA_COOKIE_SAMESITE', 'Lax')

# DRF
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'apps.accounts.cookie_auth.CookieJWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'config.pagination.PageLimitPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '200/minute',
        'user': '500/minute',
        'login': '5/minute',
        'password_change': '3/hour',
        'certificate_download': '30/hour',
        'export': '10/hour',
        'file_upload': '20/hour',
        'contact': '5/hour',
        'backup': '5/hour',
    },
    'EXCEPTION_HANDLER': 'apps.core.exceptions.custom_exception_handler',
    'DEFAULT_RENDERER_CLASSES': (
        'apps.core.renderers.ApiResponseRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ),
}

# SimpleJWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}

X_FRAME_OPTIONS = 'SAMEORIGIN'

# Celery
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', f'{REDIS_URL}/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_BROKER_URL', f'{REDIS_URL}/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Africa/Algiers'
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'
CELERY_BEAT_SCHEDULE = {
    'check-overdue-invoices': {
        'task': 'apps.administration.tasks.check_overdue_invoices',
        'schedule': 86400.0,  # daily
    },
    'check-expiring-medicals': {
        'task': 'apps.students.tasks.check_expiring_medicals',
        'schedule': 86400.0,
    },
    'check-upcoming-deadlines': {
        'task': 'apps.quality_safety.tasks.check_upcoming_deadlines',
        'schedule': 86400.0,  # daily
    },
    'cleanup-old-notifications': {
        'task': 'apps.notifications.tasks.cleanup_old_notifications',
        'schedule': 86400.0,  # daily
    },
}

# Meilisearch
MEILISEARCH_HOST = os.environ.get('MEILI_HOST', 'http://meilisearch:7700')


def _env_or_dev_default(name, dev_default):
    value = os.environ.get(name)
    if value is not None:
        return value
    if DEBUG:
        return dev_default
    raise ImproperlyConfigured(
        f'{name} must be set in the environment when DEBUG is disabled (see .env.example).'
    )


MEILISEARCH_API_KEY = _env_or_dev_default('MEILI_KEY', 'masterkey')

# File Storage (MinIO)
AWS_ACCESS_KEY_ID = _env_or_dev_default('MINIO_ACCESS_KEY', 'minioadmin')
AWS_SECRET_ACCESS_KEY = _env_or_dev_default('MINIO_SECRET_KEY', 'minioadmin')
AWS_S3_ENDPOINT_URL = f"http://{os.environ.get('MINIO_ENDPOINT', 'minio:9000')}"
AWS_STORAGE_BUCKET_NAME = os.environ.get('MINIO_BUCKET', 'masterly-documents')
AWS_S3_REGION_NAME = 'us-east-1'
AWS_S3_USE_SSL = False
AWS_DEFAULT_ACL = None
STORAGES = {
    "default": {"BACKEND": "storages.backends.s3.S3Storage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# Invoice number format
INVOICE_NUMBER_FORMAT = 'INV-{year}-{num:04d}'

# Medical certificate expiry notification period (days)
MEDICAL_EXPIRY_NOTICE_DAYS = 30

# ── Email Configuration ────────────────────────────────
EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = os.environ.get('EMAIL_HOST', '')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'true').lower() == 'true'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@masterly-air-academy.dz')

if EMAIL_BACKEND in ('django.core.mail.backends.smtp.EmailBackend', 'smtp') and not EMAIL_HOST:
    raise ImproperlyConfigured(
        'EMAIL_HOST is required when EMAIL_BACKEND uses SMTP. '
        'Set EMAIL_HOST (and EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, DEFAULT_FROM_EMAIL) '
        'in your environment or .env (see .env.example).'
    )

# Site URL (used for certificate QR codes, etc.)
SITE_URL = os.environ.get('SITE_URL', 'http://localhost')

# Quality & safety deadline monitoring
QUALITY_SAFETY_DEADLINE_DAYS_AHEAD = 30
QUALITY_SAFETY_DAYS_REMAINING = 7

# django-unfold admin theme
UNFOLD = {
    "SITE_TITLE": "Masterly Air Academy",
    "SITE_HEADER": "Masterly Administration",
    "SITE_SYMBOL": "flight",
    "SHOW_HISTORY": True,
    "COLORS": {
        "primary": {
            "50": "#fdf8ef", "100": "#fbf0db", "200": "#f7e0b7",
            "300": "#f1ca89", "400": "#ebae59", "500": "#c4943c",
            "600": "#b38535", "700": "#8f6a2e", "800": "#75552b", "900": "#624725",
        },
    },
    "SIDEBAR": {"show_search": True, "show_all_applications": True},
}

