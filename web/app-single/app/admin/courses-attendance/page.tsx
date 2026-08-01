"use client";
import { Calendar, GraduationCap, ClipboardCheck, Users } from "lucide-react";
import { HubLayout, HubTab } from "@/components/hub-layout";
import { HubCrud } from "@/components/hub-crud";
import { formatDate, formatTime, fmtLabel, todayLocal } from "@/lib/format-utils";

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
  return (
    <HubCrud<Enrollment>
      queryKey={["admin-enrollments"]}
      endpoint="/course-enrollments/"
      titleFallback="Enrollments"
      emptyTitle="No enrollments yet"
      emptyMessage="Enroll students into courses."
      emptyActionLabel="+ Enroll Student"
      createTitle="New Enrollment"
      editTitle="Edit Enrollment"
      createLabel="+ Enroll Student"
      searchPlaceholder="Search student..."
      searchFields={["student_name"]}
      filterFields={[
        { key: "status", label: "All Statuses", options: ENROLLMENT_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })) },
        { key: "course", label: "All Courses", options: (lk) => (lk.courses || []).map((c: any) => ({ value: c.id, label: c.title })) },
      ]}
      lookups={[
        { key: "students", queryKey: ["admin-enrollments-students"], endpoint: "/students/" },
        { key: "courses", queryKey: ["admin-enrollments-courses"], endpoint: "/courses/" },
      ]}
      initialCreate={{ student: "", course: "", status: "active" }}
      buildForm={(e) => ({ student: e.student, course: e.course, status: e.status })}
      buildPayload={(f) => ({ student: f.student, course: f.course, status: f.status })}
      fields={(mode) => [
        { name: "student", label: "Student", type: "select", required: true, placeholder: "Select student", options: (lk) => (lk.students || []).map((s: any) => ({ value: s.id, label: s.full_name || `${s.first_name} ${s.last_name}` })) },
        { name: "course", label: "Course", type: "select", required: true, placeholder: "Select course", options: (lk) => (lk.courses || []).map((c: any) => ({ value: c.id, label: c.title })) },
        { name: "status", label: "Status", type: "select", options: ENROLLMENT_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })) },
      ]}
      columns={[
        { key: "student_name", header: "Student", render: (e) => <span className="text-sm font-semibold text-white">{e.student_name}</span> },
        { key: "status", header: "Status", render: (e) => <span className={`text-xs px-2 py-0.5 rounded ${ENROLLMENT_COLORS[e.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtLabel(e.status)}</span> },
        { key: "enrolled_at", header: "Enrolled", render: (e) => <span className="text-sm text-gray-400">{formatDate(e.enrolled_at)}</span> },
      ]}
      detailTitle="Enrollment Details"
      detailFields={(e) => [
        { label: "Student", value: e.student_name },
        { label: "Status", value: fmtLabel(e.status) },
        { label: "Enrolled", value: formatDate(e.enrolled_at) },
      ]}
    />
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
    <HubCrud<Attendance>
      queryKey={["admin-attendance"]}
      endpoint="/attendance/"
      titleFallback="Attendance"
      emptyTitle="No attendance records yet"
      emptyMessage="Record attendance per student, course and date."
      emptyActionLabel="+ Record Attendance"
      createTitle="Record Attendance"
      editTitle="Edit Attendance"
      createLabel="+ Record Attendance"
      searchPlaceholder="Search student..."
      searchFields={["student_name"]}
      filterFields={[
        { key: "status", label: "All Statuses", options: ATTENDANCE_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })) },
        { key: "course", label: "All Courses", options: (lk) => (lk.courses || []).map((c: any) => ({ value: c.id, label: c.title })) },
      ]}
      lookups={[
        { key: "students", queryKey: ["admin-attendance-students"], endpoint: "/students/" },
        { key: "courses", queryKey: ["admin-attendance-courses"], endpoint: "/courses/" },
      ]}
      initialCreate={{ student: "", course: "", date: "", status: "present", notes: "" }}
      buildForm={(a) => ({ student: a.student, course: a.course, date: a.date, status: a.status, notes: a.notes || "" })}
      buildPayload={(f) => ({ student: f.student, course: f.course, date: f.date, status: f.status, notes: f.notes || null })}
      fields={(mode) => [
        { name: "student", label: "Student", type: "select", required: true, placeholder: "Select student", options: (lk) => (lk.students || []).map((s: any) => ({ value: s.id, label: s.full_name || `${s.first_name} ${s.last_name}` })) },
        { name: "course", label: "Course", type: "select", required: true, placeholder: "Select course", options: (lk) => (lk.courses || []).map((c: any) => ({ value: c.id, label: c.title })) },
        { name: "date", label: "Date", type: "date", required: true },
        { name: "status", label: "Status", type: "select", options: ATTENDANCE_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })) },
        { name: "notes", label: "Notes", type: "text" },
      ]}
      columns={[
        { key: "student_name", header: "Student", render: (a) => <span className="text-sm font-semibold text-white">{a.student_name}</span> },
        { key: "date", header: "Date", render: (a) => <span className="text-sm text-gray-400">{formatDate(a.date)}</span> },
        { key: "status", header: "Status", render: (a) => <span className={`text-xs px-2 py-0.5 rounded ${ATTENDANCE_COLORS[a.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtLabel(a.status)}</span> },
      ]}
      detailTitle="Attendance Details"
      detailFields={(a) => [
        { label: "Student", value: a.student_name },
        { label: "Date", value: formatDate(a.date) },
        { label: "Status", value: fmtLabel(a.status) },
        ...(a.notes ? [{ label: "Notes", value: a.notes }] : []),
        { label: "Recorded At", value: formatDate(a.recorded_at) },
      ]}
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
