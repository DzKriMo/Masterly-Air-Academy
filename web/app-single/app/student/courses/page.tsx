"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

interface Course { id: string; title: string; subject_code: string; scheduled_date: string; start_time: string; end_time: string; status: string; room_name: string | null; enrollment_count: number; }

export default function StudentCoursesPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/student/login"); } }, [isLoading, isAuthenticated, router]);
  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/courses/", { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => setCourses(d.results || [])).finally(() => setLoading(false));
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-3">
          <Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-lg" />
          <div><h1 className="text-lg font-bold text-white">My Courses</h1>
            <button onClick={() => router.push("/student/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">Back to Dashboard</button></div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading ? <p className="text-gray-500">Loading...</p> : courses.length === 0 ? <p className="text-gray-500 text-center py-12">No courses found. You are not enrolled in any courses yet.</p> : (
          <div className="space-y-3">
            {courses.map(c => (
              <div key={c.id} className="bg-navy-800 border border-navy-700 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-medium">{c.subject_code}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${c.status === "scheduled" ? "bg-blue-500/10 text-blue-400" : "bg-green-500/10 text-green-400"}`}>{c.status}</span>
                </div>
                <h3 className="text-white font-semibold">{c.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{c.scheduled_date} | {c.start_time?.slice(0,5)} - {c.end_time?.slice(0,5)} | {c.room_name || "TBD"}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
