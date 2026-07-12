# Masterly Air Academy — Client Testing Manual

## How to Access

The platform is running at `http://185.185.80.188:7788`. Open any modern browser (Chrome, Edge, Firefox, Safari).

All data is 100% on-premise. Nothing leaves the server.

---

## Test Accounts

| Email | Password | Role | What to Test |
|-------|----------|------|-------------|
| `admin@masterly-air-academy.dz` | `admin123` | System Admin | Django Admin panel, all portals |
| `director@masterly-air-academy.dz` | `director123` | Director General | KPI dashboard, reports |
| `fi@masterly-air-academy.dz` | `instructor123` | Flight Instructor | Flight schedule, evaluations |
| `gi@masterly-air-academy.dz` | `instructor123` | Ground Instructor | Courses, attendance |
| `finance@masterly-air-academy.dz` | `finance123` | Finance Manager | Invoices, payments |
| `quality@masterly-air-academy.dz` | `quality123` | Quality Manager | Audits, safety reports |
| `scheduler@masterly-air-academy.dz` | `scheduler123` | Scheduler | Staff dashboard |
| `ahmed@student.maa.dz` | `student123` | Student (PPL) | All student features |
| `fatima@student.maa.dz` | `student123` | Student (CPL) | All student features |

---

## 1. Landing Page — `http://185.185.80.188:7788`

The public-facing page. No login required.

- [ ] Hero section shows the Mast logo, tagline "Approved Training Organization"
- [ ] Program cards (PPL, CPL, IR, MEP, MCC) with duration and prerequisites
- [ ] About section with academy story and feature tiles
- [ ] "Why Us" section with ATO Certified, Modern Fleet, Efficient Training
- [ ] Bottom of page: Student Portal, Staff Access, Administration buttons
- [ ] Footer with academy name and on-premise notice

### Language Switching
- [ ] Click language switcher (bottom-right, "EN")
- [ ] Select "Francais" — page reloads in French
- [ ] Select "العربية" — page reloads in Arabic, layout mirrors right-to-left
- [ ] Switch back to English

---

## 2. Student Portal

### 2.1 Login — `http://185.185.80.188:7788/student/login`

- [ ] Enter `ahmed@student.maa.dz` / `student123`
- [ ] Click "Sign In" — redirected to student dashboard
- [ ] Try wrong password — red error appears
- [ ] Try logging in with `fi@masterly-air-academy.dz` — error: "This portal is for students only"

### 2.2 Student Dashboard — `http://185.185.80.188:7788/student/dashboard`

- [ ] Shows real stats: enrolled courses, flight hours, exam average
- [ ] Four quick tiles: Exams, Flight Log, Courses, Schedule
- [ ] Logout button in top-right

### 2.3 Exams — Click "Exams" tile

- [ ] List shows available exams (NAV-PPL-01, etc.) with duration, pass grade, attempts
- [ ] Click "Start Exam" on NAV-PPL-01

### 2.4 Anti-Cheat System
- [ ] Red modal appears: "Anti-Cheat System Active"
- [ ] Explains tab switching will be detected
- [ ] Click "I Understand" — exam begins
- [ ] Timer counting down in top-right
- [ ] Answer all questions by clicking options (gold highlight shows selection)
- [ ] Switch to another browser tab — warning bubble appears at bottom of screen
- [ ] Switch tabs a second time — exam auto-submitted
- [ ] Results page shows percentage, pass/fail, per-question breakdown
- [ ] If auto-submitted: red banner says "This exam was auto-submitted by the anti-cheat system"

### 2.5 Flight Log — `http://185.185.80.188:7788/student/flights`

- [ ] Shows total flight hours, completed lessons, average per lesson
- [ ] Table with date, aircraft, duration, grade per completed flight

### 2.6 My Courses — `http://185.185.80.188:7788/student/courses`

- [ ] Lists enrolled courses with dates, times, room, status

### 2.7 My Schedule — `http://185.185.80.188:7788/student/schedule`

- [ ] Upcoming events grouped with date, time, aircraft/course info
- [ ] Past events shown below in lower opacity

---

## 3. Instructor Portal

### 3.1 Login — `http://185.185.80.188:7788/login`

- [ ] Enter `fi@masterly-air-academy.dz` / `instructor123`
- [ ] Redirected to `/instructor/dashboard`

### 3.2 Instructor Dashboard

- [ ] Stats: Total Courses, Today's Courses, Active Students
- [ ] Quick actions: Calendar, Flight Schedule, My Courses, Module Content

### 3.3 Calendar — `/instructor/schedule`

- [ ] Today's events listed with color legend
- [ ] Blue = Flight Lessons, Gold = Ground Courses

### 3.4 Flight Schedule — `/instructor/flights`

