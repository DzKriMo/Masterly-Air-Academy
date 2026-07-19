"use client";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { useTranslation } from "@/lib/use-translation";

interface Notif { id: string; type: string; title: string; message: string; is_read: boolean; created_at: string; }

export function NotificationBell() {
  const { t } = useTranslation();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = () => {
    if (!api.isAuthenticated()) return;
    api.get<{ results: Notif[] }>("/notifications/")
      .then(d => setNotifs((d as unknown as { results: Notif[] }).results || []))
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);

  const unread = notifs.filter(n => !n.is_read).length;

  const markRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/mark_read/`);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.put("/notifications/mark_all_read/");
      setNotifs(notifs.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 text-gray-400 hover:text-white transition-colors">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-2 w-80 bg-navy-800 border border-navy-700 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-navy-700"><span className="text-sm font-semibold text-white">{t("common.notifications", "Notifications")}</span>{unread > 0 && <button onClick={markAllRead} className="text-xs text-gold-500 hover:underline">{t("common.markAllRead", "Mark all read")}</button>}</div>
          {notifs.length === 0 ? <p className="px-4 py-6 text-sm text-gray-500 text-center">{t("common.noNotifications", "No notifications")}</p> : notifs.slice(0, 10).map(n => (
            <div key={n.id} onClick={() => { if (!n.is_read) markRead(n.id); }}
              className={`px-4 py-3 border-b border-navy-700/50 hover:bg-navy-700/30 cursor-pointer ${!n.is_read ? "bg-gold-500/5" : ""}`}>
              <p className="text-sm text-white font-medium">{n.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{n.message}</p>
              <p className="text-[10px] text-gray-600 mt-1">{new Date(n.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
