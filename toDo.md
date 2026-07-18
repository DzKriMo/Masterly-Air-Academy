# MASTERLY AIR ACADEMY — 100% Completion Checklist

This document covers every gap identified by auditing the current codebase against the SRS PDF (52 pages) and `architecture.md`. Every item must be completed to reach 100%.

**Legend:**  
`NEW` — needs to be created from scratch  
`FIX` — existing code needs repair/adjustment  
`VERIFY` — check that it works correctly, may need minor polish  

---

## P0: ARCHITECTURE & INFRASTRUCTURE

### 0.1 API Response Envelope (FIX)

**Problem:** `architecture.md §6.2` specifies:
```json
{ "success": true, "data": [], "meta": { "current_page": 1, "total_pages": 5, "page_size": 20, "total_count": 98 } }
```

But the actual response is:
```json
{ "success": true, "data": { "count": 98, "next": "...", "previous": null, "results": [...] }, "meta": { "pagination": { "count": 98, "next": "...", "previous": null } } }
```

**What to do:**
- In `backend/apps/core/pagination.py` — change `StandardPagination.get_paginated_response()` to return `{ "data": results_list, "meta": { "current_page": page_number, "total_pages": total, "page_size": per_page, "total_count": count } }` instead of DRF's default `{count, next, previous, results}` format
- In `backend/apps/core/renderers.py` — simplify `ApiResponseRenderer.render()` to not duplicate pagination info; just wrap whatever `data` is returned
- Update all frontend code that accesses `data.results` or `data.count` to use the new format — search for `.results` and `.count` in all frontend files (`data-table.tsx`, all page files that handle paginated responses)
- Files to check: `components/data-table.tsx`, all admin pages, all student/instructor/quality pages that fetch paginated lists

### 0.2 Missing middleware.ts (VERIFY)

**Problem:** `architecture.md §4` lists `web/app-single/middleware.ts` but no file exists.

**What to do:**
- Decide if middleware is needed at all. Currently auth is handled inline (each layout checks `isAuthenticated`). If no redirect/rewrite logic is needed on the server side, leave as-is and update `architecture.md` to remove middleware from the tree.
- If you want server-side route protection (e.g., redirect to `/login` on server before rendering), create `web/app-single/middleware.ts` with role-based redirects matching `portal-access.ts`.

### 0.3 next-intl vs Custom use-translation (VERIFY)

**Problem:** `architecture.md §2.2` lists `next-intl` as the i18n library, but the project uses a custom `use-translation.ts` hook.

**What to do:**
- Either update `architecture.md` to match reality, or migrate to `next-intl` for proper i18n routing (RTL support for Arabic, locale-prefixed routes).
- If keeping custom hook: ensure all 3 locales (EN/FR/AR) have every translation key. Currently `layout.administrationPortal` exists in EN but verify FR and AR have it too (search lines 744-748 and 1168-1172).

### 0.4 Email Sending Infrastructure (NEW)

**Problem:** The SRS specifies automatic email notifications (Phase 2 §11, Phase 5 §13, Phase 6 §12, Phase 7 §13), but the project has zero email capability — no SMTP config, no `send_mail` calls, no email templates.

**What to do:**
- Add to `backend/config/settings.py`:
  ```python
  EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
  EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.example.com')
  EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
  EMAIL_USE_TLS = True
  EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
  EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
  DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@masterly-air-academy.dz')
  ```
- Add env vars to `docker-compose.yml`
- Create `backend/apps/notifications/email_service.py` with functions: `send_notification_email(user, subject, message)`, `send_html_email(user, template_name, context)`
- Create email templates (HTML): `templates/emails/notification.html`, `templates/emails/notification.txt`
- Update `NotificationService` in `notifications/services.py` to also send email when creating in-app notifications
- Add `EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'` for dev (so emails print to console)

### 0.5 Auto-Logout After Inactivity (NEW)

**Problem:** SRS Phase 2 §14 requires auto-logout after configurable inactivity period. Not implemented.

**What to do:**
- In `web/app-single/app/layout.tsx` (or a new `components/inactivity-detector.tsx`):
  - Add a wrapper component that tracks user activity (`mousemove`, `keypress`, `click`, `touchstart`)
  - Reset a timer on each activity event
  - After `INACTIVITY_TIMEOUT` (e.g., 30 minutes), call `logout()` and redirect to `/login`
  - Show a warning modal 1 minute before timeout
  - Make timeout configurable via `SystemSetting` model

---

## P1: STUDENT PORTAL (SRS Phase 2)

### 1.1 Dashboard — Missing Data (FIX)

- [ ] **Student photo** — No photo displayed. `Student` model/`User` model has no photo field.
  - Add `photo = models.ImageField(upload_to='students/photos/', null=True, blank=True)` to `Student` model
  - Run `makemigrations` + `migrate`
  - Add photo upload to `ProfileUpdateSerializer`
  - Display photo on dashboard (top-left, 80x80)
- [ ] **Student number** — Not displayed. Backend `StudentDashboardView` doesn't return it. Add `student_number` to the view's returned data.
- [ ] **Program** — Not displayed. Add `program` to the dashboard view's returned data.
- [ ] **Sim hours progress** — No sim hours anywhere. Add if simulator model exists, or remove progress bar if simulators are deferred.
- [ ] **Passed exams count** — Dashboard shows `exam_average` but not passed/failed count. Add count of passed exams.
- [ ] **Remaining steps** — Currently 3 hardcoded milestones (10h solo, 25h cross-country, 45h license). These should be driven by the actual `FlightProgram` + `FlightLessonTemplate` data. Replace hardcoded values with dynamic calculation from enrolled program's lesson templates.
- [ ] **Notifications feed** — Dashboard has no notification list. Add `GET /notifications/?limit=5` and display recent unread notifications.
- [ ] **Today's activities** — Missing: exams scheduled today, sim sessions, meetings. Add these to the `upcoming_schedule` endpoint.

