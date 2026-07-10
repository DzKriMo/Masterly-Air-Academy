"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

interface Course {
  id: string;
  title: string;
  subject_code: string;
  instructor_name: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: string;
  enrollment_count: number;
  room_name: string | null;
}

export default function CoursesPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) { router.push("/login"); return; }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const session = JSON.parse(sessionStorage.getItem("maa_session") || "{}");
    fetch("/api/courses/", { headers: { Authorization: `Bearer ${session.token}` } })
      .then(r => r.json())
      .then(d => setCourses(Array.isArray(d) ? d : d.results || []))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const filtered = filter
    ? courses.filter(c => c.status === filter || c.subject_code === filter)
    : courses;

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/mast.svg" alt="MAA" width={36} height={36} className="rounded-lg" />
            <div>
              <h1 className="text-lg font-bold text-white">My Courses</h1>
              <button onClick={() => router.push("/instructor/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">Back to Dashboard</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap gap-2 mb-6">
          {["", "scheduled", "in_progress", "completed"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? "bg-gold-500 text-navy-900" : "bg-navy-800 text-gray-400 border border-navy-700 hover:border-gold-500"
              }`}>
              {f || "All"}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-500">Loading courses...</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => (
              <div key={c.id} className="bg-navy-800 border border-navy-700 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-medium">{c.subject_code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      c.status === "scheduled" ? "bg-blue-500/10 text-blue-400" :
                      c.status === "completed" ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"
                    }`}>{c.status}</span>
                  </div>
                  <h3 className="text-white font-semibold">{c.title}</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {c.scheduled_date} | {c.start_time?.slice(0,5)} - {c.end_time?.slice(0,5)} | {c.room_name || "TBD"} | {c.enrollment_count} enrolled
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => router.push(`/instructor/courses/${c.id}/attendance`)}
                    className="px-4 py-2 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded-lg text-sm hover:bg-gold-500 hover:text-navy-900 transition-colors">
                    Attendance
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-gray-500 text-center py-8">No courses found.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
