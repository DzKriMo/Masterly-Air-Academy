# MASTERLY AIR ACADEMY — Development Plan 3.0

> **What this covers:** Everything missing, broken, or incomplete after Sprints 1-10 and Dev 2.0.
> **Reference:** `architecture.md`, `dev-plan.md`, `dev2.0-phases.md`
> **Codebase state:** 49 models, 30+ ViewSets, 25+ frontend pages, 8 Docker services

---

## Phase 3.1 — Dependency & Infrastructure Fixes

> **Goal:** Fix all missing packages so downstream features can actually work.

### 3.1.1 Backend: Missing Python Packages

`requirements.txt` is missing critical packages that the code already references:

| Package | Why It's Needed | Currently |
|---------|----------------|-----------|
| `WeasyPrint>=63.0,<64.0` | PDF generation in `exams/pdf.py`, `ground_training/pdf.py`, `quality_safety/pdf.py` | Not installed — PDFs return 501 |
| `boto3>=1.37,<1.38` | MinIO S3 uploads via `django-storages` | Not installed — file uploads crash |
| `meilisearch>=0.34,<0.35` | Full-text search (Meilisearch runs in Docker) | Not installed — search non-functional |

**File to edit:** `backend/requirements.txt`

```
WeasyPrint>=63.0,<64.0
boto3>=1.37,<1.38
meilisearch>=0.34,<0.35
```

### 3.1.2 Backend: Dockerfile WeasyPrint System Dependencies

WeasyPrint requires system-level C libraries. The Dockerfile must install them before `pip install`.

**File to edit:** `backend/Dockerfile`

Add after `apt-get install -y libpq-dev gcc`:

```dockerfile
RUN apt-get update && apt-get install -y \
    libpq-dev gcc \
    libpango-1.0-0 libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 libffi-dev \
    libcairo2 libgobject-2.0-0 \
    shared-mime-info fonts-noto-core
```

### 3.1.3 Frontend: Missing npm Packages

`package.json` is missing every library specified in `architecture.md` §2.2:

| Package | Why It's Needed | Currently |
|---------|----------------|-----------|
| `recharts` | Charts on all 5 dashboards | Not installed — dashboards are stat cards only |
| `@fullcalendar/core @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid` | Calendar views for schedules | Not installed — schedules are lists |
| `@tanstack/react-query` | Server state, caching, loading/error states | Not installed — manual fetch everywhere |
| `react-hook-form` | Form state management | Not installed — forms use raw useState |
| `next-intl` | i18n routing + locale management | Not installed — translations are inline |
| `zustand` | Client state (auth, UI) | Not installed — state is prop-drilled |
| `jspdf` | Client-side PDF generation | Not installed |
| `qrcode.react` | QR codes on certificates | Not installed |

**File to edit:** `web/app-single/package.json`

```bash
npm install recharts @fullcalendar/core @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @tanstack/react-query react-hook-form next-intl zustand jspdf qrcode.react
```

### 3.1.4 Activate Request Logging Middleware

`apps/core/middleware.py` defines `RequestLogMiddleware` but it is **not listed** in `MIDDLEWARE` in `settings.py`. It does nothing.

**File to edit:** `backend/config/settings.py`

Add to `MIDDLEWARE` list (after `'corsheaders.middleware.CorsMiddleware'`):

```python
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'apps.core.middleware.RequestLogMiddleware',   # <-- ADD THIS
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
```

### 3.1.5 Create `.env.example`

No `.env.example` exists. New developers and the deployment script have no reference for required variables.

**File to create:** `.env.example`

```
# Django
SECRET_KEY=change-me-in-production
DEBUG=false
DB_HOST=db
DB_PORT=5432
DB_NAME=masterly
DB_USER=masterly
DB_PASSWORD=change-me
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=change-me
CELERY_BROKER_URL=redis://:change-me@redis:6379/0

# MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=change-me
MINIO_BUCKET=masterly-documents

# Meilisearch
MEILI_HOST=http://meilisearch:7700
MEILI_KEY=change-me

# CORS
ALLOWED_HOSTS=localhost,127.0.0.1,api
CORS_ALLOWED_ORIGINS=http://localhost,http://127.0.0.1
```

### 3.1.6 Verification

- [ ] `pip install -r requirements.txt` installs WeasyPrint, boto3, meilisearch without errors
- [ ] `docker compose build api` succeeds with WeasyPrint system deps
- [ ] `npm install` installs Recharts, FullCalendar, TanStack Query, etc.
- [ ] `RequestLogMiddleware` appears in MIDDLEWARE and logs API requests
- [ ] `.env.example` exists at project root

---

## Phase 3.2 — Dashboard Charts & Calendar Views

> **Goal:** Every dashboard shows real charts. Schedule pages use FullCalendar.

### 3.2.1 Recharts Dashboards

Per `architecture.md` §9.2-9.6 and `dev2.0-phases.md` §2.1.2:

