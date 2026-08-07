# Masterly Air Academy — Full Codebase Audit Report

**Date:** 2026-08-06
**Method:** Deep read-only audit by 7 parallel reviewers covering the Django backend (`backend/`), Next.js web app (`web/app-single/`), React Native iPad app (`ipad/`), shared package, nginx, Docker/compose, and deploy scripts. Every finding was verified against source; nothing was modified.
**Scope excluded:** `node_modules`, `.next`, `.expo`, `dist`, migrations (used only for field context), `media/`.

## Executive Summary

| Severity | Count |
|---|---|
| CRITICAL | 13 |
| HIGH | 36 |
| MEDIUM | 82 |
| LOW | 49 |
| **Total** | **180** |

(7 informational positives are listed at the end.)

The single most dangerous cluster: **default/hardcoded credentials shipped to production** (admin123 superuser reset, staff passwords in deploy script, credentials in README, weak secrets in compose), plus **exam/quiz integrity bugs** that break grading and lock students out, plus **session security** (refresh tokens can never be revoked, JWT in URL query strings, tokens in localStorage).

---

## CRITICAL (13)

### Exam & Quiz integrity

**C1. Quiz graded against a different question set than the student answered**
- [Portals] `web/app-single/app/student/exams/page.tsx:233` sends `/quizzes/{id}/submit/` without `attempt_id` (discards `d.attempt_id` from `start`). Backend `backend/apps/exams/views.py:356-365` falls back to `question_ids=None` and `AutoGradingService.grade_quiz` (`services.py:51`) grades against `QuestionBank.objects.filter(...)[:10]` — but `start` delivered a *random* sample. Answers to off-list questions are ignored; on-list questions the student never saw count as wrong. **Scores are wrong for nearly every quiz whose bank exceeds 10 questions.**
- Fix: send the `attempt_id` returned by `start`; backend already uses it correctly.

**C2. Quiz with default `max_attempts=1` can never be submitted**
- [Portals] `backend/apps/exams/views.py:314-326` (`start` creates a `QuizAttempt` session) then `submit` checks `count() >= quiz.max_attempts` (`:351-353`) and creates a *second* record instead of updating the session. With the default `max_attempts=1` (`models.py:62`), start→count=1→submit rejected "Maximum 1 attempts reached". For N>1 every completion burns 2 rows. Abandoned `start` calls permanently consume slots.
- Fix: `submit` must update the start-session row (like `Exam.submit` at `:171-206`); count only attempts with `completed_at IS NOT NULL`.

**C3. Refreshing the exam page burns an attempt and can lock students out**
- [Portals] `web/app-single/app/student/exams/[id]/page.tsx:60-63` calls `POST /exams/{id}/start/` on mount; each call creates a new `ExamAttempt` with `attempt=existing+1` (`backend/apps/exams/views.py:143-147`). sessionStorage restores the student's answers but `attemptId`/questions belong to the *new* attempt, so restored answers (keyed by old question ids) score 0. With default `max_attempts=3`, 3 refreshes permanently lock the student out (`:129-130`).
- Fix: `start` should resume the latest dangling attempt (no `completed_at`); validate answers against the attempt's own question ids.

**C4. Students can retrieve correct answers via `preview`**
- [Backend] `backend/apps/exams/views.py:159-168` (`ExamViewSet.preview`) returns `QuestionWithAnswerSerializer` (includes `correct_answer` + `explanation`) to anyone holding `exams.view` (students do). For exams without fixed `ExamQuestion` rows it dumps the entire subject bank with answers. `QuestionBankViewSet` (`views.py:31-44`) is unscoped, so students can also list the whole bank.
- Fix: gate `preview` on `exams.manage`/`exams.grade`; scope `QuestionBankViewSet` to staff.

### Authentication / Security

**C5. Any authenticated user can trigger a full database backup**
- [Backend] `backend/apps/core/views.py:65-91` (`trigger_backup`) uses `HasRolePermission` with no `required_permission`; that permission class returns `True` when `required_permission` is missing (`apps/accounts/permissions.py:36-38`). Any student can call `/api/system/backup/` → `pg_dump` writes all PII/password hashes/finance to `../backups/`, echoing raw `stderr`/`str(e)` back, no throttle.
- Fix: require a manage-level permission, add a throttle, stop echoing command output.

**C6. Refresh tokens can never be revoked; logout is a no-op**
- [Backend] `config/settings.py:188-195` sets `ROTATE_REFRESH_TOKENS=True`/`BLACKLIST_AFTER_ROTATION=True` but `rest_framework_simplejwt.token_blacklist` is **absent from INSTALLED_APPS** (`settings.py:13-40`); simplejwt silently swallows the `AttributeError`, so old refresh tokens stay usable for the full 7-day lifetime. `LogoutView` (`apps/accounts/views.py:134-150`) only writes an audit log. `INACTIVITY_TIMEOUT_SECONDS` (`settings.py:261`) has zero consumers.
- Fix: install `token_blacklist` (or implement revocation); wire or remove the inactivity timeout.

**C7. Hardcoded superuser credential with forced reset on every boot**
- [Infra] `backend/apps/core/management/commands/create_superuser_if_missing.py` (invoked from `backend/docker/entrypoint.sh:35`) force-creates/resets the Django superuser to `admin123` on every container start; the value is also in the README. Anyone with repo access can log into the live deployment as full admin.
- Fix: create superuser only when absent, from an env/secret-provided password.

**C8. entrypoint hardcodes `exec gunicorn`, discards the container command**
- [Infra] `backend/docker/entrypoint.sh:46-53` ends with a literal `exec gunicorn ...` instead of `exec "$@"`, so the compose `celery` service's `command` is ignored — **the celery worker and beat never run**, and `CELERY_BEAT_SCHEDULE` (`settings.py:206-223`) never executes.
- Fix: replace with `exec "$@"`.

### iPad app (crashes)

**C9. Notifications list crashes — pagination cast**
- [iPad] `ipad/hooks/useNotifications.ts:21-22` casts the response to `Notification[]`, but `GET /api/notifications/` is paginated (`{count,next,previous,results}`). `unreadCount` at `:27-28` calls `.filter` on an object → `TypeError`. Breaks the More tab badge (`(app)/(more)/index.tsx:30,62`) and the notifications screen.

**C10. Messages list crashes — pagination cast**
- [iPad] `ipad/app/(app)/(more)/messages.tsx:40,52` cast paginated bodies to `Message[]` (the `sent` action paginates explicitly, `backend/apps/notifications/views.py:222-225`). Passing an object to `FlatList` → `VirtualizedList` throws.

**C11. Certificates list crashes — pagination cast**
- [iPad] `ipad/app/(app)/(more)/certificates.tsx:60` casts `GET /api/certificates/` (paginated `ModelViewSet`, `backend/apps/exams/views.py:373`) to `Certificate[]` → `FlatList` crash.

**C12. Invoices list crashes — pagination cast**
- [iPad] `ipad/app/(app)/(more)/invoices.tsx:71` casts paginated `GET /api/invoices/` to `Invoice[]` → `FlatList` crash.

