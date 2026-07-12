"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

export default function AuditsPage() {
  const [expanded, setExpanded] = useState("");
  const { data: audits=[], isLoading } = useQuery({
    queryKey: ['quality-audits'],
    queryFn: () => fetch("/api/audits/",{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).then(d=>d.results||[]),
  });

  return (<div className="flex-1 min-w-0"><nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center"><h1 className="text-lg font-bold text-white">Audits</h1></div></nav>
    <main className="px-6 py-8">{isLoading?<p className="text-gray-500">Loading...</p>:audits.length===0?<p className="text-gray-500 text-center py-12">No audits found.</p>:<div className="space-y-3">{audits.map((a:any)=>(<div key={a.id} className="bg-navy-800 border border-navy-700 rounded-xl"><button onClick={()=>setExpanded(expanded===a.id?"":a.id)} className="w-full p-4 flex items-center justify-between text-left"><div><span className="text-white font-medium">{a.title}</span><span className="text-sm text-gray-400 ml-3">{a.type}</span><span className="text-xs text-gray-500 ml-3">{a.scheduled_date?.slice(0,10)}</span></div><div className="flex items-center gap-3"><span className="text-xs text-gray-400">{a.ncr_count} NCRs</span><span className={`text-xs px-2 py-0.5 rounded ${a.status==="completed"?"bg-green-500/10 text-green-400":"bg-blue-500/10 text-blue-400"}`}>{a.status}</span></div></button>{expanded===a.id&&<div className="border-t border-navy-700 p-4 space-y-3"><p className="text-sm text-gray-400"><strong className="text-gray-300">Scope:</strong> {a.scope||"N/A"}</p><p className="text-sm text-gray-400"><strong className="text-gray-300">Lead:</strong> {a.lead_auditor_name||"N/A"}</p><a href={`/api/audits/${a.id}/pdf/`} className="inline-block px-4 py-1.5 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded text-xs hover:bg-gold-500 hover:text-navy-900">Download PDF</a></div>}</div>))}</div>}</main></div>);
}
