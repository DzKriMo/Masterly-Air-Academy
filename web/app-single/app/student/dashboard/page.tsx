"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";

export default function StudentDashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>({ courses: 0, completed: 0, attendance: 0, flightHours: 0, examAvg: 0, flights: 0 });
  const [flightData, setFlightData] = useState<any[]>([]);
  const [competencyData, setCompetencyData] = useState<any[]>([{ name: "Nav", value: 0 }, { name: "Comms", value: 0 }, { name: "Maneuvers", value: 0 }, { name: "Procedures", value: 0 }, { name: "Safety", value: 0 }]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/student/login"); } }, [isLoading, isAuthenticated, router]);
  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      fetch("/api/students/progress/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).catch(() => ({})),
      fetch("/api/students/flight-log/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).catch(() => ({})),
      fetch("/api/exams/my_attempts/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).catch(() => []),
    ]).then(([prog, log, attempts]) => {
      const scores = (Array.isArray(attempts) ? attempts : []).filter((a: any) => a.score !== null).map((a: any) => a.score);
      setStats({ courses: prog.total_courses || 0, completed: prog.completed_courses || 0, attendance: prog.attendance_rate || 0, flightHours: log.total_flight_hours || 0, examAvg: scores.length > 0 ? Math.round(scores.reduce((a: number,b: number) => a+b, 0) / scores.length) : 0, flights: log.total_lessons || 0 });
      const lessons = log.lessons || [];
      const chartData = lessons.slice(-10).map((l: any, i: number) => ({ name: l.date?.slice(5) || `#${i+1}`, hours: l.duration || 0 }));
      setFlightData(chartData);
      setCompetencyData([{ name: "Nav", value: Math.min(log.total_flight_hours * 2 || 10, 100) }, { name: "Comms", value: Math.min(log.total_lessons * 5 || 10, 100) }, { name: "Maneuvers", value: Math.min(stats.flights * 3 || 10, 100) }, { name: "Procedures", value: Math.min(stats.attendance || 10, 100) }, { name: "Safety", value: Math.min(100, stats.examAvg * 1.2 || 10) }]);
    }).finally(() => setDataLoading(false));
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3"><Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-lg" /><div><h1 className="text-lg font-bold text-white">Masterly Air Academy</h1><p className="text-xs text-gold-500">Student Portal</p></div></div>
          <div className="flex items-center gap-4"><span className="text-sm text-gray-400 hidden sm:inline">{user?.name || user?.email}</span><button onClick={async () => { await logout(); router.push("/student/login"); }} className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">Logout</button></div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome back, {user?.name?.split(" ")[0] || "Student"}</h2>
        <p className="text-gray-400 mb-8">Your training overview</p>
        {dataLoading ? <p className="text-gray-500">Loading stats...</p> : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard label="Enrolled" value={stats.courses} sub="Courses" />
              <StatCard label="Flight Hours" value={`${stats.flightHours}h`} sub={`${stats.flights} flights`} />
              <StatCard label="Exam Avg" value={stats.examAvg > 0 ? `${stats.examAvg}%` : "-"} sub={`${stats.attendance}% attendance`} />
              <StatCard label="Completed" value={stats.completed} sub="Courses done" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Flight Hours Trend</h3>
                {flightData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={flightData}><CartesianGrid strokeDasharray="3 3" stroke="#1a2332" /><XAxis dataKey="name" stroke="#94a3b8" fontSize={11} /><YAxis stroke="#94a3b8" fontSize={11} /><Tooltip /><Line type="monotone" dataKey="hours" stroke="#c4943c" strokeWidth={2} dot={{ r: 4 }} /></LineChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-500 text-sm text-center py-8">No flight data yet</p>}
              </div>
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Competency Radar</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={competencyData}><PolarGrid stroke="#1a2332" /><PolarAngleAxis dataKey="name" stroke="#94a3b8" fontSize={10} /><PolarRadiusAxis stroke="#94a3b8" fontSize={10} /><Radar dataKey="value" stroke="#c4943c" fill="#c4943c" fillOpacity={0.2} /></RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuickTile href="/student/exams" label="Exams" />
              <QuickTile href="/student/flights" label="Flight Log" />
              <QuickTile href="/student/courses" label="Courses" />
              <QuickTile href="/student/schedule" label="Schedule" />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><p className="text-3xl font-bold text-white">{value}</p><p className="text-sm text-gray-400 mt-1">{label}</p><p className="text-xs text-gray-500">{sub}</p></div>;
}
function QuickTile({ href, label }: { href: string; label: string }) {
  return <a href={href} className="flex items-center justify-center p-5 bg-navy-800 border border-navy-700 rounded-xl hover:border-gold-500 text-gray-300 hover:text-gold-500 transition-all text-sm font-medium min-h-[90px]">{label}</a>;
}