**C13. Message-compose recipient search always crashes / never matches**
- [iPad] `ipad/app/(app)/(more)/messages-compose.tsx:43-45` casts `SearchService.search()` output to `SearchUser[]`, but `search_view` (`backend/apps/core/views.py:31-62`) returns `{results, source}`. At `:136` the empty check is `false`, so `:139 searchResults.slice(0,5)` throws `TypeError` on any query ≥2 chars. Even if it survived, results carry no `name`/`email`.
- Fix: unwrap `results` and map to recipient fields.

---

## HIGH (36)

### Backend

**H1. `cleanup_old_notifications` always crashes**
- [Backend] `backend/apps/notifications/tasks.py:43` — `cutoff = timezone.now() - timezone.timedelta(days=days)`. `django.utils.timezone` has no `timedelta` → `AttributeError` every run.
- Fix: `from datetime import timedelta`.

**H2. CAPA due notifications never get the `capa_due` type**
- [Backend] `backend/apps/quality_safety/services.py:150` emits `'type': 'capa_due'` but `tasks.py:24` tests `d['type'] == 'capa'` — never matches; alerts are sent as generic `deadline` and the category is unused.
- Fix: align the type string in tasks.py.

**H3. Broken access control — `admin_agent` can accept candidates and set their passwords**
- [Backend] `ApplicationViewSet.review` (`backend/apps/administration/views.py:54-117`) requires only `applications.view` (held by `admin_agent`); it promotes candidate→student, activates the account, and `set_password` with arbitrary values (`:84-89`). Data-entry role doing account creation + password setting.
- Fix: gate the activation branch on `applications.manage`/`approve`.

**H4. Mandatory lesson completion is client-attested**
- [Backend] `track_view` (`backend/apps/ground_training/views.py:147-209`) marks a lesson COMPLETED when `watched_seconds >= 0.9 * duration`, both client-supplied; `tab_switches` also client-supplied. Posting `position=1&duration=1` instantly completes any mandatory video, corrupting training-hour records.
- Fix: validate duration against server-side metadata; enforce a minimum threshold.

**H5. Unbounded, unvalidated uploads**
- [Backend] `MessageViewSet.upload` (`notifications/views.py:269-282`), `MedicalCertificateViewSet.upload` (`students/views.py:341-356`), `ModuleDocumentViewSet.upload/upload_file` (`ground_training/views.py:219-264`), `DocumentViewSet.upload` (`administration/views.py:449-525`) — no size/type limits; any user (incl. students) can exhaust storage and host arbitrary content. Profile photo upload (`accounts/views.py:89-131`, 5MB-limited) writes to local disk bypassing the S3 backend.
- Fix: one shared size+MIME guard; route profile photos through storage backend.

**H6. Unscoped global search + staff time entries visible to students**
- [Backend] `search_view` (`core/views.py:31-62`) and Meili path (`core/search.py:52-64`) return student/course/aircraft matches to any authenticated user (roster enumeration). `TimeEntryViewSet` (`ground_training/views.py:707-722`) requires `ground_training.view` (students hold it) with no student branch — students see all instructors' time entries.
- Fix: scope both by role.

**H7. Students can write via custom `@action` endpoints**
- [Backend] `HasRolePermission` gates only the standard verbs (`permissions.py:12-17`); custom actions only need the viewset's `view` permission. Concrete: `QuestionBankViewSet.import_bank` (`exams/views.py:60-67`) lets students bulk-create bank rows; `ModuleDocumentViewSet.upload` (`ground_training/views.py:219-264`) lets students create documents/files.
- Fix: give mutating `@action`s their own permission check.

**H8. `accounts.manage` / `invoices.view` mismatch seeded permissions**
- [Backend] Seeder (`seed_roles_permissions.py:11-33`) defines no `accounts` domain and no `invoices` domain (it has `settings:[view,manage]`, `invoicing:[...]`). `SystemSettingViewSet` (`core/views.py:19`) and `AdminProfileViewSet` (`students/views.py:381`) require `accounts.manage` → unreachable for intended `settings.manage` holders. `InvoiceViewSet` requires `invoices.view` (`administration/views.py:122`) — only `finance_responsible` passes; `accounting_agent` is denied. Seeder line 237 references `'invoices'` domain never seeded.
- Fix: use `settings.manage` and `invoicing.view`.

**H9. PDF export HTML is not escaped (XSS in official reports)**
- [Backend] `backend/apps/flight_training/views.py:350,353,356,359,581-582`, `backend/apps/quality_safety/pdf.py:23`, `backend/apps/exams/pdf.py:110-126,152-172` — free-text fields (observations, notes, instructor notes, NCR rows) interpolated raw into HTML fed to WeasyPrint; a user can inject arbitrary HTML (spoof signatures, alter displayed content) into official PDF reports.
- Fix: `html.escape()` / `format_html` all user text.

**H10. Unscoped student-document visibility default**
- [Backend] `administration/views.py:517` — student uploads default to `is_public=True` (only `'false'/'False'/'0'` treated as private), becoming public library documents with no review.
- Fix: default `is_public=False` for student uploads.

### Web plumbing

**H11. Access **and refresh** tokens persisted in `localStorage`**
- [Plumbing] `web/app-single/lib/auth-context.tsx:70,75,92` and `lib/api.ts:139-141` — both tokens readable by any XSS on any route; one injection exfiltrates a persistent session.
- Fix: HttpOnly cookies (or short-lived refresh rotation + in-memory access).

**H12. Global error/404 pages render raw untranslated keys**
- [Plumbing] `web/app-single/app/error.tsx:26,29,35`, `app/not-found.tsx:14,17,23` — keys `common.error`, `common.unexpectedError`, `common.pageNotFound`, etc. are **absent from all three dictionaries**; `t()` returns the key itself, so the `|| "..."` fallbacks are unreachable dead code and users see `common.pageNotFound` on every 404/crash.
- Fix: add the keys to all three locales (or remove fallback).

**H13. Core dashboard and logbook pages render raw i18n keys**
- [Plumbing] `web/app-single/app/dashboard/page.tsx:121,134,161`; `components/instructor-logbook-panel.tsx:85,97,146,160,163,190` — verified missing keys `dashboard.schedule`, `common.student`, `common.instructor`, `common.type`, `common.notes`, `common.allStatuses`, `instructor.rejectionReason`, `instructor.todaysFlights`, `maxAttempts`, `retakeExam`, `startExam` render raw key text on screen.
- Fix: add the missing keys to all three locales.

**H14. Every page declares the same canonical URL (homepage)**
- [Plumbing] `web/app-single/app/layout.tsx:46-47` — root-layout `generateMetadata` sets canonical `${BASE_URL}/${locale}` for ALL routes, so login/dashboard/portal pages canonicalise to the landing page. SEO integrity bug.
- Fix: set canonical per-route (metadata in layouts/pages) or via a helper.

**H15. `app/exams/[hash]` bypasses the API client with raw `fetch`**
- [Plumbing] `web/app-single/app/exams/[hash]/page.tsx:93,217` — `/api/exam/submit/` and `/api/exam/access/` bypass `lib/api.ts` (no envelope unwrap, no 401-refresh). An expired token in the exam portal yields a raw non-2xx with no retry; auto-logout is disabled there (I2), so the user can be stuck.
- Fix: route through `api.*`.

