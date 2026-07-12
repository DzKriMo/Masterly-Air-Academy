"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

export default function StudentProfilePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ current_password: "", password: "", password_confirmation: "" });
  const [msg, setMsg] = useState("");
  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/student/login"); } }, [isLoading, isAuthenticated, router]);
  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.password_confirmation) { setMsg("Passwords do not match."); return; }
    if (form.password.length < 8) { setMsg("Password must be at least 8 characters."); return; }
    try {
      const res = await fetch("/api/profile/", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }, body: JSON.stringify(form) });
      const d = await res.json();
      setMsg(d.success ? "Password changed successfully." : (d.message || "Failed"));
      if (d.success) setForm({ current_password: "", password: "", password_confirmation: "" });
    } catch { setMsg("Connection error"); }
  };

  return (<div className="min-h-screen bg-navy-900">
    <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50"><div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between"><div className="flex items-center gap-3"><Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-lg"/><div><h1 className="text-lg font-bold text-white">My Profile</h1><button onClick={()=>router.push("/student/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">Back to Dashboard</button></div></div><button onClick={async()=>{await logout();router.push("/student/login")}} className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">Logout</button></div></nav>
    <main className="max-w-4xl mx-auto px-6 py-8">
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8"><h2 className="text-lg font-bold text-white mb-4">Account Info</h2><div className="space-y-3"><div><span className="text-sm text-gray-400">Email:</span><span className="text-white ml-3">{user?.email}</span></div><div><span className="text-sm text-gray-400">Name:</span><span className="text-white ml-3">{user?.name||"N/A"}</span></div><div><span className="text-sm text-gray-400">Role:</span><span className="text-white ml-3">{user?.role?.replace(/_/g," ")||"N/A"}</span></div></div></div>
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6"><h2 className="text-lg font-bold text-white mb-4">Change Password</h2>{msg&&<div className={`mb-4 p-3 rounded-lg text-sm ${msg.includes("success")?"bg-green-500/10 border border-green-500/30 text-green-400":"bg-red-500/10 border border-red-500/30 text-red-400"}`}>{msg}</div>}<form onSubmit={handleChangePassword} className="space-y-4"><div><label className="block text-sm text-gray-400 mb-1">Current Password</label><input type="password" value={form.current_password} onChange={e=>setForm({...form,current_password:e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/></div><div><label className="block text-sm text-gray-400 mb-1">New Password</label><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/></div><div><label className="block text-sm text-gray-400 mb-1">Confirm New Password</label><input type="password" value={form.password_confirmation} onChange={e=>setForm({...form,password_confirmation:e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/></div><button type="submit" className="px-6 py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm">Change Password</button></form></div>
    </main></div>);
}
