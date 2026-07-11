"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

const COLORS = ["#c4943c", "#3b82f6", "#22c55e", "#ef4444", "#8b5cf6", "#f59e0b"];

export default function DirectorDashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [kpis, setKpis] = useState<any>({});
  const [chartData, setChartData] = useState<any>({ flights: [], revenue: [], fleet: [], invoiceStatus: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/login"); } }, [isLoading, isAuthenticated, router]);
  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      fetch("/api/students/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      fetch("/api/invoices/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      fetch("/api/courses/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      fetch("/api/aircraft/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      fetch("/api/flight-lessons/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      fetch("/api/audits/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
    ]).then(([students, invoices, courses, aircraft, flights, audits]) => {
      const invList = invoices.results || [];
      const paid = invList.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + parseFloat(i.amount), 0);
      const outstanding = invList.filter((i: any) => i.status === "issued" || i.status === "partially_paid").reduce((s: number, i: any) => s + parseFloat(i.amount), 0);
      const fltList = flights.results || [];
      const totalHours = fltList.reduce((s: number, f: any) => s + (parseFloat(f.flight_duration) || 0), 0);
      const completedFlights = fltList.filter((f: any) => f.status === "completed").length;

      // Chart: flights by status
      const statusCounts: Record<string, number> = {};
      fltList.forEach((f: any) => { statusCounts[f.status] = (statusCounts[f.status] || 0) + 1; });
      const flightChart = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

      // Chart: revenue
      const revenueChart = [
        { name: "Collected", value: Math.round(paid) },
        { name: "Outstanding", value: Math.round(outstanding) },
      ];

      // Chart: fleet utilization
      const acList = aircraft.results || [];
      const fleetChart = acList.map((a: any) => ({ name: a.registration, hours: parseFloat(a.airframe_hours) || 0 }));

      // Chart: invoice status distribution
      const invStatus: Record<string, number> = {};
      invList.forEach((i: any) => { invStatus[i.status] = (invStatus[i.status] || 0) + 1; });
      const invStatusChart = Object.entries(invStatus).map(([name, value]) => ({ name, value }));

      setKpis({
        totalStudents: (students.results || students).length || 0,
        totalCourses: (courses.results || []).length || 0,
        totalAircraft: acList.length,
        totalFlights: fltList.length,
        completedFlights,
        totalFlightHours: Math.round(totalHours),
        revenueCollected: Math.round(paid),
        revenueOutstanding: Math.round(outstanding),
        plannedAudits: (audits.results || []).filter((a: any) => a.status === "planned").length,
      });
      setChartData({ flights: flightChart, revenue: revenueChart, fleet: fleetChart, invoiceStatus: invStatusChart });
    }).finally(() => setLoading(false));
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3"><Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-lg" /><div><h1 className="text-lg font-bold text-white">Director Dashboard</h1><p className="text-xs text-gold-500">Executive Overview</p></div></div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:inline">{user?.name || user?.email}</span>
            <button onClick={async () => { await logout(); router.push("/login"); }} className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">Logout</button>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? <p className="text-gray-500">Loading...</p> : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KpiCard label="Students" value={kpis.totalStudents} color="text-blue-400" />
              <KpiCard label="Courses" value={kpis.totalCourses} color="text-green-400" />
              <KpiCard label="Aircraft" value={kpis.totalAircraft} color="text-purple-400" />
              <KpiCard label="Flight Hours" value={`${kpis.totalFlightHours}h`} color="text-gold-400" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KpiCard label="Revenue Collected" value={`${kpis.revenueCollected.toLocaleString()} DZD`} color="text-green-400" />
              <KpiCard label="Outstanding" value={`${kpis.revenueOutstanding.toLocaleString()} DZD`} color="text-red-400" />
              <KpiCard label="Completed Flights" value={kpis.completedFlights} color="text-cyan-400" />
              <KpiCard label="Planned Audits" value={kpis.plannedAudits} color="text-yellow-400" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ChartCard title="Flights by Status">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart><Pie data={chartData.flights} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }: any) => `${name}: ${value}`}>{chartData.flights.map((_: any, i: number) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}</Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Revenue (DZD)">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData.revenue}><CartesianGrid strokeDasharray="3 3" stroke="#1a2332" /><XAxis dataKey="name" stroke="#94a3b8" fontSize={12} /><YAxis stroke="#94a3b8" fontSize={12} /><Tooltip /><Bar dataKey="value" fill="#c4943c" radius={[4,4,0,0]} /></BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Fleet Utilization (Hours)">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData.fleet} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#1a2332" /><XAxis type="number" stroke="#94a3b8" fontSize={12} /><YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={80} /><Tooltip /><Bar dataKey="hours" fill="#3b82f6" radius={[0,4,4,0]} /></BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Invoice Status Distribution">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart><Pie data={chartData.invoiceStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }: any) => `${name}: ${value}`}>{chartData.invoiceStatus.map((_: any, i: number) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}</Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <a href="/admin" className="block p-5 bg-navy-800 border border-navy-700 rounded-xl hover:border-gold-500 transition-all text-center"><p className="text-white font-semibold">Admin Panel</p><p className="text-xs text-gray-400 mt-1">Full system administration</p></a>
              <a href="/quality/dashboard" className="block p-5 bg-navy-800 border border-navy-700 rounded-xl hover:border-gold-500 transition-all text-center"><p className="text-white font-semibold">Quality & Safety</p><p className="text-xs text-gray-400 mt-1">Audits, NCRs, CAPA</p></a>
              <a href="/finance/dashboard" className="block p-5 bg-navy-800 border border-navy-700 rounded-xl hover:border-gold-500 transition-all text-center"><p className="text-white font-semibold">Finance</p><p className="text-xs text-gray-400 mt-1">Revenue and invoices</p></a>
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

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="bg-navy-800 border border-navy-700 rounded-xl p-6"><h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{title}</h3>{children}</div>;
}
