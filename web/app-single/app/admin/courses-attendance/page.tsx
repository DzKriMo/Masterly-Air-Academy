"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, GraduationCap, ClipboardCheck, Users, ChevronDown, Search } from "lucide-react";
import { HubLayout, HubTab } from "@/components/hub-layout";
import { HubCrud } from "@/components/hub-crud";
import { ModalForm } from "@/components/modal-form";
import { formatDate, formatTime, fmtLabel, todayLocal } from "@/lib/format-utils";
import { api, unwrapResults, withFullLimit } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useToast } from "@/components/toast";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorCard } from "@/components/error-card";

const TABS: HubTab[] = [
  { id: "courses", label: "Courses", icon: Calendar },
  { id: "enrollments", label: "Enrollments", icon: GraduationCap },
  { id: "attendance", label: "Attendance", icon: ClipboardCheck },
];

export default function CoursesHubPage() {
  return (
    <HubLayout title="Courses & Attendance" tabs={TABS} defaultTab="courses">
      {(active) => (
        <>
          {active === "courses" && <CoursesTab />}
          {active === "enrollments" && <EnrollmentsTab />}
          {active === "attendance" && <AttendanceTab />}
        </>
      )}
    </HubLayout>
  );
}

const COURSE_STATUSES = ["scheduled", "in_progress", "completed", "cancelled"];
const COURSE_STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-400",
  in_progress: "bg-amber-500/10 text-amber-400",
  completed: "bg-green-500/10 text-green-400",
  cancelled: "bg-gray-500/10 text-gray-400",
};

