"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { HubLayout, HubTab } from "@/components/hub-layout";
import { CalendarDays, BookOpen, FileText, ClipboardList } from "lucide-react";
import { downloadBlob, moduleDocDownloadUrl, withExt } from "@/lib/download";

interface Session {
  id: string;
  title: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  room_name: string | null;
  instructor_name: string | null;
  status: string;
  is_past: boolean;
}

interface Lesson {
  id: string;
  lesson_no: number;
  title: string;
  content: string;
  video_url: string | null;
}

interface Doc {
  id: string;
  name: string;
  file_url: string;
  type: string;
}

interface Exercise {
  id: string;
  title: string;
  instructions: string | null;
  due_date: string | null;
}

interface ModuleRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  lessons: Lesson[];
  documents: Doc[];
  exercises: Exercise[];
}

interface SubjectInfo {
  id: string;
  code: string;
  title_en: string;
  has_modules: boolean;
  has_sessions: boolean;
}

interface SubjectGroup {
  subject: SubjectInfo;
  modules: ModuleRow[];
  sessions: Session[];
}

const statusClass = (s: string) =>
  s === "scheduled" ? "bg-blue-500/10 text-blue-400" :
  s === "active" ? "bg-yellow-500/10 text-yellow-400" :
  s === "completed" ? "bg-green-500/10 text-green-400" :
  "bg-gray-500/10 text-gray-400";

const TABS: HubTab[] = [
  { id: "sessions", label: "Sessions", icon: CalendarDays },
  { id: "modules", label: "Modules", icon: BookOpen },
];

export default function StudentCoursesPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [groups, setGroups] = useState<SubjectGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useAuthGuard(isAuthenticated, isLoading, "/student/login");

  const load = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    api.get("/courses/curriculum/")
      .then((d: any) => { setGroups(d || []); setError(null); })
      .catch(err => { console.error("Failed to load curriculum:", err); setError(t('student.coursesLoadError', "Failed to load courses. Please try again.")); })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-8"><LoadingSkeleton type="card" rows={4} /></div>
      </div>
    );
  }

  const toggleModule = (subjectId: string, moduleId?: string) => {
    setExpanded(prev => {
      const next = { ...prev };
      if (moduleId) {
        next[`${subjectId}:${moduleId}`] = !next[`${subjectId}:${moduleId}`];
      } else {
        next[`session:${subjectId}`] = !next[`session:${subjectId}`];
      }
      return next;
    });
  };

  return (
    <HubLayout
      title={t("student.myCourses")}
      tabs={TABS}
      defaultTab="sessions"
      backHref="/student/dashboard"
      backLabel={t("student.backToDashboard")}
    >
      {(active) => {
        if (error) return <div className="py-8"><ErrorCard message={error} onRetry={load} /></div>;
        if (groups.length === 0) {
          return <div className="py-12"><EmptyState message={t("student.noCourses", "You are not enrolled in any courses yet.")} /></div>;
        }

        return (
          <div className="space-y-8">
            {active === "sessions" && <SessionsView groups={groups} expanded={expanded} toggle={toggleModule} router={router} t={t} statusClass={statusClass} />}
            {active === "modules" && <ModulesView groups={groups} expanded={expanded} toggle={toggleModule} router={router} t={t} />}
          </div>
        );
      }}
    </HubLayout>
  );
}

