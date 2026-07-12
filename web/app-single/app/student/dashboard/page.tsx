"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";

const NAV = [
  { href: "/student/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/student/exams", label: "Exams", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { href: "/student/flights", label: "Flight Log", icon: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8" },
  { href: "/student/courses", label: "My Courses", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { href: "/student/schedule", label: "Schedule", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { href: "/student/certificates", label: "Certificates", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
  { href: "/student/messages", label: "Messages", icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" },
  { href: "/student/profile", label: "Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
];

export default function StudentDashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>({courses:0,completed:0,attendance:0,flightHours:0,examAvg:0,flights:0});
  const [flightData, setFlightData] = useState<any[]>([]);
  const [compData, setCompData] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/student/login"); } }, [isLoading, isAuthenticated, router]);
  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };
  useEffect(() => { if (!isAuthenticated) return;
    Promise.all([fetch("/api/students/progress/",{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).catch(()=>({})),fetch("/api/students/flight-log/",{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).catch(()=>({})),fetch("/api/exams/my_attempts/",{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).catch(()=>[])]).then(([prog,log,attempts])=>{
      const scores=(Array.isArray(attempts)?attempts:[]).filter((a:any)=>a.score!==null).map((a:any)=>a.score);
      setStats({courses:prog.total_courses||0,completed:prog.completed_courses||0,attendance:prog.attendance_rate||0,flightHours:log.total_flight_hours||0,examAvg:scores.length>0?Math.round(scores.reduce((a:number,b:number)=>a+b,0)/scores.length):0,flights:log.total_lessons||0});
      const lessons=log.lessons||[];
      setFlightData(lessons.slice(-10).map((l:any,i:number)=>({name:l.date?.slice(5)||`#${i+1}`,hours:l.duration||0})));
      setCompData([{name:"Nav",value:Math.min(log.total_flight_hours*2||10,100)},{name:"Comms",value:Math.min(log.total_lessons*5||10,100)},{name:"Maneuv",value:Math.min(stats.flights*3||10,100)},{name:"Proced",value:Math.min(stats.attendance||10,100)},{name:"Safety",value:Math.min(100,stats.examAvg*1.2||10)}]);
    }).finally(()=>setDataLoading(false));
  },[isAuthenticated]);

  return (<div className="min-h-screen bg-navy-900 flex">
    <aside className="w-56 bg-navy-800 border-r border-navy-700 min-h-screen hidden lg:block shrink-0"><div className="p-4 border-b border-navy-700"><Image src="/mast.svg" alt="MAA" width={80} height={80} className="rounded-lg mx-auto"/><p className="text-white font-bold text-center mt-2 text-sm">Student Portal</p><p className="text-xs text-gold-500 text-center">{user?.name||user?.email}</p></div><nav className="p-2">{NAV.map(item=><a key={item.href} href={item.href} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm mb-1 transition-colors ${pathname===item.href?"bg-gold-500/20 text-gold-500 font-medium":"text-gray-400 hover:text-white hover:bg-navy-700"}`}><svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={item.icon}/></svg>{item.label}</a>)}</nav><div className="p-4 border-t border-navy-700"><button onClick={async()=>{await logout();router.push("/student/login")}} className="w-full py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">Logout</button></div></aside>
    <div className="flex-1 min-w-0"><nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50"><div className="max-w-6xl mx-auto px-6 h-16 flex items-center"><h1 className="text-lg font-bold text-white">Dashboard</h1></div></nav>
    <main className="px-6 py-8"><h2 className="text-2xl font-bold text-white mb-2">Welcome back, {user?.name?.split(" ")[0]||"Student"}</h2><p className="text-gray-400 mb-8">Your training overview</p>
      {dataLoading?<p className="text-gray-500">Loading stats...</p>:<>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"><SCard label="Enrolled" value={stats.courses} sub="Courses"/><SCard label="Flight Hours" value={`${stats.flightHours}h`} sub={`${stats.flights} flights`}/><SCard label="Exam Avg" value={stats.examAvg>0?`${stats.examAvg}%`:"-"} sub={`${stats.attendance}% attendance`}/><SCard label="Completed" value={stats.completed} sub="Courses done"/></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6"><h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Flight Hours</h3>{flightData.length>0?<ResponsiveContainer width="100%" height={220}><LineChart data={flightData}><CartesianGrid strokeDasharray="3 3" stroke="#1a2332"/><XAxis dataKey="name" stroke="#94a3b8" fontSize={11}/><YAxis stroke="#94a3b8" fontSize={11}/><Tooltip/><Line type="monotone" dataKey="hours" stroke="#c4943c" strokeWidth={2} dot={{r:4}}/></LineChart></ResponsiveContainer>:<p className="text-gray-500 text-sm text-center py-8">No flight data yet</p>}</div>
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6"><h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Competencies</h3><ResponsiveContainer width="100%" height={220}><RadarChart data={compData}><PolarGrid stroke="#1a2332"/><PolarAngleAxis dataKey="name" stroke="#94a3b8" fontSize={10}/><PolarRadiusAxis stroke="#94a3b8" fontSize={10}/><Radar dataKey="value" stroke="#c4943c" fill="#c4943c" fillOpacity={0.2}/></RadarChart></ResponsiveContainer></div>
        </div>
      </>}</main></div></div>);
}
function SCard({label,value,sub}:{label:string;value:string|number;sub:string}){return <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><p className="text-3xl font-bold text-white">{value}</p><p className="text-sm text-gray-400 mt-1">{label}</p><p className="text-xs text-gray-500">{sub}</p></div>}
