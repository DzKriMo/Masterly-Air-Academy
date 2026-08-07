"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { HubCrud } from "@/components/hub-crud";
import { ModalForm } from "@/components/modal-form";
import { fmtLabel } from "@/lib/format-utils";
import { api } from "@/lib/api";
import { useToast } from "@/components/toast";
import { useTranslation } from "@/lib/use-translation";
import { Trash2, Plus, Download, Users, RotateCcw, Printer, History, ClipboardCheck } from "lucide-react";

interface FinalExam {
  id: string; hash: string; subject: string; subject_name: string;
  title: string; title_ar: string | null; title_fr: string | null;
  promotions: string[]; status: string; duration_minutes: number;
  module_configs: Array<{ id?: string; module: string; module_name?: string; question_count: number; difficulty_distribution: Record<string, number>; type_distribution: Record<string, number> }>;
  assignments_count: number;
}

interface ModuleConfigRow {
  module: string;
  module_name?: string;
  question_count: number;
  easy: number; medium: number; hard: number;
  mcq: number; scq: number; essay: number; true_false: number;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-400", generated: "bg-blue-500/10 text-blue-400",
  in_progress: "bg-amber-500/10 text-amber-400", completed: "bg-green-500/10 text-green-400",
};

const DIFF_KEYS: Array<{ key: "easy" | "medium" | "hard"; label: string }> = [
  { key: "easy", label: "Easy" },
  { key: "medium", label: "Medium" },
  { key: "hard", label: "Hard" },
];

const TYPE_KEYS: Array<{ key: "mcq" | "scq" | "essay" | "true_false"; label: string }> = [
  { key: "mcq", label: "Multiple Choice" },
  { key: "scq", label: "Single Choice" },
  { key: "essay", label: "Essay" },
  { key: "true_false", label: "True / False" },
];

const numberInput = (v: any, onChange: (n: number) => void, min = 0) => (
  <input
    type="number"
    min={min}
    value={Number(v) || 0}
    onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
    className="w-full px-2 py-1.5 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm focus:border-gold-500 focus:outline-none"
  />
);

function getModuleOptions(modules: any[], subjectId: string) {
  const list = (modules || []).filter(
    (m) => !subjectId || !m.subject || m.subject === subjectId
  );
  return list.map((m) => ({
    value: m.id,
    label: m.subject_name ? `${m.title} — ${m.subject_name}` : m.title,
  }));
}

