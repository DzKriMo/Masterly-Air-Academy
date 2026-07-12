"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

export default function ContractsPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/login"); } }, [isLoading, isAuthenticated, router]);
  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };
  useEffect(() => { if (!isAuthenticated) return;
    fetch("/api/contracts/",{headers:{Authorization:`Bearer ${token()}`}}).then(r=>r.json()).then(d=>setContracts(d.results||[])).catch(()=>{}).finally(()=>setLoading(false));
  },[isAuthenticated]);

  return (<div className="min-h-screen bg-navy-900">
    <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between"><div className="flex items-center gap-3"><Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-lg"/><div><h1 className="text-lg font-bold text-white">Contracts</h1><button onClick={()=>router.push("/finance/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">Back to Finance</button></div></div><button onClick={async()=>{await logout();router.push("/login")}} className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">Logout</button></div></nav>
    <main className="max-w-7xl mx-auto px-6 py-8">{loading?<p className="text-gray-500">Loading...</p>:contracts.length===0?<p className="text-gray-500 text-center py-12">No contracts found.</p>:<div className="space-y-3">{contracts.map(c=>(<div key={c.id} className="bg-navy-800 border border-navy-700 rounded-xl p-4 flex items-center justify-between"><div><span className="text-white font-medium">{c.contract_number}</span><span className="text-sm text-gray-400 ml-3">{c.student_name}</span></div><div className="flex items-center gap-3"><span className="text-xs text-gray-400">{c.type}</span><span className={`text-xs px-2 py-0.5 rounded ${c.status==="active"?"bg-green-500/10 text-green-400":"bg-gray-500/10 text-gray-400"}`}>{c.status}</span></div></div>))}</div>}</main></div>);
}
