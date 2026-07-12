"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

export default function StudentSchedulePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/student/login"); } }, [isLoading, isAuthenticated, router]);
  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };
  useEffect(() => { if (!isAuthenticated) return;
    Promise.all([
      fetch("/api/flight-lessons/",{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()),
      fetch("/api/courses/",{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()),
    ]).then(([flights,courses])=>{
      const evts:any[]=[];
      (flights.results||[]).forEach((f:any)=>{if(f.start_time)evts.push({title:`✈ ${f.aircraft_reg}`,start:f.start_time,end:f.end_time||f.start_time,backgroundColor:"#3b82f6",borderColor:"#3b82f6",extendedProps:{type:"flight",id:f.id,status:f.status}})});
      (courses.results||[]).forEach((c:any)=>{evts.push({title:`📚 ${c.subject_code}`,start:`${c.scheduled_date}T${c.start_time}`,end:`${c.scheduled_date}T${c.end_time}`,backgroundColor:"#c4943c",borderColor:"#c4943c",extendedProps:{type:"course",id:c.id,status:c.status}})});
      setEvents(evts);
    }).finally(()=>setLoading(false));
  },[isAuthenticated]);

  return (<div className="min-h-screen bg-navy-900">
    <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50"><div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between"><div className="flex items-center gap-3"><Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-lg"/><div><h1 className="text-lg font-bold text-white">My Schedule</h1><button onClick={()=>router.push("/student/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">Back to Dashboard</button></div></div><button onClick={async()=>{await logout();router.push("/student/login")}} className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">Logout</button></div></nav>
    <main className="max-w-7xl mx-auto px-6 py-8"><div className="flex gap-4 mb-4"><div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{backgroundColor:"#3b82f6"}}/><span className="text-xs text-gray-400">Flights</span></div><div className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{backgroundColor:"#c4943c"}}/><span className="text-xs text-gray-400">Courses</span></div></div>
      {loading?<p className="text-gray-500">Loading...</p>:<div className="space-y-2">{events.sort((a:any,b:any)=>new Date(a.start).getTime()-new Date(b.start).getTime()).slice(0,50).map((e:any,i:number)=>(<div key={i} className="flex items-center gap-3 p-3 bg-navy-800 border border-navy-700 rounded-lg"><div className="w-1.5 h-10 rounded" style={{backgroundColor:e.backgroundColor}}/><div className="flex-1"><p className="text-white text-sm font-medium">{e.title}</p><p className="text-xs text-gray-500">{new Date(e.start).toLocaleString("en-GB",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</p></div><span className="text-xs text-gray-500">{e.extendedProps?.type}</span></div>))}{events.length===0&&<p className="text-gray-500 text-center py-8">No events scheduled.</p>}</div>}
    </main></div>);
}