- [ ] List of flights with student names, aircraft, status badges
- [ ] "+ New Flight" button opens scheduling form
- [ ] "Evaluate" button on scheduled flights opens evaluation form
- [ ] Fill evaluation: duration, grade, exercises, competencies, observations
- [ ] Submit — flight marked as completed

### 3.5 My Courses — `/instructor/courses`

- [ ] Course list with subject codes, dates, status filters
- [ ] "+ New Course" creates a course with subject, room, schedule
- [ ] "Attendance" button opens attendance page
- [ ] Toggle each student: present, late, absent, excused
- [ ] "Save Attendance" records all

### 3.6 Module Content — `/instructor/modules`

- [ ] Subject selector buttons with module counts
- [ ] Click subject — expandable module list with lessons and documents
- [ ] Upload document form in each expanded module

### 3.7 My Students — `/instructor/students`

- [ ] Grid of all students with search bar
- [ ] Cards show student number, name, program, enrollment date

### 3.8 Messages — `/instructor/messages`

- [ ] Inbox, Sent, Compose tabs
- [ ] Compose: select student from dropdown, subject, message body
- [ ] Send — appears in Sent tab
- [ ] Unread messages have gold left border

---

## 4. Finance Portal

### 4.1 Login as `finance@masterly-air-academy.dz` / `finance123`

### 4.2 Dashboard — `/finance/dashboard`

- [ ] 4 stat cards: Total Issued, Collected, Outstanding, Overdue (DZD)
- [ ] Revenue bar chart and invoice status chart
- [ ] Recent invoices list

### 4.3 Invoices — `/finance/invoices`

- [ ] "+ New Invoice" form with student dropdown, type, amount
- [ ] Create invoice — appears with auto-generated number (INV-2026-XXXX)
- [ ] Filter by status: All, Draft, Issued, Paid, Partially Paid, Overdue
- [ ] "Record Payment" on an issued invoice — enter amount, status updates

---

## 5. Quality Portal

### 5.1 Login as `quality@masterly-air-academy.dz` / `quality123`

### 5.2 Dashboard — `/quality/dashboard`

- [ ] 4 stat cards: Open NCRs, Open CAPAs, Planned Audits, Safety Events
- [ ] Tabbed view: Audits, NCRs, CAPAs, Safety
- [ ] Each tab shows relevant items with severity/status badges

### 5.3 Report Safety Event

- [ ] "+ Report Event" opens form
- [ ] Fill title, type (Incident/Near Miss/Hazard/Observation), description
- [ ] Check "Report anonymously" if desired
- [ ] Submit — event appears in Safety tab
- [ ] Logout button in top-right

---

## 6. Director Dashboard

### 6.1 Login as `director@masterly-air-academy.dz` / `director123`

### 6.2 Dashboard — `/director/dashboard`

- [ ] 8 KPI cards: Students, Courses, Aircraft, Flight Hours, Revenue Collected, Outstanding, Completed Flights, Planned Audits
- [ ] Quick links: Admin Panel, Quality and Safety, Finance
- [ ] Export buttons: Students (Excel), Invoices (Excel), Flights (Excel)
- [ ] Click an export button — downloads an XLSX file
- [ ] Logout button

---

## 7. Django Admin Panel

### 7.1 `http://185.185.80.188:7788/admin`

- [ ] Login page shows "Masterly Administration" with gold/navy styling
- [ ] Login as `admin@masterly-air-academy.dz` / `admin123`
- [ ] Sidebar shows all apps: Accounts, Core, Students, Ground Training, Flight Training, Administration, Quality & Safety, Exams, Notifications
- [ ] Click "Users" — table with email, name, role badges, status
- [ ] Click "Students" — table with student numbers, programs
- [ ] Click "Aircraft" — fleet list
- [ ] Click "Exams" — exam management
- [ ] Click "Invoices" — all invoices with statuses
- [ ] Click "Audit Logs" — read-only log of all actions

---

## 8. Security Features

- [ ] Login with wrong password 6 times rapidly — 6th attempt blocked ("Request was throttled")
- [ ] Deactivated user cannot log in
- [ ] Student cannot access admin endpoints (finance, audits)
- [ ] All IDs are UUID (non-guessable)

---

## 9. Language Switching

- [ ] Available on ALL pages (bottom-right corner)
- [ ] English (EN), French (FR), Arabic (AR)
- [ ] Arabic shows right-to-left layout
- [ ] Landing page fully translated
- [ ] Login page labels translated
- [ ] Exam anti-cheat modal translated

---

## 10. Responsive Testing

- [ ] Resize browser to 375px (mobile) — all pages readable
- [ ] Resize to 768px (iPad portrait) — grids become 2-column, touch targets large
- [ ] Student login has extra-large inputs for tablet use

---

