# Admin App vs Backend — Verified Audit Report

Read-only verification of `web/app-single/app/admin/**` against backend DRF serializers/models/views. Every finding below was confirmed by reading both sides (backend code and frontend code) — line citations are exact.

- CRITICAL: 1
- HIGH: 1
- MEDIUM: 5
- LOW: 6
- Observations / non-issues: 2
- **Total findings: 13** (plus 2 observations)

---

## CRITICAL

### C1 — Flight instructor saves 500 every time (phantom `phone` field)
- `backend/apps/students/serializers.py:73` — `phone = serializers.CharField(source='user.phone', ...)`
- `backend/apps/accounts/models.py` (`accounts.User`) — no `phone` field exists
- `backend/apps/students/models.py` (`FlightInstructor`) — no `phone` field either

**Read:** DRF attribute traversal raises `AttributeError` inside `get_attribute` → the field is silently dropped from `GET /flight-instructors/`. Phone never appears in any instructor record.

**Write:** `FlightInstructorSerializer.update` (serializers.py:91-97) pops `phone` and calls `instance.user.save(update_fields=['phone'])` → Django `ValueError` → HTTP 500.
The admin instructors page always includes `phone` in the PATCH payload (instructors/page.tsx:187, field at 547-554), so **every flight instructor update from the UI 500s**.

Fix: remove the field (and the `update()` branch) or map it to a real column on the model.

---

## HIGH

### H1 — Ground instructor viewsets serve fabricated data from the wrong model
- `backend/apps/students/views.py:403-477` — `GroundInstructorViewSet`

The viewset queries `User` rows by role instead of the real `GroundInstructor` model (students/models.py:140-159). `_serialize()` (views.py:414-426) hardcodes:
- `phone: ''`
- `license_number: ''`
- `qualifications: []`
- `total_hours: 0`, `instruction_hours: 0`, `student_count: 0`

The actual model fields (`medical_expiry`, `hire_date`, `authorized_subjects`, qualifications, etc.) are never exposed. Consequences:
- Ground instructor records in the admin instructors page show zeroed/fabricated data.
- PATCH silently drops `phone` and most fields (views.py:455-463).
- DELETE deactivates the `User` account rather than touching the instructor record.

---

## MEDIUM

### M1 — Users page silently caps at the first 20 users
- `web/app-single/app/admin/users/page.tsx:124` — `api.get("/users/")` without `withFullLimit`
- `backend/config/settings.py:159-160` — `PAGE_SIZE = 20` (backend paginator: `PageLimitPagination`, config/pagination.py:4-6)

The users table renders only the first page (20 rows). The Total/Active row counts and the stats compute only over loaded rows, and search/filter can't reach anything past page 20. The roles page (roles/page.tsx:89) and dashboard (dashboard/page.tsx:31) use `withFullLimit("/users/")` on the same endpoint — users page is the outlier.

### M2 — "ATPL" program offered by frontend, rejected by backend
- `web/app-single/lib/format-utils.ts:88` — `PROGRAMS` includes `"ATPL"`
- `backend/apps/students/models.py:6-11` — `TrainingProgram` = PPL / CPL / IR / MEP / MCC only
- `backend/apps/ground_training/models.py:17` — `Subject.program` uses `choices=TrainingProgram.choices`

The curriculum subjects form (curriculum/page.tsx:79) offers ATPL → backend rejects with 400 ("not a valid choice"); the ATPL filter option never matches anything. Other pages hard-code the correct 5 programs (students/page.tsx:56, evaluations/page.tsx:162) — inconsistent.

### M3 — `withFullLimit` sent as a literal query parameter
- `web/app-single/components/exercise-chip-selector.tsx:46` — `api.get("/flight-exercises/?is_active=true&withFullLimit")`

`withFullLimit` is an option passed to `api.get`'s second argument, not a query param. Backend pagination honors `?limit=`. Without it the exercise list silently truncates to the first 20 (PAGE_SIZE), so the chip selector only ever shows the first 20 exercises. Correct pattern: `withFullLimit("/flight-exercises/?is_active=true")`.

### M4 — Curriculum subjects: module count column always 0, nested modules never render
- `web/app-single/app/admin/curriculum/page.tsx:92` — column reads `s.modules_count ?? s.modules?.length ?? 0`
- `web/app-single/app/admin/curriculum/page.tsx:104-124` — `detailExtra` renders `s.modules`
- `backend/apps/ground_training/views.py:285-288` — list serializer is `SubjectListSerializer` (returns `module_count`, no `modules`)
- `backend/apps/ground_training/serializers.py:93-104` — `modules` only present on the detail serializer

