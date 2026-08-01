"use client";
import { useState } from "react";
import { HelpCircle, ClipboardList, ScrollText, BarChart3 } from "lucide-react";
import { HubLayout, HubTab } from "@/components/hub-layout";
import { HubCrud } from "@/components/hub-crud";
import { api } from "@/lib/api";
import { fmtLabel, formatDate, PROGRAMS, EXAM_TYPES, EXAM_STATUSES, TYPE_COLORS, STATUS_COLORS } from "@/lib/format-utils";
import { QUESTION_TYPES, DIFFICULTIES } from "@/components/question-form-fields";

const TABS: HubTab[] = [
  { id: "bank", label: "Question Bank", icon: HelpCircle },
  { id: "quizzes", label: "Quizzes", icon: ClipboardList },
  { id: "exams", label: "Exams", icon: ScrollText },
  { id: "attempts", label: "Attempts", icon: BarChart3 },
];

export default function AssessmentsHubPage() {
  return (
    <HubLayout title="Assessments Hub" tabs={TABS} defaultTab="bank">
      {(active) => (
        <>
          {active === "bank" && <QuestionBankTab />}
          {active === "quizzes" && <QuizzesTab />}
          {active === "exams" && <ExamsTab />}
          {active === "attempts" && <AttemptsTab />}
        </>
      )}
    </HubLayout>
  );
}

const TYPE_COLOR_BADGES: Record<string, string> = {
  mcq: "bg-blue-500/10 text-blue-400",
  true_false: "bg-green-500/10 text-green-400",
  short_answer: "bg-purple-500/10 text-purple-400",
  essay: "bg-amber-500/10 text-amber-400",
  matching: "bg-cyan-500/10 text-cyan-400",
  ordering: "bg-pink-500/10 text-pink-400",
  case_study: "bg-red-500/10 text-red-400",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-500/10 text-green-400",
  medium: "bg-amber-500/10 text-amber-400",
  hard: "bg-red-500/10 text-red-400",
};

