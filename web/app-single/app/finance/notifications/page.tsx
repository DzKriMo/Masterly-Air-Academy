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

export default function FinanceNotificationsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const qc = useQueryClient();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Notif | null>(null);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["finance-notifications"],
    queryFn: () => api.get<any>("/notifications/").then(d => d.results || []),
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/mark_read/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.put("/notifications/mark_all_read/"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-notifications"] });
      showToast("success", "All marked as read");
    },
  });

  const openDetail = (n: Notif) => {
    setSelected(n);
    if (!n.is_read) markReadMutation.mutate(n.id);
  };

  const filtered = useMemo(() => {
    let r = notifications;
    if (filters.read === "unread") r = r.filter((n: Notif) => !n.is_read);
    if (filters.read === "read") r = r.filter((n: Notif) => n.is_read);
    if (search) { const q = search.toLowerCase(); r = r.filter((n: Notif) => n.title?.toLowerCase().includes(q) || n.message?.toLowerCase().includes(q)); }
    return r;
  }, [notifications, filters, search]);

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
      {isLoading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? <EmptyState message={t("common.noNotifications", "No notifications.")} /> : <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(n) => openDetail(n as Notif)} />}

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
