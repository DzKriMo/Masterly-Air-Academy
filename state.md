# MASTERLY AIR ACADEMY — Project State Report

> **Generated:** July 12, 2026
> **Specs:** architecture.md + dev-plan.md + dev2.0-phases.md + dev3.0-phases.md
> **Codebase:** ~4,500 lines backend + ~5,000 lines frontend + infra configs

---

## Executive Summary

The platform has a **solid backend foundation** — 49 models, 47 API endpoints, 33 ViewSets, 48 admin registrations, full RBAC with 19 roles and 98 permissions, audit logging, conflict detection, auto-grading, PDF generation, and 8 Docker services. The **frontend has all major pages** across 6 portals with working CRUD, real API integration, and a consistent dark navy/gold design system.

However, **8 frontend libraries are installed but completely unused** (react-hook-form, zod, next-intl, zustand, jspdf, qrcode.react, lucide-react, clsx). The `shared/` directory with types, validators, and locales exists but is never imported by any frontend file. TanStack Query is used on 1 of 28 pages. Every page duplicates its own nav bar. No portal has a shared layout.

---

## WHAT WE HAVE

### Backend — Infrastructure

| Component | Status | Details |
|-----------|--------|---------|
| Docker Compose (8 services) | **DONE** | nginx, api, celery, web, db, redis, minio, meilisearch |
| Django 5.1 + DRF 3.16 | **DONE** | 19 pinned packages in requirements.txt |
| PostgreSQL 17 | **DONE** | 49 models, all migrated |
| Redis 8 | **DONE** | Cache (db 1), Celery broker (db 0) |
| MinIO | **DONE** | S3-compatible storage, boto3 configured |
| Meilisearch | **DONE** (infra) | Docker service running, Python client installed, settings configured |
| Nginx | **DONE** | Reverse proxy, security headers, 50MB upload limit |
| Gunicorn | **DONE** | 4 workers, 2 threads, 120s timeout |
| Celery + Beat | **DONE** | Database scheduler, 2 periodic tasks |
| Dockerfile | **DONE** | Python 3.13-slim, WeasyPrint system deps |
| entrypoint.sh | **DONE** | Migrate, seed superuser, seed roles, collectstatic, start gunicorn |
| deploy.sh | **DONE** | Pull, build, migrate, seed, restart |
| backup.sh | **DONE** | pg_dump, app tar, 30-day retention |
| .env.example | **DONE** | 26 config vars with placeholders |

### Backend — Models (49 total)

| App | Count | Models |
|-----|-------|--------|
| core | 3 | AuditLog, SystemSetting, AcademicYear |
| accounts | 2 | User (19 roles, UUID PK), RefreshToken |
| students | 5 | Student, MedicalCertificate, GroundInstructor, FlightInstructor, AdminProfile |
| ground_training | 8 | Subject, Module, ModuleLesson, ModuleDocument, Room, Course, CourseEnrollment, AttendanceRecord |
| flight_training | 8 | FlightProgram, FlightLessonTemplate, Aircraft, FlightLesson, FlightPreparation, ResourceBooking, MaintenanceRecord, InstructorAvailability |
| exams | 10 | QuestionBank, Quiz, QuizAttempt, Exam, ExamAttempt, PracticalEvaluation, StudentCompetency, ProgressCheck, SkillTest, Certificate |
| administration | 5 | Application, Invoice, Payment, Contract, Document |
| quality_safety | 6 | Audit, NonConformity, CAPA, RiskAssessment, SafetyEvent, QualityDocument |
| notifications | 2 | Notification, Message |

### Backend — API Endpoints (47 total)

**Auth (6):**
- `POST /api/login/` — JWT login (throttled 5/min)
- `POST /api/token/refresh/` — refresh access token
- `GET /api/me/` — current user + permissions
- `PUT /api/profile/` — password change
- `POST /api/logout/` — audit log entry
- `GET /health/` — health check

**Router ViewSets (31 prefixes):**
subjects, modules, rooms, courses, course-enrollments, attendance, aircraft, flight-lessons, flight-preparations, resource-bookings, instructor-availability, question-bank, exams, quizzes, certificates, competencies, applications, invoices, payments, documents, audits, non-conformities, capas, risk-assessments, safety-events, students, contracts, quality-documents, maintenance-records, notifications, messages

