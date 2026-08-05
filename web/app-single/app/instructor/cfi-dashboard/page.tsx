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

export default function CFIDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  const today = todayLocal();

  const { data: flights = [], isLoading: flLoading } = useQuery({
    queryKey: ['cfi-flights', today],
    queryFn: () => api.get<any>("/flight-lessons/").then(r => (r as unknown as any).results || []),
    enabled: isAuthenticated,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['cfi-students'],
    queryFn: () => api.get<any>("/students/").then(r => (r as unknown as any).results || []),
    enabled: isAuthenticated,
  });

  const { data: aircraft = [] } = useQuery({
    queryKey: ['cfi-aircraft'],
    queryFn: () => api.get<any>("/aircraft/").then(r => (r as unknown as any).results || []),
    enabled: isAuthenticated,
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ['cfi-instructors'],
    queryFn: () => api.get<any>("/flight-instructors/").then(r => (r as unknown as any).results || []),
    enabled: isAuthenticated,
  });

  const { data: alertsData } = useQuery({
    queryKey: ['cfi-alerts'],
    queryFn: () => api.get<any>("/notifications/").then(r => (r as unknown as any).results || []),
    enabled: isAuthenticated,
  });
  const alerts: any[] = alertsData || [];

  const todayFlights = flights.filter((f: any) => f.scheduled_date === today);
  const scheduled = todayFlights.filter((f: any) => f.status === "scheduled").length;
  const completed = todayFlights.filter((f: any) => f.status === "completed").length;
  const cancelled = todayFlights.filter((f: any) => f.status === "cancelled").length;

  const activeStudents = students.filter((s: any) => s.status === "active").length;

  const activeAircraft = aircraft.filter((a: any) => a.status === "active").length;
  const inMaintenance = aircraft.filter((a: any) => a.status === "in_maintenance").length;
  const availableInstructors = Array.isArray(instructors) ? instructors.length : 0;

  // Flight status distribution for chart
  const statusCounts: Record<string, number> = {};
  flights.forEach((f: any) => { statusCounts[f.status] = (statusCounts[f.status] || 0) + 1; });
  const statusChart = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  return (
    <div className="flex-1 min-w-0">
      <PageHeader title={t('instructor.dashboard')} />
      <main className="px-6 py-8">
        <h2 className="text-2xl font-bold text-white mb-2">{t("dashboard_welcome")}, {user?.name?.split(" ")[0] || "CFI"}</h2>
        <p className="text-gray-400 mb-8">{t('instructor.cfi.overview', 'Flight training operational overview')}</p>

        {flLoading ? <LoadingSkeleton type="card" rows={3} /> : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Stat title={t('instructor.cfi.todaysFlights')} value={`${scheduled}/${completed}/${cancelled}`} />
              <Stat title={t('instructor.cfi.studentsInProgression')} value={activeStudents} />
              <Stat title={t('instructor.cfi.readyForProgressCheck')} value={"—"} />
              <Stat title={t('instructor.cfi.readyForSkillTest')} value={"—"} />
            </div>

            {/* Resources */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <ResourceCard title={t('instructor.cfi.availableAircraft')} value={activeAircraft} />
              <ResourceCard title={t('instructor.cfi.availableInstructors')} value={availableInstructors} />
              <ResourceCard title={t('instructor.cfi.aircraftInMaintenance')} value={inMaintenance} />
            </div>

            {/* Alerts */}
            <div className="bg-navy-800 rounded-xl border border-navy-700 p-6 mb-8">
              <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('instructor.cfi.alerts')}</h3>
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

            {/* Charts */}
            {statusChart.length > 0 && (
              <div className="bg-navy-800 rounded-xl border border-navy-700 p-6 mb-8">
                <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('instructor.cfi.flightStatus', 'Flight Status Distribution')}</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={statusChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2332"/>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12}/>
                    <YAxis stroke="#94a3b8" fontSize={12}/>
                    <Tooltip/>
                    <Bar dataKey="value" fill="#c4943c" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <QuickLink href="/instructor/instructor-management" label={t('instructor.cfi.manageInstructors', 'Manage Instructors')} />
              <QuickLink href="/instructor/flight-programs" label={t('instructor.cfi.managePrograms', 'Flight Programs')} />
              <QuickLink href="/instructor/student-progress" label={t('instructor.cfi.studentProgress', 'Student Progress')} />
            </div>

            {/* Today's Flights */}
            <div className="bg-navy-800 rounded-xl border border-navy-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">{t('instructor.todaySchedule')}</h3>
                <span className="text-sm text-gray-500">{today}</span>
              </div>
              {todayFlights.length === 0 ? (
                <p className="text-sm text-gray-500">{t('common.noData', 'No flights scheduled for today.')}</p>
              ) : (
                <div className="space-y-3">
                  {todayFlights.slice(0, 5).map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between p-4 bg-navy-900 rounded-lg border border-navy-700">
                      <div>
                        <p className="text-white font-medium">{f.student_name || f.student}</p>
                        <p className="text-sm text-gray-400">{f.aircraft_reg || f.aircraft} | {f.start_time?.slice(0,5)}-{f.end_time?.slice(0,5)}</p>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${f.status === "scheduled" ? "bg-blue-500/10 text-blue-400" : f.status === "completed" ? "bg-green-500/10 text-green-400" : f.status === "cancelled" ? "bg-red-500/10 text-red-400" : "bg-gray-500/10 text-gray-400"}`}>
                        {f.status}
                      </span>
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

function ResourceCard({ title, value }: { title: string; value: number | string }) {
  return <div className="bg-navy-800 rounded-xl border border-navy-700 p-6"><p className="text-2xl font-bold text-white">{value}</p><p className="text-sm text-gray-400 mt-1">{title}</p></div>;
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center justify-between px-5 py-4 bg-navy-800 border border-navy-700 rounded-xl text-sm text-gray-300 hover:bg-navy-700 hover:text-white transition-colors">
      <span>{label}</span>
      <ArrowRight className="w-4 h-4" />
    </Link>
  );
}
