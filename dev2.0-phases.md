# MASTERLY AIR ACADEMY — Development Plan 2.0

> **What this covers:** Everything missing, broken, or unfinished after Sprints 1-10.
> **What it does NOT redo:** Auth, RBAC, database models, CRUD APIs, core portal pages.
> **Reference:** `architecture.md` §2 (Tech Stack), §6 (API), §10 (i18n).

---

## Sprint 2.1 — Visual Polish: Charts, Calendar, Admin Theme

> **Goal:** Dashboards with actual charts, schedule calendar, modern admin UI.

### 2.1.1 Install Missing Frontend Dependencies

```bash
npm install recharts @fullcalendar/core @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @tanstack/react-query
```

### 2.1.2 Add Charts to All Dashboards

| Dashboard | Charts to Add |
|-----------|--------------|
| Student | Flight hours over time (line), competency radar (radar) |
| Instructor | Flight hours this month (bar), student progress (line) |
| Finance | Revenue over time (area), invoice status distribution (pie) |
| Director | Fleet utilization (bar), student enrollment trend (line), revenue vs cost (bar) |
| Quality | NCRs by severity (pie), audit completion rate (gauge) |

### 2.1.3 Install django-unfold for Modern Admin

- Add `django-unfold>=0.80` to requirements.txt
- Configure UNFOLD settings with navy/gold colors
- Update all admin.py to use `unfold.admin.ModelAdmin`
- Verify dark mode, search, collapsible sidebar

### 2.1.4 Add FullCalendar to Instructor + Student Portals

- Create `/instructor/schedule` page with FullCalendar showing flights + courses
- Create `/student/schedule` page with read-only calendar
- Color-code: flights = blue, courses = gold, exams = green
- Click event → open detail modal

### 2.1.5 Verification

- [ ] All 5 dashboards show at least one chart
- [ ] Django Admin has unfold theme with navy/gold colors
- [ ] Calendar loads events from `/api/flight-lessons/` and `/api/courses/`
- [ ] Calendar events are clickable with details

---

## Sprint 2.2 — Student Management + Notifications

> **Goal:** Instructors can manage their students. Notification bell with real data.

### 2.2.1 Instructor Student List Page

- Create `/instructor/students` — table of assigned students
- Columns: name, program, flight hours, attendance rate, last flight date
- Search and filter by program, status
- Click student → expand with progress summary

### 2.2.2 Notification Bell Component

- Create `components/notification-bell.tsx`
- Bell icon with unread count badge
- Dropdown showing last 10 notifications
- Click to mark as read
- Create `/api/notifications/` endpoint (DRF ViewSet)
- Add notification triggers: exam graded, invoice due, flight scheduled, NCR assigned

### 2.2.3 Messages Inbox

- Create `/instructor/messages` and `/student/messages`
- Simple inbox with sender, subject, date, read status
- Compose new message (select recipient from users)
- API endpoints: GET/POST `/api/messages/`

### 2.2.4 Verification

- [ ] Instructor sees student list at `/instructor/students`
- [ ] Notification bell appears on all authenticated pages
- [ ] Notifications created automatically on key events
- [ ] Messages can be sent between users

---

## Sprint 2.3 — File Upload, Search, Excel Export

> **Goal:** Document upload to MinIO, Meilisearch wired up, Excel reports.

### 2.3.1 MinIO Document Upload

- Configure Django DEFAULT_FILE_STORAGE for MinIO via `django-storages`
- Create file upload endpoint: POST `/api/documents/upload/`
- Frontend upload component with drag-and-drop
- File type validation, size limits
- Thumbnail preview for images

### 2.3.2 Meilisearch Integration

- Install `django-meilisearch-index` or configure `meilisearch` client
- Index models: Student, Course, Aircraft, Exam, Invoice
- Add search endpoint: GET `/api/search/?q=query`
- Search bar in Django Admin and instructor portal

### 2.3.3 Excel Export

