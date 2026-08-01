"use client";
import { ClipboardCheck, Award, TrendingUp, Gauge, Target } from "lucide-react";
import { HubLayout, HubTab } from "@/components/hub-layout";
import { HubCrud } from "@/components/hub-crud";
import { fmtLabel, formatDate, toDatetimeLocal } from "@/lib/format-utils";

const TABS: HubTab[] = [
  { id: "ground", label: "Ground Evals", icon: ClipboardCheck },
  { id: "competencies", label: "Competencies", icon: Award },
  { id: "progress", label: "Progress Checks", icon: TrendingUp },
  { id: "skill", label: "Skill Tests", icon: Gauge },
  { id: "practical", label: "Practical Evals", icon: Target },
];

export default function EvaluationsHubPage() {
  return (
    <HubLayout title="Evaluations Hub" tabs={TABS} defaultTab="ground">
      {(active) => (
        <>
          {active === "ground" && <GroundTab />}
          {active === "competencies" && <CompetenciesTab />}
          {active === "progress" && <ProgressTab />}
          {active === "skill" && <SkillTab />}
          {active === "practical" && <PracticalTab />}
        </>
      )}
    </HubLayout>
  );
}

const studentName = (s: any) => s.full_name || `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.name || s.email;

const COMP_STATUSES = ["not_started", "in_progress", "acquired", "needs_reinforcement"];
const COMP_COLORS: Record<string, string> = {
  not_started: "bg-gray-500/10 text-gray-400",
  in_progress: "bg-blue-500/10 text-blue-400",
  acquired: "bg-green-500/10 text-green-400",
  needs_reinforcement: "bg-amber-500/10 text-amber-400",
};

const PC_STATUSES = ["scheduled", "in_progress", "completed", "cancelled"];
const PC_STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-400",
  in_progress: "bg-amber-500/10 text-amber-400",
  completed: "bg-green-500/10 text-green-400",
  cancelled: "bg-gray-500/10 text-gray-400",
};
const PC_RESULT_COLORS: Record<string, string> = {
  pass: "bg-green-500/10 text-green-400",
  fail: "bg-red-500/10 text-red-400",
  partial: "bg-amber-500/10 text-amber-400",
};

const ST_STATUSES = ["authorized", "in_progress", "completed", "failed", "cancelled"];
const ST_STATUS_COLORS: Record<string, string> = {
  authorized: "bg-blue-500/10 text-blue-400",
  in_progress: "bg-amber-500/10 text-amber-400",
  completed: "bg-green-500/10 text-green-400",
  failed: "bg-red-500/10 text-red-400",
  cancelled: "bg-gray-500/10 text-gray-400",
};

const PE_RESULT_COLORS: Record<string, string> = {
  pass: "bg-green-500/10 text-green-400",
  fail: "bg-red-500/10 text-red-400",
  partial: "bg-amber-500/10 text-amber-400",
};
const PE_DECISION_COLORS: Record<string, string> = {
  satisfactory: "bg-green-500/10 text-green-400",
  needs_improvement: "bg-amber-500/10 text-amber-400",
  unsatisfactory: "bg-red-500/10 text-red-400",
};

function GroundTab() {
  return (
    <HubCrud<GroundEval>
      queryKey={["admin-gevals"]}
      endpoint="/ground-evaluations/"
      titleFallback="Ground Evaluations"
      emptyTitle="No ground evaluations yet"
      emptyMessage="Grade students after a course."
      emptyActionLabel="+ New Evaluation"
      createTitle="New Evaluation"
      editTitle="Edit Evaluation"
      createLabel="+ New Evaluation"
      searchPlaceholder="Search student..."
      searchFields={["student_name"]}
      filterFields={[
        { key: "course", label: "All Courses", options: (lk) => (lk.courses || []).map((c: any) => ({ value: c.id, label: c.title })) },
        { key: "flagged", label: "Flagged", options: [{ value: "true", label: "Flagged" }, { value: "false", label: "Not Flagged" }] },
      ]}
      lookups={[
        { key: "students", queryKey: ["admin-geval-students"], endpoint: "/students/" },
        { key: "courses", queryKey: ["admin-geval-courses"], endpoint: "/courses/" },
      ]}
      initialCreate={{ course: "", student: "", grade: "", appreciation: "", module_validated: false, recommend_remedial: false, flagged: false }}
      buildForm={(g) => ({ course: g.course, student: g.student, grade: g.grade != null ? String(g.grade) : "", appreciation: g.appreciation || "", module_validated: g.module_validated, recommend_remedial: g.recommend_remedial, flagged: g.flagged })}
      buildPayload={(f) => ({
        course: f.course,
        student: f.student,
        grade: f.grade ? parseFloat(f.grade) : null,
        appreciation: f.appreciation || null,
        module_validated: f.module_validated,
        recommend_remedial: f.recommend_remedial,
        flagged: f.flagged,
      })}
      fields={(mode) => [
        { name: "course", label: "Course", type: "select", required: true, placeholder: "Select course", options: (lk) => (lk.courses || []).map((c: any) => ({ value: c.id, label: c.title })) },
        { name: "student", label: "Student", type: "select", required: true, placeholder: "Select student", options: (lk) => (lk.students || []).map((s: any) => ({ value: s.id, label: studentName(s) })) },
        { name: "grade", label: "Grade", type: "text", span: "half" },
        { name: "appreciation", label: "Appreciation", type: "textarea", rows: 2, span: "half" },
        { name: "module_validated", label: "Module Validated", type: "checkbox", span: "half" },
        { name: "recommend_remedial", label: "Recommend Remedial", type: "checkbox", span: "half" },
        { name: "flagged", label: "Flagged", type: "checkbox", span: "half" },
      ]}
      columns={[
        { key: "student_name", header: "Student", render: (g) => <span className="text-sm font-semibold text-white">{g.student_name}</span> },
        { key: "grade", header: "Grade", render: (g) => <span className="text-sm text-gray-300">{g.grade ?? "—"}</span> },
        { key: "module_validated", header: "Validated", render: (g) => <span className={`text-xs px-2 py-0.5 rounded ${g.module_validated ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"}`}>{g.module_validated ? "Yes" : "No"}</span> },
        { key: "flagged", header: "", render: (g) => g.flagged ? <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400">Flagged</span> : null },
      ]}
      detailTitle="Evaluation Details"
      detailFields={(g) => [
        { label: "Student", value: g.student_name },
        { label: "Grade", value: g.grade != null ? String(g.grade) : "—" },
        { label: "Appreciation", value: g.appreciation || "—" },
        { label: "Module Validated", value: g.module_validated ? "Yes" : "No" },
        { label: "Recommend Remedial", value: g.recommend_remedial ? "Yes" : "No" },
        { label: "Flagged", value: g.flagged ? "Yes" : "No" },
      ]}
    />
  );
}
interface GroundEval {
  id: string;
  course: string;
  student: string;
  student_name: string;
  grade: string | null;
  appreciation: string | null;
  module_validated: boolean;
  recommend_remedial: boolean;
  flagged: boolean;
}

