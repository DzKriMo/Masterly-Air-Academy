"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";

interface Lesson {
  id: string;
  lesson_no: number;
  title: string;
  content: string;
  module_title: string;
  subject_code: string;
}

export default function LessonViewPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  const courseId = params?.id as string;
  const lessonId = params?.lessonId as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.push("/student/login"); return; }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated || !lessonId) return;
    api.get<any>(`/module-lessons/${lessonId}/`)
      .then(data => {
        const d = data as unknown as any;
        setLesson({
          id: d.id,
          lesson_no: d.lesson_no,
          title: d.title || `Lesson ${d.lesson_no}`,
          content: d.content || "",
          module_title: d.module_title || "",
          subject_code: d.subject_code || "",
        });
        setError(null);
      })
      .catch(err => {
        console.error("Failed to load lesson:", err);
        setError(t("student.lessonLoadError", "Failed to load lesson."));
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, lessonId]);

  if (loading) return <div className="min-h-screen bg-navy-900 p-8"><LoadingSkeleton type="detail" rows={10} /></div>;

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110} />
            <div>
              <h1 className="text-lg font-bold text-white truncate max-w-md">
                {lesson?.title || t("student.lesson", "Lesson")}
              </h1>
              <button onClick={() => router.push(`/student/courses`)} className="text-xs text-gray-500 hover:text-gold-500">
                ← {t("student.backToCourses", "Back to Courses")}
              </button>
            </div>
          </div>
          {lesson && (
            <span className="text-xs text-gray-500 bg-navy-700 px-3 py-1 rounded-full">
              {lesson.subject_code} — Lesson {lesson.lesson_no}
            </span>
          )}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && <ErrorCard message={error} onRetry={() => window.location.reload()} />}

        {lesson && (
          <article className="bg-navy-800 border border-navy-700 rounded-2xl p-8 md:p-10">
            <div className="mb-8 pb-6 border-b border-navy-700">
              <p className="text-gold-500 text-sm font-semibold uppercase tracking-wider mb-2">
                {t("student.lessonNum", "Lesson")} {lesson.lesson_no}
              </p>
              <h1 className="text-3xl font-bold text-white">{lesson.title}</h1>
            </div>

            {lesson.content ? (
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
                prose-table:border-separate prose-th:bg-navy-900 prose-th:text-gold-500 prose-th:px-4 prose-th:py-2 prose-td:px-4 prose-td:py-2 prose-td:border-navy-700
                prose-a:text-gold-500 prose-a:no-underline hover:prose-a:underline
                prose-img:rounded-xl
                [&_summary]:cursor-pointer [&_summary]:text-gold-500 [&_summary]:font-semibold [&_details]:bg-navy-900 [&_details]:rounded-xl [&_details]:p-4 [&_details]:mb-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {lesson.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-16">
                <svg className="w-16 h-16 text-navy-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
                <p className="text-gray-500">{t("student.noLessonContent", "No content has been added to this lesson yet.")}</p>
              </div>
            )}
          </article>
        )}
      </main>
    </div>
  );
}