| Dashboard | Charts Required | Data Source |
|-----------|----------------|-------------|
| `/student/dashboard` | Flight hours over time (LineChart), Competency radar (RadarChart) | `/api/students/flight-log/`, `/api/competencies/` |
| `/instructor/dashboard` | Flight hours this month (BarChart), Student progress (LineChart) | `/api/flight-lessons/`, `/api/students/` |
| `/finance/dashboard` | Revenue over time (AreaChart), Invoice status distribution (PieChart) | `/api/invoices/` |
| `/director/dashboard` | Fleet utilization (BarChart), Enrollment trend (LineChart), Revenue vs cost (BarChart) | `/api/aircraft/`, `/api/students/`, `/api/invoices/` |
| `/quality/dashboard` | NCRs by severity (PieChart), Audit completion rate (gauge/donut) | `/api/non-conformities/`, `/api/audits/` |

**Files to edit:**
- `web/app-single/app/student/dashboard/page.tsx`
- `web/app-single/app/instructor/dashboard/page.tsx`
- `web/app-single/app/finance/dashboard/page.tsx`
- `web/app-single/app/director/dashboard/page.tsx`
- `web/app-single/app/quality/dashboard/page.tsx`

### 3.2.2 FullCalendar Integration

Per `dev2.0-phases.md` §2.1.4:

| Page | Calendar Features |
|------|-------------------|
| `/instructor/schedule` | FullCalendar with flight lessons (blue) + courses (gold) + exams (green). Click event → detail modal. |
| `/student/schedule` | Read-only FullCalendar. Same color coding. Shows own flights + courses. |

**Files to edit:**
- `web/app-single/app/instructor/schedule/page.tsx` — replace list with FullCalendar
- `web/app-single/app/student/schedule/page.tsx` — replace list with FullCalendar

**Color coding:**
- Flights: `#3b82f6` (blue)
- Courses: `#c4943c` (gold)
- Exams: `#22c55e` (green)

### 3.2.3 Verification

- [ ] Student dashboard renders flight hours line chart with real data
- [ ] Student dashboard renders competency radar chart
- [ ] Instructor dashboard renders flight hours bar chart
- [ ] Finance dashboard renders revenue area chart and invoice pie chart
- [ ] Director dashboard renders 3 charts with real data
- [ ] Quality dashboard renders NCR pie and audit gauge
- [ ] Instructor schedule shows FullCalendar with color-coded events
- [ ] Student schedule shows read-only FullCalendar
- [ ] Clicking a calendar event opens a detail modal

---

## Phase 3.3 — Internationalization (i18n) with next-intl

> **Goal:** Full 3-language support (EN/FR/AR) with locale routing, RTL, and model translations.

### 3.3.1 Install & Configure next-intl

Per `architecture.md` §10 and `dev-plan.md` §10.1:

- Install `next-intl`
- Create middleware for locale routing: `/en/...`, `/fr/...`, `/ar/...`
- Update `next.config.js` with `createNextIntlPlugin`
- Create `i18n/` directory with request config

**Locale routing:**
```
/en/student/dashboard
/fr/student/dashboard
/ar/student/dashboard
```

**Files to create/modify:**
- `web/app-single/middleware.ts` — locale detection + routing
- `web/app-single/i18n/request.ts` — next-intl request config
- `web/app-single/i18n/routing.ts` — locale definitions
- `web/app-single/next.config.js` — add next-intl plugin

### 3.3.2 Expand Translation Keys

Currently ~50 inline keys in `use-translation.ts`. Need 300+ keys covering every page.

**Translation categories needed:**
- Common (loading, error, save, cancel, delete, search, filter, export)
- Navigation (sidebar labels, breadcrumbs)
- Landing page (complete)
- Login (complete)
- Student portal (dashboard, courses, flights, exams, schedule, messages, medical, certificates)
- Instructor portal (dashboard, courses, students, flights, modules, schedule, messages)
- Finance portal (dashboard, invoices, contracts)
- Director portal (dashboard, reports)
- Quality portal (dashboard, audits, NCRs, CAPAs, risks, safety, documents)
- Exam interface (timer, questions, submit, results, anti-cheat)
- Forms (validation messages, success/error toasts)

**Files to create:**
- `shared/locales/en/common.json` (expand)
- `shared/locales/fr/common.json` (expand)
- `shared/locales/ar/common.json` (expand)

**Files to edit:** Every page.tsx and component.tsx — replace inline strings with `t('key')` calls.

### 3.3.3 RTL Support

Per `dev-plan.md` §10.2:

- Tailwind RTL via `tailwindcss-rtl` plugin or `[dir="rtl"]` CSS overrides
- Arabic font: Noto Sans Arabic (already imported in `globals.css`)
- Layout mirroring for RTL (sidebar, text alignment, margins)
- `globals.css` already has partial RTL rules — complete them

**Files to edit:**
- `web/app-single/app/globals.css` — expand RTL rules
- `web/app-single/tailwind.config.ts` — add RTL plugin if needed

### 3.3.4 Model Translation (django-modeltranslation)

Per `dev-plan.md` §10.1:

- Install `django-modeltranslation` (already in architecture.md §2.1 but NOT in requirements.txt)
- Register translatable models: Subject (title, description), Exam (title), Module (title, description)
- Add to `INSTALLED_APPS`
- Run `makemigrations` to add `_fr`, `_ar` columns
- Update serializers to return locale-aware fields