function CoursesTab() {
  return (
    <HubCrud<Course>
      queryKey={["admin-courses"]}
      endpoint="/courses/"
      titleFallback="Courses"
      emptyTitle="No courses yet"
      emptyMessage="Courses are scheduled classes tied to a subject, instructor and room."
      emptyActionLabel="+ New Course"
      createTitle="New Course"
      editTitle="Edit Course"
      createLabel="+ New Course"
      searchPlaceholder="Search title, subject or instructor..."
      searchFields={["title", "subject_code", "instructor_name"]}
      filterFields={[
        { key: "status", label: "All Statuses", options: COURSE_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })) },
        { key: "subject", label: "All Subjects", options: (lk) => (lk.subjects || []).map((s: any) => ({ value: s.id, label: s.title_en || s.code })) },
        { key: "promotion", label: "All Promotions", options: (lk) => (lk.promotions || []).map((p: any) => ({ value: p.id, label: p.code || p.name })) },
      ]}
      lookups={[
        { key: "subjects", queryKey: ["admin-courses-subjects"], endpoint: "/subjects/" },
        { key: "instructors", queryKey: ["admin-courses-instructors"], endpoint: "/ground-instructors/" },
        { key: "rooms", queryKey: ["admin-courses-rooms"], endpoint: "/rooms/" },
        { key: "promotions", queryKey: ["admin-courses-promotions"], endpoint: "/promotions/" },
      ]}
      initialCreate={{ subject: "", instructor: "", title: "", scheduled_date: "", start_time: "", end_time: "", room: "", status: "scheduled", notes: "", promotion: "" }}
      buildForm={(c) => ({ subject: c.subject || "", instructor: c.instructor || "", title: c.title, scheduled_date: c.scheduled_date || todayLocal(), start_time: c.start_time || "", end_time: c.end_time || "", room: c.room || "", status: c.status, notes: c.notes || "", promotion: c.promotion || "" })}
      buildPayload={(f) => ({
        subject: f.subject || null,
        instructor: f.instructor || null,
        promotion: f.promotion || null,
        title: f.title,
        scheduled_date: f.scheduled_date,
        start_time: f.start_time,
        end_time: f.end_time,
        room: f.room || null,
        notes: f.notes || null,
        status: f.status,
      })}
      fields={(mode) => [
        { name: "title", label: "Title", type: "text", required: true, placeholder: "Course title..." },
        { name: "subject", label: "Subject", type: "select", required: true, placeholder: "Select subject", options: (lk) => (lk.subjects || []).map((s: any) => ({ value: s.id, label: s.title_en || s.code })) },
        { name: "instructor", label: "Instructor", type: "select", required: true, placeholder: "Select instructor", options: (lk) => (lk.instructors || []).map((i: any) => ({ value: i.id, label: i.full_name || i.name })) },
        { name: "scheduled_date", label: "Date", type: "date", required: true },
        { name: "start_time", label: "Start Time", type: "time", required: true, span: "half" },
        { name: "end_time", label: "End Time", type: "time", required: true, span: "half" },
        { name: "room", label: "Room", type: "select", placeholder: "No room", options: (lk) => (lk.rooms || []).map((r: any) => ({ value: r.id, label: r.name || r.room_number })) },
        { name: "status", label: "Status", type: "select", options: COURSE_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })) },
        { name: "promotion", label: "Promotion", type: "select", placeholder: "Auto-assign", options: (lk) => (lk.promotions || []).map((p: any) => ({ value: p.id, label: p.code || p.name })) },
        { name: "notes", label: "Notes", type: "textarea", rows: 3 },
      ]}
      columns={[
        { key: "title", header: "Title", render: (c) => <span className="text-sm font-semibold text-white">{c.title}</span> },
        { key: "subject_code", header: "Subject", render: (c) => <span className="text-sm text-gray-300">{c.subject_code || "—"}</span> },
        { key: "promotion_code", header: "Promotion", render: (c) => <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono">{c.promotion_code || "—"}</span> },
        { key: "instructor_name", header: "Instructor", render: (c) => <span className="text-sm text-gray-300">{c.instructor_name || "—"}</span> },
        { key: "scheduled_date", header: "Date", render: (c) => <span className="text-sm text-gray-400">{formatDate(c.scheduled_date)}</span> },
        { key: "start_time", header: "Time", render: (c) => <span className="text-sm text-gray-400">{formatTime(c.start_time)} – {formatTime(c.end_time)}</span> },
        { key: "room_name", header: "Room", render: (c) => <span className="text-sm text-gray-300">{c.room_name || "—"}</span> },
        { key: "status", header: "Status", render: (c) => <span className={`text-xs px-2 py-0.5 rounded ${COURSE_STATUS_COLORS[c.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtLabel(c.status)}</span> },
        { key: "enrollment_count", header: "Enrolled", render: (c) => <span className="text-sm text-gray-400">{c.enrollment_count ?? "—"}</span> },
      ]}
      detailTitle="Course Details"
      detailFields={(c) => [
        { label: "Title", value: c.title },
        { label: "Subject", value: c.subject_code || "—" },
        { label: "Promotion", value: c.promotion_code || "—" },
        { label: "Instructor", value: c.instructor_name || "—" },
        { label: "Date", value: formatDate(c.scheduled_date) },
        { label: "Time", value: `${formatTime(c.start_time)} – ${formatTime(c.end_time)}` },
        { label: "Room", value: c.room_name || "—" },
        { label: "Status", value: fmtLabel(c.status) },
        { label: "Enrolled", value: c.enrollment_count != null ? String(c.enrollment_count) : "—" },
        ...(c.notes ? [{ label: "Notes", value: c.notes }] : []),
      ]}
    />
  );
}
interface Course {
  id: string;
  subject: string | null;
  subject_code?: string;
  instructor: string | null;
  instructor_name?: string;
  promotion: string | null;
  promotion_code?: string;
  title: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  room: string | null;
  room_name?: string;
  status: string;
  notes: string | null;
  enrollment_count?: number;
}

const ENROLLMENT_STATUSES = ["active", "completed", "dropped"];
const ENROLLMENT_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-400",
  completed: "bg-blue-500/10 text-blue-400",
  dropped: "bg-red-500/10 text-red-400",
};

function EnrollmentsTab() {
  const { t } = { t: (k: string, f?: string) => f || k };
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ course: "", mode: "student" as "student" | "promotion", student: "", promotion: "" });
  const [saving, setSaving] = useState(false);

  const { data: students } = useQuery<any[]>({ queryKey: ["enroll-students"], queryFn: async () => unwrapResults(await api.get(withFullLimit("/students/"))) });
  const { data: promotions } = useQuery<any[]>({ queryKey: ["enroll-promos"], queryFn: async () => unwrapResults(await api.get(withFullLimit("/promotions/"))) });
  const { data: courses } = useQuery<any[]>({ queryKey: ["enroll-courses"], queryFn: async () => unwrapResults(await api.get(withFullLimit("/courses/"))) });

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (enrollForm.mode === "student") {
        await api.post("/course-enrollments/", { student: enrollForm.student, course: enrollForm.course });
        showToast("success", "Student enrolled");
      } else {
        const promoStudents = unwrapResults<any>(await api.get(withFullLimit(`/students/?promotion=${enrollForm.promotion}`)));
        let count = 0;
        for (const s of promoStudents) {
          try { await api.post("/course-enrollments/", { student: s.id, course: enrollForm.course }); count++; } catch {}
        }
        showToast("success", `${count} students enrolled`);
      }
      setShowForm(false);
      setEnrollForm({ course: "", mode: "student", student: "", promotion: "" });
    } catch (err: any) {
      showToast("error", err.message || "Failed to enroll");
    } finally { setSaving(false); }
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={() => { setEnrollForm({ course: "", mode: "student", student: "", promotion: "" }); setShowForm(true); }} className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm">
          + Enroll Students
        </button>
      </div>
      <CourseGroupedList
        queryKey={["admin-enrollments"]}
        endpoint="/course-enrollments/"
        titleFallback="Enrollments"
        emptyTitle="No enrollments yet"
        emptyMessage="Enroll students into courses."
        searchPlaceholder="Search student..."
        coursesQueryKey={["admin-enrollments-courses"]}
        coursesEndpoint="/courses/"
        renderRow={(e) => ({
          key: e.id,
          course: e.course,
          badge: { label: fmtLabel(e.status), className: ENROLLMENT_COLORS[e.status] || "bg-gray-500/10 text-gray-400" },
          title: e.student_name,
          subtitle: formatDate(e.enrolled_at),
        })}
      />

      <ModalForm open={showForm} onClose={() => setShowForm(false)} title="Enroll Students"
        footer={
          <button type="submit" form="enroll-form" disabled={saving} className="px-6 py-2.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-semibold rounded-lg text-sm">
            {saving ? "Enrolling..." : "Enroll"}
          </button>
        }
      >
        <form id="enroll-form" onSubmit={handleEnroll} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Course *</label>
            <select value={enrollForm.course} onChange={e => setEnrollForm({...enrollForm, course: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
              <option value="">Select course...</option>
              {(courses || []).map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Enrollment Mode</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEnrollForm({...enrollForm, mode: "student"})} className={`px-4 py-2 rounded-lg text-sm font-semibold ${enrollForm.mode === "student" ? "bg-gold-500 text-navy-900" : "bg-navy-700 text-gray-400"}`}>Single Student</button>
              <button type="button" onClick={() => setEnrollForm({...enrollForm, mode: "promotion"})} className={`px-4 py-2 rounded-lg text-sm font-semibold ${enrollForm.mode === "promotion" ? "bg-gold-500 text-navy-900" : "bg-navy-700 text-gray-400"}`}>By Promotion</button>
            </div>
          </div>
          {enrollForm.mode === "student" ? (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Student *</label>
              <select value={enrollForm.student} onChange={e => setEnrollForm({...enrollForm, student: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
                <option value="">Select student...</option>
                {(students || []).map((s: any) => <option key={s.id} value={s.id}>{s.full_name || `${s.first_name} ${s.last_name}`} ({s.student_number})</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Promotion *</label>
              <select value={enrollForm.promotion} onChange={e => setEnrollForm({...enrollForm, promotion: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
                <option value="">Select promotion...</option>
                {(promotions || []).map((p: any) => <option key={p.id} value={p.id}>{p.name || p.code}</option>)}
              </select>
            </div>
          )}
        </form>
      </ModalForm>
    </>
  );
}
interface Enrollment {
  id: string;
  student: string;
  student_name: string;
  course: string;
  status: string;
  enrolled_at: string;
}

const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused_absence"];
const ATTENDANCE_COLORS: Record<string, string> = {
  present: "bg-green-500/10 text-green-400",
  absent: "bg-red-500/10 text-red-400",
  late: "bg-amber-500/10 text-amber-400",
  excused_absence: "bg-blue-500/10 text-blue-400",
};

function AttendanceTab() {
  return (
    <CourseGroupedList
      queryKey={["admin-attendance"]}
      endpoint="/attendance/"
      titleFallback="Attendance"
      emptyTitle="No attendance records yet"
      emptyMessage="Record attendance per student, course and date."
      searchPlaceholder="Search student..."
      coursesQueryKey={["admin-attendance-courses"]}
      coursesEndpoint="/courses/"
      renderRow={(a) => ({
        key: a.id,
        course: a.course,
        badge: { label: fmtLabel(a.status), className: ATTENDANCE_COLORS[a.status] || "bg-gray-500/10 text-gray-400" },
        title: a.student_name,
        subtitle: formatDate(a.date),
      })}
    />
  );
}
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

interface GroupRow {
  key: string;
  course: string;
  badge: { label: string; className: string };
  title: string;
  subtitle: string;
}

interface CourseGroupedListProps {
  queryKey: string[];
  endpoint: string;
  coursesQueryKey: string[];
  coursesEndpoint: string;
  titleFallback: string;
  emptyTitle: string;
  emptyMessage: string;
  searchPlaceholder: string;
  renderRow: (item: any) => GroupRow;
}

function CourseGroupedList(props: CourseGroupedListProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const recordsQuery = useQuery<any[]>({
    queryKey: props.queryKey,
    queryFn: async () => {
      const d = await api.get<any>(withFullLimit(props.endpoint));
      return unwrapResults<any>(d);
    },
    enabled: isAuthenticated,
  });

  const coursesQuery = useQuery<any[]>({
    queryKey: props.coursesQueryKey,
    queryFn: async () => {
      const d = await api.get<any>(withFullLimit(props.coursesEndpoint));
      return unwrapResults<any>(d);
    },
    enabled: isAuthenticated,
  });

  const courseMap = useMemo(() => {
    const m: Record<string, any> = {};
    (coursesQuery.data ?? []).forEach((c) => { m[c.id] = c; });
    return m;
  }, [coursesQuery.data]);

  const rows = useMemo(() => {
    if (!recordsQuery.data) return [];
    let r = recordsQuery.data.map(props.renderRow);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((row) => row.title.toLowerCase().includes(q));
    }
    return r;
  }, [recordsQuery.data, search, props.renderRow]);

  const groups = useMemo(() => {
    const byCourse: Record<string, GroupRow[]> = {};
    for (const row of rows) {
      (byCourse[row.course] = byCourse[row.course] || []).push(row);
    }
    return Object.entries(byCourse).map(([courseId, items]) => ({
      id: courseId,
      course: courseMap[courseId],
      items,
      title: courseMap[courseId]?.title || "Unassigned Course",
      subtitle: courseMap[courseId]
        ? `${courseMap[courseId]?.subject_code || ""} • ${formatDate(courseMap[courseId]?.scheduled_date)}`.trim()
        : "",
    }));
  }, [rows, courseMap]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const toggle = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-white">{props.titleFallback}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {total} record{total === 1 ? "" : "s"} across {groups.length} course{groups.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={props.searchPlaceholder}
            className="w-64 pl-9 pr-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm focus:border-gold-500 focus:outline-none"
          />
        </div>
      </div>

      {recordsQuery.error && <ErrorCard message="Failed to load" onRetry={recordsQuery.refetch} />}
      {recordsQuery.isLoading ? (
        <LoadingSkeleton type="table" rows={8} />
      ) : groups.length === 0 ? (
        <EmptyState
          title={search ? "No matches" : props.emptyTitle}
          message={search ? "No records match your search." : props.emptyMessage}
        />
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.id} className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
              <button
                onClick={() => toggle(g.id)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-navy-700/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ChevronDown
                    className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${collapsed[g.id] ? "-rotate-90" : ""}`}
                  />
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-semibold text-white truncate">{g.title}</p>
                    {g.subtitle && <p className="text-xs text-gray-500 truncate">{g.subtitle}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono text-gray-400">{g.items.length}</span>
                </div>
              </button>
              {!collapsed[g.id] && (
                <div className="border-t border-navy-700 divide-y divide-navy-700/60">
                  {g.items.map((row) => (
                    <div key={row.key} className="flex items-center justify-between gap-4 px-5 py-3">
                      <div className="min-w-0">
                        <p className="text-sm text-white">{row.title}</p>
                        <p className="text-xs text-gray-500">{row.subtitle}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${row.badge.className}`}>{row.badge.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
