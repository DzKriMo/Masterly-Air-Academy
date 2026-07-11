# Masterly Air Academy — Comprehensive Test Guide

## Before You Start

Start the platform and seed demo data:

```bash
cd "C:\Users\krimo\OneDrive\Desktop\Akram Merah\masterly-air-academy"
docker compose build
docker compose up -d
docker compose exec api python manage.py seed_demo_data
```

Wait 2 minutes for all services to become healthy, then open `http://localhost` in your browser.

## Test Accounts

| Email | Password | Role |
|-------|----------|------|
| `admin@masterly-air-academy.dz` | `admin123` | System Admin |
| `ahmed@student.maa.dz` | `student123` | Student (PPL) |
| `fatima@student.maa.dz` | `student123` | Student (CPL) |
| `fi@masterly-air-academy.dz` | `instructor123` | Flight Instructor |
| `gi@masterly-air-academy.dz` | `instructor123` | Ground Instructor |

---

## 1. Landing Page (`/`)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Page loads | Open `http://localhost` | Hero section with Mast logo (260px), "Your Aviation Career Starts Here", program cards |
| Programs section | Scroll down | 5 program cards: PPL, CPL, IR, MEP, MCC with duration and prerequisites |
| About section | Scroll down | Academy story + 4 feature tiles |
| Navigation | Click Programs/About/Why Us in nav | Smooth scroll to section |
| Student Access | Click "Student Access" in nav | Redirected to `/student/login` |
| Portal access | Scroll to bottom | Student Portal, Staff Access, Administration buttons |
| Footer | Scroll to bottom | Logo (110px), on-premise notice, language info |

## 2. Admin Panel (`/admin`)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Login page | Open `http://localhost/admin` | "Masterly Administration" branding, login form |
| Login | Enter admin@masterly-air-academy.dz / admin123 | Dashboard with Users, Groups, Audit Logs |
| User list | Click "Users" in sidebar | Table with email, name, role, status columns |
| Create user | Click "Add User", fill form, save | User created, appears in list |
| Edit user | Click a user, change role, save | Role updated |
| Audit logs | Click "Audit Logs" | Read-only list showing login/logout/create/update actions |
| Academic years | Click "Academic Years" | 2025-2026 listed |
| All apps visible | Check sidebar | Accounts, Core, Students, Ground Training, Flight Training, Administration, Quality & Safety, Exams, Notifications |

## 3. Staff Login + Dashboard (`/login`)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Login page | Open `http://localhost/login` | Login form with Mast logo, "Staff Login" header |
| Wrong password | Enter admin@masterly-air-academy.dz / wrong | Red error: "Incorrect authentication credentials" |
| Rate limiting | Try 6 rapid wrong logins | 6th attempt: "Request was throttled" |
| Staff login | Enter fi@masterly-air-academy.dz / instructor123 | Redirected to `/instructor/dashboard` |
| Dashboard | View dashboard | Stats: Total Courses, Today's Courses, Active Students |
| Quick actions | Click "Flight Schedule" | Redirected to `/instructor/flights` |
| Quick actions | Click "My Courses" | Redirected to `/instructor/courses` |
| Quick actions | Click "Module Content" | Redirected to `/instructor/modules` |
| Logout | Click "Logout" | Redirected to `/login` |

## 4. Student Portal

### 4.1 Student Login (`/student/login`)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Page loads | Open `http://localhost/student/login` | iPad-optimized: large logo, generous padding, big touch targets |
| Wrong role | Login as fi@masterly-air-academy.dz | Error: "This portal is for students only" |
| Student login | Login as ahmed@student.maa.dz / student123 | Redirected to `/student/dashboard` |
| Correct role check | Works with student/candidate/graduate roles | Redirected correctly |

### 4.2 Student Dashboard (`/student/dashboard`)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Real data | Login and view dashboard | Stats show actual numbers (not placeholders): enrolled courses, flight hours, exam average |
| Quick tiles | Click "Exams" | Redirected to `/student/exams` |
| Quick tiles | Click "Flight Log" | Redirected to `/student/flights` |
| Logout | Click "Logout" | Redirected to `/student/login` |

### 4.3 Exams (`/student/exams`)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Exam list | Navigate to `/student/exams` | Available exams listed with code, duration, pass grade, attempt count |
| Anti-cheat modal | Click "Start Exam" or "Retake" | Modal: "Anti-Cheat System Active", warning about tab switching, "I Understand" button |
| Start exam | Click "I Understand" | Exam loads with timer, questions, progress bar |
| Answer | Click option buttons | Selected option highlighted gold, progress bar updates |
| Timer | Watch timer count down | Shows MM:SS format, turns red under 5 minutes |
| Submit | Click "Submit Exam" | Results page: percentage, pass/fail, per-question breakdown |
| Tab switch test | During exam, switch to another tab | First switch: red warning bubble at bottom. Second switch: auto-submit |
| Auto-submit indicator | After auto-submit | Results page shows "This exam was auto-submitted by the anti-cheat system" |
| Results | View results page | Shows score/total, correct vs incorrect per question |
| Retake | Click "Retake Exam" if max attempts not reached | Same flow again |
| Max attempts | Reach max attempts | Button disabled: "Max Attempts Reached" |

