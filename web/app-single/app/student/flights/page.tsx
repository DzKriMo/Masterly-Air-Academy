"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

interface FlightEntry { date: string; aircraft: string; duration: number; grade: number | null; result: string | null; }

export default function StudentFlightsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [log, setLog] = useState<{ total_flight_hours: number; total_lessons: number; lessons: FlightEntry[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) { router.push("/student/login"); return; }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const session = JSON.parse(sessionStorage.getItem("maa_session") || "{}");
    fetch("/api/students/flight-log/", { headers: { Authorization: `Bearer ${session.token}` } })
      .then(r => r.json()).then(setLog).finally(() => setLoading(false));
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-3">
          <Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-lg" />
          <div><h1 className="text-lg font-bold text-white">Flight Log</h1>
            <button onClick={() => router.push("/student/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">Back to Dashboard</button></div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading ? <p className="text-gray-500">Loading...</p> : !log ? <p className="text-gray-500">No flight data.</p> : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><p className="text-3xl font-bold text-white">{log.total_flight_hours}h</p><p className="text-sm text-gray-400 mt-1">Total Flight Hours</p></div>
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><p className="text-3xl font-bold text-white">{log.total_lessons}</p><p className="text-sm text-gray-400 mt-1">Lessons Completed</p></div>
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><p className="text-3xl font-bold text-white">{log.total_lessons > 0 ? (log.total_flight_hours / log.total_lessons).toFixed(1) : "0"}h</p><p className="text-sm text-gray-400 mt-1">Avg per Lesson</p></div>
            </div>

            <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
              <div className="grid grid-cols-4 gap-4 px-5 py-3 border-b border-navy-700 text-xs text-gray-500 uppercase tracking-wider font-medium">
                <span>Date</span><span>Aircraft</span><span>Duration</span><span>Grade</span>
              </div>
              {log.lessons.length === 0 ? (
                <p className="p-5 text-sm text-gray-500">No completed flights yet.</p>
              ) : (
                log.lessons.map((f, i) => (
                  <div key={i} className="grid grid-cols-4 gap-4 px-5 py-3 border-b border-navy-700/50 text-sm hover:bg-navy-700/20">
                    <span className="text-gray-300">{f.date}</span>
                    <span className="text-white font-medium">{f.aircraft}</span>
                    <span className="text-gray-300">{f.duration}h</span>
                    <span className={f.grade && f.grade >= 7 ? "text-green-400" : f.grade ? "text-red-400" : "text-gray-500"}>{f.grade ?? "-"} {f.result && `(${f.result})`}</span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