**Custom endpoints (10):**
- `GET /api/students/progress/` — student progress stats
- `GET /api/students/flight-log/` — aggregated flight hours
- `GET /api/dashboard/kpis/` — dashboard aggregation (students, courses, flights, revenue, audits, NCRs)
- `GET /api/search/` — global search (Student, Course, Aircraft via ORM)
- `GET /api/export/students/` — Excel export
- `GET /api/export/invoices/` — Excel export
- `GET /api/export/flights/` — Excel export
- `GET /api/attendance/{id}/pdf/` — attendance PDF
- `GET /api/audits/{id}/pdf/` — audit report PDF
- `GET /api/certificates/{id}/pdf/` — certificate PDF
- `GET /api/invoices/{id}/pdf/` — invoice PDF

### Backend — Services (6 classes)

| Service | App | Functions |
|---------|-----|-----------|
| RoomConflictService | ground_training | Room overlap detection |
| AttendanceService | ground_training | Bulk attendance, attendance rate calculation |
| ConflictDetectionService | flight_training | Student/instructor/aircraft availability, maintenance check, qualification check |
| FlightLogService | flight_training | Aggregated flight log per student |
| AutoGradingService | exams | Exam + quiz auto-grading |
| CertificateService | exams | Certificate number generation, certificate issuance |

### Backend — PDF Generation (4 functions)

| Function | File | Output |
|----------|------|--------|
| generate_certificate_pdf | exams/pdf.py | Landscape A4, gold border, MAA branding, QR placeholder |
| generate_invoice_pdf | exams/pdf.py | Portrait A4, payment history, balance summary |
| generate_attendance_pdf | ground_training/pdf.py | Student attendance table per course |
| generate_audit_report_pdf | quality_safety/pdf.py | Audit details + NCR listing |

### Backend — Excel Exports (3 functions)

All in administration/exports.py using openpyxl with branded headers (dark navy bg, gold text):
- Students list
- Invoices list
- Flight lessons list

### Backend — RBAC

- 19 user roles (TextChoices)
- 98 custom permissions across 19 domains
- Django Groups with permission assignments
- `HasRolePermission` DRF class checks per-view `required_permission`
- `IsOwnerOrAdmin` for object-level access
- System admin bypasses all checks

### Backend — Audit Logging

- Global `post_save` + `post_delete` signals in `core/signals.py`
- Logs all model mutations with old/new values
- Uses stack frame inspection to extract request user, IP, user agent
- Skips AuditLog model to prevent recursion

### Backend — Celery Tasks (2)

| Task | Schedule | Description |
|------|----------|-------------|
| check_overdue_invoices | Daily | Marks past-due invoices as overdue |
| check_expiring_medicals | Daily | Creates warning notifications for certs expiring in 30 days |

### Backend — Management Commands (4)

| Command | Purpose |
|---------|---------|
| create_superuser_if_missing | Creates/resets admin superuser |
| seed_demo_data | Creates 5 students, 2 instructors, 3 aircraft, courses, flights, exams, invoices, audits |
| seed_roles_permissions | Creates 19 groups, 98 permissions |
| index_search | Reindexes Meilisearch |

### Frontend — Pages (28 total)

**Public:**
- `/` — Landing page (programs, about, why us, portal access)
- `/login` — Staff login
- `/dashboard` — Generic role router

**Student Portal (9 pages):**
- `/student/login` — iPad-optimized login
- `/student/dashboard` — Stats + LineChart + RadarChart
- `/student/courses` — Enrolled courses list
- `/student/flights` — Flight log with hours
- `/student/exams` — Available exams + past results
- `/student/exams/[id]` — Take exam (anti-cheat, timer, auto-submit)
- `/student/schedule` — Events list (flights + courses)
- `/student/messages` — Inbox
- `/student/certificates` — Earned certificates
- `/student/profile` — Account info + password change

**Instructor Portal (9 pages):**
- `/instructor/dashboard` — Stats + today's schedule
- `/instructor/courses` — Course CRUD + create form
- `/instructor/courses/[id]/attendance` — Bulk attendance recording
- `/instructor/students` — Student list with search
- `/instructor/flights` — Flight lesson CRUD + create form
- `/instructor/flights/[id]/prep` — Pre-flight checklist
- `/instructor/flights/[id]/evaluate` — Post-flight evaluation
- `/instructor/schedule` — Events list
- `/instructor/modules` — Module content + document upload
- `/instructor/messages` — Inbox/sent/compose

**Finance Portal (3 pages):**
- `/finance/dashboard` — KPIs + BarChart + PieChart
- `/finance/invoices` — Invoice CRUD + payment recording
- `/finance/contracts` — Contract list

**Director Portal (1 page):**
- `/director/dashboard` — 8 KPI cards + 4 charts + Excel exports

