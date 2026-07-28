"use client";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { PageHeader } from "@/components/page-header";

export default function InstructorDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  const isFI = user?.role === 'flight_instructor';
  const isGI = user?.role === 'ground_instructor';

  const today = new Date().toISOString().split("T")[0];

  // GI loads courses; FI loads flights
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['instr-courses'],
    queryFn: () => api.get<any>("/courses/").then(r => (r as unknown as any).results || []),
    enabled: isAuthenticated && isGI,
  });

  const { data: flights = [], isLoading: flightsLoading } = useQuery({
    queryKey: ['instr-flights'],
    queryFn: () => api.get<any>("/flight-lessons/").then(r => (r as unknown as any).results || []),
    enabled: isAuthenticated && isFI,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['instr-students'],
    queryFn: () => api.get<any>("/students/").then(r => (r as unknown as any).results || []),
    enabled: isAuthenticated,
  });

  const { data: alertsData } = useQuery({
    queryKey: ['instr-alerts'],
    queryFn: () => api.get<any>("/notifications/?limit=5").then(r => (r as unknown as any).results || []),
    enabled: isAuthenticated,
  });
  const alerts: any[] = alertsData || [];

  const isLoading = isFI ? flightsLoading : coursesLoading;
  const todayCourses = courses.filter((c: any) => c.scheduled_date === today);
  const todayFlights = flights.filter((f: any) => f.scheduled_date === today);
  const myStudents = students.filter((s: any) => {
    if (isFI) return (s as any).instructor === user?.id || (s as any).instructor_name === user?.name;
    if (isGI) return (s as any).program || true;
    return true;
  });

  const statusData = isGI
    ? Object.entries(courses.reduce((acc: any, c: any) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value }))
    : Object.entries(flights.reduce((acc: any, f: any) => { acc[f.status] = (acc[f.status] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value }));

  return (
    <div className="flex-1 min-w-0">
      <PageHeader title={t('instructor.dashboard')} />
      <main className="px-6 py-8">
        <h2 className="text-2xl font-bold text-white mb-2">{t("dashboard_welcome")}, {user?.name?.split(" ")[0] || "Instructor"}</h2>
        <p className="text-gray-400 mb-8">
          {isFI ? t('instructor.fiDashboardSubtitle', 'Your flight schedule and students at a glance') : t('instructor.dashboardSubtitle')}
        </p>

        {isLoading ? <LoadingSkeleton type="card" rows={2} /> : (
          <>
            {/* Stats — FI */}
            {isFI && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Stat title={t('instructor.todaysFlights', "Today's Flights")} value={todayFlights.length} />
                <Stat title={t('instructor.completed', 'Completed')} value={todayFlights.filter((f: any) => f.status === "completed").length} />
                <Stat title={t('instructor.myStudents')} value={myStudents.length} />
                <Stat title={t('instructor.totalHours', 'Total Hours')} value={`${todayFlights.reduce((s: number, f: any) => s + (parseFloat(f.flight_duration) || 0), 0).toFixed(1)}h`} />
              </div>
            )}

            {/* Stats — GI */}
            {isGI && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Stat title={t('instructor.totalCourses')} value={courses.length} />
                <Stat title={t('instructor.todaysCourses')} value={todayCourses.length} />
                <Stat title={t('instructor.myStudents')} value={myStudents.length} />
                <Stat title={t('instructor.activeStudents')} value={students.filter((s: any) => s.status === "active").length} />
              </div>
            )}

            {/* Alerts */}
            <div className="bg-navy-800 rounded-xl border border-navy-700 p-6 mb-8">
              <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('common.notifications')}</h3>
              {alerts.length === 0 ? (
                <p className="text-sm text-gray-500">{t('common.noData', 'No notifications')}</p>
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

            {/* Chart */}
            {statusData.length > 0 && (
              <div className="bg-navy-800 rounded-xl border border-navy-700 p-6 mb-8">
                <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">
                  {isFI ? t('instructor.flightStatus', 'Flight Status') : t('instructor.coursesByStatus')}
                </h3>
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
              {isFI && todayFlights.length === 0 && <p className="text-sm text-gray-500">{t('common.noData', 'No flights today.')}</p>}
              {isGI && todayCourses.length === 0 && <p className="text-sm text-gray-500">{t('common.noData', 'No courses today.')}</p>}
              {(isFI ? todayFlights : todayCourses).slice(0, 5).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-navy-900 rounded-lg border border-navy-700 mt-3">
                  <div>
                    <p className="text-white font-medium">{isFI ? (item.student_name || item.student) : item.title}</p>
                    <p className="text-sm text-gray-400">
                      {isFI
                        ? `${item.aircraft_reg || item.aircraft} | ${item.start_time?.slice(0, 5)}-${item.end_time?.slice(0, 5)}`
                        : `${item.subject_code || ''} | ${item.room_name || t("instructor.noRoom")} | ${item.start_time?.slice(0, 5)}-${item.end_time?.slice(0, 5)}`}
                    </p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${item.status === "scheduled" ? "bg-blue-500/10 text-blue-400" : item.status === "completed" ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"}`}>
                    {item.status}
                  </span>
                </div>
              ))}
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
