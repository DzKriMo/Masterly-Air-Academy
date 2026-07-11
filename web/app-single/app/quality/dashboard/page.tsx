"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

interface Audit { id: string; title: string; type: string; scheduled_date: string; status: string; ncr_count: number; }
interface NCR { id: string; title: string; severity: string; status: string; due_date: string | null; audit_title: string; }
interface CAPA { id: string; title: string; type: string; status: string; due_date: string | null; ncr_title: string; }
interface SafetyEvent { id: string; title: string; type: string; status: string; created_at: string; }

export default function QualityDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [ncrs, setNcrs] = useState<NCR[]>([]);
  const [capas, setCapas] = useState<CAPA[]>([]);
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"audits"|"ncrs"|"capas"|"safety">("audits");
  const [showReport, setShowReport] = useState(false);
  const [reportForm, setReportForm] = useState({ title: "", type: "incident", description: "", confidential: false });
  const [msg, setMsg] = useState("");

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/login"); } }, [isLoading, isAuthenticated, router]);

  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      fetch("/api/audits/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      fetch("/api/non-conformities/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      fetch("/api/capas/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      fetch("/api/safety-events/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
    ]).then(([a, n, c, s]) => {
      setAudits(a.results || []); setNcrs(n.results || []); setCapas(c.results || []); setEvents(s.results || []);
    }).finally(() => setLoading(false));
  }, [isAuthenticated]);

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/safety-events/", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(reportForm),
      });
      if (res.ok) { setMsg("Safety event reported."); setShowReport(false); setReportForm({ title: "", type: "incident", description: "", confidential: false }); }
      else { const d = await res.json(); setMsg(d.message || "Failed"); }
    } catch { setMsg("Connection error"); }
  };

  const openNcrs = ncrs.filter(n => n.status === 'open').length;
  const openCapas = capas.filter(c => c.status === 'open').length;
  const plannedAudits = audits.filter(a => a.status === 'planned').length;
  const reportedEvents = events.length;

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-lg" />
            <div><h1 className="text-lg font-bold text-white">Quality & Safety</h1><p className="text-xs text-gold-500">Dashboard</p></div>
          </div>
          <button onClick={() => setShowReport(!showReport)} className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500 hover:text-white transition-colors">
            {showReport ? "Cancel" : "+ Report Event"}
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {msg && <div className="mb-4 p-3 rounded-lg text-sm bg-navy-800 border border-navy-700 text-gray-300">{msg}</div>}

        {showReport && (
          <form onSubmit={handleReport} className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Report Safety Event</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Title</label><input value={reportForm.title} onChange={e => setReportForm({...reportForm, title: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Type</label><select value={reportForm.type} onChange={e => setReportForm({...reportForm, type: e.target.value})} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"><option value="incident">Incident</option><option value="near_miss">Near Miss</option><option value="hazard">Hazard</option><option value="observation">Observation</option></select></div>
            </div>
            <div className="mt-4"><label className="block text-sm text-gray-400 mb-1">Description</label><textarea value={reportForm.description} onChange={e => setReportForm({...reportForm, description: e.target.value})} required rows={3} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" /></div>
            <div className="flex items-center gap-2 mt-4"><input type="checkbox" id="confidential" checked={reportForm.confidential} onChange={e => setReportForm({...reportForm, confidential: e.target.checked})} /><label htmlFor="confidential" className="text-sm text-gray-400">Report anonymously</label></div>
            <button type="submit" className="mt-4 px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg text-sm">Submit Report</button>
          </form>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Open NCRs" value={openNcrs} color="text-red-400" />
          <StatCard label="Open CAPAs" value={openCapas} color="text-yellow-400" />
          <StatCard label="Planned Audits" value={plannedAudits} color="text-blue-400" />
          <StatCard label="Safety Events" value={reportedEvents} color="text-purple-400" />
        </div>

        <div className="flex gap-2 mb-6">
          {(["audits","ncrs","capas","safety"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${tab === t ? "bg-gold-500 text-navy-900" : "bg-navy-800 text-gray-400 border border-navy-700"}`}>{t}</button>
          ))}
        </div>

        {loading ? <p className="text-gray-500 text-sm">Loading...</p> : (
          <div className="space-y-3">
            {tab === "audits" && audits.map(a => (
              <div key={a.id} className="bg-navy-800 border border-navy-700 rounded-xl p-4 flex items-center justify-between">
                <div><span className="text-white font-medium">{a.title}</span><span className="text-sm text-gray-400 ml-3">{a.type}</span><span className="text-xs text-gray-500 ml-3">{a.scheduled_date?.slice(0,10)}</span></div>
                <div className="flex items-center gap-3"><span className="text-xs text-gray-400">{a.ncr_count} NCRs</span><span className={`text-xs px-2 py-0.5 rounded ${a.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>{a.status}</span></div>
              </div>
            ))}
            {tab === "ncrs" && ncrs.map(n => (
              <div key={n.id} className="bg-navy-800 border border-navy-700 rounded-xl p-4 flex items-center justify-between">
                <div><span className="text-white font-medium">{n.title}</span><span className="text-sm text-gray-400 ml-3">{n.audit_title}</span></div>
                <div className="flex items-center gap-3"><span className={`text-xs px-2 py-0.5 rounded font-medium ${n.severity === 'critical' ? 'bg-red-500/10 text-red-400' : n.severity === 'major' ? 'bg-orange-500/10 text-orange-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{n.severity}</span><span className={`text-xs px-2 py-0.5 rounded ${n.status === 'open' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>{n.status}</span></div>
              </div>
            ))}
            {tab === "capas" && capas.map(c => (
              <div key={c.id} className="bg-navy-800 border border-navy-700 rounded-xl p-4 flex items-center justify-between">
                <div><span className="text-white font-medium">{c.title}</span><span className="text-sm text-gray-400 ml-3">{c.ncr_title}</span></div>
                <div className="flex items-center gap-3"><span className="text-xs text-gray-400">Due: {c.due_date?.slice(0,10) || "N/A"}</span><span className={`text-xs px-2 py-0.5 rounded font-medium ${c.type === 'corrective' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>{c.type}</span><span className={`text-xs px-2 py-0.5 rounded ${c.status === 'open' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-green-500/10 text-green-400'}`}>{c.status}</span></div>
              </div>
            ))}
            {tab === "safety" && events.map(e => (
              <div key={e.id} className="bg-navy-800 border border-navy-700 rounded-xl p-4 flex items-center justify-between">
                <div><span className="text-white font-medium">{e.title}</span><span className="text-sm text-gray-400 ml-3">{e.type}</span></div>
                <span className={`text-xs px-2 py-0.5 rounded ${e.status === 'reported' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-green-500/10 text-green-400'}`}>{e.status}</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><p className={`text-2xl font-bold ${color}`}>{value}</p><p className="text-xs text-gray-400 mt-1">{label}</p></div>;
}
