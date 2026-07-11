"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

interface Question { id: string; question_text: string; question_type: string; options: string[]; }
interface Result { score: number; total: number; percentage: number; is_passed: boolean; passing_grade: number; details: { question_id: string; question: string; your_answer: string; correct_answer: string; is_correct: boolean }[]; }

export default function TakeExamPage() {
  const { isAuthenticated, isLoading } = useAuth();
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

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/student/login"); } }, [isLoading, isAuthenticated, router]);

  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

  useEffect(() => {
    if (!isAuthenticated || !examId) return;
    fetch(`/api/exams/${examId}/start/`, { method: "POST", headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.error) { alert(d.error); router.push("/student/exams"); return; }
        setQuestions(d.questions || []);
        setAttemptId(d.attempt_id);
        setDuration(d.duration || 30);
        setTimeLeft((d.duration || 30) * 60);
        setLoading(false);
      });
  }, [isAuthenticated, examId]);

  useEffect(() => {
    if (timeLeft <= 0 || submitted) return;
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, submitted]);

  useEffect(() => {
    if (timeLeft <= 0 && !submitted && questions.length > 0) { handleSubmit(); }
  }, [timeLeft]);

  const handleSubmit = async () => {
    if (submitted) return;
    setSubmitted(true);
    const res = await fetch(`/api/exams/${examId}/submit/`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ attempt_id: attemptId, answers }),
    });
    setResult(await res.json());
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (loading) return <div className="min-h-screen bg-navy-900 flex items-center justify-center text-white">Loading exam...</div>;

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-navy-900">
        <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
          <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-3">
            <Image src="/mast.svg" alt="MAA" width={36} height={36} className="rounded-lg" />
            <div><h1 className="text-lg font-bold text-white">Exam Results</h1>
              <button onClick={() => router.push("/student/exams")} className="text-xs text-gray-500 hover:text-gold-500">Back to Exams</button></div>
          </div>
        </nav>
        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className={`rounded-xl p-8 mb-8 text-center ${result.is_passed ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
            <p className="text-5xl font-bold mb-2" style={{ color: result.is_passed ? "#4ade80" : "#f87171" }}>{result.percentage}%</p>
            <p className="text-xl font-bold text-white">{result.is_passed ? "Passed" : "Failed"}</p>
            <p className="text-sm text-gray-400 mt-1">{result.score}/{result.total} correct | Passing: {result.passing_grade}%</p>
          </div>
          <h3 className="text-lg font-bold text-white mb-4">Question Breakdown</h3>
          <div className="space-y-3">
            {result.details.map((d, i) => (
              <div key={i} className={`p-4 rounded-lg border ${d.is_correct ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                <p className="text-white text-sm font-medium mb-2">{i + 1}. {d.question}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-gray-500">Your answer:</span> <span className={d.is_correct ? "text-green-400" : "text-red-400"}>{d.your_answer || "(empty)"}</span></div>
                  <div><span className="text-gray-500">Correct:</span> <span className="text-green-400">{d.correct_answer}</span></div>
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
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/mast.svg" alt="MAA" width={36} height={36} className="rounded-lg" />
            <h1 className="text-lg font-bold text-white">Exam in Progress</h1>
          </div>
          <span className={`text-lg font-mono font-bold ${timeLeft < 300 ? "text-red-400" : "text-gold-500"}`}>{fmt(timeLeft)}</span>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-6">
          <p className="text-sm text-gray-400 mb-1">{questions.length} questions</p>
          <div className="w-full bg-navy-700 rounded-full h-2">
            <div className="bg-gold-500 h-2 rounded-full transition-all" style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">{Object.keys(answers).length}/{questions.length} answered</p>
        </div>

        <div className="space-y-6">
          {questions.map((q, i) => (
            <div key={q.id} className="bg-navy-800 border border-navy-700 rounded-xl p-5">
              <p className="text-white font-medium mb-3">{i + 1}. {q.question_text}</p>
              <div className="space-y-2">
                {q.options.map((opt, j) => {
                  const letter = String.fromCharCode(65 + j);
                  const selected = answers[q.id] === letter;
                  return (
                    <button key={j} onClick={() => setAnswers({...answers, [q.id]: letter})}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${selected ? "bg-gold-500/20 border border-gold-500 text-gold-500 font-medium" : "bg-navy-900 border border-navy-600 text-gray-300 hover:border-gray-400"}`}>
                      <span className="font-mono mr-2 text-xs">{letter}.</span> {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button onClick={handleSubmit} disabled={submitted}
          className="w-full mt-8 py-3.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-bold rounded-xl text-lg transition-colors">
          Submit Exam
        </button>
      </main>
    </div>
  );
}