function SessionsView({ groups, expanded, toggle, router, t, statusClass }: {
  groups: SubjectGroup[];
  expanded: Record<string, boolean>;
  toggle: (subjectId: string, moduleId?: string) => void;
  router: any;
  t: any;
  statusClass: (s: string) => string;
}) {
  const visible = groups.filter(g => g.subject.has_sessions || g.sessions.length > 0);
  if (visible.length === 0) {
    return <div className="py-12"><EmptyState message={t("student.noSessions", "No scheduled sessions yet.")} /></div>;
  }
  return (
    <div className="space-y-6">
      {visible.map(g => {
        const open = !!expanded[`session:${g.subject.id}`];
        return (
          <div key={g.subject.id} className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
            <button onClick={() => toggle(g.subject.id)} className="w-full flex items-center justify-between p-5 text-left hover:bg-navy-700/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-1 rounded font-medium">{g.subject.code}</span>
                <h3 className="text-white font-semibold">{g.subject.title_en}</h3>
                <span className="text-sm text-gray-400">{g.sessions.length} session{g.sessions.length !== 1 ? "s" : ""}</span>
              </div>
              <svg className={`w-5 h-5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {open && (
              <div className="border-t border-navy-700 divide-y divide-navy-700/60">
                {g.sessions.map(s => (
                  <button key={s.id} onClick={() => router.push(`/student/courses/${s.id}`)} className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-navy-700/40 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white font-medium truncate">{s.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${statusClass(s.status)}`}>{s.status}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        {s.scheduled_date} · {s.start_time} - {s.end_time || "—"} · {s.room_name || t("student.tbd", "TBD")}
                      </p>
                    </div>
                    {s.instructor_name && <span className="text-xs text-gray-500 shrink-0">{s.instructor_name}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ModulesView({ groups, expanded, toggle, router, t }: {
  groups: SubjectGroup[];
  expanded: Record<string, boolean>;
  toggle: (subjectId: string, moduleId?: string) => void;
  router: any;
  t: any;
}) {
  const visible = groups.filter(g => g.subject.has_modules || g.modules.length > 0);
  if (visible.length === 0) {
    return <div className="py-12"><EmptyState message={t("student.noModulesTab", "No module content available yet.")} /></div>;
  }
  return (
    <div className="space-y-6">
      {visible.map(g => (
        <div key={g.subject.id} className="bg-navy-800 border border-navy-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-1 rounded font-medium">{g.subject.code}</span>
            <h3 className="text-white font-semibold">{g.subject.title_en}</h3>
            <span className="text-sm text-gray-400">{g.modules.length} module{g.modules.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="space-y-3">
            {g.modules.map(m => {
              const open = !!expanded[`${g.subject.id}:${m.id}`];
              return (
                <div key={m.id} className="bg-navy-900 border border-navy-700 rounded-xl overflow-hidden">
                  <button onClick={() => toggle(g.subject.id, m.id)} className="w-full flex items-center justify-between p-4 text-left hover:bg-navy-800 transition-colors">
                    <div>
                      <h4 className="text-white font-medium">{m.title}</h4>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {m.lessons.length} {t("student.lessons", "lessons")} · {m.documents.length} {t("student.documents", "documents")} · {m.exercises.length} {t("student.exercises", "exercises")}
                      </p>
                    </div>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {open && (
                    <div className="border-t border-navy-700 p-4 space-y-4">
                      {m.lessons.length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5" />{t("student.lessons", "Lessons")}</h5>
                          <div className="space-y-2">
                            {m.lessons.map(l => (
                              <div key={l.id} className="flex items-center justify-between bg-navy-800 rounded-lg px-4 py-2.5 border border-navy-700">
                                <span className="text-sm text-white">{l.lesson_no}. {l.title || t("student.untitled", "Untitled")}</span>
                                <button onClick={() => router.push(`/student/courses/lesson/${l.id}`)} className="text-xs text-gold-500 hover:text-gold-400 border border-gold-500/30 px-3 py-1.5 rounded-lg transition-colors font-medium shrink-0 ml-2">{t("student.openLesson", "Open Lesson")} →</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {m.documents.length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />{t("student.resources", "Resources")}</h5>
                          <div className="space-y-1">
                            {m.documents.map(d => (
                              <div key={d.id} className="flex items-center justify-between bg-navy-900 rounded-lg px-3 py-2 border border-navy-700">
                                <span className="text-sm text-white truncate">{d.name || t("student.document", "Document")}{d.type ? <span className="text-xs text-gray-500 ml-2">{d.type}</span> : null}</span>
                                {d.file_url && (
                                  <button onClick={() => downloadBlob(moduleDocDownloadUrl(d.id), withExt(d.name, d.type))} className="text-xs text-gold-500 hover:underline shrink-0 ml-2">{t("student.download", "Download")}</button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {m.exercises.length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" />{t("student.exercises", "Exercises")}</h5>
                          <div className="space-y-1">
                            {m.exercises.map(e => (
                              <div key={e.id} className="flex items-center justify-between bg-navy-900 rounded-lg px-3 py-2 border border-navy-700">
                                <span className="text-sm text-white truncate">{e.title}{e.due_date ? <span className="text-xs text-gray-500 ml-2">due {e.due_date}</span> : null}</span>
                                <button onClick={() => router.push(`/student/courses/exercise/${e.id}`)} className="text-xs text-gold-500 hover:text-gold-400 border border-gold-500/30 px-3 py-1.5 rounded-lg transition-colors font-medium shrink-0 ml-2">{t("student.openExercise", "Open Exercise")} →</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}