"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useTranslation } from "@/lib/use-translation";
import { PageHeader } from "@/components/page-header";
import { api, unwrapResults } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";

interface MaintenanceRecord {
  id: string;
  aircraft: string | null;
  aircraft_registration: string;
  type: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
  notes: string | null;
}

const MAINTENANCE_TYPES = ["100h", "annual", "engine", "propeller", "avionics", "inspection", "repair"];

const STATUS_OPTIONS = ["scheduled", "in_progress", "completed", "cancelled"];

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-400",
  in_progress: "bg-amber-500/10 text-amber-400",
  completed: "bg-green-500/10 text-green-400",
  cancelled: "bg-gray-500/10 text-gray-400",
};

const fmtStatus = (s: string) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function truncate(str: string | null | undefined, len = 60): string {
  if (!str) return "—";
  return str.length > len ? str.slice(0, len) + "..." : str;
}

export default function AdminMaintenanceRecordsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  const [selected, setSelected] = useState<MaintenanceRecord | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ aircraft: "", type: "", description: "", start_date: "", end_date: "", status: "scheduled", notes: "" });
  const [createError, setCreateError] = useState("");

  const [editItem, setEditItem] = useState<MaintenanceRecord | null>(null);
  const [editForm, setEditForm] = useState({ aircraft: "", type: "", description: "", start_date: "", end_date: "", status: "scheduled", notes: "" });
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<MaintenanceRecord | null>(null);

  const { data: records, isLoading, error, refetch } = useQuery<MaintenanceRecord[]>({
    queryKey: ["admin-maintenance-records"],
    queryFn: async () => {
      const d = await api.get<any>("/maintenance-records/");
      return unwrapResults(d);
    },
    enabled: isAuthenticated,
  });

  const { data: aircraftList = [] } = useQuery<any[]>({
    queryKey: ["admin-mr-aircraft"],
    queryFn: async () => {
      const d = await api.get<any>("/aircraft/");
      return unwrapResults(d);
    },
    enabled: isAuthenticated,
  });

  const resetCreateForm = () => {
    setCreateForm({ aircraft: "", type: "", description: "", start_date: "", end_date: "", status: "scheduled", notes: "" });
    setCreateError("");
  };

  const buildPayload = (form: typeof createForm) => ({
    aircraft: form.aircraft || null,
    type: form.type,
    description: form.description || null,
    start_date: form.start_date,
    end_date: form.end_date || null,
    status: form.status,
    notes: form.notes || null,
  });

  const createMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof buildPayload>) =>
      api.post("/maintenance-records/", payload),
    onSuccess: () => {
      showToast("success", "Maintenance record created");
      setCreateOpen(false);
      resetCreateForm();
      queryClient.invalidateQueries({ queryKey: ["admin-maintenance-records"] });
    },
    onError: (err: any) => {
      const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message;
      setCreateError(msg || "Failed to create record");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReturnType<typeof buildPayload> }) =>
      api.patch(`/maintenance-records/${id}/`, payload),
    onSuccess: () => {
      showToast("success", "Maintenance record updated");
      setEditItem(null);
      queryClient.invalidateQueries({ queryKey: ["admin-maintenance-records"] });
    },
    onError: (err: any) => {
      const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message;
      setEditError(msg || "Failed to update record");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/maintenance-records/${id}/`),
    onSuccess: () => {
      showToast("success", "Maintenance record deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-maintenance-records"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to delete record");
    },
  });

  const filtered = useMemo(() => {
    if (!records) return [];
    let r = records;
    if (filterValues.status) r = r.filter((a) => a.status === filterValues.status);
    if (filterValues.type) r = r.filter((a) => a.type === filterValues.type);
    if (filterValues.aircraft) r = r.filter((a) => a.aircraft === filterValues.aircraft);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter((a) =>
        (a.aircraft_registration || "").toLowerCase().includes(q) ||
        (a.type || "").toLowerCase().includes(q)
      );
    }
    return r;
  }, [records, filterValues, searchValue]);

  const columns: Column<MaintenanceRecord>[] = useMemo(
    () => [
      {
        key: "aircraft_registration",
        header: "Aircraft",
        render: (a) => <span className="text-sm font-semibold text-white">{a.aircraft_registration || "—"}</span>,
      },
      {
        key: "type",
        header: "Type",
        render: (a) => <span className="text-sm text-gray-300">{fmtStatus(a.type)}</span>,
      },
      {
        key: "start_date",
        header: "Start Date",
        render: (a) => <span className="text-sm text-gray-300">{formatDate(a.start_date)}</span>,
      },
      {
        key: "end_date",
        header: "End Date",
        render: (a) => <span className="text-sm text-gray-300">{formatDate(a.end_date)}</span>,
      },
      {
        key: "status",
        header: "Status",
        render: (a) => (
          <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[a.status] || "bg-gray-500/10 text-gray-400"}`}>
            {fmtStatus(a.status)}
          </span>
        ),
      },
      {
        key: "description",
        header: "Description",
        render: (a) => <span className="text-sm text-gray-400">{truncate(a.description)}</span>,
      },
      {
        key: "actions",
        header: "",
        render: (a) => (
          <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setEditItem(a);
                setEditForm({
                  aircraft: a.aircraft || "",
                  type: a.type,
                  description: a.description || "",
                  start_date: a.start_date ? a.start_date.slice(0, 16) : "",
                  end_date: a.end_date ? a.end_date.slice(0, 16) : "",
                  status: a.status,
                  notes: a.notes || "",
                });
                setEditError("");
              }}
              className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setDeleteTarget(a)}
              className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors"
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const typeFilterOptions = useMemo(
    () => MAINTENANCE_TYPES.map((t) => ({ value: t, label: fmtStatus(t) })),
    []
  );

  const aircraftFilterOptions = useMemo(
    () => aircraftList.map((a: any) => ({ value: a.id, label: a.registration })),
    [aircraftList]
  );

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader
        title="Maintenance Records"
        backHref="/admin/dashboard"
        backLabel={t("common.back", "Back to Dashboard")}
        actions={
          <button
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors"
          >
            + New Record
          </button>
        }
      />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <ErrorCard
            message={error?.message || "Failed to load maintenance records"}
            onRetry={() => refetch()}
          />
        )}

        <FilterBar
          filters={[
            {
              key: "status",
              label: "All Statuses",
              options: STATUS_OPTIONS.map((s) => ({ value: s, label: fmtStatus(s) })),
            },
            {
              key: "type",
              label: "All Types",
              options: typeFilterOptions,
            },
            {
              key: "aircraft",
              label: "All Aircraft",
              options: aircraftFilterOptions,
            },
          ]}
          values={filterValues}
          onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))}
          onClear={() => { setFilterValues({}); setSearchValue(""); }}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search by aircraft registration or type..."
        />

        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              records?.length === 0
                ? "No maintenance records yet."
                : "No records match your filters."
            }
            title={records?.length === 0 ? "No records yet" : "No matching records"}
            action={
              records?.length === 0
                ? { label: "New Record", onClick: () => setCreateOpen(true) }
                : undefined
            }
          />
        ) : (
          <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(item) => setSelected(item as MaintenanceRecord)} />
        )}

        {/* Detail Modal */}
        <ModalForm
          open={!!selected}
          onClose={() => setSelected(null)}
          title="Maintenance Record"
          footer={
            <button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">
              {t("common.close", "Close")}
            </button>
          }
        >
          {selected && (
            <div className="space-y-4">
              <DetailField label="Aircraft" value={(selected as any).aircraft_registration || "—"} />
              <DetailField label="Type" value={fmtStatus(selected.type)} />
              <DetailField label="Description" value={selected.description || "—"} />
              <DetailField label="Start Date" value={formatDateTime(selected.start_date)} />
              <DetailField label="End Date" value={formatDateTime(selected.end_date)} />
              <DetailField label="Status" value={fmtStatus(selected.status)} />
              <DetailField label="Notes" value={selected.notes || "—"} />
            </div>
          )}
        </ModalForm>

        {/* Create Modal */}
        <ModalForm
          open={createOpen}
          onClose={() => { setCreateOpen(false); resetCreateForm(); }}
          title="New Maintenance Record"
          footer={
            <>
              <button
                onClick={() => { setCreateOpen(false); resetCreateForm(); }}
                disabled={createMutation.isPending}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate(buildPayload(createForm))}
                disabled={createMutation.isPending || !createForm.type || !createForm.start_date}
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {createError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{createError}</div>
            )}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Aircraft</label>
              <select
                value={createForm.aircraft}
                onChange={(e) => setCreateForm((f) => ({ ...f, aircraft: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="">Select aircraft...</option>
                {aircraftList.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.registration}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Type <span className="text-red-400">*</span>
              </label>
              <select
                value={createForm.type}
                onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="">Select type...</option>
                {MAINTENANCE_TYPES.map((t) => (
                  <option key={t} value={t}>{fmtStatus(t)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
                rows={3}
                placeholder="Optional description..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Start Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={createForm.start_date}
                  onChange={(e) => setCreateForm((f) => ({ ...f, start_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">End Date</label>
                <input
                  type="datetime-local"
                  value={createForm.end_date}
                  onChange={(e) => setCreateForm((f) => ({ ...f, end_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              <select
                value={createForm.status}
                onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{fmtStatus(s)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Notes</label>
              <textarea
                value={createForm.notes}
                onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
                rows={3}
                placeholder="Optional notes..."
              />
            </div>
          </div>
        </ModalForm>

        {/* Edit Modal */}
        <ModalForm
          open={!!editItem}
          onClose={() => setEditItem(null)}
          title="Edit Maintenance Record"
          footer={
            <>
              <button
                onClick={() => setEditItem(null)}
                disabled={updateMutation.isPending}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => { if (editItem) updateMutation.mutate({ id: editItem.id, payload: buildPayload(editForm) }); }}
                disabled={updateMutation.isPending || !editForm.type || !editForm.start_date}
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
            <div>
              <label className="block text-sm text-gray-400 mb-1">Aircraft</label>
              <select
                value={editForm.aircraft}
                onChange={(e) => setEditForm((f) => ({ ...f, aircraft: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="">Select aircraft...</option>
                {aircraftList.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.registration}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Type</label>
              <select
                value={editForm.type}
                onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="">Select type...</option>
                {MAINTENANCE_TYPES.map((t) => (
                  <option key={t} value={t}>{fmtStatus(t)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
                rows={3}
                placeholder="Optional description..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                <input
                  type="datetime-local"
                  value={editForm.start_date}
                  onChange={(e) => setEditForm((f) => ({ ...f, start_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">End Date</label>
                <input
                  type="datetime-local"
                  value={editForm.end_date}
                  onChange={(e) => setEditForm((f) => ({ ...f, end_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{fmtStatus(s)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Notes</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
                rows={3}
                placeholder="Optional notes..."
              />
            </div>
          </div>
        </ModalForm>

        {/* Delete Confirmation */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white">Delete Record</h3>
              <p className="text-sm text-gray-400">
                Remove maintenance record for {deleteTarget?.aircraft_registration || "Unknown"} ({fmtStatus(deleteTarget.type)})?
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMutation.mutate(deleteTarget.id)}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-sm bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}
