"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/use-translation";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import multiMonthPlugin from '@fullcalendar/multimonth';

export default function SchedulePage() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  useAuthGuard(isAuthenticated, authLoading);

  const hasFlightAccess = user?.role === 'flight_instructor' || user?.role === 'chief_flight_instructor';

  const fetchSchedule = () => {
    if (!isAuthenticated) return;
    setLoading(true);
    const calls: Promise<any>[] = [
      api.get<any>("/flight-lessons/").catch(() => ({ results: [] })),
      api.get<any>("/courses/").catch(() => ({ results: [] })),
      api.get<any>("/exams/").catch(() => ({ results: [] })),
    ];
    if (hasFlightAccess) {
      calls.push(api.get<any>("/simulator-sessions/").catch(() => ({ results: [] })));
    }
    Promise.all(calls).then(([flightsResp, coursesResp, examsResp, simSessionsResp]) => {
      const flights = flightsResp as unknown as any;
      const courses = coursesResp as unknown as any;
      const exams = examsResp as unknown as any;
      const simSessions = (simSessionsResp || { results: [] }) as unknown as any;
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
      <PageHeader
        title={t("schedule", "Schedule")}
        backHref="/instructor/dashboard"
        backLabel={t("instructor.backToDashboard", "Back to Dashboard")}
        actions={
          <button onClick={async()=>{await logout();router.push("/login")}} className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">{t("common.signOut", "Logout")}</button>
        }
      />
      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && <ErrorCard message={error} onRetry={fetchSchedule} />}

        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{backgroundColor:"#3b82f6"}}/><span className="text-xs text-gray-400">{t("instructor.flights", "Flights")}</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{backgroundColor:"#c4943c"}}/><span className="text-xs text-gray-400">{t("instructor.courses", "Courses")}</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{backgroundColor:"#8b5cf6"}}/><span className="text-xs text-gray-400">{t("instructor.exams", "Exams")}</span></div>
          {hasFlightAccess && <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{backgroundColor:"#f59e0b"}}/><span className="text-xs text-gray-400">{t("instructor.simulator", "Simulator")}</span></div>}
        </div>

        {loading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : events.length === 0 ? (
          <EmptyState message={t("instructor.noEventsScheduled", "No events scheduled.")} />
        ) : (
          <div className="fc-wrapper">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, multiMonthPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{left:"prev,next today",center:"title",right:"dayGridMonth,timeGridWeek,multiMonthYear"}}
              events={events}
              height="auto"
              slotMinTime="06:00:00"
              slotMaxTime="22:00:00"
              allDaySlot={false}
              firstDay={1}
              locale="en-gb"
              eventTimeFormat={{hour:"2-digit",minute:"2-digit",hour12:false}}
              eventClick={(info) => { info.jsEvent.preventDefault(); setSelectedEvent(info.event); }}
            />
          {/* Event Detail Modal */}
          {selectedEvent && (
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={() => setSelectedEvent(null)}>
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <div className="relative bg-navy-800 border border-navy-700 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
                  <h2 className="text-lg font-semibold text-white">{selectedEvent.title}</h2>
                  <button onClick={() => setSelectedEvent(null)} className="text-gray-500 hover:text-white">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="px-6 py-4 space-y-3">
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider">{t('common.type', 'Type')}</span>
                    <p className="text-sm text-white capitalize">{selectedEvent.extendedProps?.type || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider">{t('common.start', 'Start')}</span>
                    <p className="text-sm text-white">{selectedEvent.start ? new Date(selectedEvent.start).toLocaleString() : '-'}</p>
                  </div>
                  {selectedEvent.end && (
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wider">{t('common.end', 'End')}</span>
                      <p className="text-sm text-white">{new Date(selectedEvent.end).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedEvent.extendedProps?.status && (
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wider">{t('common.status', 'Status')}</span>
                      <p className="text-sm text-white capitalize">{selectedEvent.extendedProps.status}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
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
        .fc-wrapper .fc .fc-multimonth { background: #0f172a; }
        .fc-wrapper .fc .fc-multimonth-month { background: #0f172a; border-color: #1e293b; }
        .fc-wrapper .fc .fc-multimonth-title { color: #f8fafc; background: #1e293b; padding: 6px 8px; font-size: 0.85rem; }
      `}</style>
    </div>
  );
}
