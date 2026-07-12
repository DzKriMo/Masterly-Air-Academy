"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#c4943c", "#3b82f6", "#22c55e", "#ef4444", "#8b5cf6"];
export default function DirectorDashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [kpis, setKpis] = useState<any>({});
  const [charts, setCharts] = useState<any>({ flights: [], revenue: [], fleet: [], invoices: [] });
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/login"); } }, [isLoading, isAuthenticated, router]);
  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };
  useEffect(() => { if (!isAuthenticated) return;
    Promise.all(["/api/students/","/api/invoices/","/api/courses/","/api/aircraft/","/api/flight-lessons/","/api/audits/"].map(u => fetch(u,{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()))).then(([st,inv,co,ac,fl,au])=>{
      const iList=inv.results||[]; const fList=fl.results||[]; const aList=ac.results||[];
      const paid=iList.filter((i:any)=>i.status==="paid").reduce((s:number,i:any)=>s+parseFloat(i.amount),0);
      const out=iList.filter((i:any)=>i.status==="issued"||i.status==="partially_paid").reduce((s:number,i:any)=>s+parseFloat(i.amount),0);
      const th=fList.reduce((s:number,f:any)=>s+(parseFloat(f.flight_duration)||0),0);
      const sc:Record<string,number>={}; fList.forEach((f:any)=>{sc[f.status]=(sc[f.status]||0)+1});
      const ic:Record<string,number>={}; iList.forEach((i:any)=>{ic[i.status]=(ic[i.status]||0)+1});
      setKpis({students:(st.results||st).length||0,courses:(co.results||[]).length,aircraft:aList.length,flights:fList.length,completed:fList.filter((f:any)=>f.status==="completed").length,hours:Math.round(th),revenue:Math.round(paid),outstanding:Math.round(out),audits:(au.results||[]).filter((a:any)=>a.status==="planned").length});
      setCharts({flights:Object.entries(sc).map(([n,v])=>({name:n,value:v})),revenue:[{name:"Collected",value:Math.round(paid)},{name:"Outstanding",value:Math.round(out)}],fleet:aList.map((a:any)=>({name:a.registration,hours:parseFloat(a.airframe_hours)||0})),invoices:Object.entries(ic).map(([n,v])=>({name:n,value:v}))});
    }).finally(()=>setLoading(false));
  },[isAuthenticated]);

  return (<div className="min-h-screen bg-navy-900">
    <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between"><div className="flex items-center gap-3"><Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-lg"/><div><h1 className="text-lg font-bold text-white">Director Dashboard</h1><p className="text-xs text-gold-500">Executive Overview</p></div></div><button onClick={async()=>{await logout();router.push("/login")}} className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">Logout</button></div></nav>
    <main className="max-w-7xl mx-auto px-6 py-8">{loading?<p className="text-gray-500">Loading KPIs...</p>:<>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"><KpiCard label="Students" value={kpis.students} c="text-blue-400"/><KpiCard label="Courses" value={kpis.courses} c="text-green-400"/><KpiCard label="Aircraft" value={kpis.aircraft} c="text-purple-400"/><KpiCard label="Flight Hours" value={`${kpis.hours}h`} c="text-gold-400"/></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"><KpiCard label="Revenue" value={`${kpis.revenue.toLocaleString()} DZD`} c="text-green-400"/><KpiCard label="Outstanding" value={`${kpis.outstanding.toLocaleString()} DZD`} c="text-red-400"/><KpiCard label="Completed" value={kpis.completed} c="text-cyan-400"/><KpiCard label="Audits" value={kpis.audits} c="text-yellow-400"/></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard title="Flights by Status"><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={charts.flights} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({n,v}:any)=>`${n}: ${v}`}>{charts.flights.map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Revenue (DZD)"><ResponsiveContainer width="100%" height={250}><BarChart data={charts.revenue}><CartesianGrid strokeDasharray="3 3" stroke="#1a2332"/><XAxis dataKey="name" stroke="#94a3b8" fontSize={12}/><YAxis stroke="#94a3b8" fontSize={12}/><Tooltip/><Bar dataKey="value" fill="#c4943c" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></ChartCard>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard title="Fleet Hours"><ResponsiveContainer width="100%" height={250}><BarChart data={charts.fleet} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#1a2332"/><XAxis type="number" stroke="#94a3b8" fontSize={12}/><YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={80}/><Tooltip/><Bar dataKey="hours" fill="#3b82f6" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Invoice Status"><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={charts.invoices} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({n,v}:any)=>`${n}: ${v}`}>{charts.invoices.map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></ChartCard>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"><a href="/admin" className="block p-5 bg-navy-800 border border-navy-700 rounded-xl hover:border-gold-500 text-center"><p className="text-white font-semibold">Admin Panel</p><p className="text-xs text-gray-400 mt-1">System administration</p></a><a href="/quality/dashboard" className="block p-5 bg-navy-800 border border-navy-700 rounded-xl hover:border-gold-500 text-center"><p className="text-white font-semibold">Quality & Safety</p><p className="text-xs text-gray-400 mt-1">Audits, NCRs, CAPA</p></a><a href="/finance/dashboard" className="block p-5 bg-navy-800 border border-navy-700 rounded-xl hover:border-gold-500 text-center"><p className="text-white font-semibold">Finance</p><p className="text-xs text-gray-400 mt-1">Revenue & invoices</p></a></div>
      <div className="grid grid-cols-3 gap-4"><ExportBtn endpoint="/api/export/students/" label="Export Students (Excel)"/><ExportBtn endpoint="/api/export/invoices/" label="Export Invoices (Excel)"/><ExportBtn endpoint="/api/export/flights/" label="Export Flights (Excel)"/></div>
    </>}</main></div>);
}
function KpiCard({label,value,c}:{label:string;value:string|number;c:string}){return <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><p className={`text-2xl font-bold ${c}`}>{value}</p><p className="text-xs text-gray-400 mt-1">{label}</p></div>}
function ChartCard({title,children}:{title:string;children:React.ReactNode}){return <div className="bg-navy-800 border border-navy-700 rounded-xl p-6"><h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{title}</h3>{children}</div>}
function ExportBtn({endpoint,label}:{endpoint:string;label:string}){const h=async()=>{try{const s=JSON.parse(sessionStorage.getItem("maa_session")||"{}");const r=await fetch(endpoint,{headers:{Authorization:`Bearer ${s.token}`}});if(!r.ok)throw new Error("Failed");const b=await r.blob();const u=window.URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=endpoint.split("/").pop()+".xlsx";a.click();window.URL.revokeObjectURL(u)}catch{alert("Download failed")}};return <button onClick={h} className="w-full p-3 bg-navy-800 border border-navy-700 rounded-lg hover:border-gold-500 text-xs text-gray-400 hover:text-gold-500">{label}</button>}
