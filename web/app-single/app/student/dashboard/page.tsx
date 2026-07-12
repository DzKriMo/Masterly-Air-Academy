"use client";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";

const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };
const f = (url:string) => fetch(url,{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).catch(()=>({}));

export default function StudentDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { data, isLoading: dataLoading } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: () => Promise.all([f("/api/students/progress/"), f("/api/students/flight-log/"), f("/api/exams/my_attempts/")]),
    enabled: isAuthenticated,
  });
  const [prog={}, log={}, attempts=[]] = data || [{},{},[]];
  const scores=(Array.isArray(attempts)?attempts:[]).filter((a:any)=>a.score!==null).map((a:any)=>a.score);
  const stats={courses:prog.total_courses||0,completed:prog.completed_courses||0,attendance:prog.attendance_rate||0,flightHours:log.total_flight_hours||0,examAvg:scores.length>0?Math.round(scores.reduce((a:number,b:number)=>a+b,0)/scores.length):0,flights:log.total_lessons||0};
  const lessons=log.lessons||[];
  const flightData=lessons.slice(-10).map((l:any,i:number)=>({name:l.date?.slice(5)||`#${i+1}`,hours:l.duration||0}));
  const compData=[{name:"Nav",value:Math.min(log.total_flight_hours*2||10,100)},{name:"Comms",value:Math.min(log.total_lessons*5||10,100)},{name:"Maneuv",value:Math.min(stats.flights*3||10,100)},{name:"Proced",value:Math.min(stats.attendance||10,100)},{name:"Safety",value:Math.min(100,stats.examAvg*1.2||10)}];

  return (<div className="flex-1 min-w-0"><nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50"><div className="max-w-6xl mx-auto px-6 h-16 flex items-center"><h1 className="text-lg font-bold text-white">Dashboard</h1></div></nav><main className="px-6 py-8"><h2 className="text-2xl font-bold text-white mb-2">Welcome back, {user?.name?.split(" ")[0]||"Student"}</h2><p className="text-gray-400 mb-8">Your training overview</p>
    {dataLoading?<p className="text-gray-500">Loading stats...</p>:<><div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"><SCard label="Enrolled" value={stats.courses} sub="Courses"/><SCard label="Flight Hours" value={`${stats.flightHours}h`} sub={`${stats.flights} flights`}/><SCard label="Exam Avg" value={stats.examAvg>0?`${stats.examAvg}%`:"-"} sub={`${stats.attendance}% attendance`}/><SCard label="Completed" value={stats.completed} sub="Courses done"/></div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="bg-navy-800 border border-navy-700 rounded-xl p-6"><h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Flight Hours</h3>{flightData.length>0?<ResponsiveContainer width="100%" height={220}><LineChart data={flightData}><CartesianGrid strokeDasharray="3 3" stroke="#1a2332"/><XAxis dataKey="name" stroke="#94a3b8" fontSize={11}/><YAxis stroke="#94a3b8" fontSize={11}/><Tooltip/><Line type="monotone" dataKey="hours" stroke="#c4943c" strokeWidth={2} dot={{r:4}}/></LineChart></ResponsiveContainer>:<p className="text-gray-500 text-sm text-center py-8">No flight data yet</p>}</div>
    <div className="bg-navy-800 border border-navy-700 rounded-xl p-6"><h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Competencies</h3><ResponsiveContainer width="100%" height={220}><RadarChart data={compData}><PolarGrid stroke="#1a2332"/><PolarAngleAxis dataKey="name" stroke="#94a3b8" fontSize={10}/><PolarRadiusAxis stroke="#94a3b8" fontSize={10}/><Radar dataKey="value" stroke="#c4943c" fill="#c4943c" fillOpacity={0.2}/></RadarChart></ResponsiveContainer></div></div></>}</main></div>);
}
function SCard({label,value,sub}:{label:string;value:string|number;sub:string}){return <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><p className="text-3xl font-bold text-white">{value}</p><p className="text-sm text-gray-400 mt-1">{label}</p><p className="text-xs text-gray-500">{sub}</p></div>}
