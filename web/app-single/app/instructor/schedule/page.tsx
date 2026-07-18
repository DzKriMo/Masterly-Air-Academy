"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTranslation } from "@/lib/use-translation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';

export default function SchedulePage() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!authLoading && !isAuthenticated) { router.push("/login"); } }, [authLoading, isAuthenticated, router]);

  const fetchSchedule = () => {
    if (!isAuthenticated) return;
    setLoading(true);
    Promise.all([
      api.get<any>("/flight-lessons/"),
      api.get<any>("/courses/"),
      api.get<any>("/exams/"),
      api.get<any>("/simulator-sessions/"),
    ]).then(([flightsResp, coursesResp, examsResp, simSessionsResp]) => {
      const flights = flightsResp as unknown as any;
      const courses = coursesResp as unknown as any;
      const exams = examsResp as unknown as any;
      const simSessions = simSessionsResp as unknown as any;
      const evts: any[] = [];
      (flights.results || []).forEach((f: any) => { if (f.start_time) evts.push({ title: `✈ ${f.student_name} - ${f.aircraft_reg}`, start: f.start_time, end: f.end_time || f.start_time, backgroundColor: "#3b82f6", borderColor: "#3b82f6", extendedProps: { type: "flight", id: f.id, status: f.status } }); });
      (courses.results || []).forEach((c: any) => { evts.push({ title: `📚 ${c.subject_code}: ${c.title}`, start: `${c.scheduled_date}T${c.start_time}`, end: `${c.scheduled_date}T${c.end_time}`, backgroundColor: "#c4943c", borderColor: "#c4943c", extendedProps: { type: "course", id: c.id, status: c.status } }); });
      (exams.results || []).forEach((e: any) => { if (e.open_date) evts.push({ title: `📝 ${e.code}`, start: e.open_date, end: e.close_date || e.open_date, backgroundColor: "#8b5cf6", borderColor: "#8b5cf6", extendedProps: { type: "exam", id: e.id, status: e.status } }); });
      (simSessions.results || []).forEach((s: any) => { if (s.scheduled_date) evts.push({ title: `🎮 ${s.simulator_name || 'Sim'}`, start: s.scheduled_date, backgroundColor: "#f59e0b", borderColor: "#f59e0b", extendedProps: { type: "simulator", id: s.id, status: s.status } }); });
      setEvents(evts); setError(null);
    }).catch(err => { console.error("Failed to load schedule:", err); setError(t("instructor.failedToLoadSchedule", "Failed to load schedule. Please try again.")); }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchSchedule(); }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110}/>
            <div>
              <h1 className="text-lg font-bold text-white">{t("schedule", "Schedule")}</h1>
              <button onClick={()=>router.push("/instructor/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">{t("instructor.backToDashboard", "Back to Dashboard")}</button>
            </div>
          </div>
          <button onClick={async()=>{await logout();router.push("/login")}} className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">{t("common.signOut", "Logout")}</button>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && <ErrorCard message={error} onRetry={fetchSchedule} />}

        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{backgroundColor:"#3b82f6"}}/><span className="text-xs text-gray-400">{t("instructor.flights", "Flights")}</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{backgroundColor:"#c4943c"}}/><span className="text-xs text-gray-400">{t("instructor.courses", "Courses")}</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{backgroundColor:"#8b5cf6"}}/><span className="text-xs text-gray-400">{t("instructor.exams", "Exams")}</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{backgroundColor:"#f59e0b"}}/><span className="text-xs text-gray-400">{t("instructor.simulator", "Simulator")}</span></div>
        </div>

        {loading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : events.length === 0 ? (
          <EmptyState message={t("instructor.noEventsScheduled", "No events scheduled.")} />
        ) : (
          <div className="fc-wrapper">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{left:"prev,next today",center:"title",right:"dayGridMonth,timeGridWeek,dayGridYear"}}
              events={events}
              height="auto"
              slotMinTime="06:00:00"
              slotMaxTime="22:00:00"
              allDaySlot={false}
              firstDay={1}
              locale="en-gb"
              eventTimeFormat={{hour:"2-digit",minute:"2-digit",hour12:false}}
            />
          </div>
        )}
      </main>

      <style>{`
        .fc-wrapper .fc { background: #0f172a; border-color: #1e293b; font-family: inherit; }
        .fc-wrapper .fc .fc-toolbar-title { color: #f8fafc; font-size: 1.1rem; }
        .fc-wrapper .fc .fc-button { background: #1e293b; border-color: #334155; color: #94a3b8; font-size: 0.8rem; }
        .fc-wrapper .fc .fc-button:hover { background: #334155; color: #f8fafc; }
        .fc-wrapper .fc .fc-button-primary:not(:disabled).fc-button-active,
        .fc-wrapper .fc .fc-button-primary:not(:disabled):active { background: #c4943c; border-color: #c4943c; color: #0f172a; }
        .fc-wrapper .fc .fc-daygrid-day { background: #0f172a; border-color: #1e293b; }
        .fc-wrapper .fc .fc-daygrid-day-number { color: #94a3b8; }
        .fc-wrapper .fc .fc-col-header-cell { background: #1e293b; }
        .fc-wrapper .fc .fc-col-header-cell-cushion { color: #f8fafc; }
        .fc-wrapper .fc .fc-timegrid-slot { background: #0f172a; border-color: #1e293b; }
        .fc-wrapper .fc .fc-timegrid-axis-frame { color: #64748b; }
        .fc-wrapper .fc .fc-timegrid-now-indicator-line { border-color: #c4943c; }
        .fc-wrapper .fc .fc-timegrid-now-indicator-arrow { border-color: #c4943c; }
        .fc-wrapper .fc .fc-scrollgrid { border-color: #1e293b; }
        .fc-wrapper .fc .fc-day-today { background: rgba(196,148,60,0.15) !important; }
      .fc-wrapper .fc .fc-day-today .fc-daygrid-day-number,
      .fc-wrapper .fc .fc-day-today .fc-col-header-cell-cushion,
      .fc-wrapper .fc .fc-day-today .fc-timegrid-slot-label-cushion { color: #1e293b !important; }
        .fc-wrapper .fc .fc-event { border-radius: 4px; padding: 2px 4px; font-size: 0.75rem; cursor: pointer; }
        .fc-wrapper .fc .fc-non-business { background: rgba(30,41,59,0.5); }
        .fc-wrapper .fc .fc-header-toolbar { margin-bottom: 1em !important; }
        .fc-wrapper .fc .fc-daygrid-more-link { color: #c4943c; }
        .fc-wrapper .fc .fc-daygrid-day-events { min-height: 2em; }
      `}</style>
    </div>
  );
}