**Files to edit:**
- `backend/requirements.txt` — add `django-modeltranslation>=0.19,<0.20`
- `backend/config/settings.py` — add to INSTALLED_APPS, add `MODELTRANSLATION_DEFAULT_LANGUAGE`
- `backend/apps/ground_training/translation.py` — register Subject, Module
- `backend/apps/exams/translation.py` — register Exam
- All affected serializers — return translation based on Accept-Language header

### 3.3.5 Delete Inline Translation Hook

After next-intl is wired up, remove `lib/use-translation.ts` entirely. It duplicates what next-intl does better.

**File to delete:** `web/app-single/lib/use-translation.ts`

### 3.3.6 Verification

- [ ] URL `/en/student/dashboard` loads English student dashboard
- [ ] URL `/fr/student/dashboard` loads French student dashboard
- [ ] URL `/ar/student/dashboard` loads Arabic student dashboard with RTL layout
- [ ] Language switcher changes locale and preserves current page
- [ ] All page labels appear in selected language
- [ ] Arabic layout is fully mirrored (sidebar, text, navigation)
- [ ] Subject titles in API response include `_fr` and `_ar` fields
- [ ] Login page fully translated in all 3 languages

---

## Phase 3.4 — Form Validation with Zod + react-hook-form

> **Goal:** Every form validates before submission. Field-level error messages.

### 3.4.1 Expand Zod Schemas

`shared/validators/index.ts` currently has 3 schemas. Need schemas for every form in the app.

**Schemas to add:**

| Schema | Fields | Used By |
|--------|--------|---------|
| `courseSchema` | subject, title, date, start_time, end_time, room | Instructor course creation |
| `flightLessonSchema` | student, aircraft, date, start_time, end_time | Instructor flight scheduling |
| `flightEvalSchema` | grade, result, exercises, competencies, observations | Post-flight evaluation |
| `invoiceSchema` | student, type, amount, description, due_at | Finance invoice creation |
| `paymentSchema` | amount | Payment recording |
| `messageSchema` | receiver, subject, body | Message compose |
| `examSubmitSchema` | answers (array) | Exam submission |
| `safetyEventSchema` | title, type, description, confidential | Safety event report |
| `attendanceSchema` | records (array of student+status) | Bulk attendance |
| `preparationSchema` | weather, notam, performance, document, medical | Pre-flight checklist |

**File to edit:** `shared/validators/index.ts`

### 3.4.2 Integrate react-hook-form + Zod in All Forms

Replace raw `useState` form handling with `react-hook-form` + `zodResolver`.

**Pages with forms to update:**
- `app/(auth)/login/page.tsx` — loginSchema
- `app/instructor/courses/page.tsx` — courseSchema
- `app/instructor/flights/page.tsx` — flightLessonSchema
- `app/instructor/flights/[id]/evaluate/page.tsx` — flightEvalSchema
- `app/instructor/flights/[id]/prep/page.tsx` — preparationSchema
- `app/instructor/courses/[id]/attendance/page.tsx` — attendanceSchema
- `app/instructor/messages/page.tsx` — messageSchema
- `app/finance/invoices/page.tsx` — invoiceSchema + paymentSchema
- `app/student/exams/[id]/page.tsx` — examSubmitSchema
- `app/quality/dashboard/page.tsx` — safetyEventSchema

### 3.4.3 Verification

- [ ] Submit login form with empty email → Zod error "Email is required"
- [ ] Submit course form with past date → Zod error
- [ ] Submit invoice with negative amount → Zod error
- [ ] All forms show field-level red error messages
- [ ] Forms cannot submit with invalid data
- [ ] Password confirmation mismatch shows error

---

## Phase 3.5 — TanStack Query Migration

> **Goal:** Replace all manual `fetch()` + `useState` with `useQuery` / `useMutation`. Add loading spinners, error states, cache invalidation.

### 3.5.1 Set Up QueryClient Provider

**File to edit:** `web/app-single/components/providers.tsx`

Wrap app in `QueryClientProvider` from `@tanstack/react-query`.

### 3.5.2 Migrate All Data Fetching

Every page currently does:
```tsx
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)
useEffect(() => { fetch(...) }, [])
```

Replace with:
```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['courses'],
  queryFn: () => api.get('/api/courses/'),
})
```

**Pages to migrate (25+ pages):**

