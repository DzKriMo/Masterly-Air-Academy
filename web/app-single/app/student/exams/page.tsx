"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import type { FilterOption } from "@/components/filter-bar";

interface Exam { id: string; code: string; title: string; program: string; type: string; duration: number; passing_grade: number; max_attempts: number; status: string; }
interface Attempt { id: string; exam_code: string; attempt: number; score: number | null; is_passed: boolean | null; completed_at: string | null; }

export default function StudentExamsPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/student/login"); } }, [isLoading, isAuthenticated, router]);

  const loadData = () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    api.get("/exams/")
      .then((d: any) => { setExams(d.results || []); setError(null); })
      .catch(err => { console.error("Failed to load exams:", err); setError(t('student.examsLoadError', "Failed to load exams. Please try again.")); })
      .finally(() => setLoading(false));
    api.get("/exams/my_attempts/")
      .then((d: any) => setAttempts(Array.isArray(d) ? d : []))
      .catch(() => {});
  };

  useEffect(() => { loadData(); }, [isAuthenticated]);

  const getAttemptCount = (examId: string) => attempts.filter(a => a.exam_code === exams.find(e => e.id === examId)?.code).length;

  const availableExams = exams.filter(e => e.status === 'published' || e.status === 'active');

  const filterOptions: FilterOption[] = [
    { key: "type", label: t('common.allTypes', 'All Types'), options: [
      { value: "theory", label: t('student.examTypeTheory', 'Theory') },
      { value: "practical", label: t('student.examTypePractical', 'Practical') },
    ]},
  ];

  const filteredExams = availableExams.filter(e => {
    if (filters.type && e.type !== filters.type) return false;
    if (search && !e.title?.toLowerCase().includes(search.toLowerCase()) && !e.code?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const attemptColumns: Column<Attempt>[] = [
    { key: "exam_code", header: t('common.examCode', 'Exam Code'), render: (item) => <span className="text-white font-medium">{item.exam_code}</span> },
    { key: "attempt", header: t('common.attempt', 'Attempt'), render: (item) => <span className="text-xs text-gray-500">#{item.attempt}</span> },
    { key: "score", header: t('common.score', 'Score'), render: (item) => (
      <span className={`text-sm font-bold ${item.is_passed ? "text-green-400" : item.score !== null ? "text-red-400" : "text-gray-500"}`}>
        {item.score !== null ? `${item.score}%` : t('student.inProgress', 'In progress')}
      </span>
    )},
    { key: "is_passed", header: t('common.result', 'Result'), render: (item) => item.is_passed ? (
      <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">{t('passed')}</span>
    ) : item.score !== null ? (
      <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded">{t('failed')}</span>
    ) : null },
    { key: "completed_at", header: t('common.date'), render: (item) => item.completed_at ? new Date(item.completed_at).toLocaleDateString() : "-" },
  ];

  if (loading) return <div className="min-h-screen bg-navy-900 flex items-center justify-center"><LoadingSkeleton type="card" rows={4} /></div>;

  return (
    <div className="min-h-screen bg-navy-900">
      {error && <div className="max-w-5xl mx-auto px-6 pt-4"><ErrorCard message={error} onRetry={loadData} /></div>}
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-3">
          <Image src="/logo.png" alt="MAA" width={110} height={110} />
          <div><h1 className="text-lg font-bold text-white">{t('student.exams')}</h1>
            <button onClick={() => router.push("/student/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">{t('student.backToDashboard')}</button></div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <FilterBar
          filters={filterOptions}
          values={filters}
          onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
          onClear={() => { setFilters({}); setSearch(""); }}
          searchPlaceholder={t('student.searchExams', 'Search exams...')}
          searchValue={search}
          onSearchChange={setSearch}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {filteredExams.map(e => {
            const taken = getAttemptCount(e.id);
            return (
              <div key={e.id} className="bg-navy-800 border border-navy-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono">{e.code}</span>
                  <span className="text-xs text-gray-500">{e.program}</span>
                </div>
                <h3 className="text-white font-bold text-lg mb-1">{e.title || e.code}</h3>
                <p className="text-sm text-gray-400 mb-4">{e.duration} {t('student.min', 'min')} | {t('student.pass', 'Pass')}: {e.passing_grade}% | {taken}/{e.max_attempts} {t('student.attempts', 'attempts')}</p>
                <button
                  onClick={() => router.push(`/student/exams/${e.id}`)}
                  disabled={taken >= e.max_attempts}
                  className="w-full py-2.5 bg-gold-500 hover:bg-gold-600 disabled:bg-gray-600 disabled:text-gray-400 text-navy-900 font-bold rounded-lg text-sm transition-colors">
                  {taken >= e.max_attempts ? t('maxAttempts') : taken > 0 ? `${t('retakeExam')} (${taken}/${e.max_attempts})` : t('startExam')}
                </button>
              </div>
            );
          })}
        </div>
        {filteredExams.length === 0 && (
          <EmptyState message={t('student.noExams', 'No exams available at this time.')} />
        )}

        {/* Past attempts */}
        {attempts.length > 0 && (
          <div className="mt-10">
            <h3 className="text-lg font-bold text-white mb-4">{t('myResults')}</h3>
            <DataTable
              columns={attemptColumns}
              data={attempts as any}
              keyField="id"
              emptyMessage={t('student.noAttempts', 'No attempts recorded.')}
            />
          </div>
        )}
      </main>
    </div>
  );
}
