"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

interface Subject { id: string; code: string; title_en: string; }
interface Room { id: string; name: string; }

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

export default function CoursesPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: "", title: "", scheduled_date: "", start_time: "", end_time: "", room: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const token = () => {
    try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) { router.push("/login"); return; }
  }, [isLoading, isAuthenticated, router]);

  const fetchCourses = () => {
    if (!isAuthenticated) return;
    fetch("/api/courses/", { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => setCourses(d.results || [])).finally(() => setLoading(false));
    fetch("/api/subjects/", { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => setSubjects(d.results || []));
    fetch("/api/rooms/", { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => setRooms(d.results || []));
  };

  useEffect(() => { fetchCourses(); }, [isAuthenticated]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/courses/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...form, academic_year: null }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg("Course created successfully.");
        setShowForm(false);
        setForm({ subject: "", title: "", scheduled_date: "", start_time: "", end_time: "", room: "" });
        fetchCourses();
      } else {
        setMsg(data.message || data.room?.[0] || Object.values(data).flat().join(", ") || "Failed to create course.");
      }
    } finally { setSaving(false); }
  };

  const filtered = filter ? courses.filter(c => c.status === filter || c.subject_code === filter) : courses;

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
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm transition-colors">
            {showForm ? "Cancel" : "+ New Course"}
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {msg && (
          <div className={`mb-6 p-4 rounded-lg text-sm ${msg.includes("success") ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
            {msg}
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Create New Course</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Subject</label>
                <select value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
                  <option value="">Select subject...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.title_en}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Title</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" placeholder="e.g. Navigation Basics" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Date</label>
                <input type="date" value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} required
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Start Time</label>
                <input type="time" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} required
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">End Time</label>
                <input type="time" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} required
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Room</label>
                <select value={form.room} onChange={e => setForm({...form, room: e.target.value})}
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
                  <option value="">No room</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name} (cap. {r.capacity})</option>)}
                </select>
              </div>
            </div>
            <button type="submit" disabled={saving}
              className="mt-4 px-6 py-2.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-semibold rounded-lg text-sm transition-colors">
              {saving ? "Creating..." : "Create Course"}
            </button>
          </form>
        )}

        {/* Filters */}
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

        {/* Course list */}
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
