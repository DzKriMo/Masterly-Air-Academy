"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

export default function DirectorDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [kpis, setKpis] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/login"); } }, [isLoading, isAuthenticated, router]);

  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      fetch("/api/students/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).catch(() => ({})),
      fetch("/api/invoices/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).catch(() => ({})),
      fetch("/api/courses/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).catch(() => ({})),
      fetch("/api/aircraft/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).catch(() => ({})),
      fetch("/api/flight-lessons/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).catch(() => ({})),
      fetch("/api/audits/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).catch(() => ({})),
    ]).then(([students, invoices, courses, aircraft, flights, audits]) => {
      const invList = invoices.results || [];
      const paid = invList.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + parseFloat(i.amount), 0);
      const outstanding = invList.filter((i: any) => i.status === 'issued' || i.status === 'partially_paid').reduce((s: number, i: any) => s + parseFloat(i.amount), 0);
      const completedFlights = (flights.results || []).filter((f: any) => f.status === 'completed').length;
      const totalHours = (flights.results || []).reduce((s: number, f: any) => s + (parseFloat(f.flight_duration) || 0), 0);
      setKpis({
        totalStudents: (students.results || students).length || 0,
        totalCourses: (courses.results || []).length || 0,
        totalAircraft: (aircraft.results || []).length || 0,
        totalFlights: (flights.results || []).length || 0,
        completedFlights,
        totalFlightHours: Math.round(totalHours),
        revenueCollected: Math.round(paid),
        revenueOutstanding: Math.round(outstanding),
        plannedAudits: (audits.results || []).filter((a: any) => a.status === 'planned').length,
        completedAudits: (audits.results || []).filter((a: any) => a.status === 'completed').length,
      });
    }).finally(() => setLoading(false));
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-lg" />
            <div><h1 className="text-lg font-bold text-white">Director Dashboard</h1><p className="text-xs text-gold-500">Executive Overview</p></div>
          </div>
          <span className="text-sm text-gray-400 hidden sm:inline">{user?.name || user?.email}</span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-white mb-8">Key Performance Indicators</h2>

        {loading ? <p className="text-gray-500">Loading KPIs...</p> : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              <KpiCard label="Total Students" value={kpis.totalStudents} color="text-blue-400" />
              <KpiCard label="Active Courses" value={kpis.totalCourses} color="text-green-400" />
              <KpiCard label="Aircraft Fleet" value={kpis.totalAircraft} color="text-purple-400" />
              <KpiCard label="Total Flights" value={`${kpis.totalFlights} (${kpis.completedFlights} done)`} color="text-gold-400" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              <KpiCard label="Flight Hours" value={`${kpis.totalFlightHours}h`} color="text-cyan-400" />
              <KpiCard label="Revenue Collected" value={`${kpis.revenueCollected.toLocaleString()} DZD`} color="text-green-400" />
              <KpiCard label="Outstanding" value={`${kpis.revenueOutstanding.toLocaleString()} DZD`} color="text-red-400" />
              <KpiCard label="Audits" value={`${kpis.plannedAudits} planned, ${kpis.completedAudits} done`} color="text-yellow-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a href="/admin" className="block p-5 bg-navy-800 border border-navy-700 rounded-xl hover:border-gold-500 transition-all text-center">
                <p className="text-white font-semibold">Admin Panel</p><p className="text-xs text-gray-400 mt-1">Full system administration</p>
              </a>
              <a href="/quality/dashboard" className="block p-5 bg-navy-800 border border-navy-700 rounded-xl hover:border-gold-500 transition-all text-center">
                <p className="text-white font-semibold">Quality & Safety</p><p className="text-xs text-gray-400 mt-1">Audits, NCRs, CAPA</p>
              </a>
              <a href="/finance/dashboard" className="block p-5 bg-navy-800 border border-navy-700 rounded-xl hover:border-gold-500 transition-all text-center">
                <p className="text-white font-semibold">Finance</p><p className="text-xs text-gray-400 mt-1">Revenue and invoices</p>
              </a>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><p className={`text-2xl font-bold ${color}`}>{value}</p><p className="text-xs text-gray-400 mt-1">{label}</p></div>;
}
