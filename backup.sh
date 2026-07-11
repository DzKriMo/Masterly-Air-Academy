#!/bin/bash
# Masterly Air Academy - Daily Backup Script
# Add to crontab: 0 2 * * * /opt/masterly/backup.sh

BACKUP_DIR="/mnt/backup/masterly/$(date +%Y%m%d_%H%M)"
mkdir -p "$BACKUP_DIR"
echo "=== Backup started: $(date) ==="

# Database dump
echo "Dumping database..."
docker exec masterly-air-academy-db-1 pg_dump -U masterly masterly | gzip > "$BACKUP_DIR/database.sql.gz"

# Application files
echo "Backing up app files..."
tar -czf "$BACKUP_DIR/backend.tar.gz" backend/apps/ backend/config/ backend/requirements.txt 2>/dev/null || true

# Clean old backups (keep 30 days)
find /mnt/backup/masterly/ -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \;

echo "=== Backup complete: $BACKUP_DIR ==="
ls -lh "$BACKUP_DIR"