function ModuleConfigEditor({
  value,
  onChange,
  modules,
  subjectId,
}: {
  value: ModuleConfigRow[];
  onChange: (rows: ModuleConfigRow[]) => void;
  modules: any[];
  subjectId: string;
}) {
  const rows: ModuleConfigRow[] = Array.isArray(value) ? value : [];
  const updateRow = (i: number, patch: Partial<ModuleConfigRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () =>
    onChange([
      ...rows,
      { module: "", question_count: 20, easy: 7, medium: 8, hard: 5, mcq: 10, scq: 5, essay: 3, true_false: 2 },
    ]);
  const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  const moduleOptions = getModuleOptions(modules, subjectId);

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <p className="text-sm text-gray-500">No modules configured yet. Add one to choose which modules feed into this exam and how many questions each contributes.</p>
      )}
      {rows.map((row, i) => {
        const diffSum = row.easy + row.medium + row.hard;
        const typeSum = row.mcq + row.scq + row.essay + row.true_false;
        const count = Number(row.question_count) || 0;
        const warn = (count > 0 && (diffSum !== count || typeSum !== count)) || count <= 0;
        return (
          <div key={i} className="p-4 bg-navy-900 border border-navy-700 rounded-xl space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">Module</label>
                <select
                  value={row.module}
                  onChange={(e) => updateRow(i, { module: e.target.value })}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm focus:border-gold-500 focus:outline-none"
                >
                  <option value="">Select module...</option>
                  {moduleOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                title="Remove module"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Number of questions</label>
              {numberInput(row.question_count, (n) => updateRow(i, { question_count: n }), 1)}
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Difficulty mix (must total {count || "question count"})</label>
              <div className="grid grid-cols-3 gap-2">
                {DIFF_KEYS.map((d) => (
                  <div key={d.key}>
                    <span className="block text-[11px] text-gray-500 mb-1">{d.label}</span>
                    {numberInput(row[d.key], (n) => updateRow(i, { [d.key]: n } as any))}
                  </div>
                ))}
              </div>
              <p className={`text-[11px] mt-1 ${diffSum === count ? "text-green-400" : "text-amber-400"}`}>
                {diffSum} of {count} allocated
              </p>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Question types (must total {count || "question count"})</label>
              <div className="grid grid-cols-4 gap-2">
                {TYPE_KEYS.map((ty) => (
                  <div key={ty.key}>
                    <span className="block text-[11px] text-gray-500 mb-1">{ty.label}</span>
                    {numberInput(row[ty.key], (n) => updateRow(i, { [ty.key]: n } as any))}
                  </div>
                ))}
              </div>
              <p className={`text-[11px] mt-1 ${typeSum === count ? "text-green-400" : "text-amber-400"}`}>
                {typeSum} of {count} allocated
              </p>
            </div>

            {warn && (
              <p className="text-[11px] text-amber-400">
                Tip: the difficulty and type allocations should each add up to the number of questions. The system fills any remainder automatically.
              </p>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gold-500 border border-gold-500/30 rounded-lg hover:bg-gold-500/10"
      >
        <Plus className="w-4 h-4" /> Add module
      </button>
    </div>
  );
}

interface Attempt {
  id: string; student_name: string; student_number: string;
  access_code: string; status: string; score: string | number | null;
  started_at: string | null; submitted_at: string | null;
  violations: any[]; is_flagged: boolean;
  essay_graded?: boolean;
}

interface GradeQuestion {
  question_id: string; question_text: string;
  points: number; answer: string; score: number;
}

interface GradeData {
  assignment_id: string; student_name: string; student_number: string; exam_title: string;
  auto_correct: number; auto_total: number;
  max_points: number; earned_points: number;
  score: number | null; essay_graded: boolean; is_flagged: boolean;
  essay_questions: GradeQuestion[];
}

function AttemptsPanel({ examId }: { examId: string }) {
  const { showToast } = useToast();
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [error, setError] = useState("");
  const [grading, setGrading] = useState<Attempt | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const res: any = await api.get(`/final-exams/${examId}/assignments/`);
      const list = Array.isArray(res) ? res : res?.results ?? [];
      setAttempts(list);
    } catch (err: any) {
      setError(err.message || "Failed to load attempts");
    }
  }, [examId]);

  useEffect(() => { load(); }, [load]);

  const handleReset = async (a: Attempt) => {
    if (!window.confirm(
      `Reset ${a.student_name}'s attempt?\n\nThis clears their answers, score, violations and flag, and returns their access code (${a.access_code}) to pending so they can retake the exam. This cannot be undone.`
    )) return;
    try {
      await api.post(`/final-exams/${examId}/assignments/${a.id}/reset/`);
      showToast("success", `Reset ${a.student_name}'s attempt`);
      load();
    } catch (err: any) {
      showToast("error", err.message || "Reset failed");
    }
  };

  const openGrading = (a: Attempt) => {
    setGrading(a);
  };

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-gold-500" /> Student Attempts
        </h3>
        <button onClick={load} className="text-xs text-gold-500 hover:underline">Refresh</button>
      </div>
      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
      {attempts === null ? (
        <p className="text-xs text-gray-500">Loading attempts...</p>
      ) : attempts.length === 0 ? (
        <p className="text-xs text-gray-500">No attempts yet. Generate assignments first.</p>
      ) : (
        <div className="border border-navy-700 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[560px]">
            <thead className="bg-navy-800 text-gray-400">
              <tr>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Access Code</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Violations</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-navy-900">
              {attempts.map((a) => (
                <tr key={a.id} className="border-t border-navy-800">
                  <td className="px-3 py-2 text-white">{a.student_name}
                    {a.student_number && <span className="block text-[10px] text-gray-500">{a.student_number}</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-gold-500">{a.access_code}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded ${a.status === "submitted" ? "bg-green-500/10 text-green-400" : a.status === "in_progress" ? "bg-amber-500/10 text-amber-400" : "bg-gray-500/10 text-gray-400"}`}>
                      {fmtLabel(a.status)}
                    </span>
                    {a.is_flagged && <span className="ml-1 text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400">FLAGGED</span>}
                  </td>
                  <td className="px-3 py-2 text-white">{a.score != null ? `${a.score}%` : "—"}
                    {a.status === "submitted" && (
                      <span className={`block text-[10px] ${a.essay_graded ? "text-green-400" : "text-amber-400"}`}>
                        {a.essay_graded ? "Essays graded" : "Essays pending"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-400">
                    {Array.isArray(a.violations) && a.violations.length > 0
                      ? <span className="text-red-400">{a.violations.length} — {a.violations.slice(0, 3).map(v => v.type).join(", ")}</span>
                      : "0"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1.5 min-w-[120px]">
                      <button
                        onClick={async () => {
                          try {
                            const res = await api.download(`/final-exams/${examId}/assignments/${a.id}/report/`);
                            const blob = await res.blob();
                            window.open(URL.createObjectURL(blob), '_blank');
                          } catch (err: any) {
                            showToast("error", err?.message || "Failed to load report");
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold transition-colors text-blue-400 border border-blue-500/40 hover:bg-blue-500/15"
                        title="Open this student's printable answer report"
                      >
                        <Printer className="w-3.5 h-3.5" /> Report
                      </button>
                      {a.status === "submitted" && (
                        <button
                          onClick={() => openGrading(a)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-gold-500 hover:bg-gold-600 text-navy-900 text-xs font-bold transition-colors"
                          title="Grade essay answers"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" /> Grade
                        </button>
                      )}
                      <button
                        onClick={() => handleReset(a)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold transition-colors ${
                          a.status === "pending"
                            ? "text-gray-600 cursor-not-allowed border border-gray-700"
                            : "text-red-400 border border-red-500/40 hover:bg-red-500/15"
                        }`}
                        disabled={a.status === "pending"}
                        title={a.status === "pending" ? "Nothing to reset — attempt not started" : "Reset this attempt"}
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {grading && (
        <GradingModal
          examId={examId}
          attempt={grading}
          onClose={() => setGrading(null)}
          onSaved={() => load()}
        />
      )}
    </div>
  );
}

function GradingModal({ examId, attempt, onClose, onSaved }: {
  examId: string; attempt: Attempt; onClose: () => void; onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [data, setData] = useState<GradeData | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api.get(`/final-exams/${examId}/assignments/${attempt.id}/grade/`)
      .then((d: any) => {
        if (cancelled) return;
        const pd = (d?.data ?? d) as GradeData;
        setData(pd);
        const initial: Record<string, number> = {};
        (pd.essay_questions || []).forEach((q) => { initial[q.question_id] = q.score; });
        setScores(initial);
      })
      .catch((e: any) => { if (!cancelled) setError(e.message || "Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [examId, attempt.id]);

  const submitGrades = async () => {
    setSaving(true);
    setError("");
    try {
      await api.post(`/final-exams/${examId}/assignments/${attempt.id}/grade/`, { scores });
      showToast("success", "Grades saved");
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to save grades");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-navy-800 border border-navy-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-navy-700">
          <div className="min-w-0">
            <h3 className="text-white font-semibold">Grade Essays — {attempt.student_name}</h3>
            <p className="text-xs text-gray-500">{attempt.access_code}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="p-5 space-y-5">
          {error && <p className="text-xs text-red-400">{error}</p>}

          {loading ? (
            <p className="text-xs text-gray-500">Loading attempt detail...</p>
          ) : data ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-navy-900 rounded-lg text-center">
                  <div className="text-lg font-bold text-white">{data.score != null ? `${data.score}%` : "—"}</div>
                  <div className="text-[10px] text-gray-500 uppercase">Score</div>
                </div>
                <div className="p-3 bg-navy-900 rounded-lg text-center">
                  <div className="text-lg font-bold text-gold-500">{data.auto_correct}<span className="text-sm text-gray-400">/{data.auto_total}</span></div>
                  <div className="text-[10px] text-gray-500 uppercase">Auto-graded</div>
                </div>
                <div className="p-3 bg-navy-900 rounded-lg text-center">
                  <div className="text-lg font-bold text-white">{data.earned_points}<span className="text-sm text-gray-400">/{data.max_points}</span></div>
                  <div className="text-[10px] text-gray-500 uppercase">Points earned</div>
                </div>
                <div className="p-3 bg-navy-900 rounded-lg text-center">
                  <div className={`text-lg font-bold ${data.essay_graded ? "text-green-400" : "text-amber-400"}`}>
                    {data.essay_graded ? "Done" : "Pending"}
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase">Essays</div>
                </div>
              </div>

              {data.is_flagged && (
                <div className="text-[11px] px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-400">
                  This attempt is FLAGGED (possible cheating). Review carefully.
                </div>
              )}

              {data.essay_questions.length === 0 ? (
                <p className="text-sm text-gray-400">No essay questions in this exam — fully auto-graded.</p>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-300">Manually assign points for each essay question (max = question points). The score updates immediately after saving.</p>
                  {data.essay_questions.map((q, i) => (
                    <div key={q.question_id} className="p-4 bg-navy-900 border border-navy-700 rounded-xl">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-sm text-white font-medium">{i + 1}. {q.question_text}</p>
                        <span className="text-[10px] text-gray-400 shrink-0">Max {q.points} pts</span>
                      </div>
                      <div className="text-sm text-gray-300 bg-navy-950 rounded-lg p-3 mb-3 border border-navy-700 whitespace-pre-wrap">
                        {q.answer?.trim() ? q.answer : <span className="text-gray-600">No answer provided.</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-400">Points:</label>
                        <input
                          type="number"
                          min={0}
                          max={q.points}
                          step={0.25}
                          value={scores[q.question_id] ?? 0}
                          onChange={(e) => { const n = Number(e.target.value); setScores({ ...scores, [q.question_id]: isNaN(n) ? 0 : Math.max(0, Math.min(q.points, n)) }); }}
                          className="w-24 px-2 py-1 bg-navy-800 border border-navy-600 rounded-lg text-white text-sm focus:border-gold-500 focus:outline-none"
                        />
                        <span className="text-xs text-gray-500">/ {q.points}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Close</button>
                <button onClick={submitGrades} disabled={saving} className="px-5 py-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-semibold rounded-lg text-sm">
                  {saving ? "Saving..." : "Save Grades"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function FinalExamsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<FinalExam | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const res = await api.post<any>(`/final-exams/${selected.id}/generate/`);
      showToast("success", `${res.assignments} assignments generated`);
      if (res.errors?.length) showToast("error", res.errors.join(", "));
      setShowDetail(false);
    } catch (err: any) {
      showToast("error", err.message || "Generation failed");
    } finally { setGenerating(false); }
  };

  const buildRows = (configs: FinalExam["module_configs"]): ModuleConfigRow[] =>
    (configs || []).map((c) => ({
      module: c.module,
      module_name: c.module_name,
      question_count: c.question_count || 0,
      easy: c.difficulty_distribution?.easy || 0,
      medium: c.difficulty_distribution?.medium || 0,
      hard: c.difficulty_distribution?.hard || 0,
      mcq: c.type_distribution?.mcq || 0,
      scq: c.type_distribution?.scq || 0,
      essay: c.type_distribution?.essay || 0,
      true_false: c.type_distribution?.true_false || 0,
    }));

  const rowsToPayload = (rows: ModuleConfigRow[]) =>
    (rows || []).map((r) => ({
      module: r.module,
      question_count: Number(r.question_count) || 10,
      difficulty_distribution: { easy: Number(r.easy) || 0, medium: Number(r.medium) || 0, hard: Number(r.hard) || 0 },
      type_distribution: { mcq: Number(r.mcq) || 0, scq: Number(r.scq) || 0, essay: Number(r.essay) || 0, true_false: Number(r.true_false) || 0 },
    }));

  return (
    <div className="min-h-screen bg-navy-900 p-6">
      <h1 className="text-2xl font-bold text-white mb-6">{t("admin.finalExams", "Final Exams")}</h1>

      <HubCrud<FinalExam>
        queryKey={["admin-final-exams"]}
        endpoint="/final-exams/"
        titleFallback="Final Exams"
        emptyTitle="No final exams yet"
        emptyMessage="Create and manage paper-based final exams."
        emptyActionLabel="+ New Exam"
        createTitle="New Final Exam"
        editTitle="Edit Final Exam"
        createLabel="+ New Exam"
        searchPlaceholder="Search title..."
        searchFields={["title"]}
        filterFields={[
          { key: "subject", label: "All Subjects", options: (lk) => (lk.subjects || []).map((s: any) => ({ value: s.id, label: s.title_en || s.title })) },
          { key: "status", label: "All Statuses", options: ["draft", "generated", "in_progress", "completed"].map(s => ({ value: s, label: fmtLabel(s) })) },
        ]}
        lookups={[
          { key: "subjects", queryKey: ["admin-fe-subjects"], endpoint: "/subjects/" },
          { key: "modules", queryKey: ["admin-fe-modules"], endpoint: "/modules/" },
          { key: "promotions", queryKey: ["admin-fe-promos"], endpoint: "/promotions/" },
        ]}
        initialCreate={{ subject: "", title: "", title_ar: "", title_fr: "", promotions: [] as string[], duration_minutes: "120", module_configs: [] as ModuleConfigRow[] }}
        buildForm={(e) => ({ subject: e.subject, title: e.title, title_ar: e.title_ar || "", title_fr: e.title_fr || "", promotions: e.promotions || [], duration_minutes: String(e.duration_minutes || 120), module_configs: buildRows(e.module_configs) })}
        buildPayload={(f) => ({
          subject: f.subject, title: f.title,
          title_ar: f.title_ar || null, title_fr: f.title_fr || null,
          promotions: Array.isArray(f.promotions) ? f.promotions : [],
          duration_minutes: parseInt(f.duration_minutes, 10) || 120,
          module_configs: rowsToPayload(f.module_configs),
        })}
        fields={(mode) => [
          { name: "subject", label: "Subject", type: "select", required: true, options: (lk) => (lk.subjects || []).map((s: any) => ({ value: s.id, label: s.title_en || s.title })) },
          { name: "title", label: "Title", type: "text", required: true },
          { name: "title_fr", label: "Title (FR)", type: "text", span: "half" },
          { name: "title_ar", label: "Title (AR)", type: "text", span: "half" },
          { name: "duration_minutes", label: "Duration (minutes)", type: "text", required: true, span: "half" },
          { name: "promotions", label: "Promotions", type: "multiselect", placeholder: "Select the student groups that will take this exam.", options: (lk) => (lk.promotions || []).map((p: any) => ({ value: p.id, label: p.code || p.name })) },
          { name: "module_configs", label: "Module Configs", type: "custom", render: (v, onChange, lk, form) => <ModuleConfigEditor value={v} onChange={onChange} modules={lk.modules} subjectId={form?.subject || ""} /> },
        ]}
        columns={[
          { key: "title", header: "Title", render: (e) => <span className="text-sm text-white font-semibold">{e.title}</span> },
          { key: "subject_name", header: "Subject", render: (e) => <span className="text-sm text-gray-400">{e.subject_name}</span> },
          { key: "status", header: "Status", render: (e) => <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[e.status] || ""}`}>{fmtLabel(e.status)}</span> },
          { key: "module_configs", header: "Modules", render: (e) => <span className="text-sm text-gray-400">{e.module_configs?.length || 0}</span> },
          { key: "assignments_count", header: "Students", render: (e) => <span className="text-sm text-gray-400">{e.assignments_count || 0}</span> },
        ]}
        detailTitle="Exam Details"
        detailExtra={(e) => (
          <div>
            <div className="mt-4 pt-4 border-t border-navy-700 flex gap-3 flex-wrap">
              {e.status === "draft" && (
                <button onClick={() => { setSelected(e); setShowDetail(true); }} className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm">
                  Generate Assignments
                </button>
              )}
              {e.assignments_count > 0 && (
                <>
                  <button onClick={async () => { try { const res = await api.download(`/final-exams/${e.id}/pdf/`); const blob = await res.blob(); window.open(URL.createObjectURL(blob), '_blank'); } catch (err: any) { showToast("error", err?.message || "Failed to download access codes"); } }} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg text-sm">
                    <Download className="w-4 h-4 inline-block mr-1" />Access Codes
                  </button>
                  <button onClick={async () => { try { const res = await api.download(`/final-exams/${e.id}/report/`); const blob = await res.blob(); window.open(URL.createObjectURL(blob), '_blank'); } catch (err: any) { showToast("error", err?.message || "Failed to download report"); } }} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg text-sm">
                    <Printer className="w-4 h-4 inline-block mr-1" />Printable Report
                  </button>
                </>
              )}
            </div>
            <AttemptsPanel examId={e.id} />
          </div>
        )}
        detailFields={(e) => [
          { label: "Title", value: e.title },
          { label: "Subject", value: e.subject_name },
          { label: "Status", value: fmtLabel(e.status) },
          { label: "Duration", value: `${e.duration_minutes} minutes` },
          { label: "Exam Portal", value: `/exams/${e.hash}` },
          { label: "Assignments", value: String(e.assignments_count || 0) },
          { label: "Promotions", value: (e.promotions || []).length ? String((e.promotions || []).length) : "—" },
          ...(e.module_configs || []).map((c, i) => ({
            label: `Module Config ${i + 1}`,
            value: `${c.module_name || c.module}: ${c.question_count} questions, Difficulty: ${JSON.stringify(c.difficulty_distribution)}, Types: ${JSON.stringify(c.type_distribution)}`,
          })),
        ]}
      />

      <ModalForm open={showDetail} onClose={() => setShowDetail(false)}
        title={`Generate: ${selected?.title || ""}`}
        footer={
          <button onClick={handleGenerate} disabled={generating} className="px-6 py-2.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-semibold rounded-lg text-sm">
            {generating ? "Generating..." : "Generate All Assignments"}
          </button>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">This will create randomized exam assignments for all students in the selected promotions. Each student gets a unique access code and question set.</p>
          {selected?.module_configs && selected.module_configs.map((c, i) => (
            <div key={i} className="p-3 bg-navy-900 rounded-lg">
              <p className="text-sm text-white font-semibold">{c.module_name || c.module}</p>
              <p className="text-xs text-gray-400">{c.question_count} questions | Difficulty: {JSON.stringify(c.difficulty_distribution)} | Types: {JSON.stringify(c.type_distribution)}</p>
            </div>
          ))}
        </div>
      </ModalForm>
    </div>
  );
}
