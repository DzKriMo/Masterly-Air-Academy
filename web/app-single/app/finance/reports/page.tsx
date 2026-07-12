"use client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

export default function FinanceReportsPage() {
  const { data: invoices=[], isLoading } = useQuery({
    queryKey: ['finance-reports'],
    queryFn: () => fetch("/api/invoices/",{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).then(d=>d.results||[]),
  });

  const statusData = Object.entries(invoices.reduce((acc:any, i:any) => { acc[i.status] = (acc[i.status]||0) + 1; return acc; }, {})).map(([name, value]) => ({name, value}));
  const revenueData = invoices.map((i:any) => ({name: i.invoice_number?.slice(-6)||"N/A", amount: parseFloat(i.amount)||0}));

  return (<div className="flex-1 min-w-0"><nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center"><h1 className="text-lg font-bold text-white">Financial Reports</h1></div></nav>
    <main className="px-6 py-8">{isLoading?<p className="text-gray-500">Loading...</p>:<>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6"><h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Invoice Status Distribution</h3><ResponsiveContainer width="100%" height={250}><BarChart data={statusData}><CartesianGrid strokeDasharray="3 3" stroke="#1a2332"/><XAxis dataKey="name" stroke="#94a3b8" fontSize={12}/><YAxis stroke="#94a3b8" fontSize={12}/><Tooltip/><Bar dataKey="value" fill="#c4943c" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6"><h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Revenue by Invoice</h3><ResponsiveContainer width="100%" height={250}><BarChart data={revenueData.slice(0,10)}><CartesianGrid strokeDasharray="3 3" stroke="#1a2332"/><XAxis dataKey="name" stroke="#94a3b8" fontSize={12}/><YAxis stroke="#94a3b8" fontSize={12}/><Tooltip/><Bar dataKey="amount" fill="#3b82f6" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
      </div>
      <div className="flex gap-4"><a href="/api/export/invoices/" className="inline-flex px-6 py-3 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm">Export Invoices (Excel)</a><a href="/api/export/students/" className="inline-flex px-6 py-3 bg-navy-800 border border-navy-700 text-gray-400 hover:border-gold-500 rounded-lg text-sm">Export Students (Excel)</a></div>
    </>}</main></div>);
}
