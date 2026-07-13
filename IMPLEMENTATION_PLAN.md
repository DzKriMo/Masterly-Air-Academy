# MASTERLY AIR ACADEMY — Ultimate Remediation Plan

> **Generated:** July 12, 2026
> **Based on:** `state.md` comprehensive audit (3 parallel agents + manual review)
> **Goal:** Production-grade ATO platform satisfying all 8 PDF phases + architecture.md
> **Total estimated effort:** ~12–16 weeks (single developer) or ~6–8 weeks (2–3 developers)

---

## Plan Overview — 10 Phases

```
Phase 0:  Critical Fixes           (1–2 days)    🔴 Stop the bleeding
Phase 1:  Foundation Hardening      (1 week)      🟡 Make it reliable
Phase 2:  API Completion            (2 weeks)     🟡 Fill backend gaps
Phase 3:  Frontend Core UX          (2–3 weeks)   🟡 CRUD, filters, pagination everywhere
Phase 4:  Portal Deep-Dive          (2–3 weeks)   🟢 Feature depth per portal
Phase 5:  Missing Libraries         (1 week)      🟢 Align with arch.md
Phase 6:  i18n Complete             (1–2 weeks)   🟢 Full EN/FR/AR
Phase 7:  Security Hardening        (1 week)      🔵 Lock it down
Phase 8:  Testing & Quality         (1–2 weeks)   🔵 Zero → covered
Phase 9:  DevOps & Production       (1 week)      🔵 Go-live ready
```

---

## Phase 0 — Critical Fixes (1–2 days)

> **Goal:** Stop crashes. Fix bugs. Unblock all portals.

### 0.1 Fix `Student.main_instructor` FK Bug 🐛
- **File:** `backend/apps/students/models.py` line 28
- **Change:** `ForeignKey('self', ...)` → `ForeignKey('FlightInstructor', ...)`
- **Migration:** `python manage.py makemigrations && python manage.py migrate`
- **Verify:** `main_instructor` field accepts FlightInstructor instances
- **Risk:** Existing data may have self-references → write data migration to nullify broken FKs

### 0.2 Add `/health/` Django Endpoint 🐛
- **File:** `backend/config/urls.py`
- **Add:**
  ```python
  path('health/', lambda request: JsonResponse({'status': 'ok'})),
  ```
- **Verify:** `curl http://localhost:8000/health/` returns 200 + `{"status":"ok"}`
- **Docker:** Healthcheck in docker-compose.yml line 18 now works

### 0.3 Add Error Boundaries to ALL Portals
- **New file:** `web/app-single/components/error-boundary.tsx`
  ```tsx
  'use client';
  import { Component, ReactNode } from 'react';
  
  interface Props { children: ReactNode; fallback?: ReactNode; }
  interface State { hasError: boolean; error: Error | null; }
  
  export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null };
    static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
    componentDidCatch(error: Error, info: any) { console.error('Portal error:', error, info); }
    render() {
      if (this.state.hasError) {
        return this.props.fallback || (
          <div className="min-h-screen bg-navy-900 flex items-center justify-center">
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-8 max-w-md text-center">
              <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
              <p className="text-gray-400 text-sm mb-4">{this.state.error?.message}</p>
              <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
                className="px-4 py-2 bg-gold-500 text-navy-900 rounded-lg font-semibold text-sm">
                Reload Page
              </button>
            </div>
          </div>
        );
      }
      return this.props.children;
    }
  }
  ```
- **Wrap in EVERY portal layout:**
  - `app/student/layout.tsx`
  - `app/instructor/layout.tsx`
  - `app/quality/layout.tsx`
  - `app/finance/layout.tsx`
  - `app/director/layout.tsx`
  - `app/layout.tsx` (root)

### 0.4 Fix ALL 27 Remaining Raw-Fetch Pages
- **Pattern to replace in every file:**
  ```tsx
  // ❌ OLD
  const session = JSON.parse(sessionStorage.getItem("maa_session") || "{}");
  fetch("/api/...", { headers: { Authorization: `Bearer ${session.token}` } })
    .then(r => r.json()).then(setData);

  // ✅ NEW
  import { api } from "@/lib/api";
  api.get<T>("/...").then(data => setData(data as unknown as T)).catch(err => { console.error(err); setError("Failed to load."); });
  ```
- **Files to fix (27 pages):**
  - `app/student/dashboard/page.tsx`, `app/student/courses/page.tsx`, `app/student/schedule/page.tsx`, `app/student/exams/page.tsx`, `app/student/exams/[id]/page.tsx`, `app/student/messages/page.tsx`, `app/student/profile/page.tsx`, `app/student/certificates/page.tsx`, `app/student/medical/page.tsx`
  - `app/instructor/dashboard/page.tsx`, `app/instructor/courses/page.tsx`, `app/instructor/courses/[id]/attendance/page.tsx`, `app/instructor/flights/page.tsx`, `app/instructor/flights/[id]/prep/page.tsx`, `app/instructor/flights/[id]/evaluate/page.tsx`, `app/instructor/schedule/page.tsx`, `app/instructor/students/page.tsx`, `app/instructor/messages/page.tsx`, `app/instructor/modules/page.tsx`
  - `app/quality/dashboard/page.tsx`, `app/quality/audits/page.tsx`, `app/quality/ncrs/page.tsx`, `app/quality/capas/page.tsx`, `app/quality/risks/page.tsx`, `app/quality/safety/page.tsx`, `app/quality/documents/page.tsx`
  - `app/finance/dashboard/page.tsx`, `app/finance/invoices/page.tsx`, `app/finance/contracts/page.tsx`, `app/finance/reports/page.tsx`
  - `app/director/dashboard/page.tsx`
