"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

interface Course {
  id: string;
  title: string;
  subject_code: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: string;
  enrollment_count: number;
  room_name: string | null;
}

export default function InstructorDashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) { router.push("/login"); return; }
    if (!isLoading && user && !user.role.includes("instructor")) { router.push("/dashboard"); return; }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = sessionStorage.getItem("maa_session");
    if (!token) return;
    const access = JSON.parse(token).token;
    fetch("/api/courses/", { headers: { Authorization: `Bearer ${access}` } })
      .then(r => r.json())
      .then(d => setCourses(Array.isArray(d) ? d : d.results || []))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const today = new Date().toISOString().split("T")[0];
  const todayCourses = courses.filter(c => c.scheduled_date === today);

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-lg" />
            <div>
              <h1 className="text-lg font-bold text-white">Masterly Air Academy</h1>
              <p className="text-xs text-gold-500">Instructor Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:inline">{user?.name || user?.email}</span>
            <button onClick={async () => { await logout(); router.push("/login"); }}
              className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-white mb-2">Instructor Dashboard</h2>
        <p className="text-gray-400 mb-8">Welcome back, {user?.name?.split(" ")[0] || "Instructor"}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Stat title="Total Courses" value={courses.length} />
          <Stat title="Today's Courses" value={todayCourses.length} />
          <Stat title="Active Students" value="-" />
        </div>

        <div className="bg-navy-800 rounded-xl border border-navy-700 p-6 mb-10">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ActionBtn onClick={() => router.push("/instructor/schedule")} label="Calendar" />
            <ActionBtn onClick={() => router.push("/instructor/flights")} label="Flight Schedule" />
            <ActionBtn onClick={() => router.push("/instructor/courses")} label="My Courses" />
            <ActionBtn onClick={() => router.push("/instructor/modules")} label="Module Content" />
          </div>
        </div>

        <div className="bg-navy-800 rounded-xl border border-navy-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Today's Schedule</h3>
            <span className="text-sm text-gray-500">{today}</span>
          </div>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : todayCourses.length === 0 ? (
            <p className="text-gray-500 text-sm">No courses scheduled for today.</p>
          ) : (
            <div className="space-y-3">
              {todayCourses.map(c => (
                <div key={c.id} className="flex items-center justify-between p-4 bg-navy-900 rounded-lg border border-navy-700">
                  <div>
                    <p className="text-white font-medium">{c.title}</p>
                    <p className="text-sm text-gray-400">{c.subject_code} | {c.room_name || "No room"} | {c.start_time?.slice(0,5)}-{c.end_time?.slice(0,5)}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                    c.status === "scheduled" ? "bg-blue-500/10 text-blue-400" :
                    c.status === "completed" ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"
                  }`}>{c.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="bg-navy-800 rounded-xl border border-navy-700 p-6">
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-sm text-gray-400 mt-1">{title}</p>
    </div>
  );
}

function ActionBtn({ onClick, label, external }: { onClick: () => void; label: string; external?: boolean }) {
  return external ? (
    <a href="/admin/ground_training/course/" target="_blank"
      className="block text-center px-4 py-3 bg-navy-900 border border-navy-600 rounded-lg text-gray-300 hover:border-gold-500 hover:text-gold-500 transition-colors text-sm">
      {label}
    </a>
  ) : (
    <button onClick={onClick}
      className="px-4 py-3 bg-navy-900 border border-navy-600 rounded-lg text-gray-300 hover:border-gold-500 hover:text-gold-500 transition-colors text-sm">
      {label}
    </button>
  );
}
