"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

interface Exam { id: string; code: string; title: string; program: string; type: string; duration: number; passing_grade: number; max_attempts: number; status: string; }
interface Attempt { id: string; exam_code: string; attempt: number; score: number | null; is_passed: boolean | null; completed_at: string | null; }

export default function StudentExamsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/student/login"); } }, [isLoading, isAuthenticated, router]);

  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/exams/", { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => setExams(d.results || [])).finally(() => setLoading(false));
    fetch("/api/exams/my_attempts/", { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => setAttempts(Array.isArray(d) ? d : []));
  }, [isAuthenticated]);

  const getAttemptCount = (examId: string) => attempts.filter(a => a.exam_code === exams.find(e => e.id === examId)?.code).length;

  if (loading) return <div className="min-h-screen bg-navy-900 flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-3">
          <Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-lg" />
          <div><h1 className="text-lg font-bold text-white">Exams</h1>
            <button onClick={() => router.push("/student/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">Back to Dashboard</button></div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exams.filter(e => e.status === 'published' || e.status === 'active').map(e => {
            const taken = getAttemptCount(e.id);
            return (
              <div key={e.id} className="bg-navy-800 border border-navy-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono">{e.code}</span>
                  <span className="text-xs text-gray-500">{e.program}</span>
                </div>
                <h3 className="text-white font-bold text-lg mb-1">{e.title || e.code}</h3>
                <p className="text-sm text-gray-400 mb-4">{e.duration} min | Pass: {e.passing_grade}% | {taken}/{e.max_attempts} attempts</p>
                <button
                  onClick={() => router.push(`/student/exams/${e.id}`)}
                  disabled={taken >= e.max_attempts}
                  className="w-full py-2.5 bg-gold-500 hover:bg-gold-600 disabled:bg-gray-600 disabled:text-gray-400 text-navy-900 font-bold rounded-lg text-sm transition-colors">
                  {taken >= e.max_attempts ? "Max Attempts Reached" : taken > 0 ? `Retake Exam (${taken}/${e.max_attempts})` : "Start Exam"}
                </button>
              </div>
            );
          })}
        </div>
        {exams.filter(e => e.status === 'published' || e.status === 'active').length === 0 && (
          <p className="text-gray-500 text-center py-12">No exams available at this time.</p>
        )}

        {/* Past attempts */}
        {attempts.length > 0 && (
          <div className="mt-10">
            <h3 className="text-lg font-bold text-white mb-4">My Results</h3>
            <div className="space-y-2">
              {attempts.map(a => (
                <div key={a.id} className="flex items-center justify-between bg-navy-800 border border-navy-700 rounded-lg px-5 py-3">
                  <div><span className="text-white font-medium">{a.exam_code}</span><span className="text-xs text-gray-500 ml-3">Attempt {a.attempt}</span></div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-bold ${a.is_passed ? "text-green-400" : a.score !== null ? "text-red-400" : "text-gray-500"}`}>{a.score !== null ? `${a.score}%` : "In progress"}</span>
                    {a.is_passed && <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">Passed</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
