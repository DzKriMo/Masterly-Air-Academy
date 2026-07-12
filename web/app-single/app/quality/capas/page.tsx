"use client";
import { useQuery } from "@tanstack/react-query";
const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

export default function CAPAsPage() {
  const { data: capas=[], isLoading } = useQuery({
    queryKey: ['quality-capas'],
    queryFn: () => fetch("/api/capas/",{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).then(d=>d.results||[]),
  });

  return (<div className="flex-1 min-w-0"><nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center"><h1 className="text-lg font-bold text-white">CAPAs</h1></div></nav>
    <main className="px-6 py-8">{isLoading?<p className="text-gray-500">Loading...</p>:capas.length===0?<p className="text-gray-500 text-center py-12">No CAPAs found.</p>:<div className="space-y-3">{capas.map((c:any)=>(<div key={c.id} className="bg-navy-800 border border-navy-700 rounded-xl p-4 flex items-center justify-between"><div><span className="text-white font-medium">{c.title}</span><span className="text-sm text-gray-400 ml-3">{c.ncr_title}</span></div><div className="flex items-center gap-3"><span className="text-xs text-gray-400">Due: {c.due_date?.slice(0,10)||"N/A"}</span><span className={`text-xs px-2 py-0.5 rounded ${c.type==="corrective"?"bg-red-500/10 text-red-400":"bg-blue-500/10 text-blue-400"}`}>{c.type}</span><span className={`text-xs px-2 py-0.5 rounded ${c.status==="open"?"bg-yellow-500/10 text-yellow-400":"bg-green-500/10 text-green-400"}`}>{c.status}</span></div></div>))}</div>}</main></div>);
}