**H16. Auth'd downloads skip the 401-refresh path**
- [Plumbing] `web/app-single/lib/api.ts:204-213` (`download()`) throws on non-OK and never refreshes, unlike `request()`. `SecureImage`, `video-player`, `pdf-reader` all rely on it; expired token breaks every protected image/video/PDF until a full reload.
- Fix: reuse the single-flight refresh in `download()`.

**H17. `robots.txt` points to a staging nip.io domain**
- [Plumbing/Infra] `web/app-single/public/robots.txt:3` → `https://185.185.80.188.nip.io/sitemap.xml` while `sitemap.ts:3` defaults to `masterly-air-academy.dz`.
- Fix: derive from `SITE_URL` env.

**H18. Metadata base falls back to `https://localhost`**
- [Plumbing] `web/app-single/app/layout.tsx:11` — canonical/OG/JSON-LD `@id` URLs resolve to `https://localhost` when `NEXT_PUBLIC_SITE_URL` is unset. Two independent `BASE_URL` constants (`layout.tsx:11`, `sitemap.ts:3`) can drift.
- Fix: one shared source.

### Web portals

**H19. Raw `fetch("/api/...")` bypasses `API_BASE` app-wide**
- [Portals] A dozen places hardcode paths instead of using `api.ts:51`: SSE hooks `lib/use-notification-stream.ts:45`, `lib/use-message-stream.ts:51`; finance `app/finance/invoices/page.tsx:156`, `contracts/page.tsx:94`; student downloads `documents/page.tsx:57`, `medical/page.tsx:51`, `payments/page.tsx:121`, `certificates/page.tsx:50`, `profile/page.tsx:92`; `instructor/modules/page.tsx:547`; `app/exams/[hash]/page.tsx:93,217`; `app/tv/page.tsx:106`; `app/page.tsx:508,530`; `admin/students/page.tsx:101`; `quality/safety/page.tsx:132,138`. Any deployment with a separate API origin breaks SSE, PDFs, uploads, downloads.
- Fix: use `api.getBaseUrl()`/`api.download()` everywhere.

**H20. SSE backfill duplicates items and clobbers read state on every page load**
- [Portals] Streams backfill last 5 notifications (`backend/apps/notifications/views.py:124`) and last 10 messages (`:327`) when `since` is absent — which is every first connect (`options.since` never passed). `notification-bell.tsx:35-36`, `NotificationsPage.tsx:468-469`, `MessagesPage.tsx:560-563` prepend with no dedup-by-id. The SSE payload also omits `is_read` (`:131-138`), so pages force `is_read:false` on every backfilled item — already-read notifications reappear as unread and inflate the badge.
- Fix: dedupe by id; include `is_read`; pass a real cursor.

**H21. Equal-timestamp events are dropped; poll fallback loses messages**
- [Portals] Clients accept only `new Date(payload.created_at) > new Date(sinceRef)` (`use-notification-stream.ts:70`, `use-message-stream.ts:76-78`), so same-instant events are permanently lost. Backend poll fallback emits only the single newest message (`notifications/views.py:157-159`, `:350-353`).
- Fix: use `>=` or a monotonic id/offset cursor; page the poll fallback.

**H22. Payment amounts are never validated (client or server)**
- [Portals] `PaymentSerializer` (`backend/apps/administration/serializers.py:39-47`) has no `validate`; frontend enters amounts via a raw browser `prompt()` + `parseFloat` (`app/finance/invoices/page.tsx:117-119`), accepting negative/zero/NaN. `refresh_invoice_status` marks paid when `paid >= amount` (`administration/views.py:28-29`) — a negative payment can revert a paid invoice.
- Fix: validate `0 < amount <= balance` server-side; replace `prompt()` with a modal.

**H23. Solo-flight authorization threshold enforced only in the UI**
- [Portals] The button appears only when `grade >= 7 && flightDuration > 0` (`app/instructor/flights/[id]/evaluate/page.tsx:159`), but `authorize_solo` (`backend/apps/flight_training/views.py:178-199`) checks only medical cert, ≥15 flight hours, competencies — not the grade. A direct API call authorizes a sub-standard solo.
- Fix: enforce the threshold server-side.

**H24. Second tab-switch force-submits the exam with no server-side evidence**
- [Portals] `web/app-single/app/student/exams/[id]/page.tsx:114-136` auto-submits on the 2nd `visibilitychange` but (unlike the final-exam portal, `final_views.py:569-575`) sends no violation record. An OS popup/minimize silently burns an attempt with no audit trail.
- Fix: send violations like the final-exam portal.

**H25. Real backend errors are masked by dead `d.error` branches**
- [Portals] Backend errors use key `error` (`exams/views.py:130,197,316,353`, `flight_training/views.py:191,199`, `quality_safety/views.py:257`), but the API client reads `raw.message || raw.detail` (`web/app-single/lib/api.ts:96-100`) and the renderer only wraps 2xx. So `if (d.error)` checks (`student/exams/page.tsx:214`, `[id]/page.tsx:49`) never fire; students see "Failed to submit" instead of "Maximum attempts reached".
- Fix: align error keys.

**H26. Grade scale is not enforced server-side**
- [Portals] UI constrains grade to 0–10 but backend `DecimalField(max_digits=4, decimal_places=1)` (`flight_training/models.py:102`) accepts up to 999.9; the PDF renders `{grade}/10` (`flight_training/views.py:345`), producing nonsense like `95/10` from a direct API call.
- Fix: add a server-side `MinValueValidator/MaxValueValidator`.

**H27. Invoice creation dropdown only lists the first 20 students**
- [Portals] `app/finance/invoices/page.tsx:72-77` calls `/students/` without `withFullLimit` (`api.ts:228-231`); only `PAGE_SIZE=20` students are selectable.
- Fix: add `withFullLimit`.

### iPad

**H28. Profile editing is impossible**
- [iPad] `ipad/app/(app)/(more)/profile.tsx:103-106` sends `{first_name, last_name}` via `PUT /api/profile/`, but `ProfileUpdateSerializer` (`backend/apps/accounts/serializers.py:147-199`) only accepts `current_password/password/password_confirmation/address/phone/nationality` → always 400.
- Fix: align the contract.

**H29. Profile screen shows wrong data**
- [iPad] `ProfileService.getProfile` (`services/profile.service.ts:4`) calls `GET /api/me/`, which returns only `{id,name,email,role,status,...}` (`accounts/views.py:23-37`). `profile.tsx:153-155` reads `first_name`/`last_name` (blank name/avatar), `:255-271` reads `student_number`/`program`/`enrollment_date` (always N/A), `:277-283` `medical_certificates` never rendered.
- Fix: fetch `/api/students/me/` (or the profile endpoint) and match fields.

**H30. Expired session never logs the user out**
- [iPad] On refresh failure `ipad/lib/api.ts:90-93` clears tokens but not the stored user; `hydrate()` (`store/auth-store.ts:46-53`) re-authenticates from stored user alone → app stays "logged in" with dead tokens, every request silently fails. `app/_layout.tsx:17-19` also renders `null` during hydration, so the login screen never appears after restart with a stale user.
- Fix: clear the stored user on refresh failure; show splash during hydration.

