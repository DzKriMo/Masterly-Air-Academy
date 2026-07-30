"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useTranslation } from "@/lib/use-translation";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";
import { QuestionFormFields, QuestionFormData, QUESTION_TYPES, PROGRAMS, DIFFICULTIES } from "@/components/question-form-fields";

interface Question {
  id: string;
  subject: string | null;
  subject_name?: string;
  module: string | null;
  module_name?: string;
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

const TYPE_COLORS: Record<string, string> = {
  mcq: "bg-blue-500/10 text-blue-400",
  true_false: "bg-purple-500/10 text-purple-400",
  short_answer: "bg-amber-500/10 text-amber-400",
  essay: "bg-green-500/10 text-green-400",
  matching: "bg-pink-500/10 text-pink-400",
  ordering: "bg-cyan-500/10 text-cyan-400",
  case_study: "bg-red-500/10 text-red-400",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-500/10 text-green-400",
  medium: "bg-amber-500/10 text-amber-400",
  hard: "bg-red-500/10 text-red-400",
};

const fmtType = (s: string) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return "—";
  }
}

function truncate(str: string, len: number): string {
  if (!str) return "—";
  return str.length > len ? str.substring(0, len) + "…" : str;
}

export default function AdminQuestionBankPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  const [selected, setSelected] = useState<Question | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<QuestionFormData>({
    subject: "", module: "", question_text: "", question_type: "mcq",
    options_text: "", correct_answer: "", explanation: "", reference: "",
    difficulty: "medium", program: "",
  });
  const [createError, setCreateError] = useState("");

  const [editItem, setEditItem] = useState<Question | null>(null);
  const [editForm, setEditForm] = useState<QuestionFormData>({
    subject: "", module: "", question_text: "", question_type: "mcq",
    options_text: "", correct_answer: "", explanation: "", reference: "",
    difficulty: "medium", program: "",
  });
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);

  const { data: questions, isLoading, error, refetch } = useQuery<Question[]>({
    queryKey: ["admin-question-bank"],
    queryFn: async () => {
      const d = await api.get<any>("/question-bank/");
      return (d as any)?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ["admin-qb-subjects"],
    queryFn: async () => {
      const d = await api.get<any>("/subjects/");
      return (d as any)?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  const { data: modules = [] } = useQuery<any[]>({
    queryKey: ["admin-qb-modules"],
    queryFn: async () => {
      const d = await api.get<any>("/modules/");
      return (d as any)?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  const resetCreateForm = () => {
    setCreateForm({
      subject: "", module: "", question_text: "", question_type: "mcq",
      options_text: "", correct_answer: "", explanation: "", reference: "",
      difficulty: "medium", program: "",
    });
    setCreateError("");
  };

  const buildPayload = (form: typeof createForm) => ({
    subject: form.subject || null,
    module: form.module || null,
    question_text: form.question_text,
    question_type: form.question_type,
    options: form.question_type === "mcq" || form.question_type === "true_false"
      ? form.options_text.split("\n").map((s) => s.trim()).filter(Boolean)
      : [],
    correct_answer: form.correct_answer,
    explanation: form.explanation || null,
    reference: form.reference || null,
    difficulty: form.difficulty,
    program: form.program || null,
  });

  const createMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof buildPayload>) =>
      api.post("/question-bank/", payload),
    onSuccess: () => {
      showToast("success", "Question created successfully");
      setCreateOpen(false);
      resetCreateForm();
      queryClient.invalidateQueries({ queryKey: ["admin-question-bank"] });
    },
    onError: (err: any) => {
      const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message;
      setCreateError(msg || "Failed to create question");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReturnType<typeof buildPayload> }) =>
      api.patch(`/question-bank/${id}/`, payload),
    onSuccess: () => {
      showToast("success", "Question updated successfully");
      setEditItem(null);
      queryClient.invalidateQueries({ queryKey: ["admin-question-bank"] });
    },
    onError: (err: any) => {
      const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message;
      setEditError(msg || "Failed to update question");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/question-bank/${id}/`),
    onSuccess: () => {
      showToast("success", "Question deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-question-bank"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to delete question");
    },
  });

  const filtered = useMemo(() => {
    if (!questions) return [];
    let r = questions;
    if (filterValues.question_type)
      r = r.filter((q) => q.question_type === filterValues.question_type);
    if (filterValues.difficulty)
      r = r.filter((q) => q.difficulty === filterValues.difficulty);
    if (filterValues.program)
      r = r.filter((q) => q.program === filterValues.program);
    if (filterValues.subject)
      r = r.filter((q) => q.subject === filterValues.subject);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter(
        (item) =>
          item.question_text.toLowerCase().includes(q) ||
          item.correct_answer.toLowerCase().includes(q)
      );
    }
    return r;
  }, [questions, filterValues, searchValue]);

  const columns: Column<Question>[] = useMemo(
    () => [
      {
        key: "question_text",
        header: "Question",
        render: (q) => (
          <span className="text-sm font-semibold text-white">{truncate(q.question_text, 80)}</span>
        ),
      },
      {
        key: "question_type",
        header: "Type",
        render: (q) => (
          <span className={`text-xs px-2 py-0.5 rounded ${TYPE_COLORS[q.question_type] || "bg-gray-500/10 text-gray-400"}`}>
            {fmtType(q.question_type)}
          </span>
        ),
      },
      {
        key: "difficulty",
        header: "Difficulty",
        render: (q) => (
          <span className={`text-xs px-2 py-0.5 rounded ${DIFFICULTY_COLORS[q.difficulty] || "bg-gray-500/10 text-gray-400"}`}>
            {q.difficulty ? q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1) : "—"}
          </span>
        ),
      },
      {
        key: "program",
        header: "Program",
        render: (q) => (
          <span className="text-sm text-gray-300">{q.program || "—"}</span>
        ),
      },
      {
        key: "subject",
        header: "Subject",
        render: (q) => (
          <span className="text-sm text-gray-300">{q.subject_name || "—"}</span>
        ),
      },
      {
        key: "created_at",
        header: "Created",
        render: (q) => (
          <span className="text-sm text-gray-400">{formatDate(q.created_at)}</span>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (q) => (
          <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setEditItem(q);
                setEditForm({
                  subject: q.subject || "",
                  module: q.module || "",
                  question_text: q.question_text,
                  question_type: q.question_type,
                  options_text: Array.isArray(q.options) ? q.options.join("\n") : "",
                  correct_answer: q.correct_answer,
                  explanation: q.explanation || "",
                  reference: q.reference || "",
                  difficulty: q.difficulty,
                  program: q.program || "",
                });
                setEditError("");
              }}
              className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setDeleteTarget(q)}
              className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors"
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const filterOptions = useMemo(
    () => ({
      questionType: QUESTION_TYPES.map((t) => ({ value: t, label: fmtType(t) })),
      difficulty: DIFFICULTIES.map((d) => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1) })),
      program: PROGRAMS.map((p) => ({ value: p, label: p })),
      subject: subjects.map((s: any) => ({ value: s.id, label: s.title_en || s.code })),
    }),
    [subjects]
  );

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader
        title="Question Bank"
        backHref="/admin/dashboard"
        backLabel={t("common.back", "Back to Dashboard")}
        actions={
          <button
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors"
          >
            + New Question
          </button>
        }
      />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <ErrorCard
            message={(error as any)?.message || "Failed to load questions"}
            onRetry={() => refetch()}
          />
        )}

        <FilterBar
          filters={[
            {
              key: "question_type",
              label: "All Types",
              options: filterOptions.questionType,
            },
            {
              key: "difficulty",
              label: "All Difficulties",
              options: filterOptions.difficulty,
            },
            {
              key: "program",
              label: "All Programs",
              options: filterOptions.program,
            },
            {
              key: "subject",
              label: "All Subjects",
              options: filterOptions.subject,
            },
          ]}
          values={filterValues}
          onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))}
          onClear={() => {
            setFilterValues({});
            setSearchValue("");
          }}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search questions..."
        />

        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              questions?.length === 0
                ? "No questions have been created yet. Click '+ New Question' to add one."
                : "No questions match your filters."
            }
            title={questions?.length === 0 ? "No questions yet" : "No matching questions"}
            action={
              questions?.length === 0
                ? { label: "New Question", onClick: () => setCreateOpen(true) }
                : undefined
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            keyField="id"
            onRowClick={(item) => setSelected(item as Question)}
          />
        )}

        {/* Detail Modal */}
        <ModalForm
          open={!!selected}
          onClose={() => setSelected(null)}
          title="Question Details"
          wide
          footer={
            <button
              onClick={() => setSelected(null)}
              className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white"
            >
              {t("common.close", "Close")}
            </button>
          }
        >
          {selected && (
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Question</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <DetailField label="Question Text" value={selected.question_text} />
                  </div>
                  <DetailField label="Type" value={fmtType(selected.question_type)} />
                  <DetailField label="Difficulty" value={selected.difficulty ? selected.difficulty.charAt(0).toUpperCase() + selected.difficulty.slice(1) : "—"} />
                  <DetailField label="Program" value={selected.program || "—"} />
                  <DetailField label="Subject" value={selected.subject_name || "—"} />
                  <DetailField label="Module" value={selected.module_name || "—"} />
                </div>
              </section>
              {selected.options && selected.options.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Options</h3>
                  <ul className="space-y-1">
                    {selected.options.map((opt, i) => (
                      <li key={i} className="text-sm text-gray-300 px-3 py-1.5 bg-navy-700/50 rounded">
                        {opt}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section>
                <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Answer</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <DetailField label="Correct Answer" value={selected.correct_answer} />
                  </div>
                  {selected.explanation && (
                    <div className="col-span-2">
                      <DetailField label="Explanation" value={selected.explanation} />
                    </div>
                  )}
                  {selected.reference && (
                    <div className="col-span-2">
                      <DetailField label="Reference" value={selected.reference} />
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </ModalForm>

        {/* Create Modal */}
        <ModalForm
          open={createOpen}
          onClose={() => { setCreateOpen(false); resetCreateForm(); }}
          title="New Question"
          footer={
            <>
              <button
                onClick={() => { setCreateOpen(false); resetCreateForm(); }}
                disabled={createMutation.isPending}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                onClick={() => createMutation.mutate(buildPayload(createForm))}
                disabled={createMutation.isPending || !createForm.question_text || !createForm.correct_answer}
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating..." : t("common.create", "Create")}
              </button>
            </>
          }
        >
          <QuestionFormFields form={createForm} onChange={setCreateForm} subjects={subjects as any} modules={modules as any} error={createError} />
        </ModalForm>

        {/* Edit Modal */}
        <ModalForm
          open={!!editItem}
          onClose={() => setEditItem(null)}
          title="Edit Question"
          wide
          footer={
            <>
              <button
                onClick={() => setEditItem(null)}
                disabled={updateMutation.isPending}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                onClick={() => { if (editItem) updateMutation.mutate({ id: editItem.id, payload: buildPayload(editForm) }); }}
                disabled={updateMutation.isPending || !editForm.question_text || !editForm.correct_answer}
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving..." : t("common.save", "Save")}
              </button>
            </>
          }
        >
          <QuestionFormFields form={editForm} onChange={setEditForm} subjects={subjects as any} modules={modules as any} error={editError} />
        </ModalForm>

        {/* Delete Confirmation */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white">Delete Question</h3>
              <p className="text-sm text-gray-400">
                Are you sure you want to delete this question? This action cannot be undone.
              </p>
              <p className="text-sm text-gray-300 bg-navy-900 rounded px-3 py-2 line-clamp-2">
                {truncate(deleteTarget.question_text, 120)}
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMutation.mutate(deleteTarget.id)}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-sm bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-white break-words">{value}</p>
    </div>
  );
}