**Quality Portal (1 page):**
- `/quality/dashboard` — Tabs: audits, NCRs, CAPAs, risks, safety events, documents + PieChart

### Frontend — Components (5)

| Component | File | Features |
|-----------|------|----------|
| Providers | providers.tsx | QueryClientProvider + AuthProvider |
| AuthGuard | auth-guard.tsx | Route protection by role |
| LocaleProvider | locale-provider.tsx | Cookie-based locale + RTL |
| LanguageSwitcher | language-switcher.tsx | EN/FR/AR dropdown |
| NotificationBell | notification-bell.tsx | Badge + dropdown + mark all read |

### Frontend — Lib (4 files)

| File | Purpose |
|------|---------|
| api.ts | JWT ApiClient singleton with auto-refresh |
| auth-context.tsx | AuthProvider with login/logout/hasPermission/hasRole |
| portal-access.ts | Role → portal mapping (17 roles) |
| use-translation.ts | Custom hook with ~80 inline translation keys per locale |

### Frontend — Shared Directory

| File | Contents | Used by frontend? |
|------|----------|-------------------|
| types/index.ts | 10 type definitions (UserRole, Student, Aircraft, etc.) | **NO** |
| validators/index.ts | 8 Zod schemas | **NO** |
| colors.ts | Color palette tokens | **NO** |
| locales/en/common.json | Landing page strings | **NO** |
| locales/fr/common.json | Landing page strings | **NO** |
| locales/ar/common.json | Landing page strings | **NO** |

### Infrastructure

| Component | Status | Details |
|-----------|--------|---------|
| Docker Compose | **DONE** | 8 services, 4 named volumes, bridge network |
| Nginx routing | **DONE** | /admin → Django, /api/ → Django, / → Next.js |
| Security headers | **DONE** | X-Frame-Options, CSP, XSS-Protection, etc. |
| CORS whitelist | **DONE** | localhost + 127.0.0.1 (env-configurable) |
| SSL/TLS | **NOT DONE** | HTTP only (acceptable for LAN) |

---

## WHAT WE ARE MISSING

### Critical — Frontend Libraries Installed But Unused

| Library | Installed | Imported Anywhere | Status |
|---------|-----------|-------------------|--------|
| `react-hook-form` | YES | **ZERO** pages | Not a single `useForm` call |
| `@hookform/resolvers` | YES | **ZERO** pages | No `zodResolver` usage |
| `zod` | YES | **ZERO** pages | Schemas exist in shared/ but never imported |
| `next-intl` | YES | **ZERO** pages | No middleware, no provider, no imports |
| `zustand` | YES | **ZERO** pages | No stores created |
| `jspdf` | YES | **ZERO** pages | No client-side PDF generation |
| `qrcode.react` | YES | **ZERO** pages | No QR codes on certificates |
| `lucide-react` | YES | **ZERO** pages | All icons are inline SVGs |
| `clsx` | YES | **ZERO** pages | All conditional classes use template literals |
| `@fullcalendar/*` | **NOT INSTALLED** | N/A | Schedule pages are list-based |

### Critical — Shared Directory Completely Dead

The entire `shared/` directory (types, validators, colors, locales) is **never imported by any frontend file**. Types are duplicated inline in every page. Validators exist but no form uses them. Locale JSON files exist but translations are hardcoded in a custom hook.

### Critical — No Shared Layouts

| Layout File | Exists? |
|-------------|---------|
| `app/student/layout.tsx` | **NO** |
| `app/instructor/layout.tsx` | **NO** |
| `app/finance/layout.tsx` | **NO** |
| `app/quality/layout.tsx` | **NO** |
| `app/director/layout.tsx` | **NO** |
| `components/layout/` directory | **NO** |

**Result:** Every page has its own inline `<nav>` element (30 instances across 28 pages). Student dashboard, instructor dashboard, and quality dashboard each have inline `<aside>` sidebars that are copy-pasted, not shared.

### Critical — TanStack Query Barely Used

| Page | Uses useQuery? | Uses useMutation? |
|------|---------------|-------------------|
| director/dashboard | YES | NO |
| student/dashboard | NO | NO |
| student/courses | NO | NO |
| student/flights | NO | NO |
| student/exams | NO | NO |
| student/schedule | NO | NO |
| student/messages | NO | NO |
| student/certificates | NO | NO |
| student/profile | NO | NO |
| instructor/dashboard | NO | NO |
| instructor/courses | NO | NO |
| instructor/courses/[id]/attendance | NO | NO |
| instructor/students | NO | NO |
| instructor/flights | NO | NO |
| instructor/flights/[id]/prep | NO | NO |
| instructor/flights/[id]/evaluate | NO | NO |
| instructor/schedule | NO | NO |
| instructor/modules | NO | NO |
| instructor/messages | NO | NO |
| finance/dashboard | NO | NO |
| finance/invoices | NO | NO |
| finance/contracts | NO | NO |
| quality/dashboard | NO | NO |
| **TOTAL** | **1 of 24** | **0 of 24** |