**H31. Exam start is a POST inside `useQuery`**
- [iPad] `ipad/app/(app)/exams/session.tsx:42-46` calls `ExamsService.start(examId!)` in a `queryFn`; `POST /exams/{id}/start/` creates a new `ExamAttempt` each time (`backend/apps/exams/views.py:122-147`). Refetch/refocus/remount silently burns attempts.
- Fix: start via `useMutation` guarded by a "started" state.

**H32. Exam detail ignores backend attempt limits**
- [iPad] `ipad/app/(app)/exams/[id].tsx:46-49` hardcodes `attempts_used: 0`/`can_attempt: true`; the backend rejects start once `max_attempts` reached, leaving the user with an error instead of a disabled button.

**H33. Exam timer drifts and misreports remaining time**
- [iPad] `ipad/components/exams/Timer.tsx:44-54` decrements a local counter via `setInterval` with no `Date` basis and no AppState handling; after background/lock the remaining time is wrong and auto-submit can fire late (backend then 400s "Exam duration has elapsed", `views.py:194-197`).

**H34. Anti-cheat false positives during exam**
- [iPad] `ipad/components/exams/AntiCheatOverlay.tsx:24-29` counts both `background` and `inactive` states as violations with no grace period; `:17-19` requests camera permission mid-exam, and the camera prompt itself triggers the state transition. 3 violations auto-submit (`session.tsx:70-75`).

**H35. Biometric login button is a no-op**
- [iPad] `ipad/app/login.tsx:63-76` authenticates via Face ID then does nothing (no login, no navigation); the login screen is only reachable when no user is stored. Feature cannot work.

**H36. Course materials never render**
- [iPad] `ipad/app/(app)/courses/[id].tsx:54-56` expects an array or `{results}` but `GET /api/courses/{id}/materials/` returns `{course_id, modules:[...]}` (`backend/apps/ground_training/views.py:418-440`) → always `[]` → "No data available".

### Infra

*(H17 already merged above — robots/sitemap nip.io.)*

**H37. Weak default secrets and `DEBUG=true` in compose**
- [Infra] `docker-compose.yml:27-43` — default `SECRET_KEY`, `DB_PASSWORD`, `REDIS_PASSWORD`, MinIO creds, with `DEBUG` defaulting to `true`. Deploying without overrides yields guessable prod credentials + debug output.
- Fix: require `.env`, default `DEBUG=false`.

**H38. Hardcoded staff passwords in the VPS deploy script**
- [Infra] `deploy-vps.sh:5-8` creates `director`/`finance`/`quality`/`scheduler` accounts with hardcoded passwords committed to the repo.
- Fix: source from env/secret store; rotate exposed accounts.

**H39. Credentials published in the README**
- [Infra] `README.md:130-142` documents admin/staff credentials for the live stack.
- Fix: remove; reference a secret store.

**H40. `.env.example` omits critical variables**
- [Infra] Missing `SITE_URL`, `CSRF_TRUSTED_ORIGINS`, `ALLOWED_HOSTS`, all `EMAIL_*`, all `NEXT_PUBLIC_*`/`EXPO_PUBLIC_*` consumed by the stack.
- Fix: document every var read by compose/settings/clients.

**H41. Hardcoded production API URL over cleartext HTTP on iPad**
- [Infra] `ipad/constants/config.ts:1` defaults `EXPO_PUBLIC_API_URL` to `http://185.185.80.188`; `app.json` has no ATS exception. Embeds a prod host, forces insecure HTTP.
- Fix: resolve from env; add ATS exception; use HTTPS.

**H42. Uploads lost on restart — no MinIO bucket init, no media volume**
- [Infra] `docker-compose.yml` has no MinIO bucket-init; api mounts no volume for `/app/media`, while `accounts/views.py` writes photos to local disk. A container recreate either 500s or silently loses uploads.
- Fix: add bucket-init container + persistent media volume.

**H43. `collectstatic` fails silently at build time**
- [Infra] `backend/Dockerfile:20-21` runs `collectstatic` without `SECRET_KEY`, which `settings.py:7` requires via `os.environ['SECRET_KEY']` → `KeyError`. Admin/static assets can be missing or stale in the image.
- Fix: build-time placeholder key or run at container start.

---

## MEDIUM (82)

### Backend

**M1. N+1 loops in report endpoints**
- [Backend] `backend/apps/core/report_views.py:359-366` — per-aircraft `aggregate(Sum)` + `.count()` in a loop; same for instructors; per-program queries at `:230-232`; balance loop at `:29-30/:216` without `select_related`.
- Fix: `values(...).annotate(...)` / `select_related`.

**M2. N+1 + unbatched writes in `check_overdue_invoices`**
- [Backend] `backend/apps/administration/tasks.py:12-33` — no `select_related('student__user')`; per-invoice `save()` + 2 notification inserts each.
- Fix: `select_related`, `bulk_update`.

**M3. `video_views` prefetch is ineffective**
- [Backend] `backend/apps/ground_training/views.py:119` prefetches `video_views` but `serializers.py:46` calls `obj.video_views.filter(student=...)`, bypassing the prefetch cache → 1 query per lesson.
- Fix: iterate the prefetched cache.

**M4. Errors silently swallowed in audit signals**
- [Backend] `backend/apps/core/signals.py:34,44` — bare `except Exception: pass` around snapshot/diff; audit-log entries silently dropped.
- Fix: log the exception.

**M5. Non-deterministic exam question selection**
- [Backend] `backend/apps/exams/services.py:13` — `QuestionBank.objects.filter(...)[:exam.question_count or 20]` with no ordering; `question_count=0` silently falls back to 20.
- Fix: `order_by('id')` and handle 0 explicitly.

**M6. Exam auto-grading edge cases**
- [Backend] `backend/apps/exams/services.py:21,34` — answers compared case-insensitively as exact strings; `passing_grade=0` becomes 70 (falsy check). Masks misconfiguration.
- Fix: normalize answers; explicit falsy handling.

**M7. Silent import fallbacks**
- [Backend] `backend/apps/exams/final_bulk_import.py` — unrecognized question type/difficulty silently defaults to MCQ/MEDIUM, masking upload data errors.
- Fix: report/reject unknown values.

**M8. Grade comparison by raw string equality**
- [Backend] `backend/apps/exams/services.py:21` — whitespace/formatting differences (e.g. `"A."` vs `"A"`) in short-answer questions grade wrong.
- Fix: normalize (trim/casefold/strip punctuation).

**M9. Dead roles/domains in notifications**
- [Backend] `backend/apps/administration/views.py:261-262` notifies `['finance_manager','system_admin']` but `finance_manager` is not a `UserRole` (roles are `finance_responsible`/`accounting_agent`) → overdue-payment alert never reaches staff.
- Fix: use valid role names.

