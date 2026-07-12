"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { LayoutDashboard, CalendarDays, PlaneTakeoff, BookOpen, FileText, Users, MessageSquare } from "lucide-react";

const NAV = [
  { href: "/instructor/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/instructor/schedule", label: "Calendar", Icon: CalendarDays },
  { href: "/instructor/flights", label: "Flight Schedule", Icon: PlaneTakeoff },
  { href: "/instructor/courses", label: "My Courses", Icon: BookOpen },
  { href: "/instructor/modules", label: "Module Content", Icon: FileText },
  { href: "/instructor/students", label: "My Students", Icon: Users },
  { href: "/instructor/messages", label: "Messages", Icon: MessageSquare },
];

export default function InstructorDashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/login"); return; } if (!isLoading && user && !user.role.includes("instructor")) { router.push("/dashboard"); return; } }, [isLoading, isAuthenticated, user, router]);
  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };
  useEffect(() => { if (!isAuthenticated) return; fetch("/api/courses/",{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).then(d=>setCourses(d.results||[])).finally(()=>setLoading(false)); },[isAuthenticated]);
  const today = new Date().toISOString().split("T")[0];
  const todayCourses = courses.filter(c => c.scheduled_date === today);

  return (<div className="min-h-screen bg-navy-900 flex">
    {/* Sidebar */}
    <aside className="w-56 bg-navy-800 border-r border-navy-700 min-h-screen hidden lg:block shrink-0"><div className="p-4 border-b border-navy-700"><Image src="/mast.svg" alt="MAA" width={80} height={80} className="rounded-lg mx-auto"/><p className="text-white font-bold text-center mt-2 text-sm">Instructor Portal</p><p className="text-xs text-gold-500 text-center">{user?.name||user?.email}</p></div><nav className="p-2">{NAV.map(item=><a key={item.href} href={item.href} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm mb-1 transition-colors ${pathname===item.href?"bg-gold-500/20 text-gold-500 font-medium":"text-gray-400 hover:text-white hover:bg-navy-700"}`}><item.Icon className="w-4 h-4 shrink-0"/>{item.label}</a>)}</nav><div className="p-4 border-t border-navy-700"><button onClick={async()=>{await logout();router.push("/login")}} className="w-full py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">Logout</button></div></aside>
    {/* Main */}
    <div className="flex-1 min-w-0"><nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center"><h1 className="text-lg font-bold text-white">Dashboard</h1></div></nav>
      <main className="px-6 py-8"><h2 className="text-2xl font-bold text-white mb-2">Welcome back, {user?.name?.split(" ")[0]||"Instructor"}</h2><p className="text-gray-400 mb-8">Instructor Dashboard</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"><Stat title="Total Courses" value={courses.length}/><Stat title="Today's Courses" value={todayCourses.length}/><Stat title="Active Students" value="—"/></div>
        <div className="bg-navy-800 rounded-xl border border-navy-700 p-6"><div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">Today's Schedule</h3><span className="text-sm text-gray-500">{today}</span></div>{loading?<p className="text-gray-500 text-sm">Loading...</p>:todayCourses.length===0?<p className="text-gray-500 text-sm">No courses scheduled for today.</p>:<div className="space-y-3">{todayCourses.map(c=>(<div key={c.id} className="flex items-center justify-between p-4 bg-navy-900 rounded-lg border border-navy-700"><div><p className="text-white font-medium">{c.title}</p><p className="text-sm text-gray-400">{c.subject_code} | {c.room_name||"No room"} | {c.start_time?.slice(0,5)}-{c.end_time?.slice(0,5)}</p></div><span className={`text-xs px-3 py-1 rounded-full font-medium ${c.status==="scheduled"?"bg-blue-500/10 text-blue-400":c.status==="completed"?"bg-green-500/10 text-green-400":"bg-gray-500/10 text-gray-400"}`}>{c.status}</span></div>))}</div>}</div>
      </main></div></div>);
}
function Stat({title,value}:{title:string;value:number|string}){return <div className="bg-navy-800 rounded-xl border border-navy-700 p-6"><p className="text-3xl font-bold text-white">{value}</p><p className="text-sm text-gray-400 mt-1">{title}</p></div>}
