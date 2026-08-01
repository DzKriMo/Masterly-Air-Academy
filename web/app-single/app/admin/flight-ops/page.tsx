"use client";
import { Map, BookOpen, Plane, ClipboardCheck } from "lucide-react";
import { HubLayout, HubTab } from "@/components/hub-layout";
import { HubCrud } from "@/components/hub-crud";
import { fmtLabel, formatDate, formatTime, todayLocal, STATUS_COLORS } from "@/lib/format-utils";

const TABS: HubTab[] = [
  { id: "programs", label: "Programs", icon: Map },
  { id: "templates", label: "Lesson Templates", icon: BookOpen },
  { id: "lessons", label: "Flight Lessons", icon: Plane },
  { id: "preps", label: "Preparations", icon: ClipboardCheck },
];

export default function FlightOpsHubPage() {
  return (
    <HubLayout title="Flight Operations" tabs={TABS} defaultTab="programs">
      {(active) => (
        <>
          {active === "programs" && <ProgramsTab />}
          {active === "templates" && <TemplatesTab />}
          {active === "lessons" && <LessonsTab />}
          {active === "preps" && <PrepsTab />}
        </>
      )}
    </HubLayout>
  );
}

const PROGRAM_COLORS: Record<string, string> = {
  PPL: "bg-blue-500/10 text-blue-400",
  CPL: "bg-green-500/10 text-green-400",
  IR: "bg-purple-500/10 text-purple-400",
  MEP: "bg-amber-500/10 text-amber-400",
  MCC: "bg-cyan-500/10 text-cyan-400",
};

function ProgramsTab() {
  return (
    <HubCrud<FlightProgram>
      queryKey={["admin-flight-programs"]}
      endpoint="/flight-programs/"
      titleFallback="Flight Programs"
      emptyTitle="No flight programs yet"
      emptyMessage="Define flight training programs."
      emptyActionLabel="+ New Program"
      createTitle="New Program"
      editTitle="Edit Program"
      createLabel="+ New Program"
      searchPlaceholder="Search code or title..."
      searchFields={["code", "title"]}
      filterFields={[
        { key: "program", label: "All Programs", options: ["PPL", "CPL", "IR", "MEP", "MCC"].map((p) => ({ value: p, label: p })) },
        { key: "status", label: "All Statuses", options: ["active", "inactive"].map((s) => ({ value: s, label: fmtLabel(s) })) },
      ]}
      initialCreate={{ code: "", title: "", description: "", program: "PPL", status: "active" }}
      buildForm={(p) => ({ code: p.code, title: p.title, description: p.description || "", program: p.program, status: p.status })}
      buildPayload={(f) => ({ code: f.code, title: f.title, description: f.description || null, program: f.program, status: f.status })}
      fields={(mode) => [
        { name: "code", label: "Code", type: "text", required: true, mono: true, placeholder: "e.g. PPL-FLIGHT", span: "half" },
        { name: "program", label: "Program", type: "select", required: true, options: ["PPL", "CPL", "IR", "MEP", "MCC"].map((p) => ({ value: p, label: p })), span: "half" },
        { name: "title", label: "Title", type: "text", required: true },
        { name: "description", label: "Description", type: "textarea", rows: 3 },
        { name: "status", label: "Status", type: "select", options: ["active", "inactive"].map((s) => ({ value: s, label: fmtLabel(s) })) },
      ]}
      columns={[
        { key: "code", header: "Code", render: (p) => <span className="text-sm font-mono font-semibold text-gold-500">{p.code}</span> },
        { key: "title", header: "Title", render: (p) => <span className="text-sm font-semibold text-white">{p.title.length > 40 ? p.title.slice(0, 40) + "…" : p.title}</span> },
        { key: "program", header: "Program", render: (p) => <span className={`text-xs px-2 py-0.5 rounded ${PROGRAM_COLORS[p.program] || "bg-gray-500/10 text-gray-400"}`}>{p.program}</span> },
        { key: "status", header: "Status", render: (p) => <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[p.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtLabel(p.status)}</span> },
      ]}
      detailTitle="Program Details"
      detailFields={(p) => [
        { label: "Code", value: p.code },
        { label: "Title", value: p.title },
        { label: "Program", value: p.program },
        { label: "Status", value: fmtLabel(p.status) },
        ...(p.description ? [{ label: "Description", value: p.description }] : []),
      ]}
    />
  );
}
interface FlightProgram {
  id: string;
  code: string;
  title: string;
  description: string | null;
  program: string;
  status: string;
}

