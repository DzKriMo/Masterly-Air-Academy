"use client";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useTranslation } from "@/lib/use-translation";
import { PageHeader } from "@/components/page-header";
import { api, unwrapResults } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";
import { DetailField } from "@/components/detail-field";

interface QA {
  id: string; quiz: string; student: string; student_name: string;
  score: string; started_at: string; completed_at: string | null;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; }
}

export default function AdminQuizAttemptsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<QA | null>(null);

  const { data: records, isLoading, error, refetch } = useQuery<QA[]>({
    queryKey: ["admin-qa"],
    queryFn: async () => { const d = await api.get<any>("/quiz-attempts/"); return unwrapResults(d); },
    enabled: isAuthenticated,
  });

  const filtered = useMemo(() => {
    if (!records) return [];
    let r = records;
    if (searchValue) { const q = searchValue.toLowerCase(); r = r.filter((a) => (a.student_name || "").toLowerCase().includes(q)); }
    return r;
  }, [records, searchValue]);

  const columns: Column<QA>[] = useMemo(() => [
    { key: "student_name", header: "Student", render: (a) => <span className="text-sm font-semibold text-white">{a.student_name}</span> },
    { key: "score", header: "Score", render: (a) => <span className="text-sm text-gold-500 font-semibold">{a.score}</span> },
    { key: "started_at", header: "Started", render: (a) => <span className="text-sm text-gray-300">{fmtDate(a.started_at)}</span> },
    { key: "completed_at", header: "Completed", render: (a) => <span className="text-sm text-gray-300">{fmtDate(a.completed_at)}</span> },
  ], []);

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader title={t("admin.quizAttempts", "Quiz Attempts")} backHref="/admin/dashboard" backLabel={t("common.back", "Back")} />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={error?.message || "Failed"} onRetry={() => refetch()} />}
        {isLoading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? (
          <EmptyState message={records?.length === 0 ? "No quiz attempts yet." : "No matches."} title={records?.length === 0 ? "No attempts" : "No matches"} />
        ) : <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(i) => setSelected(i as QA)} />}

        <ModalForm open={!!selected} onClose={() => setSelected(null)} title="Quiz Attempt Details" footer={<button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">{t('common.close')}</button>}>
          {selected && <div className="space-y-4">
            <DetailField label="Student" value={selected.student_name} />
            <DetailField label="Score" value={selected.score} />
            <DetailField label="Started" value={fmtDate(selected.started_at)} />
            <DetailField label="Completed" value={fmtDate(selected.completed_at)} />
          </div>}
        </ModalForm>
      </main>
    </div>
  );
}