**M10. Hardcoded default secrets for Meili/MinIO**
- [Backend] `config/settings.py:227` (`MEILI_KEY`→`masterkey`), `:230-233` (`minioadmin`/`minioadmin`) applied when env vars are absent — in non-dev deployments search/object storage are effectively unauthenticated.
- Fix: fail hard without explicit secrets outside dev.

### Web plumbing

**M11. `cookies()` in root layout forces dynamic rendering app-wide**
- [Plumbing] `web/app-single/app/layout.tsx:32,81` — `cookies()`/`generateMetadata` are dynamic APIs in Next 15.5; using them in the root layout disables static/ISR for the whole tree (~219 routes), including marketing pages.
- Fix: middleware header instead.

**M12. Auth'd downloads skip the 401-refresh path** *(see H16)*

**M13. `<html lang="en">` hardcoded regardless of locale**
- [Plumbing] `web/app-single/app/layout.tsx:84` — stays `en` even when the locale cookie is `fr`/`ar`; screen readers and search engines get wrong signals.
- Fix: set `lang` from the resolved locale.

**M14. `userScalable:false` disables pinch-zoom**
- [Plumbing] `web/app-single/app/layout.tsx:76` — violates WCAG 1.4.4; applied to every route.
- Fix: allow zoom or add a rescue path.

**M15. Global fixed overlays render on every route**
- [Plumbing] `web/app-single/app/layout.tsx:88` — `NotificationBell` + `LanguageSwitcher` float bottom-right (z-10000) on marketing/auth/404 pages; the bell renders for unauthenticated visitors.
- Fix: conditionally render per route/auth.

**M16. Three notification data channels run in parallel**
- [Plumbing] SSE (`notification-bell.tsx:35-41`) + 30s poll (`:28-33`) + unread-count poll (`use-unread-counts.ts`) — every SSE event also dispatches `maa:notifications-changed`, triggering yet another refetch. Redundant network + duplicated state.
- Fix: pick one push channel + one count source.

**M17. Locale-prefixed vs plain URL duplication, no canonicalization**
- [Plumbing] `middleware.ts:13-25` — `/en/login` and `/login` both resolve; no redirect either way; locale cookie set only on prefixed visits.
- Fix: canonical redirects; always set the cookie.

**M18. API rewrite default `http://api:8000`**
- [Plumbing] `web/app-single/next.config.js:5` — non-Docker deployments without `NEXT_PUBLIC_API_URL` silently get a dead API endpoint; config exists in two unrelated places.
- Fix: env-driven rewrite.

**M19. Missing keys silently fall back to English**
- [Plumbing] e.g. `components/inactivity-detector.tsx:102`, `notification-bell.tsx:74-75` — a hidden English leakage layer for fr/ar users.
- Fix: add keys to all locales.

**M20. JSON-LD contains a placeholder telephone number**
- [Plumbing] `web/app-single/app/layout.tsx:109` — `+213-xxx-xx-xx-xx` shipped as structured data (Google Knowledge Panel ingests it).
- Fix: use a real number or remove.

**M21. Mixed-language single `FAQPage` schema block**
- [Plumbing] `web/app-single/app/layout.tsx:139-172` — four EN + one FR + one AR Q&A in one `mainEntity`, no `inLanguage`.
- Fix: separate blocks per language.

**M22. `app/error.tsx` displays raw internal `error.message`**
- [Plumbing] `web/app-single/app/error.tsx:29` — shows Django error strings verbatim to users, masking translated fallback.
- Fix: log it, show translated text.

**M23. `withFullLimit` silently caps lists at 1000**
- [Plumbing] `web/app-single/lib/api.ts:228-231` — if backend max changes, lists truncate with no pagination UI.
- Fix: real pagination or explicit cap UI.

**M24. `useAuthGuard` hardcodes the staff login**
- [Plumbing] `web/app-single/lib/use-auth-guard.ts:19` — sends students to `/login` (staff) instead of `/student/login`; cf. role-aware split in `auth-context.tsx:246-247`.
- Fix: role-aware redirect.

**M25. `next.config.js` wildcard remote image host**
- [Plumbing] `web/app-single/next.config.js:9-11` — `hostname: '**'`; inert today (images unoptimized) but an SSRF-adjacent hole if optimization is enabled.
- Fix: allowlist hosts.

**M26. Offline "sync" is nearly empty**
- [Plumbing] `lib/offline-queue.ts` only queues flight-log entries; `sw.js` precaches only `/`, the manifest and two icons and navigates network-first — offline mode offers almost nothing.
- Fix: precache the app shell; queue more mutations.

**M27. Empty `?token=` always appended**
- [Plumbing] `web/app-single/lib/download.ts:45` — appends `?token=` even when no token exists and never refreshes first (see H16).
- Fix: skip the param when absent; refresh first.

### Admin web app

**M28. Users page silently caps at the first 20 users**
- [Admin] `web/app-single/app/admin/users/page.tsx:124` — `/users/` without `withFullLimit`; roles (`roles/page.tsx:89`) and dashboard use it correctly.
- Fix: add `withFullLimit`.

**M29. "ATPL" program offered by frontend, rejected by backend**
- [Admin] `web/app-single/lib/format-utils.ts:88` includes `"ATPL"`; `backend/apps/students/models.py:6-11` allows PPL/CPL/IR/MEP/MCC only. The curriculum form offers ATPL → 400.
- Fix: align the program list.

**M30. `withFullLimit` sent as a literal query parameter**
- [Admin] `web/app-single/components/exercise-chip-selector.tsx:46` — `/flight-exercises/?is_active=true&withFullLimit`; the option must be an arg, so the chip selector silently truncates to the first 20 exercises.
- Fix: `withFullLimit("/flight-exercises/?is_active=true")`.

**M31. Curriculum subjects: module count always 0, modules never render**
- [Admin] `web/app-single/app/admin/curriculum/page.tsx:92,104-124` read `modules_count`/`modules`, but the list serializer (`ground_training/serializers.py:93-104`) only exposes `modules` on detail. Rows show 0 and the nested table is always empty.
- Fix: use the detail serializer or add fields to list.

**M32. Application status is free-form**
- [Admin] `backend/apps/administration/models.py` — `status` CharField with no choices; frontend statuses (`submitted`, `withdrawn`) can drift; the review action accepts any string.
- Fix: enforce choices; sync frontend/backend sets.

### Web portals

**M33. Orphaned duplicate lesson/exercise routes with divergent behavior**
- [Portals] `app/student/courses/[id]/lesson/[lessonId]/page.tsx` (plain Vimeo, no tracking) duplicates `app/student/courses/lesson/[lessonId]/page.tsx` (tracking variant). Only flat routes are linked; the nested ones are unreachable dead code. Deep links to the nested route skip mandatory-video tracking.
- Fix: delete nested routes or redirect.

**M34. Quiz "Try Again" closes the quiz instead of retrying**
- [Portals] `app/student/exams/page.tsx:258` — `onRetry={() => { setError(null); onClose(); }}`.
- Fix: re-run `start`.

**M35. `getAttemptCount` counts dangling attempts**
- [Portals] `app/student/exams/page.tsx:58` counts all rows from `/exams/my_attempts/` (backend returns every `ExamAttempt`, `views.py:245`), so an abandoned start counts as a used attempt (compounds C3).
- Fix: filter to completed attempts.

