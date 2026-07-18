"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable, Column } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/toast";
import { useTranslation } from "@/lib/use-translation";

// ── Types ──────────────────────────────────────────────────

interface RoleGroup {
  id: number;
  name: string;
  user_count: number;
  permission_count: number;
  permissions: number[];
}

interface Permission {
  id: number;
  name: string;
  codename: string;
  content_type: number;
  content_type_name: string;
}

interface AppUser {
  id: string;
  email: string;
  name: string;
  role: string;
  roles: string[];
}

// ── Component ─────────────────────────────────────────────

export default function AdminRolesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // ── Auth guard ──
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  // ── Detail modal state ──
  const [detailGroup, setDetailGroup] = useState<RoleGroup | null>(null);

  // ── Create modal state ──
  const [createOpen, setCreateOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  // ── Queries ──
  const {
    data: groups = [],
    isLoading,
    error,
    refetch,
  } = useQuery<RoleGroup[]>({
    queryKey: ["admin", "groups"],
    queryFn: async (): Promise<RoleGroup[]> => {
      const d: any = await api.get("/groups/");
      return (d?.results || d || []) as RoleGroup[];
    },
    enabled: isAuthenticated,
  });

  const { data: permissionsList = [] } = useQuery<Permission[]>({
    queryKey: ["admin", "permissions"],
    queryFn: async (): Promise<Permission[]> => {
      const d: any = await api.get("/permissions/");
      return (d?.results || d || []) as Permission[];
    },
    enabled: isAuthenticated,
  });

  const { data: users = [] } = useQuery<AppUser[]>({
    queryKey: ["admin", "users"],
    queryFn: async (): Promise<AppUser[]> => {
      const d: any = await api.get("/users/");
      return (d?.results || d || []) as AppUser[];
    },
    enabled: isAuthenticated,
  });

  // ── Create group mutation ──
  const createMutation = useMutation({
    mutationFn: (name: string) => api.post("/groups/", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "groups"] });
      showToast("success", "Role created successfully");
      setCreateOpen(false);
      setNewRoleName("");
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to create role");
    },
  });

  // ── Update group permissions mutation ──
  const updatePermissionsMutation = useMutation({
    mutationFn: ({
      id,
      permissions,
    }: {
      id: number;
      permissions: number[];
    }) => api.patch(`/groups/${id}/`, { permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "groups"] });
      showToast("success", "Permissions updated successfully");
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to update permissions");
    },
  });

  // ── Handlers ──
  const handleCreateSubmit = useCallback(() => {
    const name = newRoleName.trim();
    if (!name) {
      showToast("error", "Role name is required");
      return;
    }
    createMutation.mutate(name);
  }, [newRoleName, createMutation, showToast]);

  const togglePermission = useCallback(
    (permId: number) => {
      if (!detailGroup) return;
      const current = detailGroup.permissions;
      const updated = current.includes(permId)
        ? current.filter((id) => id !== permId)
        : [...current, permId];
      setDetailGroup({ ...detailGroup, permissions: updated });
      updatePermissionsMutation.mutate({
        id: detailGroup.id,
        permissions: updated,
      });
    },
    [detailGroup, updatePermissionsMutation],
  );

  // ── Users in selected group ──
  const usersInGroup = useMemo(() => {
    if (!detailGroup || !users.length) return [];
    return users.filter((u) =>
      (u.roles || []).includes(detailGroup.name),
    );
  }, [detailGroup, users]);

  // ── Group permissions by content type (for detail modal) ──
  const permissionsByType = useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    for (const perm of permissionsList) {
      const key = perm.content_type_name || "other";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(perm);
    }
    return grouped;
  }, [permissionsList]);

  // ── Columns ──
  const columns: Column<RoleGroup>[] = useMemo(
    () => [
      {
        key: "name",
        header: t("admin.roleName", "Role Name"),
        render: (g) => (
          <span className="text-white font-medium">{g.name}</span>
        ),
      },
      {
        key: "user_count",
        header: t("admin.users", "Users"),
        sortable: true,
        render: (g) => (
          <span className="text-gray-300">{g.user_count}</span>
        ),
      },
      {
        key: "permission_count",
        header: t("admin.permissions", "Permissions"),
        sortable: true,
        render: (g) => (
          <span className="text-gray-300">{g.permission_count}</span>
        ),
      },
      {
        key: "actions",
        header: t("common.actions", "Actions"),
        sortable: false,
        className: "w-[120px]",
        render: (g) => (
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDetailGroup(g);
              }}
              className="px-2.5 py-1 text-xs rounded-lg bg-navy-700 text-gray-300 hover:bg-navy-600 hover:text-white transition-colors"
              title="Manage permissions"
            >
              {t("admin.manage", "Manage")}
            </button>
          </div>
        ),
      },
    ],
    [t],
  );

  // ── Render ──
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
                {t("admin.roles", "Roles")}
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
              setNewRoleName("");
              setCreateOpen(true);
            }}
            className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors"
          >
            + {t("admin.createRole", "Create Role")}
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* ─── Error ────────────────────────────────── */}
        {error && !isLoading && (
          <ErrorCard
            message={
              error instanceof Error ? error.message : "Failed to load roles"
            }
            onRetry={() => refetch()}
          />
        )}

        {/* ─── Table / Loading / Empty ──────────────── */}
        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : groups.length === 0 ? (
          <EmptyState
            message="No roles have been created yet."
            title="No roles yet"
            action={{
              label: "Create Role",
              onClick: () => {
                setNewRoleName("");
                setCreateOpen(true);
              },
            }}
          />
        ) : (
          <DataTable
            columns={columns}
            data={groups}
            keyField="id"
            onRowClick={(g) => setDetailGroup(g)}
            pageSize={15}
          />
        )}

        {/* ─────────────────────────────────────────────── */}
        {/* CREATE ROLE MODAL */}
        {/* ─────────────────────────────────────────────── */}
        <ModalForm
          open={createOpen}
          onClose={() => {
            if (!createMutation.isPending) setCreateOpen(false);
          }}
          title="Create Role"
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
                {createMutation.isPending
                  ? "Creating..."
                  : t("common.create", "Create")}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {t("admin.roleName", "Role Name")}{" "}
                <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. instructor, scheduler, quality_manager"
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use the role code name (e.g. flight_instructor).
              </p>
            </div>
          </div>
        </ModalForm>

        {/* ─────────────────────────────────────────────── */}
        {/* GROUP DETAIL MODAL */}
        {/* ─────────────────────────────────────────────── */}
        <ModalForm
          open={detailGroup !== null}
          onClose={() => {
            if (!updatePermissionsMutation.isPending) setDetailGroup(null);
          }}
          title={
            detailGroup
              ? `Manage: ${detailGroup.name}`
              : "Manage Role"
          }
          wide
          footer={
            <button
              onClick={() => setDetailGroup(null)}
              className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white transition-colors"
            >
              {t("common.close", "Close")}
            </button>
          }
        >
          {detailGroup && (
            <div className="space-y-6">
              {/* Users in this group */}
              <div>
                <h3 className="text-sm font-semibold text-gold-500 uppercase tracking-wider mb-2">
                  {t("admin.usersInRole", "Users in this Role")}
                  <span className="text-gray-500 ml-2 normal-case font-normal">
                    ({detailGroup.user_count})
                  </span>
                </h3>
                {usersInGroup.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-navy-900/50 rounded-lg px-3 py-2 border border-navy-700">
                    {t("admin.noUsersInRole", "No users assigned to this role yet.")}
                  </p>
                ) : (
                  <div className="bg-navy-900/50 border border-navy-700 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-navy-700">
                          <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase">Name</th>
                          <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersInGroup.map((u) => (
                          <tr key={u.id} className="border-b border-navy-700/50 last:border-b-0">
                            <td className="px-3 py-2 text-white">{u.name}</td>
                            <td className="px-3 py-2 text-gray-400">{u.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Permissions */}
              <div>
                <h3 className="text-sm font-semibold text-gold-500 uppercase tracking-wider mb-2">
                  {t("admin.permissions", "Permissions")}
                  <span className="text-gray-500 ml-2 normal-case font-normal">
                    ({detailGroup.permission_count} assigned)
                  </span>
                </h3>
                {Object.entries(permissionsByType).map(
                  ([contentType, perms]) => (
                    <div key={contentType} className="mb-3">
                      <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 capitalize">
                        {contentType.replace(/_/g, " ")}
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {perms.map((perm) => {
                          const checked = detailGroup.permissions.includes(
                            perm.id,
                          );
                          return (
                            <label
                              key={perm.id}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors text-xs ${
                                checked
                                  ? "bg-gold-500/10 border-gold-500/30 text-gold-400"
                                  : "bg-navy-900/50 border-navy-700 text-gray-400 hover:bg-navy-700/50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePermission(perm.id)}
                                className="rounded border-navy-600 bg-navy-900 text-gold-500 focus:ring-gold-500/30 focus:ring-offset-0"
                              />
                              <span className="truncate">{perm.codename}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </ModalForm>
      </main>
    </div>
  );
}
