"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";

export default function StudentDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: () => Promise.all([
      api.get<any>("/student/dashboard/").catch(() => ({})),
      api.get<any>("/students/flight-log/").catch(() => ({})),
      api.get<any>("/exams/my_attempts/").catch(() => []),
    ]),
    enabled: isAuthenticated,
  });

  const [dash = {}, log = {}, attemptsRaw = []] = data || [{}, {}, []];
  const attempts = Array.isArray(attemptsRaw) ? attemptsRaw : [];
  const scores = attempts.filter((a: any) => a.score !== null).map((a: any) => a.score);
  const dashData = dash as any;
  const theoryPct = dashData.theory_progress ?? 0;
  const flightPct = dashData.flight_progress ?? 0;
  const flightHours = dashData.total_flight_hours ?? (log as any).total_flight_hours ?? 0;
  const lessonsCompleted = dashData.total_lessons_completed ?? (log as any).total_lessons ?? 0;
  const examAvg = dashData.exam_average ?? (scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0);
  const upcomingSchedule = dashData.upcoming_schedule ?? [];
  const recentResults = dashData.recent_results ?? [];
  const unpaidInvoices = dashData.unpaid_invoices_count ?? 0;
  const expiringDocs = dashData.expiring_documents ?? [];

  // New dashboard fields
  const studentNumber = dashData.student_number || "";
  const program = dashData.program || "";
  const passedCount = attempts.filter((a: any) => a.is_passed === true).length;
  const failedCount = attempts.filter((a: any) => a.is_passed === false).length;
  const recentNotifications = dashData.recent_notifications || [];
  const programProgress = dashData.program_progress || {};

  const lessons = (log as any).lessons || [];
  const flightData = lessons.slice(-10).map((l: any, i: number) => ({ name: l.date?.slice(5) || `#${i + 1}`, hours: l.duration || 0 }));

  const compData = [
    { name: t("student.compNavigation", "Nav"), value: Math.min(Math.max(flightHours * 2, 10), 100) },
    { name: t("student.compComms", "Comms"), value: Math.min(Math.max(lessonsCompleted * 5, 10), 100) },
    { name: t("student.compManeuvers", "Maneuv"), value: Math.min(Math.max(lessonsCompleted * 3, 10), 100) },
    { name: t("student.compProcedures", "Proced"), value: Math.min(Math.max(lessonsCompleted, 10), 100) },
    { name: t("student.compSafety", "Safety"), value: Math.min(Math.max(examAvg * 1.2, 10), 100) },
  ];

  // Dynamic milestones from program progress API
  const dynamicMilestones = programProgress.milestones || [];
  const milestones = dynamicMilestones.length > 0
    ? dynamicMilestones.map((m: any) => ({
        label: m.label,
        pct: Math.min(Math.round((m.current / m.target) * 100), 100),
        current: m.current,
        target: m.target,
      }))
    : [
        { label: t('student.firstSolo'), pct: Math.min(Math.round(flightHours / 10 * 100), 100), current: flightHours, target: 10 },
        { label: t('student.crossCountry'), pct: Math.min(Math.round(flightHours / 25 * 100), 100), current: flightHours, target: 25 },
        { label: t('student.licenseReady'), pct: Math.min(Math.round(flightHours / 45 * 100), 100), current: flightHours, target: 45 },
      ];

  const programBadgeColor = (p: string) => {
    const colors: Record<string, string> = {
      PPL: "bg-green-500/10 text-green-400 border-green-500/30",
      CPL: "bg-blue-500/10 text-blue-400 border-blue-500/30",
      IR: "bg-purple-500/10 text-purple-400 border-purple-500/30",
      MEP: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
      MCC: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    };
    return colors[p] || "bg-gray-500/10 text-gray-400 border-gray-500/30";
  };

  return (
    <div className="flex-1 min-w-0">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">{t('student.dashboard')}</h1>
        </div>
      </nav>
      <main className="px-6 py-8">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h2 className="text-2xl font-bold text-white">{t("dashboard_welcome")}, {user?.name?.split(" ")[0] || "Student"}</h2>
          {program && (
            <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${programBadgeColor(program)}`}>
              {program}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 mb-8">
          <p className="text-gray-400">{t("dashboard_overview")}</p>
          {studentNumber && <p className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono">{t('student.studentNumber', 'Student #')}: {studentNumber}</p>}
        </div>

        {error && <ErrorCard message={error} onRetry={() => refetch()} />}

        {isLoading ? (
          <LoadingSkeleton type="card" rows={4} />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
              <Stat title={t('student.flightHours')} value={`${flightHours}h`} />
              <Stat title={t('student.lessonsCompleted')} value={lessonsCompleted} />
              <Stat title={t('student.examAverage')} value={examAvg > 0 ? `${examAvg}%` : "-"} />
              <Stat title={t('student.unpaid')} value={unpaidInvoices} />
              <Stat title={t('student.passed', 'Passed')} value={passedCount} />
              <Stat title={t('student.failed', 'Failed')} value={failedCount} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-navy-800 rounded-xl border border-navy-700 p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('student.flightHours')}</h3>
                {flightData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={flightData}><CartesianGrid strokeDasharray="3 3" stroke="#1a2332" /><XAxis dataKey="name" stroke="#94a3b8" fontSize={11} /><YAxis stroke="#94a3b8" fontSize={11} /><Tooltip /><Line type="monotone" dataKey="hours" stroke="#c4943c" strokeWidth={2} dot={{ r: 4 }} /></LineChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-500 text-sm text-center py-8">{t('student.noFlightData')}</p>}
              </div>
              <div className="bg-navy-800 rounded-xl border border-navy-700 p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('student.competencies')}</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={compData}><PolarGrid stroke="#1a2332" /><PolarAngleAxis dataKey="name" stroke="#94a3b8" fontSize={10} /><PolarRadiusAxis stroke="#94a3b8" fontSize={10} /><Radar dataKey="value" stroke="#c4943c" fill="#c4943c" fillOpacity={0.2} /></RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-navy-800 rounded-xl border border-navy-700 p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('student.progress')}</h3>
                <div className="space-y-4">
                  <ProgressBar label={t('student.theory')} pct={theoryPct} color="bg-gold-500" />
                  <ProgressBar label={t('student.flight')} pct={flightPct} color="bg-blue-500" />
                </div>
              </div>
              <div className="bg-navy-800 rounded-xl border border-navy-700 p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('student.nextMilestones')}</h3>
                <div className="space-y-4">
                  {milestones.map((m: any, i: number) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1"><span className="text-gray-300">{m.label}</span><span className="text-gray-500">{m.current}/{m.target}h</span></div>
                      <div className="w-full bg-navy-900 rounded-full h-2"><div className={`bg-gold-500 h-2 rounded-full transition-all`} style={{ width: `${m.pct}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-navy-800 rounded-xl border border-navy-700 p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('student.recentActivity')}</h3>
                <div className="space-y-4">
                  {recentResults.length > 0 ? recentResults.slice(0, 5).map((r: any, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${r.passed ? 'bg-green-400' : 'bg-red-400'}`} />
                      <div className="min-w-0"><p className="text-sm text-white truncate">{r.exam} — {r.score}%</p><p className="text-xs text-gray-500">{r.date}{r.passed ? ` - ${t("exams_passed")}` : ` - ${t("exams_failed")}`}</p></div>
                    </div>
                  )) : upcomingSchedule.length > 0 ? upcomingSchedule.slice(0, 3).map((s: any, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-1 w-2 h-2 rounded-full shrink-0 bg-gold-500" />
                      <div className="min-w-0"><p className="text-sm text-white truncate">{s.title}</p><p className="text-xs text-gray-500">{s.date}{s.time ? ` ${s.time}` : ''}</p></div>
                    </div>
                  )) : <p className="text-gray-500 text-sm text-center py-4">{t('student.noRecentActivity')}</p>}
                  {expiringDocs.length > 0 && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-xs text-red-400 font-medium">&#9888; {expiringDocs.length} {t('student.expiringDocs')}</p>
                    </div>
                  )}
                  {/* Recent Unread Notifications */}
                  {recentNotifications.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-navy-700">
                      <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">{t('student.recentNotifications', 'Recent Notifications')}</p>
                      {recentNotifications.slice(0, 3).map((n: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 py-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-gold-500 shrink-0 mt-1.5" />
                          <div className="min-w-0">
                            <p className="text-xs text-white truncate">{n.title}</p>
                            <p className="text-[10px] text-gray-500">{new Date(n.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string | number }) {
  return <div className="bg-navy-800 rounded-xl border border-navy-700 p-6"><p className="text-3xl font-bold text-white">{value}</p><p className="text-sm text-gray-400 mt-1">{title}</p></div>;
}

function ProgressBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1"><span className="text-gray-300">{label}</span><span className="text-gray-500">{pct}%</span></div>
      <div className="w-full bg-navy-900 rounded-full h-2"><div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
