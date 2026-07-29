"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/use-translation";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { StatsCard } from "@/components/stats-card";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import { PlaneTakeoff, Users, CalendarDays, Wrench } from "lucide-react";

export default function SchedulerDashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ bookings: 0, aircraft: 0, instructors: 0, maintenance: 0 });

  useAuthGuard(isAuthenticated, authLoading);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    Promise.all([
      api.get<any>("/resource-bookings/").catch(() => ({ results: [] })),
      api.get<any>("/aircraft/").catch(() => ({ results: [] })),
      api.get<any>("/flight-instructors/").catch(() => ({ results: [] })),
      api.get<any>("/maintenance-records/").catch(() => ({ results: [] })),
      api.get<any>("/flight-lessons/").catch(() => ({ results: [] })),
      api.get<any>("/courses/").catch(() => ({ results: [] })),
    ]).then(([bookingsRes, aircraftRes, instructorsRes, maintRes, flightsRes, coursesRes]) => {
      const bookings = (bookingsRes as any)?.results || [];
      const aircraft = (aircraftRes as any)?.results || [];
      const instructors = (instructorsRes as any)?.results || [];
      const maintenance = (maintRes as any)?.results || [];
      const flights = (flightsRes as any)?.results || [];
      const courses = (coursesRes as any)?.results || [];

      setStats({
        bookings: bookings.filter((b: any) => b.status === "confirmed").length,
        aircraft: aircraft.filter((a: any) => a.status === "available").length,
        instructors: instructors.filter((i: any) => i.status === "active").length,
        maintenance: maintenance.filter((m: any) => m.status === "scheduled").length,
      });

      const evts: any[] = [];
      flights.forEach((f: any) => {
        if (f.start_time) evts.push({ title: `✈ ${f.aircraft_reg}`, start: f.start_time, end: f.end_time || f.start_time, backgroundColor: "#3b82f6", borderColor: "#3b82f6", extendedProps: { type: "flight" } });
      });
      courses.forEach((c: any) => {
        evts.push({ title: `📚 ${c.title}`, start: `${c.scheduled_date}T${c.start_time}`, end: `${c.scheduled_date}T${c.end_time}`, backgroundColor: "#c4943c", borderColor: "#c4943c", extendedProps: { type: "course" } });
      });
      setEvents(evts);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-navy-900">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-lg font-bold text-white mb-6">{t("scheduler.dashboard")}</h1>

        {loading ? (
          <LoadingSkeleton type="card" rows={4} />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatsCard label={t("scheduler.totalBookings")} value={stats.bookings} valueClassName="text-blue-400" />
              <StatsCard label={t("scheduler.activeAircraft")} value={stats.aircraft} valueClassName="text-green-400" />
              <StatsCard label={t("scheduler.availableInstructors")} value={stats.instructors} valueClassName="text-gold-500" />
              <StatsCard label={t("scheduler.maintenanceDue")} value={stats.maintenance} valueClassName={stats.maintenance > 0 ? "text-red-400" : "text-green-400"} />
            </div>

            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t("scheduler.calendar")}</h2>
              <div className="[&_.fc-multimonth]:bg-navy-800 [&_.fc-multimonth-month]:bg-navy-800 [&_.fc-multimonth-title]:text-white [&_.fc-toolbar-title]:text-white [&_.fc-button]:!bg-gold-500/20 [&_.fc-button]:!border-gold-500/30 [&_.fc-button]:!text-gold-500 [&_.fc-button:hover]:!bg-gold-500 [&_.fc-button:hover]:!text-navy-900 [&_.fc-daygrid-day]:bg-navy-900 [&_.fc-daygrid-day.fc-day-today]:bg-gold-500/10 [&_.fc-col-header-cell]:bg-navy-800 [&_.fc-col-header-cell-cushion]:text-gray-300 [&_.fc-daygrid-day-number]:text-gray-400 [&_.fc-event]:!text-xs [&_.fc-event]:!cursor-pointer [&_.fc-scrollgrid]:!border-navy-700 [&_.fc-theme-standard td]:!border-navy-700 [&_.fc-theme-standard th]:!border-navy-700">
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin, multiMonthPlugin]}
                  initialView="dayGridMonth"
                  views={{ multiMonth: { type: 'multiMonth', duration: { months: 3 } } }}
                  headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,multiMonth' }}
                  events={events}
                  height="auto"
                  locale={typeof window !== 'undefined' && navigator.language?.startsWith('fr') ? 'fr' : navigator.language?.startsWith('ar') ? 'ar' : 'en'}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
