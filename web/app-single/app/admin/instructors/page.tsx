"use client";
import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useTranslation } from "@/lib/use-translation";
import { PageHeader } from "@/components/page-header";
import { api, unwrapResults, withFullLimit } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";
import { StatsCard } from "@/components/stats-card";

// ── Types ─────────────────────────────────────────────────

interface Instructor {
  id: string;
  user_id: string;
  name: string;
  email: string;
  license_number?: string;
  qualifications?: any;
  status: string;
  student_count?: number;
  phone?: string;
  total_flight_hours?: number;
  instruction_hours?: number;
}

interface GroundInstructor extends Instructor {}
interface FlightInstructor extends Instructor {}

// ── Constants ─────────────────────────────────────────────

const STATUSES = ["active", "on_leave", "suspended", "pending", "archived"];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-400",
  on_leave: "bg-amber-500/10 text-amber-400",
  suspended: "bg-red-500/10 text-red-400",
  pending: "bg-blue-500/10 text-blue-400",
  archived: "bg-gray-500/10 text-gray-400",
};

interface EditForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  license_number: string;
  qualifications: string;
  status: string;
  total_flight_hours: string;
  instruction_hours: string;
}

const INIT_EDIT: EditForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  license_number: "",
  qualifications: "",
  status: "active",
  total_flight_hours: "0",
  instruction_hours: "0",
};

// ── Component ─────────────────────────────────────────────

