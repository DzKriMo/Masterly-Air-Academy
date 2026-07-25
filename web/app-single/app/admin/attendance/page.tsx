"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useTranslation } from "@/lib/use-translation";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";

interface Attendance {
  id: string;
  student: string;
  student_name: string;
  course: string;
  date: string;
  status: string;
  notes: string | null;
  recorded_at: string;
}

const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused_absence"];

const STATUS_COLORS: Record<string, string> = {
  present: "bg-green-500/10 text-green-400",
  absent: "bg-red-500/10 text-red-400",
  late: "bg-amber-500/10 text-amber-400",
  excused_absence: "bg-blue-500/10 text-blue-400",
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

export default function AdminAttendancePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  const [selected, setSelected] = useState<Attendance | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ student: "", course: "", date: "", status: "present", notes: "" });
  const [createError, setCreateError] = useState("");

  const [editItem, setEditItem] = useState<Attendance | null>(null);
  const [editForm, setEditForm] = useState({ student: "", course: "", date: "", status: "present", notes: "" });
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Attendance | null>(null);

  const { data: records, isLoading, error, refetch } = useQuery<Attendance[]>({
    queryKey: ["admin-attendance"],
    queryFn: async () => {
      const d = await api.get<any>("/attendance/");
      return (d as any)?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ["admin-att-students"],
    queryFn: async () => {
      const d = await api.get<any>("/students/");
      return (d as any)?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["admin-att-courses"],
    queryFn: async () => {
      const d = await api.get<any>("/courses/");
      return (d as any)?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  const resetCreateForm = () => {
    setCreateForm({ student: "", course: "", date: "", status: "present", notes: "" });
    setCreateError("");
  };

  const buildPayload = (form: typeof createForm) => ({
    student: form.student,
    course: form.course,
    date: form.date,
    status: form.status,
    notes: form.notes || null,
  });

  const createMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof buildPayload>) =>
      api.post("/attendance/", payload),
    onSuccess: () => {
      showToast("success", "Attendance record created");
      setCreateOpen(false);
      resetCreateForm();
      queryClient.invalidateQueries({ queryKey: ["admin-attendance"] });
    },
    onError: (err: any) => {
      const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message;
      setCreateError(msg || "Failed to create record");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReturnType<typeof buildPayload> }) =>
      api.patch(`/attendance/${id}/`, payload),
    onSuccess: () => {
      showToast("success", "Attendance updated");
      setEditItem(null);
      queryClient.invalidateQueries({ queryKey: ["admin-attendance"] });
    },
    onError: (err: any) => {
      const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message;
      setEditError(msg || "Failed to update record");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/attendance/${id}/`),
    onSuccess: () => {
      showToast("success", "Attendance deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-attendance"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to delete record");
    },
  });

  const filtered = useMemo(() => {
    if (!records) return [];
    let r = records;
    if (filterValues.status) r = r.filter((a) => a.status === filterValues.status);
    if (filterValues.course) r = r.filter((a) => a.course === filterValues.course);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter((a) => (a.student_name || "").toLowerCase().includes(q));
    }
    return r;
  }, [records, filterValues, searchValue]);

  const columns: Column<Attendance>[] = useMemo(
    () => [
      {
        key: "student_name",
        header: "Student",
        render: (a) => <span className="text-sm font-semibold text-white">{a.student_name}</span>,
      },
      {
        key: "date",
        header: "Date",
        render: (a) => <span className="text-sm text-gray-300">{formatDate(a.date)}</span>,
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
        key: "actions",
        header: "",
        render: (a) => (
          <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setEditItem(a);
                setEditForm({
                  student: a.student, course: a.course, date: a.date,
                  status: a.status, notes: a.notes || "",
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

  const courseFilterOptions = useMemo(
    () => courses.map((c: any) => ({ value: c.id, label: c.title })),
    [courses]
  );

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader
        title="Attendance Records"
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
            message={(error as any)?.message || "Failed to load attendance records"}
            onRetry={() => refetch()}
          />
        )}

        <FilterBar
          filters={[
            {
              key: "status",
              label: "All Statuses",
              options: ATTENDANCE_STATUSES.map((s) => ({ value: s, label: fmtStatus(s) })),
            },
            {
              key: "course",
              label: "All Courses",
              options: courseFilterOptions,
            },
          ]}
          values={filterValues}
          onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))}
          onClear={() => { setFilterValues({}); setSearchValue(""); }}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search by student name..."
        />

        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              records?.length === 0
                ? "No attendance records yet."
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
          <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(item) => setSelected(item as Attendance)} />
        )}

        {/* Detail Modal */}
        <ModalForm
          open={!!selected}
          onClose={() => setSelected(null)}
          title="Attendance Record"
          footer={
            <button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">
              {t("common.close", "Close")}
            </button>
          }
        >
          {selected && (
            <div className="space-y-4">
              <DetailField label="Student" value={selected.student_name} />
              <DetailField label="Date" value={formatDate(selected.date)} />
              <DetailField label="Status" value={fmtStatus(selected.status)} />
              <DetailField label="Notes" value={selected.notes || "—"} />
              <DetailField label="Recorded At" value={formatDate(selected.recorded_at)} />
            </div>
          )}
        </ModalForm>

        {/* Create Modal */}
        <ModalForm
          open={createOpen}
          onClose={() => { setCreateOpen(false); resetCreateForm(); }}
          title="New Attendance Record"
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
                disabled={createMutation.isPending || !createForm.student || !createForm.course || !createForm.date}
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
              <label className="block text-sm text-gray-400 mb-1">
                Student <span className="text-red-400">*</span>
              </label>
              <select
                value={createForm.student}
                onChange={(e) => setCreateForm((f) => ({ ...f, student: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="">Select student...</option>
                {students.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.full_name || `${s.first_name} ${s.last_name}`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Course <span className="text-red-400">*</span>
              </label>
              <select
                value={createForm.course}
                onChange={(e) => setCreateForm((f) => ({ ...f, course: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="">Select course...</option>
                {courses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={createForm.date}
                  onChange={(e) => setCreateForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Status <span className="text-red-400">*</span>
                </label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                >
                  {ATTENDANCE_STATUSES.map((s) => (
                    <option key={s} value={s}>{fmtStatus(s)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Notes</label>
              <input
                type="text"
                value={createForm.notes}
                onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                placeholder="Optional notes..."
              />
            </div>
          </div>
        </ModalForm>

        {/* Edit Modal */}
        <ModalForm
          open={!!editItem}
          onClose={() => setEditItem(null)}
          title="Edit Attendance Record"
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
                disabled={updateMutation.isPending || !editForm.student || !editForm.course || !editForm.date}
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
              <label className="block text-sm text-gray-400 mb-1">Student</label>
              <select
                value={editForm.student}
                onChange={(e) => setEditForm((f) => ({ ...f, student: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="">Select student...</option>
                {students.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.full_name || `${s.first_name} ${s.last_name}`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Course</label>
              <select
                value={editForm.course}
                onChange={(e) => setEditForm((f) => ({ ...f, course: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="">Select course...</option>
                {courses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Date</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
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
                  {ATTENDANCE_STATUSES.map((s) => (
                    <option key={s} value={s}>{fmtStatus(s)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Notes</label>
              <input
                type="text"
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
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
                Remove attendance for {deleteTarget.student_name} on {formatDate(deleteTarget.date)}?
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