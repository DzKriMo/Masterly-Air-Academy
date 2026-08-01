"use client";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";
import { todayLocal } from "@/lib/format-utils";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CGIDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  const today = todayLocal();

  const { data: courses = [], isLoading, error: queryError } = useQuery({
    queryKey: ['cgi-courses'],
    queryFn: () => api.get<any>("/courses/").then(r => (r as unknown as any).results || []),
    enabled: isAuthenticated,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['cgi-students'],
    queryFn: () => api.get<any>("/students/").then(r => (r as unknown as any).results || []),
    enabled: isAuthenticated,
  });

  const { data: instructorsRaw } = useQuery({
    queryKey: ['cgi-instructors'],
    queryFn: () => api.get<any>("/ground-instructors/").then(r => (r as unknown as any).results || []),
    enabled: isAuthenticated,
  });

  const { data: attemptsData } = useQuery({
    queryKey: ['cgi-attempts'],
    queryFn: () => api.get<any>("/exam-attempts/").then(r => (r as unknown as any).results || []).catch(() => []),
    enabled: isAuthenticated,
  });

  const { data: alertsData } = useQuery({
    queryKey: ['cgi-alerts'],
    queryFn: () => api.get<any>("/notifications/").then(r => (r as unknown as any).results || []),
    enabled: isAuthenticated,
  });
  const alerts: any[] = alertsData || [];
  const attempts = Array.isArray(attemptsData) ? attemptsData : [];
  const instructors = Array.isArray(instructorsRaw) ? instructorsRaw : [];

  const todayCourses = courses.filter((c: any) => c.scheduled_date === today);
  const activeStudents = students.filter((s: any) => s.status === "active").length;
  const passed = attempts.filter((a: any) => a.is_passed === true).length;
  const total = attempts.length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  const avgScore = total > 0 ? Math.round(attempts.reduce((s: number, a: any) => s + (a.score || 0), 0) / total) : 0;

  const statusData = Object.entries(
    courses.reduce((acc: any, c: any) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="flex-1 min-w-0">
      <PageHeader title={t('instructor.dashboard')} />
      <main className="px-6 py-8">
        <h2 className="text-2xl font-bold text-white mb-2">{t("dashboard_welcome")}, {user?.name?.split(" ")[0] || "CGI"}</h2>
        <p className="text-gray-400 mb-8">{t('instructor.cgi.overview', 'Ground training pedagogical overview')}</p>

        {queryError && <ErrorCard message={queryError.message} />}

        {isLoading ? <LoadingSkeleton type="card" rows={3} /> : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Stat title={t('instructor.cgi.totalStudents')} value={activeStudents} />
              <Stat title={t('instructor.cgi.todaysCourses')} value={todayCourses.length} />
              <Stat title={t('instructor.cgi.availableInstructors')} value={instructors.length || "—"} />
              <Stat title={t('instructor.cgi.passRate')} value={total > 0 ? `${passRate}%` : "—"} />
            </div>

            {/* Secondary stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Stat title={t('instructor.cgi.avgScore', 'Average Score')} value={total > 0 ? `${avgScore}%` : "—"} />
              <Stat title={t('instructor.cgi.examsTaken', 'Exams Taken')} value={total} />
            </div>

            {/* Alerts */}
            <div className="bg-navy-800 rounded-xl border border-navy-700 p-6 mb-8">
              <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('instructor.cgi.alerts')}</h3>
              {alerts.length === 0 ? (
                <p className="text-sm text-gray-500">{t('common.noData', 'No alerts')}</p>
              ) : (
                <ul className="space-y-2">
                  {alerts.slice(0, 5).map((a: any, i: number) => (
                    <li key={a.id || i} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-gold-500 mt-0.5">&#9679;</span>
                      <span>{a.title || a.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <QuickLink href="/instructor/progression-overview" label={t('instructor.cgi.progressionOverview', 'Progression Overview')} />
              <QuickLink href="/instructor/subject-management" label={t('instructor.cgi.manageSubjects', 'Manage Subjects')} />
              <QuickLink href="/instructor/reports" label={t('instructor.cgi.reports', 'Reports')} />
            </div>

            {/* Chart */}
            {statusData.length > 0 && (
              <div className="bg-navy-800 rounded-xl border border-navy-700 p-6 mb-8">
                <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('instructor.coursesByStatus')}</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2332"/>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12}/>
                    <YAxis stroke="#94a3b8" fontSize={12}/>
                    <Tooltip/>
                    <Bar dataKey="value" fill="#c4943c" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Today's Schedule */}
            <div className="bg-navy-800 rounded-xl border border-navy-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">{t('instructor.todaySchedule')}</h3>
                <span className="text-sm text-gray-500">{today}</span>
              </div>
              {todayCourses.length === 0 ? (
                <p className="text-sm text-gray-500">{t('common.noData', 'No courses today.')}</p>
              ) : (
                <div className="space-y-3">
                  {todayCourses.slice(0, 5).map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-4 bg-navy-900 rounded-lg border border-navy-700">
                      <div>
                        <p className="text-white font-medium">{c.title}</p>
                        <p className="text-sm text-gray-400">{c.subject_code} | {c.room_name || t("instructor.noRoom")} | {c.start_time?.slice(0, 5)}-{c.end_time?.slice(0, 5)}</p>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${c.status === "scheduled" ? "bg-blue-500/10 text-blue-400" : c.status === "completed" ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"}`}>{c.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number | string }) {
  return <div className="bg-navy-800 rounded-xl border border-navy-700 p-6"><p className="text-3xl font-bold text-white">{value}</p><p className="text-sm text-gray-400 mt-1">{title}</p></div>;
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center justify-between px-5 py-4 bg-navy-800 border border-navy-700 rounded-xl text-sm text-gray-300 hover:bg-navy-700 hover:text-white transition-colors">
      <span>{label}</span>
      <ArrowRight className="w-4 h-4" />
    </Link>
  );
}
