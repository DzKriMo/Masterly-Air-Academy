"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

export default function StudentSchedulePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/student/login"); } }, [isLoading, isAuthenticated, router]);
  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      fetch("/api/flight-lessons/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      fetch("/api/courses/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
    ]).then(([flights, courses]) => {
      const evts: any[] = [];
      (flights.results || []).forEach((f: any) => {
        if (f.start_time) evts.push({ title: `Flight: ${f.aircraft_reg}`, start: f.start_time, end: f.end_time || f.start_time, type: "flight", color: "#3b82f6", status: f.status });
      });
      (courses.results || []).forEach((c: any) => {
        evts.push({ title: `${c.subject_code}: ${c.title}`, start: `${c.scheduled_date}T${c.start_time}`, end: `${c.scheduled_date}T${c.end_time}`, type: "course", color: "#c4943c", status: c.status });
      });
      evts.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      setEvents(evts);
    }).finally(() => setLoading(false));
  }, [isAuthenticated]);

  const upcoming = events.filter(e => new Date(e.start) >= new Date());
  const past = events.filter(e => new Date(e.start) < new Date());

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-3">
          <Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-lg" />
          <div><h1 className="text-lg font-bold text-white">My Schedule</h1>
            <button onClick={() => router.push("/student/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">Back to Dashboard</button></div>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-8">
        {loading ? <p className="text-gray-500">Loading...</p> : (
          <>
            <div className="mb-8">
              <h2 className="text-lg font-bold text-white mb-4">Upcoming ({upcoming.length})</h2>
              {upcoming.length === 0 ? <p className="text-gray-500 text-sm">No upcoming events.</p> : (
                <div className="space-y-2">
                  {upcoming.map((e, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-navy-800 border border-navy-700 rounded-xl">
                      <div className="w-1.5 h-10 rounded" style={{ backgroundColor: e.color }} />
                      <div className="flex-1"><p className="text-white text-sm font-medium">{e.title}</p><p className="text-xs text-gray-500">{new Date(e.start).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} | {e.start?.slice(11,16)} - {e.end?.slice(11,16)}</p></div>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${e.status === "completed" ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"}`}>{e.status || e.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {past.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-white mb-4">Past ({past.length})</h2>
                <div className="space-y-2 opacity-60">
                  {past.slice(-10).map((e, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-navy-800 border border-navy-700 rounded-lg">
                      <div className="w-1 h-8 rounded" style={{ backgroundColor: e.color }} /><div className="flex-1"><p className="text-white text-sm">{e.title}</p><p className="text-xs text-gray-500">{new Date(e.start).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