function QuestionBankTab() {
  return (
    <HubCrud<Question>
      queryKey={["admin-question-bank"]}
      endpoint="/question-bank/"
      titleFallback="Question Bank"
      emptyTitle="No questions yet"
      emptyMessage="Build your question bank. Questions can be reused across quizzes and exams."
      emptyActionLabel="+ New Question"
      createTitle="New Question"
      editTitle="Edit Question"
      createLabel="+ New Question"
      searchPlaceholder="Search question or answer..."
      searchFields={["question_text", "correct_answer"]}
      filterFields={[
        { key: "question_type", label: "All Types", options: QUESTION_TYPES.map((t) => ({ value: t, label: fmtLabel(t) })) },
        { key: "difficulty", label: "All Difficulties", options: DIFFICULTIES.map((d) => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1) })) },
        { key: "program", label: "All Programs", options: PROGRAMS.map((p) => ({ value: p, label: p })) },
        { key: "subject", label: "All Subjects", options: (lk) => (lk.subjects || []).map((s: any) => ({ value: s.id, label: s.title_en || s.code })) },
      ]}
      lookups={[
        { key: "subjects", queryKey: ["admin-qb-subjects"], endpoint: "/subjects/" },
        { key: "modules", queryKey: ["admin-qb-modules"], endpoint: "/modules/" },
      ]}
      initialCreate={{ subject: "", module: "", question_text: "", question_type: "mcq", options_text: "", correct_answer: "", explanation: "", reference: "", difficulty: "easy", program: "PPL" }}
      buildForm={(q) => ({
        subject: q.subject || "",
        module: q.module || "",
        question_text: q.question_text,
        question_type: q.question_type,
        options_text: Array.isArray(q.options) ? q.options.join("\n") : "",
        correct_answer: q.correct_answer,
        explanation: q.explanation || "",
        reference: q.reference || "",
        difficulty: q.difficulty,
        program: q.program || "PPL",
      })}
      buildPayload={(f) => ({
        subject: f.subject || null,
        module: f.module || null,
        question_text: f.question_text,
        question_type: f.question_type,
        options: f.question_type === "mcq" || f.question_type === "true_false"
          ? f.options_text.split("\n").map((s: string) => s.trim()).filter(Boolean)
          : [],
        correct_answer: f.correct_answer,
        explanation: f.explanation || null,
        reference: f.reference || null,
        difficulty: f.difficulty,
        program: f.program || null,
      })}
      fields={(mode) => [
        { name: "question_text", label: "Question Text", type: "textarea", required: true, rows: 3 },
        { name: "question_type", label: "Type", type: "select", required: true, options: QUESTION_TYPES.map((t) => ({ value: t, label: fmtLabel(t) })) },
        { name: "difficulty", label: "Difficulty", type: "select", options: DIFFICULTIES.map((d) => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1) })) },
        { name: "program", label: "Program", type: "select", options: [{ value: "", label: "All Programs" }, ...PROGRAMS.map((p) => ({ value: p, label: p }))] },
        { name: "subject", label: "Subject", type: "select", placeholder: "No subject", options: (lk) => (lk.subjects || []).map((s: any) => ({ value: s.id, label: s.title_en || s.code })) },
        { name: "module", label: "Module", type: "select", placeholder: "No module", options: (lk) => (lk.modules || []).map((m: any) => ({ value: m.id, label: m.title })) },
        { name: "options_text", label: "Options (one per line)", type: "textarea", rows: 4 },
        { name: "correct_answer", label: "Correct Answer", type: "text", required: true },
        { name: "explanation", label: "Explanation", type: "textarea", rows: 2 },
        { name: "reference", label: "Reference", type: "text", placeholder: "e.g. PPL Navigation Manual Ch. 3" },
      ]}
      columns={[
        { key: "question_text", header: "Question", render: (q) => <span className="text-sm font-semibold text-white">{q.question_text.length > 80 ? q.question_text.slice(0, 80) + "…" : q.question_text}</span> },
        { key: "question_type", header: "Type", render: (q) => <span className={`text-xs px-2 py-0.5 rounded ${TYPE_COLOR_BADGES[q.question_type] || "bg-gray-500/10 text-gray-400"}`}>{fmtLabel(q.question_type)}</span> },
        { key: "difficulty", header: "Difficulty", render: (q) => <span className={`text-xs px-2 py-0.5 rounded ${DIFFICULTY_COLORS[q.difficulty] || "bg-gray-500/10 text-gray-400"}`}>{q.difficulty ? q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1) : "—"}</span> },
        { key: "program", header: "Program", render: (q) => <span className="text-sm text-gray-300">{q.program || "—"}</span> },
        { key: "subject_name", header: "Subject", render: (q) => <span className="text-sm text-gray-300">{q.subject_name || "—"}</span> },
        { key: "created_at", header: "Created", render: (q) => <span className="text-sm text-gray-400">{formatDate(q.created_at)}</span> },
      ]}
      detailTitle="Question Details"
      detailFields={(q) => [
        { label: "Question", value: q.question_text },
        { label: "Type", value: fmtLabel(q.question_type) },
        { label: "Difficulty", value: q.difficulty ? q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1) : "—" },
        { label: "Program", value: q.program || "—" },
        { label: "Subject", value: q.subject_name || "—" },
        { label: "Correct Answer", value: q.correct_answer },
        ...(q.explanation ? [{ label: "Explanation", value: q.explanation }] : []),
        ...(q.reference ? [{ label: "Reference", value: q.reference }] : []),
      ]}
      detailExtra={(q) =>
        Array.isArray(q.options) && q.options.length > 0 ? (
          <div>
            <h3 className="text-sm font-semibold text-gold-500 mt-4 mb-2 uppercase tracking-wider">Options</h3>
            <ul className="space-y-1">
              {q.options.map((o: string, i: number) => (
                <li key={i} className={`text-sm px-3 py-1.5 rounded bg-navy-900 border ${o === q.correct_answer ? "border-green-500/40 text-green-400" : "border-navy-700 text-gray-300"}`}>
                  {o}
                </li>
              ))}
            </ul>
          </div>
        ) : null
      }
    />
  );
}
interface Question {
  id: string;
  subject: string | null;
  subject_name?: string;
  module: string | null;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  reference: string | null;
  difficulty: string;
  program: string | null;
  created_at: string;
}

