# MASTERLY AIR ACADEMY — Development Plan 4.0

> **Reference:** `state.md` — Project State Report
> **Goal:** Fix every critical, significant, and moderate gap identified in the audit.

---

## Sprint 4.1 — Library Activation & Shared Directory

### 4.1.1 Wire Up lucide-react Icons

Replace all 30+ inline SVG paths with `lucide-react` icon components. Every page has hardcoded SVGs — replace them all.

**Files to edit:** Every page.tsx in the app.
**Pattern:** `import { Bell, Calendar, BookOpen, Plane, Users, MessageSquare, Settings, Shield, FileText } from "lucide-react"`

### 4.1.2 Wire Up Shared Types

Every page duplicates TypeScript interfaces inline. Import from `shared/types/` instead.

**Files to edit:** All 28 pages.
**Pattern:** `import { Student, Course, FlightLesson, Invoice } from "../../../shared/types"`

### 4.1.3 Wire Up clsx

Replace all conditional template literals with `clsx()`. Every page uses `${condition ? "class-a" : "class-b"}` patterns.

**Files to edit:** All 28 pages.

### 4.1.4 Wire Up Shared Colors

Import color tokens from `shared/colors.ts` instead of hardcoded hex values.

**Files to edit:** All 28 pages + tailwind.config.ts.

### 4.1.5 Delete Dead Dependencies

Remove these unused packages from `package.json`:
- `react-hook-form` (never imported)
- `@hookform/resolvers` (never imported)
- `next-intl` (never imported)
- `zustand` (never imported)
- `jspdf` (never imported)
- `qrcode.react` (never imported)

### 4.1.6 Verification

- [ ] `grep -r "lucide-react" web/app-single/app/` finds imports in every page
- [ ] `grep -r "shared/types" web/app-single/app/` finds imports
- [ ] No hardcoded hex colors in any page — all from `shared/colors.ts`
- [ ] `clsx()` used in place of template literals for all conditional classes
- [ ] package.json has only 12 dependencies (was 18)

---

## Sprint 4.2 — Shared Portal Layouts

### 4.2.1 Create Layout Components

Create one layout per portal. Each layout defines the sidebar + top bar + content area.

**Files to create:**
- `components/layout/student-layout.tsx`
- `components/layout/instructor-layout.tsx`
- `components/layout/finance-layout.tsx`
- `components/layout/quality-layout.tsx`
- `components/layout/director-layout.tsx`

### 4.2.2 Create Next.js Route Layouts

**Files to create:**
- `app/student/layout.tsx` — wraps `student-layout` around all `/student/*`
- `app/instructor/layout.tsx` — wraps `instructor-layout` around all `/instructor/*`
- `app/finance/layout.tsx` — wraps `finance-layout` around all `/finance/*`
- `app/quality/layout.tsx` — wraps `quality-layout` around all `/quality/*`
- `app/director/layout.tsx` — wraps `director-layout` around all `/director/*`

### 4.2.3 Strip Duplicate Nav Bars

Remove all inline `<nav>` elements from every page. Rely on the layout to provide the nav bar. Each page starts with `<main>` content only.

**Files to edit:** All 24 authenticated pages.

### 4.2.4 Wire Up AuthGuard

Replace all inline auth checks with `<AuthGuard>`. Every page currently does its own `useEffect` auth check.

**Pattern:**
```tsx
<AuthGuard allowedRoles={['student', 'candidate', 'graduate']} loginPath="/student/login">
  <StudentDashboard />
</AuthGuard>
```

### 4.2.5 Verification

- [ ] 5 portal layout.tsx files exist
- [ ] 5 components/layout/ files exist
- [ ] No page.tsx has its own `<nav>` element
- [ ] AuthGuard is imported by all authenticated pages
- [ ] No page has inline `useEffect(() => { ... router.push("/login") }, [])` auth check

---

## Sprint 4.3 — TanStack Query Full Migration

### 4.3.1 Migrate All Data Fetching

Replace every `useState + useEffect + fetch` pattern with `useQuery`.

