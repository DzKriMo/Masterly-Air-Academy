#!/bin/bash
# Masterly Air Academy - Production Deployment Script
# Run on Ubuntu 24.04 server from project root
set -e

echo "=== Masterly Air Academy Deployment ==="
echo "Server: $(hostname) | Time: $(date)"

# Pull latest code
git pull origin main

# Backend
echo "--- Backend ---"
cd backend
docker compose build api celery
docker compose up -d api celery
echo "Waiting for API..."
sleep 10
docker compose exec -T api python manage.py migrate --noinput
docker compose exec -T api python manage.py seed_demo_data 2>/dev/null || true
docker compose exec -T api python manage.py collectstatic --noinput
cd ..

# Frontend
echo "--- Frontend ---"
docker compose build web
docker compose up -d web

# Restart nginx
echo "--- Restarting Nginx ---"
docker compose up -d nginx

# Verify
echo "--- Verification ---"
sleep 10
curl -sf http://localhost/health/ > /dev/null && echo "API: OK" || echo "API: FAILED"
curl -sf http://localhost/ > /dev/null && echo "Frontend: OK" || echo "Frontend: FAILED"

echo "=== Deployment Complete ==="