| Page | Query Key | API Endpoint |
|------|-----------|-------------|
| `student/dashboard` | `['student-progress']`, `['flight-log']`, `['my-attempts']` | 3 endpoints |
| `student/courses` | `['courses']` | `/api/courses/` |
| `student/flights` | `['flight-log']` | `/api/students/flight-log/` |
| `student/exams` | `['exams']`, `['my-attempts']` | 2 endpoints |
| `student/schedule` | `['flight-lessons']`, `['courses']` | 2 endpoints |
| `student/messages` | `['messages']` | `/api/messages/` |
| `instructor/dashboard` | `['courses']` | `/api/courses/` |
| `instructor/courses` | `['courses']`, `['subjects']`, `['rooms']` | 3 endpoints |
| `instructor/courses/[id]/attendance` | `['course-students']` | `/api/courses/{id}/students/` |
| `instructor/students` | `['students']` | `/api/students/` |
| `instructor/flights` | `['flight-lessons']`, `['aircraft']` | 2 endpoints |
| `instructor/modules` | `['subjects']`, `['modules']` | 2 endpoints |
| `instructor/messages` | `['messages']`, `['sent']` | 2 endpoints |
| `finance/dashboard` | `['invoices']` | `/api/invoices/` |
| `finance/invoices` | `['invoices']`, `['students']` | 2 endpoints |
| `director/dashboard` | `['students']`, `['invoices']`, `['courses']`, `['aircraft']`, `['flights']`, `['audits']` | 6 endpoints |
| `quality/dashboard` | `['audits']`, `['ncrs']`, `['capas']`, `['safety-events']` | 4 endpoints |

### 3.5.3 Add Mutation Hooks with Cache Invalidation

For all create/update/delete operations, use `useMutation` with `queryClient.invalidateQueries()`.

**Mutations to implement:**
- Create course → invalidate `['courses']`
- Record attendance → invalidate `['course-students']`
- Schedule flight → invalidate `['flight-lessons']`
- Submit evaluation → invalidate `['flight-lessons']`
- Create invoice → invalidate `['invoices']`
- Record payment → invalidate `['invoices']`
- Send message → invalidate `['messages']`, `['sent']`
- Submit exam → invalidate `['my-attempts']`
- Report safety event → invalidate `['safety-events']`

### 3.5.4 Add Loading & Error States

Every page should show:
- Loading spinner (gold pulse animation from `globals.css`) while data fetches
- Error message with retry button if request fails
- Empty state message if no data

### 3.5.5 Verification

- [ ] Navigate between pages → no full refetch (cache hit)
- [ ] Create a course → course list updates immediately
- [ ] Record attendance → page refreshes with new data
- [ ] Loading spinner shows on every page while data loads
- [ ] Error state shows if API is unreachable
- [ ] Network tab shows fewer redundant requests

---

## Phase 3.6 — Missing API Endpoints & Models

> **Goal:** All endpoints referenced in the architecture exist and work.

### 3.6.1 Contract ViewSet + Serializer

The `Contract` model exists in `administration/models.py` but has no API.

**Files to create:**
- `backend/apps/administration/serializers.py` — add `ContractSerializer`
- `backend/apps/administration/views.py` — add `ContractViewSet`

**Files to edit:**
- `backend/config/api_urls.py` — register `router.register(r'contracts', ContractViewSet)`

**Endpoints:**
```
GET    /api/contracts/          — list all contracts (filtered by role)
POST   /api/contracts/          — create contract
GET    /api/contracts/{id}/     — retrieve contract
PUT    /api/contracts/{id}/     — update contract
DELETE /api/contracts/{id}/     — delete contract
```

### 3.6.2 QualityDocument ViewSet + Serializer

The `QualityDocument` model exists in `quality_safety/models.py` but has no API.

**Files to create:**
- `backend/apps/quality_safety/serializers.py` — add `QualityDocumentSerializer`
- `backend/apps/quality_safety/views.py` — add `QualityDocumentViewSet`

**Files to edit:**
- `backend/config/api_urls.py` — register `router.register(r'quality-documents', QualityDocumentViewSet)`

### 3.6.3 MaintenanceRecord ViewSet + Serializer

The `MaintenanceRecord` model exists in `flight_training/models.py` but has no API.

**Files to create:**
- `backend/apps/flight_training/serializers.py` — add `MaintenanceRecordSerializer`
- `backend/apps/flight_training/views.py` — add `MaintenanceRecordViewSet`

**Files to edit:**
- `backend/config/api_urls.py` — register `router.register(r'maintenance-records', MaintenanceRecordViewSet)`

### 3.6.4 Dashboard Aggregation Endpoint

Director needs a single endpoint that returns all KPI data in one call.

**Files to create:**
- `backend/apps/core/views.py` — add `DashboardViewSet`

**Endpoint:**
```
GET /api/dashboard/  → returns {
  total_students, active_courses, total_flight_hours,
  revenue_collected, outstanding_balance, completed_flights,
  planned_audits, open_ncrs
}
```

### 3.6.5 Meilisearch Search Endpoint

**Files to create:**
- `backend/apps/core/search.py` — Meilisearch client setup + index management
- `backend/apps/core/views.py` — add `SearchView`

**Endpoint:**
```
GET /api/search/?q=ahmed  → returns results from indexed models
```

**Models to index:** Student, Course, Aircraft, Exam, Invoice

### 3.6.6 Verification

- [ ] `GET /api/contracts/` returns paginated list
- [ ] `POST /api/contracts/` creates a contract
- [ ] `GET /api/quality-documents/` returns paginated list
- [ ] `GET /api/maintenance-records/` returns paginated list
- [ ] `GET /api/dashboard/` returns aggregated KPI data
- [ ] `GET /api/search/?q=ahmed` returns search results from Meilisearch
- [ ] All new endpoints have correct RBAC permissions

---

## Phase 3.7 — Complete Quality Portal

