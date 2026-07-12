"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

interface Cert { id: string; certificate_number: string; type: string; title: string; program: string; issue_date: string; expiry_date: string | null; status: string; }

export default function StudentCertificatesPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/student/login"); } }, [isLoading, isAuthenticated, router]);
  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };
  useEffect(() => { if (!isAuthenticated) return;
    fetch("/api/certificates/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).then(d => setCerts(d.results || [])).catch(() => {}).finally(() => setLoading(false));
  }, [isAuthenticated]);

  return (<div className="min-h-screen bg-navy-900">
    <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50"><div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between"><div className="flex items-center gap-3"><Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-lg"/><div><h1 className="text-lg font-bold text-white">My Certificates</h1><button onClick={()=>router.push("/student/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">Back to Dashboard</button></div></div><button onClick={async()=>{await logout();router.push("/student/login")}} className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">Logout</button></div></nav>
    <main className="max-w-5xl mx-auto px-6 py-8">{loading?<p className="text-gray-500">Loading...</p>:certs.length===0?<p className="text-gray-500 text-center py-12">No certificates earned yet. Complete exams and courses to earn certificates.</p>:<div className="grid grid-cols-1 md:grid-cols-2 gap-4">{certs.map(c=>(<div key={c.id} className="bg-navy-800 border border-navy-700 rounded-xl p-6"><div className="flex items-center justify-between mb-3"><span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono">{c.certificate_number}</span><span className={`text-xs px-2 py-0.5 rounded ${c.status==="issued"?"bg-green-500/10 text-green-400":"bg-gray-500/10 text-gray-400"}`}>{c.status}</span></div><h3 className="text-white font-bold text-lg">{c.title||c.type}</h3><p className="text-sm text-gray-400 mt-1">{c.program} | Issued: {c.issue_date}</p>{c.expiry_date&&<p className="text-xs text-gray-500 mt-1">Expires: {c.expiry_date}</p>}</div>))}</div>}</main></div>);
}