- **Add to every page:** `const [error, setError] = useState<string | null>(null);` + error display in render
- **Verification:** Open each page, verify no 401 crashes, verify error message shows on API failure

### 0.5 Add `.catch()` to ALL API Calls
- Audit every `.then(r => r.json()).then(setData)` chain
- Ensure EVERY chain has `.catch()` that sets an error state
- Add error display component to every page template

---

## Phase 1 — Foundation Hardening (1 week)

> **Goal:** Make the codebase reliable, consistent, and debuggable.

### 1.1 Standardize API Response Format
- **Current:** DRF returns raw data, no wrapper. Frontend `api.ts` expects `ApiResponse<T>` wrapper but it's not used.
- **New file:** `backend/apps/core/renderers.py`
  ```python
  from rest_framework.renderers import JSONRenderer
  
  class ApiResponseRenderer(JSONRenderer):
      def render(self, data, accepted_media_type=None, renderer_context=None):
          response = renderer_context.get('response')
          if response is not None and 200 <= response.status_code < 400:
              data = {
                  'success': True,
                  'data': data if data is not None else {},
                  'meta': {
                      'page': getattr(response, 'page', None),
                      'page_size': getattr(response, 'page_size', None),
                  }
              }
          return super().render(data, accepted_media_type, renderer_context)
  ```
- **Update:** `settings.py` → `DEFAULT_RENDERER_CLASSES` to use `ApiResponseRenderer`
- **Update frontend `api.ts`** → parse `response.data` to match `ApiResponse<T>` interface
- **This fixes:** Architecture.md §6.2 compliance (standard `{success, data, meta}` wrapper)

### 1.2 Add Request ID Middleware
- **New file:** `backend/apps/core/middleware.py` (extend existing)
  ```python
  import uuid
  
  class RequestIdMiddleware:
      def __init__(self, get_response):
          self.get_response = get_response
      def __call__(self, request):
          request.id = str(uuid.uuid4())[:8]
          response = self.get_response(request)
          response['X-Request-ID'] = request.id
          return response
  ```
- **Add to** `MIDDLEWARE` in settings.py (first position)
- **Update** `RequestLogMiddleware` to include request.id

### 1.3 Create Base Page Template Pattern
- **New file:** `web/app-single/components/page-shell.tsx`
  ```tsx
  'use client';
  import { ReactNode, useState } from 'react';
  import { useQuery } from '@tanstack/react-query';
  import { ErrorBoundary } from './error-boundary';
  
  interface PageShellProps<T> {
    title: string;
    queryKey: string[];
    queryFn: () => Promise<T>;
    render: (data: T) => ReactNode;
    emptyMessage?: string;
  }
  
  export function PageShell<T>({ title, queryKey, queryFn, render, emptyMessage }: PageShellProps<T>) {
    const { data, isLoading, error, refetch } = useQuery({ queryKey, queryFn });
    return (
      <ErrorBoundary>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <button onClick={() => refetch()} className="text-sm text-gray-500 hover:text-white">Refresh</button>
          </div>
          {isLoading && <LoadingSkeleton />}
          {error && <ErrorCard message={(error as Error).message} onRetry={() => refetch()} />}
          {!isLoading && !error && !data && <EmptyState message={emptyMessage || `No ${title.toLowerCase()} found.`} />}
          {!isLoading && !error && data && render(data)}
        </div>
      </ErrorBoundary>
    );
  }
  ```
- **Also create:** `LoadingSkeleton.tsx`, `ErrorCard.tsx`, `EmptyState.tsx`

### 1.4 Create Reusable CRUD Components
- **New files:**
  - `components/data-table.tsx` — sortable columns, pagination, row click
  - `components/modal-form.tsx` — slide-over modal with form rendering
  - `components/confirm-dialog.tsx` — delete/destructive action confirmation
  - `components/filter-bar.tsx` — status dropdown, date range, search input
  - `components/export-button.tsx` — PDF/Excel download trigger

### 1.5 Add Toast Notification System
- **New file:** `web/app-single/components/toast.tsx`
  - Success (green), Error (red), Warning (amber), Info (blue)
  - Auto-dismiss after 5s
  - Stack multiple toasts
  - Use React Context so any component can `showToast({ type, message })`

### 1.6 Fix Token Refresh in `api.ts`
- **Current issue:** On 401 + failed refresh, `clearAuth()` is called but the page doesn't redirect
- **Add:** Event-based logout notification
  ```typescript
  // In api.ts
  private onLogout: (() => void) | null = null;
  setLogoutHandler(handler: () => void) { this.onLogout = handler; }
  
  // In 401 handler:
  if (!this.refreshToken) {
    this.clearAuth();
    this.onLogout?.();
    window.location.href = '/login';
  }
  ```
- **In auth-context.tsx:** Register redirect handler on mount

### 1.7 Fix Audit Log Signals
- **Bug:** `_get_changes()` tries to use `.tracker` which doesn't exist → always returns `{}`
- **Fix:** Replace frame inspection with middleware-based approach
  ```python
  # In RequestIdMiddleware (extend):
  from threading import local
  _request_local = local()
  
  def __call__(self, request):
      _request_local.request = request
      return self.get_response(request)
  
  @staticmethod
  def get_current_request():
      return getattr(_request_local, 'request', None)
  ```
- **Update** `core/signals.py` to use `RequestIdMiddleware.get_current_request()` instead of frame inspection
- **For old_values on update:** Query database for previous state before save completes (use `pre_save` signal instead of `post_save` for updates)

---

## Phase 2 — API Completion (2 weeks)

> **Goal:** Every model has a ViewSet. Every PDF-specified endpoint exists.

