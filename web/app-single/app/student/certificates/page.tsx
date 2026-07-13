"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { ExportButton } from "@/components/export-button";
import { QRCodeSVG } from 'qrcode.react';

interface Cert { id: string; certificate_number: string; type: string; title: string; program: string; issue_date: string; expiry_date: string | null; status: string; }

export default function StudentCertificatesPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/student/login"); } }, [isLoading, isAuthenticated, router]);

  const loadCerts = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    api.get("/certificates/")
      .then((d: any) => { setCerts(d.results || []); setError(null); })
      .catch(err => { console.error("Failed to load certificates:", err); setError(t('student.certsLoadError', "Failed to load certificates. Please try again.")); })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => { loadCerts(); }, [loadCerts]);

  const downloadPDF = async (id: string) => {
    try {
      const r = await fetch(`/api/certificates/${id}/pdf/`, { headers: { Authorization: `Bearer ${api.getAccessToken()}` } });
      if (!r.ok) throw new Error("Failed");
      const b = await r.blob();
      const u = window.URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = u; a.download = `certificate-${id}.pdf`; a.click();
      window.URL.revokeObjectURL(u);
    } catch { alert(t('student.downloadFailed', 'Download failed')); }
  };

  const filterOptions: FilterOption[] = [
    { key: "status", label: t('instructor.allStatuses', 'All Statuses'), options: [
      { value: "issued", label: t('certificate.issued', 'Issued') },
      { value: "pending", label: t('certificate.pending', 'Pending') },
      { value: "expired", label: t('certificate.expired', 'Expired') },
    ]},
    { key: "type", label: t('common.allTypes', 'All Types'), options: [
      { value: "medical", label: t('certificate.medical', 'Medical') },
      { value: "license", label: t('certificate.license', 'License') },
      { value: "course", label: t('certificate.course', 'Course') },
    ]},
  ];

  const filteredCerts = certs.filter(c => {
    if (filters.status && c.status !== filters.status) return false;
    if (filters.type && c.type !== filters.type) return false;
    if (search && !c.title?.toLowerCase().includes(search.toLowerCase()) && !c.certificate_number?.toLowerCase().includes(search.toLowerCase()) && !c.program?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const columns: Column<Cert>[] = [
    { key: "certificate_number", header: t('common.number', 'Number'), render: (item) => (
      <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono">{item.certificate_number}</span>
    )},
    { key: "title", header: t('common.title', 'Title'), render: (item) => <span className="text-white font-bold">{item.title || item.type}</span> },
    { key: "program", header: t('common.program', 'Program') },
    { key: "issue_date", header: t('common.issued', 'Issued') },
    { key: "expiry_date", header: t('common.expires', 'Expires'), render: (item) => item.expiry_date || "-" },
    { key: "status", header: t('common.status'), render: (item) => (
      <span className={`text-xs px-2 py-0.5 rounded ${item.status === "issued" ? "bg-green-500/10 text-green-400" : item.status === "expired" ? "bg-red-500/10 text-red-400" : "bg-gray-500/10 text-gray-400"}`}>{item.status}</span>
    )},
    { key: "id", header: "", sortable: false, render: (item) => item.status === "issued" ? (
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center gap-0.5">
          <QRCodeSVG
            value={`/verify-certificate?number=${item.certificate_number}`}
            size={36}
            bgColor="transparent"
            fgColor="#c4943c"
          />
          <a href={`/verify-certificate?number=${item.certificate_number}`} className="text-[10px] text-gold-500 hover:text-gold-400 underline leading-tight">
            {t('certificate.verify', 'Verify')}
          </a>
        </div>
        <button onClick={(e) => { e.stopPropagation(); downloadPDF(item.id); }} className="px-3 py-1 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded text-xs hover:bg-gold-500 hover:text-navy-900 transition-colors whitespace-nowrap">
          {t('certificate.downloadPdf', 'Download PDF')}
        </button>
      </div>
    ) : null },
  ];

  return (<div className="flex-1 min-w-0">
    <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">{t('student.certificates')}</h1>
        <ExportButton
          exports={[
            { label: t('common.export', 'Export All'), url: "/certificates/export/", filename: "certificates.pdf", type: "pdf" as const },
          ]}
        />
      </div>
    </nav>
    <main className="max-w-5xl mx-auto px-6 py-8">
      {error && <ErrorCard message={error} onRetry={loadCerts} />}
      {loading ? <LoadingSkeleton type="table" rows={4} /> : certs.length === 0 ? (
        <EmptyState message={t('student.noCerts', 'No certificates earned yet. Complete exams and courses to earn certificates.')} />
      ) : (
        <>
          <FilterBar
            filters={filterOptions}
            values={filters}
            onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
            onClear={() => { setFilters({}); setSearch(""); }}
            searchPlaceholder={t('student.searchCerts', 'Search certificates...')}
            searchValue={search}
            onSearchChange={setSearch}
          />
          <DataTable
            columns={columns}
            data={filteredCerts as any}
            keyField="id"
            emptyMessage={t('student.noCertsFilter', 'No certificates match your filters.')}
          />
        </>
      )}
    </main></div>);
}
