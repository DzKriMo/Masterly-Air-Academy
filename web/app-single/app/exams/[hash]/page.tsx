"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";

interface QuestionData {
  id: string; question_text: string; question_type: string;
  options: string[]; difficulty: string;
}

interface ExamState {
  assignment_id: string; exam_title: string; student_name: string;
  duration_minutes: number; started_at: string;
  questions: QuestionData[];
}

export default function ExamPortalPage() {
  const params = useParams();
  const hash = params?.hash as string || "";

  const [step, setStep] = useState<"code" | "warn" | "exam" | "done">("code");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exam, setExam] = useState<ExamState | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // ── Anti-cheat ──────────────────────────────────────────────
  const violationsRef = useRef<{ type: string; at: string; detail?: string }[]>([]);
  const countRef = useRef(0);
  const autoSubmitLockRef = useRef(false);
  const answersRef = useRef<Record<string, string>>({});
  const codeRef = useRef("");
  const MAX_VIOLATIONS = 4;
  const GRACE_MS = 15000; // ignore normal startup / fullscreen transition for 15s
  const mountedAtRef = useRef(0);
  const [warning, setWarning] = useState<{ type: string; message: string } | null>(null);

  // Keep refs in sync without loop churn
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { codeRef.current = accessCode; }, [accessCode]);

  // ── Session persistence: survive hard refresh mid-exam ─────
  const sessionKey = `maa_exam_${hash}`;
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(sessionKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.exam && saved?.accessCode) {
        setExam(saved.exam);
        setAccessCode(saved.accessCode);
        setAnswers(saved.answers || {});
        violationsRef.current = saved.violations || [];
        if (saved.violations) countRef.current = saved.violations.length;
        setStep("exam");
        const startedAt = saved.exam.started_at ? new Date(saved.exam.started_at).getTime() : Date.now();
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        setTimeLeft(Math.max(0, saved.exam.duration_minutes * 60 - elapsed));
      }
    } catch {}
  }, [sessionKey]);

  useEffect(() => {
    if (!exam || !accessCode || step === "done") return;
    try {
      sessionStorage.setItem(sessionKey, JSON.stringify({
        exam, accessCode, answers, step,
        violations: violationsRef.current,
      }));
    } catch {}
  }, [exam, accessCode, answers, step, sessionKey]);

  const recordViolation = useCallback((type: string, detail?: string): number => {
    if (Date.now() - mountedAtRef.current < GRACE_MS) return countRef.current;
    violationsRef.current.push({ type, at: new Date().toISOString(), detail });
    countRef.current += 1;
    return countRef.current;
  }, []);

  const doSubmit = useCallback(async (withViolations: boolean, force = false) => {
    if (autoSubmitLockRef.current) return { ok: false, data: null };
    autoSubmitLockRef.current = true;
    try {
      const body: Record<string, any> = { access_code: codeRef.current.trim(), answers: answersRef.current };
      if (withViolations) body.violations = violationsRef.current;
      const res = await fetch("/api/exam/submit/", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        try { sessionStorage.removeItem(`maa_exam_${hash}`); } catch {}
      }
      return { ok: res.ok, data: (data?.data ?? data) };
    } catch {
      return { ok: false, data: null };
    } finally {
      autoSubmitLockRef.current = false;
    }
  }, [hash]);

  const forceSubmit = useCallback(async (reason: string) => {
    if (autoSubmitLockRef.current) return;
    autoSubmitLockRef.current = true;
    violationsRef.current.push({ type: "auto_submit", at: new Date().toISOString(), detail: reason });
    const { ok, data } = await doSubmit(true, true);
    if (ok) {
      setResult(data);
      setStep("done");
    } else {
      autoSubmitLockRef.current = false;
      setResult({ score: null, correct: 0, total_auto_graded: 0, auto_submitted: true });
      setStep("code");
      setError("Submit failed — check your connection and try again.");
    }
  }, [doSubmit]);

  // ── Only mount anti-cheat listeners once, during the exam ─
  const antiCheatAttachedRef = useRef(false);
  useEffect(() => {
    if (step !== "exam") return;
    if (antiCheatAttachedRef.current) return;
    antiCheatAttachedRef.current = true;
    mountedAtRef.current = Date.now();

    // Block disruptive events, but only COUNT real copy/paste/cut as violations.
    // selectstart/contextmenu/dragstart fire constantly during normal use
    // (clicking options, selecting text in textareas, right-clicks) and are NOT cheating.
    const blockEvents = ["copy", "paste", "cut", "contextmenu", "selectstart", "dragstart"];
    const onBlock = (e: Event) => {
      e.preventDefault();
      if (e.type === "copy" || e.type === "paste" || e.type === "cut") {
        recordViolation("copy_paste");
      }
    };
    blockEvents.forEach(ev => document.addEventListener(ev, onBlock));

    const onVisibility = () => {
      if (document.hidden) {
        const n = recordViolation("tab_switch");
        setWarning({ type: "tab_switch", message: `Tab switch detected (${n}). Repeated violations will auto-submit your exam.` });
        if (n >= MAX_VIOLATIONS) forceSubmit("Too many tab switches");
      }
    };
    const onBlur = () => {
      const n = recordViolation("window_blur");
      setWarning({ type: "window_blur", message: `Focus lost (${n}). Stay on this tab during the exam.` });
      if (n >= MAX_VIOLATIONS) forceSubmit("Repeated focus loss");
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);

    const detectDevtools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      if (widthThreshold || heightThreshold) {
        const n = recordViolation("devtools");
        if (n >= MAX_VIOLATIONS) forceSubmit("Repeated DevTools detection");
        else setWarning({ type: "devtools", message: "DevTools detected — this is recorded." });
      }
    };
    const devInterval = setInterval(detectDevtools, 2000);

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Date.now() - mountedAtRef.current >= GRACE_MS) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    // Enter fullscreen once. Don't record the initial fullscreenchange noise.
    const enterFullscreen = () => {
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch {}
    };
    enterFullscreen();
    const onFullscreenChange = () => {
      // Only act on a real exit, after the grace period (ignores mount transition)
      if (!document.fullscreenElement && Date.now() - mountedAtRef.current >= GRACE_MS) {
        const n = recordViolation("fullscreen_exit");
        setWarning({ type: "fullscreen_exit", message: `Fullscreen exited (${n}). Return to fullscreen or the exam may auto-submit.` });
        if (n >= MAX_VIOLATIONS) forceSubmit("Exited fullscreen repeatedly");
        else enterFullscreen();
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      blockEvents.forEach(ev => document.removeEventListener(ev, onBlock));
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      clearInterval(devInterval);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [step, recordViolation, forceSubmit]);

  const handleAccess = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!accessCode.trim()) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/exam/access/", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_code: accessCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      const payload = data.data ?? data;
      setExam(payload);
      setStep("warn");
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const beginExam = () => {
    const payload = exam!;
    const elapsed = payload.started_at ? Math.floor((Date.now() - new Date(payload.started_at).getTime()) / 1000) : 0;
    setTimeLeft(Math.max(0, (payload.duration_minutes * 60) - elapsed));
    setStep("exam");
  };

  useEffect(() => {
    if (step !== "exam" || !exam) return;
    const startedAt = exam.started_at ? new Date(exam.started_at).getTime() : Date.now();
    const total = exam.duration_minutes * 60;
    const tick = () => setTimeLeft(Math.max(0, total - Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [step, exam]);

  // Auto-submit when the timer expires (00:00)
  useEffect(() => {
    if (step === "exam" && timeLeft <= 0 && !autoSubmitLockRef.current && exam) {
      setWarning({ type: "expired", message: "Time is up — submitting your exam now." });
      forceSubmit("Time expired");
    }
  }, [step, timeLeft, forceSubmit, exam]);

  const handleSubmit = async () => {
    if (submitting) return;
    if (timeLeft <= 0) { setError("Time is up!"); return; }
    if (!confirm("Submit your exam? You cannot change answers after submission.")) return;
    setSubmitting(true); setError("");
    const { ok, data } = await doSubmit(true);
    if (!ok) { setError(data?.error || "Submit failed"); setSubmitting(false); return; }
    setResult(data);
    setStep("done");
    setSubmitting(false);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (step === "done") {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center p-6">
        <div className="bg-navy-800 border border-navy-700 rounded-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Exam Submitted</h1>
          {result?.auto_submitted && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
              <p className="text-red-400 font-bold text-xl">Automatically Submitted</p>
              <p className="text-sm text-gray-400">The exam was auto-submitted due to repeated rule violations.</p>
            </div>
          )}
          {result && !result.auto_submitted && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
              <p className="text-green-400 font-bold text-xl">{result.score}%</p>
              <p className="text-sm text-gray-400">{result.correct}/{result.total_auto_graded} auto-graded correct</p>
            </div>
          )}
          <p className="text-gray-400 text-sm">Your answers have been recorded. You may now close this page.</p>
        </div>
      </div>
    );
  }

  if (step === "warn" && exam) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center p-6">
        <div className="bg-navy-800 border border-navy-700 rounded-2xl p-8 max-w-lg w-full">
          <div className="text-center mb-6">
            <Image src="/logo.png" alt="MAA" width={90} height={90} className="mx-auto" />
            <h1 className="text-xl font-bold text-white mt-3">Exam Guidelines</h1>
            <p className="text-sm text-gray-400 mt-1">{exam.exam_title}</p>
          </div>
          <div className="space-y-3 mb-6">
            <p className="text-sm text-gray-300">By beginning this exam you agree to the following rules:</p>
            <ul className="space-y-2 text-sm text-gray-300 list-disc pl-5">
              <li>You are monitored while the exam is open.</li>
              <li>The exam runs in fullscreen. Leaving fullscreen is logged.</li>
              <li>Switching tabs or windows is logged and treated as a violation.</li>
              <li>Copying, pasting or opening developer tools is prohibited.</li>
              <li>Repeated violations ({MAX_VIOLATIONS}+) will automatically submit your exam.</li>
              <li>Your access will NOT expire due to inactivity while taking the exam.</li>
            </ul>
          </div>
          <button onClick={beginExam} disabled={loading} className="w-full py-3 bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold rounded-lg">
            I understand — Begin Exam
          </button>
        </div>
      </div>
    );
  }

  if (step === "exam" && exam) {
    return (
      <div className="min-h-screen bg-navy-900">
        {warning && (
          <div className="fixed top-0 inset-x-0 z-50 bg-red-600/95 text-white text-center text-sm font-semibold px-4 py-2.5">
            {warning.message}
          </div>
        )}
        <div className="sticky top-0 z-40 bg-navy-800 border-b border-navy-700 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-sm">{exam.exam_title}</p>
            <p className="text-xs text-gray-400">{exam.student_name}</p>
          </div>
          <div className={`text-lg font-bold font-mono ${timeLeft < 300 ? "text-red-400 animate-pulse" : "text-gold-500"}`}>
            {formatTime(timeLeft)}
          </div>
          <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-bold rounded-lg text-sm">
            {submitting ? "..." : "Submit"}
          </button>
        </div>

        <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
          {exam.questions.map((q, i) => (
            <div key={q.id} className="bg-navy-800 border border-navy-700 rounded-xl p-5">
              <div className="flex items-start gap-2 mb-3">
                <span className="text-gold-500 font-bold text-sm shrink-0">{i + 1}.</span>
                <span className="text-white text-sm">{q.question_text}</span>
              </div>
              {q.question_type === "mcq" || q.question_type === "scq" ? (
                <div className="space-y-2 ml-4">
                  {(q.options || []).map((opt, j) => (
                    <label key={j} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      answers[q.id] === opt ? "border-gold-500 bg-gold-500/10" : "border-navy-600 hover:border-navy-500"
                    }`}>
                      <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt} onChange={e => setAnswers({...answers, [q.id]: e.target.value})} className="text-gold-500" />
                      <span className="text-sm text-gray-300">{opt}</span>
                    </label>
                  ))}
                </div>
              ) : q.question_type === "true_false" ? (
                <div className="flex gap-4 ml-4">
                  {["True", "False"].map(v => (
                    <label key={v} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      answers[q.id] === v ? "border-gold-500 bg-gold-500/10" : "border-navy-600 hover:border-navy-500"
                    }`}>
                      <input type="radio" name={q.id} value={v} checked={answers[q.id] === v} onChange={e => setAnswers({...answers, [q.id]: e.target.value })} className="text-gold-500" />
                      <span className="text-sm text-gray-300">{v}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea value={answers[q.id] || ""} onChange={e => setAnswers({...answers, [q.id]: e.target.value })} rows={4} className="w-full ml-4 px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" placeholder="Type your answer..." />
              )}
            </div>
          ))}

          {exam.questions.length === 0 && (
            <p className="text-center text-gray-500 py-10">No questions loaded.</p>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-6">
      <div className="bg-navy-800 border border-navy-700 rounded-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="MAA" width={100} height={100} className="mx-auto" />
          <h1 className="text-xl font-bold text-white mt-4">Final Exam Portal</h1>
          <p className="text-sm text-gray-400 mt-1">Enter the access code provided by the exam supervisor</p>
        </div>
        <form onSubmit={handleAccess} className="space-y-4">
          <input type="text" value={accessCode} onChange={e => setAccessCode(e.target.value.toUpperCase())} placeholder="Access code" className="w-full px-4 py-3 bg-navy-900 border border-navy-600 rounded-lg text-white text-center text-lg font-mono tracking-widest placeholder-gray-600 focus:border-gold-500 focus:outline-none" autoFocus />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading || !accessCode.trim()} className="w-full py-3 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-bold rounded-lg">
            {loading ? "Verifying..." : "Start Exam"}
          </button>
        </form>
      </div>
    </div>
  );
}