export default function AdminInstructorsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // ── Tabs ──
  const [activeTab, setActiveTab] = useState<"ground" | "flight">("ground");

  // ── Detail modal ──
  const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null);

  // ── Edit / delete state ──
  const [editInstructor, setEditInstructor] = useState<Instructor | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(INIT_EDIT);
  const [editError, setEditError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Instructor | null>(null);

  // ── Reset password state ──
  const [resetPwdTarget, setResetPwdTarget] = useState<Instructor | null>(null);
  const [resetPwdValue, setResetPwdValue] = useState("");
  const [resetPwdLoading, setResetPwdLoading] = useState(false);

  // ── Filter state ──
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  // ── Auth guard ──

  // ── Queries ──
  const groundQuery = useQuery<GroundInstructor[]>({
    queryKey: ["admin-ground-instructors"],
    queryFn: async () => {
      const d = await api.get<any>(withFullLimit("/ground-instructors/"));
      return (d as any) ?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  const flightQuery = useQuery<FlightInstructor[]>({
    queryKey: ["admin-flight-instructors"],
    queryFn: async () => {
      const d = await api.get<any>(withFullLimit("/flight-instructors/"));
      return (d as any) ?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  const currentQuery = activeTab === "ground" ? groundQuery : flightQuery;
  const instructors = currentQuery.data ?? [];
  const isLoading = currentQuery.isLoading;
  const error = currentQuery.error;
  const refetch = currentQuery.refetch;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-ground-instructors"] });
    queryClient.invalidateQueries({ queryKey: ["admin-flight-instructors"] });
  };

  const openEdit = (i: Instructor) => {
    const quals = Array.isArray(i.qualifications)
      ? i.qualifications.join(", ")
      : typeof i.qualifications === "string"
      ? i.qualifications
      : "";
    const [first = "", ...rest] = (i.name || "").split(" ");
    setEditInstructor(i);
    setEditForm({
      first_name: first,
      last_name: rest.join(" "),
      email: i.email || "",
      phone: i.phone || "",
      license_number: i.license_number || "",
      qualifications: quals,
      status: i.status || "active",
      total_flight_hours: i.total_flight_hours != null ? String(i.total_flight_hours) : "0",
      instruction_hours: i.instruction_hours != null ? String(i.instruction_hours) : "0",
    });
    setEditError("");
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const base = activeTab === "ground" ? "ground-instructors" : "flight-instructors";
      return api.patch(`/${base}/${id}/`, payload);
    },
    onSuccess: () => {
      showToast("success", "Instructor updated");
      setEditInstructor(null);
      invalidateAll();
    },
    onError: (err: any) => {
      const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message;
      setEditError(msg || "Failed to update instructor");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, tab }: { id: string; tab: "ground" | "flight" }) =>
      api.delete(`/${tab === "ground" ? "ground-instructors" : "flight-instructors"}/${id}/`),
    onSuccess: () => {
      showToast("success", "Instructor removed");
      setDeleteTarget(null);
      invalidateAll();
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to delete instructor");
    },
  });

  const saveEdit = () => {
    if (!editInstructor) return;
    const payload: Record<string, unknown> = {
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      status: editForm.status,
    };
    if (activeTab === "ground") {
      payload.email = editForm.email;
    } else {
      payload.email = editForm.email;
      payload.license_number = editForm.license_number;
      payload.qualifications = editForm.qualifications.split(",").map((s: string) => s.trim()).filter(Boolean);
      payload.total_flight_hours = parseFloat(editForm.total_flight_hours) || 0;
      payload.instruction_hours = parseFloat(editForm.instruction_hours) || 0;
    }
    updateMutation.mutate({ id: editInstructor.id, payload });
  };

  const handleResetPassword = useCallback(async () => {
    if (!resetPwdTarget) return;
    if (resetPwdValue.length < 8) { showToast("error", "Password must be at least 8 characters"); return; }
    setResetPwdLoading(true);
    try {
      await api.post(`/users/${resetPwdTarget.user_id}/reset_password/`, { password: resetPwdValue });
      showToast("success", "Password reset successfully");
      setResetPwdTarget(null);
      setResetPwdValue("");
    } catch (err: any) {
      showToast("error", err?.data?.error || err?.message || "Failed to reset password");
    } finally {
      setResetPwdLoading(false);
    }
  }, [resetPwdTarget, resetPwdValue, showToast]);

  // ── Filtered data ──
  const filtered = useMemo(() => {
    let r = instructors;
    if (filterValues.status)
      r = r.filter((i) => i.status === filterValues.status);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter(
        (i) =>
          i.name?.toLowerCase().includes(q) ||
          i.email?.toLowerCase().includes(q) ||
          (i.license_number || "").toLowerCase().includes(q)
      );
    }
    return r;
  }, [instructors, filterValues, searchValue]);

  // ── Columns ──
  const columns: Column<Instructor>[] = useMemo(
    () => [
      {
        key: "name",
        header: t("common.name", "Name"),
        render: (i) => (
          <div>
            <p className="text-sm text-white font-medium">{i.name}</p>
            <p className="text-xs text-gray-500">{i.email}</p>
          </div>
        ),
      },
      {
        key: "license",
        header: "License / Quals",
        render: (i) => (
          <span className="text-xs text-gray-300">
            {i.license_number || (typeof i.qualifications === 'string' ? i.qualifications : Array.isArray(i.qualifications) ? i.qualifications.join(', ') : '') || "—"}
          </span>
        ),
      },
      {
        key: "status",
        header: t("common.status", "Status"),
        render: (i) => (
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              STATUS_COLORS[i.status] || "bg-gray-500/10 text-gray-400"
            }`}
          >
            {i.status
              ? i.status.charAt(0).toUpperCase() + i.status.slice(1).replace(/_/g, " ")
              : "—"}
          </span>
        ),
      },
      {
        key: "student_count",
        header: "Students",
        render: (i) => (
          <span className="text-sm text-white font-mono">
            {i.student_count ?? 0}
          </span>
        ),
      },
      {
        key: "actions",
        header: t("common.actions", "Actions"),
        sortable: false,
        render: (i) => (
          <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedInstructor(i as Instructor)}
              className="text-xs px-2 py-1 rounded bg-navy-700 text-gray-300 hover:bg-navy-600 font-medium transition-colors"
            >
              {t("common.view", "View")}
            </button>
            <button
              onClick={() => openEdit(i as Instructor)}
              className="text-xs px-2 py-1 rounded bg-gold-500/20 text-gold-500 hover:bg-gold-500/30 font-medium transition-colors"
            >
              {t("common.edit", "Edit")}
            </button>
            <button
              onClick={() => setDeleteTarget(i as Instructor)}
              className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 font-medium transition-colors"
            >
              {t("common.delete", "Delete")}
            </button>
            <button
              onClick={() => { setResetPwdTarget(i as Instructor); setResetPwdValue(""); }}
              className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 font-medium transition-colors"
            >
              Reset Pwd
            </button>
          </div>
        ),
      },
    ],
    [t, setSelectedInstructor]
  );

  // ── Render ──
  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader title={t("admin.instructors", "Instructors")} backHref="/admin/dashboard" backLabel={t("common.back", "Back to Dashboard")} />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-navy-800 rounded-lg p-1 w-fit border border-navy-700">
          <button
            onClick={() => setActiveTab("ground")}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activeTab === "ground"
                ? "bg-gold-500/20 text-gold-500 font-medium"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Ground Instructors
          </button>
          <button
            onClick={() => setActiveTab("flight")}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activeTab === "flight"
                ? "bg-gold-500/20 text-gold-500 font-medium"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Flight Instructors
          </button>
        </div>

        {/* Stats Bar */}
        {!isLoading && instructors.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatsCard label={`Total ${activeTab === "ground" ? "Ground" : "Flight"}`} value={instructors.length} />
            <StatsCard label="Active" value={instructors.filter((i) => i.status === "active").length} valueClassName="text-green-400" />
            <StatsCard label="On Leave" value={instructors.filter((i) => i.status === "on_leave").length} valueClassName="text-amber-400" />
            <StatsCard label="Total Students" value={instructors.reduce((sum, i) => sum + (i.student_count || 0), 0)} valueClassName="text-gold-500" />
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <ErrorCard
            message={error?.message || "Failed to load instructors"}
            onRetry={() => refetch()}
          />
        )}

        {/* Filter Bar */}
        <FilterBar
          filters={[
            {
              key: "status",
              label: "All Statuses",
              options: STATUSES.map((s) => ({
                value: s,
                label: s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " "),
              })),
            },
          ]}
          values={filterValues}
          onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))}
          onClear={() => {
            setFilterValues({});
            setSearchValue("");
          }}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search name, email, or license..."
        />

        {/* Table */}
        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              instructors.length === 0
                ? `No ${activeTab === "ground" ? "ground" : "flight"} instructors found.`
                : "No instructors match your filters."
            }
            title={
              instructors.length === 0
                ? "No instructors yet"
                : "No matching instructors"
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            keyField="id"
            onRowClick={(i) => setSelectedInstructor(i as Instructor)}
          />
        )}
      </main>

      {/* Instructor Detail Modal */}
      <ModalForm
        open={!!selectedInstructor}
        onClose={() => setSelectedInstructor(null)}
        title={selectedInstructor?.name || ''}
        footer={
          <button
            onClick={() => setSelectedInstructor(null)}
            className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white"
          >
            {t("common.close", "Close")}
          </button>
        }
      >
        {selectedInstructor && (
          <div className="space-y-6">
            <section>
              <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Contact</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Email</p>
                  <p className="text-sm text-white">{selectedInstructor.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Phone</p>
                  <p className="text-sm text-white">{selectedInstructor.phone || "—"}</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Professional</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">License #</p>
                  <p className="text-sm text-white">{selectedInstructor.license_number || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Status</p>
                  <p className="text-sm text-white">{selectedInstructor.status ? selectedInstructor.status.charAt(0).toUpperCase() + selectedInstructor.status.slice(1).replace(/_/g, " ") : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Total Flight Hours</p>
                  <p className="text-sm text-white">{selectedInstructor.total_flight_hours ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Instruction Hours</p>
                  <p className="text-sm text-white">{selectedInstructor.instruction_hours ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Students Assigned</p>
                  <p className="text-sm text-white">{selectedInstructor.student_count ?? 0}</p>
                </div>
              </div>
            </section>

            {selectedInstructor.qualifications && (Array.isArray(selectedInstructor.qualifications) ? selectedInstructor.qualifications.length > 0 : true) && (
              <section>
                <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Qualifications</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(selectedInstructor.qualifications)
                    ? selectedInstructor.qualifications.map((q: string, i: number) => (
                        <span key={i} className="text-xs px-2 py-1 bg-gold-500/10 text-gold-400 border border-gold-500/20 rounded-full">{q}</span>
                      ))
                    : typeof selectedInstructor.qualifications === 'string'
                    ? <span className="text-sm text-white">{selectedInstructor.qualifications}</span>
                    : null
                  }
                </div>
              </section>
            )}
          </div>
        )}
      </ModalForm>

      {/* Edit Instructor Modal */}
      <ModalForm
        open={!!editInstructor}
        onClose={() => setEditInstructor(null)}
        title={`Edit ${activeTab === "ground" ? "Ground" : "Flight"} Instructor: ${editInstructor?.name || ""}`}
        footer={
          <>
            <button
              onClick={() => setEditInstructor(null)}
              disabled={updateMutation.isPending}
              className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50"
            >
              {t("common.cancel", "Cancel")}
            </button>
            <button
              onClick={saveEdit}
              disabled={updateMutation.isPending}
              className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50"
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {editError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{editError}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">First Name</label>
              <input
                type="text"
                value={editForm.first_name}
                onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Last Name</label>
              <input
                type="text"
                value={editForm.last_name}
                onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              />
            </div>
          </div>
          {activeTab === "ground" ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">License #</label>
                <input
                  type="text"
                  value={editForm.license_number}
                  onChange={(e) => setEditForm((f) => ({ ...f, license_number: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Total Flight Hours</label>
                <input
                  type="number"
                  step="0.1"
                  value={editForm.total_flight_hours}
                  onChange={(e) => setEditForm((f) => ({ ...f, total_flight_hours: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Instruction Hours</label>
                <input
                  type="number"
                  step="0.1"
                  value={editForm.instruction_hours}
                  onChange={(e) => setEditForm((f) => ({ ...f, instruction_hours: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {activeTab === "ground" ? "Status" : "Qualifications (comma-separated)"}
            </label>
            {activeTab === "ground" ? (
              <select
                value={editForm.status}
                onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={editForm.qualifications}
                onChange={(e) => setEditForm((f) => ({ ...f, qualifications: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                placeholder="CFI, CFII, ..."
              />
            )}
          </div>
        </div>
      </ModalForm>

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white">Delete Instructor</h3>
            <p className="text-sm text-gray-400">
              Remove {deleteTarget.name}? Their account will be deactivated and they will no longer be able to sign in.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                onClick={() => deleteMutation.mutate({ id: deleteTarget.id, tab: activeTab })}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Dialog */}
      <ModalForm
        open={!!resetPwdTarget}
        onClose={() => { setResetPwdTarget(null); setResetPwdValue(""); }}
        title={`Reset Password: ${resetPwdTarget?.name || ""}`}
        footer={
          <>
            <button
              onClick={() => { setResetPwdTarget(null); setResetPwdValue(""); }}
              className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleResetPassword}
              disabled={resetPwdLoading || resetPwdValue.length < 8}
              className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-600 disabled:opacity-50"
            >
              {resetPwdLoading ? "Resetting..." : "Reset Password"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">New Password</label>
            <input
              type="password"
              value={resetPwdValue}
              onChange={(e) => setResetPwdValue(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
          </div>
        </div>
      </ModalForm>
    </div>
  );
}
