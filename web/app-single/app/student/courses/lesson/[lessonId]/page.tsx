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
import { VideoPlayer } from "@/components/video-player";

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

interface VideoStats {
  status: string | null;
  watched_seconds: number;
  duration: number;
  tab_switches: number;
  progress: number;
  completed: boolean;
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
  const [videoStats, setVideoStats] = useState<VideoStats>({
    status: null,
    watched_seconds: 0,
    duration: 0,
    tab_switches: 0,
    progress: 0,
    completed: false,
  });
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
          <iframe src={embedUrl} title="Video" className="absolute inset-0 w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
        </div>
      );
    }
    return (
      <VideoPlayer
        src={url}
        videoRef={videoRef}
        onTimeUpdate={onVideoTimeUpdate}
        onPause={onVideoPause}
        onPlay={onVideoPlay}
        onEnded={onVideoEnded}
      />
    );
  };

  // ── Video view tracking (only for mandatory uploaded videos) ──────────────
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastReportedRef = useRef<number>(0);
  const tabSwitchesRef = useRef<number>(0);
  const seenHiddenRef = useRef(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lessonIdRef = useRef<string | null>(null);

  const updateStatsFromResponse = useCallback((r: any) => {
    if (!r) return;
    const watched = r.watched_seconds ?? videoStats.watched_seconds;
    const duration = r.duration ?? videoStats.duration;
    setVideoStats({
      status: r.status ?? videoStats.status,
      watched_seconds: watched,
      duration,
      tab_switches: r.tab_switches ?? videoStats.tab_switches,
      progress: duration > 0 ? Math.min(100, Math.round((watched / duration) * 100)) : 0,
      completed: r.status === "completed",
    });
  }, [videoStats]);

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
      .then(updateStatsFromResponse)
      .catch(() => {
        /* tracking is best-effort; never block the learner */
      });
  }, [updateStatsFromResponse]);

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
        const watched = d.video_watched_seconds || 0;
        const duration = d.video_duration || 0;
        setVideoStats({
          status: d.video_status || null,
          watched_seconds: watched,
          duration,
          tab_switches: d.video_tab_switches || 0,
          progress: duration > 0 ? Math.min(100, Math.round((watched / duration) * 100)) : 0,
          completed: d.video_status === "completed",
        });
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
              {isMandatory && !videoStats.completed && (
                <p className="text-xs text-gold-500/80 mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold-500 inline-block" />
                  {t("student.mandatoryVideo", "Mandatory video — progress is tracked")}
                </p>
              )}
              {isMandatory && videoStats.completed && (
                <p className="text-xs text-green-400/90 mt-2 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  {t("student.videoWatched", "Watched")} — {t("student.mandatoryVideoDone", "mandatory video completed")}
                </p>
              )}
            </div>

            {videoUrl && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gold-500 uppercase tracking-wider">
                    {t("student.videoContent", "Video Content")}
                  </h3>
                  {isMandatory && <ProgressBadge stats={videoStats} />}
                </div>
                <div className="w-full rounded-xl overflow-hidden bg-black aspect-video max-h-[70vh]">
                  {renderVideoPlayer(videoUrl)}
                </div>
                {isMandatory && videoStats.watched_seconds > 0 && (
                  <ProgressBar stats={videoStats} />
                )}
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

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ProgressBadge({ stats }: { stats: VideoStats }) {
  const { t } = useTranslation();
  if (stats.completed) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/30 px-2.5 py-1 rounded-full">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        {t("student.videoWatched", "Watched")}
      </span>
    );
  }
  if (stats.progress > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gold-500 bg-gold-500/10 border border-gold-500/30 px-2.5 py-1 rounded-full">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        {stats.progress}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 bg-navy-700 border border-navy-600 px-2.5 py-1 rounded-full">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      {t("student.videoNotStarted", "Not started")}
    </span>
  );
}

function ProgressBar({ stats }: { stats: VideoStats }) {
  const { t } = useTranslation();
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
        <span>{t("student.watchProgress", "Watch progress")}</span>
        <span className="font-mono">
          {formatDuration(stats.watched_seconds)} / {formatDuration(stats.duration)}
          {stats.tab_switches > 0 && (
            <span className="ml-2 text-yellow-500/80" title={t("student.tabSwitches", "Times you left the tab — video pauses when you switch away")}>
              {stats.tab_switches}× {t("student.tabSwitch", "tab switch")}{stats.tab_switches !== 1 ? "es" : ""}
            </span>
          )}
        </span>
      </div>
      <div className="w-full h-2 bg-navy-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${stats.completed ? "bg-green-500" : "bg-gold-500"}`}
          style={{ width: `${Math.max(stats.progress, 2)}%` }}
        />
      </div>
    </div>
  );
}