function TemplatesTab() {
  return (
    <HubCrud<Template>
      queryKey={["admin-flight-lesson-templates"]}
      endpoint="/flight-lesson-templates/"
      titleFallback="Flight Lesson Templates"
      emptyTitle="No lesson templates yet"
      emptyMessage="Standardise flight lessons."
      emptyActionLabel="+ New Template"
      createTitle="New Template"
      editTitle="Edit Template"
      createLabel="+ New Template"
      searchPlaceholder="Search title..."
      searchFields={["title"]}
      filterFields={[{ key: "program", label: "All Programs", options: (lk) => (lk.programs || []).map((p: any) => ({ value: p.id, label: p.title })) }]}
      lookup={{ key: "programs", queryKey: ["admin-flt-programs"], endpoint: "/flight-programs/" }}
      initialCreate={{ program: "", lesson_number: "", title: "", title_ar: "", title_fr: "", objective: "", planned_duration: "", briefing_time: "", flight_time: "", debriefing_time: "", success_criteria: "", competencies: "" }}
      buildForm={(t) => ({ program: t.program || "", lesson_number: t.lesson_number != null ? String(t.lesson_number) : "", title: t.title, title_ar: t.title_ar || "", title_fr: t.title_fr || "", objective: t.objective || "", planned_duration: t.planned_duration != null ? String(t.planned_duration) : "", briefing_time: t.briefing_time != null ? String(t.briefing_time) : "", flight_time: t.flight_time != null ? String(t.flight_time) : "", debriefing_time: t.debriefing_time != null ? String(t.debriefing_time) : "", success_criteria: t.success_criteria || "", competencies: Array.isArray(t.competencies) ? t.competencies.join("\n") : "" })}
      buildPayload={(f) => ({
        program: f.program,
        lesson_number: f.lesson_number ? parseInt(f.lesson_number, 10) : 0,
        title: f.title,
        title_ar: f.title_ar || null,
        title_fr: f.title_fr || null,
        objective: f.objective || null,
        planned_duration: f.planned_duration ? parseFloat(f.planned_duration) : null,
        briefing_time: f.briefing_time ? parseFloat(f.briefing_time) : null,
        flight_time: f.flight_time ? parseFloat(f.flight_time) : null,
        debriefing_time: f.debriefing_time ? parseFloat(f.debriefing_time) : null,
        success_criteria: f.success_criteria || null,
        competencies: f.competencies ? f.competencies.split("\n").map((s: string) => s.trim()).filter(Boolean) : [],
      })}
      fields={(mode) => [
        { name: "program", label: "Flight Program", type: "select", required: true, placeholder: "Select program", options: (lk) => (lk.programs || []).map((p: any) => ({ value: p.id, label: p.title })) },
        { name: "lesson_number", label: "Lesson #", type: "text", required: true, span: "half" },
        { name: "title", label: "Title", type: "text", required: true, span: "half" },
        { name: "title_fr", label: "Title (FR)", type: "text", span: "half" },
        { name: "title_ar", label: "Title (AR)", type: "text", span: "half" },
        { name: "objective", label: "Objective", type: "textarea", rows: 2 },
        { name: "planned_duration", label: "Planned Duration (h)", type: "text", span: "half" },
        { name: "briefing_time", label: "Briefing (h)", type: "text", span: "half" },
        { name: "flight_time", label: "Flight (h)", type: "text", span: "half" },
        { name: "debriefing_time", label: "Debriefing (h)", type: "text", span: "half" },
        { name: "success_criteria", label: "Success Criteria", type: "textarea", rows: 2 },
        { name: "competencies", label: "Competencies (one per line)", type: "textarea", rows: 3 },
      ]}
      columns={[
        { key: "lesson_number", header: "Lesson", render: (t) => <span className="text-sm font-semibold text-gold-500">{t.lesson_number}</span> },
        { key: "title", header: "Title", render: (t) => <span className="text-sm text-white">{t.title}</span> },
        { key: "program_title", header: "Program", render: (t) => <span className="text-sm text-gray-300">{t.program_title}</span> },
        { key: "flight_time", header: "Flight (h)", render: (t) => <span className="text-sm text-gray-400 font-mono">{t.flight_time != null ? t.flight_time : "—"}</span> },
        { key: "competencies", header: "Competencies", render: (t) => <span className="text-sm text-gray-400 font-mono">{Array.isArray(t.competencies) ? t.competencies.length : 0}</span> },
      ]}
      detailTitle="Template Details"
      detailFields={(t) => [
        { label: "Lesson #", value: String(t.lesson_number) },
        { label: "Title", value: t.title },
        { label: "Program", value: t.program_title },
        ...(t.objective ? [{ label: "Objective", value: t.objective }] : []),
        { label: "Planned Duration", value: t.planned_duration != null ? `${t.planned_duration}h` : "—" },
        { label: "Briefing / Flight / Debrief", value: `${t.briefing_time ?? "—"} / ${t.flight_time ?? "—"} / ${t.debriefing_time ?? "—"} h` },
        ...(t.success_criteria ? [{ label: "Success Criteria", value: t.success_criteria }] : []),
        ...(Array.isArray(t.competencies) && t.competencies.length ? [{ label: "Competencies", value: t.competencies.join(" • ") }] : []),
      ]}
    />
  );
}
interface Template {
  id: string;
  program: string;
  program_title: string;
  lesson_number: number;
  title: string;
  title_ar: string | null;
  title_fr: string | null;
  objective: string | null;
  competencies: string[];
  planned_duration: number | null;
  briefing_time: number | null;
  flight_time: number | null;
  debriefing_time: number | null;
  success_criteria: string | null;
}

