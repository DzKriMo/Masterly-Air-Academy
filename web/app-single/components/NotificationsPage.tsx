"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar, type FilterOption } from "@/components/filter-bar";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorCard } from "@/components/error-card";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";
import { PageHeader } from "@/components/page-header";

export type NotificationsRole = "admin" | "finance" | "quality" | "director" | "student";

interface Notif {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data?: any;
}

type Layout = "table" | "cards";

interface RoleConfig {
  queryKey: string;
  guard?: { loginPath: string };
  markReadMethod: "POST" | "PUT";
  paginate: boolean;
  layout: Layout;
  refetchInterval?: number;
  header: "pageheader" | "custom-nav";
  headerMaxWidth?: string;
  contentMaxWidth: string;
  wrapperClass: string;
  titleKey: string;
  titleFallback: string;
  backHref?: string;
  backLabelKey?: string;
  backLabelFallback?: string;
  markAllReadSuccessText: string;
}

const ROLES: Record<NotificationsRole, RoleConfig> = {
  admin: {
    queryKey: "admin-notifications",
    guard: { loginPath: "/login" },
    markReadMethod: "POST",
    paginate: false,
    layout: "table",
    refetchInterval: 30000,
    header: "pageheader",
    contentMaxWidth: "max-w-5xl",
    wrapperClass: "min-h-screen bg-navy-900",
    titleKey: "admin.notifications",
    titleFallback: "Notifications",
    backHref: "/admin/dashboard",
    backLabelKey: "common.back",
    backLabelFallback: "Back to Dashboard",
    markAllReadSuccessText: "All marked as read",
  },
  finance: {
    queryKey: "finance-notifications",
    markReadMethod: "POST",
    paginate: true,
    layout: "table",
    refetchInterval: 30000,
    header: "pageheader",
    headerMaxWidth: "max-w-5xl",
    contentMaxWidth: "max-w-5xl",
    wrapperClass: "flex-1 min-w-0",
    titleKey: "common.notifications",
    titleFallback: "Notifications",
    markAllReadSuccessText: "All marked as read",
  },
  quality: {
    queryKey: "quality-notifications",
    markReadMethod: "POST",
    paginate: true,
    layout: "table",
    refetchInterval: 30000,
    header: "custom-nav",
    contentMaxWidth: "max-w-5xl",
    wrapperClass: "flex-1 min-w-0",
    titleKey: "common.notifications",
    titleFallback: "Notifications",
    markAllReadSuccessText: "All marked as read",
  },
  director: {
    queryKey: "director-notifications",
    markReadMethod: "POST",
    paginate: true,
    layout: "table",
    refetchInterval: 30000,
    header: "pageheader",
    headerMaxWidth: "max-w-5xl",
    contentMaxWidth: "max-w-5xl",
    wrapperClass: "flex-1 min-w-0",
    titleKey: "common.notifications",
    titleFallback: "Notifications",
    markAllReadSuccessText: "All marked as read",
  },
  student: {
    queryKey: "student-notifications",
    guard: { loginPath: "/student/login" },
    markReadMethod: "PUT",
    paginate: true,
    layout: "cards",
    header: "pageheader",
    headerMaxWidth: "max-w-4xl",
    contentMaxWidth: "max-w-4xl",
    wrapperClass: "min-h-screen bg-navy-900",
    titleKey: "student.notifications",
    titleFallback: "Notifications",
    backHref: "/student/dashboard",
    markAllReadSuccessText: "All notifications marked as read.",
  },
};

function AuthGuardRedirect({ loginPath }: { loginPath: string }) {
  const { isAuthenticated, isLoading } = useAuth();
  useAuthGuard(isAuthenticated, isLoading, loginPath);
  return null;
}

