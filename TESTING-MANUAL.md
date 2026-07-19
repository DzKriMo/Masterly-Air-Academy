# MASTERLY AIR ACADEMY — Client Testing Manual

> **Version:** 1.0 — July 2026
> **URL:** `http://185.185.80.188:7788`
> **Test Credentials:** Listed per role below

---

## Table of Contents

1. [Quick Start — Test Accounts](#1-quick-start)
2. [Landing Page & Public Features](#2-landing-page)
3. [Student Portal](#3-student-portal)
4. [Instructor Portal](#4-instructor-portal)
5. [CGI & CFI Dashboards](#5-cgi--cfi-dashboards)
6. [Admin Portal](#6-admin-portal)
7. [Quality & Safety Portal](#7-quality--safety-portal)
8. [Finance Portal](#8-finance-portal)
9. [Director Portal](#9-director-portal)
10. [Cross-Cutting Features](#10-cross-cutting)
11. [Mobile & iPad Testing](#11-mobile--ipad)
12. [Validation Checklist](#12-validation-checklist)

---

## 1. Quick Start — Test Accounts

| Role | Email | Password | Portal |
|------|-------|----------|--------|
| Student | `ahmed@student.maa.dz` | `student123` | `/student/login` |
| Flight Instructor | `fi@masterly.dz` | `admin123` | `/login` |
| Chief Flight Instructor | `cfi@masterly.dz` | `admin123` | `/login` |
| Chief Ground Instructor | `cgi@masterly.dz` | `admin123` | `/login` |
| System Admin | `admin@masterly.dz` | `admin123` | `/login` |
| Quality Manager | `qm@masterly.dz` | `admin123` | `/login` |
| Finance Responsible | `finance@masterly.dz` | `admin123` | `/login` |
| Director General | `dg@masterly.dz` | `admin123` | `/login` |

*If any account doesn't work, use `admin@masterly.dz` to create users via `/admin/users`.*

---

## 2. Landing Page & Public Features

### 2.1 Landing Page
**URL:** `http://185.185.80.188:7788/`

- [x] Page loads with navy/gold design
- [x] Hero section shows logo, tagline, "Explore Programs" and "Contact Us" buttons
- [x] Programs section (PPL, CPL, IR, MEP, MCC) with duration and prerequisites
- [x] About Us section with academy information
- [x] Why Us section with 3 feature cards
- [x] Language switcher (EN/FR/AR) in bottom-right corner — switch and verify page translates
- [x] **NEW: Contact/Application form** at bottom of page
  - [x] "General Inquiry" tab: fill name, email, phone, subject, message → Submit
  - [x] "Apply Now" tab: fill name, email, phone, select program, message → Submit
  - [x] Success message appears after submission
  - [x] Admin receives notification (log in as admin to verify)

### 2.2 Certificate Verification
**URL:** `http://185.185.80.188:7788/verify-certificate?number=CERT-A897199A`

- [x] Page loads without login required (public)
- [x] Shows "Verified" badge with green checkmark
- [x] Shows certificate details: student name, certificate number, issue date, program, status
- [x] QR code displayed
- [x] Try an invalid number: `?number=INVALID` → shows "Not Found"

---

## 3. Student Portal

**Login:** `http://185.185.80.188:7788/student/login` — `ahmed@student.maa.dz` / `student123`

### 3.1 Dashboard
- [x] Sidebar with 12 nav items: Dashboard, Exams, Flight Log, My Courses, Schedule, Certificates, Messages, Profile, Documents, Payments, Results, History, Notifications
- [x] Welcome message with student name
- [x] Stat cards: Flight Hours, Lessons Completed, Exam Average, Unpaid Invoices
- [x] Flight hours line chart
- [x] Competencies radar chart
- [x] Progress bars (Theory/Flight %)
- [x] Next Milestones (First Solo, Cross-Country, License Ready)
- [x] Recent Activity timeline
- [ ] Expiring documents warning (if any) DIDNT HAVE ONE TO CHECK WITH

### 3.2 Flight Log (`/student/flights`)
- [x] Summary cards: Total Hours, Lessons Completed, Avg per Lesson
- [x] FilterBar with status filter + search
- [x] DataTable: Date, Aircraft, Duration, Grade
- [x] "Download Logbook PDF" button — generates PDF with flight history
- [ ] All filters work correctly BROKEN FILTER/SEARCH

### 3.3 My Courses (`/student/courses`)
- [x] Lists enrolled courses with subject code, status, date/time, room
- [x] Click course → detail page with modules, lessons, documents
- [x] **NEW: Lesson viewer** — click "Open Lesson" → renders markdown content beautifully
- [ ] **NEW: Video player** — if lesson has video_url, shows embedded YouTube/Vimeo player THERE IS NO OPTION FOR A URL WHEN ADDING A LESSON SO COULDNT TEST

### 3.4 Schedule (`/student/schedule`)
- [x] FullCalendar with week/month/year views
- [x] Flights in blue, courses in gold, exams in purple
- [x] Legend showing color codes
- [x] Click events to see details CLICKING DOES NOTHING
- [x] **NEW: Year view** (multiMonthYear) works

### 3.5 Exams (`/student/exams`)
- [x] Available exams list with attempt limits
- [x] Click exam → start exam page with countdown timer
- [x] Answer questions, submit → results with per-question breakdown
- [x] Anti-cheat: switch tabs → warning (1 warning then auto-submit)
- [x] Past attempts/results list below

### 3.6 Certificates (`/student/certificates`)
- [x] Lists all earned certificates with QR codes
- [x] "Download PDF" button per certificate
- [x] "Verify" link → opens verification page
- [x] Export button for all certificates 

### 3.7 Messages (`/student/messages`)
- [x] Inbox showing received messages with unread indicator
- [x] **NEW: "Compose" button** → modal with recipient selector, subject, body COMPOSE IS THERE BUT RECEIPIENTS LIST IS EMPTY
- [ ] **NEW: "Reply" button** on each message → pre-fills recipient DIDNT WORK THIS IN CONSOLE Failed to load resource: the server responded with a status of 404 (Not Found)
:7788/api/users/?role=admin&role=instructor:1  Failed to load resource: the server responded with a status of 403 (Forbidden)
:7788/api/messages/:1  Failed to load resource: the server responded with a status of 400 (Bad Request)
- [x] **NEW: "Sent" tab** showing sent messages

### 3.8 Profile (`/student/profile`)
- [x] Account info display (name, email, role)
- [x] Change password form
- [ ] **NEW: Contact info fields** (address, phone, nationality) MISSING
- [ ] **NEW: Photo upload** — upload a profile photo MISSING

### 3.9 NEW PAGES — Verify each:

**Documents (`/student/documents`)**
- [x] Lists personal documents with type, category, status, download button
- [x] FilterBar with type/category filters
- [x] Empty state when no documents

**Payments (`/student/payments`)**
- [x] Summary cards: Total Invoiced, Total Paid, Outstanding Balance
- [x] Invoices table with status badges, download PDF button
- [x] Payments table with amount, method, date

**Results (`/student/results`)**
- [x] Tab switcher: Theory | Practical | Competencies
- [x] Theory tab: exam attempts with score, pass/fail, date
- [x] Practical tab: flight evaluations with grade, result, instructor
- [x] **NEW: Competencies tab** — matrix grid (programs × competencies) with color-coded status badges

**Notifications (`/student/notifications`)**
- [x] Full list with type icons, read/unread indicators
- [x] Type filter + search
- [x] "Mark all read" button MISSING
- [x] Click notification → shows detail + marks as read DOESNT MARK AS RREAD
- [ ] Unread count badge in sidebar MISSING

**History (`/student/history`)**
- [ ] Timeline with color-coded events (exams=blue, progress checks=gold, skill tests=purple, certificates=green)
- [ ] FilterBar: type filter + search
- [ ] Chronological order (newest first)

**Medical (`/student/medical`)**
- [ ] Shows medical certificates with status, dates MEDICAL BUTTON MISSING IN THE SIDEBAR
- [ ] Expiry warnings for certificates expiring within 30 days COULDNT TEST FOR NOW AS IT IS EMPTY

### 3.10 Inactivity Auto-Logout
- [x] Stay idle for 30 minutes (or wait) → warning modal appears with countdown
- [x] Click "I'm still here" → timer resets
- [x] Let countdown reach 0 → auto-logout to login page

---

## 4. Instructor Portal

**Login:** `http://185.185.80.188:7788/login` — `fi@masterly.dz` / `admin123`

### 4.1 Dashboard
- [x] Stats: Total Courses, Today's Courses, Active Students PARTIAL PASS ACTIVE STUDENT NUMBER MISSING
- [x] Courses by Status bar chart
- [x] Courses by Subject pie chart
- [x] Today's schedule list

### 4.2 My Courses (`/instructor/courses`)
- [x] Course list with DataTable, FilterBar
- [ ] **NEW: Create Course** → ModalForm with subject, title, date, time, room NOT WORKING (INVALID INPUT :7788/api/courses/:1  Failed to load resource: the server responded with a status of 400 (Bad Request)
:7788/api/courses/:1  Failed to load resource: the server responded with a status of 400 (Bad Request))
- [ ] **NEW: Cancel button** → ConfirmDialog → changes status to cancelled NOT WORKING (INVALID INPUT layout-6761222035435647.js:1  PATCH http://185.185.80.188:7788/api/courses/6c780f92-d6e9-4bc8-9887-40a0959fbb24/ 400 (Bad Request))
- [ ] **NEW: Reschedule button** → ModalForm with new date/time NOT WORKING (INVALID INPUT layout-6761222035435647.js:1  PATCH http://185.185.80.188:7788/api/courses/6c780f92-d6e9-4bc8-9887-40a0959fbb24/ 400 (Bad Request))
- [x] Attendance button per course → opens attendance page
- [ ] Export button in header NOT WORKING page-66229abd7d153cac.js:1  GET http://185.185.80.188:7788/api/courses/export/pdf/ 404 (Not Found)
c @ page-66229abd7d153cac.js:1
onClick @ page-66229abd7d153cac.js:1
i8 @ 4bd1b696-100b9d70ed4e49c1.js:1
(anonymous) @ 4bd1b696-100b9d70ed4e49c1.js:1
nz @ 4bd1b696-100b9d70ed4e49c1.js:1
sn @ 4bd1b696-100b9d70ed4e49c1.js:1
cc @ 4bd1b696-100b9d70ed4e49c1.js:1
ci @ 4bd1b696-100b9d70ed4e49c1.js:1
page-66229abd7d153cac.js:1 Export error: Error: Export failed
    at c (page-66229abd7d153cac.js:1:397)
    page-66229abd7d153cac.js:1  GET http://185.185.80.188:7788/api/courses/export/excel/ 404 (Not Found)
c @ page-66229abd7d153cac.js:1
onClick @ page-66229abd7d153cac.js:1
i8 @ 4bd1b696-100b9d70ed4e49c1.js:1
(anonymous) @ 4bd1b696-100b9d70ed4e49c1.js:1
nz @ 4bd1b696-100b9d70ed4e49c1.js:1
sn @ 4bd1b696-100b9d70ed4e49c1.js:1
cc @ 4bd1b696-100b9d70ed4e49c1.js:1
ci @ 4bd1b696-100b9d70ed4e49c1.js:1
page-66229abd7d153cac.js:1 Export error: Error: Export failed
    at c (page-66229abd7d153cac.js:1:397)

### 4.3 Attendance (`/instructor/courses/[id]/attendance`)
- [x] Student list with status toggle (present → late → absent → excused)
- [x] "All Present" / "All Absent" bulk buttons
- [x] Date picker
- [x] Save Attendance → success toast
- [x] Download Attendance PDF → opens PDF in new tab

### 4.4 Flight Schedule (`/instructor/flights`)
- [x] Flight list with DataTable, FilterBar
- [ ] **NEW: Create Flight** → ModalForm with student, aircraft, date/time CHANGE THE STUDENT ID TO A SEARCH LIKE THE SEND TO USER IN THE ADMIN COMMUNICATION + NOT WORKING 
﻿
:7788/api/flight-lessons/:1 
 Failed to load resource: the server responded with a status of 400 (Bad Request)
- [ ] **NEW: Cancel button** → ConfirmDialog NOT WORKING layout-6761222035435647.js:1  PATCH http://185.185.80.188:7788/api/flight-lessons/cc1c8741-fbbc-4e8c-a5dd-8955c5f7f443/ 500 (Internal Server Error)
- [ ] **NEW: Reschedule button** → ModalForm with new date/time/aircraft NOT WORKING layout-6761222035435647.js:1  PATCH http://185.185.80.188:7788/api/flight-lessons/bb7aed3f-379f-4959-a207-43052179d73c/ 500 (Internal Server Error)
- [x] Prep button (for scheduled flights) → pre-flight briefing form
- [x] Evaluate button → post-flight evaluation form
- [ ] Export button NOT WORKING page-19633129adb23f08.js:1  GET http://185.185.80.188:7788/api/flight-lessons/export/pdf/ 404 (Not Found)
c @ page-19633129adb23f08.js:1
onClick @ page-19633129adb23f08.js:1
i8 @ 4bd1b696-100b9d70ed4e49c1.js:1
(anonymous) @ 4bd1b696-100b9d70ed4e49c1.js:1
nz @ 4bd1b696-100b9d70ed4e49c1.js:1
sn @ 4bd1b696-100b9d70ed4e49c1.js:1
cc @ 4bd1b696-100b9d70ed4e49c1.js:1
ci @ 4bd1b696-100b9d70ed4e49c1.js:1
page-19633129adb23f08.js:1 Export error: Error: Export failed
    at c (page-19633129adb23f08.js:1:397)

### 4.5 Flight Preparation (`/instructor/flights/[id]/prep`)
- [ ] Checkboxes: Weather, NOTAM, Performance, Documents, Medical
- [ ] Lesson objectives textarea, briefing notes
- [ ] Submit → preparation recorded

### 4.6 Flight Evaluation (`/instructor/flights/[id]/evaluate`)
- [ ] Duration, grade (0-10), result (passed/failed/partial)
- [ ] Exercises completed, competencies acquired (comma-separated)
- [ ] Difficulties, observations, recommendations
- [ ] **NEW: Departure/Arrival time** fields
- [ ] **NEW: "Signed by Instructor" checkbox**
- [ ] **NEW: "Authorize Solo Flight" button** (if grade >= 7 + 15+ hours)
- [ ] Submit → evaluation saved, notification sent to student

### 4.7 My Students (`/instructor/students`)
- [ ] Student cards/grid with search
- [ ] Shows name, student number, program, status

### 4.8 Messages (`/instructor/messages`)
- [ ] Inbox/Sent/Compose tabs
- [ ] Compose with student recipient selector
- [ ] Reply functionality

### 4.9 Module Content (`/instructor/modules`)
- [ ] Subject selector buttons
- [ ] Expandable modules with lessons and documents
- [ ] **NEW: Structured lesson editor** — click "Add Lesson" → 
  - [ ] + Section (H₂), + Subsection (H₃), + Paragraph, + List, + Note buttons
  - [ ] Each block has move up/down, remove
  - [ ] Preview toggle to see rendered markdown
  - [ ] Create Lesson → saves to module
- [ ] Document upload form (file + name)
- [ ] View button on lessons → opens student viewer

### 4.10 Schedule (`/instructor/schedule`)
- [ ] FullCalendar with flights (blue), courses (gold), exams (purple), sim sessions (orange)
- [ ] Week/month/year views
- [ ] Legend showing all 4 types

### 4.11 Progress Checks (`/instructor/flights/progress-check`)
- [ ] DataTable with status, student, examiner
- [ ] Schedule Check button → ModalForm
- [ ] Validate button per check

### 4.12 Skill Tests (`/instructor/flights/skill-test`)
- [ ] DataTable with status filter
- [ ] Authorize button → ModalForm
- [ ] Complete button → result, observations, recommendations
- [ ] Pass → auto-generates certificate notification

---

## 5. CGI & CFI Dashboards

**CGI Login:** `cgi@masterly.dz` / `admin123`
**CFI Login:** `cfi@masterly.dz` / `admin123`

### 5.1 CGI Dashboard (`/instructor/cgi-dashboard`)
*Note: This is automatically loaded for CGI role. Verify:*
- [ ] Stats: Total Students, Today's Courses, Available Instructors, Pass Rate
- [ ] Alerts panel: students at risk, failed exams
- [ ] Quick actions: Schedule Course, Manage Subjects, Manage Instructors
- [ ] Charts + Today's Schedule

### 5.2 CFI Dashboard (`/instructor/cfi-dashboard`)
*Note: This is automatically loaded for CFI role. Verify:*
- [ ] Stats: Today's Flights (scheduled/completed/cancelled), Students in Progression, Ready for Check, Ready for Test
- [ ] Resource cards: Available Aircraft, Available Instructors, Aircraft in Maintenance
- [ ] Alerts panel: expiring medicals, expiring licenses, upcoming maintenance, late progressions
- [ ] Charts + Today's Schedule

---

## 6. Admin Portal

**Login:** `http://185.185.80.188:7788/login` — `admin@masterly.dz` / `admin123`

### 6.1 Dashboard (`/admin/dashboard`)
- [ ] KPI cards: Total Users, Active Students, Revenue, Outstanding
- [ ] Users by Role pie chart
- [ ] Invoice Status pie chart
- [ ] **NEW: Training Overview** — Courses Today, Flights Today, Active Students
- [ ] Recent Activity section
- [ ] Recent Inquiries section (contact/application submissions)
- [ ] Quick action buttons

### 6.2 Users (`/admin/users`)
- [ ] DataTable: Email, Name, Role (color badge), Status, Active toggle, Last Login
- [ ] FilterBar: role + status filters, search
- [ ] **Create User** → ModalForm: email, username, password, role (17 roles), status
- [ ] **Edit User** → same modal pre-filled
- [ ] **Reset Password** → ModalForm: new password
- [ ] **Toggle Active** → switch per row
- [ ] **Delete** → ConfirmDialog
- [ ] Stats bar at top

### 6.3 Students (`/admin/students`)
- [ ] DataTable: Student#, Name, Program, Status, Enrolled
- [ ] FilterBar: program + status filter, search
- [ ] Click row → detail modal (full profile)
- [ ] **NEW: Lifecycle actions** — Suspend, Reactivate, Archive buttons per row

### 6.4 Applications (`/admin/applications`)
- [ ] DataTable: App#, Student, Status, Date
- [ ] Review button per row → ModalForm: status, notes, interview date, test date
- [ ] Stats bar: Total, Pending, Accepted, Rejected

### 6.5 Invoices (`/admin/invoices`)
- [ ] DataTable: Invoice#, Student, Amount, Status, Due, Balance
- [ ] Create Invoice → ModalForm
- [ ] Record Payment per row
- [ ] Delete → ConfirmDialog
- [ ] Stats bar: Total, Collected, Outstanding, Overdue
- [ ] Overdue rows highlighted

### 6.6 Payments (`/admin/payments`)
- [ ] DataTable: Student, Invoice#, Amount, Method, Date
- [ ] Record Payment → ModalForm
- [ ] FilterBar: method filter

### 6.7 Contracts (`/admin/contracts`)
- [ ] DataTable: Contract#, Student, Type, Start, End, Status
- [ ] Create Contract → ModalForm
- [ ] **NEW: Generate PDF** button per contract → generates formatted contract PDF

### 6.8 Documents (`/admin/documents`)
- [ ] DataTable: Name, Type, Category, Status, Version
- [ ] Upload Document → ModalForm with file input
- [ ] Download links

### 6.9 Instructors (`/admin/instructors`)
- [ ] Tab switcher: Ground Instructors | Flight Instructors
- [ ] DataTable per tab with relevant fields
- [ ] FilterBar

### 6.10 Subjects (`/admin/subjects`)
- [ ] DataTable: Code, Title, Program, Hours, Status
- [ ] Click row → detail modal with modules
- [ ] **NEW: bibliography, required_documents, prerequisites** fields in detail view

### 6.11 Classrooms (`/admin/rooms`)
- [ ] DataTable: Name, Capacity, Location, Status
- [ ] Create Room → ModalForm

### 6.12 Aircraft (`/admin/aircraft`)
- [ ] DataTable: Registration, Manufacturer, Model, Status, Hours
- [ ] Create Aircraft → ModalForm
- [ ] Maintenance history per aircraft

### 6.13 Simulators (`/admin/simulators`) — NEW
- [ ] DataTable: Name, Manufacturer, Model, Qualification, Location, Status
- [ ] Create Simulator → ModalForm

### 6.14 Simulator Sessions (`/admin/simulator-sessions`) — NEW
- [ ] DataTable: Simulator, Student, Instructor, Date, Duration, Status
- [ ] Create Session → ModalForm

### 6.15 Exams (`/admin/exams`)
- [ ] DataTable: Code, Title, Subject, Program, Type, Status
- [ ] FilterBar: program + type + status

### 6.16 Certificates (`/admin/certificates`)
- [ ] DataTable: Certificate#, Student, Type, Program, Date, Status

### 6.17 Audit Logs (`/admin/audit-logs`)
- [ ] DataTable: Date, User, Action, Entity, IP
- [ ] Action filter
- [ ] Auto-refresh every 30s
- [ ] **Export Excel** button

### 6.18 Settings (`/admin/settings`)
- [ ] Key-value cards by category
- [ ] Edit per setting → ModalForm
- [ ] **NEW: Backup section** — status indicator + "Trigger Manual Backup" button

### 6.19 Reports (`/admin/reports`) — NEW
- [ ] Tab 1 "Student Reports": summary cards, program pie chart, status bar chart
- [ ] Tab 2 "Financial Reports": invoiced/paid/outstanding cards, status pie chart
- [ ] Tab 3 "Exam Reports": total exams, attempts, pass rate, avg score

### 6.20 Communication (`/admin/communication`) — NEW
- [ ] Tab 1 "Send to Role": role dropdown + title + message → broadcast
- [ ] Tab 2 "Send to User": user search + title + message → individual notification
- [ ] Tab 3 "History": last 50 notifications

### 6.21 Roles (`/admin/roles`) — NEW
- [ ] DataTable: Role Name, Users, Permissions
- [ ] Create Role → ModalForm
- [ ] Click row → permission checkboxes (toggle on/off)
- [ ] User list per role

---

## 7. Quality & Safety Portal

**Login:** `qm@masterly.dz` / `admin123`

### 7.1 Dashboard (`/quality/dashboard`)
- [ ] Tabbed layout showing all 6 categories (expandable)
- [ ] Export button
- [ ] **NEW: Upcoming Deadlines** section — color-coded by urgency
- [ ] Risk matrix (5×5) on risks tab

### 7.2 Audits (`/quality/audits`)
- [ ] DataTable: Title, Type, Scope, Status
- [ ] **NEW: Create Audit** → ModalForm with type dropdown (5 types), checklist items
- [ ] **NEW: Checklist items** — add/remove dynamic checklist in create/edit form
- [ ] Edit button per row
- [ ] PDF download per audit

### 7.3 NCRs (`/quality/ncrs`)
- [ ] DataTable with severity pie chart
- [ ] **NEW: Create NCR** → ModalForm with auto-generated NCR number
- [ ] Edit button per row
- [ ] Close button → requires root_cause

### 7.4 CAPAs (`/quality/capas`)
- [ ] DataTable with type (corrective/preventive) badges, auto-generated CAPA number
- [ ] **NEW: Create CAPA** → ModalForm
- [ ] Edit button
- [ ] Close button → requires closing_notes

### 7.5 Risk Assessments (`/quality/risks`)
- [ ] 5×5 risk matrix visualization (Probability × Severity)
- [ ] **NEW: Create Risk** → ModalForm
- [ ] Edit button
- [ ] Color-coded cells

### 7.6 Safety Events (`/quality/safety`)
- [ ] DataTable with confidential indicator
- [ ] Report Event form (already had create)
- [ ] **NEW: Investigation workflow**:
  - [ ] "Investigate" button (when status=reported)
  - [ ] "Analyze" button → modal with analysis textarea (when status=investigating)
  - [ ] "Resolve" button → ConfirmDialog (when status=analyzed)
- [ ] Status colors: reported=gray, investigating=blue, analyzed=purple, resolved=green, closed=dark

### 7.7 Quality Documents (`/quality/documents`)
- [ ] DataTable with author, approver, version, revision date
- [ ] Type + status filters

---

## 8. Finance Portal

**Login:** `finance@masterly.dz` / `admin123`

### 8.1 Dashboard (`/finance/dashboard`)
- [ ] Stat cards: Total Issued, Collected, Outstanding, Overdue
- [ ] Revenue bar chart
- [ ] Invoice status pie chart
- [ ] **NEW: Outstanding by Age bar chart**
- [ ] **NEW: Top Debtors table**
- [ ] **NEW: Collection Rate KPI**
- [ ] Export button

### 8.2 Invoices (`/finance/invoices`)
- [ ] DataTable with full CRUD
- [ ] Create/Edit Invoice → ModalForm
- [ ] Record Payment per row
- [ ] Download PDF per invoice

### 8.3 Contracts (`/finance/contracts`)
- [ ] DataTable with status badges
- [ ] Download contract PDF

### 8.4 Reports (`/finance/reports`)
- [ ] Status distribution bar chart
- [ ] Revenue by invoice bar chart
- [ ] Export buttons

---

## 9. Director Portal

**Login:** `dg@masterly.dz` / `admin123`

### 9.1 Dashboard (`/director/dashboard`)
- [ ] 8 KPI stat cards (students, courses, aircraft, flights, hours, revenue, outstanding, audits)
- [ ] Flights by Status pie chart
- [ ] Revenue bar chart
- [ ] Fleet Hours bar chart
- [ ] Invoice Status pie chart
- [ ] Shortcut cards: Admin Panel, Quality & Safety, Finance
- [ ] Export buttons
- [ ] **NEW: Resource Overview** — Available Aircraft, Available Instructors, Simulators, Rooms (X/Y counts)
- [ ] **NEW: Operational Alerts** — Aircraft in Maintenance, Inactive Instructors, Upcoming Maintenance
- [ ] **NEW: Fleet Utilization** — Aircraft Hours + Instructor Hours bar charts

---

## 10. Cross-Cutting Features

### 10.1 i18n (Multi-Language)
- [ ] Language switcher in bottom-right (EN/FR/AR)
- [ ] Switch to French — all pages translate
- [ ] Switch to Arabic — all pages translate + RTL layout
- [ ] At least 3 pages in each language to verify coverage

### 10.2 Notifications
- [ ] Bell icon in bottom-right shows unread count
- [ ] Click bell → dropdown with notifications
- [ ] Click notification → marks as read
- [ ] "Mark all read" button
- [ ] Auto-refresh every 30 seconds

### 10.3 Responsive Design
- [ ] Test ALL portals on mobile viewport (375px width)
- [ ] Sidebar collapses to hamburger menu on mobile
- [ ] Tables scroll horizontally
- [ ] Modals go full-screen on mobile
- [ ] Test on iPad (768px) — sidebar should be visible

### 10.4 Error Handling
- [ ] Disconnect internet → pages show ErrorCard with retry button
- [ ] Try accessing a protected page while logged out → redirects to login
- [ ] Try accessing wrong portal for your role → redirects to correct portal

### 10.5 Performance
- [ ] All list pages have pagination (page numbers at bottom)
- [ ] All tables have sortable columns (click headers to sort)
- [ ] All filter dropdowns + search inputs work
- [ ] Loading skeletons shown during data fetch (not just text)

### 10.6 Empty States
- [ ] Pages with no data show EmptyState component with helpful message + action button
- [ ] Verify on: student documents (if empty), admin applications (if empty), notifications (if empty)

---

## 11. Mobile & iPad Testing

### 11.1 Mobile (< 768px)
- [ ] Open ANY portal on phone → hamburger menu visible in top bar
- [ ] Tap hamburger → sidebar slides in from left
- [ ] Dark overlay behind sidebar
- [ ] Tap overlay or nav link → sidebar closes
- [ ] Logo visible in mobile top bar

### 11.2 iPad (768px - 1024px)
- [ ] Sidebar visible without hamburger (md breakpoint)
- [ ] Calendar renders correctly in smaller viewport
- [ ] Forms and tables are usable with touch

---

## 12. Validation Checklist

**Use this checklist to sign off each section:**

```
□  2.1  Landing Page
□  2.2  Certificate Verification (public)
□  3.1  Student Dashboard
□  3.2  Flight Log + PDF download
□  3.3  My Courses + Lesson Viewer + Video
□  3.4  Schedule + Calendar (week/month/year)
□  3.5  Exams + Anti-Cheat
□  3.6  Certificates + QR + Download
□  3.7  Messages + Compose + Reply + Sent
□  3.8  Profile + Photo + Contact Fields
□  3.9  Documents, Payments, Results (Competency Matrix), Notifications, History, Medical
□  3.10 Inactivity Auto-Logout
□  4.1  Instructor Dashboard
□  4.2  Courses (CRUD + Cancel/Reschedule)
□  4.3  Attendance + PDF
□  4.4  Flights (CRUD + Cancel/Reschedule)
□  4.5  Flight Preparation
□  4.6  Flight Evaluation + Solo Authorization
□  4.7  My Students
□  4.8  Messages
□  4.9  Module Content + Lesson Editor
□  4.10 Schedule + Calendar
□  4.11 Progress Checks
□  4.12 Skill Tests
□  5.1  CGI Dashboard
□  5.2  CFI Dashboard
□  6.1  Admin Dashboard
□  6.2  Users CRUD
□  6.3  Students + Lifecycle Actions
□  6.4  Applications + Review
□  6.5  Invoices CRUD + Payment
□  6.6  Payments
□  6.7  Contracts + PDF Generation
□  6.8  Documents
□  6.9  Instructors
□  6.10 Subjects
□  6.11 Classrooms
□  6.12 Aircraft
□  6.13 Simulators
□  6.14 Simulator Sessions
□  6.15 Exams
□  6.16 Certificates
□  6.17 Audit Logs + Export
□  6.18 Settings + Backup
□  6.19 Reports (Student/Financial/Exam)
□  6.20 Communication (Broadcast/User/History)
□  6.21 Roles (RBAC Management)
□  7.1  Quality Dashboard + Deadlines
□  7.2  Audits + Checklist
□  7.3  NCRs (Create/Edit/Close)
□  7.4  CAPAs (Create/Edit/Close)
□  7.5  Risk Assessments + Matrix
□  7.6  Safety Events + Investigation Workflow
□  7.7  Quality Documents
□  8.1  Finance Dashboard
□  8.2  Invoices
□  8.3  Contracts
□  8.4  Reports
□  9.1  Director Dashboard + Resource Overview + Fleet Utilization + Alerts
□  10.1 i18n (EN/FR/AR)
□  10.2 Notifications
□  10.3 Responsive Design
□  10.4 Error Handling
□  10.5 Performance
□  10.6 Empty States
```

---

**Total checklist items: 68**

*Report any failed items to the development team with screenshots and steps to reproduce.*
