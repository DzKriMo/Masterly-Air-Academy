# Masterly Air Academy — ATO Management Platform

Approved Training Organization management platform. Django + Next.js, 100% on-premise.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django 5.1, Django REST Framework, SimpleJWT |
| Frontend | Next.js 15, React 19, Tailwind CSS, Recharts |
| Database | PostgreSQL 17 |
| Cache | Redis 8 |
| Storage | MinIO (S3-compatible) |
| Search | Meilisearch |
| Proxy | Nginx |
| Infrastructure | Docker Compose (8 services) |

## Quick Start

```bash
git clone https://github.com/DzKriMo/Masterly-Air-Academy.git
cd masterly-air-academy
docker compose up -d
docker compose exec api python manage.py seed_demo_data
```

Open `http://localhost`.

## Default Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@masterly-air-academy.dz | admin123 | System Administrator |
| fi@masterly-air-academy.dz | instructor123 | Flight Instructor |
| ahmed@student.maa.dz | student123 | Student |

## Production Deploy

```bash
# Update port in docker-compose.yml (default: 80)
# Add your server IP to ALLOWED_HOSTS and CORS_ALLOWED_ORIGINS
docker compose build
docker compose up -d
docker compose exec api python manage.py seed_demo_data
```

## Architecture

- **6 portals**: Landing, Student, Instructor, Finance, Quality, Director
- **19 user roles** with granular permissions
- **3 languages**: English, French, Arabic (RTL)
- **Security**: JWT auth, rate limiting, CSP headers, PBKDF2 hashing
- **Anti-cheat**: Tab switch detection with auto-submission

## License

Proprietary. All rights reserved.