### 2.1 Create Missing ViewSets (11 ViewSets)

| # | ViewSet | Model | App | Permissions |
|---|---------|-------|-----|-------------|
| 1 | `FlightProgramViewSet` | FlightProgram | flight_training | `flight_training.view` |
| 2 | `FlightLessonTemplateViewSet` | FlightLessonTemplate | flight_training | `flight_training.view` |
| 3 | `MedicalCertificateViewSet` | MedicalCertificate | students | `students.view` |
| 4 | `ProgressCheckViewSet` | ProgressCheck | exams | `flight_training.manage` |
| 5 | `SkillTestViewSet` | SkillTest | exams | `flight_training.manage` |
| 6 | `PracticalEvaluationViewSet` | PracticalEvaluation | exams | `flight_training.view` |
| 7 | `ModuleLessonViewSet` | ModuleLesson | ground_training | `ground_training.view` |
| 8 | `ModuleDocumentViewSet` | ModuleDocument | ground_training | `ground_training.view` |
| 9 | `QuizAttemptViewSet` | QuizAttempt | exams | `exams.view` |
| 10 | `AdminProfileViewSet` | AdminProfile | students | `accounts.manage` |
| 11 | `SystemSettingViewSet` | SystemSetting | core | `accounts.manage` |

### 2.2 Create Dedicated Dashboard Endpoints (per role)

| Endpoint | For | Data |
|----------|-----|------|
| `GET /api/student/dashboard/` | Student | progress %, flight hours, upcoming schedule, exam results, unpaid invoices, expiring docs |
| `GET /api/instructor/cgi/dashboard/` | CGI | total students, today's courses, instructor availability, exam pass rate, alerts |
| `GET /api/instructor/cfi/dashboard/` | CFI | today's flights, aircraft status, student progress, maintenance alerts, expiring qualifications |
| `GET /api/admin/dashboard/` | Admin | admissions funnel, active students, revenue, document compliance, expiring items |
| `GET /api/finance/dashboard/` | Finance | revenue trends, outstanding invoices, overdue count, monthly comparison |
| `GET /api/quality/dashboard/` | Quality | audit completion rate, NCR open/closed, CAPA status, risk matrix summary, upcoming deadlines |

### 2.3 Create Action Endpoints (workflow triggers)

| Endpoint | Method | Phase Ref |
|----------|--------|-----------|
| `/api/students/{id}/suspend/` | POST | Phase 5 §5 — Suspend student |
| `/api/students/{id}/reactivate/` | POST | Phase 5 §5 — Reactivate student |
| `/api/students/{id}/archive/` | POST | Phase 5 §5 — Archive student |
| `/api/applications/{id}/accept/` | POST | Phase 5 §4 — Accept candidate → student |
| `/api/applications/{id}/reject/` | POST | Phase 5 §4 — Reject candidate |
| `/api/applications/{id}/interview/` | POST | Phase 5 §4 — Schedule interview |
| `/api/flight-lessons/{id}/authorize-solo/` | POST | Phase 4 §6 — Authorize solo flight |
| `/api/flight-lessons/{id}/complete/` | POST | Phase 4 §12 — Complete flight with evaluation |
| `/api/progress-checks/{id}/validate/` | POST | Phase 4 §15 — Validate progress check |
| `/api/skill-tests/{id}/authorize/` | POST | Phase 4 §16 — Authorize skill test |
| `/api/certificates/{id}/generate/` | POST | Phase 8 §11 — Generate certificate PDF with QR |
| `/api/audits/{id}/complete/` | POST | Phase 7 §5 — Complete audit with findings |
| `/api/non-conformities/{id}/close/` | POST | Phase 7 §6 — Close NCR with root cause |
| `/api/capas/{id}/validate/` | POST | Phase 7 §7 — Validate CAPA closure |

### 2.4 Create Notification Service
- **New file:** `backend/apps/notifications/services.py`
  ```python
  class NotificationService:
      @staticmethod
      def notify(user, type, title, message, data=None):
          return Notification.objects.create(
              user=user, type=type, title=title, message=message, data=data or {}
          )
      
      @staticmethod
      def notify_role(role, type, title, message, data=None):
          from apps.accounts.models import User
          users = User.objects.filter(role=role, status='active')
          return [NotificationService.notify(u, type, title, message, data) for u in users]
      
      @staticmethod
      def notify_student_milestone(student, milestone):
          """Progress Check passed, Skill Test scheduled, Certificate issued, etc."""
          ...
      
      @staticmethod
      def notify_document_expiring(user, document_type, expiry_date):
          """Document expiring within 30 days."""
          ...
  ```
- **Wire into signals/views:** After flight evaluation, exam submission, invoice creation, NCR opening, etc.

### 2.5 Add Conflict Detection for Course Scheduling
- **Extend** `backend/apps/ground_training/services.py`
- **Add** `InstructorConflictService` checking instructor availability (reuse pattern from `flight_training/services.py`)
- **Add** `StudentConflictService` checking student enrollment overlaps
- **Wire into** `CourseViewSet.create()` validation

### 2.6 Wire Meilisearch into Search Endpoint
- **Current:** `search_view` uses `__icontains` DB queries
- **Fix:** Call `core.search.search_meilisearch(q)` and merge with DB results
- **Add:** Search index updates on model save (via signals or `post_save` in each app)

### 2.7 Update `api_urls.py`
- Register all 11 new ViewSets in router
- Add all 15 new action endpoints
- Ensure all 50+ routes follow consistent naming

---

## Phase 3 — Frontend Core UX (2–3 weeks)

> **Goal:** Every page has filters, pagination, search, CRUD modals, error states, loading skeletons.

