"use client";

import { useMemo, useState } from "react";
import { HubCrud } from "@/components/hub-crud";
import { ModalForm } from "@/components/modal-form";
import { DetailField } from "@/components/detail-field";
import { fmtLabel } from "@/lib/format-utils";
import { api } from "@/lib/api";
import { useToast } from "@/components/toast";
import { useTranslation } from "@/lib/use-translation";

interface FinalExam {
  id: string; hash: string; subject: string; subject_name: string;
  title: string; title_ar: string | null; title_fr: string | null;
  promotions: string[]; status: string; duration_minutes: number;
  module_configs: Array<{ id?: string; module: string; module_name?: string; question_count: number; difficulty_distribution: Record<string, number>; type_distribution: Record<string, number> }>;
  assignments_count: number;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-400", generated: "bg-blue-500/10 text-blue-400",
  in_progress: "bg-amber-500/10 text-amber-400", completed: "bg-green-500/10 text-green-400",
};

export default function FinalExamsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<FinalExam | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showPdfBtn, setShowPdfBtn] = useState(false);

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
        initialCreate={{ subject: "", title: "", title_ar: "", title_fr: "", promotions: [] as string[], duration_minutes: "120", module_configs: [] as any[] }}
        buildForm={(e) => ({ subject: e.subject, title: e.title, title_ar: e.title_ar || "", title_fr: e.title_fr || "", promotions: e.promotions || [], duration_minutes: String(e.duration_minutes || 120), module_configs: e.module_configs || [] })}
        buildPayload={(f) => ({
          subject: f.subject, title: f.title,
          title_ar: f.title_ar || null, title_fr: f.title_fr || null,
          promotions: f.promotions,
          duration_minutes: parseInt(f.duration_minutes, 10) || 120,
          module_configs: f.module_configs.map((c: any) => ({
            module: c.module,
            question_count: parseInt(c.question_count, 10) || 10,
            difficulty_distribution: c.difficulty_distribution || {},
            type_distribution: c.type_distribution || {},
          })),
        })}
        fields={(mode) => [
          { name: "subject", label: "Subject", type: "select", required: true, options: (lk) => (lk.subjects || []).map((s: any) => ({ value: s.id, label: s.title_en || s.title })) },
          { name: "title", label: "Title", type: "text", required: true },
          { name: "title_fr", label: "Title (FR)", type: "text", span: "half" },
          { name: "title_ar", label: "Title (AR)", type: "text", span: "half" },
          { name: "duration_minutes", label: "Duration (minutes)", type: "text", required: true, span: "half" },
          { name: "promotions", label: "Promotions", type: "text", placeholder: "Select after creating (set in edit)" },
          { name: "module_configs", label: "Module Configs (JSON)", type: "textarea", rows: 6, placeholder: `[\n  {"module": "uuid", "question_count": 20, "difficulty_distribution": {"easy": 8, "medium": 7, "hard": 5}, "type_distribution": {"mcq": 10, "scq": 5, "essay": 5}}\n]` },
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
          <div className="mt-4 pt-4 border-t border-navy-700 flex gap-3">
            {e.status === "draft" && (
              <button onClick={() => { setSelected(e); setShowDetail(true); }} className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm">
                Generate Assignments
              </button>
            )}
            {e.assignments_count > 0 && (
              <button onClick={async () => { try { const res = await api.download(`/final-exams/${e.id}/pdf/`); const blob = await res.blob(); window.open(URL.createObjectURL(blob), '_blank'); } catch {} }} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg text-sm">
                Download Access Codes PDF
              </button>
            )}
          </div>
        )}
        detailFields={(e) => [
          { label: "Title", value: e.title },
          { label: "Subject", value: e.subject_name },
          { label: "Status", value: fmtLabel(e.status) },
          { label: "Duration", value: `${e.duration_minutes} minutes` },
          { label: "Exam Portal", value: `/exams-${e.hash}` },
          { label: "Assignments", value: String(e.assignments_count || 0) },
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