### 1.2 Profile Page (FIX)

- [ ] **Edit contact info** — Currently only password change. Add form fields for: address, phone, nationality, emergency contact.
  - Update `ProfileUpdateSerializer` to include these fields
  - Update `backend/apps/accounts/views.py` `UpdateProfileView` to save to `Student` model too
  - Create the form UI in `profile/page.tsx`
- [ ] **Upload photo** — Add image upload widget to profile page.
  - Create `POST /profile/photo/` endpoint
  - Frontend: file input + preview + upload button
- [ ] **Display regulatory info** (read-only): license numbers, medical certificate expiry, student number, program, enrollment date. Currently none shown.

### 1.3 Documents Page (NEW)

SRS Phase 2 §8 specifies a full digital document folder.

- [ ] Create `web/app-single/app/student/documents/page.tsx`
- [ ] Sections/views:
  - [ ] **Administrative documents**: training contract, ID/passport, medical certificate, photos, payment receipts, parental authorization
  - [ ] **Pedagogical documents**: report cards, evaluations, flight reports, certificates, attestations
  - [ ] Filter by type/category
  - [ ] Search by document name
  - [ ] Download button (only for authorized document types)
  - [ ] Version number displayed
  - [ ] Status badge (approved/pending/expired)
- [ ] Add `GET /students/me/documents/` endpoint to `administration/views.py` `DocumentViewSet`
- [ ] Ensure `DocumentViewSet.get_queryset()` properly filters by student
- [ ] Add secure download with access control (check that student owns the document before serving file)

### 1.4 Payments / Invoices Page (NEW)

SRS Phase 2 §10: invoices, payments made, pending payments, remaining balance; download invoices as PDF.

- [ ] Create `web/app-single/app/student/payments/page.tsx`
- [ ] Sections:
  - [ ] **Invoices list**: invoice number, amount, status (badge), due date, download PDF button
  - [ ] **Payments made**: amount, date, method, reference, invoice link
  - [ ] **Summary cards**: total paid, pending amount, remaining balance
  - [ ] **Download invoice as PDF** — trigger `/api/invoices/{id}/pdf/`
- [ ] Add sidebar link to student layout (`layout.tsx` NAV items)
- [ ] Wire up all data from existing `/api/invoices/` and `/api/payments/` endpoints

### 1.5 Results Page (NEW)

SRS Phase 2 §9: theoretical grades/averages/history/pass rate, practical evaluations/reports/progression/competency validation.

- [ ] Create `web/app-single/app/student/results/page.tsx`
- [ ] Sections:
  - [ ] **Theoretical results**: table of all exams with date, subject, grade, pass/fail badge, attempt number
  - [ ] **Overall stats**: average grade, pass rate %, exams taken count
  - [ ] **Practical evaluations** (from `PracticalEvaluation` model): lesson type, competencies assessed, result, grade, instructor
  - [ ] **Competency matrix** (from `StudentCompetency` model): per-program, per-competency status (not started / in progress / acquired / needs reinforcement), visual progress bars or matrix grid
  - [ ] **Progress check history**: dates, examiners, results
  - [ ] **Skill test history**: dates, examiners, results

### 1.6 Notifications Page (NEW)

SRS Phase 2 §11: full notification center.

- [ ] Create `web/app-single/app/student/notifications/page.tsx`
- [ ] Features:
  - [ ] List all notifications with: icon by type, title, message, timestamp, read/unread indicator
  - [ ] Mark as read (click or "Mark all read" button)
  - [ ] Filter by type (course, flight, exam, payment, document)
  - [ ] Pagination
  - [ ] Notification bell icon in sidebar with unread count badge
- [ ] Add sidebar link to student layout

### 1.7 Messaging — Compose & Reply (FIX)

- [ ] Add compose message form to `web/app-single/app/student/messages/page.tsx`:
  - [ ] Recipient selector dropdown (filtered by roles: admin, CGI, CFI, GI, FI — fetch from `/users/?role=...`)
  - [ ] Subject field
  - [ ] Message body (textarea)
  - [ ] Send button → `POST /messages/`
- [ ] Add reply button on each message → pre-fills recipient field in compose modal
- [ ] Add "Sent Messages" tab (fetches from `GET /messages/sent/`)

### 1.8 Flight Training — Per-Flight Details (FIX)

- [ ] Add these fields to the student's flight log view (`FlightLogViewSet`):
  - [ ] Instructor name (currently missing)
  - [ ] Exercises completed
  - [ ] Competencies acquired
  - [ ] Difficulties/observations
- [ ] Display in `student/flights/page.tsx` table (additional columns)
- [ ] Add "Flight program" column (PPL/CPL/IR/MEP/MCC)
- [ ] Show flight program progress: completed lessons / total lessons, completed hours / required hours

### 1.9 Schedule — Missing Items (FIX)

- [ ] Add exams to student calendar (fetch `/exams/` and add as events)
- [ ] Add sim sessions to calendar (when simulator model exists)
- [ ] Add meetings/unavailability to calendar
- [ ] Add yearly view option