### 4.4 Flight Log (`/student/flights`)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Page loads | Navigate to `/student/flights` | Total flight hours, completed lessons count, average per lesson |
| Lesson list | Scroll down | Table: date, aircraft, duration, grade per completed flight |
| Empty state | Login as a student with 0 flights | "No completed flights yet" message |

## 5. Instructor Portal

### 5.1 Flight Schedule (`/instructor/flights`)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Page loads | Login as fi@masterly-air-academy.dz, go to Flight Schedule | List of flights with status badges, student names, aircraft |
| Create flight | Click "+ New Flight" | Form: student ID, aircraft dropdown, date, start/end time |
| Schedule | Fill form, click "Schedule Flight" | Flight appears in list. Conflict detection runs |
| Conflict detection | Try double-booking same aircraft/time | Error message about conflict |
| Filters | Click "Scheduled" / "Completed" / "Cancelled" | List filters correctly |
| Evaluate | Click "Evaluate" on a scheduled flight | Post-flight evaluation form |
| Evaluation form | Fill duration, grade, exercises, competencies, observations | All fields visible |
| Submit eval | Click "Submit Evaluation" | Redirected back to flights, status now "completed" |

### 5.2 Courses + Attendance (`/instructor/courses`)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Page loads | Go to `/instructor/courses` | Course list with subject codes, dates, statuses |
| Create course | Click "+ New Course" | Form: subject dropdown, title, date, time, room |
| Create | Fill and submit | Appears in list, room conflict validated |
| Attendance | Click "Attendance" on a course | Student list with status toggle buttons |
| Toggle status | Click status badge | Cycles: present → late → absent → excused |
| Save | Click "Save Attendance" | Green confirmation, records saved |

### 5.3 Module Content (`/instructor/modules`)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Page loads | Go to `/instructor/modules` | Subject selector buttons with module counts |
| Select subject | Click a subject | Modules appear with expandable sections |
| Expand module | Click module header | Lessons list and documents list shown |
| Upload doc | Use upload form, select file | Document appears in list |
| Empty state | Select subject with no modules | "No modules" message |

## 6. Finance Portal

### 6.1 Dashboard (`/finance/dashboard`)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Page loads | Login as admin, go to `/finance/dashboard` | 4 stat cards: Total Issued (DZD), Collected, Outstanding, Overdue |
| Recent invoices | Scroll down | Invoice list with numbers, student names, amounts, status badges |
| Empty state | Remove all invoices, view dashboard | Stats show 0, "No invoices yet" |

### 6.2 Invoices (`/finance/invoices`)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Page loads | Go to `/finance/invoices` | Filter buttons: All, Draft, Issued, Paid, Partially Paid, Overdue |
| Create | Click "+ New Invoice" | Form: student dropdown, type, amount (DZD), description, due date |
| Create | Fill and submit | Invoice appears with auto-number (INV-2026-XXXX) |
| Filter | Click "Paid" | Only paid invoices shown |
| Record payment | Click "Record Payment" on issued invoice, enter amount | Payment recorded, status updates (partially_paid or paid) |

## 7. Quality & Safety (`/quality/dashboard`)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Page loads | Login as admin, go to `/quality/dashboard` | 4 stat cards: Open NCRs, Open CAPAs, Planned Audits, Safety Events |
| Audits tab | View Audits tab | Audit list with NCR counts, status badges |
| NCRs tab | Click NCRs tab | Open NCRs with severity badges (critical=red, major=orange, minor=yellow) |
| CAPAs tab | Click CAPAs tab | CAPA list with types (corrective/preventive), due dates |
| Safety tab | Click Safety tab | Reported events with types (incident, near_miss, hazard) |
| Report event | Click "+ Report Event" | Form: title, type, description, anonymous checkbox |
| Submit | Fill and submit | Safety event created, appears in list |

## 8. Director Dashboard (`/director/dashboard`)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Page loads | Login as admin, go to `/director/dashboard` | 12 KPI cards across 2 rows |
| Live data | Check values | Students, courses, aircraft counts match database |
| Revenue | Check revenue cards | Shows DZD amounts (collected + outstanding) |
| Quick links | Click Admin Panel / Quality / Finance | Redirected correctly |