### Critical — No Form Validation Anywhere

Every form in the app uses manual `useState` + `if (!field)` checks:
- Login: `if (!email.includes("@"))`
- Course creation: HTML `required` attributes only
- Flight scheduling: `if (!form.student || !form.aircraft)`
- Invoice creation: `if (!form.student || !form.amount || parseFloat(form.amount) <= 0)`
- Safety event: `if (!reportForm.title || !reportForm.type || !reportForm.description)`
- Password change: `if (password.length < 8)`

### Significant — Instructor Dashboard Has No Charts

Student, finance, director, and quality dashboards have Recharts. The instructor dashboard has **zero charts** — only stat cards and a list.

### Significant — Schedule Pages Not Using FullCalendar

`@fullcalendar/*` is not even installed. Both instructor and student schedules render events as sorted lists with colored borders, not as a calendar grid.

### Significant — Quality Portal Is One Monolithic Page

All quality functionality (audits, NCRs, CAPAs, risks, safety events, documents) is crammed into a single `quality/dashboard/page.tsx` using `useState` tabs. No separate pages exist. No risk matrix heatmap — risks are displayed as a flat list.

### Significant — Missing Pages

| Page | Status |
|------|--------|
| `/student/medical` | **MISSING** — medical certificate status |
| `/finance/reports` | **MISSING** — financial charts + exports |
| `/quality/audits` | **MISSING** — separate page (tab only) |
| `/quality/ncrs` | **MISSING** — separate page (tab only) |
| `/quality/capas` | **MISSING** — separate page (tab only) |
| `/quality/risks` | **MISSING** — separate page (tab only) |
| `/quality/safety` | **MISSING** — separate page (tab only) |
| `/quality/documents` | **MISSING** — separate page (tab only) |

### Significant — PDF Download Buttons Missing

Backend has 4 PDF endpoints. Frontend only links to 1 (audit PDF). No download buttons on:
- Student certificates (no button to download certificate PDF)
- Finance invoices (no button to download invoice PDF)
- Attendance (link exists but buried in attendance page)

### Significant — i18n Not Implemented

- `next-intl` is installed but **zero imports** anywhere
- No `middleware.ts` for locale routing
- No `i18n/` config directory
- Custom `use-translation.ts` has ~80 keys but only 3 pages use it
- 25+ pages are **100% hardcoded in English**
- No `/en/`, `/fr/`, `/ar/` locale routing

### Moderate — Backend i18n Not Activated

- `django-modeltranslation` is in requirements.txt but NOT in INSTALLED_APPS
- No `translation.py` files in any app
- No MODELTRANSLATION_* settings
- Subject model uses manual `title_en/title_fr/title_ar` fields (works but not using the library)

### Moderate — Meilisearch Integration Incomplete

- `apps/core/search.py` exists with indexing functions and `search_meilisearch()`
- Management command `index_search` exists
- BUT: the actual `search/` endpoint in api_urls.py uses **Django ORM `__icontains`**, not Meilisearch
- No frontend search bar component
- No automatic re-indexing on data changes

### Moderate — AuthGuard Component Unused

`components/auth-guard.tsx` exists and works, but **no page imports it**. Every page does its own auth check in `useEffect`:
```tsx
useEffect(() => {
  const session = JSON.parse(sessionStorage.getItem('maa_session') || '{}')
  if (!session.token) { router.push('/login'); return }
  setUser(session.user)
}, [])
```
This pattern is copy-pasted across all 24 authenticated pages.

### Moderate — API Client Underused

`lib/api.ts` provides a proper `ApiClient` with JWT auto-refresh, error handling, and typed methods. But **only `auth-context.tsx` uses it** (for login/logout). All other pages read tokens directly from `sessionStorage` and use raw `fetch()`.

### Moderate — 7 ViewSets Missing RBAC

These ViewSets have `IsAuthenticated` but NOT `HasRolePermission`:
- RoomViewSet (ground_training)
- StudentProgressViewSet (ground_training)
- InstructorAvailabilityViewSet (flight_training)
- FlightLogViewSet (flight_training)
- CertificateViewSet (exams)
- SafetyEventViewSet (quality_safety)
- NotificationViewSet (notifications)
- MessageViewSet (notifications)

