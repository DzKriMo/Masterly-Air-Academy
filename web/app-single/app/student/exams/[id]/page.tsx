"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { useToast } from "@/components/toast";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { PageHeader } from "@/components/page-header";

interface Question { id: string; question_text: string; question_type: string; options: string[]; }
interface Result { score: number; total: number; percentage: number; is_passed: boolean; passing_grade: number; details: { question_id: string; question: string; your_answer: string; correct_answer: string; is_correct: boolean }[]; }

export default function TakeExamPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const examId = params?.id as string;
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [duration, setDuration] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(true);
  const [cheatWarnings, setCheatWarnings] = useState(0);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const submittedRef = useRef(false);
  const answersRef = useRef(answers);
  const attemptIdRef = useRef(attemptId);
  const examIdRef = useRef(examId);
  const deadlineRef = useRef(0);

  useAuthGuard(isAuthenticated, isLoading, "/student/login");

  const startExam = () => {
    if (!isAuthenticated || !examId || showModal) return;
    setLoading(true);
    setError(null);
    api.post(`/exams/${examId}/start/`)
      .then((d: any) => {
        if (d.error) { showToast("error", d.error); router.push("/student/exams"); return; }
        setQuestions(d.questions || []);
        setAttemptId(d.attempt_id);
        setDuration(d.duration || 30);
        setTimeLeft((d.duration || 30) * 60);
        deadlineRef.current = Date.now() + (d.duration || 30) * 60 * 1000;
        setLoading(false);
        setError(null);
      })
      .catch(err => { console.error("Failed to start exam:", err); setError(t("exam.failedToStart")); setLoading(false); });
  };

  useEffect(() => {
    if (!isAuthenticated || !examId || showModal) return;
    startExam();
  }, [isAuthenticated, examId, showModal]);

  useEffect(() => {
    if (timeLeft <= 0 || submitted) return;
    const timer = setInterval(() => {
      // Drift-check against the absolute deadline instead of trusting interval ticks
      const remaining = deadlineRef.current ? Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000)) : 0;
      if (deadlineRef.current && remaining <= 0) {
        setTimeLeft(0);
      } else if (deadlineRef.current) {
        setTimeLeft(remaining);
      } else {
        setTimeLeft(t => t - 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, submitted]);

  // Keep refs in sync so the tab detector always has current values
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { attemptIdRef.current = attemptId; }, [attemptId]);
  useEffect(() => { examIdRef.current = examId; }, [examId]);

  // Restore answers saved from a failed submit so a reload/retry can pick up where it left off
  useEffect(() => {
    if (!isAuthenticated || !examId) return;
    try {
      const saved = sessionStorage.getItem(`exam-${examId}-answers`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          setAnswers(parsed);
        }
      }
    } catch (e) { /* ignore */ }
  }, [isAuthenticated, examId]);

  const doSubmit = async (extra?: Record<string, unknown>) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    try {
      const res = await api.post(`/exams/${examIdRef.current}/submit/`, {
        attempt_id: attemptIdRef.current,
        answers: answersRef.current,
        ...extra,
      });
      try { sessionStorage.removeItem(`exam-${examIdRef.current}-answers`); } catch (e) { /* ignore */ }
      setResult(res as unknown as Result);
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit exam:", err);
      submittedRef.current = false;
      setError(t("exam.submitFailed", "Failed to submit exam. Please try again."));
      try {
        sessionStorage.setItem(`exam-${examIdRef.current}-answers`, JSON.stringify(answersRef.current));
      } catch (e) { /* ignore */ }
    }
  };

  const handleSubmit = () => { doSubmit(); };

  // Tab-switch detection: 1 visible warning, then force-submit on 2nd switch.
  // Violations are recorded server-side for an audit trail (same as the final-exam portal).
  useEffect(() => {
    let violations = 0;
    let cooldown = false;
    const record = (type: string) => {
      try {
        window.dispatchEvent(new CustomEvent("maa:exam-violation", { detail: { type, at: new Date().toISOString() } }));
      } catch {}
    };
    const onHide = () => {
      if (submittedRef.current || cooldown) return;
      cooldown = true;
      setTimeout(() => { cooldown = false; }, 5000);
      violations++;
      record("tab_switch");
      if (violations === 1) {
        setCheatWarnings(1);
        showToast("warning", t("exam.tabSwitchWarning"));
      } else {
        setAutoSubmitted(true);
        showToast("error", t("exam.autoSubmitted"));
        doSubmit({ violations: [{ type: "auto_submit", at: new Date().toISOString() }, { type: "tab_switch", at: new Date().toISOString() }] });
      }
    };
    const handler = () => { if (document.hidden) onHide(); };
    document.addEventListener("visibilitychange", handler);
    return () => {
      document.removeEventListener("visibilitychange", handler);
    };
  }, []);

  useEffect(() => {
    if (timeLeft <= 0 && !submitted && questions.length > 0) {
      setAutoSubmitted(true);
      showToast("warning", t("exam.autoSubmitted"));
      doSubmit({ violations: [{ type: "auto_submit", at: new Date().toISOString() }] });
    }
  }, [timeLeft]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // Anti-cheat modal shown before exam starts (must be first)
  if (showModal) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center px-4">
        <div className="bg-navy-800 border border-navy-700 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-3">{t("exam.antiCheatTitle")}</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-2">
            {t("exam.antiCheatDesc")}
          </p>
          <p className="text-red-400 text-sm font-medium mb-6">
            {t("exam.antiCheatWarningFirst")}
          </p>
          <button
            onClick={() => { setShowModal(false); setLoading(true); }}
            className="w-full py-3 bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold rounded-xl transition-colors"
          >
            {t("exam.understand")}
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen bg-navy-900 flex items-center justify-center"><LoadingSkeleton type="detail" rows={6} /></div>;

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-navy-900">
        <PageHeader
            title={t("exam.resultsTitle")}
            backHref="/student/exams"
            backLabel={t("exam.backToExams")}
            maxWidth="max-w-4xl"
          />
        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className={`rounded-xl p-8 mb-8 text-center ${result.is_passed ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
            <p className="text-5xl font-bold mb-2" style={{ color: result.is_passed ? "#4ade80" : "#f87171" }}>{result.percentage}%</p>
            <p className="text-xl font-bold text-white">{result.is_passed ? t("exam.passed") : t("exam.failed")}</p>
            <p className="text-sm text-gray-400 mt-1">{result.score}/{result.total} {t("exam.correctPassing")} {result.passing_grade}%</p>
          </div>
          {autoSubmitted && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
              {t("exam.autoSubmitted")}
            </div>
          )}
          <h3 className="text-lg font-bold text-white mb-4">{t("exam.questionBreakdown")}</h3>
          <div className="space-y-3">
            {result.details.map((d, i) => (
              <div key={i} className={`p-4 rounded-lg border ${d.is_correct ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                <p className="text-white text-sm font-medium mb-2">{i + 1}. {d.question}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-gray-500">{t("exam.yourAnswer")}</span> <span className={d.is_correct ? "text-green-400" : "text-red-400"}>{d.your_answer || t("exam.empty")}</span></div>
                  <div><span className="text-gray-500">{t("exam.correctAnswer")}</span> <span className="text-green-400">{d.correct_answer}</span></div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900">
      {error && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50"><ErrorCard message={error} onRetry={startExam} /></div>}
      <PageHeader
        title={t("exam.inProgress")}
        maxWidth="max-w-4xl"
        actions={
          <span className={`text-lg font-mono font-bold ${timeLeft < 300 ? "text-red-400" : "text-gold-500"}`}>{fmt(timeLeft)}</span>
        }
      />
      <main className="max-w-4xl mx-auto px-6 py-8">
        {cheatWarnings > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce">
            <div className="bg-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl text-sm font-medium max-w-sm text-center">
              {t("exam.tabSwitchWarning")}
            </div>
          </div>
        )}
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-6">
          <p className="text-sm text-gray-400 mb-1">{questions.length} {t("exam.questionsCount")}</p>
          <div className="w-full bg-navy-700 rounded-full h-2">
            <div className="bg-gold-500 h-2 rounded-full transition-all" style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">{Object.keys(answers).length}/{questions.length} {t("exam.answeredCount")}</p>
        </div>

        <div className="space-y-6">
          {questions.map((q, i) => (
            <div key={q.id} className="bg-navy-800 border border-navy-700 rounded-xl p-5">
              <p className="text-white font-medium mb-3">{i + 1}. {q.question_text}</p>
              <div className="space-y-2">
                {q.question_type === "short_answer" ? (
                  <input type="text" value={answers[q.id] || ""} onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                    placeholder={t("exam.typeAnswer")}
                    className="w-full px-4 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm focus:border-gold-500 focus:outline-none" />
                ) : q.question_type === "essay" ? (
                  <textarea value={answers[q.id] || ""} onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                    placeholder={t("exam.writeAnswer")}
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

        <button onClick={handleSubmit} disabled={submitted}
          className="w-full mt-8 py-3.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-bold rounded-xl text-lg transition-colors">
          {t("exam.submitExam")}
        </button>
      </main>
    </div>
  );
}
