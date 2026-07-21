"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ExportButton } from "@/components/export-button";
import { useTranslation } from "@/lib/use-translation";
const NCR_COLORS=["#ef4444","#f59e0b","#3b82f6"];

export default function QualityDashboard() {
  const { isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();
  const TABS=["audits","ncrs","capas","risks","safety","documents"] as const;
  const tabLabels: Record<string, string> = {
    audits: t('quality.audits', 'Audits'),
    ncrs: t('quality.nonConformities', 'NCRs'),
    capas: t('quality.capas', 'CAPAs'),
    risks: t('quality.riskAssessments', 'Risk Assessments'),
    safety: t('quality.safetyEvents', 'Safety Events'),
    documents: t('quality.documents', 'Documents'),
  };
  const [tab,setTab]=useState<string>("audits");const [expanded,setExpanded]=useState("");const [showReport,setShowReport]=useState(false);
  const [reportForm,setReportForm]=useState({title:"",type:"incident",description:"",confidential:false});const [msg,setMsg]=useState("");

  const { data, isLoading:loading } = useQuery({
    queryKey: ['quality-all'],
    queryFn: () => Promise.all(["/audits/","/non-conformities/","/capas/","/safety-events/","/risk-assessments/","/quality-documents/"].map(u=>api.get(u).catch(()=>({results:[]})))),
    enabled: isAuthenticated,
  });
  const [audits=[],ncrs=[],capas=[],events=[],risks=[],documents=[]] = data ? data.map((d:any)=>d.results||[]) : [[],[],[],[],[],[]];

  const { data: dashboardData } = useQuery({
    queryKey: ['quality-dashboard'],
    queryFn: () => api.get("/quality/dashboard/").catch(()=>({upcoming_deadlines:[]})),
    enabled: isAuthenticated,
  });
  const upcoming_deadlines = dashboardData?.upcoming_deadlines || [];

  const handleReport=async(e:React.FormEvent)=>{e.preventDefault();
    try{const r=await api.post("/safety-events/",reportForm);if(r.success){setMsg(t('quality.reported', 'Reported.'));setShowReport(false);setReportForm({title:"",type:"incident",description:"",confidential:false})}else{setMsg(r.message||t('common.error', 'Failed'))}}catch{setMsg(t('common.error', 'Connection error'))}};

  const daysColor = (days: number) => {
    if (days < 7) return "text-red-400";
    if (days < 30) return "text-yellow-400";
    return "text-green-400";
  };

  return (<div className="min-h-screen bg-navy-900">
    <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">{tabLabels[tab]}</h1>
        <div className="flex items-center gap-3">
          <ExportButton exports={[{label:t('quality.auditsExcel','Audits (Excel)'),url:"/export/audits/",filename:"audits.xlsx",type:"excel"},{label:t('quality.ncrsExcel','NCRs (Excel)'),url:"/export/non-conformities/",filename:"ncrs.xlsx",type:"excel"},{label:t('quality.capasExcel','CAPAs (Excel)'),url:"/export/capas/",filename:"capas.xlsx",type:"excel"}]}/>
          <button onClick={async()=>{await logout();window.location.href="/login"}} className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">{t('common.signOut', 'Logout')}</button>
        </div>
      </div>
    </nav>
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {TABS.map(id=><button key={id} onClick={()=>setTab(id)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab===id?"bg-gold-500/20 text-gold-500 border border-gold-500/30":"text-gray-400 hover:text-white hover:bg-navy-700 border border-transparent"}`}>{tabLabels[id]}</button>)}
        <button onClick={()=>setShowReport(!showReport)} className="ml-auto px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500 hover:text-white whitespace-nowrap">{t('quality.reportEvent', '+ Report Event')}</button>
      </div>

      {msg&&<div className="mb-4 p-3 rounded-lg text-sm bg-navy-800 border border-navy-700 text-gray-300">{msg}</div>}

      {showReport&&(<form onSubmit={handleReport} className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8"><h3 className="text-lg font-semibold text-white mb-4">{t('quality.reportSafetyEvent', 'Report Safety Event')}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><input value={reportForm.title} onChange={e=>setReportForm({...reportForm,title:e.target.value})} required placeholder={t('common.title', 'Title')} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/></div><div><select value={reportForm.type} onChange={e=>setReportForm({...reportForm,type:e.target.value})} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"><option value="incident">{t('quality.incident', 'Incident')}</option><option value="near_miss">{t('quality.nearMiss', 'Near Miss')}</option><option value="hazard">{t('quality.hazard', 'Hazard')}</option><option value="observation">{t('quality.observation', 'Observation')}</option></select></div></div><textarea value={reportForm.description} onChange={e=>setReportForm({...reportForm,description:e.target.value})} required rows={3} placeholder={t('common.description', 'Description')} className="w-full mt-4 px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/><div className="flex items-center gap-2 mt-4"><input type="checkbox" id="conf" checked={reportForm.confidential} onChange={e=>setReportForm({...reportForm,confidential:e.target.checked})}/><label htmlFor="conf" className="text-sm text-gray-400">{t('quality.reportAnonymously', 'Report anonymously')}</label></div><button type="submit" className="mt-4 px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg text-sm">{t('quality.submitReport', 'Submit Report')}</button></form>)}

      {/* ── Deadlines Section ── */}
      {upcoming_deadlines.length > 0 && (
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8">
          <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('quality.upcomingDeadlines', 'Upcoming Deadlines')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase tracking-wider">{t('common.item', 'Item')}</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase tracking-wider">{t('common.type', 'Type')}</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase tracking-wider">{t('quality.dueDate', 'Due Date')}</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase tracking-wider">{t('quality.daysRemaining', 'Days Left')}</th>
                </tr>
              </thead>
              <tbody>
                {upcoming_deadlines.map((d: any, i: number) => (
                  <tr key={i} className="border-b border-navy-700/50 hover:bg-navy-700/20 transition-colors">
                    <td className="px-3 py-2.5 text-white font-medium">{d.item_name}</td>
                    <td className="px-3 py-2.5 text-gray-400">{d.type.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2.5 text-gray-400">{d.expiry_date?.slice(0, 10)}</td>
                    <td className={`px-3 py-2.5 font-semibold ${daysColor(d.days_remaining)}`}>
                      {d.days_remaining}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {ncrs.length>0&&tab==="ncrs"&&(<div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8"><h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('quality.ncrsBySeverity', 'NCRs by Severity')}</h3><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={[{name:t('quality.critical','Critical'),value:ncrs.filter((n:any)=>n.severity==="critical").length},{name:t('quality.major','Major'),value:ncrs.filter((n:any)=>n.severity==="major").length},{name:t('quality.minor','Minor'),value:ncrs.filter((n:any)=>n.severity==="minor").length}]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({name,value}:any)=>`${name}: ${value}`}>{[0,1,2].map(i=><Cell key={i} fill={NCR_COLORS[i]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div>)}

      {loading?<LoadingSkeleton type="card" rows={6}/>:<div className="space-y-3">
        {tab==="audits"&&audits.map((a:any)=>(<div key={a.id} className="bg-navy-800 border border-navy-700 rounded-xl"><button onClick={()=>setExpanded(expanded===a.id?"":a.id)} className="w-full p-4 flex items-center justify-between text-left"><div><span className="text-white font-medium">{a.title}</span><span className="text-sm text-gray-400 ml-3">{a.type}</span><span className="text-xs text-gray-500 ml-3">{a.scheduled_date?.slice(0,10)}</span></div><div className="flex items-center gap-3"><span className="text-xs text-gray-400">{a.ncr_count} {t('quality.ncrs', 'NCRs')}</span><span className={`text-xs px-2 py-0.5 rounded ${a.status==="completed"?"bg-green-500/10 text-green-400":"bg-blue-500/10 text-blue-400"}`}>{a.status}</span></div></button>{expanded===a.id&&<div className="border-t border-navy-700 p-4 space-y-3"><p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.scope', 'Scope:')}</strong> {a.scope||t('common.na', 'N/A')}</p><a href={`/api/audits/${a.id}/pdf/`} className="inline-block px-4 py-1.5 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded text-xs hover:bg-gold-500 hover:text-navy-900">{t('quality.downloadPdf', 'Download PDF')}</a></div>}</div>))}
        {tab==="ncrs"&&ncrs.map((n:any)=>(<div key={n.id} className="bg-navy-800 border border-navy-700 rounded-xl"><button onClick={()=>setExpanded(expanded===n.id?"":n.id)} className="w-full p-4 flex items-center justify-between text-left"><div><span className="text-white font-medium">{n.title}</span><span className="text-sm text-gray-400 ml-3">{n.audit_title}</span></div><div className="flex items-center gap-3"><span className={`text-xs px-2 py-0.5 rounded font-medium ${n.severity==="critical"?"bg-red-500/10 text-red-400":n.severity==="major"?"bg-orange-500/10 text-orange-400":"bg-yellow-500/10 text-yellow-400"}`}>{n.severity}</span><span className={`text-xs px-2 py-0.5 rounded ${n.status==="open"?"bg-red-500/10 text-red-400":"bg-green-500/10 text-green-400"}`}>{n.status}</span></div></button>{expanded===n.id&&<div className="border-t border-navy-700 p-4 space-y-3"><p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.description', 'Description:')}</strong> {n.description||t('common.na', 'N/A')}</p><p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.finding', 'Finding:')}</strong> {n.finding||t('common.na', 'N/A')}</p><p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.correctiveAction', 'Corrective Action:')}</strong> {n.corrective_action||t('common.na', 'N/A')}</p></div>}</div>))}
        {tab==="capas"&&capas.map((c:any)=>(<div key={c.id} className="bg-navy-800 border border-navy-700 rounded-xl"><button onClick={()=>setExpanded(expanded===c.id?"":c.id)} className="w-full p-4 flex items-center justify-between text-left"><div><span className="text-white font-medium">{c.title}</span><span className="text-sm text-gray-400 ml-3">{c.ncr_title}</span></div><div className="flex items-center gap-3"><span className="text-xs text-gray-400">{t('quality.due', 'Due:')} {c.due_date?.slice(0,10)||t('common.na', 'N/A')}</span><span className={`text-xs px-2 py-0.5 rounded ${c.type==="corrective"?"bg-red-500/10 text-red-400":"bg-blue-500/10 text-blue-400"}`}>{c.type}</span><span className={`text-xs px-2 py-0.5 rounded ${c.status==="open"?"bg-yellow-500/10 text-yellow-400":"bg-green-500/10 text-green-400"}`}>{c.status}</span></div></button>{expanded===c.id&&<div className="border-t border-navy-700 p-4 space-y-3"><p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.description', 'Description:')}</strong> {c.description||t('common.na', 'N/A')}</p><p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.actionPlan', 'Action Plan:')}</strong> {c.action_plan||t('common.na', 'N/A')}</p><p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.responsible', 'Responsible:')}</strong> {c.responsible||t('common.na', 'N/A')}</p></div>}</div>))}
        {tab==="risks"&&risks.map((r:any)=>(<div key={r.id} className="bg-navy-800 border border-navy-700 rounded-xl"><button onClick={()=>setExpanded(expanded===r.id?"":r.id)} className="w-full p-4 flex items-center justify-between text-left"><div><span className="text-white font-medium">{r.hazard}</span><span className="text-sm text-gray-400 ml-3">{t('quality.risk', 'Risk:')} {r.risk_level}</span></div><span className={`text-xs px-2 py-0.5 rounded ${r.status==="active"?"bg-yellow-500/10 text-yellow-400":"bg-green-500/10 text-green-400"}`}>{r.status}</span></button>{expanded===r.id&&<div className="border-t border-navy-700 p-4 space-y-3"><p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.likelihood', 'Likelihood:')}</strong> {r.likelihood||t('common.na', 'N/A')}</p><p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.consequence', 'Consequence:')}</strong> {r.consequence||t('common.na', 'N/A')}</p><p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.mitigation', 'Mitigation:')}</strong> {r.mitigation||t('common.na', 'N/A')}</p></div>}</div>))}
        {tab==="safety"&&events.map((e:any)=>(<div key={e.id} className="bg-navy-800 border border-navy-700 rounded-xl"><button onClick={()=>setExpanded(expanded===e.id?"":e.id)} className="w-full p-4 flex items-center justify-between text-left"><div><span className="text-white font-medium">{e.title}</span><span className="text-sm text-gray-400 ml-3">{e.type}</span></div><span className={`text-xs px-2 py-0.5 rounded ${e.status==="reported"?"bg-yellow-500/10 text-yellow-400":"bg-green-500/10 text-green-400"}`}>{e.status}</span></button>{expanded===e.id&&<div className="border-t border-navy-700 p-4 space-y-3"><p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.description', 'Description:')}</strong> {e.description||t('common.na', 'N/A')}</p><p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.location', 'Location:')}</strong> {e.location||t('common.na', 'N/A')}</p><p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.reportedBy', 'Reported By:')}</strong> {e.reported_by_name||t('common.na', 'N/A')}</p></div>}</div>))}
        {tab==="documents"&&documents.map((d:any)=>(<div key={d.id} className="bg-navy-800 border border-navy-700 rounded-xl"><button onClick={()=>setExpanded(expanded===d.id?"":d.id)} className="w-full p-4 flex items-center justify-between text-left"><div><span className="text-white font-medium">{d.title||d.number}</span><span className="text-sm text-gray-400 ml-3">{d.type}</span></div><span className={`text-xs px-2 py-0.5 rounded ${d.status==="approved"?"bg-green-500/10 text-green-400":"bg-yellow-500/10 text-yellow-400"}`}>{d.status||t('common.na', 'N/A')}</span></button>{expanded===d.id&&<div className="border-t border-navy-700 p-4 space-y-3"><p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.version', 'Version:')}</strong> {d.version||t('common.na', 'N/A')}</p><p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.reviewDate', 'Review Date:')}</strong> {d.review_date?.slice(0,10)||t('common.na', 'N/A')}</p>{d.file_url&&<a href={d.file_url} target="_blank" className="inline-block px-4 py-1.5 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded text-xs hover:bg-gold-500 hover:text-navy-900">{t('common.download', 'Download')}</a>}</div>}</div>))}
      </div>}
    </div></div>);
}