**Pages to migrate (23 remaining):**
- Student: dashboard, courses, flights, exams, exams/[id], schedule, messages, certificates, profile
- Instructor: dashboard, courses, courses/[id]/attendance, students, flights, schedule, modules, messages
- Finance: dashboard, invoices, contracts
- Quality: dashboard

### 4.3.2 Add Mutation Hooks

Replace all `fetch(POST/PUT/DELETE)` with `useMutation` + `queryClient.invalidateQueries()`.

**Mutations to add:**
- Create/update course → invalidate `['courses']`
- Record attendance → invalidate `['course-attendance']`
- Schedule flight → invalidate `['flight-lessons']`
- Submit evaluation → invalidate `['flight-lessons']`
- Create invoice → invalidate `['invoices']`
- Record payment → invalidate `['invoices']`
- Send message → invalidate `['messages']`
- Submit exam → invalidate `['my-attempts']`
- Report safety event → invalidate `['safety-events']`

### 4.3.3 Wire Up API Client

Replace all raw `fetch()` with `api.get()` / `api.post()` from `lib/api.ts`. All 24 authenticated pages currently read tokens directly from `sessionStorage`.

**Pattern:**
```tsx
// BEFORE:
const token = JSON.parse(sessionStorage.getItem('maa_session') || '{}').token
fetch('/api/courses/', { headers: { Authorization: `Bearer ${token}` } })

// AFTER:
import { api } from '@/lib/api'
api.get('/api/courses/')
```

### 4.3.4 Verification

- [ ] All 24 authenticated pages use `useQuery` for GET requests
- [ ] All create/update/delete operations use `useMutation`
- [ ] All API calls go through `api.get()` / `api.post()` — zero raw `fetch()`
- [ ] No page directly reads `sessionStorage` for tokens
- [ ] Network tab shows cache hits on page navigation

---

## Sprint 4.4 — Form Validation & Accessibility

### 4.4.1 Create Zod Validators for Every Form

Expand `shared/validators/index.ts` with schemas matching every form in the app. Import these schemas from every form page.

**Schemas to add/review:**
- loginSchema, courseSchema, flightLessonSchema, invoiceSchema, paymentSchema, messageSchema, examSubmitSchema, safetyEventSchema, attendanceSchema, preparationSchema

### 4.4.2 Add Form Validation to All Forms

Replace manual `if (!field)` checks with Zod validation using the shared schemas.

**Files to edit:** All 12 forms across the app.

### 4.4.3 Verification

- [ ] Every form validates with Zod before API call
- [ ] All field-level error messages are from Zod
- [ ] No manual `if (!field) setMsg(...)` in any form

---

## Sprint 4.5 — i18n Activation

### 4.5.1 Activate next-intl

Install and configure next-intl with locale routing.

**Steps:**
1. Create `i18n/request.ts` with next-intl config
2. Create `middleware.ts` for locale detection
3. Move all 28 pages to `app/[locale]/` structure
4. Create `messages/en.json`, `messages/fr.json`, `messages/ar.json` (300+ keys each)

### 4.5.2 Replace Custom Hook with next-intl

Delete `lib/use-translation.ts`. Replace all `t.xxx` calls with `useTranslations()` from next-intl.

### 4.5.3 Activate Backend i18n

Add django-modeltranslation to INSTALLED_APPS. Configure MODELTRANSLATION_LANGUAGES. Create translation.py in ground_training and exams apps.

### 4.5.4 Verification

- [ ] URLs work with locale prefix: `/en/login`, `/fr/login`, `/ar/login`
- [ ] Every page title, label, and button is translated
- [ ] Arabic pages use RTL layout
- [ ] Backend API returns locale-aware fields

---

## Sprint 4.6 — Quality Portal Completion

### 4.6.1 Split Monolithic Page

Split `quality/dashboard/page.tsx` into 6 separate pages under the quality layout:
- `/quality/audits/page.tsx`
- `/quality/ncrs/page.tsx`
- `/quality/capas/page.tsx`
- `/quality/risks/page.tsx`
- `/quality/safety/page.tsx`
- `/quality/documents/page.tsx`