**M36. `useAuthGuard` silently passes when role is missing**
- [Portals] `web/app-single/lib/use-auth-guard.ts:18` — `if (allowedRoles && userRole && !allowedRoles.includes(userRole))`; a user with null role is not redirected.
- Fix: redirect when role is missing.

**M37. Message/safety upload & download endpoints have no size/type/ownership scoping**
- [Portals] `upload` (`quality_safety/views.py:251-259`, `notifications/views.py:269-282`) accepts any file from any auth user; `download` (`:284-301`, `quality_safety/views.py:261-281`) streams any `/media/...` key to anyone authenticated (path traversal blocked by `safe_join`, but no ownership check).
- Fix: size/type limits + ownership scoping.

**M38. `select_for_update` is a no-op without an atomic block**
- [Portals] `backend/apps/exams/final_views.py:483` uses `select_for_update` outside `transaction.atomic()`; `exam_submit` (`:529`) has no lock → double-submit race.
- Fix: wrap in `atomic()`; check completed under lock.

**M39. Candidate sees a provisional score that ignores essay points**
- [Portals] `exam_submit` stores `final_score_percent(max_points, earned_points)` (`final_views.py:563-566`) where essays earn 0 (`compute_assignment_points`, `:46-48`); the shown score is wrong until a later manual `grade`.
- Fix: don't return a final score until `essay_graded`.

**M40. `sinceRef` staleness on enabled-toggling**
- [Portals] `use-message-stream.ts:32-33` / `use-notification-stream.ts:26-27` — `options.since ?? sinceRef.current` never resets, so after the bell disables the stream during an exam the reconnected stream reuses a stale cursor and drops events.

**M41. Scheduler bookings hardcode `status: "confirmed"`**
- [Portals] `app/scheduler/bookings/page.tsx:70` bypasses any pending/approval workflow/conflict check.

**M42. Quiz answers are not persisted to sessionStorage**
- [Portals] Exam page saves answers on failed submit (`[id]/page.tsx:105-107`) but the quiz taker doesn't; a network blip loses all quiz answers.

**M43. `exam_status`/`exam_access` allow unauthenticated access-code probing**
- [Portals] `final_views.py:477-518,586-597` are `AllowAny`; the 404-vs-400 distinction lets an attacker enumerate valid access codes (16-hex, infeasible to brute force, but status/validity leaks).
- Fix: uniform error response.

**M44. `loadMore` skips a page after a failed request**
- [Portals] `app/finance/invoices/page.tsx:65-70` increments `page` even when the fetch fails → next retry starts at page+2.

**M45. Contract "Generate PDF" uses `window.open(file_url)` after a raw POST**
- [Portals] `app/finance/contracts/page.tsx:94` — new tab can't attach the Bearer token; if media is auth-protected the tab 404s/401s.

**M46. Raw English strings not wrapped in `t()`**
- [Portals] Exam placeholders `app/student/exams/[id]/page.tsx:248,252`; evaluate inputs' fallbacks; the public exam portal `app/exams/[hash]/page.tsx:279-405`; `app/finance/invoices/page.tsx:156`. Arabic/French show English.

**M47. Missing client-side auth guard on `quality/safety`**
- [Portals] `app/quality/safety/page.tsx:1-28` has no `useAuthGuard`/`useAuth`; an unauthenticated visitor renders the shell (data stays protected server-side). Inconsistent with siblings.

**M48. `NotificationsPage` contains two full duplicate implementations**
- [Portals] `StaffNotificationsView` (`NotificationsPage.tsx:171`) and `StudentNotificationsView` (`:439`) both prepend SSE items without dedup and both re-fetch — divergent behavior for the same feature.

**M49. Flight instructor save 500s on the admin UI** *(admin CRITICAL C1 — cross-listed)*
- [Admin] `backend/apps/students/serializers.py:73` maps `phone = serializers.CharField(source='user.phone')` but no `phone` exists on `User` or `FlightInstructor` → dropped on read, `ValueError`/HTTP 500 on every PATCH from the admin instructors page (`instructors/page.tsx:187,547-554`).
- Fix: remove the field/branch or map to a real column.

**M50. Ground instructor viewsets serve fabricated data from the wrong model**
- [Admin] `backend/apps/students/views.py:403-477` — queries `User` rows instead of `GroundInstructor`; hardcodes `phone:''`, `license_number:''`, `qualifications:[]`, zeroed hours. Admin instructors page shows zeroed/fabricated data; PATCH drops fields; DELETE deactivates the User.
- Fix: use the real model.

### iPad

**M51. Attendance endpoint mismatch (405)**
- [iPad] `ipad/services/attendance.service.ts:4-5` does `GET /api/courses/{id}/attendance/` but the backend action is POST-only (`backend/apps/ground_training/views.py:385-386`). (The `GET /api/attendance/?course=` in `courses.service.ts` is valid.)

**M52. Search API shape mismatch**
- [iPad] `SearchService.search` (`services/search.service.ts:5`) doesn't unwrap `{results, source}`; DB fallback omits users entirely, so compose can never find a recipient.

**M53. Exam flow is completely unlocalized**
- [iPad] `session.tsx` hardcodes "Submit Exam", "Prev", "Next", "Warning: Violation x/3", "Too Many Violations", "Loading exam...", "Type your answer..." (`:87-93,102,113,141,162,185,203,216,248,257`); `message-detail.tsx:30,46,49,67,74,81,88`; `exams/index.tsx:80-81,115,121,128-129,158-159` — though keys exist in `en/common.json:59-81`.

**M54. `ErrorState` not translatable**
- [iPad] `ipad/components/ui/ErrorState.tsx:13,21-22,26` hardcodes "Oops!", message, "Retry".

**M55. Validation messages are English-only**
- [iPad] `ipad/utils/validators.ts` zod schemas hardcode English error strings.

**M56. Skeleton shimmer NaN on string widths**
- [iPad] `ipad/components/ui/Skeleton.tsx:33` uses `-(width as number)`; callers pass `width="40%"` (e.g. `message-detail.tsx:33-35`) → NaN animations.

**M57. Course subject lookup broken**
- [iPad] `courses/index.tsx:41` filters on `c.subject_title` but `CourseSerializer` (`ground_training/serializers.py:128-142`) returns `subject_code`; `courses/[id].tsx:107` shows the raw subject UUID as subtitle.

**M58. Message detail never marks read**
- [iPad] `message-detail.tsx` never calls `mark_read` though the endpoint exists (`notifications/views.py:233-240`).

**M59. Push notifications are dead code**
- [iPad] `ipad/lib/notifications.ts` is imported nowhere; no `getExpoPushTokenAsync` call, no token registration with the backend.

**M60. Dead/unused services**
- [iPad] `store/sync-store.ts` and `hooks/useOffline.ts` imported nowhere; `NotificationsService` and `AttendanceService` unused/duplicate.

**M61. Attendance stat label copy-paste bug**
- [iPad] `courses/[id].tsx:218` renders `t('courses.upcoming')` ("Upcoming") under the "late" counter.

