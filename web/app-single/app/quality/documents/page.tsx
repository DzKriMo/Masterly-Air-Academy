"use client";
import { useQuery } from "@tanstack/react-query";
const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

export default function QualityDocumentsPage() {
  const { data: docs=[], isLoading } = useQuery({
    queryKey: ['quality-documents'],
    queryFn: () => fetch("/api/quality-documents/",{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).then(d=>d.results||[]),
  });

  return (<div className="flex-1 min-w-0"><nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center"><h1 className="text-lg font-bold text-white">Quality Documents</h1></div></nav>
    <main className="px-6 py-8">{isLoading?<p className="text-gray-500">Loading...</p>:docs.length===0?<p className="text-gray-500 text-center py-12">No documents found.</p>:<div className="space-y-3">{docs.map((d:any)=>(<div key={d.id} className="bg-navy-800 border border-navy-700 rounded-xl p-4 flex items-center justify-between"><div><span className="text-white font-medium">{d.title||d.number}</span><span className="text-sm text-gray-400 ml-3">{d.type}</span></div><span className={`text-xs px-2 py-0.5 rounded ${d.status==="approved"?"bg-green-500/10 text-green-400":"bg-yellow-500/10 text-yellow-400"}`}>{d.status||"N/A"}</span></div>))}</div>}</main></div>);
}