### 4.6.2 Risk Matrix Heatmap

Add a 5x5 probability × severity grid with color coding:
- Green (1-4), Yellow (5-9), Orange (10-15), Red (16-25)

### 4.6.3 Verification

- [ ] Each quality section has its own page with breadcrumb
- [ ] Quality sidebar highlights active page
- [ ] Risk matrix renders as a visual heatmap

---

## Sprint 4.7 — Remaining Pages & Fixes

### 4.7.1 Missing Pages

- `/student/medical` — medical certificate status with expiry counts
- `/finance/reports` — revenue charts + export buttons

### 4.7.2 Instructor Dashboard Chart

Add a BarChart for flight hours this month by student to the instructor dashboard.

### 4.7.3 PDF Download Buttons

Add download buttons:
- Student certificates page → download certificate PDF
- Finance invoices page → download invoice PDF

### 4.7.4 Fix Finance Dashboard

Remove duplicate chart placeholder divs from `finance/dashboard/page.tsx`.

### 4.7.5 Fix RBAC on 7 ViewSets

Add `HasRolePermission` + `required_permission` to:
- RoomViewSet, StudentProgressViewSet, InstructorAvailabilityViewSet, FlightLogViewSet, CertificateViewSet, SafetyEventViewSet, NotificationViewSet, MessageViewSet

### 4.7.6 Complete Celery Tasks

Add 4 missing tasks: weekly attendance report, monthly revenue report, certificate expiry check, aircraft maintenance warning.

### 4.7.7 Wire Search to Meilisearch

Update `search_view` in api_urls.py to use `search_meilisearch()` instead of ORM `__icontains`.

### 4.7.8 Verification

- [ ] `/student/medical` and `/finance/reports` return 200
- [ ] Instructor dashboard has a BarChart
- [ ] All 4 PDF download buttons work
- [ ] Finance dashboard has no duplicate elements
- [ ] All 8 ViewSets have HasRolePermission
- [ ] 6 Celery tasks run on schedule
- [ ] Search uses Meilisearch, not ORM

---

## Sprint 4.8 — Polish & Deployment

### 4.8.1 Remove Duplicate Inline Imports

Standardize all imports: lucide-react icons from a single icon barrel file, shared types from a single path.

### 4.8.2 Loading, Empty, Error States

Every page should show:
- A loading spinner while data fetches
- An empty state message when no data
- An error message + retry button on failure

### 4.8.3 Remove Duplicate Dev Docs from Repo

If `dev2.0-phases.md`, `dev3.0-phases.md`, `test.md`, `TESTING-MANUAL.md`, or `state.md` are in the repo, remove them.

### 4.8.4 Add Trunk-Based Test File

Create `backend/tests/test_core.py` with at least 5 test cases: login, RBAC, rate limiting, user creation, JWT refresh.

### 4.8.5 Verification

- [ ] All imports are clean — no duplicate paths
- [ ] Every page has loading, empty, and error states
- [ ] No internal docs in the repo
- [ ] `python manage.py test` passes 5+ tests

---

## MoSCoW Summary

| Priority | Sprints |
|----------|---------|
| **Must Have** | 4.1 (libraries), 4.2 (layouts), 4.3 (TanStack Query) |
| **Should Have** | 4.4 (forms), 4.5 (i18n), 4.6 (quality) |
| **Could Have** | 4.7 (missing pages, RBAC, celery), 4.8 (polish) |

## Estimated Effort

| Sprint | Days |
|--------|------|
| 4.1 Library Activation | 1.5 |
| 4.2 Shared Layouts | 2 |
| 4.3 TanStack Query | 2 |
| 4.4 Form Validation | 1 |
| 4.5 i18n Activation | 2 |
| 4.6 Quality Portal | 1.5 |
| 4.7 Remaining Fixes | 2 |
| 4.8 Polish | 1 |
| **TOTAL** | **~13 days** |

---

*Plan based on state.md audit — July 12, 2026*
*101 identified issues across 4 priority levels*
