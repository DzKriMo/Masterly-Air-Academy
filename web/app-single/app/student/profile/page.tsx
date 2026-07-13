"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { ErrorCard } from "@/components/error-card";

export default function StudentProfilePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ current_password: "", password: "", password_confirmation: "" });
  const [msg, setMsg] = useState("");
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/student/login"); } }, [isLoading, isAuthenticated, router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.password_confirmation) { setMsg(t('profile.passwordsDoNotMatch', 'Passwords do not match.')); return; }
    if (form.password.length < 8) { setMsg(t('profile.passwordMinLength', 'Password must be at least 8 characters.')); return; }
    try {
      const res = await api.put("/profile/", form);
      const d = res as unknown as { success: boolean; message: string };
      setMsg(d.success ? t('profile.passwordChanged', 'Password changed successfully.') : (d.message || t('common.failed', 'Failed')));
      if (d.success) setForm({ current_password: "", password: "", password_confirmation: "" });
    } catch { setMsg(t('common.connectionError', 'Connection error')); }
  };

  return (<div className="min-h-screen bg-navy-900">
    <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30"><div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between"><div className="flex items-center gap-3"><Image src="/logo.png" alt="MAA" width={110} height={110}/><div><h1 className="text-lg font-bold text-white">{t('student.profile')}</h1><button onClick={()=>router.push("/student/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">{t('student.backToDashboard')}</button></div></div><button onClick={async()=>{await logout();router.push("/student/login")}} className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">{t('common.signOut', 'Logout')}</button></div></nav>
    <main className="max-w-4xl mx-auto px-6 py-8">
      {error && <ErrorCard message={error} />}
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8"><h2 className="text-lg font-bold text-white mb-4">{t('profile.accountInfo', 'Account Info')}</h2><div className="space-y-3"><div><span className="text-sm text-gray-400">{t('profile.email', 'Email:')}</span><span className="text-white ml-3">{user?.email}</span></div><div><span className="text-sm text-gray-400">{t('profile.name', 'Name:')}</span><span className="text-white ml-3">{user?.name||t('common.na', 'N/A')}</span></div><div><span className="text-sm text-gray-400">{t('profile.role', 'Role:')}</span><span className="text-white ml-3">{user?.role?.replace(/_/g," ")||t('common.na', 'N/A')}</span></div></div></div>
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6"><h2 className="text-lg font-bold text-white mb-4">{t('profile.changePassword', 'Change Password')}</h2>{msg&&<div className={`mb-4 p-3 rounded-lg text-sm ${msg.includes("success")?"bg-green-500/10 border border-green-500/30 text-green-400":"bg-red-500/10 border border-red-500/30 text-red-400"}`}>{msg}</div>}<form onSubmit={handleChangePassword} className="space-y-4"><div><label className="block text-sm text-gray-400 mb-1">{t('profile.currentPassword', 'Current Password')}</label><input type="password" value={form.current_password} onChange={e=>setForm({...form,current_password:e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/></div><div><label className="block text-sm text-gray-400 mb-1">{t('profile.newPassword', 'New Password')}</label><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/></div><div><label className="block text-sm text-gray-400 mb-1">{t('profile.confirmNewPassword', 'Confirm New Password')}</label><input type="password" value={form.password_confirmation} onChange={e=>setForm({...form,password_confirmation:e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/></div><button type="submit" className="px-6 py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm">{t('profile.changePasswordBtn', 'Change Password')}</button></form></div>
    </main></div>);
}
