"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

interface Student {
  id: string;
  student: string;
  student_name: string;
  status: string;
}

interface AttendanceRow {
  student_id: string;
  student_name: string;
  status: string;
  notes: string;
}

export default function AttendancePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const courseId = params?.id as string;

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) { router.push("/login"); return; }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated || !courseId) return;
    const session = JSON.parse(sessionStorage.getItem("maa_session") || "{}");

    fetch(`/api/courses/${courseId}/students/`, { headers: { Authorization: `Bearer ${session.token}` } })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : d.results || [];
        setStudents(list);
        setAttendance(list.map((s: Student) => ({
          student_id: s.student || s.id,
          student_name: s.student_name,
          status: "present",
          notes: "",
        })));
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, courseId]);

  const toggleStatus = (idx: number) => {
    const updated = [...attendance];
    const order = ["present", "late", "absent", "excused_absence"];
    const currentIdx = order.indexOf(updated[idx].status);
    updated[idx].status = order[(currentIdx + 1) % order.length];
    setAttendance(updated);
  };

  const markAll = (status: string) => {
    setAttendance(attendance.map(a => ({ ...a, status })));
  };

  const handleSubmit = async () => {
    setSaving(true);
    const session = JSON.parse(sessionStorage.getItem("maa_session") || "{}");
    try {
      await fetch(`/api/courses/${courseId}/attendance/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ course_id: courseId, date, records: attendance }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const statusColor = (s: string) =>
    s === "present" ? "bg-green-500/20 text-green-400" :
    s === "late" ? "bg-yellow-500/20 text-yellow-400" :
    s === "absent" ? "bg-red-500/20 text-red-400" :
    "bg-gray-500/20 text-gray-400";

  if (loading) return <div className="min-h-screen bg-navy-900 flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-lg" />
            <div>
              <h1 className="text-lg font-bold text-white">Take Attendance</h1>
              <button onClick={() => router.push("/instructor/courses")} className="text-xs text-gray-500 hover:text-gold-500">Back to Courses</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">{students.length} students enrolled</h2>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="mt-2 px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => markAll("present")} className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded text-xs hover:bg-green-500/20">All Present</button>
            <button onClick={() => markAll("absent")} className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded text-xs hover:bg-red-500/20">All Absent</button>
            <button onClick={handleSubmit} disabled={saving}
              className="px-6 py-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-bold rounded-lg text-sm transition-colors">
              {saving ? "Saving..." : saved ? "Saved" : "Save Attendance"}
            </button>
            <a href={`/api/attendance/${courseId}/pdf/`} className="px-4 py-2 border border-navy-600 text-gray-400 rounded-lg text-sm hover:border-gold-500 hover:text-gold-500">Download PDF</a>
          </div>
        </div>

        {saved && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">Attendance saved successfully.</div>}

        <div className="space-y-2">
          {attendance.map((row, idx) => (
            <div key={row.student_id}
              className="flex items-center justify-between bg-navy-800 border border-navy-700 rounded-xl p-4 hover:border-navy-600 transition-colors">
              <span className="text-white font-medium">{row.student_name}</span>
              <button onClick={() => toggleStatus(idx)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium min-w-[100px] text-center transition-colors ${statusColor(row.status)}`}>
                {row.status.replace("_", " ")}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
