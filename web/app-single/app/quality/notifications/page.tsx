"use client";
import { useState, useMemo } from "react";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";

interface Notif {
  id: string; type: string; title: string; message: string;
  is_read: boolean; created_at: string; data?: any;
}

export default function QualityNotificationsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const qc = useQueryClient();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Notif | null>(null);
  const [extra, setExtra] = useState<Notif[]>([]);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const { data: notifData, isLoading } = useQuery({
    queryKey: ["quality-notifications"],
    queryFn: () => api.get<any>("/notifications/"),
    refetchInterval: 30000,
  });
  const notifications = notifData?.results || [];
  const hasMore = !!notifData?.next;
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
    mutationFn: (id: string) => api.post(`/notifications/${id}/mark_read/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quality-notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.put("/notifications/mark_all_read/"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality-notifications"] });
      showToast("success", "All marked as read");
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

  return (<div className="flex-1 min-w-0">
    <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">{t("common.notifications", "Notifications")}</h1>
        <button onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending} className="px-3 py-1.5 text-xs bg-navy-700 text-gray-300 rounded-lg hover:bg-navy-600 transition-colors">
          {t("common.markAllRead", "Mark All Read")}
        </button>
      </div>
    </nav>
    <main className="max-w-5xl mx-auto px-6 py-8">
      <FilterBar filters={[{ key: "read", label: t("common.all", "All"), options: [{ value: "unread", label: t("common.unread", "Unread") }, { value: "read", label: t("common.read", "Read") }] }]} values={filters} onChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))} onClear={() => { setFilters({}); setSearch(""); }} searchValue={search} onSearchChange={setSearch} searchPlaceholder={t("common.search", "Search...")} />
      {isLoading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? <EmptyState message={t("common.noNotifications", "No notifications.")} /> : (
        <>
          <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(n) => openDetail(n as Notif)} />
          {hasMore && (
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
  </div>);
}
