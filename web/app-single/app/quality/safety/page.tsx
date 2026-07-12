"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { safetySchema } from "@/lib/validators";
const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

export default function SafetyPage() {
  const [show,setShow]=useState(false);const [form,setForm]=useState({title:"",type:"incident",description:"",confidential:false});const [msg,setMsg]=useState("");
  const { data: events=[], isLoading } = useQuery({
    queryKey: ['quality-safety'],
    queryFn: () => fetch("/api/safety-events/",{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).then(d=>d.results||[]),
  });

  const handleReport=async(e:React.FormEvent)=>{e.preventDefault();
    const v=safetySchema.safeParse(form);if(!v.success){setMsg(v.error.errors[0].message);return}
    try{const r=await fetch("/api/safety-events/",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token()}`},body:JSON.stringify(form)});
      if(r.ok){setMsg("Reported.");setShow(false);setForm({title:"",type:"incident",description:"",confidential:false})}else{const d=await r.json();setMsg(d.message||"Failed")}}catch{setMsg("Connection error")}};

  return (<div className="flex-1 min-w-0"><nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between"><h1 className="text-lg font-bold text-white">Safety Events</h1><button onClick={()=>setShow(!show)} className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500 hover:text-white">{show?"Cancel":"+ Report Event"}</button></div></nav>
    <main className="px-6 py-8">{msg&&<div className="mb-4 p-3 rounded-lg text-sm bg-navy-800 border border-navy-700 text-gray-300">{msg}</div>}
      {show&&(<form onSubmit={handleReport} className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8"><h3 className="text-lg font-semibold text-white mb-4">Report Safety Event</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required placeholder="Title" className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"><option value="incident">Incident</option><option value="near_miss">Near Miss</option><option value="hazard">Hazard</option><option value="observation">Observation</option></select></div><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required rows={3} placeholder="Description" className="w-full mt-4 px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/><div className="flex items-center gap-2 mt-4"><input type="checkbox" id="conf" checked={form.confidential} onChange={e=>setForm({...form,confidential:e.target.checked})}/><label htmlFor="conf" className="text-sm text-gray-400">Report anonymously</label></div><button type="submit" className="mt-4 px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg text-sm">Submit Report</button></form>)}
      {isLoading?<p className="text-gray-500">Loading...</p>:events.length===0?<p className="text-gray-500 text-center py-12">No events reported.</p>:<div className="space-y-3">{events.map((e:any)=>(<div key={e.id} className="bg-navy-800 border border-navy-700 rounded-xl p-4 flex items-center justify-between"><div><span className="text-white font-medium">{e.title}</span><span className="text-sm text-gray-400 ml-3">{e.type}</span></div><span className={`text-xs px-2 py-0.5 rounded ${e.status==="reported"?"bg-yellow-500/10 text-yellow-400":"bg-green-500/10 text-green-400"}`}>{e.status}</span></div>))}</div>}</main></div>);
}
