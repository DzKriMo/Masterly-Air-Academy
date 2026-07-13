# MASTERLY AIR ACADEMY — Project State Report

> **Audit Date:** July 12, 2026
> **Compared Against:** `architecture.md` + `MASTERLY AIR ACADEMY PLATFORM.pdf` (SRS v1.0, 52 pages, 8 phases)
> **Agents Deployed:** 3 parallel agents (backend, frontend, infrastructure) + manual file review

---

## Executive Summary

The platform is a **~60% complete** ATO management system. The backend models and API structure are solid (~85% of spec), but the frontend has only ~40% of specified features and all 36 pages are at "basic" depth (list + render, no CRUD modals, no filtering UI, no pagination controls).

| Area | Completion | Grade |
|------|-----------|-------|
| Backend Models | ~85% | B+ |
| Backend API Endpoints | ~65% | C+ |
| Frontend Pages (routes exist) | ~75% | C |
| Frontend Feature Depth | ~30% | D |
| Infrastructure / DevOps | ~70% | C+ |
| Security | ~60% | C |
| i18n | ~15% | F |
| Testing | ~0% | F |

---

## 1. What EXISTS — The Good

### 1.1 Backend Models (49 models across 9 apps)

All core entities from the 8 PDF phases are modeled:

- **accounts:** User (UUID, 19 roles, 4 statuses), RefreshToken
- **students:** Student, MedicalCertificate, GroundInstructor, FlightInstructor, AdminProfile
- **ground_training:** Subject (i18n en/fr/ar), Module, ModuleLesson, ModuleDocument, Room, Course, CourseEnrollment, AttendanceRecord
- **flight_training:** FlightProgram, FlightLessonTemplate, Aircraft, FlightLesson, FlightPreparation, ResourceBooking, InstructorAvailability, MaintenanceRecord
- **exams:** QuestionBank, Quiz, QuizAttempt, Exam, ExamAttempt, PracticalEvaluation, StudentCompetency, ProgressCheck, SkillTest, Certificate
- **administration:** Application, Invoice (6 statuses), Payment, Contract, Document (5 statuses, versioning)
- **quality_safety:** Audit, NonConformity, CAPA, RiskAssessment (auto-calc risk_level), SafetyEvent (confidential flag), QualityDocument (version_history JSON)
- **notifications:** Notification, Message
- **core:** AuditLog (9 action types, 4 indexes), SystemSetting, AcademicYear

### 1.2 Backend API (31 ViewSets + 13 custom endpoints)

- Full DRF ViewSets for all major entities
- JWT auth (15min access / 7d refresh, rotation enabled)
- RBAC via `HasRolePermission` + 98 seeded permissions in 19 groups
- Rate limiting: 20/min anon, 100/min user, 5/min login
- Auto-grading for MCQ exams
- Conflict detection for flight scheduling (student/instructor/aircraft)
- Room conflict detection for course scheduling
- PDF generation: attendance sheets, audit reports, certificates, invoices
- Excel export: students, invoices, flights
- Audit logging via signals (post_save, post_delete)
- Celery beat: overdue invoice checks, expiring medical alerts
- Meilisearch integrated (indexing code exists, not used by search endpoint)

### 1.3 Frontend Pages (41 files across 6 portals)

| Portal | Pages | Status |
|--------|-------|--------|
| Landing | 1 | Full |
| Login | 2 | Full (staff + student) |
| Student | 11 | 9 full, 1 skeleton (medical), 2 missing (documents, payments) |
| Instructor | 13 | 11 full, 1 attendance sub-page |
| Quality | 7 | All full |
| Finance | 4 | All full, 1 missing (payments) |
| Director | 1 | Full KPI dashboard |

- TanStack Query on 12 pages, useMutation on 3 pages
- Recharts on 7 dashboard pages (BarChart, LineChart, PieChart, RadarChart)
- Zod validation on 4 forms
- 5x5 risk matrix on quality/risks
- Anti-cheat exam-taking (tab-switch detection, countdown timer)
- Certificate PDF download via blob
- Custom i18n hook with EN/FR/AR (~130 keys)

