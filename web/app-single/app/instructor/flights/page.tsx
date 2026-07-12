"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

interface Flight {
  id: string; student_name: string; instructor_name: string;
  aircraft_reg: string; scheduled_date: string; start_time: string; end_time: string;
  status: string; flight_duration: number | null; grade: number | null;
  has_preparation: boolean;
}

interface Aircraft { id: string; registration: string; model: string; }

export default function FlightsPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ student_id: "", aircraft: "", scheduled_date: "", start_time: "", end_time: "" });
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) { router.push("/login"); return; }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/flight-lessons/", { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => setFlights(d.results || [])).finally(() => setLoading(false));
    fetch("/api/aircraft/", { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => setAircraft(d.results || []));
  }, [isAuthenticated]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch("/api/flight-lessons/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) { setMsg("Flight scheduled."); setShowForm(false); setFlights([data, ...flights]); }
      else { setMsg(data.conflicts?.[0] || data.message || "Failed"); }
    } finally { setSaving(false); }
  };

  const filtered = filter ? flights.filter(f => f.status === filter) : flights;

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-lg" />
            <div>
              <h1 className="text-lg font-bold text-white">Flight Schedule</h1>
              <button onClick={() => router.push("/instructor/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">Back to Dashboard</button>
            </div>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm">
            {showForm ? "Cancel" : "+ New Flight"}
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {msg && <div className="mb-4 p-3 rounded-lg text-sm bg-navy-800 border border-navy-700 text-gray-300">{msg}</div>}

        {showForm && (
          <form onSubmit={handleCreate} className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Schedule Flight Lesson</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Student ID</label><input value={form.student_id} onChange={e => setForm({...form, student_id: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Aircraft</label><select value={form.aircraft} onChange={e => setForm({...form, aircraft: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"><option value="">Select...</option>{aircraft.map(a => <option key={a.id} value={a.id}>{a.registration} ({a.model})</option>)}</select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Date</label><input type="date" value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Start</label><input type="datetime-local" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">End</label><input type="datetime-local" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" /></div>
            </div>
            <button type="submit" disabled={saving} className="mt-4 px-6 py-2.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-semibold rounded-lg text-sm">{saving ? "Scheduling..." : "Schedule Flight"}</button>
          </form>
        )}

        <div className="flex gap-2 mb-6">
          {["", "scheduled", "completed", "cancelled"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === f ? "bg-gold-500 text-navy-900" : "bg-navy-800 text-gray-400 border border-navy-700"}`}>{f || "All"}</button>
          ))}
        </div>

        {loading ? <p className="text-gray-500">Loading...</p> : (
          <div className="space-y-3">
            {filtered.map(f => (
              <div key={f.id} className="bg-navy-800 border border-navy-700 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${f.status === "scheduled" ? "bg-blue-500/10 text-blue-400" : f.status === "completed" ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"}`}>{f.status}</span>
                    {!f.has_preparation && f.status === "scheduled" && <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded">No prep</span>}
                  </div>
                  <h3 className="text-white font-semibold">{f.student_name} - {f.aircraft_reg}</h3>
                  <p className="text-sm text-gray-400">{f.scheduled_date} | {f.start_time?.slice(0,16)} | {f.flight_duration ? `${f.flight_duration}h` : "N/A"} | Grade: {f.grade ?? "-"}</p>
                </div>
                <div className="flex gap-2">
                  {f.status === "scheduled" && (
                    <>
                      <button onClick={() => router.push(`/instructor/flights/${f.id}/prep`)} className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded text-xs hover:bg-blue-500/20">Prep</button>
                      <button onClick={() => router.push(`/instructor/flights/${f.id}/evaluate`)} className="px-3 py-1.5 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded text-xs hover:bg-gold-500 hover:text-navy-900">Evaluate</button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-gray-500 text-center py-8">No flights found.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