function QuizzesTab() {
  return (
    <HubCrud<Quiz>
      queryKey={["admin-quizzes"]}
      endpoint="/quizzes/"
      titleFallback="Quizzes"
      emptyTitle="No quizzes yet"
      emptyMessage="Quizzes are tied to a module."
      emptyActionLabel="+ New Quiz"
      createTitle="New Quiz"
      editTitle="Edit Quiz"
      createLabel="+ New Quiz"
      searchPlaceholder="Search title or module..."
      searchFields={["title"]}
      filterFields={[
        { key: "module", label: "All Modules", options: (lk) => (lk.modules || []).map((m: any) => ({ value: m.id, label: m.title })) },
        { key: "is_open", label: "Availability", options: [{ value: "true", label: "Open" }, { value: "false", label: "Closed" }] },
      ]}
      lookup={{ key: "modules", queryKey: ["admin-quizzes-modules"], endpoint: "/modules/" }}
      initialCreate={{ module: "", title: "", description: "", duration: "", passing_grade: "", max_attempts: "1", is_open: false }}
      buildForm={(q) => ({ module: q.module || "", title: q.title || "", description: q.description || "", duration: q.duration != null ? String(q.duration) : "", passing_grade: q.passing_grade != null ? String(q.passing_grade) : "", max_attempts: String(q.max_attempts ?? 1), is_open: q.is_open })}
      buildPayload={(f) => ({
        module: f.module,
        title: f.title || null,
        description: f.description || null,
        duration: f.duration ? parseInt(f.duration, 10) : null,
        passing_grade: f.passing_grade ? parseFloat(f.passing_grade) : null,
        max_attempts: parseInt(f.max_attempts, 10) || 1,
        is_open: f.is_open,
      })}
      fields={(mode) => [
        { name: "module", label: "Module", type: "select", required: true, placeholder: "Select module", options: (lk) => (lk.modules || []).map((m: any) => ({ value: m.id, label: m.title })) },
        { name: "title", label: "Title", type: "text" },
        { name: "description", label: "Description", type: "textarea", rows: 2 },
        { name: "duration", label: "Duration (min)", type: "text", span: "half" },
        { name: "passing_grade", label: "Passing Grade (%)", type: "text", span: "half" },
        { name: "max_attempts", label: "Max Attempts", type: "text", span: "half" },
        { name: "is_open", label: "Open to students", type: "checkbox", span: "half" },
      ]}
      columns={[
        { key: "title", header: "Title", render: (q) => <span className="text-sm font-semibold text-white">{q.title || "Untitled Quiz"}</span> },
        { key: "module_name", header: "Module", render: (q) => <span className="text-sm text-gray-300">{q.module_name || "—"}</span> },
        { key: "duration", header: "Duration", render: (q) => <span className="text-sm text-gray-400">{q.duration != null ? `${q.duration} min` : "—"}</span> },
        { key: "passing_grade", header: "Pass", render: (q) => <span className="text-sm text-gray-400">{q.passing_grade != null ? `${q.passing_grade}%` : "—"}</span> },
        { key: "max_attempts", header: "Attempts", render: (q) => <span className="text-sm text-gray-400">{q.max_attempts}</span> },
        { key: "is_open", header: "Status", render: (q) => <span className={`text-xs px-2 py-0.5 rounded ${q.is_open ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"}`}>{q.is_open ? "Open" : "Closed"}</span> },
      ]}
      detailTitle="Quiz Details"
      detailFields={(q) => [
        { label: "Title", value: q.title || "Untitled Quiz" },
        { label: "Module", value: q.module_name || "—" },
        { label: "Duration", value: q.duration != null ? `${q.duration} min` : "—" },
        { label: "Passing Grade", value: q.passing_grade != null ? `${q.passing_grade}%` : "—" },
        { label: "Max Attempts", value: String(q.max_attempts) },
        { label: "Status", value: q.is_open ? "Open" : "Closed" },
        ...(q.description ? [{ label: "Description", value: q.description }] : []),
      ]}
    />
  );
}
interface Quiz {
  id: string;
  module: string;
  module_name?: string;
  title: string | null;
  description: string | null;
  duration: number | null;
  passing_grade: number | null;
  max_attempts: number;
  is_open: boolean;
}

