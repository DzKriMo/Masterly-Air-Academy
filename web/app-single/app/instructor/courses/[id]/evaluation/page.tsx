"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { PageHeader } from "@/components/page-header";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/toast";

interface Student {
  id: string; student: string; student_name: string; status: string;
}

interface EvaluationRow {
  student_id: string; student_name: string;
  score: number; grade: string; feedback: string;
}

export default function EvaluationPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const params = useParams();
  const courseId = params?.id as string;
  const { showToast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useAuthGuard(isAuthenticated, authLoading);

  const fetchStudents = () => {
    if (!isAuthenticated || !courseId) return;
    setLoading(true);
    api.get<any>(`/courses/${courseId}/students/`)
      .then(data => {
        const d = data as unknown as any;
        const list = Array.isArray(d) ? d : d.results || [];
        setStudents(list);
        setError(null);
        setEvaluations(list.map((s: Student) => ({
          student_id: s.student || s.id,
          student_name: s.student_name,
          score: 0, grade: "—", feedback: "",
        })));
      })
      .catch(err => {
        console.error("Failed to load students:", err);
        setError(t("instructor.failedToLoadStudents", "Failed to load students."));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStudents(); }, [isAuthenticated, courseId]);

  const updateScore = (idx: number, score: number) => {
    const updated = [...evaluations];
    updated[idx].score = Math.max(0, Math.min(100, score));
    updated[idx].grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
    setEvaluations(updated);
  };

  const handleSubmit = async () => {
    setSaving(true); setError(null);
    try {
      await api.post(`/courses/${courseId}/evaluate/`, {
        course_id: courseId, records: evaluations.map(e => ({
          student: e.student_id, score: String(e.score || 0), feedback: e.feedback || "",
        })),
      });
      showToast("success", t("instructor.evaluationSaved", "Evaluations saved successfully"));
    } catch (err: any) {
      console.error("Failed to save evaluations:", err);
      const msg = err.message || t("instructor.failedToSaveEvaluation", "Failed to save evaluations.");
      setError(msg);
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-navy-900 p-8">
      <LoadingSkeleton type="detail" rows={6} />
    </div>
  );

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader
        title={t("instructor.evaluateStudents", "Evaluate Students")}
        backHref="/instructor/courses"
        backLabel={t("instructor.backToCourses", "Back to Courses")}
        maxWidth="max-w-4xl"
      />
      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && <ErrorCard message={error} onRetry={fetchStudents} />}
        {students.length === 0 && !loading ? (
          <EmptyState message={t("instructor.noStudentsEnrolled", "No students enrolled.")} />
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{students.length} {t("instructor.studentsEnrolled", "students")}</h2>
              <button onClick={handleSubmit} disabled={saving}
                className="px-6 py-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-bold rounded-lg text-sm transition-colors">
                {saving ? t("common.loading", "Saving...") : t("instructor.saveEvaluations", "Save Evaluations")}
              </button>
            </div>
            <div className="space-y-3">
              {evaluations.map((row, idx) => (
                <div key={row.student_id}
                  className="bg-navy-800 border border-navy-700 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{row.student_name}</span>
                    <span className={`text-sm font-bold px-3 py-1 rounded ${
                      row.grade === "A" ? "bg-green-500/20 text-green-400" :
                      row.grade === "B" ? "bg-blue-500/20 text-blue-400" :
                      row.grade === "C" ? "bg-yellow-500/20 text-yellow-400" :
                      row.grade === "D" ? "bg-orange-500/20 text-orange-400" :
                      row.grade === "F" ? "bg-red-500/20 text-red-400" :
                      "bg-gray-500/20 text-gray-400"
                    }`}>{row.grade}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">{t("instructor.score", "Score (0-100)")}</label>
                      <input type="number" min="0" max="100" value={row.score}
                        onChange={e => updateScore(idx, parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
                    </div>
                    <div className="flex-[2]">
                      <label className="block text-xs text-gray-500 mb-1">{t("instructor.feedback", "Feedback")}</label>
                      <input type="text" value={row.feedback}
                        onChange={e => {
                          const updated = [...evaluations];
                          updated[idx].feedback = e.target.value;
                          setEvaluations(updated);
                        }}
                        placeholder="Optional feedback..."
                        className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
