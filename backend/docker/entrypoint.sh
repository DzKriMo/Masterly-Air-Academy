#!/bin/bash
set -e

echo "=== Masterly Air Academy - Django Backend ==="

# Wait for database using Python (no pg_isready needed)
echo "Waiting for database..."
python -c "
import time, psycopg2, os
for i in range(30):
    try:
        conn = psycopg2.connect(
            host=os.environ.get('DB_HOST','db'),
            port=os.environ.get('DB_PORT','5432'),
            dbname=os.environ.get('DB_NAME','masterly'),
            user=os.environ.get('DB_USER','masterly'),
            password=os.environ.get('DB_PASSWORD','secret')
        )
        conn.close()
        print('Database is ready.')
        break
    except Exception as e:
        print(f'Waiting... ({i+1}/30)')
        time.sleep(2)
else:
    print('WARNING: Database not ready after 60s, proceeding anyway.')
"

# Generate any missing migration files
echo "Checking for missing migrations..."
python manage.py makemigrations accounts core --noinput 2>/dev/null || true

# Run migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Create superuser if missing
echo "Ensuring superuser exists..."
python manage.py create_superuser_if_missing

# Collect static
echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "=== Starting Gunicorn ==="
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --threads 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
