"use client";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
const NCR_COLORS=["#ef4444","#f59e0b","#3b82f6"];
const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

export default function NCRsPage() {
  const { data: ncrs=[], isLoading } = useQuery({
    queryKey: ['quality-ncrs'],
    queryFn: () => fetch("/api/non-conformities/",{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).then(d=>d.results||[]),
  });

  return (<div className="flex-1 min-w-0"><nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center"><h1 className="text-lg font-bold text-white">Non-Conformities</h1></div></nav>
    <main className="px-6 py-8">{isLoading?<p className="text-gray-500">Loading...</p>:ncrs.length===0?<p className="text-gray-500 text-center py-12">No NCRs found.</p>:<>
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8"><h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">NCRs by Severity</h3><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={[{name:"Critical",value:ncrs.filter((n:any)=>n.severity==="critical").length},{name:"Major",value:ncrs.filter((n:any)=>n.severity==="major").length},{name:"Minor",value:ncrs.filter((n:any)=>n.severity==="minor").length}]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({name,value}:any)=>`${name}: ${value}`}>{[0,1,2].map(i=><Cell key={i} fill={NCR_COLORS[i]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div>
      <div className="space-y-3">{ncrs.map((n:any)=>(<div key={n.id} className="bg-navy-800 border border-navy-700 rounded-xl p-4 flex items-center justify-between"><div><span className="text-white font-medium">{n.title}</span><span className="text-sm text-gray-400 ml-3">{n.audit_title}</span></div><div className="flex items-center gap-3"><span className={`text-xs px-2 py-0.5 rounded font-medium ${n.severity==="critical"?"bg-red-500/10 text-red-400":n.severity==="major"?"bg-orange-500/10 text-orange-400":"bg-yellow-500/10 text-yellow-400"}`}>{n.severity}</span><span className={`text-xs px-2 py-0.5 rounded ${n.status==="open"?"bg-red-500/10 text-red-400":"bg-green-500/10 text-green-400"}`}>{n.status}</span></div></div>))}</div>
    </>}</main></div>);
}
