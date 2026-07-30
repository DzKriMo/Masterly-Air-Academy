"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { DetailField } from "@/components/detail-field";
import { PageHeader } from "@/components/page-header";
import { ExamFormFields, type Subject, type ExamFormData } from "@/components/exam-form-fields";
import { fmtLabel, formatDateTime, STATUS_COLORS, TYPE_COLORS, PROGRAMS, EXAM_TYPES as TYPES, EXAM_STATUSES as STATUSES } from "@/lib/format-utils";

interface Exam {
  id: string;
  code: string;
  title: string;
  subject?: string;
  subject_label?: string;
  program: string;
  type: string;
  question_count?: number;
  status: string;
  duration?: number;
  passing_grade?: number;
  max_attempts?: number;
  open_date?: string;
  close_date?: string;
}

const emptyForm: ExamFormData = {
  code: "", title: "", title_ar: "", title_fr: "", subject: "",
  program: "PPL", type: "quiz", duration: "60", question_count: "20",
  passing_grade: "70", max_attempts: "3", status: "draft",
  open_date: "", close_date: "", question_ids: [],
};

export default function InstructorExamsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<ExamFormData>(emptyForm);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{exam: any; questions: any[]} | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.push("/login"); }
  }, [authLoading, isAuthenticated, router]);

  const { data: exams, isLoading, error, refetch } = useQuery<Exam[]>({
    queryKey: ["instructor-exams"],
    queryFn: async () => {
      const d = await api.get<any>("/exams/");
      return (d as any)?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["instructor-exams-subjects"],
    queryFn: async () => {
      const d = await api.get<any>("/subjects/?limit=500");
      return ((d as any)?.results || (d as any) || []).map((s: any) => ({
        id: s.id, code: s.code, title_en: s.title_en || s.title || "",
      }));
    },
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: (data: ExamFormData) =>
      api.post("/exams/", {
        code: data.code,
        title: data.title || undefined,
        subject: data.subject || undefined,
        program: data.program,
        type: data.type,
        duration: parseInt(data.duration, 10) || 60,
        question_count: parseInt(data.question_count, 10) || undefined,
        passing_grade: data.passing_grade ? parseFloat(data.passing_grade) : undefined,
        max_attempts: parseInt(data.max_attempts, 10) || 3,
        status: data.status,
        open_date: data.open_date ? new Date(data.open_date).toISOString() : undefined,
        close_date: data.close_date ? new Date(data.close_date).toISOString() : undefined,
        question_ids: data.question_ids?.length ? data.question_ids : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor-exams"] });
      setCreateOpen(false);
      setForm(emptyForm);
    },
    onError: (err: any) => setMutationError(err?.message || "Failed to create exam"),
  });

  const filtered = useMemo(() => {
    if (!exams) return [];
    let r = exams;
    if (filterValues.program)
      r = r.filter((e) => e.program === filterValues.program);
    if (filterValues.type)
      r = r.filter((e) => e.type === filterValues.type);
    if (filterValues.status)
      r = r.filter((e) => e.status === filterValues.status);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter(
        (e) =>
          e.code?.toLowerCase().includes(q) ||
          e.title?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [exams, filterValues, searchValue]);

  const columns: Column<Exam>[] = useMemo(
    () => [
      {
        key: "code",
        header: "Code",
        render: (e) => (
          <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono font-semibold">
            {e.code}
          </span>
        ),
      },
      { key: "title", header: t("common.title", "Title") },
      { key: "subject_label", header: "Subject" },
      { key: "program", header: "Program" },
      {
        key: "type",
        header: "Type",
        render: (e) => (
          <span className={`text-xs px-2 py-0.5 rounded ${TYPE_COLORS[e.type] || "bg-gray-500/10 text-gray-400"}`}>
            {fmtLabel(e.type)}
          </span>
        ),
      },
      {
        key: "duration",
        header: "Duration",
        render: (e) => <span className="text-sm text-white font-mono">{e.duration || "—"}m</span>,
      },
      {
        key: "status",
        header: t("common.status", "Status"),
        render: (e) => (
          <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[e.status] || "bg-gray-500/10 text-gray-400"}`}>
            {fmtLabel(e.status)}
          </span>
        ),
      },
    ],
    [t]
  );

  const set = (key: keyof ExamFormData, value: any) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader
        title={t("instructor.exams", "Exams")}
        backHref="/instructor/dashboard"
        backLabel={t("instructor.backToDashboard", "Back to Dashboard")}
        actions={
          <button onClick={() => { setForm(emptyForm); setMutationError(null); setCreateOpen(true); }}
            className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors">
            + Create Exam
          </button>
        }
      />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={(error as any)?.message || "Failed to load"} onRetry={() => refetch()} />}

        <FilterBar
          filters={[
            { key: "program", label: "All Programs", options: PROGRAMS.map((p) => ({ value: p, label: p })) },
            { key: "type", label: "All Types", options: TYPES.map((t) => ({ value: t, label: fmtLabel(t) })) },
            { key: "status", label: "All Statuses", options: STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })) },
          ]}
          values={filterValues}
          onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))}
          onClear={() => { setFilterValues({}); setSearchValue(""); }}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search code or title..."
        />

        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={exams?.length === 0 ? "No exams have been created yet." : "No exams match your filters."}
            title={exams?.length === 0 ? "No exams yet" : "No matching exams"}
          />
        ) : (
          <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(item) => setSelectedExam(item as Exam)} />
        )}

        {/* Exam Detail Modal */}
        <ModalForm
          open={!!selectedExam}
          onClose={() => setSelectedExam(null)}
          title={`Exam: ${selectedExam?.title || selectedExam?.code || ""}`}
          footer={
            <>
              <button onClick={() => { if (selectedExam) { setPreviewLoading(true); setPreviewOpen(true); api.get<any>(`/exams/${selectedExam.id}/preview/`).then(d => setPreviewData(d as any)).catch(() => setPreviewData(null)).finally(() => setPreviewLoading(false)); } }}
                className="px-4 py-2 text-sm bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-400 transition-colors">
                Preview
              </button>
              <button onClick={() => setSelectedExam(null)}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">
                {t("common.close", "Close")}
              </button>
            </>
          }
        >
          {selectedExam && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <DetailField label="Code" value={selectedExam.code} />
                <DetailField label="Program" value={selectedExam.program} />
                <div className="col-span-2">
                  <DetailField label="Title" value={selectedExam.title || "—"} />
                </div>
                <DetailField label="Type" value={fmtLabel(selectedExam.type)} />
                <DetailField label="Subject" value={selectedExam.subject_label || "—"} />
                <DetailField label="Duration" value={selectedExam.duration ? `${selectedExam.duration} min` : "—"} />
                <DetailField label="Questions" value={String(selectedExam.question_count ?? "—")} />
                <DetailField label="Passing Grade" value={selectedExam.passing_grade ? `${selectedExam.passing_grade}%` : "—"} />
                <DetailField label="Max Attempts" value={String(selectedExam.max_attempts ?? "—")} />
                <DetailField label="Open Date" value={formatDateTime(selectedExam.open_date)} />
                <DetailField label="Close Date" value={formatDateTime(selectedExam.close_date)} />
                <DetailField label="Status" value={fmtLabel(selectedExam.status)} />
              </div>
            </div>
          )}
        </ModalForm>

        {/* Create Exam Modal */}
        <ModalForm
          open={createOpen}
          onClose={() => { setCreateOpen(false); setForm(emptyForm); setMutationError(null); }}
          title="Create Exam"
          wide
          footer={
            <>
              <button onClick={() => { setCreateOpen(false); setForm(emptyForm); setMutationError(null); }}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">
                Cancel
              </button>
              <button onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.code}
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors disabled:opacity-50">
                {createMutation.isPending ? "Creating..." : "Create Exam"}
              </button>
            </>
          }
        >
          {mutationError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400 mb-4">{mutationError}</div>
          )}
          <ExamFormFields form={form} set={set} subjects={subjects} />
        </ModalForm>

        {/* Preview Modal */}
        <ModalForm
          open={previewOpen}
          onClose={() => { setPreviewOpen(false); setPreviewData(null); }}
          title={previewData?.exam?.title || "Exam Preview"}
          wide
          footer={
            <button onClick={() => { setPreviewOpen(false); setPreviewData(null); }}
              className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">
              Close
            </button>
          }
        >
          {previewLoading ? (
            <LoadingSkeleton type="detail" rows={6} />
          ) : previewData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-navy-900 rounded-lg border border-navy-700">
                <DetailField label="Code" value={previewData.exam.code} />
                <DetailField label="Program" value={previewData.exam.program} />
                <DetailField label="Duration" value={`${previewData.exam.duration} min`} />
                <DetailField label="Passing Grade" value={`${previewData.exam.passing_grade || 70}%`} />
              </div>
              <h3 className="text-sm font-semibold text-gold-500 uppercase tracking-wider">Questions ({previewData.questions.length})</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {previewData.questions.map((q: any, i: number) => (
                  <div key={q.id} className="p-4 bg-navy-900 rounded-lg border border-navy-700">
                    <p className="text-white text-sm font-medium mb-2">{i + 1}. {q.question_text}</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">{q.question_type}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-500/10 text-gray-400">{q.difficulty}</span>
                    </div>
                    {q.options?.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {q.options.map((opt: string, j: number) => {
                          const letter = String.fromCharCode(65 + j);
                          const isCorrect = opt === q.correct_answer;
                          return <div key={j} className={`text-xs px-2 py-1 rounded ${isCorrect ? "bg-green-500/10 text-green-400" : "text-gray-400"}`}>{letter}. {opt} {isCorrect && "✓"}</div>;
                        })}
                      </div>
                    )}
                    <p className="text-xs text-green-400">Answer: {q.correct_answer}</p>
                    {q.explanation && <p className="text-xs text-gray-500 mt-1">{q.explanation}</p>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Failed to load preview.</p>
          )}
        </ModalForm>
      </main>
    </div>
  );
}