> **Goal:** Full quality management UI — audits, NCRs, CAPAs, risk matrix, safety events, documents.

### 3.7.1 Quality Portal Layout + Navigation

**File to create:** `web/app-single/app/quality/layout.tsx`

Shared sidebar for quality portal with links:
- Dashboard
- Audits
- Non-Conformities (NCRs)
- CAPAs
- Risk Assessments
- Safety Events
- Quality Documents

### 3.7.2 Audits Page

**File to create:** `web/app-single/app/quality/audits/page.tsx`

- List all audits with status filter (planned, in_progress, completed)
- Create audit form (title, type, scope, scheduled_date, lead_auditor, checklist_items)
- Audit detail view with findings and NCR list
- "Complete Audit" action button
- PDF download button (`GET /api/audits/{id}/pdf/`)

### 3.7.3 NCRs Page

**File to create:** `web/app-single/app/quality/ncrs/page.tsx`

- List all NCRs with severity filter (critical, major, minor)
- Create NCR form (title, description, severity, audit FK, responsible, due_date)
- NCR detail with root cause analysis field
- "Close NCR" action button

### 3.7.4 CAPAs Page

**File to create:** `web/app-single/app/quality/capas/page.tsx`

- List all CAPAs with status and type filter
- Create CAPA form (type, title, description, ncr FK, responsible, due_date)
- CAPA detail with validation date and closing notes
- "Close CAPA" action button

### 3.7.5 Risk Assessments Page

**File to create:** `web/app-single/app/quality/risks/page.tsx`

- Risk matrix heatmap (probability × severity, 5×5 grid)
  - Green (1-4): Low
  - Yellow (5-9): Medium
  - Orange (10-15): High
  - Red (16-25): Critical
- List of all risk assessments with filter by status
- Create risk assessment form (hazard, description, probability, severity, mitigation, responsible)

### 3.7.6 Safety Events Page

**File to create:** `web/app-single/app/quality/safety/page.tsx`

- List all safety events with type filter (incident, near_miss, hazard, observation)
- Create safety event form (title, type, description, confidential checkbox)
- Safety event detail with analysis field
- Confidential events hidden from non-safety-manager roles

### 3.7.7 Quality Documents Page

**File to create:** `web/app-single/app/quality/documents/page.tsx`

- List all quality documents with status filter (draft, approved, archived, expired)
- Document detail with version history
- Create quality document form (number, title, type, version, author, approver)

### 3.7.8 Verification

- [ ] Quality sidebar appears on all `/quality/*` pages
- [ ] Can create, view, complete an audit
- [ ] Can create NCR from audit finding
- [ ] Can create CAPA from NCR
- [ ] Risk matrix renders as 5×5 heatmap with color coding
- [ ] Can report safety event (anonymous option works)
- [ ] Quality documents list shows version history
- [ ] PDF download works for audit reports

---

## Phase 3.8 — Complete Student Portal

> **Goal:** Students can view medical certificates, download certificates, manage profile.

### 3.8.1 Medical Certificates Page

**File to create:** `web/app-single/app/student/medical/page.tsx`

- Fetch from `/api/students/{id}/medical-certificates/` (need new endpoint or embed in student serializer)
- Show status (valid/expiring/expired) with color coding
- Expiry countdown (days remaining)
- Upload new medical certificate (if allowed)

**Backend addition needed:**
- Add `medical_certificates` nested field to `StudentSerializer` or create `MedicalCertificateViewSet`

### 3.8.2 Certificates Page

**File to create:** `web/app-single/app/student/certificates/page.tsx`

- Fetch from `/api/certificates/` (already exists)
- List all earned certificates with type, program, issue date, expiry date
- PDF download button for each certificate (`/api/certificates/{id}/pdf/` — need endpoint)
- QR code display using `qrcode.react`

**Backend addition needed:**
- Add PDF generation endpoint for individual certificates

### 3.8.3 Profile Page

**File to create:** `web/app-single/app/student/profile/page.tsx`

- Display student info from `/api/me/` + `/api/students/`
- Editable fields: phone, address, nationality
- Photo upload
- Password change form (using `updatePasswordSchema` from validators)

### 3.8.4 Student Portal Layout

**File to create:** `web/app-single/app/student/layout.tsx`

Shared sidebar for student portal:
- Dashboard
- My Courses
- Flight Log
- Schedule
- Exams
- Certificates
- Medical
- Messages
- Profile

### 3.8.5 Verification

- [ ] Student can view medical certificate status with expiry countdown
- [ ] Student can view and download certificates
- [ ] Student can edit profile (phone, address)
- [ ] Student can change password
- [ ] Student sidebar shows all portal sections

---

## Phase 3.9 — Complete Instructor Portal

> **Goal:** Instructor schedule uses FullCalendar. Module management is complete.

### 3.9.1 Instructor Schedule with FullCalendar

**File to edit:** `web/app-single/app/instructor/schedule/page.tsx`

Replace current list view with FullCalendar:
- Fetch flight lessons + courses
- Color code: flights=blue, courses=gold
- Click event → modal with details
- Week view as default, with day/month toggle

### 3.9.2 Instructor Portal Layout