### Minor — Celery Tasks Incomplete

| Task | Status |
|------|--------|
| check_overdue_invoices (daily) | **DONE** |
| check_expiring_medicals (daily) | **DONE** |
| generate_weekly_attendance_report | **MISSING** |
| generate_monthly_revenue_report | **MISSING** |
| check_expiring_certificates | **MISSING** |
| check_aircraft_maintenance | **MISSING** |

### Minor — No Tests

Zero test files in the entire codebase. No `tests.py` in any app. No `__tests__/` directory in frontend.

### Minor — Finance Dashboard Bug

`finance/dashboard/page.tsx` has duplicate chart sections — placeholder `<div>` blocks render alongside the real Recharts components.

---

## FILE INVENTORY

### Backend (95+ Python files, ~4,500 lines)

```
backend/
├── Dockerfile                          (26 lines)
├── requirements.txt                    (19 packages)
├── manage.py
├── docker/entrypoint.sh               (52 lines)
├── config/
│   ├── settings.py                    (230 lines)
│   ├── urls.py                        (27 lines)
│   ├── api_urls.py                    (148 lines)
│   ├── celery.py
│   └── wsgi.py
└── apps/
    ├── core/          (models, signals, middleware, exceptions, pagination, search, 3 mgmt commands)
    ├── accounts/      (models, views, serializers, permissions, 1 mgmt command)
    ├── students/      (models, views, serializers, tasks)
    ├── ground_training/ (models, views, serializers, services, pdf)
    ├── flight_training/ (models, views, serializers, services)
    ├── exams/         (models, views, serializers, services, pdf)
    ├── administration/ (models, views, serializers, tasks, exports)
    ├── quality_safety/ (models, views, serializers, pdf)
    └── notifications/ (models, views, serializers)
```

### Frontend (28 pages + 5 components + 4 lib files, ~5,000 lines)

```
web/app-single/
├── package.json                        (18 dependencies)
├── next.config.js
├── tailwind.config.ts
├── app/
│   ├── layout.tsx                      (root layout)
│   ├── globals.css                     (RTL, iPad, dark theme)
│   ├── page.tsx                        (landing)
│   ├── login/page.tsx
│   ├── dashboard/page.tsx
│   ├── student/     (9 pages: login, dashboard, courses, flights, exams, exams/[id], schedule, messages, certificates, profile)
│   ├── instructor/  (9 pages: dashboard, courses, courses/[id]/attendance, students, flights, flights/[id]/prep, flights/[id]/evaluate, schedule, modules, messages)
│   ├── finance/     (3 pages: dashboard, invoices, contracts)
│   ├── director/    (1 page: dashboard)
│   └── quality/     (1 page: dashboard with tabs)
├── components/      (providers, auth-guard, locale-provider, language-switcher, notification-bell)
└── lib/             (api, auth-context, portal-access, use-translation)

shared/
├── types/index.ts       (10 types — UNUSED)
├── validators/index.ts  (8 schemas — UNUSED)
├── colors.ts            (color tokens — UNUSED)
└── locales/             (en/fr/ar JSON — UNUSED)
```

### Infrastructure

```
masterly-air-academy/
├── docker-compose.yml          (8 services)
├── nginx/nginx.conf            (reverse proxy + security headers)
├── deploy.sh                   (production deployment)
├── backup.sh                   (database + app backup)
├── deploy-vps.sh               (VPS-specific deployment)
├── .env.example                (26 config vars)
├── architecture.md             (1,100 lines)
├── dev-plan.md                 (848 lines)
├── dev2.0-phases.md            (221 lines)
├── dev3.0-phases.md            (700+ lines)
└── state.md                    (this file)
```

---

## NUMBERS

| Metric | Count |
|--------|-------|
| Django apps | 9 |
| Django models | 49 |
| API ViewSets | 33 |
| API APIViews | 5 |
| API function views | 10 |
| Total API endpoints | 47 |
| Serializers | 47 |
| Admin registrations | 48 |
| Services | 6 |
| Celery tasks | 2 |
| PDF generators | 4 |
| Excel exporters | 3 |
| Management commands | 4 |
| Frontend pages | 28 |
| Frontend components | 5 |
| Frontend lib files | 4 |
| Docker services | 8 |
| User roles | 19 |
| RBAC permissions | 98 |
| npm dependencies | 18 |
| Python packages | 19 |

---

*This document reflects the exact state of the codebase as of July 12, 2026.*
