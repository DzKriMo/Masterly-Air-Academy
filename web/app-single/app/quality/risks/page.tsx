"use client";
import { useQuery } from "@tanstack/react-query";
const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

export default function RisksPage() {
  const { data: risks=[], isLoading } = useQuery({
    queryKey: ['quality-risks'],
    queryFn: () => fetch("/api/risk-assessments/",{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).then(d=>d.results||[]),
  });

  // Risk matrix: 5x5 grid
  const matrix = Array.from({length:5}, (_,r) => Array.from({length:5}, (_,c) => {
    const level = (r+1)*(c+1);
    const color = level <= 4 ? "bg-green-500/20 text-green-400" : level <= 9 ? "bg-yellow-500/20 text-yellow-400" : level <= 15 ? "bg-orange-500/20 text-orange-400" : "bg-red-500/20 text-red-400";
    const items = risks.filter((ri:any) => ri.probability === r+1 && ri.severity === c+1);
    return { level, color, count: items.length, items };
  }));

  return (<div className="flex-1 min-w-0"><nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center"><h1 className="text-lg font-bold text-white">Risk Assessments</h1></div></nav>
    <main className="px-6 py-8">{isLoading?<p className="text-gray-500">Loading...</p>:<>
      <div className="mb-8"><h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Risk Matrix (Probability × Severity)</h3>
        <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
          <div className="grid grid-cols-6 text-xs text-gray-500 p-2 border-b border-navy-700 bg-navy-900"><div className="p-2"></div>{[1,2,3,4,5].map(s=><div key={s} className="p-2 text-center font-bold">S{s}</div>)}</div>
          {matrix.map((row,ri) => (<div key={ri} className="grid grid-cols-6 text-xs border-b border-navy-700/50"><div className="p-2 font-bold text-gray-500 bg-navy-900 flex items-center">P{ri+1}</div>{row.map((cell,ci)=>(<div key={ci} className={`p-2 text-center min-h-[50px] flex items-center justify-center ${cell.color} ${cell.count>0?"font-bold cursor-pointer hover:opacity-80":""}`}>{cell.count>0 ? cell.count : ""}</div>))}</div>))}
        </div>
      </div>
      <div className="space-y-3">{risks.map((r:any)=>(<div key={r.id} className="bg-navy-800 border border-navy-700 rounded-xl p-4 flex items-center justify-between"><div><span className="text-white font-medium">{r.hazard}</span><span className="text-sm text-gray-400 ml-3">P{r.probability}×S{r.severity} = {r.risk_level}</span></div><span className={`text-xs px-2 py-0.5 rounded ${r.status==="active"?"bg-yellow-500/10 text-yellow-400":"bg-green-500/10 text-green-400"}`}>{r.status}</span></div>))}</div>
    </>}</main></div>);
}