### 3.1 Build and Apply Shared Components

For **every list page** in the app (30+ pages), apply:

| Component | What it does |
|-----------|-------------|
| `DataTable` | Sortable column headers, pagination footer, row click → detail |
| `FilterBar` | Status dropdown, date range picker, text search, "Clear all" |
| `ModalForm` | Slide-over panel with form, save/cancel buttons, Zod validation |
| `ConfirmDialog` | "Are you sure?" modal with destructive action button |
| `ExportButton` | Dropdown: "Export PDF" / "Export Excel" |
| `EmptyState` | Icon + message when no data matches filters |
| `LoadingSkeleton` | Animated placeholder cards matching layout shape |
| `ErrorCard` | Red-bordered card with error message + retry button |

### 3.2 Page-by-Page Retrofit

#### Student Portal (9 pages to upgrade)
| Page | Add |
|------|-----|
| Dashboard | Skeleton loading, error card, real progress bars (not just KPIs), daily schedule from combined API |
| Courses | Filter by subject/status, search by title, course detail modal with materials list (PDFs/videos/exercises from ModuleDocument) |
| Flights | Filter by date range/status, sort by date/duration/grade, flight detail modal (exercises, competencies, observations) |
| Schedule | Day/Week/Month toggle (tabs), FullCalendar component (Phase 5), color-coded by type |
| Exams | Filter by subject/status, search, exam attempt history with score trends |
| Exams/[id] | Timer with pause warning, confirmation before submit, better mobile layout |
| Messages | Inbox/Sent/Compose tabs, search, pagination, unread count badge |
| Certificates | Filter by program, search, download all button, QR code display on detail |
| Profile | Photo upload (with preview + crop), edit contact info, activity log tab |
| Medical | Real content: list of medical certificates with status, upload new, expiry warnings |

#### Instructor Portal (10 pages to upgrade)
| Page | Add |
|------|-----|
| Dashboard | Skeleton, error card, real-time stats, upcoming schedule timeline |
| Courses | Filter by subject/status/date, search, create/edit modal with room conflict indicator, student enrollment list in detail |
| Courses/[id]/attendance | Bulk mark all, date navigation, attendance rate auto-calc, export attendance PDF |
| Flights | Filter by student/status/aircraft/date, create/edit modal with conflict warnings, aircraft availability indicator |
| Flights/[id]/prep | Template selection for auto-fill, weather API integration stub, NOTAM checklist from template |
| Flights/[id]/evaluate | Competency checklist (not textarea), grade slider, auto-calculate based on competencies, signature pad placeholder |
| Schedule | Day/Week/Month toggle, FullCalendar, filter by type, drag-to-reschedule |
| Students | Filter by program/status, search by name/number, detail modal with progress bars per area, flight log, exam results tabs |
| Messages | Inbox/Sent/Compose, student auto-complete, message threading |
| Modules | Drag-to-reorder modules, inline lesson editing, document upload with progress bar, video embed support |

#### Quality Portal (7 pages to upgrade)
| Page | Add |
|------|-----|
| Dashboard | Real aggregated KPIs from quality dashboard API, trend charts, deadline alerts list |
| Audits | Create audit modal (type, scope, lead auditor, checklist builder), filter by type/status, complete audit workflow |
| NCRs | Create NCR modal (link to audit, severity select, responsible assignment), close workflow with root cause, CAPA link |
| CAPAs | Create CAPA modal (link to NCR, type corrective/preventive), validation workflow, deadline countdown |
| Risks | Risk matrix heatmap (interactive click-to-create), filter by risk level, mitigation progress tracker |
| Safety | Report form with file attachment, confidential toggle, filter by type/status, trend analysis chart |
| Documents | Upload new version modal (auto-increments version), filter by type/status, revision history timeline, expiry warnings |

#### Finance Portal (4 pages to upgrade)
| Page | Add |
|------|-----|
| Dashboard | Real aggregated KPIs, revenue trend by month, top debtors list |
| Invoices | Create invoice modal (student selector, type, amount, due date), record payment modal (updates balance, auto-status), filter by status, overdue highlight |
| Contracts | Create contract modal (student, type, dates), file upload, status workflow, renewal reminder |
| Reports | Date range filter, export buttons actually call export endpoints, revenue by program chart, outstanding by age chart |

#### Director Portal (1 page to upgrade)
| Page | Add |
|------|-----|
| Dashboard | Filter by academic year, drill-down on each KPI card → detail view, export executive summary PDF, comparison vs previous period |

### 3.3 Create Missing Pages (5 pages)

| Route | Content |
|-------|---------|
| `/student/documents` | Document categories (admin, pedagogical, medical, certificates), file list per category, download button, upload disabled (read-only for students) |
| `/student/payments` | Invoice list with status badges, payment history, current balance, download invoice PDF, payment schedule/installments |
| `/finance/payments` | All payments list, filter by student/invoice/date/method, record manual payment, payment reconciliation |
| `/instructor/aircraft` | Aircraft list with status badges, maintenance due alerts, availability calendar, book resource button |
| `/instructor/reports` | Report type selector, date range, generate button, preview before export, download PDF/Excel |

---

## Phase 4 — Portal Deep-Dive Features (2–3 weeks)

> **Goal:** PDF-specified workflows that go beyond basic CRUD.

### 4.1 Student Portal — Full Feature Set

#### 4.1.1 Course Materials System
- **Backend:** `GET /api/courses/{id}/materials/` — aggregates ModuleDocuments + ModuleLessons
- **Frontend:** Course detail page with:
  - Tab 1: "Content" — expandable lesson cards with PDF viewer, video embed, presentation viewer
  - Tab 2: "Exercises" — module quizzes with immediate feedback
  - Tab 3: "Progress" — time spent, last accessed, completion %
  - Auto-track: time on page, documents viewed, last activity timestamp

