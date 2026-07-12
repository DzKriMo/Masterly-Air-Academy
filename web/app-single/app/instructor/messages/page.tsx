"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

interface Msg { id: string; sender_name: string; receiver_name: string; subject: string; body: string; is_read: boolean; created_at: string; }

export default function InstructorMessagesPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [received, setReceived] = useState<Msg[]>([]);
  const [sent, setSent] = useState<Msg[]>([]);
  const [tab, setTab] = useState("inbox");
  const [form, setForm] = useState({ receiver: "", subject: "", body: "" });
  const [msg, setMsg] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/login"); } }, [isLoading, isAuthenticated, router]);
  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/messages/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).then(d => setReceived(d.results || [])).catch(() => {});
    fetch("/api/messages/sent/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).then(d => setSent(d || [])).catch(() => {});
    fetch("/api/students/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).then(d => setUsers(d.results || d || [])).catch(() => {});
    setLoading(false);
  }, [isAuthenticated]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/messages/", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }, body: JSON.stringify(form) });
      if (res.ok) { setMsg("Message sent."); setForm({ receiver: "", subject: "", body: "" }); setTab("sent"); }
      else { const d = await res.json(); setMsg(d.message || "Failed"); }
    } catch { setMsg("Connection error"); }
  };

  const display = tab === "inbox" ? received : sent;

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3"><Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-lg" /><div><h1 className="text-lg font-bold text-white">Messages</h1><button onClick={() => router.push("/instructor/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">Back to Dashboard</button></div></div>
          <div className="flex gap-2"><button onClick={() => setTab("inbox")} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${tab==="inbox"?"bg-gold-500 text-navy-900":"bg-navy-800 text-gray-400 border border-navy-700"}`}>Inbox</button><button onClick={() => setTab("sent")} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${tab==="sent"?"bg-gold-500 text-navy-900":"bg-navy-800 text-gray-400 border border-navy-700"}`}>Sent</button><button onClick={() => setTab("compose")} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${tab==="compose"?"bg-gold-500 text-navy-900":"bg-navy-800 text-gray-400 border border-navy-700"}`}>Compose</button></div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">
        {msg && <div className="mb-4 p-3 rounded-lg text-sm bg-navy-800 border border-navy-700 text-gray-300">{msg}</div>}
        {tab === "compose" && (
          <form onSubmit={handleSend} className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8">
            <div className="space-y-4">
              <div><label className="block text-sm text-gray-400 mb-1">To</label><select value={form.receiver} onChange={e => setForm({...form, receiver: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"><option value="">Select student...</option>{users.map((u: any) => <option key={u.id} value={u.id}>{u.full_name} ({u.student_number})</option>)}</select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Subject</label><input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Message</label><textarea value={form.body} onChange={e => setForm({...form, body: e.target.value})} required rows={4} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" /></div>
              <button type="submit" className="px-6 py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm">Send Message</button>
            </div>
          </form>
        )}
        {loading ? <p className="text-gray-500">Loading...</p> : display.length === 0 ? <p className="text-gray-500 text-center py-8">{tab === "inbox" ? "No messages received." : "No messages sent."}</p> : (
          <div className="space-y-2">{display.map(m => (<div key={m.id} className={`bg-navy-800 border border-navy-700 rounded-xl p-4 ${!m.is_read && tab==="inbox" ? "border-l-4 border-l-gold-500" : ""}`}><div className="flex items-center justify-between mb-1"><span className="text-white font-medium text-sm">{tab==="inbox"?m.sender_name:m.receiver_name}</span><span className="text-xs text-gray-500">{new Date(m.created_at).toLocaleDateString()}</span></div><p className="text-sm font-medium text-gray-300">{m.subject}</p><p className="text-xs text-gray-500 mt-1">{m.body}</p></div>))}</div>
        )}
      </main>
    </div>
  );
}