function StaffNotificationsView({ config }: { config: RoleConfig }) {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const qc = useQueryClient();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Notif | null>(null);
  const [extra, setExtra] = useState<Notif[]>([]);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const { data: notifData, isLoading } = useQuery<any>({
    queryKey: [config.queryKey],
    queryFn: () =>
      config.paginate
        ? api.get<any>("/notifications/")
        : api.get<any>("/notifications/").then((d: any) => d.results || []),
    enabled: config.guard ? isAuthenticated : undefined,
    refetchInterval: config.refetchInterval,
  });
  const notifications: Notif[] = config.paginate ? notifData?.results || [] : notifData || [];
  const hasMore = config.paginate ? !!notifData?.next : false;
  const allNotifs = useMemo(() => [...notifications, ...extra], [notifications, extra]);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const d = await api.get<any>(`/notifications/?page=${page + 1}`);
      setExtra((prev) => [...prev, ...(d?.results || [])]);
      setPage((p) => p + 1);
    } catch {}
    finally {
      setLoadingMore(false);
    }
  };

  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      config.markReadMethod === "POST"
        ? api.post(`/notifications/${id}/mark_read/`)
        : api.put(`/notifications/${id}/mark_read/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [config.queryKey] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.put("/notifications/mark_all_read/"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [config.queryKey] });
      showToast("success", config.markAllReadSuccessText);
    },
  });

  const openDetail = (n: Notif) => {
    setSelected(n);
    if (!n.is_read) markReadMutation.mutate(n.id);
  };

  const filtered = useMemo(() => {
    let r = allNotifs;
    if (filters.read === "unread") r = r.filter((n: Notif) => !n.is_read);
    if (filters.read === "read") r = r.filter((n: Notif) => n.is_read);
    if (search) { const q = search.toLowerCase(); r = r.filter((n: Notif) => n.title?.toLowerCase().includes(q) || n.message?.toLowerCase().includes(q)); }
    return r;
  }, [allNotifs, filters, search]);

  const columns: Column<Notif>[] = [
    { key: "unread", header: "", sortable: false, render: (n) => !n.is_read ? <div className="w-2 h-2 rounded-full bg-gold-500" /> : <div className="w-2 h-2" /> },
    { key: "title", header: t("common.title", "Title"), render: (n) => <span className={!n.is_read ? "text-white font-medium" : "text-gray-400"}>{n.title}</span> },
    { key: "type", header: t("common.type", "Type"), render: (n) => <span className="text-xs text-gray-500">{n.type?.replace(/_/g, " ")}</span> },
    { key: "created_at", header: t("common.date", "Date"), render: (n) => <span className="text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</span> },
  ];

  const markAllButton = (
    <button onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending} className="px-3 py-1.5 text-xs bg-navy-700 text-gray-300 rounded-lg hover:bg-navy-600 transition-colors">
      {t("common.markAllRead", "Mark All Read")}
    </button>
  );

  return (
    <div className={config.wrapperClass}>
      {config.guard && <AuthGuardRedirect loginPath={config.guard.loginPath} />}
      {config.header === "custom-nav" ? (
        <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
          <div className={`${config.contentMaxWidth} mx-auto px-6 h-16 flex items-center justify-between`}>
            <h1 className="text-lg font-bold text-white">{t(config.titleKey, config.titleFallback)}</h1>
            {markAllButton}
          </div>
        </nav>
      ) : (
        <PageHeader
          title={t(config.titleKey, config.titleFallback)}
          backHref={config.backHref}
          backLabel={config.backLabelKey ? t(config.backLabelKey, config.backLabelFallback) : undefined}
          maxWidth={config.headerMaxWidth}
          actions={markAllButton}
        />
      )}
      <main className={`${config.contentMaxWidth} mx-auto px-6 py-8`}>
        <FilterBar filters={[{ key: "read", label: t("common.all", "All"), options: [{ value: "unread", label: t("common.unread", "Unread") }, { value: "read", label: t("common.read", "Read") }] }]} values={filters} onChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))} onClear={() => { setFilters({}); setSearch(""); }} searchValue={search} onSearchChange={setSearch} searchPlaceholder={t("common.search", "Search...")} />
        {isLoading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? <EmptyState message={t("common.noNotifications", "No notifications.")} /> : (
          <>
            <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(n) => openDetail(n as Notif)} />
            {config.paginate && hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-5 py-2 text-sm bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded-lg hover:bg-gold-500 hover:text-navy-900 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? t("common.loading", "Loading...") : "Load more"}
                </button>
              </div>
            )}
          </>
        )}

        <ModalForm open={!!selected} onClose={() => setSelected(null)} title={selected?.title || ""} footer={<button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">{t("common.close", "Close")}</button>}>
          {selected && (<div className="space-y-4">
            <div className="flex justify-between text-sm"><span className="text-gray-500">{selected.type?.replace(/_/g, " ")}</span><span className="text-gray-600">{new Date(selected.created_at).toLocaleString()}</span></div>
            <div className="bg-navy-900 border border-navy-700 rounded-lg p-4"><p className="text-sm text-gray-300 whitespace-pre-wrap">{selected.message}</p></div>
            {selected.data && Object.keys(selected.data).length > 0 && <div className="bg-navy-900 border border-navy-700 rounded-lg p-4"><pre className="text-xs text-gray-500 whitespace-pre-wrap">{JSON.stringify(selected.data, null, 2)}</pre></div>}
          </div>)}
        </ModalForm>
      </main>
    </div>
  );
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

function StudentNotificationsView({ config }: { config: RoleConfig }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Notif | null>(null);
  const { t } = useTranslation();
  const { showToast } = useToast();

  useAuthGuard(isAuthenticated, isLoading, config.guard?.loginPath || "/student/login");

  const loadNotifications = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    api.get("/notifications/?page=1")
      .then((d: any) => { setNotifications(d.results || []); setHasMore(!!d.next); setPage(1); setError(null); })
      .catch(err => { console.error("Failed to load notifications:", err); setError(t('student.notifLoadError', "Failed to load notifications. Please try again.")); })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const loadMore = () => {
    api.get<any>(`/notifications/?page=${page + 1}`)
      .then((d: any) => {
        setNotifications(prev => [...prev, ...(d.results || [])]);
        setHasMore(!!d.next);
        setPage(p => p + 1);
      })
      .catch(() => {});
  };

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

  const handleClick = (n: Notif) => {
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

  return (
    <div className={config.wrapperClass}>
      <PageHeader
        title={t(config.titleKey, config.titleFallback)}
        backHref={config.backHref}
        maxWidth={config.headerMaxWidth}
        actions={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="bg-gold-500 text-navy-900 text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount} {t('common.unread', 'unread')}</span>
            )}
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="px-3 py-1.5 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded-lg text-xs hover:bg-gold-500 hover:text-navy-900 transition-colors">
                {t('student.markAllRead', 'Mark all read')}
              </button>
            )}
          </div>
        }
      />
      <main className={`${config.contentMaxWidth} mx-auto px-6 py-8`}>
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

            {hasMore && (
              <div className="mt-4 text-center">
                <button onClick={loadMore} className="px-4 py-2 text-sm text-gold-500 border border-gold-500/30 rounded-lg hover:bg-gold-500/10 transition-colors">
                  {t('common.loadMore', 'Load more')}
                </button>
              </div>
            )}
          </>
        )}

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
      </main>
    </div>
  );
}

export function NotificationsPage({ role }: { role: NotificationsRole }) {
  const config = ROLES[role];
  if (config.layout === "cards") {
    return <StudentNotificationsView config={config} />;
  }
  return <StaffNotificationsView config={config} />;
}
