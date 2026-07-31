"use client";
import { useEffect, useState, useCallback } from "react";
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
import { ModalForm } from "@/components/modal-form";
import { DetailField } from "@/components/detail-field";
import { ExportButton } from "@/components/export-button";
import { QRCodeSVG } from 'qrcode.react';
import { useAuthGuard } from "@/lib/use-auth-guard";
import { PageHeader } from "@/components/page-header";

interface Cert { id: string; certificate_number: string; type: string; title: string; program: string; issue_date: string; expiry_date: string | null; status: string; file_url?: string; }

export default function StudentCertificatesPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedCert, setSelectedCert] = useState<Cert | null>(null);

  useAuthGuard(isAuthenticated, isLoading, "/student/login");

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
    } catch { showToast("error", t('student.downloadFailed', 'Download failed')); }
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
    <PageHeader
      title={t('student.certificates')}
      backHref="/student/dashboard"
      maxWidth="max-w-5xl"
      actions={
        <ExportButton
          exports={[
            { label: t('common.export', 'Export All'), url: "/export/certificates/", filename: "certificates.xlsx", type: "excel" as const },
          ]}
        />
      }
    />
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
            onRowClick={(item) => setSelectedCert(item as Cert)}
            emptyMessage={t('student.noCertsFilter', 'No certificates match your filters.')}
          />

          <ModalForm
            open={!!selectedCert}
            onClose={() => setSelectedCert(null)}
            title={selectedCert?.title || t("certificate.details", "Certificate Details")}
            footer={
              <div className="flex gap-3">
                <button onClick={() => setSelectedCert(null)} className="px-5 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-sm transition-colors">
                  {t("close", "Close")}
                </button>
                {selectedCert?.status === "issued" && (
                  <button onClick={() => { downloadPDF(selectedCert.id); }} className="px-5 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 rounded-lg text-sm font-bold transition-colors">
                    {t("certificate.downloadPdf", "Download PDF")}
                  </button>
                )}
              </div>
            }
          >
            {selectedCert && (
              <div className="space-y-6">
                <section>
                  <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">{t("common.details", "Details")}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <DetailField label={t("common.number", "Number")} value={selectedCert.certificate_number} />
                    <DetailField label={t("common.title", "Title")} value={selectedCert.title || selectedCert.type} />
                    <DetailField label={t("common.type")} value={selectedCert.type} />
                    <DetailField label={t("common.program", "Program")} value={selectedCert.program || "-"} />
                    <DetailField label={t("common.issued", "Issued")} value={new Date(selectedCert.issue_date).toLocaleDateString()} />
                    <DetailField label={t("common.expires", "Expires")} value={selectedCert.expiry_date ? new Date(selectedCert.expiry_date).toLocaleDateString() : "-"} />
                    <DetailField label={t("common.status")} value={selectedCert.status} />
                  </div>
                </section>
                {selectedCert.status === "issued" && (
                  <section>
                    <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">{t("certificate.verification", "Verification")}</h3>
                    <div className="flex items-center gap-3">
                      <QRCodeSVG value={`/verify-certificate?number=${selectedCert.certificate_number}`} size={48} bgColor="transparent" fgColor="#c4943c" />
                      <a href={`/verify-certificate?number=${selectedCert.certificate_number}`} className="text-sm text-gold-500 hover:text-gold-400 underline">
                        {t("certificate.verify", "Verify")}
                      </a>
                    </div>
                  </section>
                )}
              </div>
            )}
          </ModalForm>
        </>
      )}
    </main></div>);
}
