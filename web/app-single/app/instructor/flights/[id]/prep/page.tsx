"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

export default function FlightPrepPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const flightId = params?.id as string;
  const [checks, setChecks] = useState({ weather: false, notam: false, performance: false, document: false, medical: false });
  const [objectives, setObjectives] = useState("");
  const [briefing, setBriefing] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/login"); } }, [isLoading, isAuthenticated, router]);
  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

  const toggle = (k: keyof typeof checks) => setChecks({ ...checks, [k]: !checks[k] });
  const allChecked = Object.values(checks).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch(`/api/flight-lessons/${flightId}/preparation/`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ flight_lesson: flightId, weather_check: checks.weather, notam_check: checks.notam, performance_check: checks.performance, document_check: checks.document, medical_check: checks.medical, lesson_objectives: objectives, briefing_notes: briefing }),
      });
      if (res.ok) { setMsg("Preparation checklist submitted."); setTimeout(() => router.push("/instructor/flights"), 1500); }
      else { const d = await res.json(); setMsg(d.error || d.message || "Failed"); }
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-3">
          <Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-lg" />
          <div><h1 className="text-lg font-bold text-white">Pre-Flight Preparation</h1>
            <button onClick={() => router.push("/instructor/flights")} className="text-xs text-gray-500 hover:text-gold-500">Back to Flights</button></div>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-8">
        {msg && <div className={`mb-6 p-4 rounded-lg text-sm ${msg.includes("submitted") ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>{msg}</div>}
        <form onSubmit={handleSubmit} className="bg-navy-800 border border-navy-700 rounded-xl p-6 space-y-5">
          <h2 className="text-xl font-bold text-white">Pre-Flight Checklist</h2>
          <p className="text-sm text-gray-400">Verify all items before the flight lesson. All items must be checked to submit.</p>
          <div className="space-y-3">
            {[
              { key: "weather" as const, label: "Weather Check", desc: "Current and forecast weather reviewed for the route and period" },
              { key: "notam" as const, label: "NOTAM Check", desc: "All relevant NOTAMs reviewed for departure, route, and destination" },
              { key: "performance" as const, label: "Performance Calculations", desc: "Takeoff, landing, and climb performance calculated for current conditions" },
              { key: "document" as const, label: "Document Check", desc: "Aircraft documents, insurance, and certification verified as current" },
              { key: "medical" as const, label: "Medical Check", desc: "Student medical certificate verified as valid for this flight" },
            ].map(item => (
              <button key={item.key} type="button" onClick={() => toggle(item.key)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${checks[item.key] ? "bg-green-500/10 border-green-500/30" : "bg-navy-900 border-navy-600 hover:border-gray-400"}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${checks[item.key] ? "bg-green-500 border-green-500" : "border-gray-500"}`}>
                    {checks[item.key] && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <div><p className="text-white font-medium text-sm">{item.label}</p><p className="text-xs text-gray-500">{item.desc}</p></div>
                </div>
              </button>
            ))}
          </div>
          <div><label className="block text-sm text-gray-400 mb-1">Lesson Objectives</label><textarea value={objectives} onChange={e => setObjectives(e.target.value)} rows={2} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" placeholder="What will be covered in this lesson?" /></div>
          <div><label className="block text-sm text-gray-400 mb-1">Briefing Notes</label><textarea value={briefing} onChange={e => setBriefing(e.target.value)} rows={2} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" placeholder="Additional briefing notes for the student..." /></div>
          <button type="submit" disabled={saving || !allChecked} className="w-full py-3 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-bold rounded-lg">{saving ? "Submitting..." : "Submit Preparation"}</button>
        </form>
      </main>
    </div>
  );
}