## 9. Django Admin (`/admin`)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Branding | Open `/admin/login/` | "Masterly Administration" header, "Masterly Air Academy" title |
| Login | admin@masterly-air-academy.dz / admin123 | Dashboard loads |
| Student CRUD | Go to Students > Add | Create student with program, dates, contact info |
| Course CRUD | Go to Ground Training > Courses > Add | Create with instructor, room, schedule |
| Aircraft CRUD | Go to Flight Training > Aircraft | List/manage fleet |
| Exam management | Go to Exams > Exams | Create exam, add questions |
| Invoice management | Go to Administration > Invoices | View all invoices |
| Audit management | Go to Quality & Safety > Audits | View audits |
| Permission check | Login as student, try accessing /admin | Access denied |

## 10. Anti-Cheat System

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Modal | Start any exam | Modal appears explaining anti-cheat policy |
| First violation | During exam, switch browser tab once | Floating red bubble: "Warning: Tab switch detected" |
| Second violation | Switch tab again | Exam auto-submitted |
| Results indicator | After auto-submit | Results page shows red banner: "This exam was auto-submitted by the anti-cheat system" |
| Normal timer expiry | Let timer run to 0 | Exam auto-submitted normally (no anti-cheat banner) |

## 11. Authentication & Security

| Test | Steps | Expected Result |
|------|-------|-----------------|
| JWT login | POST /api/login/ with valid credentials | Returns access + refresh tokens + user data + permissions |
| JWT expiry | Wait 15 minutes after login | Token expired, refresh needed |
| Deactivated user | Create user with is_active=false, try login | "Your account has been deactivated" |
| Wrong password | Wrong password for valid email | 401 "Incorrect authentication credentials" |
| Rate limiting | 6 rapid login attempts | 5 allowed, 6th throttled with 429 |
| Protected pages | Access /dashboard without login | Redirected to /login |
| Protected pages | Access /instructor/dashboard without login | Redirected to /login |
| Role-based access | Login as student, try accessing instructor pages | Redirected or permission denied |

## 12. Language Switching

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Default | Open any page | English shown by default |
| Switch to French | Click language switcher (top-right), select Francais | Page refreshes in French (RTL stays LTR) |
| Switch to Arabic | Select العربية | Page switches to Arabic, layout mirrors RTL |
| Persistence | Switch language, close tab, reopen | Language remembered via cookie |
| RTL layout | View any page in Arabic | Text right-aligned, margins mirrored, borders flipped |

## 13. Responsive & iPad

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Mobile view | Resize browser to 375px wide | All pages readable, no horizontal scroll |
| Tablet view | Resize to 768px (iPad portrait) | Grids become 2-column, touch targets large |
| iPad landscape | Resize to 1024px | Full layout visible |
| Student login | View on iPad width | Generous padding, 52px+ input heights, large buttons |
| Student dashboard | View on iPad | 2x2 stat grid, large quick-tiles with icons |

## 14. API Endpoints (Technical)

```bash
# Test with curl after getting a token:
TOKEN=$(curl -s -X POST http://localhost/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@masterly-air-academy.dz","password":"admin123"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['access'])")

# Core
curl -s http://localhost/api/me/ -H "Authorization: Bearer $TOKEN"
curl -s http://localhost/api/subjects/ -H "Authorization: Bearer $TOKEN"
curl -s http://localhost/api/courses/ -H "Authorization: Bearer $TOKEN"

# Flight
curl -s http://localhost/api/aircraft/ -H "Authorization: Bearer $TOKEN"
curl -s http://localhost/api/flight-lessons/ -H "Authorization: Bearer $TOKEN"

# Exams
curl -s http://localhost/api/exams/ -H "Authorization: Bearer $TOKEN"
curl -s -X POST http://localhost/api/exams/{id}/start/ -H "Authorization: Bearer $TOKEN"
curl -s -X POST http://localhost/api/exams/{id}/submit/ -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"attempt_id":"...","answers":{"q1":"answer"}}'

# Finance
curl -s http://localhost/api/invoices/ -H "Authorization: Bearer $TOKEN"
curl -s -X POST http://localhost/api/invoices/ -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"student":"STUDENT_UUID","type":"tuition","amount":50000,"currency":"DZD"}'

# Quality
curl -s http://localhost/api/audits/ -H "Authorization: Bearer $TOKEN"
curl -s http://localhost/api/safety-events/ -H "Authorization: Bearer $TOKEN"
```

## 15. Edge Cases

| Scenario | Expected Result |
|----------|-----------------|
| Reload exam page mid-exam | Questions preserved (fetched from API again via stored attempt) |
| Two simultaneous logins (same user, different browsers) | Both work (token-based auth) |
| Very long student name | Truncated gracefully in tables and cards |
| Invoice with zero payments | Balance equals full amount |
| Exam with no questions | Error message shown |
| Room double-booking | Conflict error on course creation |
| Empty data states | All pages show appropriate "No X found" messages |

---

Generated for Sprint 10 — Masterly Air Academy Platform
