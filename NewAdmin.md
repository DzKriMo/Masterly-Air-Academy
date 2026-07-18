# New Admin Portal — Full Implementation Plan

## Problem
Admin roles (`system_admin`, `admin_responsible`, `admin_agent`, `admissions_responsible`) are currently redirected **out** of the Next.js SPA to Django Admin (`/admin/`). This means:
1. They never see the consistent Tailwind UI that students, instructors, directors, finance, and quality users see
2. They are stuck with a generic CRUD interface (even with django-unfold theming) that is confusing for non-technical users

**Goal**: Replace Django Admin as the primary interface for admin users with a proper Next.js admin portal matching the look/feel of the other portals. Keep Django Admin accessible at `/django-admin/` for superuser-level tasks only.

---

## Part 1: Backend — User CRUD Endpoint

The REST API has no user management endpoint. Admin users need to create/edit users, assign roles, reset passwords. Add one.

### 1a. Create `backend/apps/accounts/serializers.py`

```python
from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'role', 'status',
            'is_active', 'last_login_at', 'date_joined',
        ]
        read_only_fields = ['id', 'last_login_at', 'date_joined']

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ['password']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user
```

### 1b. Create `backend/apps/accounts/views.py`

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import User
from .serializers import UserSerializer, UserCreateSerializer
from apps.accounts.permissions import HasRolePermission

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    permission_classes = [IsAuthenticated, HasRolePermission]
    required_permission = 'accounts.manage'
    filterset_fields = ['role', 'status', 'is_active']
    search_fields = ['email', 'username']

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        password = request.data.get('password')
        if not password or len(password) < 8:
            return Response(
                {'error': 'Password must be at least 8 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.set_password(password)
        user.save()
        return Response({'status': 'password reset'})

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        return Response(UserSerializer(user).data)
```

### 1c. Register route in `backend/config/api_urls.py`

Add to the registration block (around line 371, after `admin-profiles`):

```python
router.register(r'users', UserViewSet)
```

### 1d. Move Django Admin to `/django-admin/` in `backend/config/urls.py`

Change line 17 from:
```python
path('admin/', admin.site.urls),
```
to:
```python
path('django-admin/', admin.site.urls),
```

This avoids a URL conflict when Next.js serves its own pages under `/admin/`.

---

## Part 2: Frontend — Admin Layout

Create `web/app-single/app/admin/layout.tsx`

Pattern: copy from `app/director/layout.tsx` (simple, no mobile hamburger). Role guard for admin roles.

### 2a. Nav items and icons

| Route | Label Key | Icon |
|---|---|---|
| `/admin/dashboard` | `admin.dashboard` | `LayoutDashboard` |
| `/admin/users` | `admin.users` | `Users` |
| `/admin/applications` | `admin.applications` | `ClipboardCheck` |
| `/admin/invoices` | `admin.invoices` | `FileText` |
| `/admin/payments` | `admin.payments` | `CreditCard` |
| `/admin/documents` | `admin.documents` | `File` |
| `/admin/contracts` | `admin.contracts` | `ScrollText` |
| `/admin/students` | `admin.students` | `GraduationCap` |

Plus a "Django Admin" link at the bottom:
| `(link)` | `admin.djangoAdmin` | `Shield` |

### 2b. Layout code

Same pattern as `app/director/layout.tsx`:
- `"use client"`, imports, `NAV` array, auth checks
- Sidebar: fixed `w-56` on desktop, responsive
- Header area with logo + `t("layout.administrationPortal")` label
- User name + role badge under logo
- Nav items with active state highlighting (`pathname.startsWith(item.href)`)
- Logout button at bottom
- `<ErrorBoundary>` wrapping children

### 2c. Role guard

```typescript
if (user && !["system_admin", "admin_responsible", "admin_agent", "admissions_responsible"].includes(user.role)) {
    router.push("/login");
    return null;
}
```

---

## Part 3: Frontend — Admin Pages

All pages follow the same pattern:
- `"use client"`, `useAuth`, `api.get/put/post/delete`, TanStack Query or `useEffect`
- Shared components: `DataTable`, `LoadingSkeleton`, `ErrorCard`, `EmptyState`, `ConfirmDialog`, `ModalForm`, `ExportButton`
- CRUD: list view with data table, create/edit via modal or form page, delete with confirm dialog

### 3a. `app/admin/dashboard/page.tsx`

Overview page with:
- KPI cards (total users, active students, pending applications, overdue invoices, total revenue this month)
- Recent activity feed (last 10 audit logs from `/api/audit-logs/?limit=10`)
- Quick action buttons: "Create User", "View Applications", "View Invoices"
- 2 charts: Users by role (pie), Invoices by status (pie)

API calls:
- `GET /api/dashboard/kpis/` (already exists)
- `GET /api/audit-logs/?limit=10` (if endpoint exists) or recent users/invoices

### 3b. `app/admin/users/page.tsx`

- `GET /api/users/` — list all users in a DataTable
- Columns: Email, Username, Role (badge), Status (badge), Active (toggle), Last Login, Actions
- Search bar (search_fields already configured: `['email', 'username']`)
- Filters by role and status (FilterBar component)
- "Create User" button → ModalForm with: email, username, password, role dropdown, status dropdown
- Row actions: Edit (modal), Reset Password (modal with new password field), Toggle Active (confirm dialog)
- Pagination handled by StandardPagination

### 3c. `app/admin/applications/page.tsx`

- `GET /api/applications/` — list all applications
- Columns: Application #, Student Name, Status (badge), Submitted Date, Actions
- Filters: status (pending/reviewed/accepted/rejected)
- Row actions: "Review" button → opens detail panel/modal where admin can:
  - Change status (accept/reject)
  - Add notes
  - Set interview date
  - Set test date
- `POST /api/applications/{id}/review/` — submit review

### 3d. `app/admin/invoices/page.tsx`

- `GET /api/invoices/` — list all invoices
- Columns: Invoice #, Student, Amount, Status (badge), Due Date, Balance, Actions
- Filters: status, student
- "Create Invoice" → ModalForm: student select, type, description, amount, currency, due date
- Row actions: Edit, Delete, "Record Payment" (links to payments page filtered by invoice)
- "Overdue" quick filter → `GET /api/invoices/overdue/`

### 3e. `app/admin/payments/page.tsx`

- `GET /api/payments/` — list all payments
- Columns: Student, Invoice #, Amount, Method, Reference, Date, Actions
- Filters: method, student, invoice
- "Record Payment" → ModalForm: student select, invoice select, amount, method dropdown, reference, notes
- Row actions: Edit, Delete

### 3f. `app/admin/documents/page.tsx`

- `GET /api/documents/` — list all documents
- Columns: Name, Type, Category, Status (badge), Version, Uploaded, Actions
- Filters: type, category, status
- "Upload Document" → ModalForm: name, type, category, file upload, student (optional)
- `POST /api/documents/upload/` — multipart upload
- Row actions: Download (link to `file_url`), Edit (modal), Delete

### 3g. `app/admin/contracts/page.tsx`

- `GET /api/contracts/` — list all contracts
- Columns: Contract #, Student, Type, Start Date, End Date, Status (badge), Actions
- Filters: status, type
- "Create Contract" → ModalForm: student select, type, start/end date, file upload
- Row actions: Edit, Delete

### 3h. `app/admin/students/page.tsx`

- `GET /api/students/` — list all students
- Columns: Student #, Name, Program, Enrollment Date, Status, Actions
- Options:
  - Read-only table (view only, no edit)
  - Or full CRUD if needed
- Row actions: "View Profile" → link to `/admin/students/{id}` or external link
- This page is informational — student management happens in the student portal

---

## Part 4: Config Changes

### 4a. `web/app-single/lib/portal-access.ts`

Change admin role entries from `usesDjangoAdmin: true` to `usesDjangoAdmin: false`, and update `defaultPath`:

```typescript
system_admin:               { labelKey: 'layout.administrationPortal', defaultPath: '/admin/dashboard', usesDjangoAdmin: false },
admin_responsible:          { labelKey: 'layout.administrationPortal', defaultPath: '/admin/dashboard', usesDjangoAdmin: false },
admin_agent:                { labelKey: 'layout.administrationPortal', defaultPath: '/admin/dashboard', usesDjangoAdmin: false },
admissions_responsible:     { labelKey: 'layout.administrationPortal', defaultPath: '/admin/dashboard', usesDjangoAdmin: false },
```

Also rename `labelKey` from `'layout.administration'` to `'layout.administrationPortal'` to match the pattern used by all other portals (e.g., `layout.studentPortal`, `layout.directorPortal`).

### 4b. `web/app-single/lib/use-translation.ts`

Add to all 3 locales (EN lines ~324, FR lines ~748, AR lines ~1172):

**Layout portal title:**
```
"layout.administrationPortal": "Administration Portal",
```
FR: `"Portail d'Administration"`
AR: `"بوابة الإدارة"`

**Admin nav labels:**
```
"admin.dashboard": "Dashboard",
"admin.users": "Users",
"admin.applications": "Applications",
"admin.invoices": "Invoices",
"admin.payments": "Payments",
"admin.documents": "Documents",
"admin.contracts": "Contracts",
"admin.students": "Students",
"admin.djangoAdmin": "Django Admin",
```

FR:
```
"admin.dashboard": "Tableau de Bord",
"admin.users": "Utilisateurs",
"admin.applications": "Candidatures",
"admin.invoices": "Factures",
"admin.payments": "Paiements",
"admin.documents": "Documents",
"admin.contracts": "Contrats",
"admin.students": "Eleves",
"admin.djangoAdmin": "Admin Django",
```

AR:
```
"admin.dashboard": "لوحة القيادة",
"admin.users": "المستخدمون",
"admin.applications": "الطلبات",
"admin.invoices": "الفواتير",
"admin.payments": "المدفوعات",
"admin.documents": "المستندات",
"admin.contracts": "العقود",
"admin.students": "الطلاب",
"admin.djangoAdmin": "مدير دجانغو",
```

### 4c. `web/app-single/app/login/page.tsx`

Remove the `usesDjangoAdmin` redirect block (currently lines 33-36):

```typescript
// DELETE these 4 lines:
if (usesDjangoAdmin(user.role)) {
    window.location.href = "/admin";
    return;
}
```

The `onSubmit` function becomes:
```typescript
router.push(getDefaultPortal(user.role));
```

Update the import if `usesDjangoAdmin` is no longer used elsewhere.

### 4d. `web/app-single/app/dashboard/page.tsx`

Remove the admin redirect block (currently lines 28-30):

```typescript
// DELETE these 3 lines:
if (!isLoading && user && usesDjangoAdmin(user.role)) {
    window.location.href = "/admin";
}
```

If `usesDjangoAdmin` is imported but no longer used, remove it from imports.

---

## Part 5: Sidebar Dependencies

The admin layout should also include links to **other portals that admin roles can access**. From the role guards in existing layouts:
- `system_admin` can access: director, quality, finance portals
- `admin_responsible`, `admin_agent`, `admissions_responsible` can only access admin

So the sidebar **bottom section** could show:

```
─── Other Portals ───
Director Dashboard  → /director/dashboard
Quality & Safety    → /quality/dashboard
Finance             → /finance/dashboard
─── System ───
Django Admin        → /django-admin/
```

This is optional but recommended for `system_admin` convenience.

---

## Part 6: File Inventory

### New files to create (frontend):
```
web/app-single/app/admin/layout.tsx
web/app-single/app/admin/dashboard/page.tsx
web/app-single/app/admin/users/page.tsx
web/app-single/app/admin/applications/page.tsx
web/app-single/app/admin/invoices/page.tsx
web/app-single/app/admin/payments/page.tsx
web/app-single/app/admin/documents/page.tsx
web/app-single/app/admin/contracts/page.tsx
web/app-single/app/admin/students/page.tsx
```

### New files to create (backend):
```
backend/apps/accounts/serializers.py
backend/apps/accounts/views.py        (if not exists)
```

### Existing files to modify:
```
backend/config/urls.py                (move /admin/ → /django-admin/)
backend/config/api_urls.py            (add users route)
web/app-single/lib/portal-access.ts   (change admin roles)
web/app-single/lib/use-translation.ts (add admin keys ×3 locales)
web/app-single/app/login/page.tsx     (remove usesDjangoAdmin redirect)
web/app-single/app/dashboard/page.tsx (remove usesDjangoAdmin redirect)
```

---

## Part 7: Implementation Order

1. Backend: User serializer + viewset → register route → move Django Admin URL
2. Config: portal-access.ts → login page → dashboard page
3. Translations: all 3 locales
4. Layout: admin layout.tsx
5. Pages (one at a time, test each):
   - Dashboard page first
   - Users page (core admin task)
   - Applications page (review workflow)
   - Invoices + Payments pages (financial CRUD)
   - Documents page (upload/download)
   - Contracts page
   - Students page (read-only)
6. Final: Verify all role guards, redirects, and that Django Admin still works at `/django-admin/`

---

## Summary

| Metric | Value |
|---|---|
| New backend files | 2 |
| New frontend files | 9 |
| Files to modify | 6 |
| Total estimated effort | ~400-500 lines of code |
| Django Admin? | Moved to `/django-admin/`, still accessible |
| Non-tech client? | Fully consistent modern UI across all roles |
