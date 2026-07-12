"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
const NCR_COLORS = ["#ef4444","#f59e0b","#3b82f6"];

const SIDEBAR = [
  { id: "audits", label: "Audits" },
  { id: "ncrs", label: "Non-Conformities" },
  { id: "capas", label: "CAPAs" },
  { id: "risks", label: "Risk Assessments" },
  { id: "safety", label: "Safety Events" },
  { id: "documents", label: "Documents" },
];

export default function QualityDashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [audits, setAudits] = useState<any[]>([]);
  const [ncrs, setNcrs] = useState<any[]>([]);
  const [capas, setCapas] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("audits");
  const [showReport, setShowReport] = useState(false);
  const [expanded, setExpanded] = useState<string>("");
  const [reportForm, setReportForm] = useState({ title: "", type: "incident", description: "", confidential: false });
  const [msg, setMsg] = useState("");
  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/login"); } }, [isLoading, isAuthenticated, router]);
  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };
  useEffect(() => { if (!isAuthenticated) return;
    Promise.all([
      fetch("/api/audits/",{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()),
      fetch("/api/non-conformities/",{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()),
      fetch("/api/capas/",{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()),
      fetch("/api/safety-events/",{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()),
      fetch("/api/risk-assessments/",{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).catch(()=>({results:[]})),
      fetch("/api/quality-documents/",{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).catch(()=>({results:[]})),
    ]).then(([a,n,c,s,r,d])=>{setAudits(a.results||[]);setNcrs(n.results||[]);setCapas(c.results||[]);setEvents(s.results||[]);setRisks(r.results||[]);setDocuments(d.results||[])}).finally(()=>setLoading(false));
  },[isAuthenticated]);
  const handleReport = async (e: React.FormEvent) => { e.preventDefault();
    try { const res=await fetch("/api/safety-events/",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token()}`},body:JSON.stringify(reportForm)});
      if(res.ok){setMsg("Safety event reported.");setShowReport(false);setReportForm({title:"",type:"incident",description:"",confidential:false})}else{const d=await res.json();setMsg(d.message||"Failed")} }catch{setMsg("Connection error")} };
  const toggleExpand = (id: string) => setExpanded(expanded===id?"":id);

  return (<div className="min-h-screen bg-navy-900 flex">
    {/* Sidebar */}
    <aside className="w-56 bg-navy-800 border-r border-navy-700 min-h-screen hidden lg:block shrink-0">
      <div className="p-4 border-b border-navy-700"><Image src="/mast.svg" alt="MAA" width={80} height={80} className="rounded-lg mx-auto"/><p className="text-white font-bold text-center mt-2 text-sm">Quality & Safety</p></div>
      <nav className="p-2">{SIDEBAR.map(item=><button key={item.id} onClick={()=>setTab(item.id)} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm mb-1 transition-colors ${tab===item.id?"bg-gold-500/20 text-gold-500 font-medium":"text-gray-400 hover:text-white hover:bg-navy-700"}`}>{item.label}</button>)}</nav>
      <div className="p-4 border-t border-navy-700 mt-auto"><button onClick={()=>setShowReport(true)} className="w-full py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500 hover:text-white">+ Report Event</button></div>
    </aside>
    {/* Main */}
    <div className="flex-1 min-w-0">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between"><h1 className="text-lg font-bold text-white">{SIDEBAR.find(s=>s.id===tab)?.label}</h1><button onClick={async()=>{await logout();router.push("/login")}} className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">Logout</button></div></nav>
      <main className="px-6 py-8">{msg&&<div className="mb-4 p-3 rounded-lg text-sm bg-navy-800 border border-navy-700 text-gray-300">{msg}</div>}
        {showReport&&(<form onSubmit={handleReport} className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8"><h3 className="text-lg font-semibold text-white mb-4">Report Safety Event</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><input value={reportForm.title} onChange={e=>setReportForm({...reportForm,title:e.target.value})} required placeholder="Title" className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/></div><div><select value={reportForm.type} onChange={e=>setReportForm({...reportForm,type:e.target.value})} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"><option value="incident">Incident</option><option value="near_miss">Near Miss</option><option value="hazard">Hazard</option><option value="observation">Observation</option></select></div></div><textarea value={reportForm.description} onChange={e=>setReportForm({...reportForm,description:e.target.value})} required rows={3} placeholder="Description" className="w-full mt-4 px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/><div className="flex items-center gap-2 mt-4"><input type="checkbox" id="conf" checked={reportForm.confidential} onChange={e=>setReportForm({...reportForm,confidential:e.target.checked})}/><label htmlFor="conf" className="text-sm text-gray-400">Report anonymously</label></div><button type="submit" className="mt-4 px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg text-sm">Submit Report</button></form>)}
        {ncrs.length>0&&tab==="ncrs"&&(<div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8"><h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">NCRs by Severity</h3><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={[{name:"Critical",value:ncrs.filter((n:any)=>n.severity==="critical").length},{name:"Major",value:ncrs.filter((n:any)=>n.severity==="major").length},{name:"Minor",value:ncrs.filter((n:any)=>n.severity==="minor").length}]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({name,value}:any)=>`${name}: ${value}`}>{[0,1,2].map(i=><Cell key={i} fill={NCR_COLORS[i]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div>)}
        {loading?<p className="text-gray-500 text-sm">Loading...</p>:<div className="space-y-3">
          {tab==="audits"&&audits.map(a=>(<div key={a.id} className="bg-navy-800 border border-navy-700 rounded-xl"><button onClick={()=>toggleExpand(a.id)} className="w-full p-4 flex items-center justify-between text-left"><div><span className="text-white font-medium">{a.title}</span><span className="text-sm text-gray-400 ml-3">{a.type}</span><span className="text-xs text-gray-500 ml-3">{a.scheduled_date?.slice(0,10)}</span></div><div className="flex items-center gap-3"><span className="text-xs text-gray-400">{a.ncr_count} NCRs</span><span className={`text-xs px-2 py-0.5 rounded ${a.status==="completed"?"bg-green-500/10 text-green-400":"bg-blue-500/10 text-blue-400"}`}>{a.status}</span></div></button>{expanded===a.id&&<div className="border-t border-navy-700 p-4 space-y-3"><p className="text-sm text-gray-400"><strong className="text-gray-300">Scope:</strong> {a.scope||"N/A"}</p><p className="text-sm text-gray-400"><strong className="text-gray-300">Lead:</strong> {a.lead_auditor_name||"N/A"}</p><p className="text-sm text-gray-400"><strong className="text-gray-300">Findings:</strong> {a.findings?.length||0} items</p><a href={`/api/audits/${a.id}/pdf/`} className="inline-block px-4 py-1.5 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded text-xs hover:bg-gold-500 hover:text-navy-900">Download PDF</a></div>}</div>))}
          {tab==="ncrs"&&ncrs.map(n=>(<div key={n.id} className="bg-navy-800 border border-navy-700 rounded-xl p-4 flex items-center justify-between"><div><span className="text-white font-medium">{n.title}</span><span className="text-sm text-gray-400 ml-3">{n.audit_title}</span></div><div className="flex items-center gap-3"><span className={`text-xs px-2 py-0.5 rounded font-medium ${n.severity==="critical"?"bg-red-500/10 text-red-400":n.severity==="major"?"bg-orange-500/10 text-orange-400":"bg-yellow-500/10 text-yellow-400"}`}>{n.severity}</span><span className={`text-xs px-2 py-0.5 rounded ${n.status==="open"?"bg-red-500/10 text-red-400":"bg-green-500/10 text-green-400"}`}>{n.status}</span></div></div>))}
          {tab==="capas"&&capas.map(c=>(<div key={c.id} className="bg-navy-800 border border-navy-700 rounded-xl p-4 flex items-center justify-between"><div><span className="text-white font-medium">{c.title}</span><span className="text-sm text-gray-400 ml-3">{c.ncr_title}</span></div><div className="flex items-center gap-3"><span className="text-xs text-gray-400">Due: {c.due_date?.slice(0,10)||"N/A"}</span><span className={`text-xs px-2 py-0.5 rounded ${c.type==="corrective"?"bg-red-500/10 text-red-400":"bg-blue-500/10 text-blue-400"}`}>{c.type}</span><span className={`text-xs px-2 py-0.5 rounded ${c.status==="open"?"bg-yellow-500/10 text-yellow-400":"bg-green-500/10 text-green-400"}`}>{c.status}</span></div></div>))}
          {tab==="risks"&&risks.map(r=>(<div key={r.id} className="bg-navy-800 border border-navy-700 rounded-xl p-4 flex items-center justify-between"><div><span className="text-white font-medium">{r.hazard}</span><span className="text-sm text-gray-400 ml-3">Risk: {r.risk_level}</span></div><span className={`text-xs px-2 py-0.5 rounded ${r.status==="active"?"bg-yellow-500/10 text-yellow-400":"bg-green-500/10 text-green-400"}`}>{r.status}</span></div>))}
          {tab==="safety"&&events.map(e=>(<div key={e.id} className="bg-navy-800 border border-navy-700 rounded-xl p-4 flex items-center justify-between"><div><span className="text-white font-medium">{e.title}</span><span className="text-sm text-gray-400 ml-3">{e.type}</span></div><span className={`text-xs px-2 py-0.5 rounded ${e.status==="reported"?"bg-yellow-500/10 text-yellow-400":"bg-green-500/10 text-green-400"}`}>{e.status}</span></div>))}
          {tab==="documents"&&documents.map(d=>(<div key={d.id} className="bg-navy-800 border border-navy-700 rounded-xl p-4 flex items-center justify-between"><div><span className="text-white font-medium">{d.title||d.number}</span><span className="text-sm text-gray-400 ml-3">{d.type}</span></div><span className={`text-xs px-2 py-0.5 rounded ${d.status==="approved"?"bg-green-500/10 text-green-400":"bg-yellow-500/10 text-yellow-400"}`}>{d.status||"N/A"}</span></div>))}
        </div>}
      </main>
    </div>
  </div>);
}
