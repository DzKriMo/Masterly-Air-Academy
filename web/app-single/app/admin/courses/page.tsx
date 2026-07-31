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

interface Course {
  id: string;
  subject: string | null;
  subject_code?: string;
  instructor: string | null;
  instructor_name?: string;
  academic_year: string | null;
  title: string;
  title_ar: string | null;
  title_fr: string | null;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  room: string | null;
  room_name?: string;
  status: string;
  notes: string | null;
  enrollment_count?: number;
  created_at: string;
  updated_at: string;
}

const STATUSES = ["scheduled", "in_progress", "completed", "cancelled"];

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

function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "—";
  try {
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  } catch {
    return timeStr;
  }
}

function truncate(str: string, len: number): string {
  if (!str) return "—";
  return str.length > len ? str.substring(0, len) + "…" : str;
}

export default function AdminCoursesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  const [selected, setSelected] = useState<Course | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    subject: "",
    instructor: "",
    title: "",
    scheduled_date: "",
    start_time: "",
    end_time: "",
    room: "",
    status: "scheduled",
    notes: "",
    academic_year: "",
  });
  const [createError, setCreateError] = useState("");

  const [editItem, setEditItem] = useState<Course | null>(null);
  const [editForm, setEditForm] = useState({
    subject: "",
    instructor: "",
    title: "",
    scheduled_date: "",
    start_time: "",
    end_time: "",
    room: "",
    status: "scheduled",
    notes: "",
    academic_year: "",
  });
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);

  const { data: courses, isLoading, error, refetch } = useQuery<Course[]>({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const d = await api.get<any>("/courses/");
      return unwrapResults(d);
    },
    enabled: isAuthenticated,
  });

  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ["admin-courses-subjects"],
    queryFn: async () => {
      const d = await api.get<any>("/subjects/");
      return unwrapResults(d);
    },
    enabled: isAuthenticated,
  });

  const { data: instructors = [] } = useQuery<any[]>({
    queryKey: ["admin-courses-instructors"],
    queryFn: async () => {
      const d = await api.get<any>("/ground-instructors/");
      return unwrapResults(d);
    },
    enabled: isAuthenticated,
  });

  const { data: academicYears = [] } = useQuery<any[]>({
    queryKey: ["admin-courses-academic-years"],
    queryFn: async () => {
      const d = await api.get<any>("/academic-years/");
      return unwrapResults(d);
    },
    enabled: isAuthenticated,
  });

  const { data: rooms = [] } = useQuery<any[]>({
    queryKey: ["admin-courses-rooms"],
    queryFn: async () => {
      const d = await api.get<any>("/rooms/");
      return unwrapResults(d);
    },
    enabled: isAuthenticated,
  });

  const resetCreateForm = () => {
    setCreateForm({
      subject: "", instructor: "", title: "", scheduled_date: "",
      start_time: "", end_time: "", room: "", status: "scheduled",
      notes: "", academic_year: "",
    });
    setCreateError("");
  };

  const todayStr = () => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  };

  const buildPayload = (form: typeof createForm) => ({
    subject: form.subject || null,
    instructor: form.instructor || null,
    academic_year: form.academic_year || null,
    title: form.title,
    title_ar: null,
    title_fr: null,
    scheduled_date: form.scheduled_date,
    start_time: form.start_time,
    end_time: form.end_time,
    room: form.room || null,
    notes: form.notes || null,
    status: form.status,
  });

  const createMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof buildPayload>) =>
      api.post("/courses/", payload),
    onSuccess: () => {
      showToast("success", "Course created successfully");
      setCreateOpen(false);
      resetCreateForm();
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
    },
    onError: (err: any) => {
      const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message;
      setCreateError(msg || "Failed to create course");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReturnType<typeof buildPayload> }) =>
      api.patch(`/courses/${id}/`, payload),
    onSuccess: () => {
      showToast("success", "Course updated successfully");
      setEditItem(null);
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
    },
    onError: (err: any) => {
      const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message;
      setEditError(msg || "Failed to update course");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/courses/${id}/`),
    onSuccess: () => {
      showToast("success", "Course deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to delete course");
    },
  });

  const filtered = useMemo(() => {
    if (!courses) return [];
    let r = courses;
    if (filterValues.status)
      r = r.filter((c) => c.status === filterValues.status);
    if (filterValues.subject)
      r = r.filter((c) => c.subject === filterValues.subject);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.subject_code && item.subject_code.toLowerCase().includes(q)) ||
          (item.instructor_name && item.instructor_name.toLowerCase().includes(q))
      );
    }
    return r;
  }, [courses, filterValues, searchValue]);

  const columns: Column<Course>[] = useMemo(
    () => [
      {
        key: "title",
        header: "Title",
        render: (c) => (
          <span className="text-sm font-semibold text-white">{truncate(c.title, 60)}</span>
        ),
      },
      {
        key: "subject_code",
        header: "Subject",
        render: (c) => (
          <span className="text-sm text-gray-300">{c.subject_code || "—"}</span>
        ),
      },
      {
        key: "instructor_name",
        header: "Instructor",
        render: (c) => (
          <span className="text-sm text-gray-300">{c.instructor_name || "—"}</span>
        ),
      },
      {
        key: "scheduled_date",
        header: "Date",
        render: (c) => (
          <span className="text-sm text-gray-400">{formatDate(c.scheduled_date)}</span>
        ),
      },
      {
        key: "start_time",
        header: "Time",
        render: (c) => (
          <span className="text-sm text-gray-400">
            {formatTime(c.start_time)} – {formatTime(c.end_time)}
          </span>
        ),
      },
      {
        key: "room_name",
        header: "Room",
        render: (c) => (
          <span className="text-sm text-gray-300">{c.room_name || "—"}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (c) => (
          <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[c.status] || "bg-gray-500/10 text-gray-400"}`}>
            {fmtStatus(c.status)}
          </span>
        ),
      },
      {
        key: "enrollment_count",
        header: "Enrolled",
        render: (c) => (
          <span className="text-sm text-gray-400">{c.enrollment_count ?? "—"}</span>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (c) => (
          <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setEditItem(c);
                setEditForm({
                  subject: c.subject || "",
                  instructor: c.instructor || "",
                  title: c.title,
                  scheduled_date: c.scheduled_date || todayStr(),
                  start_time: c.start_time || "",
                  end_time: c.end_time || "",
                  room: c.room || "",
                  status: c.status,
                  notes: c.notes || "",
                  academic_year: c.academic_year || "",
                });
                setEditError("");
              }}
              className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setDeleteTarget(c)}
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

  const filterOptions = useMemo(
    () => ({
      status: STATUSES.map((s) => ({ value: s, label: fmtStatus(s) })),
      subject: subjects.map((s: any) => ({ value: s.id, label: s.title_en || s.code })),
    }),
    [subjects]
  );

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader
        title="Courses"
        backHref="/admin/dashboard"
        backLabel={t("common.back", "Back to Dashboard")}
        actions={
          <button
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors"
          >
            + New Course
          </button>
        }
      />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <ErrorCard
            message={error?.message || "Failed to load courses"}
            onRetry={() => refetch()}
          />
        )}

        <FilterBar
          filters={[
            {
              key: "status",
              label: "All Statuses",
              options: filterOptions.status,
            },
            {
              key: "subject",
              label: "All Subjects",
              options: filterOptions.subject,
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
          searchPlaceholder="Search courses..."
        />

        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              courses?.length === 0
                ? "No courses have been created yet. Click '+ New Course' to add one."
                : "No courses match your filters."
            }
            title={courses?.length === 0 ? "No courses yet" : "No matching courses"}
            action={
              courses?.length === 0
                ? { label: "New Course", onClick: () => setCreateOpen(true) }
                : undefined
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            keyField="id"
            onRowClick={(item) => setSelected(item as Course)}
          />
        )}

        {/* Detail Modal */}
        <ModalForm
          open={!!selected}
          onClose={() => setSelected(null)}
          title="Course Details"
          wide
          footer={
            <button
              onClick={() => setSelected(null)}
              className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white"
            >
              {t("common.close", "Close")}
            </button>
          }
        >
          {selected && (
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Course</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <DetailField label="Title" value={selected.title} />
                  </div>
                  <DetailField label="Subject" value={selected.subject_code || "—"} />
                  <DetailField label="Instructor" value={selected.instructor_name || "—"} />
                  <DetailField label="Date" value={formatDate(selected.scheduled_date)} />
                  <DetailField label="Time" value={`${formatTime(selected.start_time)} – ${formatTime(selected.end_time)}`} />
                  <DetailField label="Room" value={selected.room_name || "—"} />
                  <DetailField label="Status" value={fmtStatus(selected.status)} />
                  <DetailField label="Enrolled" value={selected.enrollment_count != null ? String(selected.enrollment_count) : "—"} />
                </div>
              </section>
              {selected.notes && (
                <section>
                  <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Notes</h3>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{selected.notes}</p>
                </section>
              )}
            </div>
          )}
        </ModalForm>

        {/* Create Modal */}
        <ModalForm
          open={createOpen}
          onClose={() => { setCreateOpen(false); resetCreateForm(); }}
          title="New Course"
          footer={
            <>
              <button
                onClick={() => { setCreateOpen(false); resetCreateForm(); }}
                disabled={createMutation.isPending}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                onClick={() => createMutation.mutate(buildPayload(createForm))}
                disabled={createMutation.isPending || !createForm.title || !createForm.subject || !createForm.instructor || !createForm.scheduled_date || !createForm.start_time || !createForm.end_time}
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating..." : t("common.create", "Create")}
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
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={createForm.title}
                onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                placeholder="Course title..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Subject <span className="text-red-400">*</span>
                </label>
                <select
                  value={createForm.subject}
                  onChange={(e) => setCreateForm((f) => ({ ...f, subject: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                >
                  <option value="">Select subject</option>
                  {subjects.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.title_en || s.code}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Instructor <span className="text-red-400">*</span>
                </label>
                <select
                  value={createForm.instructor}
                  onChange={(e) => setCreateForm((f) => ({ ...f, instructor: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                >
                  <option value="">Select instructor</option>
                  {instructors.map((inst: any) => (
                    <option key={inst.id} value={inst.id}>{inst.full_name || inst.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={createForm.scheduled_date}
                  onChange={(e) => setCreateForm((f) => ({ ...f, scheduled_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Start Time <span className="text-red-400">*</span>
                </label>
                <input
                  type="time"
                  value={createForm.start_time}
                  onChange={(e) => setCreateForm((f) => ({ ...f, start_time: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  End Time <span className="text-red-400">*</span>
                </label>
                <input
                  type="time"
                  value={createForm.end_time}
                  onChange={(e) => setCreateForm((f) => ({ ...f, end_time: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Room</label>
                <select
                  value={createForm.room}
                  onChange={(e) => setCreateForm((f) => ({ ...f, room: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                >
                  <option value="">No room</option>
                  {rooms.map((r: any) => (
                    <option key={r.id} value={r.id}>{r.name || r.room_number}</option>
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
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{fmtStatus(s)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Academic Year</label>
              <select
                value={createForm.academic_year}
                onChange={(e) => setCreateForm((f) => ({ ...f, academic_year: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="">Auto-assign</option>
                {academicYears.map((y: any) => (
                  <option key={y.id} value={y.id}>{y.name || y.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Notes</label>
              <textarea
                value={createForm.notes}
                onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
                placeholder="Optional notes..."
              />
            </div>
          </div>
        </ModalForm>

        {/* Edit Modal */}
        <ModalForm
          open={!!editItem}
          onClose={() => setEditItem(null)}
          title="Edit Course"
          wide
          footer={
            <>
              <button
                onClick={() => setEditItem(null)}
                disabled={updateMutation.isPending}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                onClick={() => { if (editItem) updateMutation.mutate({ id: editItem.id, payload: buildPayload(editForm) }); }}
                disabled={updateMutation.isPending || !editForm.title || !editForm.subject || !editForm.instructor || !editForm.scheduled_date || !editForm.start_time || !editForm.end_time}
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving..." : t("common.save", "Save")}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {editError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{editError}</div>
            )}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Subject <span className="text-red-400">*</span>
                </label>
                <select
                  value={editForm.subject}
                  onChange={(e) => setEditForm((f) => ({ ...f, subject: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                >
                  <option value="">Select subject</option>
                  {subjects.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.title_en || s.code}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Instructor <span className="text-red-400">*</span>
                </label>
                <select
                  value={editForm.instructor}
                  onChange={(e) => setEditForm((f) => ({ ...f, instructor: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                >
                  <option value="">Select instructor</option>
                  {instructors.map((inst: any) => (
                    <option key={inst.id} value={inst.id}>{inst.full_name || inst.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={editForm.scheduled_date}
                  onChange={(e) => setEditForm((f) => ({ ...f, scheduled_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Start Time <span className="text-red-400">*</span>
                </label>
                <input
                  type="time"
                  value={editForm.start_time}
                  onChange={(e) => setEditForm((f) => ({ ...f, start_time: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  End Time <span className="text-red-400">*</span>
                </label>
                <input
                  type="time"
                  value={editForm.end_time}
                  onChange={(e) => setEditForm((f) => ({ ...f, end_time: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Room</label>
                <select
                  value={editForm.room}
                  onChange={(e) => setEditForm((f) => ({ ...f, room: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                >
                  <option value="">No room</option>
                  {rooms.map((r: any) => (
                    <option key={r.id} value={r.id}>{r.name || r.room_number}</option>
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
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{fmtStatus(s)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Academic Year</label>
              <select
                value={editForm.academic_year}
                onChange={(e) => setEditForm((f) => ({ ...f, academic_year: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="">Auto-assign</option>
                {academicYears.map((y: any) => (
                  <option key={y.id} value={y.id}>{y.name || y.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Notes</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
              />
            </div>
          </div>
        </ModalForm>

        {/* Delete Confirmation */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white">Delete Course</h3>
              <p className="text-sm text-gray-400">
                Are you sure you want to delete this course? This action cannot be undone.
              </p>
              <p className="text-sm text-gray-300 bg-navy-900 rounded px-3 py-2 line-clamp-2">
                {truncate(deleteTarget.title, 120)}
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
      <p className="text-sm text-white break-words">{value}</p>
    </div>
  );
}