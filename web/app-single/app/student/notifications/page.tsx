"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import type { FilterOption } from "@/components/filter-bar";
import { useToast } from "@/components/toast";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  info: "i-info",
  warning: "⚠",
  success: "✓",
  error: "✗",
  announcement: "📢",
  reminder: "⏰",
};

const TYPE_BG: Record<string, string> = {
  info: "bg-blue-500/10 border-blue-500/20",
  warning: "bg-amber-500/10 border-amber-500/20",
  success: "bg-green-500/10 border-green-500/20",
  error: "bg-red-500/10 border-red-500/20",
  announcement: "bg-purple-500/10 border-purple-500/20",
  reminder: "bg-yellow-500/10 border-yellow-500/20",
};

const TYPE_ICON_COLORS: Record<string, string> = {
  info: "text-blue-400",
  warning: "text-amber-400",
  success: "text-green-400",
  error: "text-red-400",
  announcement: "text-purple-400",
  reminder: "text-yellow-400",
};

export default function StudentNotificationsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Notification | null>(null);
  const { t } = useTranslation();
  const { showToast } = useToast();

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/student/login"); } }, [isLoading, isAuthenticated, router]);

  const loadNotifications = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    api.get("/notifications/")
      .then((d: any) => { setNotifications(d.results || []); setError(null); })
      .catch(err => { console.error("Failed to load notifications:", err); setError(t('student.notifLoadError', "Failed to load notifications. Please try again.")); })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/mark_read/`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch { showToast("error", t('student.markReadError', 'Failed to mark as read')); }
  };

  const markAllRead = async () => {
    try {
      await api.put("/notifications/mark_all_read/");
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      showToast("success", t('student.allRead', 'All notifications marked as read.'));
    } catch { showToast("error", t('student.markAllReadError', 'Failed to mark all as read')); }
  };

  const handleClick = (n: Notification) => {
    setSelected(n);
    if (!n.is_read) markAsRead(n.id);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filterOptions: FilterOption[] = [
    { key: "type", label: t('common.allTypes', 'All Types'), options: [
      { value: "info", label: t('notification.info', 'Info') },
      { value: "warning", label: t('notification.warning', 'Warning') },
      { value: "success", label: t('notification.success', 'Success') },
      { value: "error", label: t('notification.error', 'Error') },
      { value: "announcement", label: t('notification.announcement', 'Announcement') },
      { value: "reminder", label: t('notification.reminder', 'Reminder') },
    ]},
    { key: "is_read", label: t('common.allStatuses', 'All Statuses'), options: [
      { value: "unread", label: t('common.unread', 'Unread') },
      { value: "read", label: t('common.read', 'Read') },
    ]},
  ];

  const filtered = notifications.filter(n => {
    if (filters.type && n.type !== filters.type) return false;
    if (filters.is_read === "unread" && n.is_read) return false;
    if (filters.is_read === "read" && !n.is_read) return false;
    if (search && !n.title?.toLowerCase().includes(search.toLowerCase()) && !n.message?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return t('common.justNow', 'Just now');
    if (diffMins < 60) return `${diffMins}m ${t('common.ago', 'ago')}`;
    if (diffHours < 24) return `${diffHours}h ${t('common.ago', 'ago')}`;
    if (diffDays < 7) return `${diffDays}d ${t('common.ago', 'ago')}`;
    return d.toLocaleDateString();
  };

  return (<div className="min-h-screen bg-navy-900">
    <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
      <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-white">{t('student.notifications', 'Notifications')}</h1>
          {unreadCount > 0 && (
            <span className="bg-gold-500 text-navy-900 text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount} {t('common.unread', 'unread')}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="px-3 py-1.5 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded-lg text-xs hover:bg-gold-500 hover:text-navy-900 transition-colors">
            {t('student.markAllRead', 'Mark all read')}
          </button>
        )}
      </div>
    </nav>
    <main className="max-w-4xl mx-auto px-6 py-8">
      {error && <ErrorCard message={error} onRetry={loadNotifications} />}
      {loading ? <LoadingSkeleton type="detail" rows={5} /> : notifications.length === 0 ? (
        <EmptyState message={t('student.noNotifications', 'No notifications yet.')} />
      ) : (
        <>
          <FilterBar
            filters={filterOptions}
            values={filters}
            onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
            onClear={() => { setFilters({}); setSearch(""); }}
            searchPlaceholder={t('student.searchNotifications', 'Search notifications...')}
            searchValue={search}
            onSearchChange={setSearch}
          />

          <div className="space-y-2">
            {filtered.map(n => (
              <div key={n.id} onClick={() => handleClick(n)}
                className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                  n.is_read
                    ? "bg-navy-800/50 border-navy-700/50 hover:bg-navy-800"
                    : "bg-navy-800 border-gold-500/30 hover:bg-navy-700"
                }`}>
                <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg ${TYPE_BG[n.type] || "bg-navy-700 border border-navy-600"}`}>
                  <span className={TYPE_ICON_COLORS[n.type] || "text-gray-400"}>{TYPE_ICONS[n.type] || "•"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${n.is_read ? "text-gray-300" : "text-white font-semibold"}`}>{n.title}</p>
                    <span className="text-xs text-gray-500 whitespace-nowrap shrink-0">{formatDate(n.created_at)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.message}</p>
                </div>
                {!n.is_read && <span className="shrink-0 w-2 h-2 bg-gold-500 rounded-full mt-2" />}
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">{t('student.noNotifFilter', 'No notifications match your filters.')}</p>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-navy-800 border border-navy-700 rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
              <div className="flex items-center gap-3">
                <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm ${TYPE_BG[selected.type] || "bg-navy-700"}`}>
                  <span className={TYPE_ICON_COLORS[selected.type] || "text-gray-400"}>{TYPE_ICONS[selected.type] || "•"}</span>
                </div>
                <h2 className="text-lg font-semibold text-white">{selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{selected.message}</p>
              <p className="text-xs text-gray-500 mt-4">{new Date(selected.created_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </main></div>);
}