**File to create:** `web/app-single/app/instructor/layout.tsx`

Shared sidebar for instructor portal:
- Dashboard
- My Courses
- My Students
- Flight Schedule
- Modules
- Calendar
- Messages

### 3.9.3 Verification

- [ ] Instructor schedule shows FullCalendar with color-coded events
- [ ] Clicking event opens detail modal
- [ ] Instructor sidebar shows all portal sections

---

## Phase 3.10 — Complete Finance Portal

> **Goal:** Contracts page, PDF invoice download, financial reports.

### 3.10.1 Contracts Page

**File to create:** `web/app-single/app/finance/contracts/page.tsx`

- List all contracts with status filter
- Create contract form (student, type, start_date, end_date)
- Contract detail with file upload

### 3.10.2 Invoice PDF Download

**File to edit:** `web/app-single/app/finance/invoices/page.tsx`

Add download button per invoice → `GET /api/invoices/{id}/pdf/`

**Backend:** Verify `generate_invoice_pdf` in `administration/pdf.py` (may need to move from `exams/pdf.py`) and wire up endpoint.

### 3.10.3 Financial Reports Page

**File to create:** `web/app-single/app/finance/reports/page.tsx`

- Revenue by month (Recharts AreaChart)
- Invoice status breakdown (PieChart)
- Outstanding balances per student (BarChart)
- Excel export buttons (already have `/api/export/invoices/`)

### 3.10.4 Finance Portal Layout

**File to create:** `web/app-single/app/finance/layout.tsx`

Shared sidebar:
- Dashboard
- Invoices
- Contracts
- Reports

### 3.10.5 Verification

- [ ] Can create and view contracts
- [ ] Invoice PDF downloads with correct data
- [ ] Financial reports page shows 3 charts
- [ ] Excel export downloads .xlsx file

---

## Phase 3.11 — PDF Generation & Download

> **Goal:** All PDF endpoints work and have frontend download buttons.

### 3.11.1 Verify PDF Endpoints Exist

Currently these PDF views exist but may not be properly routed:

| Endpoint | File | Status |
|----------|------|--------|
| `GET /api/attendance/{course_id}/pdf/` | `ground_training/views.py` | Exists |
| `GET /api/audits/{audit_id}/pdf/` | `quality_safety/views.py` | Exists |
| Certificate PDF | `exams/pdf.py` | Code exists, no endpoint |
| Invoice PDF | `exams/pdf.py` | Code exists, no endpoint |

**Files to edit:**
- `backend/config/api_urls.py` — add certificate and invoice PDF paths if missing
- `backend/apps/exams/views.py` — add `certificate_pdf` endpoint
- `backend/apps/administration/views.py` — add `invoice_pdf` endpoint

### 3.11.2 Frontend Download Buttons

**Files to add download buttons:**
- `app/student/certificates/page.tsx` — download certificate PDF
- `app/finance/invoices/page.tsx` — download invoice PDF
- `app/instructor/courses/[id]/attendance/page.tsx` — download attendance PDF
- `app/quality/audits/page.tsx` — download audit report PDF

### 3.11.3 Verification

- [ ] Certificate PDF downloads with correct branding, student name, QR code
- [ ] Invoice PDF shows amounts, payment history, balance
- [ ] Attendance PDF shows student list with status
- [ ] Audit PDF shows findings and NCR listing

---

## Phase 3.12 — Celery Beat Scheduled Tasks

> **Goal:** All background automation tasks run on schedule.

### 3.12.1 Verify Existing Tasks

| Task | Schedule | Status |
|------|----------|--------|
| `check_overdue_invoices` | Daily | ✅ Exists in `administration/tasks.py` |
| `check_expiring_medicals` | Daily | ✅ Exists in `students/tasks.py` |

### 3.12.2 Add Missing Tasks

Per `dev2.0-phases.md` §2.5.1:

| Task | Schedule | Description |
|------|----------|-------------|
| `generate_weekly_attendance_report` | Weekly (Monday 8am) | Aggregate attendance rates, create notification |
| `generate_monthly_revenue_report` | Monthly (1st 8am) | Sum payments, calculate revenue, create notification |
| `check_expiring_certificates` | Weekly | Certificate expiry warnings |
| `check_aircraft_maintenance` | Weekly | Aircraft maintenance due warnings |

**Files to edit:**
- `backend/apps/ground_training/tasks.py` — create with weekly attendance report
- `backend/apps/administration/tasks.py` — add monthly revenue report
- `backend/apps/exams/tasks.py` — create with certificate expiry check
- `backend/apps/flight_training/tasks.py` — create with maintenance check

### 3.12.3 Verification

- [ ] Celery Beat schedule visible in Django Admin
- [ ] Overdue invoice check runs daily
- [ ] Expiring medical check runs daily
- [ ] Weekly attendance report generates
- [ ] Monthly revenue report generates
- [ ] Aircraft maintenance warnings trigger

---

## Phase 3.13 — Shared Portal Layouts & Navigation

> **Goal:** No more duplicated nav bars. Each portal has a shared layout component.

### 3.13.1 Create Portal Layout Components

Every page currently implements its own nav bar. Create shared layouts:

**Files to create:**
- `web/app-single/components/layout/student-layout.tsx` — sidebar + topbar for student portal
- `web/app-single/components/layout/instructor-layout.tsx` — sidebar + topbar for instructor portal
- `web/app-single/components/layout/finance-layout.tsx` — sidebar + topbar for finance portal
- `web/app-single/components/layout/quality-layout.tsx` — sidebar + topbar for quality portal
- `web/app-single/components/layout/director-layout.tsx` — sidebar + topbar for director portal

**Each layout includes:**
- Collapsible sidebar with navigation links
- Top bar with user info, notification bell, language switcher
- Mobile responsive hamburger menu
- Active page highlighting
- Logout button

### 3.13.2 Create Next.js Route Layouts

**Files to create:**
- `web/app-single/app/student/layout.tsx` — wraps all `/student/*` pages
- `web/app-single/app/instructor/layout.tsx` — wraps all `/instructor/*` pages
- `web/app-single/app/finance/layout.tsx` — wraps all `/finance/*` pages
- `web/app-single/app/quality/layout.tsx` — wraps all `/quality/*` pages
- `web/app-single/app/director/layout.tsx` — wraps all `/director/*` pages

### 3.13.3 Remove Duplicate Nav Bars

**Files to edit:** Every page.tsx in every portal — remove inline nav bar code, rely on layout.

### 3.13.4 Verification

- [ ] Each portal has a consistent sidebar navigation
- [ ] Sidebar is collapsible on mobile
- [ ] Active page is highlighted in sidebar
- [ ] No duplicate nav bar code in individual pages
- [ ] Notification bell appears in top bar of all portals

---

## Phase 3.14 — Security Hardening

> **Goal:** All endpoints properly secured. No open CORS. Audit log coverage complete.

### 3.14.1 Permission Audit

Per `dev2.0-phases.md` §2.5.3:

Review every ViewSet and verify:
- `permission_classes` includes `HasRolePermission`
- `required_permission` is set correctly
- `get_queryset()` scopes data by role (students see own, instructors see own courses)
- System admins bypass all checks

**Files to audit:**
- Every `views.py` in every app

### 3.14.2 CORS Configuration

Verify `CORS_ALLOWED_ORIGINS` is not set to `*` in any environment.

**File to check:** `backend/config/settings.py`

### 3.14.3 File Upload Validation

Verify all file upload endpoints validate:
- MIME type (allow only: pdf, jpg, png, doc, docx, xlsx)
- File size (max 10MB)
- Filename sanitization

**Files to check:**
- `administration/views.py` — DocumentViewSet upload
- `ground_training/views.py` — ModuleViewSet upload_document
- `flight_training/views.py` — any file uploads

### 3.14.4 Rate Limiting

Verify rate limiting is active on:
- Login: 5 attempts/min ✅ (already in place)
- API general: 100 req/min/user ✅ (already in settings)
- File uploads: 10 req/min/user ❌ (not configured)

### 3.14.5 Audit Log Coverage

Verify all model mutations are logged by the `post_save`/`post_delete` signals. Check:
- Are any models excluded from signals?
- Are login/logout events logged?
- Are PDF downloads logged?
- Are file uploads logged?

### 3.14.6 Security Headers

Verify Nginx sends all required headers (already in `nginx.conf`):
- ✅ X-Frame-Options: SAMEORIGIN
- ✅ X-Content-Type-Options: nosniff
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Referrer-Policy: strict-origin-when-cross-origin
- ✅ Content-Security-Policy
- ✅ Permissions-Policy
- ✅ server_tokens off
- ❌ Missing: Strict-Transport-Security (HSTS) — add for production

### 3.14.7 Verification

- [ ] Every ViewSet has `permission_classes = [IsAuthenticated, HasRolePermission]`
- [ ] Students can only see their own data
- [ ] Instructors can only see their own courses/flights
- [ ] CORS is not open to `*`
- [ ] File uploads validate type and size
- [ ] Rate limiting blocks brute force
- [ ] All model mutations appear in audit log
- [ ] All security headers present in Nginx

---

## Phase 3.15 — Meilisearch Integration

> **Goal:** Full-text search across students, courses, aircraft, exams, invoices.

### 3.15.1 Backend Search Setup

**Files to create:**
- `backend/apps/core/search.py`:
  ```python
  import meilisearch
  client = meilisearch.Client(settings.MEILI_HOST, settings.MEILI_KEY)
  
  INDEXES = {
      'students': {'primaryKey': 'id', 'searchableAttributes': ['first_name', 'last_name', 'student_number']},
      'courses': {'primaryKey': 'id', 'searchableAttributes': ['title', 'subject_code']},
      'aircraft': {'primaryKey': 'id', 'searchableAttributes': ['registration', 'model']},
      'exams': {'primaryKey': 'id', 'searchableAttributes': ['code', 'title']},
      'invoices': {'primaryKey': 'id', 'searchableAttributes': ['invoice_number', 'student_name']},
  }
  
  def index_all(): ...
  def search(query, index=None): ...
  ```

### 3.15.2 Search API Endpoint

**File to edit:** `backend/apps/core/views.py`