---

## P2: INSTRUCTOR PORTAL (SRS Phase 3 & 4)

### 2.1 CGI Dashboard (NEW)

SRS Phase 3 §3: dedicated dashboard for Chief Ground Instructor.

- [ ] Create a separate dashboard page or tab for CGI role with:
  - [ ] Total students count
  - [ ] Courses scheduled today
  - [ ] Available instructors (count + list)
  - [ ] Completed courses (this week/month)
  - [ ] Scheduled exams count
  - [ ] Overall pass rate (percentage)
  - [ ] Pedagogical alerts (students at risk, low attendance, failed exams)
  - [ ] Documents pending validation
  - [ ] Quick links to: manage subjects, schedule courses, manage instructors

### 2.2 CFI Dashboard (NEW)

SRS Phase 4 §3: dedicated dashboard for Chief Flight Instructor.

- [ ] Create a separate dashboard page/tab for CFI role with:
  - [ ] Flights today: scheduled / completed / cancelled counts
  - [ ] Sim sessions today (when simulator exists)
  - [ ] Students in progression count
  - [ ] Students ready for Progress Check
  - [ ] Students ready for Skill Test
  - [ ] Available instructors / aircraft / simulators
  - [ ] Aircraft in maintenance
  - [ ] Alerts: expiring medical certs, expiring instructor qualifications, upcoming maintenance, late progressions

### 2.3 Instructor Management (CGI) (NEW)

SRS Phase 3 §4: full CRUD for Ground Instructors.

- [ ] Create `web/app-single/app/instructor/manage/page.tsx` or add to admin
- [ ] Features:
  - [ ] List all ground instructors with: name, photo, qualifications, authorized subjects, status
  - [ ] Create instructor form (name, email, qualifications, authorized subjects, status)
  - [ ] Edit instructor
  - [ ] Suspend/reactivate
  - [ ] Per-instructor detail view: courses taught count, student count, pass rate, tenure, availability schedule

### 2.4 Instructor Management (CFI) (NEW)

SRS Phase 4 §4: full CRUD for Flight Instructors.

- [ ] Similar to 2.3 but for Flight Instructors
- [ ] Additional fields: license number, license expiry, medical expiry, aircraft type ratings, total instruction hours, student list
- [ ] Assign/reassign students to instructors

### 2.5 Subject Management — Missing Fields (FIX)

- [ ] Add to `Subject` model: `objectives` (TextField), `required_documents` (JSONField), `bibliography` (JSONField), `prerequisites` (ManyToMany to Subject or JSONField)
- [ ] Run migrations
- [ ] Create frontend subject management page (or enhance admin subjects page with these fields)

### 2.6 Module Management — Missing Content Types (FIX)

- [ ] Add video support to modules: `ModuleVideo` model (title, url, duration, order) or add `video_url` field to `ModuleLesson`
- [ ] Add exercises to modules: `ModuleExercise` model (title, instructions, due_date)
- [ ] Add quiz linking: `Module.quiz` FK to `Quiz` model
- [ ] Update frontend module viewer to show videos with embedded player, exercises list, quiz link

### 2.7 Exam Management in Instructor Portal (NEW)

SRS Phase 3 §9: instructors need to create and manage exams.

- [ ] Create frontend exam management pages (or use admin pages if accessible):
  - [ ] Create exam (code, title, subject, program, duration, question count, passing grade, max attempts, open/close dates)
  - [ ] Add questions to question bank (by subject, difficulty, type)
  - [ ] View student attempts and grades
  - [ ] Manual grading for written/essay questions
- [ ] Add backend endpoint for manual grading: `POST /exams/{id}/attempts/{attempt_id}/grade/` with `{grade, feedback}`

### 2.8 Course Cancellation & Rescheduling (NEW)

- [ ] Add cancel button on course detail view → `PATCH /courses/{id}/` with `{status: 'cancelled'}`
- [ ] Add reschedule flow: pick new date/time → `PATCH /courses/{id}/` with new `scheduled_date`, `start_time`, `end_time`
- [ ] Add reassign instructor button → `PATCH /courses/{id}/` with new `instructor`
- [ ] Add reassign room → `PATCH /courses/{id}/` with new `room`
- [ ] Audit log all changes (currently not wired)

### 2.9 Flight Cancellation & Rescheduling (NEW)

- [ ] Add cancel button on flight lesson → `PATCH /flight-lessons/{id}/` with `{status: 'cancelled'}`
- [ ] Add reschedule flow: pick new date/time → `PATCH /flight-lessons/{id}/`
- [ ] Add reassign instructor/aircraft → `PATCH /flight-lessons/{id}/`
- [ ] Send notifications on cancel/reschedule (student, FI, CFI)
- [ ] Audit log all changes

### 2.10 Ground Training Evaluation (NEW)

SRS Phase 3 §13: per-course evaluation.

- [ ] Create `GroundEvaluation` model:
  ```python
  class GroundEvaluation(models.Model):
      course = ForeignKey(Course, on_delete=CASCADE, related_name='evaluations')
      student = ForeignKey(Student, on_delete=CASCADE)
      grade = DecimalField(max_digits=4, decimal_places=1)
      appreciation = TextField(blank=True)
      module_validated = BooleanField(default=False)
      recommend_remedial = BooleanField(default=False)
      flagged = BooleanField(default=False)
      created_by = ForeignKey(User, on_delete=SET_NULL, null=True)
      created_at = DateTimeField(auto_now_add=True)
  ```
