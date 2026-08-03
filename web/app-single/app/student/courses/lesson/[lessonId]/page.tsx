"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { PageHeader } from "@/components/page-header";

interface Lesson {
  id: string;
  lesson_no: number;
  title: string;
  content: string;
  module_title: string;
  subject_code: string;
  video_url?: string | null;
  is_mandatory?: boolean;
  has_video?: boolean;
}

export default function LessonViewPage() {
  const { isAuthenticated, isLoading: authLoading, token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  const lessonId = params?.lessonId as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isMandatory, setIsMandatory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useAuthGuard(isAuthenticated, authLoading, "/student/login");

  const getYouTubeEmbedUrl = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/,
    ];
    for (const re of patterns) {
      const m = url.match(re);
      if (m) return `https://www.youtube.com/embed/${m[1]}`;
    }
    return null;
  };
  // Alias kept for parity with the prior course-scoped page.
  const getYoutubeEmbedUrl = getYouTubeEmbedUrl;

  const renderVideoPlayer = (url: string) => {
    const embedUrl = getYoutubeEmbedUrl(url);
    if (embedUrl) {
      return (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
          <iframe
            src={embedUrl}
            title="Video"
            className="absolute inset-0 w-full h-full"
            allowFullScreen
          />
        </div>
      );
    }
    return (
      <video
        ref={videoRef}
        controls
        className="w-full rounded-xl"
        preload="metadata"
        onTimeUpdate={onVideoTimeUpdate}
        onPause={onVideoPause}
        onEnded={onVideoEnded}
        onPlay={onVideoPlay}
      >
        <source src={url} />
        {t("student.videoNotSupported", "Your browser does not support the video tag.")}
      </video>
    );
  };

  // ── Video view tracking (only for mandatory uploaded videos) ──────────────
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastReportedRef = useRef<number>(0);
  const tabSwitchesRef = useRef<number>(0);
  const seenHiddenRef = useRef(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lessonIdRef = useRef<string | null>(null);

  const flushTracking = useCallback(() => {
    if (!lessonIdRef.current) return;
    const vid = videoRef.current;
    const position = vid ? Math.round(vid.currentTime || 0) : 0;
    const duration = vid ? Math.round(vid.duration || 0) : 0;
    const tabSwitches = tabSwitchesRef.current;
    lastReportedRef.current = position;
    api
      .post(`/module-lessons/${lessonIdRef.current}/track_view/`, {
        position,
        duration,
        tab_switches: tabSwitches,
      })
      .catch(() => {
        /* tracking is best-effort; never block the learner */
      });
  }, []);

  const onVideoPlay = useCallback(() => {
    if (!isMandatory || !lessonIdRef.current) return;
    seenHiddenRef.current = false;
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(flushTracking, 15000);
  }, [isMandatory, flushTracking]);

  const onVideoPause = useCallback(() => {
    if (!isMandatory || !lessonIdRef.current) return;
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    flushTracking();
  }, [isMandatory, flushTracking]);

  const onVideoEnded = useCallback(() => {
    if (!isMandatory || !lessonIdRef.current) return;
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    const vid = videoRef.current;
    const duration = vid ? Math.round(vid.duration || 0) : 0;
    flushTracking();
    api
      .post(`/module-lessons/${lessonIdRef.current}/track_view/`, {
        position: duration,
        duration,
        tab_switches: tabSwitchesRef.current,
      })
      .catch(() => {});
  }, [isMandatory, flushTracking]);

  const onVideoTimeUpdate = useCallback(() => {
    if (!isMandatory || !lessonIdRef.current) return;
    const vid = videoRef.current;
    if (!vid) return;
    const pos = Math.round(vid.currentTime || 0);
    if (pos - lastReportedRef.current >= 5) {
      lastReportedRef.current = pos;
      flushTracking();
    }
  }, [isMandatory, flushTracking]);

  // Tab-switch detection: pause the video and record the switch.
  useEffect(() => {
    if (!isMandatory || !lessonIdRef.current) return;
    const handleHidden = () => {
      if (!document.hidden || seenHiddenRef.current) return;
      seenHiddenRef.current = true;
      tabSwitchesRef.current += 1;
      const vid = videoRef.current;
      if (vid && !vid.paused) {
        vid.pause();
      } else {
        flushTracking();
      }
    };
    document.addEventListener("visibilitychange", handleHidden);
    window.addEventListener("blur", handleHidden);
    return () => {
      document.removeEventListener("visibilitychange", handleHidden);
      window.removeEventListener("blur", handleHidden);
    };
  }, [isMandatory, flushTracking]);

  // Final flush on unmount.
  useEffect(() => {
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      if (lessonIdRef.current && isMandatory) {
        const vid = videoRef.current;
        api
          .post(`/module-lessons/${lessonIdRef.current}/track_view/`, {
            position: vid ? Math.round(vid.currentTime || 0) : 0,
            duration: vid ? Math.round(vid.duration || 0) : 0,
            tab_switches: tabSwitchesRef.current,
          })
          .catch(() => {});
      }
    };
  }, [isMandatory]);

  const loadLesson = useCallback(() => {
    if (!isAuthenticated || !lessonId) return;
    setLoading(true);
    api.get<any>(`/module-lessons/${lessonId}/`)
      .then(data => {
        const d = data as unknown as any;
        lessonIdRef.current = d.id;
        setIsMandatory(!!d.is_mandatory);
        setLesson({
          id: d.id,
          lesson_no: d.lesson_no,
          title: d.title || `Lesson ${d.lesson_no}`,
          content: d.content || "",
          module_title: d.module_title || "",
          subject_code: d.subject_code || "",
          video_url: d.video_url || null,
          is_mandatory: !!d.is_mandatory,
          has_video: !!d.has_video,
        });
        const raw = d.video_url || null;
        const streamBase = `/api/module-lessons/${lessonId}/video/`;
        setVideoUrl(
          raw && (raw.startsWith("http") || raw.startsWith("/media/"))
            ? raw
            : raw
            ? `${streamBase}${token ? `?token=${encodeURIComponent(token)}` : ""}`
            : null
        );
        setError(null);
      })
      .catch(err => {
        console.error("Failed to load lesson:", err);
        setError(t("student.lessonLoadError", "Failed to load lesson."));
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, lessonId, token]);

  useEffect(() => { loadLesson(); }, [loadLesson]);

  if (loading) return <div className="min-h-screen bg-navy-900 p-8"><LoadingSkeleton type="detail" rows={10} /></div>;

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader
        title={lesson?.title || t("student.lesson", "Lesson")}
        backHref="/student/courses?tab=modules"
        backLabel={t("student.backToCourses", "Back to Courses")}
        maxWidth="max-w-4xl"
        actions={lesson && (
          <span className="text-xs text-gray-500 bg-navy-700 px-3 py-1 rounded-full">
            {lesson.subject_code} — Lesson {lesson.lesson_no}
          </span>
        )}
      />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && <ErrorCard message={error} onRetry={loadLesson} />}

        {lesson && (
          <article className="bg-navy-800 border border-navy-700 rounded-2xl p-8 md:p-10">
            <div className="mb-8 pb-6 border-b border-navy-700">
              <p className="text-gold-500 text-sm font-semibold uppercase tracking-wider mb-2">
                {t("student.lessonNum", "Lesson")} {lesson.lesson_no}
              </p>
              <h1 className="text-3xl font-bold text-white">{lesson.title}</h1>
              {lesson.module_title && <p className="text-sm text-gray-400 mt-2">{lesson.module_title}</p>}
              {isMandatory && (
                <p className="text-xs text-gold-500/80 mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold-500 inline-block" />
                  {t("student.mandatoryVideo", "Mandatory video — progress is tracked")}
                </p>
              )}
            </div>

            {videoUrl && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">
                  {t("student.videoContent", "Video Content")}
                </h3>
                {renderVideoPlayer(videoUrl)}
              </div>
            )}

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
                prose-img:rounded-xl">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {lesson.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-500">{t("student.noLessonContent", "No content has been added to this lesson yet.")}</p>
              </div>
            )}
          </article>
        )}
      </main>
    </div>
  );
}