function ExamsTab() {
  return (
    <HubCrud<Exam>
      queryKey={["admin-exams"]}
      endpoint="/exams/"
      titleFallback="Exams"
      emptyTitle="No exams yet"
      emptyMessage="Create exams with a question pool."
      emptyActionLabel="+ New Exam"
      createTitle="New Exam"
      editTitle="Edit Exam"
      createLabel="+ New Exam"
      searchPlaceholder="Search code or title..."
      searchFields={["code", "title"]}
      filterFields={[
        { key: "program", label: "All Programs", options: PROGRAMS.map((p) => ({ value: p, label: p })) },
        { key: "type", label: "All Types", options: EXAM_TYPES.map((t) => ({ value: t, label: fmtLabel(t) })) },
        { key: "status", label: "All Statuses", options: EXAM_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })) },
      ]}
      lookup={{ key: "subjects", queryKey: ["admin-exams-subjects"], endpoint: "/subjects/?limit=500" }}
      initialCreate={{ code: "", title: "", subject: "", program: "PPL", type: "quiz", duration: "60", question_count: "20", passing_grade: "70", max_attempts: "3", status: "draft" }}
      buildForm={(e) => ({ code: e.code || "", title: e.title || "", subject: e.subject || "", program: e.program || "PPL", type: e.type || "quiz", duration: e.duration != null ? String(e.duration) : "60", question_count: e.question_count != null ? String(e.question_count) : "20", passing_grade: e.passing_grade != null ? String(e.passing_grade) : "70", max_attempts: e.max_attempts != null ? String(e.max_attempts) : "3", status: e.status || "draft" })}
      buildPayload={(f) => ({
        code: f.code,
        title: f.title || undefined,
        subject: f.subject || undefined,
        program: f.program,
        type: f.type,
        duration: f.duration ? parseInt(f.duration, 10) : 60,
        question_count: f.question_count ? parseInt(f.question_count, 10) : undefined,
        passing_grade: f.passing_grade ? parseFloat(f.passing_grade) : undefined,
        max_attempts: f.max_attempts ? parseInt(f.max_attempts, 10) : 3,
        status: f.status,
      })}
      fields={(mode) => [
        { name: "code", label: "Code", type: "text", required: true, mono: true, placeholder: "e.g. EXAM-PPL-01", span: "half" },
        { name: "program", label: "Program", type: "select", options: PROGRAMS.map((p) => ({ value: p, label: p })), span: "half" },
        { name: "title", label: "Title", type: "text" },
        { name: "subject", label: "Subject", type: "select", placeholder: "No subject", options: (lk) => (lk.subjects || []).map((s: any) => ({ value: s.id, label: `${s.code} - ${s.title_en}` })) },
        { name: "type", label: "Type", type: "select", options: EXAM_TYPES.map((t) => ({ value: t, label: fmtLabel(t) })) },
        { name: "duration", label: "Duration (min)", type: "text", span: "half" },
        { name: "question_count", label: "Questions", type: "text", span: "half" },
        { name: "passing_grade", label: "Passing Grade (%)", type: "text", span: "half" },
        { name: "max_attempts", label: "Max Attempts", type: "text", span: "half" },
        { name: "status", label: "Status", type: "select", options: EXAM_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })) },
      ]}
      columns={[
        { key: "code", header: "Code", render: (e) => <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono font-semibold">{e.code}</span> },
        { key: "title", header: "Title" },
        { key: "subject_label", header: "Subject" },
        { key: "program", header: "Program" },
        { key: "type", header: "Type", render: (e) => <span className={`text-xs px-2 py-0.5 rounded ${TYPE_COLORS[e.type] || "bg-gray-500/10 text-gray-400"}`}>{fmtLabel(e.type)}</span> },
        { key: "question_count", header: "Questions", render: (e) => <span className="text-sm text-white font-mono">{e.question_count ?? 0}</span> },
        { key: "status", header: "Status", render: (e) => <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[e.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtLabel(e.status)}</span> },
      ]}
      detailTitle="Exam Details"
      detailFields={(e) => [
        { label: "Code", value: e.code },
        { label: "Title", value: e.title || "—" },
        { label: "Subject", value: e.subject_label || "—" },
        { label: "Program", value: e.program || "—" },
        { label: "Type", value: fmtLabel(e.type) },
        { label: "Questions", value: String(e.question_count ?? 0) },
        { label: "Status", value: fmtLabel(e.status) },
      ]}
      detailExtra={(e) => <ExamPreview examId={e.id} />}
    />
  );
}
interface Exam {
  id: string;
  code: string;
  title: string | null;
  subject?: string;
  subject_label?: string;
  program: string;
  type: string;
  question_count?: number;
  status: string;
  duration?: number;
  passing_grade?: number;
  max_attempts?: number;
}