- [ ] Run migrations
- [ ] Create ViewSet + Serializer
- [ ] Add frontend: per-course evaluation form for instructors (grade, appreciation, validate module, recommend remedial, flag student)

### 2.11 Aircraft Management — Missing Docs (FIX)

- [ ] Add aircraft document management section:
  - [ ] `AircraftDocument` model (aircraft FK, document_type choices: registration/airworthiness/insurance/manual/equipment_list, file_url, expiry_date)
  - [ ] Admin frontend: upload/view documents per aircraft
  - [ ] Display document status on aircraft list (green check / red exclamation)

### 2.12 Flight Reports — Missing Fields (FIX)

- [ ] Add to flight report form: departure time, arrival time (separate from `flight_duration`)
- [ ] Add e-signature field on report: `signed_by_instructor` (boolean) and `signed_at` (datetime)
- [ ] Display e-signature on printed/flight report view

---

## P3: ADMIN PORTAL (SRS Phase 5)

You've already built 17 admin pages. These are the remaining gaps.

### 3.1 Simulator Management (NEW)

SRS Phase 5 §9 & Phase 6 §5. Entirely absent.

**Backend:**
- [ ] Create `Simulator` model:
  ```python
  class Simulator(models.Model):
      id = UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
      name = CharField(max_length=100)
      manufacturer = CharField(max_length=100, blank=True)
      model = CharField(max_length=100, blank=True)
      qualification_type = CharField(max_length=50)
      location = CharField(max_length=100, blank=True)
      status = CharField(max_length=20, default='available')
      last_maintenance = DateTimeField(null=True, blank=True)
      next_maintenance = DateTimeField(null=True, blank=True)
      created_at = DateTimeField(auto_now_add=True)
  ```
- [ ] Create `SimulatorSession` model:
  ```python
  class SimulatorSession(models.Model):
      id = UUIDField(primary_key=True)
      simulator = ForeignKey(Simulator, on_delete=CASCADE, related_name='sessions')
      student = ForeignKey(Student, on_delete=CASCADE)
      instructor = ForeignKey(FlightInstructor, on_delete=CASCADE)
      scheduled_date = DateTimeField()
      duration = DecimalField(max_digits=4, decimal_places=1)  # hours
      status = CharField(max_length=20, default='scheduled')
      notes = TextField(blank=True)
      created_at = DateTimeField(auto_now_add=True)
  ```
- [ ] Run migrations
- [ ] Create `SimulatorViewSet` + `SimulatorSessionViewSet`
- [ ] Register routes in `api_urls.py`
- [ ] Add to `StandardPagination`

**Frontend:**
- [ ] Create `web/app-single/app/admin/simulators/page.tsx` — CRUD with DataTable, create/edit modal, stats bar
- [ ] Create `web/app-single/app/admin/simulator-sessions/page.tsx` — list, filter by simulator/student/instructor/status
- [ ] Add to admin layout sidebar NAV items
- [ ] Add simulator sessions to calendar (student + instructor schedule pages)

### 3.2 Reports System (NEW)

SRS Phase 5 §14: student reports (enrollments/graduates/dropouts/suspensions), financial reports (revenue/payments/unpaid/forecasts), admin reports (missing/expired docs, user activity). Export to PDF and Excel.

**Backend:**
- [ ] Create `backend/apps/administration/reports.py` (or reuse `exports.py`):
  - [ ] `StudentReportView` — GET `/api/reports/students/` — returns aggregated data: total enrolled, by program, by status, new this month, graduates, dropouts, suspensions
  - [ ] `FinancialReportView` — GET `/api/reports/financial/` — revenue by month, payments by method, unpaid invoices total, forecast (average of last 3 months)
  - [ ] `AdminReportView` — GET `/api/reports/admin/` — docs expiring in 30/60/90 days, missing docs count, user activity (logins this week/month)
  - [ ] Each view returns JSON + triggers Excel download via `?format=xlsx` or `?format=pdf`
- [ ] Create Excel generation using `openpyxl` (already a dependency)
- [ ] Create PDF generation using `WeasyPrint` (already a dependency)

**Frontend:**
- [ ] Create `web/app-single/app/admin/reports/page.tsx`:
  - [ ] Tabs: Student Reports, Financial Reports, Admin Reports
  - [ ] Each tab has: summary cards + chart (Recharts) + export buttons (PDF, Excel)
  - [ ] Date range picker for filtering
- [ ] Add to admin layout sidebar NAV

### 3.3 Dashboard — Missing KPIs (FIX)

- [ ] Add training KPIs to admin dashboard:
  - [ ] Courses scheduled today — fetch from `/courses/?date=today`
  - [ ] Flights scheduled today — fetch from `/flight-lessons/?date=today`
  - [ ] Sim sessions today (when implemented)
- [ ] Add student breakdown: active / suspended / graduated / new this month
- [ ] Add applications breakdown: received / pending / accepted / rejected (fetch from `/applications/` stats)
- [ ] Add alerts panel:
  - [ ] Medical certs expiring soon (from `DeadlineMonitorService`)
  - [ ] Overdue invoices count + total amount
  - [ ] Missing docs count (students without required documents)
  - [ ] Upcoming deadlines (from quality dashboard endpoint)

### 3.4 Student Management — CRUD (FIX)

Currently `StudentViewSet` is read-only (`ReadOnlyModelViewSet`).