- Add openpyxl to requirements.txt
- Create export endpoints:
  - `GET /api/reports/students/export/` — student list as XLSX
  - `GET /api/reports/financial/export/` — invoice/payment history
  - `GET /api/reports/flights/export/` — flight log export
- Download buttons on relevant pages

### 2.3.4 Verification

- [ ] Upload a PDF via documents API, verify it's in MinIO bucket
- [ ] Search for a student by name via `/api/search/`
- [ ] Download student list as Excel file from admin

---

## Sprint 2.4 — i18n Depth, Zod Validation, Polish

> **Goal:** Translate model fields, validate frontend forms, remaining polish.

### 2.4.1 Model Field Translations

- Install `django-modeltranslation`
- Register translatable models: Subject (title, description), Exam (title)
- Update admin to show all language fields
- Update serializers to return locale-aware translations
- Run migration to add `_fr`, `_ar` columns

### 2.4.2 Zod Validation in Frontend Forms

- Import Zod schemas from `shared/validators/` into all forms
- Validate before API call: login, course creation, flight scheduling, invoice, exam submission
- Show field-level error messages

### 2.4.3 Translate Internal Pages

- Add translation keys for:
  - Login page (email, password, sign in, errors)
  - Student dashboard labels
  - Instructor dashboard labels
  - Exam interface (timer, submit, results)

### 2.4.4 Missing Backend Files

- Create `apps/core/middleware.py` — request logging middleware
- Create `apps/core/pagination.py` — standard DRF pagination class
- Create `apps/notifications/views.py` — NotificationViewSet
- Create `apps/notifications/serializers.py` — NotificationSerializer

### 2.4.5 Verification

- [ ] Switch to French, see subject titles in French in admin and API
- [ ] Submit a login form with empty email, see Zod error
- [ ] All internal page labels appear in selected language
- [ ] Notifications API returns paginated results

---

## Sprint 2.5 — Celery Beat, PDF Testing, Security Hardening

> **Goal:** Scheduled tasks working, PDFs tested end-to-end, security review.

### 2.5.1 Celery Beat Scheduled Tasks

- Install `django-celery-beat`
- Schedule periodic tasks:
  - Daily: check for overdue invoices, update status
  - Daily: check for expiring medical certificates, send notification
  - Weekly: generate weekly attendance report
  - Monthly: generate monthly revenue report

### 2.5.2 PDF Generation Testing

- Test certificate PDF generation: correct branding, student name, QR code
- Test invoice PDF: correct amounts, payment history table
- Add download buttons on certificate list and invoice pages
- Fix WeasyPrint in Docker (install system deps: libpango, libcairo, etc.)

### 2.5.3 Security Hardening

- Review all endpoints for correct permission classes
- Remove `Access-Control-Allow-Origin: *` if present
- Add `SECURE_HSTS_SECONDS` for production
- Ensure all file uploads have size + type validation
- Review audit log coverage (are all mutations logged?)

### 2.5.4 TanStack Query Migration

- Replace manual `fetch()` + `useState` with `useQuery` / `useMutation`
- Add loading states, error handling, cache invalidation
- Apply to: student dashboard, instructor dashboard, finance, exams

### 2.5.5 Final Verification

- [ ] Celery Beat schedules visible in Django Admin
- [ ] Certificate PDF downloads with correct data
- [ ] Invoice PDF shows all payments and balance
- [ ] Security scan passes: no open CORS, proper throttling
- [ ] TanStack Query caching reduces API calls on navigation

---

## MoSCoW Summary

| Category | Features |
|----------|----------|
| **Must Have** | Charts on dashboards, calendar, django-unfold, notifications, student list, MinIO upload |
| **Should Have** | Messages, Excel export, model translations, Zod validation, Celery beat |
| **Could Have** | Meilisearch search, TanStack Query migration, remaining i18n polish |

---

*Plan based on gap analysis of architecture.md vs built platform*
*Estimated: 5 sprints, ~2 weeks of focused work*
