#!/bin/bash
# Masterly Air Academy — Production Deployment Script
# Run from project root on Ubuntu 24.04 server
set -e

echo "=== MASTERLY AIR ACADEMY DEPLOY ==="
echo "Server: $(hostname) | Time: $(date)"
echo ""

# Pull latest code
echo "[1/5] Pulling latest code..."
git pull origin main

# Build fresh images
echo "[2/5] Building Docker images..."
docker compose build --no-cache api web

# Stop running services
echo "[3/5] Stopping services..."
docker compose down

# Start all services
echo "[4/5] Starting services..."
docker compose up -d

# Wait for healthy, then migrate
echo "[5/5] Waiting for services..."
sleep 25
docker compose exec -T api python manage.py migrate --noinput

echo ""
echo "=== DEPLOY COMPLETE ==="
docker compose ps
curl -sf http://localhost/health/ > /dev/null && echo "API: OK" || echo "API: FAILED"
curl -sf http://localhost/ > /dev/null && echo "Frontend: OK" || echo "Frontend: FAILED"