- [ ] Change to `ModelViewSet` (or add create/update actions)
- [ ] Add suspend/reactivate/close/archive actions:
  - `POST /students/{id}/suspend/`
  - `POST /students/{id}/reactivate/`
  - `POST /students/{id}/archive/`
  - `POST /students/{id}/close/`
- [ ] Add frontend buttons for these actions on the student detail/edit modal
- [ ] Add `main_instructor` (CGI) field display — model has it but is it shown in UI?

### 3.5 Instructor Management — CRUD (FIX)

Currently admin instructors page is read-only with "View in Django Admin" link.

- [ ] Add create instructor form (name, email, role, license, qualifications, status)
- [ ] Add edit instructor modal
- [ ] Add suspend/reactivate buttons
- [ ] Add instructor documents section (upload license, medical, contract, etc.)
- [ ] Add instructor availability view (backend `InstructorAvailability` model exists but no frontend)
- [ ] Remove the "View in Django Admin" fallback links once full CRUD is implemented

### 3.6 Room Management — Missing Features (FIX)

- [ ] Add edit room modal
- [ ] Add delete room button (with confirm dialog)
- [ ] Add room occupancy schedule view (timeline showing which courses use which room when)
- [ ] Link to `ResourceBooking` for scheduling

### 3.7 Aircraft Management — Missing Fields (FIX)

- [ ] Add insurance expiry date display (model has `insurance_expiry`)
- [ ] Add airworthiness cert expiry display (model has `certification_expiry`)
- [ ] Add maintenance history view (list of `MaintenanceRecord` entries per aircraft)
- [ ] Add scheduled maintenance calendar
- [ ] Add aircraft document management (see 2.11)

### 3.8 Financial Management — Missing Features (FIX)

- [ ] Add auto invoice generation on student enrollment (Celery task or signal)
- [ ] Add auto payment reminders (Celery task: check overdue invoices, send notification)
- [ ] Add student balance view (consolidated per student: total invoiced - total paid)
- [ ] Add payment schedule / installment plan support
- [ ] Add deposit/balance invoice types (currently all invoices are same type)

### 3.9 Contract Management — Missing Features (FIX)

- [ ] Add template-based contract generation (use `SystemSetting` to store contract template text, generate PDF with student data filled in)
- [ ] Add archive button for contracts
- [ ] Add renew workflow (creates new contract with updated dates, links to previous)

### 3.10 Communication Page (NEW)

SRS Phase 5 §13: central communication hub for admin.

- [ ] Create `web/app-single/app/admin/communication/page.tsx`:
  - [ ] Send notification to specific user (search/select user)
  - [ ] Broadcast to role (select role → send to all users with that role)
  - [ ] View sent communications history
  - [ ] Email option (when email infrastructure is ready)
- [ ] Backend: `POST /notifications/broadcast/` — takes `{role, title, message}` → creates notification for all users with that role
- [ ] Backend: `POST /notifications/send/` — takes `{user_id, title, message}` → creates notification + optionally sends email

### 3.11 System Settings — Missing UIs (FIX)

Currently only a generic key-value editor.

- [ ] Add dedicated UI sections:
  - [ ] **Academic Years** — list, create, set active (currently model exists, no UI)
  - [ ] **Training Programs** — enable/disable programs, set default parameters
  - [ ] **Document Types** — define available document categories and types
  - [ ] **Certificate Templates** — upload or edit certificate template HTML
  - [ ] **Contract Templates** — upload or edit contract template
  - [ ] **Billing Parameters** — set default currency, tax rate, payment terms, invoice format
  - [ ] **Notification Parameters** — configure which events trigger notifications, enable/disable email alerts
  - [ ] **Backup Configuration** — schedule auto-backups, retention period

### 3.12 Audit Log — Export (FIX)

- [ ] Add export button to audit log page: download as CSV/Excel

---

## P4: QUALITY & SAFETY PORTAL (SRS Phase 7)

### 4.1 Add Create/Edit Forms to All Pages (NEW)

Currently all quality pages (except Safety) are read-only lists with no create/edit functionality.

- [ ] **Audits page** (`quality/audits/page.tsx`):
  - [ ] Add "Create Audit" button → modal with: title, type (dropdown: internal/regulatory/supplier/pedagogical/safety), scope, scheduled date, lead auditor selector, auditor list
  - [ ] Add edit button on each row → same modal pre-filled
  - [ ] Add "Plan" action → sets status to planned, notifies lead auditor
  - [ ] Add "Execute" action → sets status to in_progress
  - [ ] Add "Complete" action → sets status to completed, auto-creates NCRs from findings
  - [ ] Add checklist items management within audit (add/remove checklist items, mark as pass/fail/na)
  - [ ] Add findings management within audit (add finding with severity, description, linked NCR)
- [ ] **NCRs page** (`quality/ncrs/page.tsx`):
  - [ ] Add "Create NCR" button → modal with: title, description, severity (critical/major/minor), source (audit/observation/complaint), responsible person, due date
  - [ ] Add edit button
  - [ ] Add "Close" action → requires root_cause, closes with timestamp
- [ ] **CAPAs page** (`quality/capas/page.tsx`):
  - [ ] Add "Create CAPA" button → modal with: type (corrective/preventive), title, description, linked NCR, responsible person, due date
  - [ ] Add edit button
  - [ ] Add "Close" action → requires closing_notes, sets validation_date
- [ ] **Risk Assessments page** (`quality/risks/page.tsx`):
  - [ ] Add create form → hazard, description, probability (1-5), severity (1-5), mitigation measures, responsible, review date
  - [ ] Add edit button
  - [ ] Auto-calculate risk level = P × S (backend already does this)