```python
class SearchView(APIView):
    def get(self, request):
        q = request.query_params.get('q', '')
        index = request.query_params.get('index', None)
        results = search(q, index)
        return Response({'success': True, 'data': results})
```

**File to edit:** `backend/config/urls.py` — add `path('api/search/', SearchView.as_view())`

### 3.15.3 Celery Task: Re-index on Data Change

Add a Celery task that re-indexes models when they're saved. Or use Django signals to update Meilisearch index on post_save.

### 3.15.4 Frontend Search Bar

**File to create:** `web/app-single/components/search-bar.tsx`

- Global search input in the top bar of all portals
- Debounced search (300ms)
- Dropdown showing results grouped by type (students, courses, etc.)
- Click result → navigate to relevant page

### 3.15.5 Verification

- [ ] `GET /api/search/?q=ahmed` returns student results
- [ ] Search index updates when new student is created
- [ ] Search bar appears in portal top bars
- [ ] Search results are clickable and navigate to correct pages

---

## Phase 3.16 — Deployment & Backup Scripts

> **Goal:** Production-ready deployment and backup automation.

### 3.16.1 Review deploy.sh

**File to review:** `deploy.sh`

Should perform:
1. `git pull` latest code
2. `docker compose build` all services
3. `docker compose up -d`
4. Wait for health checks
5. Run migrations
6. Collect static files
7. Restart services

### 3.16.2 Review backup.sh

**File to review:** `backup.sh`

Should perform:
1. `pg_dump` PostgreSQL database
2. Tar MinIO data directory
3. Tar Redis data (if persistent)
4. Compress all backups
5. Delete backups older than 30 days
6. Store in `/backups/` with date-stamped filenames

### 3.16.3 SSL/TLS for Nginx

Per `architecture.md` §8, production needs SSL:

**File to edit:** `nginx/nginx.conf`

Add self-signed SSL or internal CA:
```nginx
server {
    listen 443 ssl;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    # ... rest of config
}

server {
    listen 80;
    return 301 https://$host$request_uri;
}
```

### 3.16.4 Verification

- [ ] `deploy.sh` runs without errors
- [ ] `backup.sh` creates valid PostgreSQL dump
- [ ] `backup.sh` creates valid MinIO tar
- [ ] Backups older than 30 days are deleted
- [ ] Nginx serves over HTTPS with TLS 1.3
- [ ] HTTP redirects to HTTPS

---

## MoSCoW Summary

| Priority | Features | Sprint |
|----------|----------|--------|
| **Must Have** | Fix requirements.txt, install frontend deps, activate middleware, .env.example | 3.1 |
| **Must Have** | Dashboard charts (Recharts), FullCalendar, TanStack Query | 3.2, 3.5 |
| **Must Have** | Missing API endpoints (Contract, QualityDocument, Maintenance, Dashboard, Search) | 3.6 |
| **Must Have** | Quality portal completion, Student portal completion | 3.7, 3.8 |
| **Must Have** | Security hardening (permissions, CORS, file validation) | 3.14 |
| **Should Have** | i18n with next-intl + locale routing + RTL | 3.3 |
| **Should Have** | Zod validation + react-hook-form in all forms | 3.4 |
| **Should Have** | Shared portal layouts (remove duplicate nav bars) | 3.13 |
| **Should Have** | PDF download buttons, Celery Beat tasks | 3.11, 3.12 |
| **Should Have** | Meilisearch integration | 3.15 |
| **Could Have** | SSL/TLS for Nginx | 3.16 |
| **Could Have** | Deploy/backup scripts review | 3.16 |

---

## Estimated Timeline

| Phase | Effort | Days |
|-------|--------|------|
| 3.1 — Dependencies & Infrastructure | Quick fixes | 0.5 |
| 3.2 — Dashboard Charts & Calendar | Medium | 2 |
| 3.3 — i18n with next-intl | Large | 3 |
| 3.4 — Zod + react-hook-form | Medium | 1.5 |
| 3.5 — TanStack Query Migration | Large | 2 |
| 3.6 — Missing API Endpoints | Medium | 1.5 |
| 3.7 — Quality Portal | Large | 2 |
| 3.8 — Student Portal | Medium | 1.5 |
| 3.9 — Instructor Portal | Small | 1 |
| 3.10 — Finance Portal | Medium | 1.5 |
| 3.11 — PDF Generation | Small | 1 |
| 3.12 — Celery Beat Tasks | Small | 0.5 |
| 3.13 — Shared Layouts | Medium | 1.5 |
| 3.14 — Security Hardening | Medium | 1 |
| 3.15 — Meilisearch | Medium | 1 |
| 3.16 — Deployment Scripts | Small | 1 |
| **TOTAL** | | **~20 days** |

---

*Plan generated from gap analysis of architecture.md + dev-plan.md + dev2.0-phases.md vs actual codebase*
*Tech stack: Django 5.1 + DRF + Next.js 15 + PostgreSQL 17 + Redis 8*
*Deployment: 100% on-premise — all data stays on school server*
*i18n: English + French + Arabic (RTL) — full coverage required*
*Auth: Unified — Django Admin and REST API share the same user database*