#### 4.1.2 Student Progress Visualization
- **Backend:** `GET /api/students/progress/detail/` — breakdown by area (theory, flight, simulator)
- **Frontend:** Dashboard widget:
  - Circular progress ring per area (Recharts radial bar)
  - "Hours remaining" countdown
  - "Next milestone" card (e.g., "5 more hours to solo eligibility")
  - "Recent activity" timeline (courses attended, flights completed, exams passed)

#### 4.1.3 Digital Logbook
- **Backend:** `GET /api/students/flight-log/detail/` — add pagination, filtering
- **Frontend:** Full logbook page:
  - Filter by aircraft, instructor, date range
  - Sort by any column
  - Download as PDF (formatted logbook)
  - Print view

#### 4.1.4 Certificate Verification
- **Backend:** `GET /api/certificates/verify/?number=XXX` — public endpoint, no auth
- **Frontend:** Certificate detail page with:
  - QR code (using `qrcode.react`)
  - "Verify" button that shows validation result
  - Download PDF button
  - Share link (copy to clipboard)

### 4.2 Instructor Portal — Workflows

#### 4.2.1 Solo Flight Authorization
- **Backend:** `POST /api/flight-lessons/{id}/authorize-solo/`
  - Validates: student medical valid, minimum hours met, instructor qualified, previous competencies acquired
  - Creates notification for student + CFI
  - Logs to AuditLog with action='validate'
- **Frontend:** "Authorize Solo" button on evaluate page, confirmation modal with prerequisite checklist, auto-validation before allowing

#### 4.2.2 Progress Check Workflow
- **Backend:** Full CRUD on ProgressCheck + validate action
- **Frontend:** 
  - Schedule: pick student, examiner, date/time
  - Execute: checklist form with competency matrix
  - Validate: pass/fail + lessons to repeat + recommendations
  - Auto-notify: student, CFI, HT

#### 4.2.3 Skill Test Workflow
- **Backend:** Full CRUD on SkillTest + authorize/complete actions
  - On complete: auto-check all prerequisites (theory passed, min hours, progress checks passed, medical valid)
  - On pass: auto-trigger Certificate generation
- **Frontend:** 
  - Authorization request form (CFI → examiner)
  - Execution report form
  - Result notification chain

### 4.3 Quality Portal — Full SMS/QMS

#### 4.3.1 Audit Lifecycle
- **Plan:** Set type, scope, checklist items, lead auditor, auditors, date
- **Execute:** Checklist item-by-item with finding capture
- **Report:** Auto-generate PDF with all findings, NCRs opened, recommendations
- **Close:** Archive audit, update compliance metrics

#### 4.3.2 NCR → CAPA → Close Loop
- Open NCR (from audit or standalone)
- Root cause analysis (5 Whys template, fishbone diagram placeholder)
- Create CAPA (corrective + preventive)
- Assign responsible, set due date
- Validate CAPA completion
- Close NCR only when all linked CAPAs are validated
- Auto-escalate if past due date

#### 4.3.3 Risk Matrix Interactive
- 5×5 grid (probability × severity)
- Color-coded: Green (1-4), Yellow (5-9), Orange (10-14), Red (15-25)
- Click cell to create new risk assessment
- Hover to see count
- Filter by status, responsible, date

#### 4.3.4 Deadline Monitor
- **New backend service:** `DeadlineMonitorService`
  - Scans: medical certificates, instructor qualifications, aircraft certifications, document revisions, audit schedules, CAPA due dates, contract expirations
  - Generates alerts at: 90, 60, 30, 7, 1 days before expiry
- **Frontend:** Dashboard widget showing all upcoming deadlines, color-coded by urgency

### 4.4 Finance Portal — Full Cycle

#### 4.4.1 Invoice Generation
- Auto-generate from contract (installments)
- Manual invoice creation
- Recurring invoice templates
- Invoice numbering (auto-increment, configurable prefix)

#### 4.4.2 Payment Reconciliation
- Record payment → auto-update invoice status (paid/partially_paid)
- Overdue detection (Celery beat daily)
- Payment history per student
- Receipt generation (PDF)

#### 4.4.3 Financial Reports
- Revenue by period (day/week/month/year)
- Revenue by program (PPL/CPL/IR/etc.)
- Outstanding by age (0-30, 31-60, 61-90, 90+ days)
- Cash flow forecast
- Export all as PDF (formatted) + Excel (raw data)

### 4.5 Director Portal — Executive View

#### 4.5.1 KPI Drill-Down
- Click any KPI card → detailed breakdown with charts
- Compare vs previous period (month-over-month, year-over-year)
- Trend lines with projections

#### 4.5.2 Consolidated Reports
- Student enrollment funnel (candidate → active → graduate → dropout)
- Instructor utilization (hours taught vs available)
- Fleet utilization (hours flown vs available)
- Revenue per student/program/instructor
- Pass rates by program/instructor/period

---

## Phase 5 — Missing Libraries Installation (1 week)

> **Goal:** Align tech stack with architecture.md §2.2

### 5.1 Install and Configure FullCalendar v6

```bash
npm install @fullcalendar/core @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid
```

- **Replace custom schedule lists on:** `/student/schedule`, `/instructor/schedule`
- **Add month/year views**
- **Add event click → detail modal**
- **Add drag-to-reschedule (instructor only)**

### 5.2 Install and Configure React Hook Form v7 + Zod Resolver

```bash
npm install react-hook-form @hookform/resolvers
```

