"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

interface Student { id: string; student_number: string; first_name: string; last_name: string; full_name: string; program: string; status: string; enrollment_date: string; }

export default function InstructorStudentsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/login"); } }, [isLoading, isAuthenticated, router]);
  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/students/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).then(d => setStudents(d.results || d || [])).finally(() => setLoading(false));
  }, [isAuthenticated]);

  const filtered = search ? students.filter(s => s.full_name.toLowerCase().includes(search.toLowerCase()) || s.student_number.includes(search)) : students;

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3"><Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-lg" /><div><h1 className="text-lg font-bold text-white">My Students</h1><button onClick={() => router.push("/instructor/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">Back to Dashboard</button></div></div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or number..." className="px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm w-64" />
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? <p className="text-gray-500">Loading...</p> : filtered.length === 0 ? <p className="text-gray-500 text-center py-12">No students found.</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(s => (
              <div key={s.id} className="bg-navy-800 border border-navy-700 rounded-xl p-5 hover:border-gold-500/40 transition-all">
                <div className="flex items-center justify-between mb-3"><span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono">{s.student_number}</span><span className={`text-xs px-2 py-0.5 rounded ${s.status === "active" ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"}`}>{s.status}</span></div>
                <h3 className="text-white font-bold text-lg">{s.full_name}</h3>
                <p className="text-sm text-gray-400 mt-1">{s.program} | Enrolled: {s.enrollment_date}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