function CompetenciesTab() {
  return (
    <HubCrud<Competency>
      queryKey={["admin-competencies"]}
      endpoint="/competencies/"
      titleFallback="Competencies"
      emptyTitle="No competencies yet"
      emptyMessage="Track each student's competency acquisition."
      emptyActionLabel="+ New Competency"
      createTitle="New Competency"
      editTitle="Edit Competency"
      createLabel="+ New Competency"
      searchPlaceholder="Search competency..."
      searchFields={["competency"]}
      filterFields={[
        { key: "status", label: "All Statuses", options: COMP_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })) },
        { key: "program", label: "All Programs", options: ["PPL", "CPL", "IR", "MEP", "MCC"].map((p) => ({ value: p, label: p })) },
      ]}
      lookup={{ key: "students", queryKey: ["admin-competencies-students"], endpoint: "/students/" }}
      initialCreate={{ student: "", program: "PPL", competency: "", status: "not_started", achieved_at: "", notes: "" }}
      buildForm={(c) => ({ student: c.student, program: c.program || "PPL", competency: c.competency, status: c.status || "not_started", achieved_at: c.achieved_at || "", notes: c.notes || "" })}
      buildPayload={(f) => ({ student: f.student, program: f.program, competency: f.competency, status: f.status, achieved_at: f.achieved_at || null, notes: f.notes || null })}
      fields={(mode) => [
        { name: "student", label: "Student", type: "select", required: true, placeholder: "Select student", options: (lk) => (lk.students || []).map((s: any) => ({ value: s.id, label: studentName(s) })) },
        { name: "program", label: "Program", type: "select", options: ["PPL", "CPL", "IR", "MEP", "MCC"].map((p) => ({ value: p, label: p })) },
        { name: "competency", label: "Competency", type: "text", required: true },
        { name: "status", label: "Status", type: "select", options: COMP_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })) },
        { name: "achieved_at", label: "Achieved At", type: "datetime" },
        { name: "notes", label: "Notes", type: "textarea", rows: 2 },
      ]}
      columns={[
        { key: "competency", header: "Competency", render: (c) => <span className="text-sm font-semibold text-white">{c.competency}</span> },
        { key: "program", header: "Program", render: (c) => <span className="text-xs px-2 py-0.5 rounded bg-navy-700 text-gray-300">{c.program || "—"}</span> },
        { key: "status", header: "Status", render: (c) => <span className={`text-xs px-2 py-0.5 rounded ${COMP_COLORS[c.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtLabel(c.status)}</span> },
        { key: "achieved_at", header: "Achieved", render: (c) => <span className="text-sm text-gray-400">{formatDate(c.achieved_at)}</span> },
      ]}
      detailTitle="Competency Details"
      detailFields={(c) => [
        { label: "Competency", value: c.competency },
        { label: "Program", value: c.program || "—" },
        { label: "Status", value: fmtLabel(c.status) },
        { label: "Achieved At", value: formatDate(c.achieved_at) },
        ...(c.notes ? [{ label: "Notes", value: c.notes }] : []),
      ]}
    />
  );
}
interface Competency {
  id: string;
  student: string;
  program: string;
  competency: string;
  status: string;
  achieved_at: string | null;
  notes: string | null;
}

const instructorName = (i: any) => i.name || i.email || `${i.first_name || ""} ${i.last_name || ""}`.trim();

function ProgressTab() {
  return (
    <HubCrud<ProgressCheck>
      queryKey={["admin-progress-checks"]}
      endpoint="/progress-checks/"
      titleFallback="Progress Checks"
      emptyTitle="No progress checks yet"
      emptyMessage="Schedule and record student progress checks."
      emptyActionLabel="+ New Progress Check"
      createTitle="New Progress Check"
      editTitle="Edit Progress Check"
      createLabel="+ New Progress Check"
      searchPlaceholder="Search student..."
      searchFields={["student_name"]}
      filterFields={[
        { key: "status", label: "All Statuses", options: PC_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })) },
        { key: "result", label: "All Results", options: ["pass", "fail", "partial"].map((r) => ({ value: r, label: fmtLabel(r) })) },
      ]}
      lookups={[
        { key: "students", queryKey: ["admin-pc-students"], endpoint: "/students/" },
        { key: "instructors", queryKey: ["admin-pc-instructors"], endpoint: "/flight-instructors/" },
      ]}
      initialCreate={{ student: "", examiner: "", scheduled_date: "", status: "scheduled", result: "", observations: "", recommendations: "" }}
      buildForm={(p) => ({ student: p.student, examiner: p.examiner, scheduled_date: toDatetimeLocal(p.scheduled_date), status: p.status || "scheduled", result: p.result || "", observations: p.observations || "", recommendations: p.recommendations || "" })}
      buildPayload={(f) => ({ student: f.student, examiner: f.examiner, scheduled_date: f.scheduled_date, status: f.status, result: f.result || null, observations: f.observations || null, recommendations: f.recommendations || null })}
      fields={(mode) => [
        { name: "student", label: "Student", type: "select", required: true, placeholder: "Select student", options: (lk) => (lk.students || []).map((s: any) => ({ value: s.id, label: studentName(s) })) },
        { name: "examiner", label: "Examiner", type: "select", required: true, placeholder: "Select examiner", options: (lk) => (lk.instructors || []).map((i: any) => ({ value: i.id, label: instructorName(i) })) },
        { name: "scheduled_date", label: "Scheduled Date", type: "datetime", required: true },
        { name: "status", label: "Status", type: "select", options: PC_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })) },
        { name: "result", label: "Result", type: "select", placeholder: "No result", options: ["pass", "fail", "partial"].map((r) => ({ value: r, label: fmtLabel(r) })) },
        { name: "observations", label: "Observations", type: "textarea", rows: 2 },
        { name: "recommendations", label: "Recommendations", type: "textarea", rows: 2 },
      ]}
      columns={[
        { key: "student_name", header: "Student", render: (p) => <span className="text-sm font-semibold text-white">{p.student_name}</span> },
        { key: "examiner_name", header: "Examiner", render: (p) => <span className="text-sm text-gray-300">{p.examiner_name}</span> },
        { key: "scheduled_date", header: "Scheduled", render: (p) => <span className="text-sm text-gray-400">{formatDate(p.scheduled_date)}</span> },
        { key: "status", header: "Status", render: (p) => <span className={`text-xs px-2 py-0.5 rounded ${PC_STATUS_COLORS[p.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtLabel(p.status)}</span> },
        { key: "result", header: "Result", render: (p) => p.result ? <span className={`text-xs px-2 py-0.5 rounded ${PC_RESULT_COLORS[p.result] || "bg-gray-500/10 text-gray-400"}`}>{fmtLabel(p.result)}</span> : <span className="text-sm text-gray-500">—</span> },
      ]}
      detailTitle="Progress Check Details"
      detailFields={(p) => [
        { label: "Student", value: p.student_name },
        { label: "Examiner", value: p.examiner_name },
        { label: "Scheduled", value: formatDate(p.scheduled_date) },
        { label: "Completed", value: formatDate(p.completed_date) },
        { label: "Status", value: fmtLabel(p.status) },
        { label: "Result", value: p.result ? fmtLabel(p.result) : "—" },
        ...(p.observations ? [{ label: "Observations", value: p.observations }] : []),
        ...(p.recommendations ? [{ label: "Recommendations", value: p.recommendations }] : []),
      ]}
    />
  );
}
interface ProgressCheck {
  id: string;
  student: string;
  student_name: string;
  examiner: string;
  examiner_name: string;
  scheduled_date: string;
  completed_date: string | null;
  result: string | null;
  observations: string | null;
  recommendations: string | null;
  status: string;
}

