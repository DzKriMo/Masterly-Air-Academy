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
import { StatsCard } from "@/components/stats-card";
import { ExamFormFields, type Subject, type ExamFormData } from "@/components/exam-form-fields";
import { fmtLabel, formatDateTime, toDatetimeLocal, PROGRAMS, STATUS_COLORS, TYPE_COLORS, EXAM_TYPES as TYPES, EXAM_STATUSES as STATUSES } from "@/lib/format-utils";

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
  open_date: "", close_date: "",
};

export default function AdminExamsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");
  const [selected, setSelected] = useState<Exam | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<ExamFormData>(emptyForm);
  const [mutationError, setMutationError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  const { data: exams, isLoading, error, refetch } = useQuery<Exam[]>({
    queryKey: ["admin-exams"],
    queryFn: async () => {
      const d = await api.get<any>("/exams/");
      return (d as any)?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["admin-exams-subjects"],
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
        title_ar: data.title_ar || undefined,
        title_fr: data.title_fr || undefined,
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
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
      setCreateOpen(false);
      setForm(emptyForm);
    },
    onError: (err: any) => setMutationError(err?.message || "Failed to create exam"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExamFormData> }) =>
      api.patch(`/exams/${id}/`, {
        ...data,
        ...(data.duration ? { duration: parseInt(data.duration, 10) } : {}),
        ...(data.question_count ? { question_count: parseInt(data.question_count, 10) } : {}),
        ...(data.passing_grade ? { passing_grade: parseFloat(data.passing_grade) } : {}),
        ...(data.max_attempts ? { max_attempts: parseInt(data.max_attempts, 10) } : {}),
        ...(data.open_date ? { open_date: new Date(data.open_date).toISOString() } : {}),
        ...(data.close_date ? { close_date: new Date(data.close_date).toISOString() } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
      setEditOpen(false);
    },
    onError: (err: any) => setMutationError(err?.message || "Failed to update exam"),
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
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              TYPE_COLORS[e.type] || "bg-gray-500/10 text-gray-400"
            }`}
          >
            {fmtLabel(e.type)}
          </span>
        ),
      },
      {
        key: "question_count",
        header: "Questions",
        render: (e) => (
          <span className="text-sm text-white font-mono">
            {e.question_count ?? 0}
          </span>
        ),
      },
      {
        key: "status",
        header: t("common.status", "Status"),
        render: (e) => (
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              STATUS_COLORS[e.status] || "bg-gray-500/10 text-gray-400"
            }`}
          >
            {fmtLabel(e.status)}
          </span>
        ),
      },
    ],
    [t]
  );

  const stats = useMemo(() => {
    if (!exams) return { total: 0, quiz: 0, progress_test: 0, module_exam: 0, mock_exam: 0, final_exam: 0 };
    return {
      total: exams.length,
      quiz: exams.filter((e) => e.type === "quiz").length,
      progress_test: exams.filter((e) => e.type === "progress_test").length,
      module_exam: exams.filter((e) => e.type === "module_exam").length,
      mock_exam: exams.filter((e) => e.type === "mock_exam").length,
      final_exam: exams.filter((e) => e.type === "final_exam").length,
    };
  }, [exams]);

  const openCreate = () => {
    setForm(emptyForm);
    setMutationError(null);
    setCreateOpen(true);
  };

  const openEdit = (exam: Exam) => {
    setForm({
      code: exam.code,
      title: exam.title || "",
      title_ar: "",
      title_fr: "",
      subject: exam.subject || "",
      program: exam.program,
      type: exam.type,
      duration: String(exam.duration || 60),
      question_count: String(exam.question_count || ""),
      passing_grade: String(exam.passing_grade ?? ""),
      max_attempts: String(exam.max_attempts || 3),
      status: exam.status,
      open_date: toDatetimeLocal(exam.open_date),
      close_date: toDatetimeLocal(exam.close_date),
    });
    setMutationError(null);
    setEditOpen(true);
  };

  const set = (key: keyof ExamFormData, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader
        title={t("admin.exams", "Exams")}
        backHref="/admin/dashboard"
        backLabel={t("common.back", "Back to Dashboard")}
        actions={
          <button onClick={openCreate} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors">
            + Create Exam
          </button>
        }
      />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <ErrorCard
            message={(error as any)?.message || "Failed to load exams"}
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && exams && exams.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
            <StatsCard label="Total" value={stats.total} />
            <StatsCard label="Quiz" value={stats.quiz} valueClassName="text-blue-400" />
            <StatsCard label="Progress" value={stats.progress_test} valueClassName="text-purple-400" />
            <StatsCard label="Module" value={stats.module_exam} valueClassName="text-cyan-400" />
            <StatsCard label="Mock" value={stats.mock_exam} valueClassName="text-amber-400" />
            <StatsCard label="Final" value={stats.final_exam} valueClassName="text-red-400" />
          </div>
        )}

        <FilterBar
          filters={[
            {
              key: "program",
              label: "All Programs",
              options: PROGRAMS.map((p) => ({
                value: p,
                label: p,
              })),
            },
            {
              key: "type",
              label: "All Types",
              options: TYPES.map((t) => ({
                value: t,
                label: fmtLabel(t),
              })),
            },
            {
              key: "status",
              label: "All Statuses",
              options: STATUSES.map((s) => ({
                value: s,
                label: fmtLabel(s),
              })),
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
          searchPlaceholder="Search code or title..."
        />

        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              exams?.length === 0
                ? "No exams have been created yet."
                : "No exams match your filters."
            }
            title={exams?.length === 0 ? "No exams yet" : "No matching exams"}
          />
        ) : (
          <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(item) => setSelected(item as Exam)} />
        )}

        {/* Detail Modal */}
        <ModalForm
          open={!!selected}
          onClose={() => setSelected(null)}
          title={`Exam: ${selected?.title || selected?.code || ""}`}
          wide
          footer={
            <>
              <button
                onClick={() => { if (selected) openEdit(selected); }}
                className="px-4 py-2 text-sm bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-400 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white"
              >
                {t("common.close", "Close")}
              </button>
            </>
          }
        >
          {selected && (
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">
                  Exam Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Code" value={selected.code} />
                  <DetailField label="Program" value={selected.program} />
                  <div className="col-span-2">
                    <DetailField label="Title" value={selected.title || "—"} />
                  </div>
                  <DetailField label="Type" value={fmtLabel(selected.type)} />
                  <DetailField label="Subject" value={selected.subject_label || "—"} />
                  <DetailField label="Duration" value={selected.duration ? `${selected.duration} min` : "—"} />
                  <DetailField label="Questions" value={String(selected.question_count ?? "—")} />
                  <DetailField label="Passing Grade" value={selected.passing_grade ? `${selected.passing_grade}%` : "—"} />
                  <DetailField label="Max Attempts" value={String(selected.max_attempts ?? "—")} />
                  <DetailField label="Open Date" value={formatDateTime(selected.open_date)} />
                  <DetailField label="Close Date" value={formatDateTime(selected.close_date)} />
                  <DetailField label="Status" value={fmtLabel(selected.status)} />
                </div>
              </section>
            </div>
          )}
        </ModalForm>

        {/* Create Modal */}
        <ModalForm
          open={createOpen}
          onClose={() => { setCreateOpen(false); setForm(emptyForm); setMutationError(null); }}
          title="Create Exam"
          wide
          footer={
            <>
              <button
                onClick={() => { setCreateOpen(false); setForm(emptyForm); setMutationError(null); }}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.code}
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating..." : "Create Exam"}
              </button>
            </>
          }
        >
          {mutationError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400 mb-4">{mutationError}</div>
          )}
          <ExamFormFields form={form} set={set} subjects={subjects} showTranslations />
        </ModalForm>

        {/* Edit Modal */}
        <ModalForm
          open={editOpen}
          onClose={() => { setEditOpen(false); setMutationError(null); }}
          title="Edit Exam"
          wide
          footer={
            <>
              <button onClick={() => { setEditOpen(false); setMutationError(null); }}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">
                Cancel
              </button>
              <button onClick={() => { if (selected) updateMutation.mutate({ id: selected.id, data: form }); }}
                disabled={updateMutation.isPending || !form.code}
                className="px-4 py-2 text-sm bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-400 transition-colors disabled:opacity-50">
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </>
          }
        >
          {mutationError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400 mb-4">{mutationError}</div>
          )}
          <ExamFormFields form={form} set={set} subjects={subjects} showTranslations />
        </ModalForm>
      </main>
    </div>
  );
}