List rows never contain `modules` or `modules_count`, so the "Modules" column is always 0 and the nested Modules table in the detail modal never populates.

### M5 — Application status is free-form; frontend statuses can drift out of sync
- `backend/apps/administration/models.py` — `Application.status = CharField(default='pending')`, no `choices`
- `web/app-single/app/admin/applications/page.tsx:44` — statuses include `submitted` / `withdrawn`
- `web/app-single/app/admin/applications/page.tsx:421` — review dialog offers only pending/under_review/accepted/rejected

The backend `review` action (administration/views.py:54-79) accepts any string. Statuses written by one surface can be invisible/unstyled elsewhere (no matching badge color).

---

## LOW

### L1 — Instructor status badge/filter enums don't line up
- `web/app-single/app/admin/instructors/page.tsx:39-44` — `STATUS_COLORS` keys: active, inactive, on_leave, suspended
- `web/app-single/app/admin/instructors/page.tsx:46` — `STATUSES` filter options: active, suspended, pending, archived
- Backend instructor `status` is a free `CharField` default `'active'` (students/models.py:147,172)

"On Leave" stat (page.tsx:329) counts `status === 'on_leave'`, but the edit form only allows active/suspended/pending/archived → On Leave is always 0. `pending`/`archived` rows get no badge color (gray fallback). UI exposes two different vocabularies for the same field.

### L2 — Permission grouping in the roles page is broken
- `web/app-single/app/admin/roles/page.tsx:162-174` — groups permissions by `codename.split('.')[0]`
- `backend/apps/accounts/serializers.py:202-210` — `codename` is `view_student`, `change_student`, etc. (no app-label prefix)

Splitting on `.` yields the whole codename, so permissions group by action verb (View / Add / Change / Delete) instead of by model. The `content_type_name` field that would allow proper grouping is never used.

### L3 — Students detail "Medical Expiry" always shows "—"
- `backend/apps/students/serializers.py:23` — `medical_expiry = DateField(read_only=True)` on `StudentListSerializer`
- `backend/apps/students/models.py:50-67` — `Student` has no `medical_expiry` field or property

Same phantom-field issue as C1: silently dropped on read, so the students detail modal's "Medical Expiry" (students/page.tsx:595-600) always renders the empty fallback.

### L4 — Dashboard "Active Students" counts suspended/pending accounts
- `web/app-single/app/admin/dashboard/page.tsx:74` — counts `role === 'student' && is_active !== false`
- Backend `User` has both `is_active` (bool) and `status` (active/suspended/pending/archived) — the two can disagree (status is only set via suspend/archive actions)

Suspended or pending student accounts count as "Active Students" on the dashboard KPI.

### L5 — Users page can't reset its own account password
- `web/app-single/app/admin/users/page.tsx:193` — password reset omits `current_password`
- `backend/apps/accounts/views.py:170-175` — the reset action rejects without `current_password` when the target is the current user

Any admin editing their own account gets a 400 ("current password required") with no explanation in the UI.

### L6 — Dead pagination class is a footgun
- `backend/apps/core/pagination.py:6-9` — `StandardPagination` (`page_size` param) is never wired; only `PageLimitPagination` is active (settings.py:159-160)

Not user-visible today, but a new view using `StandardPagination` would silently ignore `limit`. Recommend deleting it.

---

## Observations / non-issues

### N1 — 28 admin pages are redirect stubs
Verified 6-line stubs, `redirect()` at line 4 — e.g., `skill-tests` → `/admin/evaluations?tab=skill`, `subjects` → `/admin/curriculum?tab=subjects`. If these flows are intentionally under construction, fine; otherwise they hide entirely empty feature areas.

### N2 — Evaluations hub enums match backend
Verified matches (no bug):
- Competency statuses (not_started/in_progress/acquired/needs_reinforcement) — exams/models.py:25-29
- Ground evaluation flags (grade/module_validated/recommend_remedial/flagged) — ground_training/models.py:227-231
- Skill test / progress check statuses — exams/models.py:212,234
- Module lesson fields (video_* / is_mandatory / module_title) — ground_training/serializers.py:9-65

---

## How to verify the top findings

1. **C1 (500 on instructor save):** `PATCH /api/flight-instructors/{id}/` with `{"phone": "..."}` → HTTP 500. Also `GET /api/flight-instructors/` → no `phone` key.
2. **H1 (ground instructors):** `GET /api/ground-instructors/` → all records show empty phone/license, zeroed hours.
3. **M1 (users cap):** With >20 users, page shows exactly 20 and stats undercount.
4. **M2 (ATPL):** `POST /api/subjects/` with `program: "ATPL"` → 400.
5. **M3 (chip selector):** With >20 active flight exercises, chips stop at 20.