**M62. Currency formatting hardcoded en-US**
- [iPad] `ipad/utils/formatters.ts:20-23` uses `Intl.NumberFormat('en-US',...)` regardless of locale.

### Infra

**M63. `shared/` is dead code**
- [Infra] `shared/` has no package.json/tsconfig; zero imports from web/iPad/backend. Its types/validators/locales are unused yet maintained.
- Fix: convert to a real package or delete.

**M64. Translations duplicated three ways with divergent text**
- [Infra] `shared/locales/*/common.json` (45 keys), `ipad/assets/locales/*/common.json` (170), `web/app-single/lib/use-translation.ts` (572/language) — same strings in three independent copies; updates must be applied three times and will drift.
- Fix: single source of truth.

**M65. Validator rules diverge across clients and server**
- [Infra] `shared/validators/index.ts`, `web/app-single/lib/validators.ts`, `ipad/utils/validators.ts`, plus backend password rules — different rules; users rejected server-side for input the client deemed valid.
- Fix: centralize and sync backend.

**M66. Duplicated API/model types**
- [Infra] `shared/types/index.ts` vs `ipad/types/api.ts` + `models.ts` — iPad maintains its own copy; schema changes drift.
- Fix: generate types from backend into `shared/`.

**M67. SSE location drops inherited security headers**
- [Infra] `nginx/nginx.conf:127-140` — the SSE location overrides the inherited `add_header` set (`:32-38`); HSTS/X-Frame-Options etc. lost on SSE responses.
- Fix: repeat headers in the SSE block.

**M68. Compression lacks `gzip_vary` and caching headers**
- [Infra] `nginx/nginx.conf:24-25` — no `gzip_vary`, no cache-control for hashed assets.
- Fix: add both.

**M69. Nested login throttling causes confusing 429s**
- [Infra] `nginx/nginx.conf:28-29` — login hits both the 5r/m login limit and the 30r/s api limit; unpredictable 429s.
- Fix: single limit per zone.

**M70. Streaming no-buffer regex misses document downloads**
- [Infra] `nginx/nginx.conf:76` — covers `module-lessons` but not `module-documents/*/download/`; large downloads buffered.
- Fix: extend regex.

**M71. `/api/` proxy uses HTTP/1.0 without upgrade support**
- [Infra] `nginx/nginx.conf:99-106` — no `proxy_http_version 1.1`; harms SSE/streaming keepalive.
- Fix: set `proxy_http_version 1.1` + `Connection`.

**M72. Deploy health check targets the wrong port**
- [Infra] `deploy.sh:34-35` curls `localhost:80` but compose binds nginx to `127.0.0.1:7788` → post-deploy check can false-fail.
- Fix: target `:7788` or read from env.

**M73. Roundcube hardcodes the Docker host gateway IP**
- [Infra] `docker-compose.yml:212-213` — `extra_hosts` `172.19.0.1` only matches one specific bridge network.
- Fix: `host.docker.internal` or configurable.

**M74. Web image is environment-coupled through build-time API base**
- [Infra] `web/Dockerfile` bakes no `NEXT_PUBLIC_API_URL`; `api.ts:5` + `next.config.js:5` rely on the same-origin rewrite. The same image can't target different backends.
- Fix: pass as build ARG; make rewrite env-driven.

**M75. Archive tarballs leak into images**
- [Infra] `backend/apps_backend.tar`, `apps_backend2.tar`, `web/app-single/deploy.tar` exist in-tree and are not in `.dockerignore` → baked into images (bloat + potential embedded secrets).
- Fix: add `*.tar` to both dockerignore files.

**M76. api service receives no `EMAIL_*` envs; settings fall back to a bogus SMTP host**
- [Infra] `docker-compose.yml` passes no `EMAIL_*`; `settings.py:249-254` falls back to `smtp.example.com` — all transactional mail fails or is misdelivered silently.
- Fix: pass `EMAIL_*`; remove the example default.

---

## LOW (49)

### Backend

**L1. Dead pagination class**
- [Backend/Admin] `backend/apps/core/pagination.py:6-9` `StandardPagination` never wired (only `PageLimitPagination` active); a new view using it would silently ignore `limit`.
- Fix: delete it.

**L2. Token accepted via `?token=` query string**
- [Backend] `backend/apps/accounts/authentication.py:4-16` — API auth accepts tokens in URLs (logged by proxies, leaked via Referer). Trade-off for media streaming; restrict to short-lived media URLs.
- Fix: signed short-lived media URLs only.

**L3. Insecure defaults for cookies/CSRF**
- [Infra/Backend] `backend/config/settings.py:143-145` — secure-cookie/CSRF defaults assume dev; deployments that skip overrides serve production-insecure cookies.
- Fix: env-driven with secure defaults.

**L4. Student-uploaded documents default to public** *(see H10)*

**L5. Instructor status enum mismatches**
- [Admin] `web/app-single/app/admin/instructors/page.tsx:39-46` — badge colors (active/inactive/on_leave/suspended) vs filter (active/suspended/pending/archived) vs backend free CharField. "On Leave" stat is always 0; `pending`/`archived` get no badge color.
- Fix: one shared enum.

**L6. Permission grouping in the roles page is broken**
- [Admin] `web/app-single/app/admin/roles/page.tsx:162-174` groups by `codename.split('.')[0]`, but `codename` is `view_student` etc. (no app prefix) → groups by verb, not model; `content_type_name` unused.
- Fix: group by content type.

**L7. Students detail "Medical Expiry" always shows "—"**
- [Admin] `backend/apps/students/serializers.py:23` — phantom `medical_expiry` DateField; model has no such field → silently dropped.
- Fix: remove or map to real data.

**L8. Dashboard "Active Students" counts suspended/pending accounts**
- [Admin] `web/app-single/app/admin/dashboard/page.tsx:74` counts `role==='student' && is_active!==false`; backend `status` can disagree with `is_active`.
- Fix: filter on status.

**L9. Users page can't reset its own password**
- [Admin] `web/app-single/app/admin/users/page.tsx:193` omits `current_password`; backend reset rejects when target is current user (`accounts/views.py:170-175`) → 400 with no UI explanation.
- Fix: send current_password or special-case.

### Web plumbing

**L10. Contradictory storage documentation**
- [Plumbing] `lib/download.ts:6` claims sessionStorage; actual store is localStorage `maa_session`.
- Fix: fix comment.

**L11. Duplicated session-key literal**
- [Plumbing] `lib/api.ts:139-141` hardcodes `'maa_session'` instead of importing `SESSION_KEY` (`auth-context.tsx:70`).
- Fix: import the constant.

**L12. Three auth state holders**
- [Plumbing] `lib/auth-store.ts` (Zustand) + `lib/auth-context.tsx` (context) + `lib/api.ts` (`accessToken` field) — every write must propagate to all three; drift risk.
- Fix: one store.

**L13. Auth context value re-created every render**
- [Plumbing] `lib/auth-context.tsx:317-328` — no `useMemo`; all consumers re-render on any provider state change.
- Fix: memoize value.

