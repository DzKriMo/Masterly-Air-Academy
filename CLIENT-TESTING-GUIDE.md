# Masterly Air Academy — Platform Testing Guide

> **Purpose:** This document walks you through every testable feature of the platform so you can verify it works correctly before deployment.
>
> **Version:** 1.0 — July 2026
>
> **Platform URL:** `http://<your-server-ip>` (e.g., `http://185.185.80.188`)
>
> **Django Admin URL:** `http://<your-server-ip>/admin`

---

## Table of Contents

1. [Before You Start](#1-before-you-start)
2. [Accessing the Platform](#2-accessing-the-platform)
3. [Testing the Landing Page](#3-testing-the-landing-page)
4. [Testing Authentication & Login](#4-testing-authentication--login)
5. [Testing the Admin Portal (Django Admin)](#5-testing-the-admin-portal)
6. [Testing the Director Portal](#6-testing-the-director-portal)
7. [Testing the Head of Training / Scheduler Dashboard](#7-testing-the-head-of-training--scheduler-dashboard)
8. [Testing the Instructor Portal](#8-testing-the-instructor-portal)
9. [Testing the Student Portal](#9-testing-the-student-portal)
10. [Testing the Finance Portal](#10-testing-the-finance-portal)
11. [Testing the Quality & Safety Portal](#11-testing-the-quality--safety-portal)
12. [Testing Global Search](#12-testing-global-search)
13. [Testing PDF Generation](#13-testing-pdf-generation)
14. [Testing Excel Exports](#14-testing-excel-exports)
15. [Testing Notifications](#15-testing-notifications)
16. [Testing Internationalization (EN/FR/AR)](#16-testing-internationalization)
17. [Testing API Security](#17-testing-api-security)
18. [Testing Infrastructure & Deployment](#18-testing-infrastructure--deployment)
19. [Bug Reporting Template](#19-bug-reporting-template)

---

## 1. Before You Start

### What You Need
- A modern web browser (Chrome, Firefox, Edge, or Safari)
- The server IP address and port (provided by your deployment team)
- Test user credentials (listed below)

### Default Test Accounts

After running `deploy-vps.sh`, these accounts are available:

| Role | Email | Password | Portal |
|------|-------|----------|--------|
| **Superuser** | `admin@masterly-air-academy.dz` | `admin123` | Django Admin |
| **Director** | `director@masterly-air-academy.dz` | `director123` | Director Portal |
| **Finance** | `finance@masterly-air-academy.dz` | `finance123` | Finance Portal |
| **Quality Manager** | `quality@masterly-air-academy.dz` | `quality123` | Quality Portal |
| **Scheduler** | `scheduler@masterly-air-academy.dz` | `scheduler123` | Dashboard |
| **Ground Instructor** | `gi@masterly-air-academy.dz` | `instructor123` | Instructor Portal |
| **Flight Instructor** | `fi@masterly-air-academy.dz` | `instructor123` | Instructor Portal |
| **Student 1** | `ahmed@student.maa.dz` | `student123` | Student Portal |
| **Student 2** | `fatima@student.maa.dz` | `student123` | Student Portal |
| **Student 3** | `youssef@student.maa.dz` | `student123` | Student Portal |
| **Student 4** | `amina@student.maa.dz` | `student123` | Student Portal |
| **Student 5** | `omar@student.maa.dz` | `student123` | Student Portal |

### Demo Data Already Seeded

The database comes pre-loaded with:
- 5 students (Ahmed, Fatima, Youssef, Amina, Omar)
- 3 aircraft (CN-TAA, CN-TAB, CN-TAC)
- 3 ground subjects, 8 modules, 2 classrooms
- 2 scheduled courses with 10 enrollments
- 3 flight lessons (1 completed, 2 scheduled)
- 1 exam with 6 questions
- 3 invoices (paid, issued, overdue)
- 2 audits, 2 NCRs, 2 CAPAs, 2 risk assessments, 2 safety events

---

## 2. Accessing the Platform

### Test: Basic Access
1. Open your browser and go to `http://<server-ip>/`
2. **Expected:** You see the Masterly Air Academy landing page with the school logo, hero section, and program descriptions
3. Check that the page loads in under 3 seconds
4. Check that the language switcher (EN/FR/AR) appears in the top-right corner

### Test: Django Admin Access
1. Go to `http://<server-ip>/admin/login/`
2. **Expected:** You see the Django Admin login page with the Masterly Air Academy branding
3. Log in with `admin@masterly-air-academy.dz` / `admin123`
4. **Expected:** You see the admin dashboard with all data models listed

### Test: Health Check
1. Go to `http://<server-ip>/health/` (or `http://<server-ip>/api/health/`)
2. **Expected:** You see `{"status": "ok"}`

---

## 3. Testing the Landing Page

### Test: Page Content
1. Go to `http://<server-ip>/`
2. Check the hero section displays the academy name and tagline
3. Scroll down to see the 3 training programs:
   - **PPL** (Private Pilot License) — 45h ground + 45h flight
   - **CPL** (Commercial Pilot License) — 120h ground + 90h flight
   - **IR** (Instrument Rating) — 40h ground + 30h flight
4. Each program shows: title, duration, and prerequisites

### Test: Language Switching on Landing
1. Click the language switcher and select **Français**
2. **Expected:** The entire page switches to French — all titles, descriptions, buttons
3. Switch to **العربية (Arabic)**
4. **Expected:** The page switches to Arabic and the layout flips to RTL (right-to-left)
5. Switch back to **English**
6. **Expected:** Page returns to English with LTR layout

### Test: Login Navigation
1. Click "Staff Login" or "Student Login" from the landing page
2. **Expected:** You are taken to the appropriate login page

---

## 4. Testing Authentication & Login

### Test: Staff Login
1. Go to `/login`
2. Enter `admin@masterly-air-academy.dz` and `admin123`
3. Click "Sign In"
4. **Expected:** You are redirected to the dashboard based on your role

### Test: Student Login
1. Go to `/student/login`
2. Enter `ahmed@student.maa.dz` and `student123`
3. Click "Sign In"
4. **Expected:** You are redirected to `/student/dashboard`

### Test: Invalid Credentials
1. Go to `/login`
2. Enter `admin@masterly-air-academy.dz` and `wrongpassword`
3. Click "Sign In"
4. **Expected:** An error message appears ("Invalid email or password")

### Test: Rate Limiting
1. Try to log in with wrong credentials 6 times in a row within 1 minute
2. **Expected:** After 5 failed attempts, you get a "Too many requests" error (rate limit: 5/min)

### Test: Session Persistence
1. Log in successfully
2. Close the browser tab
3. Open a new tab and go to `http://<server-ip>/dashboard`
4. **Expected:** You are still logged in (JWT token persists)

### Test: Logout
1. While logged in, click "Sign Out" in the sidebar
2. **Expected:** You are redirected to `/login`
3. Try to go to `/dashboard` directly
4. **Expected:** You are redirected back to `/login`

---

## 5. Testing the Admin Portal (Django Admin)

> **Login as:** `admin@masterly-air-academy.dz` / `admin123`

### Test: Admin Dashboard Overview
1. After login, you see the admin dashboard with overview cards
2. Check that the sidebar shows all sections

### Test: User Management
1. Navigate to the Users section in Django Admin
2. You should see all seeded users (students, instructors, admin staff)
3. Click on a user to view their details
4. Check that role, status, and group assignments are visible

### Test: Student Management
1. Navigate to Students
2. You should see 5 students with their details
3. Check that each student has: student number, name, program, status, enrollment date

### Test: Course Management
1. Navigate to Courses
2. You should see 2 courses (Navigation Basics, Weather Fundamentals)
3. Check that each course has: title, subject, instructor, schedule, room

### Test: Aircraft Fleet
1. Navigate to Aircraft
2. You should see 3 aircraft: CN-TAA (Cessna C172S), CN-TAB (Piper PA28), CN-TAC (Diamond DA40)
3. Check registration, manufacturer, model, and status for each

### Test: Invoice Management
1. Navigate to Invoices
2. You should see 3 invoices in different states:
   - INV-2026-0001: Paid (45,000 DZD)
   - INV-2026-0002: Issued (75,000 DZD)
   - INV-2026-0003: Overdue (15,000 DZD)

### Test: Quality Management
1. Navigate to Audits — you should see 2 audits (planned + completed)
2. Navigate to Non-Conformities — you should see 2 NCRs (major + critical)
3. Navigate to CAPAs — you should see 2 corrective actions
4. Navigate to Risk Assessments — you should see 2 risk entries

### Test: Audit Trail
1. Make a change to any record (e.g., update a student's status)
2. Navigate to Audit Logs
3. **Expected:** You see a new entry recording the change with timestamp, user, and action

---

## 6. Testing the Director Portal

> **Login as:** `director@masterly-air-academy.dz` / `director123`

### Test: Dashboard Overview
1. After login, you see the Director dashboard at `/director/dashboard`
2. Check the sidebar shows links to Quality and Finance portals
3. **Expected:** The sidebar has:
   - Director Dashboard
   - Quality & Safety
   - Finance

### Test: KPI Cards
1. The dashboard shows key metrics:
   - Total students
   - Total courses
   - Total aircraft
   - Total flight lessons
   - Total flight hours
   - Revenue (paid invoices)
   - Outstanding amount
   - Planned audits
   - Open NCRs

### Test: Navigation to Sub-Portals
1. Click "Quality & Safety" in the sidebar
2. **Expected:** You are taken to `/quality/dashboard`
3. Go back and click "Finance"
4. **Expected:** You are taken to `/finance/dashboard`

### Test: Role-Based Access
1. Log out
2. Log in as a student (`ahmed@student.maa.dz` / `student123`)
3. Try to go to `/director/dashboard` directly
4. **Expected:** You are redirected to `/login` (access denied)

---

## 7. Testing the Head of Training / Scheduler Dashboard

> **Login as:** `scheduler@masterly-air-academy.dz` / `scheduler123`

### Test: Dashboard Access
1. After login, you are redirected to `/dashboard`
2. The dashboard shows KPI cards similar to the director view

### Test: Quick Links
1. Check the quick links section:
   - Manage Students
   - Manage Courses
   - Manage Flights
   - Manage Exams
   - Finance Overview
   - Quality & Safety
2. Click each link and verify it navigates to the correct page

---

## 8. Testing the Instructor Portal

> **Login as:** `fi@masterly-air-academy.dz` / `instructor123`

### Test: Dashboard
1. After login, you see the instructor dashboard at `/instructor/dashboard`
2. Check the sidebar shows:
   - Dashboard
   - Courses
   - Students
   - Flights
   - Modules
   - Schedule
   - Messages

### Test: View Courses
1. Click "Courses" in the sidebar
2. **Expected:** You see courses assigned to you
3. Click on a course to view details

### Test: Mark Attendance
1. Go to Courses → click on a course → Attendance
2. You see a list of enrolled students
3. Mark each student as Present, Absent, Late, or Excused
4. Save
5. **Expected:** Attendance records are saved

### Test: View Students
1. Click "Students" in the sidebar
2. **Expected:** You see students assigned to you with their IDs and programs

### Test: Flight Lessons
1. Click "Flights" in the sidebar
2. **Expected:** You see your scheduled flight lessons
3. Check that each lesson shows: date, student, aircraft, status

### Test: Flight Preparation
1. Click on a scheduled flight → "Prep"
2. **Expected:** You see the pre-flight preparation form with checklist items

### Test: Flight Evaluation
1. Click on a completed flight → "Evaluate"
2. **Expected:** You see the evaluation form with:
   - Grade input (1-10)
   - Result (Pass/Fail)
   - Remarks
3. Submit the evaluation
4. **Expected:** The flight status changes to "completed"

### Test: Skill Tests
1. Go to Flights → Skill Tests
2. **Expected:** You see skill test records

### Test: Progress Checks
1. Go to Flights → Progress Checks
2. **Expected:** You see progress check records

### Test: Modules
1. Click "Modules" in the sidebar
2. **Expected:** You see ground training modules you are assigned to teach

### Test: Schedule
1. Click "Schedule" in the sidebar
2. **Expected:** You see a calendar view with your scheduled lessons (courses + flights)

### Test: Messages
1. Click "Messages" in the sidebar
2. **Expected:** You see your message inbox

---

## 9. Testing the Student Portal

> **Login as:** `ahmed@student.maa.dz` / `student123`

### Test: Student Login
1. Go to `/student/login`
2. Enter `ahmed@student.maa.dz` and `student123`
3. **Expected:** You are redirected to `/student/dashboard`

### Test: Dashboard Overview
1. Check the sidebar shows:
   - Dashboard
   - Courses
   - Flights
   - Exams
   - Certificates
   - Schedule
   - Medical
   - Messages
   - Profile

2. The dashboard shows:
   - Total flight hours
   - Completed flight lessons
   - Theory progress (%)
   - Flight progress (%)
   - Exam average
   - Upcoming schedule
   - Recent exam results
   - Radar chart (skill breakdown)

### Test: View Courses
1. Click "Courses"
2. **Expected:** You see courses you are enrolled in
3. Click on a course to see details (modules, lessons, progress)

### Test: View Flights
1. Click "Flights"
2. **Expected:** You see your flight lessons with status, instructor, aircraft
3. Check that completed flights show grade and result

### Test: Take an Exam
1. Click "Exams"
2. **Expected:** You see available exams
3. Click on "NAV-PPL-01" to start
4. **Expected:** You see the exam interface with:
   - Question counter (e.g., "Question 1 of 6")
   - Multiple choice options
   - Timer (30 minutes)
   - Anti-cheat warning (switching tabs pauses the exam)
5. Answer all questions and submit
6. **Expected:** You see your score and pass/fail status

### Test: Anti-Cheat Protection
1. Start an exam
2. Switch to another browser tab
3. **Expected:** A warning modal appears ("You switched tabs — the exam is paused")
4. Go back to the exam tab
5. **Expected:** The exam resumes

### Test: View Certificates
1. Click "Certificates"
2. **Expected:** You see any earned certificates
3. Click "Download PDF" on a certificate
4. **Expected:** A PDF downloads with the certificate details (gold border, school branding)

### Test: View Schedule
1. Click "Schedule"
2. **Expected:** You see a calendar with your courses and flights

### Test: View Medical Records
1. Click "Medical"
2. **Expected:** You see your medical certificate status and expiry date

### Test: View Messages
1. Click "Messages"
2. **Expected:** You see messages from instructors and administration

### Test: View Profile
1. Click "Profile"
2. **Expected:** You see your personal information, student number, and program

---

## 10. Testing the Finance Portal

> **Login as:** `finance@masterly-air-academy.dz` / `finance123`

### Test: Dashboard
1. After login, you see the finance dashboard at `/finance/dashboard`
2. Check the sidebar shows:
   - Dashboard
   - Invoices
   - Contracts
   - Reports

### Test: Revenue Chart
1. The dashboard shows a bar chart of monthly revenue
2. Check that the chart renders with data

### Test: Invoice Management
1. Click "Invoices"
2. **Expected:** You see the list of invoices with columns: Number, Student, Amount, Status, Due Date
3. Check the 3 seeded invoices:
   - INV-2026-0001: Paid
   - INV-2026-0002: Issued
   - INV-2026-0003: Overdue
4. Click on an invoice to view details
5. Check that the invoice shows payment history

### Test: Create Invoice
1. Click "Create Invoice" or the "+" button
2. Fill in: Student, Amount, Type, Due Date
3. Submit
4. **Expected:** The new invoice appears in the list

### Test: Contracts
1. Click "Contracts"
2. **Expected:** You see training contracts

### Test: Finance Reports
1. Click "Reports"
2. **Expected:** You see:
   - Revenue by month (bar chart)
   - Revenue by program
   - Outstanding by aging (0-30, 31-60, 61-90, 90+ days)
   - Top debtors
   - Collection rate

---

## 11. Testing the Quality & Safety Portal

> **Login as:** `quality@masterly-air-academy.dz` / `quality123`

### Test: Dashboard
1. After login, you see the quality dashboard at `/quality/dashboard`
2. Check the sidebar shows:
   - Audits
   - NCRs
   - CAPAs
   - Risk Assessments
   - Safety Events
   - Documents

### Test: Quality Dashboard Tabs
1. The dashboard has horizontal tabs for each section
2. Click each tab and verify data loads:
   - **Audits:** Shows 2 audits (planned + completed)
   - **NCRs:** Shows 2 non-conformities with severity badges
   - **CAPAs:** Shows 2 corrective actions
   - **Risks:** Shows 2 risk assessments
   - **Safety:** Shows 2 safety events
   - **Documents:** Shows quality documents

### Test: NCR Chart
1. Click the "NCRs" tab
2. **Expected:** A pie chart shows NCR distribution by severity (Critical/Major/Minor)

### Test: Report Safety Event
1. Click "+ Report Event" button
2. Fill in: Title, Type (Incident/Near Miss/Hazard/Observation), Description
3. Optionally check "Report anonymously"
4. Submit
5. **Expected:** The event appears in the Safety Events tab

### Test: Audit Management
1. Click "Audits" in the sidebar
2. **Expected:** You see the list of audits
3. Click on an audit to expand it
4. Check the "Download PDF" link
5. **Expected:** A PDF audit report downloads

### Test: NCR Management
1. Click "NCRs" in the sidebar
2. **Expected:** You see non-conformities with severity and status badges
3. Check that critical items are highlighted in red

### Test: CAPA Management
1. Click "CAPAs"
2. **Expected:** You see corrective/preventive actions with due dates

### Test: Risk Assessments
1. Click "Risk Assessments"
2. **Expected:** You see risk entries with risk levels

### Test: Quality Documents
1. Click "Documents"
2. **Expected:** You see quality documents with status (approved/draft)

---

## 12. Testing Global Search

### Test: Search Functionality
1. Look for the search bar in the top navigation
2. Type "Ahmed" (a student name)
3. **Expected:** Search results appear showing matching students
4. Type "Cessna" (an aircraft)
5. **Expected:** Search results show matching aircraft
6. Type "Navigation" (a course)
7. **Expected:** Search results show matching courses

### Test: Search with No Results
1. Search for "xyznonexistent"
2. **Expected:** No results found message

---

## 13. Testing PDF Generation

### Test: Certificate PDF
1. Log in as admin
2. Go to `/admin` → Certificates
3. Find a certificate and note its ID
4. Go to `http://<server-ip>/api/certificates/<cert-id>/pdf/`
5. **Expected:** A PDF downloads with:
   - A4 landscape layout
   - Gold decorative border
   - School name and logo area
   - Student name, program, certificate number
   - Issue date and validity

### Test: Invoice PDF
1. Go to `/admin` → Invoices
2. Find an invoice and note its ID
3. Go to `http://<server-ip>/api/invoices/<inv-id>/pdf/`
4. **Expected:** A PDF downloads with:
   - Invoice number, student name, amount
   - Payment history table
   - Total, paid, and balance amounts

### Test: Attendance PDF
1. Go to `/admin` → Courses
2. Find a course with attendance records and note its ID
3. Go to `http://<server-ip>/api/attendance/<course-id>/pdf/`
4. **Expected:** A PDF downloads with:
   - Student names and attendance status (Present/Absent/Late/Excused)
   - Attendance rate percentage

### Test: Audit Report PDF
1. Go to `/admin` → Audits
2. Find a completed audit and note its ID
3. Go to `http://<server-ip>/api/audits/<audit-id>/pdf/`
4. **Expected:** A PDF downloads with:
   - Audit title, type, scope, dates
   - List of NCRs with severity, status, and responsible person

---

## 14. Testing Excel Exports

### Test: Students Excel
1. Go to `http://<server-ip>/api/export/students/`
2. **Expected:** A file `students.xlsx` downloads
3. Open it — check columns: Student Number, First Name, Last Name, Program, Status, Enrollment Date
4. **Expected:** 5 student rows with correct data

### Test: Invoices Excel
1. Go to `http://<server-ip>/api/export/invoices/`
2. **Expected:** A file `invoices.xlsx` downloads
3. Open it — check columns: Invoice #, Student, Type, Amount, Currency, Status, Issued, Due
4. **Expected:** 3 invoice rows

### Test: Flights Excel
1. Go to `http://<server-ip>/api/export/flights/`
2. **Expected:** A file `flights.xlsx` downloads
3. Open it — check columns: Date, Student, Instructor, Aircraft, Duration, Status, Grade, Result
4. **Expected:** 3 flight lesson rows

### Test: Export Permissions
1. Log in as a student (`ahmed@student.maa.dz` / `student123`)
2. Try to access `http://<server-ip>/api/export/students/`
3. **Expected:** You get a 403 Forbidden response (students cannot export data)

---

## 15. Testing Notifications

### Test: Notification Bell
1. Log in as any user
2. Look for the notification bell icon in the top navigation
3. **Expected:** A badge shows unread notification count

### Test: Mark as Read
1. Click the notification bell
2. **Expected:** You see a list of notifications
3. Click on a notification
4. **Expected:** It is marked as read and the badge count decreases

### Test: Mark All as Read
1. Go to `http://<server-ip>/api/notifications/mark_all_read/` (PUT request)
2. **Expected:** All notifications are marked as read

### Test: Notification Triggers
The system automatically sends notifications when:
- A flight lesson is scheduled → Student + Instructor notified
- A flight lesson is evaluated → Student notified
- An exam result is available → Student notified
- A course is scheduled → Enrolled students notified
- An invoice is created → Student notified
- A medical certificate is expiring (within 30 days) → User notified
- An NCR is opened → Quality managers notified
- A CAPA is assigned → Responsible person notified

---

## 16. Testing Internationalization (EN/FR/AR)

### Test: Three Languages
The platform supports English (EN), French (FR), and Arabic (AR).

### Test: Language Switcher
1. On any page, find the language switcher (flag icons or dropdown)
2. Switch to French — **Expected:** All UI text changes to French
3. Switch to Arabic — **Expected:** All UI text changes to Arabic, layout flips to RTL
4. Switch back to English — **Expected:** Layout returns to LTR

### Test: Language Persistence
1. Switch to French
2. Refresh the page
3. **Expected:** The page remains in French (language is saved in a cookie)

### Test: Translated Pages
Check these pages in all 3 languages:
- Landing page (hero, programs, footer)
- Login page (labels, buttons, error messages)
- All portal sidebars (NAV labels)
- Dashboard (card titles, welcome text, role labels)
- Exam page (anti-cheat modal, results, progress)
- Student dashboard (radar chart labels)

---

## 17. Testing API Security

### Test: Unauthenticated Access
1. Open an incognito/private browser window
2. Go to `http://<server-ip>/api/students/`
3. **Expected:** You get a 401 Unauthorized response

### Test: JWT Token Flow
1. Send a POST request to `/api/login/` with credentials
2. **Expected:** You receive an `access` token and a `refresh` token
3. Use the `access` token in the `Authorization: Bearer <token>` header
4. Access `/api/students/` — **Expected:** 200 OK with student data
5. Wait 15 minutes (or manually expire the token)
6. Try to access `/api/students/` again — **Expected:** 401 Unauthorized
7. Use the `refresh` token at `/api/token/refresh/` to get a new access token
8. Access `/api/students/` again — **Expected:** 200 OK

### Test: Role-Based Access Control
1. Log in as a student
2. Try to access `/api/audits/` (quality data)
3. **Expected:** 403 Forbidden (students don't have `quality.view` permission)
4. Try to access `/api/invoices/` (finance data)
5. **Expected:** 403 Forbidden (students don't have `invoices.view` permission)

### Test: Login Rate Limiting
1. Try to log in with wrong credentials 6 times within 1 minute
2. **Expected:** After 5 attempts, you get a "Too many requests" error

### Test: Export Permission Check
1. Log in as a student
2. Try to access `/api/export/students/`
3. **Expected:** 403 Forbidden (students don't have `students.export` permission)

### Test: Security Headers
1. Open browser DevTools → Network tab
2. Make any request
3. Check the response headers for:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `X-XSS-Protection: 1; mode=block`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 18. Testing Infrastructure & Deployment

### Test: All Services Running
Run on the server:
```bash
docker-compose ps
```
**Expected:** All 9 services show "Up" or "Up (healthy)":
- nginx
- api
- celery
- web
- db
- redis
- minio
- meilisearch
- backup

### Test: Service Health Checks
```bash
docker-compose ps --format "table {{.Name}}\t{{.Status}}"
```
**Expected:** All services with healthchecks show "(healthy)"

### Test: Database Connectivity
```bash
docker-compose exec -T api python manage.py shell -c "from django.db import connection; print(connection.ensure_connection())"
```
**Expected:** No error output

### Test: Redis Connectivity
```bash
docker-compose exec -T redis redis-cli -a secret ping
```
**Expected:** `PONG`

### Test: Celery Worker
```bash
docker-compose exec -T api celery -A config inspect ping
```
**Expected:** Response showing the worker is responsive

### Test: MinIO Storage
1. Go to `http://<server-ip>:9001` (MinIO Console)
2. Log in with `minioadmin` / `minioadmin`
3. **Expected:** You see the `masterly-documents` bucket

### Test: Meilisearch
```bash
curl http://localhost:7700/health
```
**Expected:** `{"status":"available"}`

### Test: Backup Service
```bash
docker-compose logs backup --tail=20
```
**Expected:** You see backup creation logs

### Test: Nginx Reverse Proxy
1. Access `http://<server-ip>/` → should serve Next.js
2. Access `http://<server-ip>/admin/` → should serve Django Admin
3. Access `http://<server-ip>/api/` → should serve DRF API

### Test: Container Resource Usage
```bash
docker stats --no-stream
```
**Expected:** No container is using excessive CPU or memory

---

## 19. Bug Reporting Template

When you find an issue, please report it using this format:

### Bug Report

**Title:** [Short description of the issue]

**Severity:**
- [ ] Critical — System crash, data loss, security breach
- [ ] Major — Feature broken, no workaround
- [ ] Minor — Feature broken, workaround exists
- [ ] Cosmetic — Visual issue, feature still works

**Steps to Reproduce:**
1. Go to ...
2. Click on ...
3. Enter ...
4. Observe ...

**Expected Result:** [What should happen]

**Actual Result:** [What actually happens]

**Environment:**
- Browser: [Chrome/Firefox/Edge/Safari + version]
- Operating System: [Windows/macOS/Linux]
- Screen Resolution: [e.g., 1920x1080]

**Screenshots/Videos:** [Attach if possible]

**Additional Notes:** [Any other context]

---

## Appendix A: Complete Route Map

| Route | Portal | Description |
|-------|--------|-------------|
| `/` | Public | Landing page |
| `/login` | Public | Staff login |
| `/student/login` | Public | Student login |
| `/dashboard` | Admin | Head of Training / Scheduler dashboard |
| `/director/dashboard` | Director | Director overview |
| `/instructor/dashboard` | Instructor | Instructor dashboard |
| `/instructor/courses` | Instructor | Course list |
| `/instructor/courses/[id]/attendance` | Instructor | Mark attendance |
| `/instructor/students` | Instructor | Assigned students |
| `/instructor/flights` | Instructor | Flight lessons |
| `/instructor/flights/[id]/prep` | Instructor | Pre-flight prep |
| `/instructor/flights/[id]/evaluate` | Instructor | Flight evaluation |
| `/instructor/flights/skill-test` | Instructor | Skill tests |
| `/instructor/flights/progress-check` | Instructor | Progress checks |
| `/instructor/modules` | Instructor | Ground modules |
| `/instructor/schedule` | Instructor | Calendar |
| `/instructor/messages` | Instructor | Messages |
| `/student/dashboard` | Student | Student overview |
| `/student/courses` | Student | Enrolled courses |
| `/student/courses/[id]` | Student | Course detail |
| `/student/flights` | Student | Flight lessons |
| `/student/exams` | Student | Exam list |
| `/student/exams/[id]` | Student | Take exam |
| `/student/certificates` | Student | Certificates |
| `/student/schedule` | Student | Calendar |
| `/student/medical` | Student | Medical records |
| `/student/messages` | Student | Messages |
| `/student/profile` | Student | Profile |
| `/finance/dashboard` | Finance | Finance overview |
| `/finance/invoices` | Finance | Invoice management |
| `/finance/contracts` | Finance | Contracts |
| `/finance/reports` | Finance | Finance reports |
| `/quality/dashboard` | Quality | Quality overview |
| `/quality/audits` | Quality | Audit management |
| `/quality/ncrs` | Quality | Non-conformities |
| `/quality/capas` | Quality | CAPAs |
| `/quality/risks` | Quality | Risk assessments |
| `/quality/safety` | Quality | Safety events |
| `/quality/documents` | Quality | Quality documents |
| `/admin` | Django Admin | Full admin interface |

---

## Appendix B: API Endpoint Reference

| Method | Endpoint | Auth Required | Permission |
|--------|----------|:---:|------------|
| POST | `/api/login/` | No | — |
| POST | `/api/token/refresh/` | No | — |
| GET | `/api/me/` | Yes | Any |
| PUT | `/api/profile/` | Yes | Any |
| POST | `/api/logout/` | Yes | Any |
| GET | `/api/dashboard/kpis/` | Yes | `dashboard.view` |
| GET | `/api/student/dashboard/` | Yes | `students.view_own` |
| GET | `/api/quality/dashboard/` | Yes | `quality.view` |
| GET | `/api/search/` | Yes | Any |
| GET | `/api/finance/reports/` | Yes | `finance.view_reports` |
| GET | `/api/export/students/` | Yes | `students.export` |
| GET | `/api/export/invoices/` | Yes | `invoices.export` |
| GET | `/api/export/flights/` | Yes | `flights.export` |
| GET | `/api/certificates/verify/` | No | — |
| GET | `/api/certificates/{id}/pdf/` | Yes | `exams.view` |
| GET | `/api/invoices/{id}/pdf/` | Yes | `invoices.view` |
| GET | `/api/attendance/{id}/pdf/` | Yes | `attendance.view` |
| GET | `/api/audits/{id}/pdf/` | Yes | `quality.view` |
| PUT | `/api/notifications/mark_all_read/` | Yes | Any |

> All CRUD endpoints (`/api/students/`, `/api/courses/`, etc.) follow standard REST patterns: GET (list), POST (create), GET/{id} (retrieve), PUT/{id} (update), DELETE/{id} (destroy). Each requires the corresponding permission (e.g., `students.view`, `students.create`, `students.update`, `students.delete`).

---

*This document covers every testable aspect of the Masterly Air Academy platform. If you encounter any issues, please use the Bug Reporting Template in Section 19.*
