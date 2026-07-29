"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { PageHeader } from "@/components/page-header";

interface Exercise {
  id: string;
  title: string;
  instructions: string;
  due_date: string | null;
  module: string;
}

export default function ExerciseViewPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const params = useParams();
  const { t } = useTranslation();
  const courseId = params?.id as string;
  const exerciseId = params?.exerciseId as string;

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useAuthGuard(isAuthenticated, authLoading, "/student/login");

  useEffect(() => {
    if (!isAuthenticated || !exerciseId) return;
    api.get<any>(`/module-exercises/${exerciseId}/`)
      .then(data => {
        const d = data as unknown as any;
        setExercise({
          id: d.id,
          title: d.title || "Exercise",
          instructions: d.instructions || "",
          due_date: d.due_date || null,
          module: d.module,
        });
        setError(null);
      })
      .catch(err => {
        console.error("Failed to load exercise:", err);
        setError(t("student.exerciseLoadError", "Failed to load exercise."));
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, exerciseId]);

  if (loading) return <div className="min-h-screen bg-navy-900 p-8"><LoadingSkeleton type="detail" rows={6} /></div>;

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader
        title={exercise?.title || t("student.exercise", "Exercise")}
        backHref="/student/courses"
        backLabel={t("student.backToCourses", "Back to Courses")}
        maxWidth="max-w-4xl"
        actions={exercise?.due_date && (
          <span className="text-xs text-yellow-400 bg-yellow-500/10 px-3 py-1 rounded-full">
            {t("student.due", "Due")}: {exercise.due_date}
          </span>
        )}
      />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && <ErrorCard message={error} onRetry={() => window.location.reload()} />}

        {exercise && (
          <article className="bg-navy-800 border border-navy-700 rounded-2xl p-8 md:p-10">
            <div className="mb-8 pb-6 border-b border-navy-700">
              <h1 className="text-3xl font-bold text-white">{exercise.title}</h1>
            </div>

            {exercise.instructions ? (
              <div className="prose prose-invert prose-gold max-w-none
                prose-headings:text-white prose-headings:font-bold
                prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:border-navy-700 prose-h2:pb-2
                prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 prose-h3:text-gold-500
                prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4
                prose-strong:text-white prose-strong:font-semibold
                prose-ul:text-gray-300 prose-ol:text-gray-300
                prose-li:mb-2
                prose-code:bg-navy-900 prose-code:text-gold-400 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                prose-pre:bg-navy-900 prose-pre:border prose-pre:border-navy-700 prose-pre:rounded-xl
                prose-blockquote:border-l-gold-500 prose-blockquote:bg-navy-900/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
                prose-a:text-gold-500 prose-a:no-underline hover:prose-a:underline">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {exercise.instructions}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-16">
                <svg className="w-16 h-16 text-navy-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <p className="text-gray-500">{t("student.noInstructions", "No instructions provided for this exercise yet.")}</p>
              </div>
            )}
          </article>
        )}
      </main>
    </div>
  );
}
