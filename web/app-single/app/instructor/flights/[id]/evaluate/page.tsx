"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

export default function EvaluateFlightPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const flightId = params?.id as string;

  const [form, setForm] = useState({
    flight_duration: "", exercises_completed: "", competencies_acquired: "",
    difficulties: "", observations: "", recommendations: "", grade: "", result: "", pedagogical_note: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) { router.push("/login"); }
  }, [isLoading, isAuthenticated, router]);

  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const body = {
        ...form,
        flight_duration: parseFloat(form.flight_duration),
        grade: parseFloat(form.grade),
        exercises_completed: form.exercises_completed.split(",").map(s => s.trim()).filter(Boolean),
        competencies_acquired: form.competencies_acquired.split(",").map(s => s.trim()).filter(Boolean),
      };
      const res = await fetch(`/api/flight-lessons/${flightId}/evaluate/`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(body),
      });
      if (res.ok) { setMsg("Evaluation submitted."); setTimeout(() => router.push("/instructor/flights"), 1500); }
      else { const d = await res.json(); setMsg(d.message || "Failed"); }
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-3">
          <Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-lg" />
          <div><h1 className="text-lg font-bold text-white">Post-Flight Evaluation</h1>
            <button onClick={() => router.push("/instructor/flights")} className="text-xs text-gray-500 hover:text-gold-500">Back to Flights</button></div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {msg && <div className={`mb-6 p-4 rounded-lg text-sm ${msg.includes("submitted") ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>{msg}</div>}
        <form onSubmit={handleSubmit} className="bg-navy-800 border border-navy-700 rounded-xl p-6 space-y-5">
          <h2 className="text-xl font-bold text-white">Flight Evaluation</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm text-gray-400 mb-1">Flight Duration (hours)</label><input type="number" step="0.1" value={form.flight_duration} onChange={e => setForm({...form, flight_duration: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Grade (0-10)</label><input type="number" step="0.1" min="0" max="10" value={form.grade} onChange={e => setForm({...form, grade: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Result</label><select value={form.result} onChange={e => setForm({...form, result: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white"><option value="">Select...</option><option value="passed">Passed</option><option value="failed">Failed</option><option value="partial">Partial</option></select></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm text-gray-400 mb-1">Exercises Completed (comma separated)</label><input value={form.exercises_completed} onChange={e => setForm({...form, exercises_completed: e.target.value})} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white" placeholder="e.g. Takeoff, Landing, Steep turns" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Competencies Acquired</label><input value={form.competencies_acquired} onChange={e => setForm({...form, competencies_acquired: e.target.value})} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white" placeholder="e.g. Radio communication, Crosswind landing" /></div>
          </div>
          <div><label className="block text-sm text-gray-400 mb-1">Difficulties Encountered</label><textarea value={form.difficulties} onChange={e => setForm({...form, difficulties: e.target.value})} rows={2} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white" /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm text-gray-400 mb-1">Observations</label><textarea value={form.observations} onChange={e => setForm({...form, observations: e.target.value})} rows={2} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Recommendations</label><textarea value={form.recommendations} onChange={e => setForm({...form, recommendations: e.target.value})} rows={2} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white" /></div>
          </div>
          <div><label className="block text-sm text-gray-400 mb-1">Pedagogical Note</label><textarea value={form.pedagogical_note} onChange={e => setForm({...form, pedagogical_note: e.target.value})} rows={2} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white" /></div>
          <button type="submit" disabled={saving} className="w-full py-3 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-bold rounded-lg">{saving ? "Submitting..." : "Submit Evaluation"}</button>
        </form>
      </main>
    </div>
  );
}