**L14. Notification dates use browser locale**
- [Plumbing] `components/notification-bell.tsx:80` — `.toLocaleString()` ignores the app's selected language.
- Fix: use format-utils.

**L15. Date/currency formatters hardcode `en-US`**
- [Plumbing] `lib/format-utils.ts` — English month names, USD-style grouping, fixed DZD default regardless of locale.
- Fix: locale-aware.

**L16. Every SSE notification fires a toast**
- [Plumbing] `components/notification-bell.tsx:37-39` — toast per event (capped at 5 internally).
- Fix: dedupe/rate-limit.

**L17. `moduleDocDownloadUrl` vs `moduleDocStreamUrl` target different URL spaces**
- [Plumbing] `lib/download.ts:38-40` builds `/module-documents/{id}/download/` (no `/api`) while `:43-45` builds `/api/module-documents/...` — one must be wrong.
- Fix: unify.

**L18. `app/not-found.tsx` links to `/dashboard`**
- [Plumbing] `app/not-found.tsx:20` — 404 page points unauthenticated users at a guarded page, no locale prefix.
- Fix: link to home.

**L19. Sitemap regenerates `lastModified` every build**
- [Plumbing] `app/sitemap.ts:19` — `new Date()` per build causes crawl churn.
- Fix: stable timestamp.

**L20. `isExamPortalPath` matches by substring**
- [Plumbing] `lib/exam-portal.ts:3` — any future `/exams/` route inherits "no auto-logout".
- Fix: exact route match.

**L21. Weak PWA metadata**
- [Plumbing] `public/manifest.json` — theme_color blue mismatches brand; no `scope`, no icon `purpose`.
- Fix: align metadata.

### Web portals

**L22. `markAllRead` uses a stale closure**
- [Plumbing] `components/notification-bell.tsx:62` — `setNotifs(notifs.map(...))` can drop a just-arrived SSE event on the same tick.
- Fix: functional update.

**L23. 30s polling wipes SSE-prepended rows**
- [Plumbing] `notification-bell.tsx:31` replaces state from REST fetch, re-ordering live items (compounds H20).
- Fix: merge by id.

**L24. Client-attested anti-cheat violations are spoofable**
- [Portals] `app/exams/[hash]/page.tsx:91-96` submits violations verbatim; `final_views.py:569-575` flags on count only.
- Fix: server-side detection/entropy checks.

**L25. Invoice payment method hardcoded to `"bank_transfer"`**
- [Portals] `app/finance/invoices/page.tsx:97`.

**L26. `ErrorCard` retry on invoices page only clears the message**
- [Portals] `app/finance/invoices/page.tsx:180` — `onRetry={() => setError(null)}` doesn't reload data.

**L27. Exam/quiz duration enforcement is backend-only**
- [Portals] `student/exams/[id]/page.tsx:65-69` — client timer has no drift check; server rejects stale attempts with the generic message from H25.

**L28. `authorize_solo` mutates the instructor's note**
- [Portals] `backend/apps/flight_training/views.py:206` appends `" | SOLO AUTHORIZED"` to the pedagogical note after the fact; if the note was signed, reports break.
- Fix: store separately.

**L29. `useAuthGuard` login path mismatch on exam pages**
- [Portals] `app/student/exams/[id]/page.tsx:41` redirects to `/student/login` vs default `/login` (`use-auth-guard.ts:7`) — deep-linking can bounce between two login paths.

**L30. 28 admin pages are redirect stubs**
- [Admin] Six-line `redirect()` stubs (e.g. `skill-tests` → `/admin/evaluations?tab=skill`, `subjects` → `/admin/curriculum?tab=subjects`) — entire feature areas hidden if not intentional.

### iPad

**L31. Login 401 triggers a pointless token refresh**
- [iPad] `ipad/lib/api.ts:53` treats the 401 from `POST /api/login/` like an expired token; with a stale refresh token in SecureStore it calls `/token/refresh/` before surfacing "invalid credentials".
- Fix: skip refresh for the login endpoint.

**L32. `CertificatesService.verify` hits a 404 route**
- [iPad] `services/certificates.service.ts:12` calls `/student/certificates/verify/`; the registered route is `certificates/verify/` (`api_urls.py:133`).

**L33. Settings notifications toggle is cosmetic**
- [iPad] `settings.tsx:163-167` flips local state only; never persists or calls `/api/notifications/preferences/`.
- Fix: persist via API.

**L34. No error handling for invalid IDs**
- [iPad] `/exams/{id}`, `/courses/{id}`, `/flights/{id}`, `/messages/{id}` detail queries don't handle non-UUID params; uncaught Axios errors.

**L35. Pervasive non-null assertions**
- [iPad] `session.tsx:45,53`, `messages-compose.tsx:70`, `message-detail.tsx:21`, `courses/[id].tsx:34` — `!` bypasses guards.

### Infra

**L36. Web healthcheck depends on `wget`, which may be absent**
- [Infra] `docker-compose.yml:93` — container can be reported unhealthy forever.
- Fix: use `node -e fetch`.

**L37. Mail/seed credential files are git-tracked**
- [Infra] `mailserver.env`, `seed_ahmed.py` tracked; `.gitignore` only covers `.env`.
- Fix: gitignore + move to secret store.

**L38. Media served without cache headers**
- [Infra] `nginx/nginx.conf:90-96` — no `Cache-Control` for media; repeated downloads hit upstream.
- Fix: add caching headers.

**L39. PWA manifest hand-maintained**
- [Infra] `public/manifest.json` static; drifts from actual UI.
- Fix: generate at build.

---

## Informational positives (7)

1. Media streaming uses header auth (blob) rather than `<a href>` — consistent design; the query-string case is isolated to `lib/download.ts`.
2. Auto-logout deliberately disabled inside the exam portal — documented tradeoff (interacts badly with H15).
3. Cross-tab logout/session sync handled well (`auth-context.tsx:206-230`).
4. Proactive token refresh with 5-min margin + single-flight 401 refresh is correctly coalesced.
5. Service worker version explicitly managed (`maa-v3`).
6. PWA icon assets all exist.
7. i18n architecture is otherwise sound (675 keys/language, centralized); defects are missing keys, not the mechanism.

---

## Recommended fix order

1. **Credentials & secrets (C7, H37-H40, L37)** — rotate everything, move to secrets, `exec "$@"` in entrypoint so celery actually runs.
2. **Exam/quiz integrity (C1-C4, C3, H31-H34)** — attempt resume, attempt_id wiring, `preview` gating, server-side validation.
3. **Session security (C6, H11, H16, H19)** — token revocation, storage hardening, API client everywhere.
4. **iPad crashes (C9-C13)** — unwrap `.results` for paginated lists, fix compose search, PDF double-base, course materials.
5. **RBAC/authorization (C5, H3, H7, H8, M37, M50, C1)** — the `HasRolePermission`/missing-permission footgun, `@action` gating, admin_agent escalation, instructor phone 500.
6. **i18n & UX (H12, H13, M46, M53-M55)** — missing keys that render raw text, hardcoded strings.
7. **Infra correctness (H42, H43, M67-M76)** — MinIO init/media volume, collectstatic, nginx SSE/headers.