- [ ] **Safety Events page** (`quality/safety/page.tsx`): already has create modal — good
  - [ ] Add missing event types to dropdown: "dangerous situation", "operational error", "safety suggestion"
  - [ ] Add file attachment upload (model has `attachments` JSONField but no upload UI)
  - [ ] Add "Analyze" action (fills in `analysis` field)
  - [ ] Add edit button

### 4.2 Dashboard — Show Real KPIs (FIX)

Currently the dashboard page is a tabbed list view that doesn't render the KPI data the backend provides.

- [ ] Redesign `quality/dashboard/page.tsx` to show:
  - [ ] **Top row — summary cards**:
    - [ ] Audit completion rate (percentage + progress bar)
    - [ ] Open NCRs (count)
    - [ ] Overdue CAPAs (count + red if >0)
    - [ ] Safety events this month (count)
  - [ ] **Second row — charts**:
    - [ ] Risk distribution (5×5 matrix already exists — good)
    - [ ] NCRs by severity (pie chart)
    - [ ] Upcoming deadlines (timeline list)
  - [ ] **Third row — tabs** still present but collapsed by default (click to expand each list)
  - [ ] Overall compliance level gauge (percentage: audits done + CAPAs closed + NCs closed / total)

### 4.3 Fix Excel Export URLs (FIX)

Frontend references `/export/audits/`, `/export/non-conformities/`, `/export/capas/` but these have no backend.

- [ ] Create `backend/apps/quality_safety/exports.py`:
  - [ ] `ExportAuditsView` — `/api/export/audits/`
  - [ ] `ExportNCRsView` — `/api/export/non-conformities/`
  - [ ] `ExportCAPAsView` — `/api/export/capas/`
  - [ ] `ExportSafetyEventsView` — `/api/export/safety-events/`
  - [ ] `ExportRiskAssessmentsView` — `/api/export/risks/`
- [ ] Use openpyxl with same styling pattern as `administration/exports.py`
- [ ] Register routes in `config/api_urls.py`

### 4.4 Quality Document Serializer — Missing Fields (FIX)

- [ ] Add `author`, `approver`, `version_history` to `QualityDocumentSerializer` fields list
- [ ] Update quality documents frontend page to show columns: title, number, version, issue date, revision date, author, approver, status
- [ ] Add document upload form (currently only list view, no upload)

### 4.5 Deadline Monitoring — Frontend Display (NEW)

Backend `DeadlineMonitorService` collects all deadlines but the frontend never shows them.

- [ ] Add a "Deadlines" section/tab to quality dashboard or a dedicated page
- [ ] Display: item name, type (medical/license/audit/document/contract/maintenance), responsible person, due date, days remaining, priority (color-coded by urgency)
- [ ] Group by urgency: due this week / due this month / due next quarter

### 4.6 Safety Event — Analysis & Attachments (FIX)

- [ ] Add analysis form (textarea) to safety event detail/edit
- [ ] Add file attachment upload (multiple files) to safety event create/edit
- [ ] Add "Investigate" action → sets status to `investigating`
- [ ] Add "Resolve" action → sets status to `resolved`, sets `closed_at`

### 4.7 Audit — Type Enum Constraint (FIX)

- [ ] Change `Audit.type` from free-text `CharField` to `CharField(choices=[...])` with: internal, regulatory, supplier, pedagogical, safety
- [ ] Run migration

### 4.8 NCR — Unique Human-Readable Number (FIX)

- [ ] Add `ncr_number` field to `NonConformity` model (auto-generated like invoice numbers: `NCR-{year}-{seq:04d}`)
- [ ] Add `capa_number` to `CAPA` model similarly
- [ ] Run migrations
- [ ] Display in frontend tables

---

## P5: EXAMS, EVALUATIONS & CERTIFICATIONS (SRS Phase 8)

### 5.1 Exam Type Enum (FIX)

- [ ] Change `Exam.type` from free-text to `CharField(choices=ExamType.choices)`:
  ```python
  class ExamType(models.TextChoices):
      QUIZ = 'quiz', 'Quiz'
      PROGRESS_TEST = 'progress_test', 'Progress Test'
      MODULE_EXAM = 'module_exam', 'Module Exam'
      MOCK_EXAM = 'mock_exam', 'Mock Exam'
      FINAL_EXAM = 'final_exam', 'Final Internal Exam'
  ```
- [ ] Run migration
- [ ] Update frontend exam creation form to use this dropdown

### 5.2 Question Bank — Program & Module FK (FIX)

- [ ] Add `program` field to `QuestionBank` (FK or choices from `TrainingProgram`)
- [ ] Add `module` FK to `QuestionBank` (nullable)
- [ ] Add `question_type` choices: mcq, true_false, short_answer, essay, matching, ordering, case_study
- [ ] Run migrations
- [ ] Update question creation form in admin/exam pages

### 5.3 Manual Grading Workflow (NEW)

- [ ] Create backend endpoint: `POST /exams/{exam_id}/attempts/{attempt_id}/grade/`
  - Takes: `{grade, feedback, graded_by}`
  - Updates `ExamAttempt.score`, sets `graded_by` FK, triggers notification
- [ ] Create frontend page: instructor can view exam attempts requiring manual grading (non-MCQ questions), review answers, enter grade and feedback
- [ ] Add filter on exams page: "Needs Grading" tab showing attempts with `score IS NULL` and non-auto-gradable question types

