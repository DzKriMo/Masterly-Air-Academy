FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev curl postgresql-client \
    libpango-1.0-0 libpangocairo-1.0-0 \
    libcairo2 libgobject-2.0-0 \
    shared-mime-info fonts-noto-core \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Build-time placeholders so `manage.py collectstatic` can import settings.
# These are only defaults; compose/.env override them at runtime (see docker-compose.yml).
ENV SECRET_KEY=build-only-placeholder \
    DB_PASSWORD=build-only-placeholder \
    MEILI_KEY=build-only-placeholder \
    MINIO_ACCESS_KEY=build-only-placeholder \
    MINIO_SECRET_KEY=build-only-placeholder \
    EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

RUN mkdir -p staticfiles media \
    && python manage.py collectstatic --noinput \
    && chmod +x docker/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["docker/entrypoint.sh"]
