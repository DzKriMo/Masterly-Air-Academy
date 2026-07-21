"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { courseSchema } from "@/lib/validators";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar, FilterOption } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ExportButton } from "@/components/export-button";

type CourseFormData = z.infer<typeof courseSchema>;

interface Subject { id: string; code: string; title_en: string; }
interface Room { id: string; name: string; capacity: number; }
interface Course {
  id: string; title: string; subject_code: string; scheduled_date: string;
  start_time: string; end_time: string; status: string; enrollment_count: number; room_name: string | null;
}

const statusOptions = (t: (key: string, fallback?: string) => string) => [
  { value: "scheduled", label: t("instructor.scheduled", "Scheduled") },
  { value: "in_progress", label: t("instructor.inProgress", "In Progress") },
  { value: "completed", label: t("instructor.completed", "Completed") },
];

const statusClass = (s: string) =>
  s === "scheduled" ? "bg-blue-500/10 text-blue-400" :
  s === "completed" ? "bg-green-500/10 text-green-400" :
  "bg-gray-500/10 text-gray-400";

export default function CoursesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  // Cancel state
  const [cancelCourseId, setCancelCourseId] = useState<string | null>(null);
  // Reschedule state
  const [rescheduleCourse, setRescheduleCourse] = useState<Course | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState({ scheduled_date: "", start_time: "", end_time: "" });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: { subject: "", title: "", scheduled_date: "", start_time: "", end_time: "", room: "" },
  });

  useEffect(() => { if (!authLoading && !isAuthenticated) { router.push("/login"); } }, [authLoading, isAuthenticated, router]);

  const { data: coursesData, isLoading, error: coursesError, refetch } = useQuery({
    queryKey: ["instructor-courses"],
    queryFn: () => api.get<any>("/courses/").then(r => (r as unknown as any)),
    enabled: isAuthenticated,
  });
  const courses: Course[] = coursesData?.results || [];

  const { data: subjectsData } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => api.get<any>("/subjects/").then(r => (r as unknown as any)),
    enabled: isAuthenticated,
  });
  const subjects: Subject[] = subjectsData?.results || [];

  const { data: roomsData } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => api.get<any>("/rooms/").then(r => (r as unknown as any)),
    enabled: isAuthenticated,
  });
  const rooms: Room[] = roomsData?.results || [];

  const createCourse = useMutation({
    mutationFn: async (formData: CourseFormData) => {
      return api.post<any>("/courses/", formData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instructor-courses"] });
      setShowForm(false);
      reset({ subject: "", title: "", scheduled_date: "", start_time: "", end_time: "", room: "" });
      showToast("success", t("instructor.createdSuccess", "Created successfully"));
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async (courseId: string) => {
      return api.patch<any>(`/courses/${courseId}/`, { status: "cancelled" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instructor-courses"] });
      setCancelCourseId(null);
      showToast("success", t("instructor.cancelledSuccess", "Cancelled successfully"));
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const rescheduleMutation = useMutation({
    mutationFn: async ({ courseId, data }: { courseId: string; data: { scheduled_date: string; start_time: string; end_time: string } }) => {
      return api.patch<any>(`/courses/${courseId}/`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instructor-courses"] });
      setRescheduleCourse(null);
      setRescheduleForm({ scheduled_date: "", start_time: "", end_time: "" });
      showToast("success", t("instructor.rescheduledSuccess", "Rescheduled successfully"));
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const onSubmit = (data: CourseFormData) => {
    // Convert empty string room to undefined to avoid FK validation errors
    const payload = { ...data, room: data.room || undefined };
    createCourse.mutate(payload);
  };

  const filtered = useMemo(() => {
    let result = courses;
    if (filterValues.status) result = result.filter(c => c.status === filterValues.status);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      result = result.filter(c => (c.title || "").toLowerCase().includes(q) || (c.subject_code || "").toLowerCase().includes(q));
    }
    return result;
  }, [courses, filterValues, searchValue]);

  const filters: FilterOption[] = [
    { key: "status", label: t("instructor.allStatuses", "All Statuses"), options: statusOptions(t) },
  ];

  const columns: Column<Course>[] = useMemo(() => [
    { key: "subject_code", header: t("instructor.subject", "Subject"), render: (c) => (
      <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-medium">{c.subject_code}</span>
    )},
    { key: "title", header: t("instructor.title", "Title") },
    { key: "scheduled_date", header: t("instructor.date", "Date") },
    { key: "time", header: t("instructor.time", "Time"), render: (c) => (
      <span className="text-sm text-gray-400">{c.start_time?.slice(0,5)} - {c.end_time?.slice(0,5)}</span>
    )},
    { key: "status", header: t("instructor.statusHeader", "Status"), render: (c) => (
      <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusClass(c.status)}`}>{t(`instructor.${c.status}`, c.status)}</span>
    )},
    { key: "room_name", header: t("instructor.room", "Room"), render: (c) => (
      <span className="text-sm text-gray-400">{c.room_name || t("instructor.tbd", "TBD")}</span>
    )},
    { key: "enrollment_count", header: t("instructor.students", "Students") },
    { key: "actions", header: "", sortable: false, render: (c) => (
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => router.push(`/instructor/courses/${c.id}/attendance`)}
          className="px-3 py-1.5 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded-lg text-xs hover:bg-gold-500 hover:text-navy-900 transition-colors"
        >
          {t("instructor.attendance", "Attendance")}
        </button>
        {c.status === "scheduled" && (
          <>
            <button
              onClick={() => {
                setRescheduleCourse(c);
                setRescheduleForm({
                  scheduled_date: c.scheduled_date || "",
                  start_time: c.start_time?.slice(0,5) || "",
                  end_time: c.end_time?.slice(0,5) || "",
                });
              }}
              className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg text-xs hover:bg-blue-500/20 transition-colors"
            >
              {t("instructor.reschedule", "Reschedule")}
            </button>
            <button
              onClick={() => setCancelCourseId(c.id)}
              className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs hover:bg-red-500/20 transition-colors"
            >
              {t("instructor.cancel", "Cancel")}
            </button>
          </>
        )}
      </div>
    )},
  ], [router, t]);

  const subjectOptions = subjects.map(s => ({ value: s.id, label: `${s.code} - ${s.title_en}` }));
  const roomOptions = rooms.map(r => ({ value: r.id, label: `${r.name} (cap. ${r.capacity})` }));

  return (
    <div className="flex-1 min-w-0">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">{t("instructor.myCourses", "My Courses")}</h1>
          <div className="flex items-center gap-3">
            <ExportButton exports={[{label:t('instructor.exportExcel','Excel'),url:'/export/courses/',filename:'courses.xlsx',type:'excel'}]} />
            <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm transition-colors">{t("instructor.createCourse", "+ New Course")}</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {coursesError && <ErrorCard message={coursesError.message} onRetry={refetch} />}

        <FilterBar
          filters={filters}
          values={filterValues}
          onChange={(key, value) => setFilterValues(prev => ({ ...prev, [key]: value }))}
          onClear={() => { setFilterValues({}); setSearchValue(""); }}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder={t("instructor.searchCourses", "Search courses...")}
        />

        <ModalForm
          open={showForm}
          onClose={() => setShowForm(false)}
          title={t("instructor.createCourse", "Create New Course")}
          wide
          footer={
            <button
              type="submit"
              form="course-form"
              disabled={createCourse.isPending}
              className="px-6 py-2.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-semibold rounded-lg text-sm transition-colors"
            >
              {createCourse.isPending ? t("common.loading", "Creating...") : t("common.create", "Create Course")}
            </button>
          }
        >
          <form id="course-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t("instructor.subject", "Subject")}</label>
                <select {...register("subject")} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
                  <option value="">{t("instructor.selectSubject", "Select subject...")}</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.title_en}</option>)}
                </select>
                {errors.subject && <p className="text-red-400 text-xs mt-1">{errors.subject.message}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t("instructor.title", "Title")}</label>
                <input {...register("title")} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" placeholder={t("instructor.titlePlaceholder", "e.g. Navigation Basics")} />
                {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t("instructor.date", "Date")}</label>
                <input type="date" {...register("scheduled_date")} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
                {errors.scheduled_date && <p className="text-red-400 text-xs mt-1">{errors.scheduled_date.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t("instructor.startTime", "Start Time")}</label>
                  <input type="time" {...register("start_time")} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
                  {errors.start_time && <p className="text-red-400 text-xs mt-1">{errors.start_time.message}</p>}
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t("instructor.endTime", "End Time")}</label>
                  <input type="time" {...register("end_time")} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
                  {errors.end_time && <p className="text-red-400 text-xs mt-1">{errors.end_time.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t("instructor.room", "Room")}</label>
                <select {...register("room")} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
                  <option value="">{t("instructor.noRoom", "No room")}</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name} (cap. {r.capacity})</option>)}
                </select>
                {errors.room && <p className="text-red-400 text-xs mt-1">{errors.room.message}</p>}
              </div>
            </div>
          </form>
        </ModalForm>

        {/* Reschedule Modal */}
        <ModalForm
          open={!!rescheduleCourse}
          onClose={() => { setRescheduleCourse(null); setRescheduleForm({ scheduled_date: "", start_time: "", end_time: "" }); }}
          title={t("instructor.rescheduleCourse", "Reschedule Course")}
          footer={
            <button
              type="submit"
              form="reschedule-form"
              disabled={rescheduleMutation.isPending}
              className="px-6 py-2.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-semibold rounded-lg text-sm transition-colors"
            >
              {rescheduleMutation.isPending ? t("common.loading", "Saving...") : t("instructor.reschedule", "Reschedule")}
            </button>
          }
        >
          <form
            id="reschedule-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!rescheduleCourse) return;
              rescheduleMutation.mutate({ courseId: rescheduleCourse.id, data: rescheduleForm });
            }}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t("instructor.date", "Date")}</label>
                <input
                  type="date"
                  value={rescheduleForm.scheduled_date}
                  onChange={e => setRescheduleForm(p => ({ ...p, scheduled_date: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t("instructor.startTime", "Start Time")}</label>
                  <input
                    type="time"
                    value={rescheduleForm.start_time}
                    onChange={e => setRescheduleForm(p => ({ ...p, start_time: e.target.value }))}
                    required
                    className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t("instructor.endTime", "End Time")}</label>
                  <input
                    type="time"
                    value={rescheduleForm.end_time}
                    onChange={e => setRescheduleForm(p => ({ ...p, end_time: e.target.value }))}
                    required
                    className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"
                  />
                </div>
              </div>
            </div>
          </form>
        </ModalForm>

        {/* Cancel Confirm Dialog */}
        <ConfirmDialog
          open={!!cancelCourseId}
          onClose={() => setCancelCourseId(null)}
          onConfirm={() => cancelCourseId && cancelMutation.mutate(cancelCourseId)}
          title={t("instructor.cancelCourse", "Cancel Course")}
          message={t("instructor.cancelCourseConfirm", "Are you sure you want to cancel this course?")}
          confirmLabel={t("instructor.cancel", "Cancel Course")}
          destructive
          loading={cancelMutation.isPending}
        />

        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={t("instructor.noCoursesFound", "No courses found.")}
            title={courses.length === 0 ? t("instructor.noCoursesYet", "No courses yet") : t("instructor.noMatchingCourses", "No matching courses")}
            action={courses.length === 0 ? { label: t("common.create", "Create Course"), onClick: () => setShowForm(true) } : undefined}
          />
        ) : (
          <DataTable columns={columns} data={filtered} keyField="id" />
        )}
      </main>
    </div>
  );
}
