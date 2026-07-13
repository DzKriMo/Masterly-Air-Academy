# MASTERLY AIR ACADEMY - State of the Project

> Deep-dive audit comparing `architecture.md` spec against actual codebase.
> Generated: July 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [What Exists (Implemented)](#2-what-exists)
3. [What's Missing](#3-whats-missing)
4. [What Needs Fixing (Bugs)](#4-what-needs-fixing)
5. [What Needs Upgrading](#5-what-needs-upgrading)
6. [Detailed Gap Analysis by Layer](#6-detailed-gap-analysis)
7. [Priority Roadmap](#7-priority-roadmap)

---

## 1. Executive Summary

**Overall completion: ~85% of Phase A (Web Platform)**

The backend is nearly complete with 49 models, 43+ ViewSets, 3 Celery tasks, 4 PDF generators, 3 Excel exporters, and a full RBAC system with 19 roles and 98 permissions. The frontend has 39 pages across 6 portals with charts, calendars, exams with anti-cheat, and trilingual i18n. Docker infrastructure has all 8 required services plus a backup service.

The main gaps are: no SSL/TLS, no error/loading route conventions, role mismatch bugs in auth guards, inconsistent data fetching patterns, missing reports pages, and production hardening items.

---

## 2. What Exists

### 2.1 Backend (Django 5.1 + DRF)

| Area | Count | Status |
|------|-------|--------|
| Django apps | 9 | accounts, core, students, ground_training, flight_training, exams, administration, quality_safety, notifications |
| Models | 49 | All with UUID PKs, all migrated |
| Router ViewSets | 43 | All registered in `config/api_urls.py` |
| Custom API endpoints | 20 | login, profile, search, dashboard/kpis, student dashboard, quality dashboard, finance reports, 3 Excel exports, 4 PDF generators, 2 non-model ViewSets |
| Services | 6 | ConflictDetection, Attendance, AutoGrading, Certificate, FlightLog, DeadlineMonitor |
| Celery tasks | 3 | overdue invoices, expiring medicals, upcoming deadlines (all daily) |
| PDF generators | 4 | certificate, invoice, attendance, audit report (all WeasyPrint) |
| Excel exporters | 3 | students, invoices, flights (openpyxl) |
| Signals | 3 receivers | Global audit log (pre_save, post_save, post_delete) |
| Middleware | 2 custom | RequestIdMiddleware, RequestLogMiddleware |
| Management commands | 4 | create_superuser, seed_roles_permissions, seed_demo_data, index_search |
| Permission system | 19 roles, 98 permissions | Across 19 domains (dashboard, users, students, etc.) |
| Admin registrations | All Unfold-themed | Except UserAdmin (uses BaseUserAdmin directly) |

### 2.2 Frontend (Next.js 15)

| Area | Count | Status |
|------|-------|--------|
| Portal layouts | 6 | root, student, instructor, director, finance, quality |
| Pages | 39 | Across all 6 portals |
| Shared components | 15 | DataTable, ModalForm, FilterBar, ExportButton, Toast, NotificationBell, LanguageSwitcher, etc. |
| Lib files | 6 | api.ts, auth-context.tsx, auth-store.ts, use-translation.ts, validators.ts, portal-access.ts |
| Charts (Recharts) | 7 pages | Dashboards across all portals |
| Calendar (FullCalendar) | 2 pages | Student + instructor schedule |
| Zod schemas | 7 | login, course, flight, invoice, safety, message, profile |
| PDF generation | 1 page | Student flight logbook (client-side jsPDF) |

### 2.3 Infrastructure

| Service | Image | Status |
|---------|-------|--------|
| nginx | nginx:1.31.2-alpine | Present, port 80, security headers |
| api (Django) | Build from ./backend | Present, health check |
| celery | Build from ./backend | Present, daily tasks |
| web (Next.js) | Build from ./web | Present, health check |
| db (PostgreSQL) | postgres:17.10-alpine | Present, health check |
| redis | redis:8-alpine | Present, health check |
| minio | minio/minio latest | Present |
| meilisearch | getmeili/meilisearch:v1.13.1 | Present |
| backup | postgres:17.10-alpine | Bonus service, 30-day retention |

### 2.4 Deployment Artifacts

- `docker-compose.yml` (189 lines, 9 services, named volumes, bridge network)
- `deploy.sh` (general deployment)
- `deploy-vps.sh` (VPS-specific post-deploy with demo data seeding)
- `backup.sh` (automated PostgreSQL backup with retention)
- `.env.example` (26 environment variables)
- `shared/` directory (TypeScript types, Zod schemas, colors, locale JSONs)

---

## 3. What's Missing

### 3.1 Critical Missing Items

#### A. No SSL/TLS Configuration
- **Architecture spec**: Section 7.4 specifies TLS 1.3 everywhere, HSTS headers
- **Reality**: Nginx only listens on port 80 (HTTP). No HTTPS, no certificates, no 443 listener.
- **Impact**: All traffic (including JWT tokens and passwords) transmitted in plaintext. Must be fixed before any production deployment.

#### B. No Next.js Route Conventions
- **Missing `error.tsx`** at any route level -- no Next.js App Router error boundaries
- **Missing `loading.tsx`** at any route level -- no loading states during route transitions
- **Missing `not-found.tsx`** -- no global 404 page
- **Impact**: Poor UX during errors, no graceful error recovery at the route level.

#### C. Missing Reports Pages
- **Architecture spec**: Dashboard quick links reference `/reports/students`, `/reports/financial`, `/reports/operations`
- **Reality**: None of these routes exist. The links would 404.
- **Impact**: Director/head-of-training roles cannot access dedicated reporting.

#### D. Missing `/admin` Rewrite in Next.js
- **Architecture spec**: `/admin` should serve Django Admin via Nginx proxy
- **Reality**: `next.config.js` only rewrites `/api/*` to Django. The `/admin` route works through Nginx's separate `~ ^/admin` rule, but there's no explicit rewrite in Next.js config.
- **Impact**: If accessed directly through Next.js (not through Nginx), `/admin` would 404.

#### E. Missing Notifications Frontend
- **Backend**: Full `NotificationService` with 15+ event triggers, `NotificationViewSet` with mark-all-read
- **Frontend**: Only a `NotificationBell` component that polls `/api/notifications/`. No dedicated notifications page, no notification center, no preference settings.
- **Impact**: Users see a badge count but can't view/manage notification history.

#### F. Missing Student Portal Pages
- **Missing**: `/student/medical` (page exists in layout NAV but content is minimal)
- **Missing**: `/student/messages` (page exists in layout NAV but content is minimal)
- **Missing**: `/student/profile` (page exists in layout NAV but content is minimal)
- **Impact**: Three student portal pages are shells with no real functionality.

### 3.2 Architecture Spec vs Reality Gaps

| Architecture Requirement | Status | Gap |
|--------------------------|--------|-----|
| `django-modeltranslation` for model i18n | Listed in requirements.txt | **NOT USED** -- models use manual `_en/_fr/_ar` fields |
| `next-intl` for frontend i18n | In spec section 10 | **NOT INSTALLED** -- custom `use-translation.ts` hook used instead |
| `shadcn/ui` for component library | In spec section 2.2 | **NOT INSTALLED** -- all UI hand-rolled with Tailwind |
| `Zustand` for client state | In spec section 2.2 | Installed but **MINIMAL USE** -- only auth state store |
| `@fullcalendar/core` | In spec section 2.2 | Installed via 4 packages, used in 2 pages |
| `jspdf` | In spec section 2.2 | Installed, used in 1 page (flight logbook) |
| `qrcode.react` | In spec section 2.2 | Installed but **NEVER USED** -- should be for certificate QR codes |
| API response envelope `{success, data, meta}` | In spec section 6.2 | Implemented via `ApiResponseRenderer` |
| Rate limiting (5 attempts/min login, 100 req/min user) | In spec section 7.1 | Implemented via DRF throttles |
| UUID primary keys on all models | In spec section 5 | Implemented on all 49 models |
| Celery background tasks | In spec section 8 | 3 daily periodic tasks implemented |
| Meilisearch full-text search | In spec section 2.1 | Backend integration exists (`core/search.py`). Frontend integration **MISSING** |
| MinIO object storage | In spec section 2.4 | Configured via `django-storages` S3 backend. Used for file uploads. |
| Audit logging via Django signals | In spec section 7.5 | Implemented in `core/signals.py` with 3 receivers |

---

## 4. What Needs Fixing (Bugs)

### 4.1 Auth Guard Role Mismatches (CRITICAL)

These bugs mean certain roles **cannot access their portals**:

| Layout | Checks For | Actual Role Name | Bug |
|--------|-------------|------------------|-----|
| `finance/layout.tsx` | `finance_manager` | `finance_responsible` | **Wrong role name** -- finance users locked out |
| `director/layout.tsx` | `director` | `director_general` | **Wrong role name** -- director locked out |
| `quality/layout.tsx` | `safety_officer` | `safety_manager` | **Wrong role name** -- safety manager locked out |
| `instructor/layout.tsx` | `role?.includes("instructor")` | Various instructor roles | **Fragile substring match** -- works but could match unintended roles |

### 4.2 Portal Access Function Naming

- `portal-access.ts` exports `usesFilamentAdmin()` -- **still references old Laravel Filament branding**. Should be `usesDjangoAdmin()`.
- The function name is called in multiple places (login page, dashboard page) -- a rename would require updating all references.

### 4.3 Export Endpoint Permission Gap

- The 3 Excel export functions (`export_students`, `export_invoices`, `export_flights`) use `HasRolePermission` class but **do not set `required_permission`** on the function-based views.
- Since `getattr(view, 'required_permission', None)` returns `None`, the permission check **always passes** for any authenticated user.
- **Impact**: Any logged-in user (including students) can export all student/invoice/flight data.

### 4.4 SafetyEventViewSet Missing Role Check

- `SafetyEventViewSet` uses `[IsAuthenticated]` only -- **no `HasRolePermission`**.
- Any authenticated user can create/view safety events.
- Should require `safety.view` or similar permission.

### 4.5 Quality Dashboard ViewSet Missing Role Check

- `QualityDashboardView` uses `[IsAuthenticated]` only -- **no role check**.
- Any authenticated user can access quality KPIs.

### 4.6 Dashboard KPI ViewSet Missing Role Check

- `DashboardKPIView` uses `[IsAuthenticated]` only -- **no role check**.
- Any authenticated user can see executive KPIs.

### 4.7 Student Dashboard ViewSet Missing Role Check

- `StudentDashboardView` uses `[IsAuthenticated]` only -- **no role check**.
- Any authenticated user can see student dashboard data.

### 4.8 Quality Dashboard Duplicate Navigation

- `quality/dashboard/page.tsx` has its own tabbed sidebar navigation (audits, NCRs, CAPAs, risks, safety, documents) **in addition to** the `quality/layout.tsx` router-based sidebar.
- **Result**: Two sidebars visible simultaneously when navigating quality pages.

### 4.9 `readLocale()` Cookie Validation Bug

- `use-translation.ts` `readLocale()` function validates cookie value against `"fr"` or `"ar"` but **does not validate the cookie value format**.
- A malformed cookie value (e.g., `locale=xyz`) would be accepted but fall through to default `"en"`.
- Minor issue but should validate properly.

### 4.10 Backup Service Timer Reset

- `backup.sh` is scheduled via `sleep 86400` in a shell loop.
- If the backup container restarts, the 24-hour timer resets, potentially causing missed or duplicated backups.
- Should use `cron` instead of a sleep loop.

---

## 5. What Needs Upgrading

### 5.1 Security Upgrades

| Item | Current | Required | Priority |
|------|---------|----------|----------|
| SSL/TLS | None (HTTP only) | TLS 1.3 via Let's Encrypt or self-signed cert | **CRITICAL** |
| CORS headers | Django middleware only | Add at Nginx layer too for defense-in-depth | High |
| Rate limiting | DRF throttles (application layer) | Add Nginx `limit_req` for DDoS protection at edge | High |
| Secrets in deploy-vps.sh | Hardcoded passwords (director123, etc.) | Use environment variables or Docker secrets | Medium |
| DB/Redis port exposure | Ports 5432/6379 exposed to host | Remove from port mapping in production compose | Medium |
| CSP headers | `unsafe-inline` and `unsafe-eval` allowed | Remove `unsafe-eval`, use nonces for inline scripts | Medium |

### 5.2 Frontend Architecture Upgrades

| Item | Current | Recommended | Priority |
|------|---------|-------------|----------|
| Data fetching | Mixed: some TanStack Query, some manual `useState+useEffect+api.get()` | Standardize on TanStack Query for all data fetching | High |
| Error boundaries | Only root-level `ErrorBoundary` component | Add `error.tsx` at route levels per Next.js convention | High |
| Loading states | Manual `LoadingSkeleton` in each page | Add `loading.tsx` at route levels for automatic Suspense | Medium |
| i18n approach | Custom inline dictionary (~1100 keys in 1 file) | Consider `next-intl` for SSR support, code splitting | Medium |
| Component library | Hand-rolled with raw Tailwind | Evaluate shadcn/ui for accessibility and consistency | Medium |
| State management | Zustand only for auth | Use Zustand for domain data caching too, or remove it | Low |
| Dark/Light theme | Hardcoded dark only | Add theme toggle (Tailwind `class` strategy already configured) | Low |
| `clsx`/`tailwind-merge` | Not installed | Add for cleaner conditional class logic | Low |

### 5.3 Backend Upgrades

| Item | Current | Recommended | Priority |
|------|---------|-------------|----------|
| `django-modeltranslation` | Listed in requirements.txt, NOT used | Either use it properly or remove from requirements | Low |
| Celery monitoring | No Flower dashboard | Add Flower for Celery task monitoring | Medium |
| API versioning | No `/v1/` prefix | Add URL-based API versioning (`/api/v1/`) for future-proofing | Low |
| Swagger/OpenAPI docs | None | Add `drf-spectacular` for auto-generated API documentation | Medium |
| WebSocket support | None | Add Django Channels for real-time notifications (vs polling) | Medium |
| Soft deletes | Not implemented | Add `SoftDeleteManager` for critical models (invoices, exams) | Low |
| Database indexes | Some models have indexes, others don't | Audit and add composite indexes for common query patterns | Medium |

### 5.4 Infrastructure Upgrades

| Item | Current | Recommended | Priority |
|------|---------|-------------|----------|
| SSL termination | None | Add Certbot/Let's Encrypt sidecar or self-signed cert generation | **CRITICAL** |
| Web Dockerfile | Single-stage (includes dev deps) | Multi-stage build (build in one stage, run in another) | Medium |
| Docker healthchecks | Missing on minio, meilisearch, celery | Add healthchecks to all services | Medium |
| docker-compose profiles | Not used | Add `dev` and `prod` profiles for environment-specific configs | Low |
| Log aggregation | Application-level only | Add Loki/Prometheus/Grafana stack for centralized logging | Low |
| CI/CD | Manual `deploy.sh` | Add GitHub Actions for automated testing and deployment | Medium |

---

## 6. Detailed Gap Analysis by Layer

### 6.1 Backend Models (49 models)

**All 49 models are implemented and match the architecture spec.** Key observations:

- All models use UUID primary keys as specified
- Manual i18n fields (`title_en/fr/ar`) used instead of `django-modeltranslation`
- `Exercises_completed` and `competencies_acquired` on FlightLesson use `JSONField` (not `ArrayField` as in spec)
- `AuditLog` model matches spec with all required fields
- `RefreshToken` model implemented for JWT token management
- Additional models beyond spec: `FlightPreparation`, `ResourceBooking`, `MaintenanceRecord`, `InstructorAvailability`, `Quiz`, `QuizAttempt`, `PracticalEvaluation`, `StudentCompetency`, `ProgressCheck`, `SkillTest`, `QualityDocument`, `AdminProfile`

### 6.2 Backend API (43 ViewSets + 20 custom endpoints)

**All ViewSets are implemented with RBAC permissions.** Gaps:

- 6 ViewSets missing `HasRolePermission` (StudentProgress, FlightLog, Notification, Message, QuizAttempt, SafetyEvent)
- 3 custom API views missing role checks (QualityDashboard, DashboardKPI, StudentDashboard)
- Export endpoints have permission bypass vulnerability (no `required_permission` set)
- API response envelope `{success, data, meta}` implemented correctly
- Custom exception handler wraps errors in consistent format

### 6.3 Frontend Portals (6 portals, 39 pages)

**Coverage:**

| Portal | Pages | Functional | Shells |
|--------|-------|------------|--------|
| Landing | 3 (home, login, student login) | 3 | 0 |
| Student | 10 | 7 | 3 (medical, messages, profile) |
| Instructor | 10 | 10 | 0 |
| Director | 1 | 1 | 0 (too minimal) |
| Finance | 4 | 4 | 0 |
| Quality | 7 | 7 | 0 (dashboard has duplicate nav) |
| Generic | 1 (dashboard) | 1 | 0 |
| **Total** | **39** | **33** | **3** |

### 6.4 i18n Coverage

| Area | Status |
|------|--------|
| Landing page | Fully translated (all keys present in EN/FR/AR) |
| Login pages | Fully translated |
| Student portal NAV | Translated via `useTranslation()` |
| Instructor portal NAV | Translated via `useTranslation()` |
| Director portal NAV | Translated via `useTranslation()` |
| Finance portal NAV | Translated via `useTranslation()` |
| Quality portal NAV | Translated via `useTranslation()` |
| Dashboard cards/links | Translated (all ~50 strings) |
| Exam page | Fully translated (anti-cheat, results, progress) |
| Landing program titles/durations/prerequisites | Translated via `t()` keys |
| Radar chart labels | Translated |
| Model field labels (backend) | Manual `title_en/fr/ar` fields |
| RTL support | Implemented for Arabic |
| Language switcher | Fixed to read cookie correctly |

### 6.5 Shared Directory

**EXISTS but underutilized:**
- `shared/types/index.ts`: TypeScript types for roles, statuses, and interfaces
- `shared/validators/index.ts`: Zod schemas (8 schemas)
- `shared/colors.ts`: Color palette
- `shared/locales/{en,fr,ar}/common.json`: Only 51 keys each (vs ~380 keys in the actual `use-translation.ts`)
- **Not imported by `app-single/`** -- the frontend uses its own `lib/validators.ts` and `lib/use-translation.ts` instead of the shared versions

---

## 7. Priority Roadmap

### Phase 1: Critical Fixes (Do First)

1. **Fix SSL/TLS** -- Add HTTPS to Nginx (Let's Encrypt or self-signed)
2. **Fix auth guard role mismatches** -- `finance_responsible` not `finance_manager`, `director_general` not `director`, `safety_manager` not `safety_officer`
3. **Fix export permission bypass** -- Add `required_permission` to all 3 export views
4. **Add role checks** to SafetyEventViewSet, QualityDashboardView, DashboardKPIView, StudentDashboardView
5. **Remove DB/Redis port exposure** from production docker-compose

### Phase 2: Missing Features (Complete the Platform)

6. **Add `error.tsx`** at root and all portal route levels
7. **Add `not-found.tsx`** for global 404 page
8. **Build reports pages** (`/reports/students`, `/reports/financial`, `/reports/operations`)
9. **Build notifications page** (`/notifications`) with history and preferences
10. **Complete student portal shells** (medical, messages, profile pages)
11. **Fix quality dashboard duplicate navigation**

### Phase 3: Production Hardening

12. **Multi-stage Docker build** for Next.js
13. **Add Nginx rate limiting** (`limit_req_zone`)
14. **Remove hardcoded secrets** from deploy-vps.sh
15. **Add healthchecks** to minio, meilisearch, celery services
16. **Standardize data fetching** on TanStack Query across all pages
17. **Rename `usesFilamentAdmin`** to `usesDjangoAdmin`

### Phase 4: Enhancements (Nice to Have)

18. Add `drf-spectacular` for API documentation
19. Add Flower for Celery monitoring
20. Add WebSocket support for real-time notifications
21. Integrate `qrcode.react` for certificate QR codes
22. Integrate Meilisearch on the frontend (search page)
23. Add dark/light theme toggle
24. Adopt `shadcn/ui` for accessible component library
25. Unify `shared/` directory imports with `app-single/`

---

*This document represents a thorough comparison of the architecture specification against the actual codebase implementation. The platform is substantially built and functional, with the main gaps being production-readiness items (SSL, error handling) and a handful of permission/security fixes.*