### 5.4 Prerequisite Validation Before Exam Start (NEW)

- [ ] Add `prerequisites` JSONField to `Exam` model: `[{type: 'module', id: uuid}, {type: 'exam', id: uuid}, {type: 'hours', value: 45, unit: 'flight'}]`
- [ ] In `ExamViewSet.start()`, validate:
  - [ ] All prerequisite modules completed
  - [ ] All prerequisite exams passed
  - [ ] Minimum flight hours met (if flight exam)
  - [ ] Medical certificate valid
- [ ] Return 403 with specific reason if prerequisites not met
- [ ] Display prerequisite status on exam detail page (green check / red X per prerequisite)

### 5.5 Module Evaluation Model (NEW)

SRS Phase 8 §6: formal module-level evaluation.

- [ ] Create `ModuleEvaluation` model:
  ```python
  class ModuleEvaluation(models.Model):
      module = ForeignKey(Module, on_delete=CASCADE, related_name='evaluations')
      student = ForeignKey(Student, on_delete=CASCADE)
      instructor = ForeignKey(GroundInstructor, on_delete=SET_NULL, null=True)
      grade = DecimalField(max_digits=4, decimal_places=1)
      decision = CharField(max_length=20, choices=[('passed', 'Passed'), ('retake', 'Retake')])
      observations = TextField(blank=True)
      evaluated_at = DateTimeField(auto_now_add=True)
  ```
- [ ] Run migrations
- [ ] Create ViewSet + Serializer
- [ ] Create frontend page or section on course detail page: instructor can evaluate module completion

### 5.6 Competency Matrix — Status Choices & Frontend (FIX)

- [ ] Add status choices to `StudentCompetency.status`:
  ```python
  class CompetencyStatus(models.TextChoices):
      NOT_STARTED = 'not_started', 'Not Started'
      IN_PROGRESS = 'in_progress', 'In Progress'
      ACQUIRED = 'acquired', 'Acquired'
      NEEDS_REINFORCEMENT = 'needs_reinforcement', 'Needs Reinforcement'
  ```
- [ ] Run migration
- [ ] Create frontend competency matrix page/component:
  - [ ] Per-program view showing all competencies with status badges
  - [ ] Color-coded: red=not started, yellow=in progress, green=acquired, orange=needs reinforcement
  - [ ] Instructor can update competency status
  - [ ] Student can view (read-only)

### 5.7 Certificate — Populate All Fields (FIX)

- [ ] In `CertificateService.issue_certificate()`:
  - [ ] Save `file_url` after PDF generation (currently PDF is generated but URL not saved)
  - [ ] Save `qr_code` data
  - [ ] Populate `signed_by` with authorized person (from system settings or passed parameter)
- [ ] Add actual digital signature to PDF (not just a blank line):
  - [ ] Upload signature image via system settings
  - [ ] Include signature image in PDF render

### 5.8 Certificate Types — Attendance & Transcript (NEW)

- [ ] Add attendance certificate generation: `POST /certificates/generate-attendance/{student_id}/` — creates certificate of attendance for a course/module
- [ ] Add transcript generation: `POST /certificates/generate-transcript/{student_id}/` — creates comprehensive training history document with all exam results, evaluations, and hours
- [ ] Add training history certificate: similar to transcript but formatted as a formal document

### 5.9 Wire Up Notifications (FIX)

- [ ] Call `NotificationService.exam_result()` from `ExamViewSet.submit()` (currently defined but never called)
- [ ] Call `NotificationService.certificate_issued()` from exam-pass auto-issuance (currently only called from skill test)
- [ ] Add notification for "exam opened/published"
- [ ] Add notification for "exam failed, retake available"
- [ ] All notifications should optionally send email when email infrastructure is ready (see 0.4)

### 5.10 Exam Reports (NEW)

- [ ] Create backend exam report endpoints:
  - [ ] `GET /api/reports/exams/pass-rates/` — pass rate by program, by subject, by instructor
  - [ ] `GET /api/reports/exams/results/` — detailed results across all exams
  - [ ] `GET /api/reports/exams/certifications/` — certificates issued by month, by type
- [ ] Export to Excel and PDF
- [ ] Create frontend page in admin reports (tied to 3.2)

### 5.11 Academic History Page (NEW)

- [ ] Create `web/app-single/app/student/history/page.tsx`:
  - [ ] Fetch from a new unified endpoint: `GET /api/students/me/history/`
  - [ ] Display chronological timeline of all academic events:
    - Exams taken (date, subject, grade, pass/fail)
    - Modules completed (date, module name, instructor)
    - Flight evaluations (date, lesson, instructor, grade)
    - Progress checks (date, examiner, result)
    - Skill tests (date, examiner, result)
    - Certificates issued (date, type, download link)
  - [ ] Filters by date range and event type
  - [ ] Search by keyword

---

## P6: FLEET, SCHEDULING & RESOURCES (SRS Phase 6)

### 6.1 Simulator (Covered in 3.1)

All simulator items from Phase 6 are the same as Phase 5. Implement 3.1 first.

### 6.2 Central Calendar — Missing Items (FIX)

- [ ] Add exams to instructor calendar (fetch `/exams/`)
- [ ] Add sim sessions to instructor calendar (when simulator exists)
- [ ] Add instructor unavailability (fetch `/instructor-availability/` and show as blocked time)
- [ ] Add student unavailability to student calendar
- [ ] Add annual view option
- [ ] Color-code by resource type (flight=blue, course=gold, sim=purple, exam=red, unavailable=gray)

