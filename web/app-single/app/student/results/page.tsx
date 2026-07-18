"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table";
import type { Column } from "@/components/data-table";

interface Attempt {
  id: string;
  exam_code: string;
  exam_title: string;
  subject: string;
  score: number | null;
  is_passed: boolean | null;
  completed_at: string | null;
  attempt: number;
}

interface PracticalEval {
  id: string;
  date: string;
  lesson_type: string;
  grade: string;
  result: string;
  instructor_name: string;
}

interface Competency {
  id: string;
  name: string;
  status: string;
  program: string;
  description?: string;
}

type Tab = "theory" | "practical" | "competencies";

export default function StudentResultsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("theory");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [evals, setEvals] = useState<PracticalEval[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const programs = ["PPL", "CPL", "IR", "MEP", "MCC"];

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/student/login"); } }, [isLoading, isAuthenticated, router]);

  const loadData = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    Promise.all([
      api.get("/exams/my_attempts/").catch(() => []),
      api.get("/practical-evaluations/").catch(() => ({ results: [] })),
      api.get("/competencies/").catch(() => ({ results: [] })),
    ]).then(([attData, evalData, compData]: any) => {
      setAttempts(Array.isArray(attData) ? attData : []);
      setEvals(evalData.results || []);
      setCompetencies(compData.results || []);
      setError(null);
    }).catch(err => {
      console.error("Failed to load results:", err);
      setError(t('student.resultsLoadError', "Failed to load results. Please try again."));
    }).finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => { loadData(); }, [loadData]);

  // Summary calculations
  const passedCount = attempts.filter(a => a.is_passed === true).length;
  const failedCount = attempts.filter(a => a.is_passed === false).length;
  const totalAttempts = attempts.length;
  const passRate = totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0;
  const scores = attempts.filter(a => a.score !== null).map(a => a.score as number);
  const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const bestSubject = attempts.length > 0 ? attempts.reduce((best, curr) => (curr.score || 0) > (best.score || 0) ? curr : best, attempts[0]).exam_title || attempts[0].subject || "-" : "-";

  const tabs: { key: Tab; label: string }[] = [
    { key: "theory", label: t('student.theory', 'Theory') },
    { key: "practical", label: t('student.practical', 'Practical') },
    { key: "competencies", label: t('student.competencies', 'Competencies') },
  ];

  const attemptColumns: Column<Attempt>[] = [
    { key: "exam_title", header: t('common.exam', 'Exam'), render: (item) => <span className="text-white font-medium">{item.exam_title || item.exam_code}</span> },
    { key: "subject", header: t('common.subject', 'Subject') },
    { key: "score", header: t('common.score', 'Score %'), render: (item) => (
      <span className={`text-sm font-bold ${item.is_passed ? "text-green-400" : item.score !== null ? "text-red-400" : "text-gray-500"}`}>
        {item.score !== null ? `${item.score}%` : t('student.inProgress', 'In progress')}
      </span>
    )},
    { key: "is_passed", header: t('common.result', 'Result'), render: (item) => item.is_passed === true ? (
      <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">{t('exams_passed', 'Pass')}</span>
    ) : item.is_passed === false ? (
      <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded">{t('exams_failed', 'Fail')}</span>
    ) : <span className="text-xs text-gray-500">-</span> },
    { key: "completed_at", header: t('common.date'), render: (item) => item.completed_at ? new Date(item.completed_at).toLocaleDateString() : "-" },
    { key: "attempt", header: t('common.attempt', 'Attempt #'), render: (item) => <span className="text-xs text-gray-500">#{item.attempt}</span> },
  ];

  const evalColumns: Column<PracticalEval>[] = [
    { key: "date", header: t('common.date'), render: (item) => <span className="text-gray-400">{new Date(item.date).toLocaleDateString()}</span> },
    { key: "lesson_type", header: t('common.lessonType', 'Lesson Type') },
    { key: "grade", header: t('common.grade', 'Grade'), render: (item) => <span className="text-white font-bold">{item.grade}</span> },
    { key: "result", header: t('common.result', 'Result'), render: (item) => (
      <span className={`text-xs px-2 py-0.5 rounded ${item.result === "pass" ? "bg-green-500/10 text-green-400" : item.result === "fail" ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"}`}>{item.result}</span>
    )},
    { key: "instructor_name", header: t('common.instructor', 'Instructor') },
  ];

  // Build competency matrix: program -> competency name -> Competency object
  const compMatrix: Record<string, Record<string, Competency>> = {};
  const compNameSet = new Set<string>();
  competencies.forEach(c => {
    if (!compMatrix[c.program]) compMatrix[c.program] = {};
    compMatrix[c.program][c.name] = c;
    compNameSet.add(c.name);
  });
  const allCompetencyNames = Array.from(compNameSet).sort();

  const compBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      acquired: "bg-green-500/10 text-green-400 border-green-500/30",
      in_progress: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
      not_started: "bg-gray-500/10 text-gray-400 border-gray-500/30",
      needs_reinforcement: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    };
    return `${colors[status] || "bg-gray-500/10 text-gray-400 border-gray-500/30"} border`;
  };

  return (<div className="min-h-screen bg-navy-900">
    <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">{t('student.results', 'Results')}</h1>
      </div>
    </nav>
    <main className="max-w-5xl mx-auto px-6 py-8">
      {error && <ErrorCard message={error} onRetry={loadData} />}
      {loading ? <LoadingSkeleton type="card" rows={4} /> : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-navy-800 rounded-xl border border-navy-700 p-6">
              <p className="text-sm text-gray-400 mb-1">{t('student.examsTaken', 'Exams Taken')}</p>
              <p className="text-3xl font-bold text-white">{totalAttempts}</p>
            </div>
            <div className="bg-navy-800 rounded-xl border border-navy-700 p-6">
              <p className="text-sm text-gray-400 mb-1">{t('student.passRate', 'Pass Rate')}</p>
              <p className="text-3xl font-bold text-green-400">{passRate}%</p>
            </div>
            <div className="bg-navy-800 rounded-xl border border-navy-700 p-6">
              <p className="text-sm text-gray-400 mb-1">{t('student.averageScore', 'Average Score')}</p>
              <p className={`text-3xl font-bold ${averageScore >= 75 ? 'text-green-400' : averageScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{averageScore}%</p>
            </div>
            <div className="bg-navy-800 rounded-xl border border-navy-700 p-6">
              <p className="text-sm text-gray-400 mb-1">{t('student.bestSubject', 'Best Subject')}</p>
              <p className="text-lg font-bold text-white truncate">{bestSubject}</p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-1 mb-6 bg-navy-800 rounded-lg p-1 border border-navy-700 w-fit">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === tab.key ? "bg-gold-500 text-navy-900 font-semibold" : "text-gray-400 hover:text-white"}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Theory Tab */}
          {activeTab === "theory" && (
            attempts.length === 0
              ? <EmptyState message={t('student.noAttempts', 'No exam attempts yet.')} />
              : <DataTable columns={attemptColumns} data={attempts as any} keyField="id" emptyMessage={t('student.noAttempts', 'No exam attempts yet.')} />
          )}

          {/* Practical Tab */}
          {activeTab === "practical" && (
            evals.length === 0
              ? <EmptyState message={t('student.noPracticalEvals', 'No practical evaluations yet.')} />
              : <DataTable columns={evalColumns} data={evals as any} keyField="id" emptyMessage={t('student.noPracticalEvals', 'No practical evaluations yet.')} />
          )}

          {/* Competencies Tab — Matrix Grid */}
          {activeTab === "competencies" && (
            competencies.length === 0
              ? <EmptyState message={t('student.noCompetencies', 'No competencies recorded yet.')} />
              : <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-navy-700 bg-navy-800/50">
                          <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wider font-medium w-1/3">
                            {t('student.competency', 'Competency')}
                          </th>
                          {programs.map(prog => (
                            <th key={prog} className="px-3 py-3 text-center text-xs text-gray-500 uppercase tracking-wider font-medium">
                              {prog}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {allCompetencyNames.map((compName, idx) => (
                          <tr key={compName} className={`border-b border-navy-700/50 ${idx % 2 === 0 ? 'bg-navy-800/30' : ''} hover:bg-navy-700/20 transition-colors`}>
                            <td className="px-4 py-3 text-white text-sm font-medium">{compName}</td>
                            {programs.map(prog => {
                              const comp = compMatrix[prog]?.[compName];
                              return (
                                <td key={prog} className="px-3 py-3 text-center">
                                  {comp ? (
                                    <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${compBadgeColor(comp.status)}`}>
                                      {comp.status.replace(/_/g, ' ')}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-600">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
          )}
        </>
      )}
    </main></div>);
}
