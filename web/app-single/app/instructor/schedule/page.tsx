"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

export default function SchedulePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/login"); } }, [isLoading, isAuthenticated, router]);
  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      fetch("/api/flight-lessons/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      fetch("/api/courses/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
    ]).then(([flights, courses]) => {
      const evts: any[] = [];
      (flights.results || []).forEach((f: any) => {
        if (f.start_time) evts.push({ title: `${f.student_name} | ${f.aircraft_reg}`, start: f.start_time, end: f.end_time || f.start_time, color: "#3b82f6", extendedProps: { type: "flight", id: f.id } });
      });
      (courses.results || []).forEach((c: any) => {
        const d = c.scheduled_date;
        evts.push({ title: `${c.subject_code}: ${c.title}`, start: `${d}T${c.start_time}`, end: `${d}T${c.end_time}`, color: "#c4943c", extendedProps: { type: "course", id: c.id } });
      });
      setEvents(evts);
    }).finally(() => setLoading(false));
  }, [isAuthenticated]);

  const today = new Date().toISOString().split("T")[0];
  const todayEvents = events.filter(e => e.start?.startsWith(today));

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-lg" />
            <div><h1 className="text-lg font-bold text-white">Schedule</h1>
              <button onClick={() => router.push("/instructor/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">Back to Dashboard</button></div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? <p className="text-gray-500">Loading...</p> : (
          <>
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4">Today — {today}</h2>
              {todayEvents.length === 0 ? <p className="text-gray-500 text-sm">No events scheduled for today.</p> : (
                <div className="space-y-2">
                  {todayEvents.map((e, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-navy-800 border border-navy-700 rounded-lg">
                      <div className="w-1 h-8 rounded" style={{ backgroundColor: e.color }} />
                      <div><p className="text-white text-sm font-medium">{e.title}</p><p className="text-xs text-gray-500">{e.start?.slice(11,16)} - {e.end?.slice(11,16)} | {e.extendedProps?.type}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Legend</h3>
              <div className="flex gap-6">
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: "#3b82f6" }} /><span className="text-sm text-gray-400">Flight Lessons</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: "#c4943c" }} /><span className="text-sm text-gray-400">Ground Courses</span></div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