function SkillTab() {
  return (
    <HubCrud<SkillTest>
      queryKey={["admin-skill-tests"]}
      endpoint="/skill-tests/"
      titleFallback="Skill Tests"
      emptyTitle="No skill tests yet"
      emptyMessage="Schedule and record flight skill tests."
      emptyActionLabel="+ New Skill Test"
      createTitle="New Skill Test"
      editTitle="Edit Skill Test"
      createLabel="+ New Skill Test"
      searchPlaceholder="Search student..."
      searchFields={["student_name"]}
      filterFields={[
        { key: "status", label: "All Statuses", options: ST_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })) },
        { key: "result", label: "All Results", options: ["pass", "fail"].map((r) => ({ value: r, label: fmtLabel(r) })) },
      ]}
      lookups={[
        { key: "students", queryKey: ["admin-st-students"], endpoint: "/students/" },
        { key: "instructors", queryKey: ["admin-st-instructors"], endpoint: "/flight-instructors/" },
      ]}
      initialCreate={{ student: "", examiner: "", scheduled_date: "", status: "authorized", result: "", observations: "", recommendations: "" }}
      buildForm={(s) => ({ student: s.student, examiner: s.examiner, scheduled_date: toDatetimeLocal(s.scheduled_date), status: s.status || "authorized", result: s.result || "", observations: s.observations || "", recommendations: s.recommendations || "" })}
      buildPayload={(f) => ({ student: f.student, examiner: f.examiner, scheduled_date: f.scheduled_date, status: f.status, result: f.result || null, observations: f.observations || null, recommendations: f.recommendations || null })}
      fields={(mode) => [
        { name: "student", label: "Student", type: "select", required: true, placeholder: "Select student", options: (lk) => (lk.students || []).map((s: any) => ({ value: s.id, label: studentName(s) })) },
        { name: "examiner", label: "Examiner", type: "select", required: true, placeholder: "Select examiner", options: (lk) => (lk.instructors || []).map((i: any) => ({ value: i.id, label: instructorName(i) })) },
        { name: "scheduled_date", label: "Scheduled Date", type: "datetime", required: true },
        { name: "status", label: "Status", type: "select", options: ST_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })) },
        { name: "result", label: "Result", type: "select", placeholder: "No result", options: ["pass", "fail"].map((r) => ({ value: r, label: fmtLabel(r) })) },
        { name: "observations", label: "Observations", type: "textarea", rows: 2 },
        { name: "recommendations", label: "Recommendations", type: "textarea", rows: 2 },
      ]}
      columns={[
        { key: "student_name", header: "Student", render: (s) => <span className="text-sm font-semibold text-white">{s.student_name}</span> },
        { key: "examiner_name", header: "Examiner", render: (s) => <span className="text-sm text-gray-300">{s.examiner_name}</span> },
        { key: "scheduled_date", header: "Scheduled", render: (s) => <span className="text-sm text-gray-400">{formatDate(s.scheduled_date)}</span> },
        { key: "status", header: "Status", render: (s) => <span className={`text-xs px-2 py-0.5 rounded ${ST_STATUS_COLORS[s.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtLabel(s.status)}</span> },
        { key: "result", header: "Result", render: (s) => s.result ? <span className={`text-xs px-2 py-0.5 rounded ${PC_RESULT_COLORS[s.result] || "bg-gray-500/10 text-gray-400"}`}>{fmtLabel(s.result)}</span> : <span className="text-sm text-gray-500">—</span> },
      ]}
      detailTitle="Skill Test Details"
      detailFields={(s) => [
        { label: "Student", value: s.student_name },
        { label: "Examiner", value: s.examiner_name },
        { label: "Scheduled", value: formatDate(s.scheduled_date) },
        { label: "Completed", value: formatDate(s.completed_date) },
        { label: "Status", value: fmtLabel(s.status) },
        { label: "Result", value: s.result ? fmtLabel(s.result) : "—" },
        ...(s.observations ? [{ label: "Observations", value: s.observations }] : []),
        ...(s.recommendations ? [{ label: "Recommendations", value: s.recommendations }] : []),
      ]}
      detailExtra={(s) => s.report_url ? <p className="text-sm"><a href={s.report_url} target="_blank" rel="noreferrer" className="text-gold-500 hover:underline">View Report</a></p> : null}
    />
  );
}
interface SkillTest {
  id: string;
  student: string;
  student_name: string;
  examiner: string;
  examiner_name: string;
  scheduled_date: string;
  completed_date: string | null;
  result: string | null;
  report_url: string | null;
  observations: string | null;
  recommendations: string | null;
  status: string;
}

function PracticalTab() {
  return (
    <HubCrud<PracticalEval>
      queryKey={["admin-practical-evals"]}
      endpoint="/practical-evaluations/"
      titleFallback="Practical Evaluations"
      emptyTitle="No practical evaluations yet"
      emptyMessage="Record practical flight evaluations."
      emptyActionLabel="+ New Evaluation"
      createTitle="New Evaluation"
      editTitle="Edit Evaluation"
      createLabel="+ New Evaluation"
      searchPlaceholder="Search observations or strengths..."
      searchFields={["observations", "strengths"]}
      filterFields={[
        { key: "result", label: "All Results", options: ["pass", "fail", "partial"].map((r) => ({ value: r, label: fmtLabel(r) })) },
        { key: "decision", label: "All Decisions", options: ["satisfactory", "needs_improvement", "unsatisfactory"].map((d) => ({ value: d, label: fmtLabel(d) })) },
      ]}
      lookups={[
        { key: "students", queryKey: ["admin-pe-students"], endpoint: "/students/" },
        { key: "instructors", queryKey: ["admin-pe-instructors"], endpoint: "/flight-instructors/" },
      ]}
      initialCreate={{ student: "", instructor: "", date: "", result: "", grade: "", observations: "", strengths: "", improvements: "", recommendations: "", decision: "" }}
      buildForm={(p) => ({ student: p.student, instructor: p.instructor, date: toDatetimeLocal(p.date), result: p.result || "", grade: p.grade != null ? String(p.grade) : "", observations: p.observations || "", strengths: p.strengths || "", improvements: p.improvements || "", recommendations: p.recommendations || "", decision: p.decision || "" })}
      buildPayload={(f) => ({
        student: f.student,
        instructor: f.instructor,
        date: f.date,
        result: f.result || null,
        grade: f.grade ? parseFloat(f.grade) : null,
        observations: f.observations || null,
        strengths: f.strengths || null,
        improvements: f.improvements || null,
        recommendations: f.recommendations || null,
        decision: f.decision || null,
      })}
      fields={(mode) => [
        { name: "student", label: "Student", type: "select", required: true, placeholder: "Select student", options: (lk) => (lk.students || []).map((s: any) => ({ value: s.id, label: studentName(s) })) },
        { name: "instructor", label: "Instructor", type: "select", required: true, placeholder: "Select instructor", options: (lk) => (lk.instructors || []).map((i: any) => ({ value: i.id, label: instructorName(i) })) },
        { name: "date", label: "Date", type: "datetime", required: true },
        { name: "result", label: "Result", type: "select", placeholder: "No result", options: ["pass", "fail", "partial"].map((r) => ({ value: r, label: fmtLabel(r) })) },
        { name: "grade", label: "Grade", type: "text", span: "half" },
        { name: "decision", label: "Decision", type: "select", placeholder: "No decision", options: ["satisfactory", "needs_improvement", "unsatisfactory"].map((d) => ({ value: d, label: fmtLabel(d) })) },
        { name: "observations", label: "Observations", type: "textarea", rows: 2 },
        { name: "strengths", label: "Strengths", type: "textarea", rows: 2 },
        { name: "improvements", label: "Improvements", type: "textarea", rows: 2 },
        { name: "recommendations", label: "Recommendations", type: "textarea", rows: 2 },
      ]}
      columns={[
        { key: "date", header: "Date", render: (p) => <span className="text-sm text-gray-400">{formatDate(p.date)}</span> },
        { key: "result", header: "Result", render: (p) => p.result ? <span className={`text-xs px-2 py-0.5 rounded ${PE_RESULT_COLORS[p.result] || "bg-gray-500/10 text-gray-400"}`}>{fmtLabel(p.result)}</span> : <span className="text-sm text-gray-500">—</span> },
        { key: "grade", header: "Grade", render: (p) => <span className="text-sm text-gray-300">{p.grade ?? "—"}</span> },
        { key: "decision", header: "Decision", render: (p) => p.decision ? <span className={`text-xs px-2 py-0.5 rounded ${PE_DECISION_COLORS[p.decision] || "bg-gray-500/10 text-gray-400"}`}>{fmtLabel(p.decision)}</span> : <span className="text-sm text-gray-500">—</span> },
      ]}
      detailTitle="Evaluation Details"
      detailFields={(p) => [
        { label: "Date", value: formatDate(p.date) },
        { label: "Result", value: p.result ? fmtLabel(p.result) : "—" },
        { label: "Grade", value: p.grade != null ? String(p.grade) : "—" },
        { label: "Decision", value: p.decision ? fmtLabel(p.decision) : "—" },
        ...(p.observations ? [{ label: "Observations", value: p.observations }] : []),
        ...(p.strengths ? [{ label: "Strengths", value: p.strengths }] : []),
        ...(p.improvements ? [{ label: "Improvements", value: p.improvements }] : []),
        ...(p.recommendations ? [{ label: "Recommendations", value: p.recommendations }] : []),
      ]}
    />
  );
}
interface PracticalEval {
  id: string;
  student: string;
  instructor: string;
  date: string;
  result: string | null;
  grade: string | null;
  observations: string | null;
  strengths: string | null;
  improvements: string | null;
  recommendations: string | null;
  decision: string | null;
}