### 1.4 Infrastructure

- 8 Docker services (nginx, api, celery, web, db, redis, minio, meilisearch)
- Healthchecks on all critical services
- Nginx reverse proxy with security headers
- MinIO S3-compatible storage
- Gunicorn 4 workers, 2 threads
- Redis cache + Celery broker
- django-unfold themed admin

---

## 2. What's MISSING — Critical Gaps

### 2.1 🐛 Bugs

| Bug | Location | Severity |
|-----|----------|----------|
| `Student.main_instructor` FK → `self` (Student) instead of `FlightInstructor` | `students/models.py:28` | High |
| `/health/` endpoint missing in Django — docker healthcheck uses it | `config/urls.py` | High |
| 27 pages use raw `fetch` + `sessionStorage` token (bypasses api client's token refresh) → crashes on 401 | 27 page files | Critical |
| Search endpoint uses `__icontains` not Meilisearch | `api_urls.py:73-87` | Medium |
| `django-modeltranslation` installed but NOT in `INSTALLED_APPS` — dead weight | `settings.py` | Low |
| `audit_log_save` signal tries to use `.tracker` attribute that doesn't exist → silent failure | `core/signals.py:100-103` | Medium |

### 2.2 Backend Gaps by PDF Phase

#### Phase 2 — Student Portal (pages 7-12)
- ❌ No student photo upload
- ❌ No student dashboard with aggregated progress
- ❌ No profile editing (only password change via `/api/profile/`)
- ❌ No course materials download (ModuleDocument model exists but no dedicated endpoint)
- ❌ No schedule with day/week/month toggle (flight-lessons + courses endpoints exist, no aggregation)
- ❌ No digital documents folder view
- ❌ No results/exam history consolidated endpoint
- ❌ No payments/solde endpoint for students
- ❌ No certificates with QR code verification endpoint (model has `qr_code` field, no generation trigger)

#### Phase 3 — Ground Training (pages 13-19)
- ❌ No CGI dashboard endpoint
- ❌ No GroundInstructor CRUD views (model in students app, no ViewSet)
- ❌ No instructor availability conflict detection in Course scheduling (only room conflicts)
- ❌ No student evaluations per course endpoint
- ❌ No pedagogical tracking reports
- ❌ No auto-calculated attendance rate (AttendanceService exists but not exposed as endpoint)

#### Phase 4 — Flight Training (pages 20-27)
- ❌ No CFI dashboard endpoint
- ❌ No FlightInstructor management views
- ❌ No simulator model/views (explicitly deferred to Phase B)
- ❌ No flight program CRUD views (FlightProgram model exists, no ViewSet)
- ❌ No flight lesson template CRUD views (model exists, no ViewSet)
- ❌ No Progress Check views (model in exams app, no ViewSet)
- ❌ No Skill Test views (model in exams app, no ViewSet)
- ❌ No operational reports endpoint
- ❌ No solo flight authorization workflow

#### Phase 5 — Administration (pages 28-34)
- ❌ No admin dashboard KPI endpoint (`/api/dashboard/kpis/` exists but limited)
- ❌ No student lifecycle endpoints (suspend/reactivate/close/archive)
- ❌ No document versioning API (model has `version` field but no version history logic)
- ❌ No contract generation endpoint
- ❌ No email/SMS communication service
- ❌ No system settings API (SystemSetting model exists, no ViewSet)
- ❌ No RBAC management API (Django Admin groups only)

#### Phase 7 — Quality & Safety (pages 41-46)
- ❌ No quality dashboard endpoint
- ❌ No deadline monitoring/alerts (medical expirations partially covered)
- ❌ No QualityDocument versioning logic (version_history JSON field exists but unused)

#### Phase 8 — Exams & Certifications (pages 47-52)
- ❌ No manual grading endpoint for essay/short-answer questions
- ❌ No auto-grading for non-MCQ types (matching, ordering, case study)
- ❌ No competency matrix endpoint
- ❌ No PracticalEvaluation views (model exists, no ViewSet)
- ❌ No ProgressCheck views (model exists, no ViewSet)
- ❌ No SkillTest views (model exists, no ViewSet)
- ❌ No academic history consolidated endpoint

### 2.3 Frontend Feature Depth (ALL pages are "Basic")

Every page exhibits these missing patterns:

- ❌ **No Create/Edit modals** — Only 4 pages have create forms (instructor courses, instructor flights, safety events, finance invoices)
- ❌ **No Delete buttons** — No record deletion on any page
- ❌ **No filtering UI** — Backend supports `django-filter`, frontend has no filter controls
- ❌ **No sorting controls** — Backend supports ordering, frontend has no column sort
- ❌ **No pagination controls** — No page navigation UI
- ❌ **No search bars** — No search input on any list page
- ❌ **No detail drill-down** — Clicking a row doesn't navigate to detail (except exams → `[id]`)
- ❌ **No bulk actions** — Cannot select multiple items
- ❌ **No export/download buttons** — Backend supports PDF/Excel export, frontend never calls it
- ❌ **No error boundaries** — Any unhandled error = white screen crash
- ❌ **No loading skeletons** — Only "Loading..." text everywhere

### 2.4 Missing Frontend Pages

| Route | Portals That Reference It |
|-------|--------------------------|
| `/student/documents` | Architecture spec |
| `/student/payments` | Architecture spec |
| `/finance/payments` | Finance dashboard quick links |
| `/instructor/aircraft` | Instructor dashboard quick links |
| `/instructor/attendance` | Instructor dashboard quick links |
| `/instructor/subjects` | Instructor dashboard quick links |
| `/instructor/bookings` | Instructor dashboard quick links |
| `/instructor/reports` | Instructor dashboard quick links |

### 2.5 Missing Libraries vs Architecture.md Section 2.2

| Library | Arch Spec | Actual | Impact |
|---------|-----------|--------|--------|
| Zustand v5 | Required | ❌ Not installed | No global client state |
| React Hook Form v7 | Required | ❌ Not installed | No form validation library |
| FullCalendar v6 | Required | ❌ Not installed | Manual schedule views |
| next-intl v4 | Required | ❌ Not installed | Custom i18n with ~130 keys only |
| shadcn/ui | Required | ❌ Not installed | All UI built from scratch |
| jspdf v2.5 | Required | ❌ Not installed | No client-side PDF |
| qrcode.react v4 | Required | ❌ Not installed | No QR code rendering |
| Tailwind CSS v4 | Required | ❌ v3.4 installed | Older Tailwind version |

### 2.6 Version Mismatches (Backend)

| Package | Arch Spec | Actual | Risk |
|---------|-----------|--------|------|
| djangorestframework | 3.16→3.17 | 3.16→4.0 | May pull in 4.0 breaking changes |
| simplejwt | 5.4→5.5 | 5.4→6.0 | May pull in 6.0 breaking changes |
| celery | 5.5→5.6 | 5.4→6.0 | Lower floor, may pull 6.0 |
| boto3 | 1.37→1.38 | 1.35→2.0 | Much wider range |
| meilisearch | 0.34→0.35 | 0.31→1.0 | May pull 1.0 breaking changes |
| django-auditlog | 3.0→3.1 | **NOT INSTALLED** | Missing entirely |
| django-unfold | 1.0→2.0 | 0.80→1.0 | Pre-release version |
| Redis (docker) | 8.6.4+ | 8-alpine (unpinned) | No minor version pin |
| PostgreSQL (docker) | 17.10+ | 17-alpine (unpinned) | No minor version pin |

### 2.7 Security Gaps

| Gap | Severity |
|-----|----------|
| No SSL/TLS anywhere (plain HTTP only) — acceptable for LAN, but arch.md says "TLS 1.3 everywhere" | Medium |
| No HSTS header | Low (LAN-only) |
| CSP allows `unsafe-inline` and `unsafe-eval` (architecture spec says `'self'` only) | Medium |
| No account lockout after failed login attempts | Medium |
| Token blacklisting disabled (`BLACKLIST_AFTER_ROTATION = False`) | Medium |
| No file upload validation (size/mime type) | Medium |
| DB port (5432) and Redis port (6379) exposed to host | Low (LAN-only) |
| Next.js images allow remote patterns from any HTTPS hostname | Low |
| API container runs as root (web container runs as non-root `nextjs`) | Medium |
| Zero automated tests | High (for production readiness) |

### 2.8 i18n Status — Critical

The architecture specifies full EN/FR/AR support with `next-intl` and `django-modeltranslation`. Reality:

- **Backend:** `django-modeltranslation` is installed but NOT used. Only `Subject` has manual `_en`/`_fr`/`_ar` fields. All other models are single-language.
- **Frontend:** Custom `useTranslation()` hook with ~130 keys. Used on only 3 pages (landing, login, exam). No locale routing, no `middleware.ts`.
- **RTL:** CSS for Arabic RTL exists in `globals.css`. `LocaleProvider` sets `dir` attribute.
- **Coverage:** ~5% of UI strings are translatable.

---

## 3. What was INTENTIONALLY Removed

Per `state.md` note, these packages were "removed as dead code":
- `zustand`, `react-hook-form`, `fullcalendar`, `next-intl`, `jspdf`, `qrcode.react`, `shadcn/ui`

This was a healthy cleanup but means the architecture spec is out of date with the actual implementation approach.

---

## 4. What is EXPLICITLY DEFERRED (Phase B)

| Item | Spec Reference |
|------|---------------|
| Simulator model + sessions | Architecture.md §5.9 |
| iPad React Native app | Architecture.md §9 |
| Electronic signatures | PDF Phase 5 §12 |
| Credit card payments | PDF Phase 5 §11 |
| SMS notifications | PDF Phase 6 §12 |
| Runway availability check | PDF Phase 6 §9 |

---

## 5. Recommended Priority Order

### 🔴 Critical (this week)
1. Fix `Student.main_instructor` FK from `self` to `FlightInstructor`
2. Add `/health/` Django endpoint
3. Add error boundaries to all portal layouts
4. Fix 27 pages: migrate from raw `fetch` + `sessionStorage` token → `api` client

### 🟡 High (next sprint)
5. Install React Error Boundary component per portal
6. Add `.catch()` error handling to all API calls
7. CRUD modals for all list pages (create/edit at minimum)
8. Pagination controls on all list pages
9. Filter/search controls on all list pages
10. Notification auto-creation on key events (new flight, exam result, document expiry)

### 🟢 Medium (future sprints)
11. Install FullCalendar for schedule pages
12. Install React Hook Form for all forms
13. Add export buttons (PDF/Excel) on report pages
14. Implement missing ViewSets: ProgressCheck, SkillTest, PracticalEvaluation
15. Add Student lifecycle endpoints (suspend/reactivate/close/archive)
16. Install next-intl, translate all ~500+ UI strings (EN/FR/AR)

### 🔵 Low (nice to have)
17. Install Zustand for auth state (replace raw sessionStorage reads)
18. Enable token blacklisting
19. Add file upload validation
20. Add database backup service
21. Install shadcn/ui, gradually migrate custom components
22. SSL/TLS termination at nginx (if network security requires it)

---

*Audit performed by Claude Code — 3 parallel agents + manual file review*
*Documents compared: architecture.md v1.0 + MASTERLY AIR ACADEMY PLATFORM.pdf (SRS v1.0, 52 pages, 8 phases)*
*Date: 2026-07-12*
