"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { ExportButton } from "@/components/export-button";
import { useTranslation } from "@/lib/use-translation";

const DCOLORS = ["#c4943c", "#3b82f6", "#22c55e", "#ef4444", "#8b5cf6"];

export default function DirectorDashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const { data, isLoading: loading } = useQuery({
    queryKey: ['director-kpis'],
    queryFn: () => Promise.all([
      api.get<any>("/students/"),
      api.get<any>("/invoices/"),
      api.get<any>("/courses/"),
      api.get<any>("/aircraft/"),
      api.get<any>("/flight-lessons/"),
      api.get<any>("/audits/"),
    ]),
    enabled: isAuthenticated,
  });
  useEffect(() => { if (!isLoading && !isAuthenticated) router.push("/login"); }, [isLoading, isAuthenticated, router]);
  if (isLoading || !isAuthenticated) return null;

  const [st, inv, co, ac, fl, au] = data || [{}, {results:[]}, {results:[]}, {results:[]}, {results:[]}, {results:[]}];
  const iList=inv.results||[]; const fList=fl.results||[]; const aList=ac.results||[];
  const paid=iList.filter((i:any)=>i.status==="paid").reduce((s:number,i:any)=>s+parseFloat(i.amount),0);
  const out=iList.filter((i:any)=>i.status==="issued"||i.status==="partially_paid").reduce((s:number,i:any)=>s+parseFloat(i.amount),0);
  const th=fList.reduce((s:number,f:any)=>s+(parseFloat(f.flight_duration)||0),0);
  const sc:Record<string,number>={}; fList.forEach((f:any)=>{sc[f.status]=(sc[f.status]||0)+1});
  const ic:Record<string,number>={}; iList.forEach((i:any)=>{ic[i.status]=(ic[i.status]||0)+1});
  const kpis={students:(st.results||st).length||0,courses:(co.results||[]).length,aircraft:aList.length,flights:fList.length,completed:fList.filter((f:any)=>f.status==="completed").length,hours:Math.round(th),revenue:Math.round(paid),outstanding:Math.round(out),audits:(au.results||[]).filter((a:any)=>a.status==="planned").length};
  const charts={flights:Object.entries(sc).map(([n,v])=>({name:n,value:v})),revenue:[{name:t('finance.collected','Collected'),value:Math.round(paid)},{name:t('finance.outstanding','Outstanding'),value:Math.round(out)}],fleet:aList.map((a:any)=>({name:a.registration,hours:parseFloat(a.airframe_hours)||0})),invoices:Object.entries(ic).map(([n,v])=>({name:n,value:v}))};

  return (<div className="min-h-screen bg-navy-900">
    <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between"><div className="flex items-center gap-3"><Image src="/logo.png" alt="MAA" width={110} height={110}/><div><h1 className="text-lg font-bold text-white">{t('director.dashboard', 'Director Dashboard')}</h1><p className="text-xs text-gold-500">{t('director.executiveOverview', 'Executive Overview')}</p></div></div><div className="flex items-center gap-3"><ExportButton exports={[{label:"Students (Excel)",url:"/export/students/",filename:"students.xlsx",type:"excel"},{label:"Invoices (Excel)",url:"/export/invoices/",filename:"invoices.xlsx",type:"excel"},{label:"Flights (Excel)",url:"/export/flights/",filename:"flights.xlsx",type:"excel"}]}/><button onClick={async()=>{await logout();router.push("/login")}} className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">{t('common.signOut', 'Logout')}</button></div></div></nav>
    <main className="max-w-7xl mx-auto px-6 py-8">{error && <ErrorCard message={error} onRetry={()=>setError(null)}/>}{loading?<LoadingSkeleton type="card" rows={4}/>:<>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"><KpiCard label={t('director.students', 'Students')} value={kpis.students} c="text-blue-400"/><KpiCard label={t('director.courses', 'Courses')} value={kpis.courses} c="text-green-400"/><KpiCard label={t('director.aircraft', 'Aircraft')} value={kpis.aircraft} c="text-purple-400"/><KpiCard label={t('director.fleetHours', 'Flight Hours')} value={`${kpis.hours}h`} c="text-gold-400"/></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"><KpiCard label={t('director.revenue', 'Revenue')} value={`${kpis.revenue.toLocaleString()} DZD`} c="text-green-400"/><KpiCard label={t('finance.outstanding', 'Outstanding')} value={`${kpis.outstanding.toLocaleString()} DZD`} c="text-red-400"/><KpiCard label={t('director.completed', 'Completed')} value={kpis.completed} c="text-cyan-400"/><KpiCard label={t('director.audits', 'Audits')} value={kpis.audits} c="text-yellow-400"/></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard title={t('director.flightsByStatus', 'Flights by Status')}><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={charts.flights} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name,value}:any)=>`${name}: ${value}`}>{charts.flights.map((_:any,i:number)=><Cell key={i} fill={DCOLORS[i%DCOLORS.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></ChartCard>
        <ChartCard title={t('director.revenue', 'Revenue (DZD)')}><ResponsiveContainer width="100%" height={250}><BarChart data={charts.revenue}><CartesianGrid strokeDasharray="3 3" stroke="#1a2332"/><XAxis dataKey="name" stroke="#94a3b8" fontSize={12}/><YAxis stroke="#94a3b8" fontSize={12}/><Tooltip/><Bar dataKey="value" fill="#c4943c" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></ChartCard>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard title={t('director.fleetHours', 'Fleet Hours')}><ResponsiveContainer width="100%" height={250}><BarChart data={charts.fleet} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#1a2332"/><XAxis type="number" stroke="#94a3b8" fontSize={12}/><YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={80}/><Tooltip/><Bar dataKey="hours" fill="#3b82f6" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></ChartCard>
        <ChartCard title={t('director.invoiceStatus', 'Invoice Status')}><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={charts.invoices} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name,value}:any)=>`${name}: ${value}`}>{charts.invoices.map((_:any,i:number)=><Cell key={i} fill={DCOLORS[i%DCOLORS.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></ChartCard>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"><a href="/admin" className="block p-5 bg-navy-800 border border-navy-700 rounded-xl hover:border-gold-500 text-center"><p className="text-white font-semibold">{t('director.adminPanel', 'Admin Panel')}</p><p className="text-xs text-gray-400 mt-1">{t('director.systemAdmin', 'System administration')}</p></a><a href="/quality/dashboard" className="block p-5 bg-navy-800 border border-navy-700 rounded-xl hover:border-gold-500 text-center"><p className="text-white font-semibold">{t('quality.qualityAndSafety', 'Quality & Safety')}</p><p className="text-xs text-gray-400 mt-1">{t('director.qualityDesc', 'Audits, NCRs, CAPA')}</p></a><a href="/finance/dashboard" className="block p-5 bg-navy-800 border border-navy-700 rounded-xl hover:border-gold-500 text-center"><p className="text-white font-semibold">{t('finance.finance', 'Finance')}</p><p className="text-xs text-gray-400 mt-1">{t('director.financeDesc', 'Revenue & invoices')}</p></a></div>
      <div className="grid grid-cols-3 gap-4"><ExportButton exports={[{label:"Students (Excel)",url:"/export/students/",filename:"students.xlsx",type:"excel"},{label:"Invoices (Excel)",url:"/export/invoices/",filename:"invoices.xlsx",type:"excel"},{label:"Flights (Excel)",url:"/export/flights/",filename:"flights.xlsx",type:"excel"}]}/></div>
    </>}</main></div>);
}

function KpiCard({label,value,c}:{label:string;value:string|number;c:string}){return <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><p className={`text-2xl font-bold ${c}`}>{value}</p><p className="text-xs text-gray-400 mt-1">{label}</p></div>}
function ChartCard({title,children}:{title:string;children:React.ReactNode}){return <div className="bg-navy-800 border border-navy-700 rounded-xl p-6"><h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{title}</h3>{children}</div>}