- **Migrate ALL forms** to use `useForm()` with Zod schema validation:
  - Login form (already has Zod, migrate to RHF)
  - Course create form
  - Flight create form
  - Flight preparation form
  - Flight evaluation form
  - Invoice create form
  - Payment form
  - Safety event report form
  - Message compose form
  - Profile edit form
  - Audit create form
  - NCR create form
  - CAPA create form
  - Risk assessment form
  - Document upload form

### 5.3 Install and Configure Zustand v5

```bash
npm install zustand
```

- **Create stores:**
  ```typescript
  stores/auth-store.ts     // Auth user + token (replace raw sessionStorage reads)
  stores/ui-store.ts       // Sidebar collapsed, theme, toast queue
  stores/filter-store.ts   // Persisted filters per page
  ```
- **Refactor** `auth-context.tsx` to sync auth state to Zustand store
- **Refactor** all pages to read token from store, not sessionStorage

### 5.4 Install qrcode.react

```bash
npm install qrcode.react
```

- **Add QR code to:** Certificate detail view
- **Add QR verification page:** `/verify-certificate?number=XXX` (public, no auth)

### 5.5 Install jspdf

```bash
npm install jspdf jspdf-autotable
```

- **Add client-side PDF generation for:**
  - Flight logbook export
  - Attendance sheet export
  - Invoice/Receipt export
  - Student progress report export

### 5.6 Upgrade Tailwind CSS to v4

```bash
npm install tailwindcss@^4.0.0 @tailwindcss/postcss
```

- **Update** `postcss.config.js` for Tailwind v4 plugin format
- **Update** `tailwind.config.ts` → CSS-based config
- **Test:** All pages render correctly with new utility classes

### 5.7 Install shadcn/ui (Optional but Recommended)

```bash
npx shadcn@latest init
npx shadcn@latest add button input select dialog table card badge tabs skeleton
```

- **Migrate key components:** Button, Input, Select, Dialog, Table
- **Keep custom navy/gold theme** via CSS variables
- **Benefits:** Consistent accessibility, keyboard navigation, focus management

---

## Phase 6 — i18n Complete (1–2 weeks)

> **Goal:** Full EN/FR/AR coverage on every page. RTL working for Arabic.

### 6.1 Install and Configure next-intl v4

```bash
npm install next-intl
```

### 6.2 Setup next-intl Routing

- **Create:** `src/i18n/routing.ts` — locale prefix routing (`/en/...`, `/fr/...`, `/ar/...`)
- **Create:** `src/i18n/request.ts` — server-side locale detection
- **Create:** `src/middleware.ts` — locale redirect middleware
- **Update:** `next.config.js` — add `createNextIntlPlugin()`
- **Update:** `app/layout.tsx` — wrap with `NextIntlClientProvider`

### 6.3 Extract ALL UI Strings (~500+ keys)

- **Audit:** Every `<p>`, `<h1>`, `<button>`, `<span>`, placeholder, aria-label, alt text
- **Create translation JSON files:**
  - `locales/en.json` — English (base)
  - `locales/fr.json` — French
  - `locales/ar.json` — Arabic
- **Key structure:**
  ```json
  {
    "common": { "save": "...", "cancel": "...", "delete": "...", "search": "...", "loading": "..." },
    "student": { "dashboard": { "title": "...", "progress": "..." }, "flights": { "title": "..." }, ... },
    "instructor": { ... },
    "quality": { ... },
    "finance": { ... },
    "director": { ... },
    "errors": { "network": "...", "unauthorized": "...", "notFound": "..." }
  }
  ```

### 6.4 Replace All Hardcoded Strings

- **On every page**, replace:
  ```tsx
  // ❌ Before
  <h1 className="text-lg font-bold text-white">Flight Log</h1>
  
  // ✅ After
  import { useTranslations } from 'next-intl';
  const t = useTranslations('student.flights');
  <h1 className="text-lg font-bold text-white">{t('title')}</h1>
  ```

### 6.5 Enable RTL for Arabic

- **Update** `globals.css`:
  ```css
  [dir="rtl"] .sidebar { right: 0; left: auto; }
  [dir="rtl"] .main-content { margin-right: 260px; margin-left: 0; }
  [dir="rtl"] .ml-auto { margin-right: auto; margin-left: 0; }
  ```
- **Test:** All pages in Arabic, verify layout doesn't break
- **Recharts RTL:** Use `reverse` prop on XAxis for RTL

### 6.6 Backend i18n

- **Add `title_fr` and `title_ar` fields to ALL relevant models:**
  - `Module.title_fr`, `Module.title_ar`
  - `Course.title_fr`, `Course.title_ar`
  - `Exam.title_fr`, `Exam.title_ar`
  - `FlightLessonTemplate.title_fr`, `FlightLessonTemplate.title_ar`
  - `Certificate.title_fr`, `Certificate.title_ar`
  - `Audit.title_fr`, `Audit.title_ar`
- **Create migration** for each
- **Update serializers** to return `title` based on `Accept-Language` header
- **Update admin** to show all language fields

---

## Phase 7 — Security Hardening (1 week)

> **Goal:** Close all security gaps identified in state.md.

### 7.1 Enable Token Blacklisting

