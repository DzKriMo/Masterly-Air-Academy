"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import type { FilterOption } from "@/components/filter-bar";

interface Msg { id: string; sender_name: string; receiver_name: string; subject: string; body: string; is_read: boolean; created_at: string; }

export default function StudentMessagesPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [received, setReceived] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/student/login"); } }, [isLoading, isAuthenticated, router]);

  const loadMessages = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    api.get("/messages/")
      .then((d: any) => { setReceived(d.results || []); setError(null); })
      .catch(err => { console.error("Failed to load messages:", err); setError(t('student.messagesLoadError', "Failed to load messages. Please try again.")); })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  const filterOptions: FilterOption[] = [
    { key: "is_read", label: t('student.allMessages', 'All Messages'), options: [
      { value: "unread", label: t('student.unread', 'Unread') },
      { value: "read", label: t('student.read', 'Read') },
    ]},
  ];

  const filteredMessages = received.filter(m => {
    if (filters.is_read === "unread" && m.is_read) return false;
    if (filters.is_read === "read" && !m.is_read) return false;
    if (search && !m.subject.toLowerCase().includes(search.toLowerCase()) && !m.sender_name.toLowerCase().includes(search.toLowerCase()) && !m.body.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const columns: Column<Msg>[] = [
    { key: "sender_name", header: t('student.from', 'From'), render: (item) => (
      <span className={`text-sm ${!item.is_read ? "text-white font-medium" : "text-gray-400"}`}>{item.sender_name}</span>
    )},
    { key: "subject", header: t('student.subject', 'Subject'), render: (item) => (
      <span className={`text-sm ${!item.is_read ? "text-white font-medium" : "text-gray-300"}`}>{item.subject}</span>
    )},
    { key: "body", header: t('student.messageLabel', 'Message'), render: (item) => (
      <span className="text-xs text-gray-500">{item.body.length > 80 ? `${item.body.slice(0, 80)}...` : item.body}</span>
    )},
    { key: "created_at", header: t('common.date'), render: (item) => (
      <span className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</span>
    )},
    { key: "is_read", header: "", className: "w-4", render: (item) => !item.is_read ? (
      <span className="inline-block w-2 h-2 bg-gold-500 rounded-full" />
    ) : null },
  ];

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3"><Image src="/logo.png" alt="MAA" width={110} height={110} /><div><h1 className="text-lg font-bold text-white">{t('student.messages')}</h1><button onClick={() => router.push("/student/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">{t('student.backToDashboard')}</button></div></div>
          <button onClick={async () => { await logout(); router.push("/student/login"); }} className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">{t('common.signOut', 'Logout')}</button>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && <ErrorCard message={error} onRetry={loadMessages} />}
        {loading ? <LoadingSkeleton type="table" rows={5} /> : received.length === 0 ? <EmptyState message={t('student.noMessages', 'No messages yet.')} /> : (
          <>
            <FilterBar
              filters={filterOptions}
              values={filters}
              onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
              onClear={() => { setFilters({}); setSearch(""); }}
              searchPlaceholder={t('student.searchMessages', 'Search messages...')}
              searchValue={search}
              onSearchChange={setSearch}
            />
            <DataTable
              columns={columns}
              data={filteredMessages as any}
              keyField="id"
              emptyMessage={t('student.noMessagesFilter', 'No messages match your filters.')}
            />
          </>
        )}
      </main>
    </div>
  );
}
