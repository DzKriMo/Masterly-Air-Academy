"use client";

import { useEffect, useState, useRef } from "react";

interface Notif { id: string; type: string; title: string; message: string; is_read: boolean; created_at: string; }

export function NotificationBell() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

  useEffect(() => {
    if (!token()) return;
    fetch("/api/notifications/", { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => setNotifs(d.results || d.slice(0, 10) || [])).catch(() => {});
    const interval = setInterval(() => {
      fetch("/api/notifications/", { headers: { Authorization: `Bearer ${token()}` } })
        .then(r => r.json()).then(d => setNotifs(d.results || d.slice(0, 10) || [])).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notifs.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    await fetch("/api/notifications/mark_all_read/", { method: "PUT", headers: { Authorization: `Bearer ${token()}` } });
    setNotifs(notifs.map(n => ({ ...n, is_read: true })));
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 text-gray-400 hover:text-white transition-colors">
        <span className="text-lg">{"🔔"}</span>
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unread}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-navy-800 border border-navy-700 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-navy-700">
            <span className="text-sm font-semibold text-white">Notifications</span>
            {unread > 0 && <button onClick={markAllRead} className="text-xs text-gold-500 hover:underline">Mark all read</button>}
          </div>
          {notifs.length === 0 ? <p className="px-4 py-6 text-sm text-gray-500 text-center">No notifications</p> : notifs.slice(0, 10).map(n => (
            <div key={n.id} className={`px-4 py-3 border-b border-navy-700/50 hover:bg-navy-700/30 cursor-pointer ${!n.is_read ? "bg-gold-500/5" : ""}`}>
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
