"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

interface Msg { id: string; sender_name: string; receiver_name: string; subject: string; body: string; is_read: boolean; created_at: string; }

export default function StudentMessagesPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [received, setReceived] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/student/login"); } }, [isLoading, isAuthenticated, router]);
  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/messages/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).then(d => setReceived(d.results || [])).catch(() => {}).finally(() => setLoading(false));
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3"><Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-lg" /><div><h1 className="text-lg font-bold text-white">Messages</h1><button onClick={() => router.push("/student/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">Back to Dashboard</button></div></div>
          <button onClick={async () => { await logout(); router.push("/student/login"); }} className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">Logout</button>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-8">
        {loading ? <p className="text-gray-500">Loading...</p> : received.length === 0 ? <p className="text-gray-500 text-center py-12">No messages.</p> : (
          <div className="space-y-2">{received.map(m => (<div key={m.id} className={`bg-navy-800 border border-navy-700 rounded-xl p-4 ${!m.is_read ? "border-l-4 border-l-gold-500" : ""}`}><div className="flex items-center justify-between mb-1"><span className="text-white font-medium text-sm">{m.sender_name}</span><span className="text-xs text-gray-500">{new Date(m.created_at).toLocaleDateString()}</span></div><p className="text-sm font-medium text-gray-300">{m.subject}</p><p className="text-xs text-gray-500 mt-1">{m.body}</p></div>))}</div>
        )}
      </main>
    </div>
  );
}
