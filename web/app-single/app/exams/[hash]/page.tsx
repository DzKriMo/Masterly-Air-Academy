"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";

interface QuestionData {
  id: string; question_text: string; question_type: string;
  options: string[]; difficulty: string;
}

interface ExamState {
  assignment_id: string; exam_title: string; student_name: string;
  duration_minutes: number; started_at: string;
  remaining_seconds?: number;
  questions: QuestionData[];
}

/**
 * Remaining time in seconds, server-authoritative when available. Deriving it
 * from the device clock (`Date.now() - new Date(started_at)`) breaks when the
 * device clock is off by an hour: the countdown is stretched/shrunk by exactly
 * that offset. The server's `remaining_seconds` is timezone/clock independent,
 * so it is used whenever present.
 */
function remainingFrom(exam: ExamState, startedAt?: string | null): number {
  if (exam.remaining_seconds != null) return Math.max(0, exam.remaining_seconds);
  const epoch = startedAt ? new Date(startedAt).getTime() : Date.now();
  const elapsed = Math.floor((Date.now() - epoch) / 1000);
  return Math.max(0, exam.duration_minutes * 60 - elapsed);
}

export default function ExamPortalPage() {
  const params = useParams();
  const hash = params?.hash as string || "";
  const { t } = useTranslation();

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
  const seriousCountRef = useRef(0);
  const autoSubmitLockRef = useRef(false);
  const answersRef = useRef<Record<string, string>>({});
  const codeRef = useRef("");
  const deadlineRef = useRef(0);
  const SERIOUS_TYPES = new Set(["tab_switch", "window_blur", "fullscreen_exit", "copy_paste", "right_click", "devtools"]);
  const FLAG_THRESHOLD = 2;   // 2 serious violations -> flagged for review
  const SUBMIT_THRESHOLD = 3; // 3 serious violations -> forced auto-submit
  const GRACE_MS = 5000; // ignore normal startup / fullscreen transition for 5s
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
        if (saved.violations) {
          countRef.current = saved.violations.length;
          seriousCountRef.current = saved.violations.filter((v: any) => SERIOUS_TYPES.has(v?.type)).length;
        }
        setStep("exam");
        // Stored deadline is device-clock-relative, so its clock skew cancels
        // out when compared against Date.now(). Re-sync with the server after.
        const remaining = saved.deadline
          ? Math.max(0, Math.round((saved.deadline - Date.now()) / 1000))
          : remainingFrom(saved.exam, saved.exam.started_at);
        deadlineRef.current = saved.deadline || Date.now() + remaining * 1000;
        setTimeLeft(remaining);
        api.post("/exam/access/", { access_code: saved.accessCode })
          .then((fresh: any) => {
            if (fresh?.remaining_seconds != null && codeRef.current === saved.accessCode) {
              deadlineRef.current = Date.now() + fresh.remaining_seconds * 1000;
              setTimeLeft(fresh.remaining_seconds);
            }
          })
          .catch(() => {});
      }
    } catch {}
  }, [sessionKey]);

  useEffect(() => {
    if (!exam || !accessCode || step === "done") return;
    try {
      sessionStorage.setItem(sessionKey, JSON.stringify({
        exam, accessCode, answers, step,
        violations: violationsRef.current,
        deadline: deadlineRef.current,
      }));
    } catch {
      // SessionStorage quota exceeded — nothing we can do, but the exam continues
    }
  }, [exam, accessCode, answers, step, sessionKey]);

  const recordViolation = useCallback((type: string, detail?: string): number => {
    if (Date.now() - mountedAtRef.current < GRACE_MS) return seriousCountRef.current;
    violationsRef.current.push({ type, at: new Date().toISOString(), detail });
    countRef.current += 1;
    if (SERIOUS_TYPES.has(type)) seriousCountRef.current += 1;
    return seriousCountRef.current;
  }, []);

  const doSubmit = useCallback(async (withViolations: boolean, force = false) => {
    if (autoSubmitLockRef.current) return { ok: false, data: null };
    autoSubmitLockRef.current = true;
    try {
      const body: Record<string, any> = { access_code: codeRef.current.trim(), answers: answersRef.current };
      if (withViolations) body.violations = violationsRef.current;
      const data = await api.post("/exam/submit/", body);
      try { sessionStorage.removeItem(`maa_exam_${hash}`); } catch {}
      return { ok: true, data };
    } catch (err: any) {
      if (typeof err?.message === "string" && err.message.toLowerCase().includes("already submitted")) {
        try { sessionStorage.removeItem(`maa_exam_${hash}`); } catch {}
        return { ok: true, data: { status: "submitted", auto_submitted: true } };
      }
      return { ok: false, data: null };
    } finally {
      autoSubmitLockRef.current = false;
    }
  }, [hash]);

  // Real-time server persistence: report violations + answers so a closed tab
  // or dropped connection cannot erase the anti-cheat trail.
  const sendHeartbeat = useCallback(async () => {
    if (!codeRef.current.trim() || autoSubmitLockRef.current) return;
    try {
      const res = await api.post<any>("/exam/heartbeat/", {
        access_code: codeRef.current.trim(),
        violations: violationsRef.current,
        answers: answersRef.current,
      });
      // Re-anchor the deadline from the server every heartbeat so clock drift
      // (or a device clock that is off by an hour) can never affect the countdown.
      if (res?.remaining_seconds != null) {
        deadlineRef.current = Date.now() + res.remaining_seconds * 1000;
        setTimeLeft(Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000)));
      }
      if (res?.status === "submitted" && !autoSubmitLockRef.current) {
        try { sessionStorage.removeItem(`maa_exam_${hash}`); } catch {}
        setResult({ score: res.score ?? null, correct: 0, total_auto_graded: 0, auto_submitted: true });
        setStep("done");
      }
    } catch {}
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
      setError(t("examPortal.submitFailedConnection"));
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
        const n = recordViolation("copy_paste");
        sendHeartbeat();
        if (n >= SUBMIT_THRESHOLD) forceSubmit(t("examPortal.ruleTools"));
        else if (n >= FLAG_THRESHOLD) setWarning({ type: "copy_paste", message: t("examPortal.devtoolsDetected") });
      }
    };
    blockEvents.forEach(ev => document.addEventListener(ev, onBlock));

    const onVisibility = () => {
      if (document.hidden) {
        const n = recordViolation("tab_switch");
        sendHeartbeat();
        if (n >= SUBMIT_THRESHOLD) forceSubmit(t("examPortal.ruleTabs"));
        else if (n >= FLAG_THRESHOLD) setWarning({ type: "tab_switch", message: t("examPortal.tabSwitchWarning").replace("{n}", String(n)) });
      }
    };
    const onBlur = () => {
      const n = recordViolation("window_blur");
      sendHeartbeat();
      if (n >= SUBMIT_THRESHOLD) forceSubmit(t("examPortal.ruleMonitored"));
      else if (n >= FLAG_THRESHOLD) setWarning({ type: "window_blur", message: t("examPortal.focusLost").replace("{n}", String(n)) });
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);

    const detectDevtools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      if (widthThreshold || heightThreshold) {
        const n = recordViolation("devtools");
        sendHeartbeat();
        if (n >= SUBMIT_THRESHOLD) forceSubmit(t("examPortal.ruleTools"));
        else if (n >= FLAG_THRESHOLD) setWarning({ type: "devtools", message: t("examPortal.devtoolsDetected") });
      }
    };
    const devInterval = setInterval(detectDevtools, 2000);

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Date.now() - mountedAtRef.current >= GRACE_MS) {
        e.preventDefault();
        e.returnValue = "";
        // Fire-and-forget heartbeat so the last violations survive tab close.
        try {
          const url = `${api.getBaseUrl() || ""}/api/exam/heartbeat/`;
          fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_code: codeRef.current.trim(), violations: violationsRef.current, answers: answersRef.current }),
            keepalive: true,
          });
        } catch {}
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
        sendHeartbeat();
        if (n >= SUBMIT_THRESHOLD) forceSubmit(t("examPortal.ruleFullscreen"));
        else {
          setWarning({ type: "fullscreen_exit", message: t("examPortal.fullscreenExited").replace("{n}", String(n)) });
          enterFullscreen();
        }
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);

    const heartbeatInterval = setInterval(sendHeartbeat, 10000);

    return () => {
      blockEvents.forEach(ev => document.removeEventListener(ev, onBlock));
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      clearInterval(devInterval);
      clearInterval(heartbeatInterval);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [step, recordViolation, forceSubmit, sendHeartbeat]);

  const handleAccess = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!accessCode.trim()) return;
    setLoading(true); setError("");
    try {
      const payload = await api.post("/exam/access/", { access_code: accessCode.trim() });
      if (!payload || !payload.questions || !payload.duration_minutes) {
        throw new Error(t("examPortal.invalidData"));
      }
      setExam(payload);
      setStep("warn");
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const beginExam = () => {
    const payload = exam!;
    const remaining = remainingFrom(payload, payload.started_at);
    deadlineRef.current = Date.now() + remaining * 1000;
    setTimeLeft(remaining);
    setStep("exam");
  };

  useEffect(() => {
    if (step !== "exam" || !exam) return;
    const tick = () => {
      if (!deadlineRef.current) {
        const r = remainingFrom(exam, exam.started_at);
        deadlineRef.current = Date.now() + r * 1000;
        setTimeLeft(r);
        return;
      }
      setTimeLeft(Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000)));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [step, exam]);

  // Auto-submit when the timer expires (00:00)
  useEffect(() => {
    if (step === "exam" && timeLeft <= 0 && !autoSubmitLockRef.current && exam) {
      setWarning({ type: "expired", message: t("examPortal.timeUpSubmitting") });
      forceSubmit(t("examPortal.timeUp"));
    }
  }, [step, timeLeft, forceSubmit, exam]);

  const handleSubmit = async () => {
    if (submitting) return;
    if (timeLeft <= 0) { setError(t("examPortal.timeUp")); return; }
    if (!confirm(t("examPortal.submitConfirm"))) return;
    setSubmitting(true); setError("");
    const { ok, data } = await doSubmit(true);
    if (!ok) { setError(data?.error || t("examPortal.submitFailed")); setSubmitting(false); return; }
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
          <h1 className="text-2xl font-bold text-white mb-4">{t("examPortal.submitted")}</h1>
          {result?.auto_submitted && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
              <p className="text-red-400 font-bold text-xl">{t("examPortal.autoSubmitted")}</p>
              <p className="text-sm text-gray-400">{t("examPortal.autoSubmittedDesc")}</p>
            </div>
          )}
          {result && !result.auto_submitted && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
              <p className="text-green-400 font-bold text-xl">{result.score}%</p>
              <p className="text-sm text-gray-400">{result.correct}/{result.total_auto_graded} {t("examPortal.autoGradedCorrect")}</p>
            </div>
          )}
          <p className="text-gray-400 text-sm">{t("examPortal.recorded")}</p>
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
            <h1 className="text-xl font-bold text-white mt-3">{t("examPortal.guidelines")}</h1>
            <p className="text-sm text-gray-400 mt-1">{exam.exam_title}</p>
          </div>
          <div className="space-y-3 mb-6">
            <p className="text-sm text-gray-300">{t("examPortal.agreeRules")}</p>
            <ul className="space-y-2 text-sm text-gray-300 list-disc pl-5">
              <li>{t("examPortal.ruleMonitored")}</li>
              <li>{t("examPortal.ruleFullscreen")}</li>
              <li>{t("examPortal.ruleTabs")}</li>
              <li>{t("examPortal.ruleTools")}</li>
              <li>{t("examPortal.ruleRepeated").replace("{n}", String(SUBMIT_THRESHOLD))}</li>
              <li>{t("examPortal.ruleNoExpire")}</li>
            </ul>
          </div>
          <button onClick={beginExam} disabled={loading} className="w-full py-3 bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold rounded-lg">
            {t("examPortal.beginExam")}
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
            {submitting ? "..." : t("examPortal.submit")}
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
                      <span className="text-sm text-gray-300">{v === "True" ? t("examPortal.true") : t("examPortal.false")}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea value={answers[q.id] || ""} onChange={e => setAnswers({...answers, [q.id]: e.target.value })} rows={4} className="w-full ml-4 px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" placeholder={t("examPortal.typeAnswer")} />
              )}
            </div>
          ))}

          {exam.questions.length === 0 && (
            <p className="text-center text-gray-500 py-10">{t("examPortal.noQuestions")}</p>
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
          <h1 className="text-xl font-bold text-white mt-4">{t("examPortal.portalTitle")}</h1>
          <p className="text-sm text-gray-400 mt-1">{t("examPortal.enterCode")}</p>
        </div>
        <form onSubmit={handleAccess} className="space-y-4">
          <input type="text" value={accessCode} onChange={e => setAccessCode(e.target.value.toUpperCase())} placeholder={t("examPortal.accessCodePlaceholder")} className="w-full px-4 py-3 bg-navy-900 border border-navy-600 rounded-lg text-white text-center text-lg font-mono tracking-widest placeholder-gray-600 focus:border-gold-500 focus:outline-none" autoFocus />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading || !accessCode.trim()} className="w-full py-3 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-bold rounded-lg">
            {loading ? t("examPortal.verifying") : t("examPortal.startExam")}
          </button>
        </form>
      </div>
    </div>
  );
}