### 6.3 Booking Engine Enhancements (FIX)

- [ ] Add rest-time check for instructors: minimum 12 hours between lessons
- [ ] Add aircraft document validity check before booking (airworthiness, insurance not expired)
- [ ] Add student prerequisite check at booking time (medical valid, required prior lessons completed)
- [ ] Create a dedicated `BookingService` class that runs ALL checks before confirming any booking

### 6.4 Fleet & Resource Reports (NEW)

Tied to 3.2 Reports System. Add these specific views:

- [ ] `GET /api/reports/fleet/aircraft-usage/` — hours per aircraft per month, usage rate %, downtime
- [ ] `GET /api/reports/fleet/instructor-utilization/` — hours taught per instructor, workload %, availability
- [ ] `GET /api/reports/fleet/room-occupancy/` — courses per room, occupancy rate
- [ ] Frontend: fleet tab in reports page with charts (bar charts for aircraft hours, pie for instructor workload)

### 6.5 Decision Dashboard for HT (NEW)

SRS Phase 6 §14: Head of Training needs a dedicated dashboard.

- [ ] Create or extend director dashboard with:
  - [ ] Resource availability overview (aircraft: X available / Y total; simulators: X/Y; instructors: X/Y; rooms: X/Y)
  - [ ] Instructor workload chart (bars per instructor: hours this week/month)
  - [ ] Fleet usage trend (line chart: hours flown per week over last 3 months)
  - [ ] Activity forecast (next week's scheduled flights/courses/sims vs this week)
  - [ ] Operational alerts panel: conflicts detected, maintenance overdue, resources near capacity

---

## P7: CROSS-CUTTING POLISH

### 7.1 Loading States

- [ ] Verify every page has loading skeletons (not just text "Loading...")
- [ ] All modals show loading spinner during API calls
- [ ] All buttons disable and show spinner during submission

### 7.2 Error Handling

- [ ] Every API call has try/catch with user-friendly error message
- [ ] Network errors show "Connection error. Check your connection." not raw error text
- [ ] 403 errors show "You don't have permission to access this."
- [ ] 404 errors show "The requested resource was not found."
- [ ] All forms show inline validation errors (already mostly done with Zod)
- [ ] `ErrorCard` component is used consistently on all pages

### 7.3 Empty States

- [ ] Every list page has an `EmptyState` when no data: illustration + message + action button
- [ ] Examples: "No applications yet. When students submit applications, they'll appear here." + "Learn More" button

### 7.4 i18n Completeness

- [ ] Verify every hardcoded string in every page uses `t()` or inline locale map
- [ ] Check all 3 locales (EN/FR/AR) have matching keys
- [ ] Specifically add these missing keys:
  - [ ] All `admin.*` keys in FR and AR (verify they exist — admin keys were likely only added to EN)
  - [ ] All new page keys for documents, payments, results, notifications, reports, simulators
  - [ ] RTL layout support for Arabic (sidebar/nav flipped, text alignment)
- [ ] Search for any remaining English strings in FR/AR locale sections that should be translated

### 7.5 Mobile Responsiveness

- [ ] Check all admin pages on mobile viewport (320px width)
- [ ] DataTables should scroll horizontally on small screens
- [ ] Modals should be full-screen on mobile
- [ ] Sidebar should have hamburger toggle on mobile (like student portal layout)
- [ ] All portal layouts should be consistent: some have mobile hamburger (student), some don't (director)

### 7.6 SEO / Public Pages

- [ ] Landing page: meta tags, Open Graph tags, structured data (JSON-LD for Organization + TrainingProgram)
- [ ] Verify certificate page: meta description for social sharing
- [ ] Login pages: noindex tags

### 7.7 Performance

- [ ] All list pages with >50 rows need pagination (verify `StandardPagination` is applied to all ViewSets)
- [ ] Large JSON payloads (audit logs, notifications) need server-side pagination + frontend lazy loading
- [ ] Dashboard pages should cache KPI data with TanStack Query staleTime (reduce API calls)

### 7.8 Security — Final Pass

- [ ] All ViewSets have `permission_classes = [IsAuthenticated, HasRolePermission]` and `required_permission`
- [ ] `get_queryset()` filters by user role where applicable (students see own data only)
- [ ] File uploads validate MIME type and file size
- [ ] No debug endpoints or hardcoded secrets in code
- [ ] CORS configured for production
- [ ] Rate limiting enabled on auth endpoints (check throttle classes are applied to login)

### 7.9 Documentation

- [ ] Update `architecture.md` to reflect actual implementation (middleware, next-intl vs custom, api_urls format)
- [ ] Add API documentation (drf-spectacular or manual)
- [ ] Add deployment runbook in README
- [ ] Add admin user guide (how to use each portal, common tasks)

---

## SUMMARY: COUNT BY CATEGORY

| Priority | Area | Items |
|----------|------|-------|
| P0 | Architecture & Infrastructure | 5 |
| P1 | Student Portal | 9 (sections) |
| P2 | Instructor Portal | 12 (sections) |
| P3 | Admin Portal | 12 (sections) |
| P4 | Quality & Safety | 8 (sections) |
| P5 | Exams & Certifications | 11 (sections) |
| P6 | Fleet & Scheduling | 5 (sections) |
| P7 | Cross-Cutting Polish | 9 (sections) |
| **Total** | | **~71 sections** |

Each section contains 2–15 individual checkbox items. Rough estimate: **~300–400 individual tasks** to reach 100%.
