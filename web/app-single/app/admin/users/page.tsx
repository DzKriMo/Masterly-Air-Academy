"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar, FilterOption } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/toast";
import { useTranslation } from "@/lib/use-translation";

// ── Types ──────────────────────────────────────────────────

interface AppUser {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
  is_active: boolean;
  last_login_at: string | null;
  name: string;
}

interface UsersResponse {
  results: AppUser[];
  count: number;
}

// ─── Constants ─────────────────────────────────────────────

const ROLES = [
  "director_general", "head_of_training",
  "chief_ground_instructor", "ground_instructor",
  "chief_flight_instructor", "flight_instructor",
  "system_admin", "admin_responsible", "admin_agent",
  "finance_responsible", "accounting_agent",
  "admissions_responsible",
  "quality_manager", "compliance_monitoring_manager", "safety_manager",
  "scheduler",
  "student", "candidate", "graduate",
] as const;

const STATUSES = ["active", "suspended", "archived", "pending"] as const;

const ROLE_BADGE_COLORS: Record<string, string> = {
  system_admin: "bg-gold-500/15 text-gold-400 border-gold-500/30",
  admin_responsible: "bg-gold-500/10 text-gold-400/80 border-gold-500/20",
  admin_agent: "bg-gold-500/10 text-gold-400/80 border-gold-500/20",
  flight_instructor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  ground_instructor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  chief_flight_instructor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  chief_ground_instructor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  student: "bg-green-500/15 text-green-400 border-green-500/30",
  candidate: "bg-green-500/15 text-green-400 border-green-500/30",
  graduate: "bg-green-500/15 text-green-400 border-green-500/30",
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  active: "bg-green-500/15 text-green-400 border-green-500/30",
  suspended: "bg-red-500/15 text-red-400 border-red-500/30",
  archived: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

// ─── Helpers ───────────────────────────────────────────────

function formatRole(role: string): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getRoleBadgeColor(role: string): string {
  return ROLE_BADGE_COLORS[role] || "bg-navy-700/60 text-gray-300 border-navy-600";
}

function getStatusBadgeColor(status: string): string {
  return STATUS_BADGE_COLORS[status] || "bg-navy-700/60 text-gray-300 border-navy-600";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function computeStats(users: AppUser[]) {
  const total = users.length;
  const active = users.filter((u) => u.is_active).length;
  const roleBreakdown: Record<string, number> = {};
  for (const u of users) {
    roleBreakdown[u.role] = (roleBreakdown[u.role] || 0) + 1;
  }
  const topRoles = Object.entries(roleBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  return { total, active, topRoles };
}

// ─── Page Component ────────────────────────────────────────

export default function AdminUsersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // ── Auth redirect ───────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  // ── Query ───────────────────────────────────────────────
  const {
    data: users = [],
    isLoading,
    error,
    refetch,
  } = useQuery<AppUser[]>({
    queryKey: ["admin", "users"],
    queryFn: async (): Promise<AppUser[]> => {
      const d: any = await api.get("/users/");
      return (d?.results || d || []) as AppUser[];
    },
    enabled: isAuthenticated,
  });

  // ── Create user mutation ────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: {
      email: string;
      username: string;
      password: string;
      role: string;
      status: string;
    }) => api.post("/users/", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      showToast("success", "User created successfully");
      setCreateOpen(false);
      setCreateForm({
        email: "", username: "", password: "",
        role: "student", status: "active",
      });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to create user");
    },
  });

  // ── Update user mutation ────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { email: string; username: string; role: string; status: string };
    }) => api.put(`/users/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      showToast("success", "User updated successfully");
      setEditUser(null);
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to update user");
    },
  });

  // ── Delete user mutation ────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      showToast("success", "User deleted successfully");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to delete user");
    },
  });

  // ── Reset password mutation ─────────────────────────────
  const resetPasswordMutation = useMutation({
    mutationFn: ({
      id,
      password,
    }: {
      id: string;
      password: string;
    }) => api.post(`/users/${id}/reset_password/`, { password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      showToast("success", "Password reset successfully");
      setResetTarget(null);
      setResetPassword("");
      setResetConfirm("");
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to reset password");
    },
  });

  // ── Toggle active mutation ──────────────────────────────
  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/users/${id}/toggle_active/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      showToast("success", "User active status toggled");
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to toggle active status");
    },
  });

  // ── Local state ─────────────────────────────────────────

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "", username: "", password: "",
    role: "student", status: "active",
  });
  const [autoFillUsername, setAutoFillUsername] = useState(true);

  // Edit modal
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [editForm, setEditForm] = useState({
    email: "", username: "", role: "", status: "",
  });

  // Populate edit form when editUser changes
  useEffect(() => {
    if (editUser) {
      setEditForm({
        email: editUser.email,
        username: editUser.username,
        role: editUser.role,
        status: editUser.status,
      });
    }
  }, [editUser]);

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<AppUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);

  // Filter / search
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  // ── Handlers ────────────────────────────────────────────

  const handleCreateFormChange = useCallback(
    (field: string, value: string) => {
      setCreateForm((prev) => {
        const next = { ...prev, [field]: value };
        // Auto-fill username from email if auto-fill is enabled
        if (field === "email" && autoFillUsername && !prev.username) {
          next.username = value.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_");
        }
        return next;
      });
    },
    [autoFillUsername],
  );

  const handleCreateSubmit = useCallback(() => {
    if (!createForm.email) {
      showToast("error", "Email is required");
      return;
    }
    if (!createForm.password || createForm.password.length < 8) {
      showToast("error", "Password must be at least 8 characters");
      return;
    }
    const payload = {
      ...createForm,
      username: createForm.username || createForm.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_"),
    };
    createMutation.mutate(payload);
  }, [createForm, createMutation, showToast]);

  const handleEditSubmit = useCallback(() => {
    if (!editUser) return;
    if (!editForm.email) {
      showToast("error", "Email is required");
      return;
    }
    updateMutation.mutate({ id: editUser.id, data: editForm });
  }, [editUser, editForm, updateMutation, showToast]);

  const handleResetPasswordSubmit = useCallback(() => {
    if (!resetTarget) return;
    if (resetPassword.length < 8) {
      showToast("error", "Password must be at least 8 characters");
      return;
    }
    if (resetPassword !== resetConfirm) {
      showToast("error", "Passwords do not match");
      return;
    }
    resetPasswordMutation.mutate({ id: resetTarget.id, password: resetPassword });
  }, [resetTarget, resetPassword, resetConfirm, resetPasswordMutation, showToast]);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  }, [deleteTarget, deleteMutation]);

  const handleToggleActive = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      toggleActiveMutation.mutate(id);
    },
    [toggleActiveMutation],
  );

  // ── Filtering ───────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = users;
    if (filterValues.role) {
      result = result.filter((u) => u.role === filterValues.role);
    }
    if (filterValues.status) {
      result = result.filter((u) => u.status === filterValues.status);
    }
    if (searchValue) {
      const q = searchValue.toLowerCase();
      result = result.filter(
        (u) =>
          (u.email || "").toLowerCase().includes(q) ||
          (u.username || "").toLowerCase().includes(q) ||
          (u.name || "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [users, filterValues, searchValue]);

  // ── Stats ───────────────────────────────────────────────

  const stats = useMemo(() => computeStats(users), [users]);

  // ── Columns ─────────────────────────────────────────────

  const columns: Column<AppUser>[] = useMemo(
    () => [
      {
        key: "email",
        header: t("common.email", "Email"),
        render: (u) => (
          <button
            onClick={() => setEditUser(u)}
            className="text-gold-500 hover:text-gold-400 hover:underline text-left transition-colors"
          >
            {u.email}
          </button>
        ),
      },
      {
        key: "name",
        header: t("common.name", "Name"),
        render: (u) => (
          <span className="text-white">
            {u.name || u.email.split("@")[0] || "—"}
          </span>
        ),
      },
      {
        key: "role",
        header: t("common.role", "Role"),
        sortable: true,
        render: (u) => (
          <span
            className={`inline-block text-xs px-2.5 py-0.5 rounded-full border font-medium ${getRoleBadgeColor(u.role)}`}
          >
            {formatRole(u.role)}
          </span>
        ),
      },
      {
        key: "status",
        header: t("common.status", "Status"),
        sortable: true,
        render: (u) => (
          <span
            className={`inline-block text-xs px-2.5 py-0.5 rounded-full border font-medium capitalize ${getStatusBadgeColor(u.status)}`}
          >
            {u.status}
          </span>
        ),
      },
      {
        key: "is_active",
        header: "Active",
        sortable: true,
        render: (u) => (
          <button
            onClick={(e) => handleToggleActive(u.id, e)}
            disabled={toggleActiveMutation.isPending}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
              u.is_active
                ? "bg-green-500"
                : "bg-navy-600 hover:bg-navy-500"
            }`}
            title={u.is_active ? "Deactivate user" : "Activate user"}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                u.is_active ? "translate-x-[18px]" : "translate-x-[2px]"
              }`}
            />
          </button>
        ),
      },
      {
        key: "last_login_at",
        header: "Last Login",
        sortable: true,
        render: (u) => (
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {formatDate(u.last_login_at)}
          </span>
        ),
      },
      {
        key: "actions",
        header: t("common.actions", "Actions"),
        sortable: false,
        className: "w-[180px]",
        render: (u) => (
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditUser(u);
              }}
              className="px-2.5 py-1 text-xs rounded-lg bg-navy-700 text-gray-300 hover:bg-navy-600 hover:text-white transition-colors"
              title="Edit user"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setResetTarget(u);
                setResetPassword("");
                setResetConfirm("");
              }}
              className="px-2.5 py-1 text-xs rounded-lg bg-navy-700 text-gray-300 hover:bg-navy-600 hover:text-white transition-colors"
              title="Reset password"
            >
              Password
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(u);
              }}
              className="px-2.5 py-1 text-xs rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              title="Delete user"
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    [t, handleToggleActive, toggleActiveMutation.isPending],
  );

  // ── Filter options ──────────────────────────────────────

  const filterOptions: FilterOption[] = useMemo(
    () => [
      {
        key: "role",
        label: "All Roles",
        options: ROLES.map((r) => ({ value: r, label: formatRole(r) })),
      },
      {
        key: "status",
        label: "All Statuses",
        options: STATUSES.map((s) => ({
          value: s,
          label: s.charAt(0).toUpperCase() + s.slice(1),
        })),
      },
    ],
    [],
  );

  // ── Render ──────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-navy-900">
      {/* ─── Navbar ──────────────────────────────────── */}
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="MAA"
              width={110}
              height={110}
              className="shrink-0"
            />
            <div>
              <h1 className="text-lg font-bold text-white">
                {t("admin.users", "Users")}
              </h1>
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="text-xs text-gray-500 hover:text-gold-500 transition-colors"
              >
                {t("common.back", "Back to Dashboard")}
              </button>
            </div>
          </div>
          <button
            onClick={() => {
              setCreateForm({
                email: "", username: "", password: "",
                role: "student", status: "active",
              });
              setAutoFillUsername(true);
              setCreateOpen(true);
            }}
            className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors"
          >
            + {t("common.create", "Create User")}
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* ─── Stats Bar ─────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <div className="bg-navy-800/60 border border-navy-700 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Total Users
            </p>
            <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
          </div>
          <div className="bg-navy-800/60 border border-navy-700 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Active
            </p>
            <p className="text-2xl font-bold text-green-400 mt-1">
              {stats.active}
            </p>
          </div>
          {stats.topRoles.map(([role, count]) => (
            <div
              key={role}
              className="bg-navy-800/60 border border-navy-700 rounded-xl px-4 py-3"
            >
              <p className="text-xs text-gray-500 uppercase tracking-wider truncate">
                {formatRole(role)}
              </p>
              <p className="text-2xl font-bold text-white mt-1">{count}</p>
            </div>
          ))}
        </div>

        {/* ─── Error ────────────────────────────────── */}
        {error && !isLoading && (
          <ErrorCard
            message={
              error instanceof Error ? error.message : "Failed to load users"
            }
            onRetry={() => refetch()}
          />
        )}

        {/* ─── Filter Bar ───────────────────────────── */}
        <FilterBar
          filters={filterOptions}
          values={filterValues}
          onChange={(key, value) =>
            setFilterValues((prev) => ({ ...prev, [key]: value }))
          }
          onClear={() => {
            setFilterValues({});
            setSearchValue("");
          }}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search email, username, or name..."
        />

        {/* ─── Table / Loading / Empty ──────────────── */}
        {isLoading ? (
          <LoadingSkeleton type="table" rows={10} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              users.length === 0
                ? "No users have been created yet."
                : "No users match the current filters."
            }
            title={
              users.length === 0 ? "No users yet" : "No matching users"
            }
            action={
              users.length === 0
                ? {
                    label: "Create User",
                    onClick: () => {
                      setCreateForm({
                        email: "", username: "", password: "",
                        role: "student", status: "active",
                      });
                      setAutoFillUsername(true);
                      setCreateOpen(true);
                    },
                  }
                : undefined
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            keyField="id"
            pageSize={15}
          />
        )}

        {/* ─────────────────────────────────────────────── */}
        {/* CREATE USER MODAL */}
        {/* ─────────────────────────────────────────────── */}
        <ModalForm
          open={createOpen}
          onClose={() => {
            if (!createMutation.isPending) setCreateOpen(false);
          }}
          title="Create User"
          footer={
            <>
              <button
                onClick={() => setCreateOpen(false)}
                disabled={createMutation.isPending}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white transition-colors disabled:opacity-50"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                onClick={handleCreateSubmit}
                disabled={createMutation.isPending}
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating..." : t("common.create", "Create")}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {t("common.email", "Email")} <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => handleCreateFormChange("email", e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Username</label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={createForm.username}
                  onChange={(e) => {
                    setAutoFillUsername(false);
                    setCreateForm((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }));
                  }}
                  placeholder="Auto-filled from email"
                  className="flex-1 px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
                {!createForm.username && (
                  <button
                    onClick={() => setAutoFillUsername(true)}
                    className="text-xs text-gold-500 hover:underline shrink-0"
                  >
                    Auto
                  </button>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {t("common.password", "Password")} <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                placeholder="Min. 8 characters"
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
              />
              {createForm.password.length > 0 && createForm.password.length < 8 && (
                <p className="text-xs text-red-400 mt-1">
                  Password must be at least 8 characters
                </p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {t("common.role", "Role")}
              </label>
              <select
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    role: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {formatRole(r)}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {t("common.status", "Status")}
              </label>
              <select
                value={createForm.status}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </ModalForm>

        {/* ─────────────────────────────────────────────── */}
        {/* EDIT USER MODAL */}
        {/* ─────────────────────────────────────────────── */}
        <ModalForm
          open={editUser !== null}
          onClose={() => {
            if (!updateMutation.isPending) setEditUser(null);
          }}
          title={editUser ? `Edit User: ${editUser.email}` : "Edit User"}
          footer={
            <>
              <button
                onClick={() => setEditUser(null)}
                disabled={updateMutation.isPending}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white transition-colors disabled:opacity-50"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={updateMutation.isPending}
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors disabled:opacity-50"
              >
                {updateMutation.isPending
                  ? "Saving..."
                  : t("common.save", "Save")}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {t("common.email", "Email")} <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, email: e.target.value }))
                }
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Username</label>
              <input
                type="text"
                value={editForm.username}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    username: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {t("common.role", "Role")}
              </label>
              <select
                value={editForm.role}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, role: e.target.value }))
                }
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {formatRole(r)}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {t("common.status", "Status")}
              </label>
              <select
                value={editForm.status}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, status: e.target.value }))
                }
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </ModalForm>

        {/* ─────────────────────────────────────────────── */}
        {/* RESET PASSWORD MODAL */}
        {/* ─────────────────────────────────────────────── */}
        <ModalForm
          open={resetTarget !== null}
          onClose={() => {
            if (!resetPasswordMutation.isPending) {
              setResetTarget(null);
              setResetPassword("");
              setResetConfirm("");
            }
          }}
          title={
            resetTarget
              ? `Reset Password: ${resetTarget.email}`
              : "Reset Password"
          }
          footer={
            <>
              <button
                onClick={() => {
                  setResetTarget(null);
                  setResetPassword("");
                  setResetConfirm("");
                }}
                disabled={resetPasswordMutation.isPending}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white transition-colors disabled:opacity-50"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                onClick={handleResetPasswordSubmit}
                disabled={
                  resetPasswordMutation.isPending ||
                  !resetPassword ||
                  !resetConfirm
                }
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors disabled:opacity-50"
              >
                {resetPasswordMutation.isPending
                  ? "Resetting..."
                  : t("common.save", "Reset Password")}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                New Password <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
              />
              {resetPassword.length > 0 && resetPassword.length < 8 && (
                <p className="text-xs text-red-400 mt-1">
                  Password must be at least 8 characters
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Confirm Password <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
              />
              {resetConfirm.length > 0 && resetPassword !== resetConfirm && (
                <p className="text-xs text-red-400 mt-1">
                  Passwords do not match
                </p>
              )}
            </div>

            {resetTarget && (
              <p className="text-xs text-gray-500 bg-navy-900/50 rounded-lg px-3 py-2 border border-navy-700">
                This will immediately invalidate the current password for{" "}
                <strong className="text-gray-300">{resetTarget.email}</strong>.
              </p>
            )}
          </div>
        </ModalForm>

        {/* ─────────────────────────────────────────────── */}
        {/* DELETE CONFIRMATION */}
        {/* ─────────────────────────────────────────────── */}
        <ConfirmDialog
          open={deleteTarget !== null}
          onClose={() => {
            if (!deleteMutation.isPending) setDeleteTarget(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Delete User"
          message={
            deleteTarget
              ? `Are you sure you want to permanently delete ${deleteTarget.email}? This action cannot be undone.`
              : "Are you sure?"
          }
          confirmLabel="Delete"
          cancelLabel={t("common.cancel", "Cancel")}
          destructive
          loading={deleteMutation.isPending}
        />
      </main>
    </div>
  );
}
