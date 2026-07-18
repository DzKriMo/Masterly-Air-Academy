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

interface Invoice {
  id: string;
  invoice_number: string;
  amount: string;
  status: string;
  due_date: string;
  description: string;
}

interface Payment {
  id: string;
  amount: string;
  method: string;
  payment_date: string;
  reference: string;
}

export default function StudentPaymentsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invFilters, setInvFilters] = useState<Record<string, string>>({});
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [invSearch, setInvSearch] = useState("");

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/student/login"); } }, [isLoading, isAuthenticated, router]);

  const loadData = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    Promise.all([
      api.get("/invoices/").catch(() => ({ results: [] })),
      api.get("/payments/").catch(() => ({ results: [] })),
    ]).then(([invData, payData]: any) => {
      setInvoices(invData.results || []);
      setPayments(payData.results || []);
      setError(null);
    }).catch(err => {
      console.error("Failed to load payment data:", err);
      setError(t('student.paymentsLoadError', "Failed to load payment data. Please try again."));
    }).finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalInvoiced = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount || "0"), 0);
  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
  const outstanding = totalInvoiced - totalPaid;

  const downloadInvoicePdf = async (id: string) => {
    try {
      const r = await fetch(`/api/invoices/${id}/pdf/`, { headers: { Authorization: `Bearer ${api.getAccessToken()}` } });
      if (!r.ok) throw new Error("Failed");
      const b = await r.blob();
      const u = window.URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = u; a.download = `invoice-${id}.pdf`; a.click();
      window.URL.revokeObjectURL(u);
    } catch { showToast("error", t('student.downloadFailed', 'Download failed')); }
  };

  const invFilterOptions: FilterOption[] = [
    { key: "status", label: t('common.allStatuses', 'All Statuses'), options: [
      { value: "paid", label: t('invoice.paid', 'Paid') },
      { value: "unpaid", label: t('invoice.unpaid', 'Unpaid') },
      { value: "overdue", label: t('invoice.overdue', 'Overdue') },
      { value: "cancelled", label: t('invoice.cancelled', 'Cancelled') },
    ]},
  ];

  const filteredInvoices = invoices.filter(inv => {
    if (invFilters.status && inv.status !== invFilters.status) return false;
    if (invSearch && !inv.invoice_number?.toLowerCase().includes(invSearch.toLowerCase()) && !inv.description?.toLowerCase().includes(invSearch.toLowerCase())) return false;
    return true;
  });

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      paid: "bg-green-500/10 text-green-400",
      unpaid: "bg-yellow-500/10 text-yellow-400",
      overdue: "bg-red-500/10 text-red-400",
      cancelled: "bg-gray-500/10 text-gray-400",
    };
    return <span className={`text-xs px-2 py-0.5 rounded ${colors[status] || "bg-gray-500/10 text-gray-400"}`}>{status}</span>;
  };

  const invoiceColumns: Column<Invoice>[] = [
    { key: "invoice_number", header: t('invoice.number', 'Invoice#'), render: (item) => (
      <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono">{item.invoice_number}</span>
    )},
    { key: "description", header: t('common.description', 'Description'), render: (item) => <span className="text-white text-sm">{item.description || "-"}</span> },
    { key: "amount", header: t('common.amount', 'Amount'), render: (item) => <span className="text-white font-bold">${parseFloat(item.amount).toFixed(2)}</span> },
    { key: "status", header: t('common.status'), render: (item) => statusBadge(item.status) },
    { key: "due_date", header: t('common.dueDate', 'Due Date'), render: (item) => <span className="text-xs text-gray-500">{new Date(item.due_date).toLocaleDateString()}</span> },
    { key: "id", header: "", sortable: false, render: (item) => (
      <button onClick={(e) => { e.stopPropagation(); downloadInvoicePdf(item.id); }} className="px-3 py-1 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded text-xs hover:bg-gold-500 hover:text-navy-900 transition-colors whitespace-nowrap">
        {t('invoice.downloadPdf', 'Download PDF')}
      </button>
    )},
  ];

  const paymentColumns: Column<Payment>[] = [
    { key: "amount", header: t('common.amount', 'Amount'), render: (item) => <span className="text-white font-bold">${parseFloat(item.amount).toFixed(2)}</span> },
    { key: "method", header: t('common.method', 'Method'), render: (item) => <span className="text-xs text-gray-400 capitalize">{item.method}</span> },
    { key: "payment_date", header: t('common.date'), render: (item) => <span className="text-xs text-gray-500">{new Date(item.payment_date).toLocaleDateString()}</span> },
    { key: "reference", header: t('common.reference', 'Reference'), render: (item) => <span className="text-xs text-gray-500 font-mono">{item.reference || "-"}</span> },
  ];

  return (<div className="min-h-screen bg-navy-900">
    <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">{t('student.payments', 'Payments')}</h1>
      </div>
    </nav>
    <main className="max-w-5xl mx-auto px-6 py-8">
      {error && <ErrorCard message={error} onRetry={loadData} />}
      {loading ? <LoadingSkeleton type="card" rows={4} /> : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-navy-800 rounded-xl border border-navy-700 p-6">
              <p className="text-sm text-gray-400 mb-1">{t('student.totalInvoiced', 'Total Invoiced')}</p>
              <p className="text-3xl font-bold text-white">${totalInvoiced.toFixed(2)}</p>
            </div>
            <div className="bg-navy-800 rounded-xl border border-navy-700 p-6">
              <p className="text-sm text-gray-400 mb-1">{t('student.totalPaid', 'Total Paid')}</p>
              <p className="text-3xl font-bold text-green-400">${totalPaid.toFixed(2)}</p>
            </div>
            <div className="bg-navy-800 rounded-xl border border-navy-700 p-6">
              <p className="text-sm text-gray-400 mb-1">{t('student.outstandingBalance', 'Outstanding Balance')}</p>
              <p className={`text-3xl font-bold ${outstanding > 0 ? 'text-red-400' : 'text-green-400'}`}>${outstanding.toFixed(2)}</p>
            </div>
          </div>

          {/* Invoices Section */}
          <h3 className="text-lg font-bold text-white mb-4">{t('student.invoices', 'Invoices')}</h3>
          {invoices.length === 0 ? (
            <EmptyState message={t('student.noInvoices', 'No invoices found.')} />
          ) : (
            <>
              <FilterBar
                filters={invFilterOptions}
                values={invFilters}
                onChange={(key, value) => setInvFilters(prev => ({ ...prev, [key]: value }))}
                onClear={() => { setInvFilters({}); setInvSearch(""); }}
                searchPlaceholder={t('student.searchInvoices', 'Search invoices...')}
                searchValue={invSearch}
                onSearchChange={setInvSearch}
              />
              <DataTable
                columns={invoiceColumns}
                data={filteredInvoices as any}
                keyField="id"
                emptyMessage={t('student.noInvoicesFilter', 'No invoices match your filters.')}
              />
            </>
          )}

          {/* Payments Section */}
          <h3 className="text-lg font-bold text-white mb-4 mt-10">{t('student.payments')}</h3>
          {payments.length === 0 ? (
            <EmptyState message={t('student.noPayments', 'No payments recorded yet.')} />
          ) : (
            <DataTable
              columns={paymentColumns}
              data={payments as any}
              keyField="id"
              emptyMessage={t('student.noPayments', 'No payments recorded yet.')}
            />
          )}
        </>
      )}
    </main></div>);
}