const LESSON_STATUSES = ["scheduled", "in_progress", "completed", "cancelled", "postponed"];
const LESSON_COLORS: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-400",
  in_progress: "bg-amber-500/10 text-amber-400",
  completed: "bg-green-500/10 text-green-400",
  cancelled: "bg-gray-500/10 text-gray-400",
  postponed: "bg-purple-500/10 text-purple-400",
};

function LessonsTab() {
  return (
    <HubCrud<FlightLesson>
      queryKey={["admin-fl"]}
      endpoint="/flight-lessons/"
      titleFallback="Flight Lessons"
      emptyTitle="No flight lessons yet"
      emptyMessage="Schedule flight lessons."
      emptyActionLabel="+ New Lesson"
      createTitle="New Lesson"
      editTitle="Edit Lesson"
      createLabel="+ New Lesson"
      searchPlaceholder="Search student or aircraft..."
      searchFields={["student_name", "aircraft_reg"]}
      filterFields={[{ key: "status", label: "All Statuses", options: LESSON_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })) }]}
      lookups={[
        { key: "students", queryKey: ["admin-fl-students"], endpoint: "/students/" },
        { key: "instructors", queryKey: ["admin-fl-instructors"], endpoint: "/flight-instructors/" },
        { key: "aircraft", queryKey: ["admin-fl-aircraft"], endpoint: "/aircraft/" },
        { key: "templates", queryKey: ["admin-fl-templates"], endpoint: "/flight-lesson-templates/" },
      ]}
      initialCreate={{ student: "", aircraft: "", instructor: "", lesson_template: "", scheduled_date: "", start_time: "", end_time: "", status: "scheduled" }}
      buildForm={(l) => ({ student: l.student, aircraft: l.aircraft, instructor: l.instructor || "", lesson_template: l.lesson_template || "", scheduled_date: l.scheduled_date || todayLocal(), start_time: l.start_time || "", end_time: l.end_time || "", status: l.status })}
      buildPayload={(f) => ({
        student: f.student,
        instructor: f.instructor || null,
        aircraft: f.aircraft,
        lesson_template: f.lesson_template || null,
        scheduled_date: f.scheduled_date,
        start_time: f.start_time,
        end_time: f.end_time,
        status: f.status,
      })}
      fields={(mode) => [
        { name: "student", label: "Student", type: "select", required: true, placeholder: "Select student", options: (lk) => (lk.students || []).map((s: any) => ({ value: s.id, label: s.full_name || `${s.first_name} ${s.last_name}` })) },
        { name: "aircraft", label: "Aircraft", type: "select", required: true, placeholder: "Select aircraft", options: (lk) => (lk.aircraft || []).map((a: any) => ({ value: a.id, label: a.registration || a.type })) },
        { name: "instructor", label: "Instructor", type: "select", placeholder: "Auto-assign", options: (lk) => (lk.instructors || []).map((i: any) => ({ value: i.id, label: i.name || i.email })) },
        { name: "lesson_template", label: "Lesson Template", type: "select", placeholder: "None", options: (lk) => (lk.templates || []).map((t: any) => ({ value: t.id, label: t.name || t.code })) },
        { name: "scheduled_date", label: "Date", type: "date", required: true },
        { name: "start_time", label: "Start Time", type: "datetime", required: true, span: "half" },
        { name: "end_time", label: "End Time", type: "datetime", required: true, span: "half" },
        { name: "status", label: "Status", type: "select", options: LESSON_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })) },
      ]}
      columns={[
        { key: "student_name", header: "Student", render: (l) => <span className="text-sm font-semibold text-white">{l.student_name}</span> },
        { key: "aircraft_reg", header: "Aircraft", render: (l) => <span className="text-sm text-gray-300">{l.aircraft_reg}</span> },
        { key: "scheduled_date", header: "Date", render: (l) => <span className="text-sm text-gray-400">{formatDate(l.scheduled_date)}</span> },
        { key: "start_time", header: "Time", render: (l) => <span className="text-sm text-gray-400">{formatTime(l.start_time)}</span> },
        { key: "status", header: "Status", render: (l) => <span className={`text-xs px-2 py-0.5 rounded ${LESSON_COLORS[l.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtLabel(l.status)}</span> },
      ]}
      detailTitle="Flight Lesson Details"
      detailFields={(l) => [
        { label: "Student", value: l.student_name },
        { label: "Instructor", value: l.instructor_name || "—" },
        { label: "Aircraft", value: l.aircraft_reg },
        { label: "Date", value: formatDate(l.scheduled_date) },
        { label: "Time", value: `${formatTime(l.start_time)} – ${formatTime(l.end_time)}` },
        { label: "Status", value: fmtLabel(l.status) },
        ...(l.flight_duration ? [{ label: "Flight Duration", value: l.flight_duration }] : []),
        ...(l.grade ? [{ label: "Grade", value: l.grade }] : []),
        ...(l.result ? [{ label: "Result", value: fmtLabel(l.result) }] : []),
        ...(l.observations ? [{ label: "Observations", value: l.observations }] : []),
      ]}
    />
  );
}
interface FlightLesson {
  id: string;
  student: string;
  student_name: string;
  instructor: string | null;
  instructor_name: string | null;
  aircraft: string;
  aircraft_reg: string;
  lesson_template: string | null;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: string;
  flight_duration: string | null;
  grade: string | null;
  result: string | null;
  observations: string | null;
}

function PrepsTab() {
  return (
    <HubCrud<Prep>
      queryKey={["admin-fp"]}
      endpoint="/flight-preparations/"
      titleFallback="Flight Preparations"
      emptyTitle="No preparations yet"
      emptyMessage="Pre-flight checklists."
      emptyActionLabel="+ New Preparation"
      createTitle="New Preparation"
      editTitle="Edit Preparation"
      createLabel="+ New Preparation"
      searchPlaceholder="Search objectives..."
      searchFields={["lesson_objectives"]}
      lookup={{ key: "lessons", queryKey: ["admin-fp-lessons"], endpoint: "/flight-lessons/" }}
      initialCreate={{ flight_lesson: "", weather_check: false, notam_check: false, performance_check: false, document_check: false, medical_check: false, lesson_objectives: "", briefing_notes: "" }}
      buildForm={(p) => ({ flight_lesson: p.flight_lesson, weather_check: p.weather_check, notam_check: p.notam_check, performance_check: p.performance_check, document_check: p.document_check, medical_check: p.medical_check, lesson_objectives: p.lesson_objectives || "", briefing_notes: p.briefing_notes || "" })}
      buildPayload={(f) => ({
        flight_lesson: f.flight_lesson,
        weather_check: f.weather_check,
        notam_check: f.notam_check,
        performance_check: f.performance_check,
        document_check: f.document_check,
        medical_check: f.medical_check,
        lesson_objectives: f.lesson_objectives || null,
        briefing_notes: f.briefing_notes || null,
      })}
      fields={(mode) => [
        { name: "flight_lesson", label: "Flight Lesson", type: "select", required: true, placeholder: "Select lesson", options: (lk) => (lk.lessons || []).map((l: any) => ({ value: l.id, label: l.student_name || l.id?.slice(0, 8) })) },
        { name: "weather_check", label: "Weather Check", type: "checkbox", span: "half" },
        { name: "notam_check", label: "NOTAM Check", type: "checkbox", span: "half" },
        { name: "performance_check", label: "Performance Check", type: "checkbox", span: "half" },
        { name: "document_check", label: "Document Check", type: "checkbox", span: "half" },
        { name: "medical_check", label: "Medical Check", type: "checkbox", span: "half" },
        { name: "lesson_objectives", label: "Lesson Objectives", type: "textarea", rows: 2 },
        { name: "briefing_notes", label: "Briefing Notes", type: "textarea", rows: 2 },
      ]}
      columns={[
        { key: "weather_check", header: "Weather", render: (p) => <CheckBadge ok={p.weather_check} /> },
        { key: "notam_check", header: "NOTAM", render: (p) => <CheckBadge ok={p.notam_check} /> },
        { key: "performance_check", header: "Perf.", render: (p) => <CheckBadge ok={p.performance_check} /> },
        { key: "document_check", header: "Docs", render: (p) => <CheckBadge ok={p.document_check} /> },
        { key: "medical_check", header: "Medical", render: (p) => <CheckBadge ok={p.medical_check} /> },
        { key: "prepared_at", header: "Prepared", render: (p) => <span className="text-sm text-gray-400">{formatDate(p.prepared_at)}</span> },
      ]}
      detailTitle="Preparation Details"
      detailFields={(p) => [
        { label: "Weather Check", value: p.weather_check ? "Yes" : "No" },
        { label: "NOTAM Check", value: p.notam_check ? "Yes" : "No" },
        { label: "Performance Check", value: p.performance_check ? "Yes" : "No" },
        { label: "Document Check", value: p.document_check ? "Yes" : "No" },
        { label: "Medical Check", value: p.medical_check ? "Yes" : "No" },
        ...(p.lesson_objectives ? [{ label: "Lesson Objectives", value: p.lesson_objectives }] : []),
        ...(p.briefing_notes ? [{ label: "Briefing Notes", value: p.briefing_notes }] : []),
      ]}
    />
  );
}
function CheckBadge({ ok }: { ok: boolean }) {
  return <span className={`text-xs px-2 py-0.5 rounded ${ok ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-500"}`}>{ok ? "✓" : "—"}</span>;
}
interface Prep {
  id: string;
  flight_lesson: string;
  weather_check: boolean;
  notam_check: boolean;
  performance_check: boolean;
  document_check: boolean;
  medical_check: boolean;
  lesson_objectives: string | null;
  briefing_notes: string | null;
  prepared_at: string;
}