- **Install:** `django-rest-framework-simplejwt` already supports it
- **Add model:** `BlacklistedToken` (or use SimpleJWT's built-in)
- **Update settings:**
  ```python
  SIMPLE_JWT = {
      ...
      'BLACKLIST_AFTER_ROTATION': True,  # was False
  }
  ```
- **Run migrations**

### 7.2 Add Account Lockout

- **New model:** `LoginAttempt(user, timestamp, success, ip_address)`
- **Middleware/View:** After 5 failed attempts in 15 minutes → lock account for 30 minutes
- **Notify user:** "Your account has been temporarily locked due to multiple failed login attempts"
- **Admin:** Manual unlock button

### 7.3 Add File Upload Validation

- **New file:** `backend/apps/core/validators.py`
  ```python
  def validate_file_size(value, max_size_mb=10):
      if value.size > max_size_mb * 1024 * 1024:
          raise ValidationError(f'File too large. Max {max_size_mb}MB.')
  
  def validate_file_extension(value, allowed_extensions):
      ext = os.path.splitext(value.name)[1].lower()
      if ext not in allowed_extensions:
          raise ValidationError(f'Unsupported file type: {ext}')
  
  def validate_file_mime(value, allowed_mimes):
      ...
  ```
- **Apply to:** Document upload, student photo, certificate files, quality documents, aircraft documents
- **Allowed types per context:**
  - Photos: jpg, jpeg, png, webp — max 5MB
  - Documents: pdf, doc, docx, xls, xlsx — max 20MB
  - Certificates: pdf only — max 5MB

### 7.4 Run API Container as Non-Root

- **Update** `backend/Dockerfile`:
  ```dockerfile
  RUN addgroup --system django && adduser --system --ingroup django django
  USER django
  ```
- **Verify:** `docker exec masterly-air-academy-api-1 whoami` → `django`

### 7.5 Tighten CSP Headers

- **Update** `nginx.conf`:
  ```nginx
  add_header Content-Security-Policy 
    "default-src 'self'; 
     script-src 'self'; 
     style-src 'self'; 
     img-src 'self' data:; 
     font-src 'self'; 
     connect-src 'self'; 
     frame-ancestors 'none';" always;
  ```
- **Remove:** `'unsafe-inline'` and `'unsafe-eval'`
- **Test:** All pages render correctly
- **If needed:** Add nonce-based approach for inline styles

### 7.6 Pin Exact Docker Image Versions

- **Update** `docker-compose.yml`:
  ```yaml
  nginx: nginx:1.31.2-alpine        # was 1.31-alpine
  db: postgres:17.10-alpine           # was 17-alpine
  redis: redis:8.6.4-alpine           # was 8-alpine
  meilisearch: getmeili/meilisearch:v1.13.1  # already pinned
  ```

### 7.7 Add Rate Limiting to Sensitive Endpoints

- **Add in** `settings.py`:
  ```python
  REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'].update({
      'password_change': '3/hour',
      'certificate_download': '30/hour',
      'export': '10/hour',
  })
  ```
- **Apply:** `ScopedRateThrottle` to password change, certificate download, export views

### 7.8 Add Security Audit Middleware

- **New file:** `backend/apps/core/security.py`
  ```python
  class SecurityAuditMiddleware:
      def __call__(self, request):
          # Log suspicious patterns
          if request.path.startswith('/admin/') and request.user.role not in ['system_admin', 'admin_responsible']:
              logger.warning(f"Non-admin accessing admin: {request.user.email}")
          if 'union' in request.GET.urlencode().lower():
              logger.critical(f"Potential SQL injection attempt: {request.META.get('REMOTE_ADDR')}")
          return self.get_response(request)
  ```

---

## Phase 8 — Testing & Quality (1–2 weeks)

> **Goal:** Zero tests → meaningful coverage across backend and frontend.

### 8.1 Backend Tests

#### 8.1.1 Model Tests (`tests/test_models.py`)
- Test every model: creation, string representation, unique constraints, ordering
- Test User model: email as USERNAME_FIELD, role choices validation, status transitions
- Test Student model: full_name property, program choices
- Test FlightLesson model: status transitions, duration calculations
- Test RiskAssessment: auto risk_level calculation
- Test AuditLog: all 9 action types

#### 8.1.2 API Tests (`tests/test_api.py`)
- Test JWT login flow: valid credentials → 200 + token, invalid → 401
- Test token refresh flow
- Test role-based access: student can't access instructor endpoints
- Test every ViewSet: list, create, retrieve, update, delete
- Test filtering, search, ordering on every ViewSet
- Test pagination: page size, page number
- Test throttling: exceed rate limit → 429
- Test file upload: valid file, too large, wrong type

#### 8.1.3 Service Tests (`tests/test_services.py`)
- ConflictDetectionService: overlapping bookings, available slots
- AutoGradingService: MCQ correct/incorrect, all question types
- FlightLogService: aggregation accuracy
- NotificationService: creation, role-based notify

#### 8.1.4 Test Fixtures
- **Create:** `conftest.py` with fixtures for each user role
- **Use:** `pytest-django` + `pytest-factoryboy`

### 8.2 Frontend Tests

#### 8.2.1 Component Tests (Vitest + Testing Library)
- DataTable: renders columns, sorts on click, pagination controls
- FilterBar: status filter, search input, clear button
- ModalForm: opens/closes, validates input, calls onSubmit
- ErrorBoundary: catches error, shows fallback
- NotificationBell: shows unread count, marks all read

#### 8.2.2 Page Tests (Playwright E2E)
- Login flow: enter credentials → redirected to correct portal
- Student dashboard: loads KPIs, renders charts
- Flight log: loads data, handles empty state, handles error
- Exam taking: starts exam, submits answers, shows results
- Instructor course creation: fills form, validates, creates

### 8.3 Test Infrastructure

- **Add to requirements.txt:** `pytest`, `pytest-django`, `pytest-cov`, `factory-boy`
- **Add to package.json:** `vitest`, `@testing-library/react`, `@playwright/test`
- **Add scripts:** `npm test`, `npm run test:e2e`
- **Configure:** `.coveragerc` (80% minimum), `playwright.config.ts`
- **CI stub:** `make test` runs backend + frontend tests

---

## Phase 9 — DevOps & Production Readiness (1 week)

> **Goal:** Ready for go-live on school server.

### 9.1 Database Backup Service
- **New container:** `backup` (or extend existing)
  ```yaml
  backup:
    image: postgres:17.10-alpine
    command: |
      sh -c 'while true; do
        pg_dump -h db -U masterly masterly | gzip > /backups/backup_$(date +%Y%m%d_%H%M).sql.gz;
        find /backups -name "*.sql.gz" -mtime +30 -delete;
        sleep 86400;
      done'
    volumes:
      - backup_data:/backups
  ```
- **Add volume:** `backup_data`

### 9.2 Static Files via Nginx Volume
- **Current:** Nginx proxies `/static/` to Django (WhiteNoise)
- **Better:** Mount `staticfiles` directory as shared volume
  ```yaml
  api:
    volumes:
      - static_volume:/app/staticfiles
  nginx:
    volumes:
      - static_volume:/app/staticfiles:ro
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
  ```
- **Update nginx:** `location /static/ { alias /app/staticfiles/; }`
- **Benefit:** Nginx serves static files directly, no proxy overhead

### 9.3 Log Rotation
- **Add to nginx.conf:**
  ```nginx
  access_log /var/log/nginx/access.log main;
  error_log  /var/log/nginx/error.log warn;
  ```
- **Add docker logging driver** to docker-compose.yml:
  ```yaml
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
  ```

### 9.4 Health Check Page
- **New endpoint:** `GET /api/health/detailed/`
  ```json
  {
    "status": "ok",
    "database": "connected",
    "redis": "connected",
    "minio": "connected",
    "meilisearch": "connected",
    "celery": "running",
    "uptime": "5d 12h 34m",
    "version": "1.0.0"
  }
  ```

### 9.5 Environment Validation on Startup
- **New management command:** `validate_env` — checks all required env vars, DB connectivity, Redis, MinIO, Meilisearch
- **Run before** `migrate` in entrypoint.sh

### 9.6 Deployment Scripts
- **New file:** `deploy.sh`
  ```bash
  #!/bin/bash
  git pull
  docker compose build --no-cache api web
  docker compose down
  docker compose up -d
  docker compose exec api python manage.py migrate --noinput
  docker compose exec api python manage.py collectstatic --noinput
  ```
- **New file:** `backup.sh` — manual backup trigger
- **New file:** `restore.sh` — restore from backup file

### 9.7 SSL/TLS (If Network Requires It)
- **Generate self-signed cert** or use Let's Encrypt
- **Add to nginx:**
  ```nginx
  server {
      listen 443 ssl http2;
      ssl_certificate /etc/nginx/certs/fullchain.pem;
      ssl_certificate_key /etc/nginx/certs/privkey.pem;
      ssl_protocols TLSv1.2 TLSv1.3;
      ssl_ciphers HIGH:!aNULL:!MD5;
      add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
      # ... rest of config
  }
  server {
      listen 80;
      return 301 https://$host$request_uri;
  }
  ```

---

## Implementation Order & Dependencies

```
Phase 0 ─────────────────────────────────────────────────────► (1-2 days)
  │
  └─► Phase 1 ───────────────────────────────────────────────► (1 week)
        │
        ├─► Phase 2 (API Completion) ────────────────────────► (2 weeks)
        │     │
        │     └─► Phase 3 (Frontend Core UX) ────────────────► (2-3 weeks)
        │           │
        │           ├─► Phase 4 (Portal Deep-Dive) ──────────► (2-3 weeks)
        │           │     │
        │           │     └─► Phase 6 (i18n) ────────────────► (1-2 weeks)
        │           │
        │           └─► Phase 5 (Missing Libraries) ─────────► (1 week)
        │
        └─► Phase 7 (Security Hardening) ────────────────────► (1 week)
              │
              └─► Phase 8 (Testing) ─────────────────────────► (1-2 weeks)
                    │
                    └─► Phase 9 (DevOps) ────────────────────► (1 week)
```

**Parallelizable work:**
- Phase 2 + Phase 3 can partially overlap (different files)
- Phase 5 + Phase 6 can run in parallel
- Phase 7 + Phase 8 can run in parallel
- Phase 4 sub-portals (student, instructor, quality, finance, director) are independent

---

## Success Metrics

After completing all phases, the platform will:

- [ ] **0 unhandled crashes** — Every page has error boundaries + error handling
- [ ] **100% API coverage** — Every model has CRUD endpoints, every PDF workflow has dedicated endpoints
- [ ] **Full CRUD UI** — Every list has filters, pagination, search, create/edit/delete modals
- [ ] **6 complete portals** — Student, Instructor, Quality, Finance, Director + Admin (Django)
- [ ] **3 languages** — Every string translatable, RTL Arabic working
- [ ] **7 specified libraries installed** — FullCalendar, React Hook Form, Zustand, next-intl, jspdf, qrcode.react, shadcn/ui
- [ ] **80%+ test coverage** — Backend models + API + services, Frontend components + E2E
- [ ] **Security baseline met** — Token blacklisting, account lockout, file validation, non-root containers, pinned versions, tightened CSP
- [ ] **Production-ready** — Backups, log rotation, health checks, deployment scripts, env validation
- [ ] **All 52 PDF pages satisfied** — Every feature from all 8 phases either implemented or explicitly deferred to Phase B

---

*Plan generated: July 12, 2026*
*Based on: state.md comprehensive audit (3-agent parallel sweep + manual review)*
*Target: Production-grade ATO management platform*
