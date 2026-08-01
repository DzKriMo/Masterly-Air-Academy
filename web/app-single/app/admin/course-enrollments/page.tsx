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
import { DetailField } from "@/components/detail-field";
import { fmtLabel, formatDate } from "@/lib/format-utils";

interface Enrollment {
  id: string;
  student: string;
  student_name: string;
  course: string;
  status: string;
  enrolled_at: string;
}

const ENROLLMENT_STATUSES = ["active", "completed", "dropped"];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-400",
  completed: "bg-blue-500/10 text-blue-400",
  dropped: "bg-red-500/10 text-red-400",
};



export default function AdminEnrollmentsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  const [selected, setSelected] = useState<Enrollment | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ student: "", course: "", status: "active" });
  const [createError, setCreateError] = useState("");

  const [editItem, setEditItem] = useState<Enrollment | null>(null);
  const [editForm, setEditForm] = useState({ student: "", course: "", status: "active" });
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Enrollment | null>(null);

  const { data: enrollments, isLoading, error, refetch } = useQuery<Enrollment[]>({
    queryKey: ["admin-enrollments"],
    queryFn: async () => {
      const d = await api.get<any>("/course-enrollments/");
      return unwrapResults(d);
    },
    enabled: isAuthenticated,
  });

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ["admin-enroll-students"],
    queryFn: async () => {
      const d = await api.get<any>("/students/");
      return unwrapResults(d);
    },
    enabled: isAuthenticated,
  });

  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["admin-enroll-courses"],
    queryFn: async () => {
      const d = await api.get<any>("/courses/");
      return unwrapResults(d);
    },
    enabled: isAuthenticated,
  });

  const resetCreateForm = () => {
    setCreateForm({ student: "", course: "", status: "active" });
    setCreateError("");
  };

  const createMutation = useMutation({
    mutationFn: (payload: typeof createForm) =>
      api.post("/course-enrollments/", payload),
    onSuccess: () => {
      showToast("success", "Enrollment created");
      setCreateOpen(false);
      resetCreateForm();
      queryClient.invalidateQueries({ queryKey: ["admin-enrollments"] });
    },
    onError: (err: any) => {
      const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message;
      setCreateError(msg || "Failed to create enrollment");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: typeof editForm }) =>
      api.patch(`/course-enrollments/${id}/`, payload),
    onSuccess: () => {
      showToast("success", "Enrollment updated");
      setEditItem(null);
      queryClient.invalidateQueries({ queryKey: ["admin-enrollments"] });
    },
    onError: (err: any) => {
      const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message;
      setEditError(msg || "Failed to update enrollment");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/course-enrollments/${id}/`),
    onSuccess: () => {
      showToast("success", "Enrollment deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-enrollments"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to delete enrollment");
    },
  });

  const filtered = useMemo(() => {
    if (!enrollments) return [];
    let r = enrollments;
    if (filterValues.status) r = r.filter((e) => e.status === filterValues.status);
    if (filterValues.course) r = r.filter((e) => e.course === filterValues.course);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter((e) => (e.student_name || "").toLowerCase().includes(q));
    }
    return r;
  }, [enrollments, filterValues, searchValue]);

  const columns: Column<Enrollment>[] = useMemo(
    () => [
      {
        key: "student_name",
        header: "Student",
        render: (e) => <span className="text-sm font-semibold text-white">{e.student_name}</span>,
      },
      {
        key: "status",
        header: "Status",
        render: (e) => (
          <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[e.status] || "bg-gray-500/10 text-gray-400"}`}>
            {fmtLabel(e.status)}
          </span>
        ),
      },
      {
        key: "enrolled_at",
        header: "Enrolled",
        render: (e) => <span className="text-sm text-gray-400">{formatDate(e.enrolled_at)}</span>,
      },
      {
        key: "actions",
        header: "",
        render: (e) => (
          <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setEditItem(e);
                setEditForm({ student: e.student, course: e.course, status: e.status });
                setEditError("");
              }}
              className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setDeleteTarget(e)}
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
        title="Course Enrollments"
        backHref="/admin/dashboard"
        backLabel={t("common.back", "Back to Dashboard")}
        actions={
          <button
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors"
          >
            + New Enrollment
          </button>
        }
      />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <ErrorCard
            message={error?.message || "Failed to load enrollments"}
            onRetry={() => refetch()}
          />
        )}

        <FilterBar
          filters={[
            {
              key: "status",
              label: "All Statuses",
              options: ENROLLMENT_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })),
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
              enrollments?.length === 0
                ? "No enrollments yet."
                : "No enrollments match your filters."
            }
            title={enrollments?.length === 0 ? "No enrollments yet" : "No matching enrollments"}
            action={
              enrollments?.length === 0
                ? { label: "New Enrollment", onClick: () => setCreateOpen(true) }
                : undefined
            }
          />
        ) : (
          <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(item) => setSelected(item as Enrollment)} />
        )}

        {/* Detail Modal */}
        <ModalForm
          open={!!selected}
          onClose={() => setSelected(null)}
          title="Enrollment Details"
          footer={
            <button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">
              {t("common.close", "Close")}
            </button>
          }
        >
          {selected && (
            <div className="space-y-4">
              <DetailField label="Student" value={selected.student_name} />
              <DetailField label="Status" value={fmtLabel(selected.status)} />
              <DetailField label="Enrolled At" value={formatDate(selected.enrolled_at)} />
            </div>
          )}
        </ModalForm>

        {/* Create Modal */}
        <ModalForm
          open={createOpen}
          onClose={() => { setCreateOpen(false); resetCreateForm(); }}
          title="New Enrollment"
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
                onClick={() => createMutation.mutate(createForm)}
                disabled={createMutation.isPending || !createForm.student || !createForm.course}
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
            <div>
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              <select
                value={createForm.status}
                onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                {ENROLLMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>{fmtLabel(s)}</option>
                ))}
              </select>
            </div>
          </div>
        </ModalForm>

        {/* Edit Modal */}
        <ModalForm
          open={!!editItem}
          onClose={() => setEditItem(null)}
          title="Edit Enrollment"
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
                onClick={() => { if (editItem) updateMutation.mutate({ id: editItem.id, payload: editForm }); }}
                disabled={updateMutation.isPending || !editForm.student || !editForm.course}
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
            <div>
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                {ENROLLMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>{fmtLabel(s)}</option>
                ))}
              </select>
            </div>
          </div>
        </ModalForm>

        {/* Delete Confirmation */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white">Delete Enrollment</h3>
              <p className="text-sm text-gray-400">
                Remove {deleteTarget.student_name} from this course?
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

