"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { ErrorCard } from "@/components/error-card";
import { useToast } from "@/components/toast";

export default function StudentProfilePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [form, setForm] = useState({ current_password: "", password: "", password_confirmation: "" });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Contact form state
  const [contactForm, setContactForm] = useState({ address: "", phone: "", nationality: "" });
  const [savingContact, setSavingContact] = useState(false);
  const [contactMsg, setContactMsg] = useState("");

  // Photo upload state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/student/login"); } }, [isLoading, isAuthenticated, router]);

  // Load existing profile data
  useEffect(() => {
    if (!isAuthenticated) return;
    api.get("/profile/")
      .then((d: any) => {
        if (d.address !== undefined) setContactForm({ address: d.address || "", phone: d.phone || "", nationality: d.nationality || "" });
        if (d.photo) setPhotoPreview(d.photo);
      })
      .catch(() => {});
  }, [isAuthenticated]);

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

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingContact(true);
    setContactMsg("");
    try {
      await api.put("/profile/", contactForm);
      setContactMsg(t('profile.saved', 'Contact info saved successfully.'));
      showToast("success", t('profile.saved', 'Contact info saved successfully.'));
    } catch {
      setContactMsg(t('common.connectionError', 'Connection error'));
      showToast("error", t('common.connectionError', 'Connection error'));
    } finally {
      setSavingContact(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadPhoto = async () => {
    if (!photoFile) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('photo', photoFile);
      const res = await fetch(`/api/profile/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${api.getAccessToken()}` },
        body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.photo) setPhotoPreview(data.photo);
        setPhotoFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        showToast("success", t('profile.photoUploaded', 'Photo uploaded successfully.'));
      } else {
        showToast("error", t('profile.photoUploadFailed', 'Failed to upload photo.'));
      }
    } catch {
      showToast("error", t('common.connectionError', 'Connection error'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (<div className="min-h-screen bg-navy-900">
    <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30"><div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between"><div className="flex items-center gap-3"><Image src="/logo.png" alt="MAA" width={110} height={110}/><div><h1 className="text-lg font-bold text-white">{t('student.profile')}</h1><button onClick={()=>router.push("/student/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">{t('student.backToDashboard')}</button></div></div><button onClick={async()=>{await logout();router.push("/student/login")}} className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">{t('common.signOut', 'Logout')}</button></div></nav>
    <main className="max-w-4xl mx-auto px-6 py-8">
      {error && <ErrorCard message={error} />}
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8"><h2 className="text-lg font-bold text-white mb-4">{t('profile.accountInfo', 'Account Info')}</h2><div className="space-y-3"><div><span className="text-sm text-gray-400">{t('profile.email', 'Email:')}</span><span className="text-white ml-3">{user?.email}</span></div><div><span className="text-sm text-gray-400">{t('profile.name', 'Name:')}</span><span className="text-white ml-3">{user?.name||t('common.na', 'N/A')}</span></div><div><span className="text-sm text-gray-400">{t('profile.role', 'Role:')}</span><span className="text-white ml-3">{user?.role?.replace(/_/g," ")||t('common.na', 'N/A')}</span></div></div></div>

      {/* Contact Info */}
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-bold text-white mb-4">{t('profile.contactInfo', 'Contact Info')}</h2>
        {contactMsg && <div className={`mb-4 p-3 rounded-lg text-sm ${contactMsg.includes("success")?"bg-green-500/10 border border-green-500/30 text-green-400":"bg-red-500/10 border border-red-500/30 text-red-400"}`}>{contactMsg}</div>}
        <form onSubmit={handleSaveContact} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('profile.address', 'Address')}</label>
            <input type="text" value={contactForm.address} onChange={e=>setContactForm({...contactForm,address:e.target.value})}
              className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('profile.phone', 'Phone')}</label>
            <input type="tel" value={contactForm.phone} onChange={e=>setContactForm({...contactForm,phone:e.target.value})}
              className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('profile.nationality', 'Nationality')}</label>
            <input type="text" value={contactForm.nationality} onChange={e=>setContactForm({...contactForm,nationality:e.target.value})}
              className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
          </div>
          <button type="submit" disabled={savingContact}
            className="px-6 py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm disabled:opacity-50">
            {savingContact ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
          </button>
        </form>
      </div>

      {/* Photo Upload */}
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-bold text-white mb-4">{t('profile.photo', 'Profile Photo')}</h2>
        <div className="flex items-center gap-6">
          <div className="shrink-0 w-24 h-24 rounded-full bg-navy-900 border-2 border-navy-600 overflow-hidden flex items-center justify-center">
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-10 h-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            )}
          </div>
          <div className="space-y-3">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect}
              className="text-sm text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gold-500 file:text-navy-900 hover:file:bg-gold-600" />
            {photoFile && (
              <div>
                <button onClick={handleUploadPhoto} disabled={uploadingPhoto}
                  className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm transition-colors disabled:opacity-50">
                  {uploadingPhoto ? t('common.uploading', 'Uploading...') : t('common.upload', 'Upload')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6"><h2 className="text-lg font-bold text-white mb-4">{t('profile.changePassword', 'Change Password')}</h2>{msg&&<div className={`mb-4 p-3 rounded-lg text-sm ${msg.includes("success")?"bg-green-500/10 border border-green-500/30 text-green-400":"bg-red-500/10 border border-red-500/30 text-red-400"}`}>{msg}</div>}<form onSubmit={handleChangePassword} className="space-y-4"><div><label className="block text-sm text-gray-400 mb-1">{t('profile.currentPassword', 'Current Password')}</label><input type="password" value={form.current_password} onChange={e=>setForm({...form,current_password:e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/></div><div><label className="block text-sm text-gray-400 mb-1">{t('profile.newPassword', 'New Password')}</label><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/></div><div><label className="block text-sm text-gray-400 mb-1">{t('profile.confirmNewPassword', 'Confirm New Password')}</label><input type="password" value={form.password_confirmation} onChange={e=>setForm({...form,password_confirmation:e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/></div><button type="submit" className="px-6 py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm">{t('profile.changePasswordBtn', 'Change Password')}</button></form></div>
    </main></div>);
}