function ExamPreview({ examId }: { examId: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const d = await api.get<any>(`/exams/${examId}/preview/`);
      setData(d);
    } catch {}
    setLoading(false);
  };
  return (
    <div>
      <button
        onClick={() => { if (!data) load(); setOpen(!open); }}
        className="mt-3 px-3 py-1.5 text-xs bg-navy-700 text-gold-500 rounded-lg hover:bg-navy-600 transition-colors"
      >
        {open ? "Hide Preview" : "Preview Questions"}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {loading ? <p className="text-sm text-gray-500">Loading...</p> :
            data?.questions?.length ? (
              data.questions.map((q: any, i: number) => (
                <div key={q.id || i} className="bg-navy-900 border border-navy-700 rounded-lg p-3">
                  <p className="text-sm text-white font-medium mb-1">{i + 1}. {q.question_text}</p>
                  {Array.isArray(q.options) && q.options.length > 0 && (
                    <ul className="space-y-0.5 mb-1">
                      {q.options.map((o: string, j: number) => (
                        <li key={j} className={`text-xs px-2 py-1 rounded ${o === q.correct_answer ? "bg-green-500/10 text-green-400" : "text-gray-400"}`}>{o}</li>
                      ))}
                    </ul>
                  )}
                  {q.correct_answer && (
                    <p className="text-xs text-green-400">✓ {q.correct_answer}</p>
                  )}
                  {q.explanation && <p className="text-xs text-gray-500 mt-1">{q.explanation}</p>}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No questions to preview.</p>
            )}
        </div>
      )}
    </div>
  );
}

function AttemptsTab() {
  return (
    <HubCrud<Attempt>
      queryKey={["admin-qa"]}
      endpoint="/quiz-attempts/"
      titleFallback="Quiz Attempts"
      emptyTitle="No attempts yet"
      emptyMessage="Student quiz attempts will appear here."
      searchPlaceholder="Search student..."
      searchFields={["student_name"]}
      showFilterBar={false}
      allowCreate={false}
      allowEdit={false}
      allowDelete={false}
      columns={[
        { key: "student_name", header: "Student", render: (a) => <span className="text-sm font-semibold text-white">{a.student_name}</span> },
        { key: "score", header: "Score", render: (a) => <span className="text-sm text-gold-500 font-semibold">{a.score}</span> },
        { key: "started_at", header: "Started", render: (a) => <span className="text-sm text-gray-400">{formatDate(a.started_at)}</span> },
        { key: "completed_at", header: "Completed", render: (a) => <span className="text-sm text-gray-400">{formatDate(a.completed_at)}</span> },
      ]}
      detailTitle="Quiz Attempt Details"
      detailFields={(a) => [
        { label: "Student", value: a.student_name },
        { label: "Score", value: a.score },
        { label: "Started", value: formatDate(a.started_at) },
        { label: "Completed", value: formatDate(a.completed_at) },
      ]}
    />
  );
}
interface Attempt {
  id: string;
  student_name: string;
  score: string;
  started_at: string;
  completed_at: string | null;
}
