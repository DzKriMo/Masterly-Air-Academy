"use client";

import { useMemo, useState } from "react";
import { HubCrud } from "@/components/hub-crud";
import { ModalForm } from "@/components/modal-form";
import { fmtLabel } from "@/lib/format-utils";
import { api } from "@/lib/api";
import { useToast } from "@/components/toast";
import { useTranslation } from "@/lib/use-translation";

interface FinalQuestion {
  id: string; subject: string; subject_name: string; module: string; module_name: string;
  question_text: string; question_type: string; difficulty: string;
  options: string[]; correct_answer: string; explanation: string | null;
  is_active: boolean;
}

const QUESTION_TYPES = ["mcq", "scq", "essay", "true_false"];
const DIFFICULTIES = ["easy", "medium", "hard"];

const DIFF_COLORS: Record<string, string> = {
  easy: "bg-green-500/10 text-green-400", medium: "bg-amber-500/10 text-amber-400", hard: "bg-red-500/10 text-red-400",
};
const TYPE_COLORS: Record<string, string> = {
  mcq: "bg-blue-500/10 text-blue-400", scq: "bg-purple-500/10 text-purple-400", essay: "bg-cyan-500/10 text-cyan-400", true_false: "bg-gray-500/10 text-gray-400",
};

export default function FinalExamQuestionsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [showBulk, setShowBulk] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [importing, setImporting] = useState(false);

  const handleBulkImport = async () => {
    setImporting(true);
    try {
      let questions;
      try { questions = JSON.parse(bulkJson); } catch { showToast("error", "Invalid JSON"); setImporting(false); return; }
      const res = await api.post<any>("/final-exam-questions/bulk_import/", { questions });
      showToast("success", `${res.created} questions imported. ${(res.errors || []).length} errors.`);
      if (res.errors?.length) console.error("Import errors:", res.errors);
      setShowBulk(false);
      setBulkJson("");
    } catch (err: any) {
      showToast("error", err.message || "Import failed");
    } finally { setImporting(false); }
  };

  return (
    <div className="min-h-screen bg-navy-900 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">{t("admin.finalExamQuestions", "Final Exam Question Bank")}</h1>
        <button onClick={() => setShowBulk(true)} className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm">
          + Bulk Import
        </button>
      </div>

      <HubCrud<FinalQuestion>
        queryKey={["admin-final-questions"]}
        endpoint="/final-exam-questions/"
        titleFallback="Final Exam Questions"
        emptyTitle="No questions yet"
        emptyMessage="Add questions to the final exam bank."
        emptyActionLabel="+ New Question"
        createTitle="New Question"
        editTitle="Edit Question"
        createLabel="+ New Question"
        searchPlaceholder="Search question text..."
        searchFields={["question_text"]}
        filterFields={[
          { key: "difficulty", label: "All Difficulties", options: DIFFICULTIES.map(d => ({ value: d, label: fmtLabel(d) })) },
          { key: "question_type", label: "All Types", options: QUESTION_TYPES.map(t => ({ value: t, label: fmtLabel(t) })) },
          { key: "is_active", label: "Status", options: [{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }] },
        ]}
        lookups={[
          { key: "subjects", queryKey: ["admin-fq-subjects"], endpoint: "/subjects/" },
          { key: "modules", queryKey: ["admin-fq-modules"], endpoint: "/modules/" },
        ]}
        initialCreate={{ subject: "", module: "", question_text: "", question_type: "mcq", difficulty: "medium", options: "", correct_answer: "", explanation: "", is_active: true }}
        buildForm={(q) => ({ subject: q.subject, module: q.module, question_text: q.question_text, question_type: q.question_type, difficulty: q.difficulty, options: Array.isArray(q.options) ? q.options.join("\n") : "", correct_answer: q.correct_answer || "", explanation: q.explanation || "", is_active: q.is_active })}
        buildPayload={(f) => ({
          subject: f.subject, module: f.module, question_text: f.question_text,
          question_type: f.question_type, difficulty: f.difficulty,
          options: f.options ? f.options.split("\n").map((s: string) => s.trim()).filter(Boolean) : [],
          correct_answer: f.correct_answer || null, explanation: f.explanation || null,
          is_active: f.is_active,
        })}
        fields={(mode) => [
          { name: "subject", label: "Subject", type: "select", required: true, options: (lk) => (lk.subjects || []).map((s: any) => ({ value: s.id, label: s.title_en || s.title })) },
          { name: "module", label: "Module", type: "select", required: true, options: (lk) => (lk.modules || []).map((m: any) => ({ value: m.id, label: m.title })) },
          { name: "question_type", label: "Type", type: "select", required: true, options: QUESTION_TYPES.map(t => ({ value: t, label: fmtLabel(t) })), span: "half" },
          { name: "difficulty", label: "Difficulty", type: "select", required: true, options: DIFFICULTIES.map(d => ({ value: d, label: fmtLabel(d) })), span: "half" },
          { name: "question_text", label: "Question Text", type: "textarea", required: true, rows: 3 },
          { name: "options", label: "Options (one per line)", type: "textarea", rows: 4, placeholder: "Option A\nOption B\nOption C\nOption D" },
          { name: "correct_answer", label: "Correct Answer", type: "text" },
          { name: "explanation", label: "Explanation", type: "textarea", rows: 2 },
          { name: "is_active", label: "Active", type: "checkbox" },
        ]}
        columns={[
          { key: "question_text", header: "Question", render: (q) => <span className="text-sm text-white line-clamp-2 max-w-xs">{q.question_text}</span> },
          { key: "module_name", header: "Module", render: (q) => <span className="text-sm text-gray-400">{q.module_name}</span> },
          { key: "question_type", header: "Type", render: (q) => <span className={`text-xs px-2 py-0.5 rounded ${TYPE_COLORS[q.question_type] || ""}`}>{fmtLabel(q.question_type)}</span> },
          { key: "difficulty", header: "Difficulty", render: (q) => <span className={`text-xs px-2 py-0.5 rounded ${DIFF_COLORS[q.difficulty] || ""}`}>{fmtLabel(q.difficulty)}</span> },
          { key: "is_active", header: "Active", render: (q) => <span className={`text-xs ${q.is_active ? "text-green-400" : "text-gray-500"}`}>{q.is_active ? "Yes" : "No"}</span> },
        ]}
        detailTitle="Question Details"
        detailFields={(q) => [
          { label: "Subject", value: q.subject_name },
          { label: "Module", value: q.module_name },
          { label: "Type", value: fmtLabel(q.question_type) },
          { label: "Difficulty", value: fmtLabel(q.difficulty) },
          { label: "Question", value: q.question_text },
          ...(Array.isArray(q.options) && q.options.length ? [{ label: "Options", value: q.options.join(" | ") }] : []),
          { label: "Correct Answer", value: q.correct_answer || "—" },
          ...(q.explanation ? [{ label: "Explanation", value: q.explanation }] : []),
        ]}
      />

      <ModalForm open={showBulk} onClose={() => setShowBulk(false)} title="Bulk Import Questions"
        footer={
          <button onClick={handleBulkImport} disabled={importing} className="px-6 py-2.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-semibold rounded-lg text-sm">
            {importing ? "Importing..." : "Import"}
          </button>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Paste JSON array of questions. Each object must have: subject (UUID), module (UUID), question_text, question_type, difficulty. Optional: options (array), correct_answer, explanation.</p>
          <textarea value={bulkJson} onChange={e => setBulkJson(e.target.value)} rows={15} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm font-mono" placeholder={`[\n  {"subject": "...", "module": "...", "question_text": "...", "question_type": "mcq", "difficulty": "easy", "options": ["A","B","C","D"], "correct_answer": "A"}\n]`} />
        </div>
      </ModalForm>
    </div>
  );
}
