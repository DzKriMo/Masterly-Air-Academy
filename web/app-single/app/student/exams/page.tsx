"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { useAuthGuard } from "@/lib/use-auth-guard";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/components/toast";

interface Exam { id: string; code: string; title: string; program: string; type: string; duration: number; passing_grade: number; max_attempts: number; status: string; }
interface Attempt { id: string; exam_code: string; attempt: number; score: number | null; is_passed: boolean | null; completed_at: string | null; }
interface Quiz { id: string; module: string; module_name: string; title: string; description: string; duration: number | null; passing_grade: number | null; max_attempts: number; is_open: boolean; }
interface QuizQuestion { id: string; question_text: string; question_type: string; options: string[]; }
interface QuizResult { score: number; total: number; percentage: number; is_passed: boolean; passing_grade: number; details?: { question_id: string; question: string; your_answer: string; correct_answer: string; is_correct: boolean }[]; }

export default function StudentExamsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);

  useAuthGuard(isAuthenticated, isLoading, "/student/login");

  const loadData = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    api.get("/exams/")
      .then((d: any) => { setExams(d.results || []); setError(null); })
      .catch(err => { console.error("Failed to load exams:", err); setError(t('student.examsLoadError', "Failed to load exams. Please try again.")); })
      .finally(() => {
        api.get("/quizzes/").then((d: any) => setQuizzes(d.results || [])).catch(() => {});
        setLoading(false);
      });
    api.get("/exams/my_attempts/")
      .then((d: any) => setAttempts(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => { loadData(); }, [loadData]);

  const getAttemptCount = (examId: string) => attempts.filter(a => a.exam_code === exams.find(e => e.id === examId)?.code).length;

  const availableExams = exams.filter(e => e.status === 'published' || e.status === 'active');
  const openQuizzes = quizzes.filter(q => q.is_open);

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
      <PageHeader
        title={t('student.exams_quizzes', 'Exams & Quizzes')}
        backHref="/student/dashboard"
        backLabel={t('student.backToDashboard')}
        maxWidth="max-w-5xl"
      />

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

        {/* Quizzes */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-white mb-1">{t('student.quizzes', 'Quizzes')}</h2>
          <p className="text-sm text-gray-500 mb-4">{t('student.quizzesHint', 'Quick knowledge checks for your modules.')}</p>
          {openQuizzes.length === 0 ? (
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-8 text-center">
              <p className="text-gray-500">{t('student.noQuizzes', 'No quizzes available at this time.')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {openQuizzes.map(q => (
                <div key={q.id} className="bg-navy-800 border border-navy-700 rounded-xl p-6">
                  <span className="inline-block text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded mb-3">{q.module_name || t('student.quiz', 'Quiz')}</span>
                  <h3 className="text-white font-bold text-lg mb-1">{q.title || t('student.quiz', 'Quiz')}</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    {q.duration ? `${q.duration} ${t('student.min', 'min')} · ` : ""}{t('student.pass', 'Pass')}: {q.passing_grade ?? 50}%
                  </p>
                  <button
                    onClick={() => setActiveQuiz(q)}
                    className="w-full py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold rounded-lg text-sm transition-colors">
                    {t('student.startQuiz', 'Start Quiz')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Exams */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">{t('student.exams', 'Exams')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

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

      {activeQuiz && <QuizTaker quiz={activeQuiz} onClose={() => setActiveQuiz(null)} onDone={() => loadData()} t={t} />}
    </div>
  );
}

// ── Inline quiz taker (modal) ─────────────────────────────
function QuizTaker({ quiz, onClose, onDone, t }: { quiz: Quiz; onClose: () => void; onDone: () => void; t: any }) {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const submittedRef = useRef(false);
  const answersRef = useRef(answers);
  const quizIdRef = useRef(quiz.id);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { quizIdRef.current = quiz.id; }, [quiz.id]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    api.post(`/quizzes/${quiz.id}/start/`)
      .then((d: any) => {
        if (d.error) { showToast("error", d.error); onClose(); return; }
        setQuestions(d.questions || []);
        setTimeLeft((d.duration || quiz.duration || 15) * 60);
        setLoading(false);
      })
      .catch(err => { console.error("Failed to start quiz:", err); setError(t("exam.failedToStart")); setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, quiz.id]);

  useEffect(() => {
    if (timeLeft <= 0 || submitted) return;
    const timer = setInterval(() => setTimeLeft(t2 => t2 - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, submitted]);

  const doSubmit = async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    try {
      const res = await api.post(`/quizzes/${quizIdRef.current}/submit/`, { answers: answersRef.current });
      setResult(res as unknown as QuizResult);
      setSubmitted(true);
      onDone();
    } catch (err) {
      console.error("Failed to submit quiz:", err);
      submittedRef.current = false;
      setError(t("quiz.submitFailed", "Failed to submit quiz. Please try again."));
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  useEffect(() => {
    if (timeLeft <= 0 && !submitted && questions.length > 0) {
      showToast("warning", t("exam.autoSubmitted"));
      doSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-navy-800 border border-navy-700 rounded-2xl w-full max-w-2xl my-8">
        {error ? (
          <div className="p-6"><ErrorCard message={error} onRetry={() => { setError(null); onClose(); }} /></div>
        ) : submitted && result ? (
          <div className="p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">{t('quiz.resultTitle', 'Quiz Result')}</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">{t('common.close', 'Close')}</button>
            </div>
            <div className={`rounded-xl p-6 text-center mb-6 ${result.is_passed ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
              <p className="text-5xl font-bold mb-2" style={{ color: result.is_passed ? "#4ade80" : "#f87171" }}>{result.percentage}%</p>
              <p className="text-xl font-bold text-white">{result.is_passed ? t('exam.passed') : t('exam.failed')}</p>
              <p className="text-sm text-gray-400 mt-1">{result.score}/{result.total} · {t('student.pass', 'Pass')}: {result.passing_grade}%</p>
            </div>
            <button onClick={onClose} className="w-full py-3 bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold rounded-xl transition-colors">
              {t("common.close", "Close")}
            </button>
          </div>
        ) : loading ? (
          <div className="p-8"><LoadingSkeleton type="detail" rows={6} /></div>
        ) : (
          <div className="p-8">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-white">{quiz.title || t('student.quiz', 'Quiz')}</h2>
                <p className="text-sm text-gray-400">{questions.length} {t('exam.questionsCount')}</p>
              </div>
              <span className={`text-lg font-mono font-bold ${timeLeft < 300 ? "text-red-400" : "text-gold-500"}`}>{fmt(timeLeft)}</span>
            </div>

            <div className="w-full bg-navy-700 rounded-full h-2 mb-6">
              <div className="bg-gold-500 h-2 rounded-full transition-all" style={{ width: `${(Object.keys(answers).length / Math.max(questions.length, 1)) * 100}%` }} />
            </div>

            <div className="space-y-6">
              {questions.map((q, i) => (
                <div key={q.id} className="bg-navy-900 border border-navy-700 rounded-xl p-5">
                  <p className="text-white font-medium mb-3">{i + 1}. {q.question_text}</p>
                  <div className="space-y-2">
                    {q.question_type === "short_answer" ? (
                      <input type="text" value={answers[q.id] || ""} onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                        placeholder="Type your answer..."
                        className="w-full px-4 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm focus:border-gold-500 focus:outline-none" />
                    ) : q.question_type === "essay" ? (
                      <textarea value={answers[q.id] || ""} onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                        placeholder="Write your answer..."
                        rows={4}
                        className="w-full px-4 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm focus:border-gold-500 focus:outline-none resize-y" />
                    ) : (
                      (q.options || []).map((opt, j) => {
                        const letter = String.fromCharCode(65 + j);
                        const selected = answers[q.id] === opt;
                        return (
                          <button key={j} onClick={() => setAnswers({...answers, [q.id]: opt})}
                            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${selected ? "bg-gold-500/20 border border-gold-500 text-gold-500 font-medium" : "bg-navy-900 border border-navy-600 text-gray-300 hover:border-gray-400"}`}>
                            <span className="font-mono mr-2 text-xs">{letter}.</span> {opt}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={doSubmit} disabled={submitted}
              className="w-full mt-8 py-3.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-bold rounded-xl text-lg transition-colors">
              {t('quiz.submitQuiz', 'Submit Quiz')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}