"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { useToast } from "@/components/toast";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import type { FilterOption } from "@/components/filter-bar";

interface Document {
  id: string;
  name: string;
  type: string;
  category: string;
  status: string;
  version: string;
  uploaded_at: string;
  file: string;
}

export default function StudentDocumentsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/student/login"); } }, [isLoading, isAuthenticated, router]);

  const loadDocs = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    api.get("/documents/")
      .then((d: any) => { setDocs(d.results || []); setError(null); })
      .catch(err => { console.error("Failed to load documents:", err); setError(t('student.docsLoadError', "Failed to load documents. Please try again.")); })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const downloadFile = async (id: string, name: string) => {
    try {
      const r = await fetch(`/api/documents/${id}/download/`, { headers: { Authorization: `Bearer ${api.getAccessToken()}` } });
      if (!r.ok) throw new Error("Failed");
      const b = await r.blob();
      const u = window.URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = u; a.download = name; a.click();
      window.URL.revokeObjectURL(u);
    } catch { showToast("error", t('student.downloadFailed', 'Download failed')); }
  };

  const filterOptions: FilterOption[] = [
    { key: "type", label: t('common.allTypes', 'All Types'), options: [
      { value: "pdf", label: "PDF" },
      { value: "image", label: "Image" },
      { value: "doc", label: "Document" },
    ]},
    { key: "category", label: t('common.allCategories', 'All Categories'), options: [
      { value: "identification", label: t('document.identification', 'Identification') },
      { value: "medical", label: t('document.medical', 'Medical') },
      { value: "training", label: t('document.training', 'Training') },
      { value: "administrative", label: t('document.administrative', 'Administrative') },
    ]},
  ];

  const filteredDocs = docs.filter(d => {
    if (filters.type && d.type !== filters.type) return false;
    if (filters.category && d.category !== filters.category) return false;
    if (search && !d.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      approved: "bg-green-500/10 text-green-400",
      pending: "bg-yellow-500/10 text-yellow-400",
      rejected: "bg-red-500/10 text-red-400",
      expired: "bg-gray-500/10 text-gray-400",
    };
    return <span className={`text-xs px-2 py-0.5 rounded ${colors[status] || "bg-gray-500/10 text-gray-400"}`}>{status}</span>;
  };

  const columns: Column<Document>[] = [
    { key: "name", header: t('common.name', 'Name'), render: (item) => <span className="text-white font-medium">{item.name}</span> },
    { key: "type", header: t('common.type', 'Type'), render: (item) => <span className="text-xs text-gray-400 uppercase">{item.type}</span> },
    { key: "category", header: t('common.category', 'Category'), render: (item) => <span className="text-xs text-gray-400">{item.category}</span> },
    { key: "status", header: t('common.status'), render: (item) => statusBadge(item.status) },
    { key: "version", header: t('common.version', 'Version'), render: (item) => <span className="text-xs text-gray-500">v{item.version}</span> },
    { key: "uploaded_at", header: t('common.uploadedDate', 'Uploaded'), render: (item) => <span className="text-xs text-gray-500">{new Date(item.uploaded_at).toLocaleDateString()}</span> },
    { key: "id", header: "", sortable: false, render: (item) => (
      <button onClick={(e) => { e.stopPropagation(); downloadFile(item.id, item.name); }} className="px-3 py-1 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded text-xs hover:bg-gold-500 hover:text-navy-900 transition-colors whitespace-nowrap">
        {t('common.download', 'Download')}
      </button>
    )},
  ];

  return (<div className="min-h-screen bg-navy-900">
    <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">{t('student.documents', 'Documents')}</h1>
      </div>
    </nav>
    <main className="max-w-5xl mx-auto px-6 py-8">
      {error && <ErrorCard message={error} onRetry={loadDocs} />}
      {loading ? <LoadingSkeleton type="table" rows={4} /> : docs.length === 0 ? (
        <EmptyState message={t('student.noDocs', 'No documents yet.')} />
      ) : (
        <>
          <FilterBar
            filters={filterOptions}
            values={filters}
            onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
            onClear={() => { setFilters({}); setSearch(""); }}
            searchPlaceholder={t('student.searchDocs', 'Search documents...')}
            searchValue={search}
            onSearchChange={setSearch}
          />
          <DataTable
            columns={columns}
            data={filteredDocs as any}
            keyField="id"
            emptyMessage={t('student.noDocsFilter', 'No documents match your filters.')}
          />
        </>
      )}
    </main></div>);
}
