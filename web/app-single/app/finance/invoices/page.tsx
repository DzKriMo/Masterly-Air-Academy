"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { api, withFullLimit } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fmtCurrency, fmtDate } from "@/lib/format-utils";
import { invoiceSchema } from "@/lib/validators";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import type { FilterOption } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/components/toast";
import { useTranslation } from "@/lib/use-translation";

interface Invoice { id: string; invoice_number: string; student: string; student_name: string; amount: string; currency: string; status: string; balance: string; due_at: string | null; }

export default function InvoicesPage() {
  const { isAuthenticated, isLoading } = useAuth();
  useAuthGuard(isAuthenticated, isLoading);
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ student: "", type: "tuition", description: "", amount: "", currency: "DZD", due_at: "" });
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ status: "", due_at: "" });
  const { t } = useTranslation();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [payTarget, setPayTarget] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("bank_transfer");

  const loadInvoices = useCallback(async (p: number, append: boolean) => {
    try {
      const d = await api.get<any>(p > 1 ? `/invoices/?page=${p}` : "/invoices/");
      const results = d?.results || (Array.isArray(d) ? d : []);
      setInvoices((prev) => (append ? [...prev, ...results] : results));
      setHasMore(!!d?.next);
      setPage(p);
    } catch (err: any) {
      setError(err?.message || t("finance.loadError", "Failed to load invoices"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    loadInvoices(1, false);
  }, [isAuthenticated, loadInvoices]);

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    loadInvoices(page + 1, true);
  };

  const { data: studentsData } = useQuery({
    queryKey: ["students"],
    queryFn: () => api.get<any>(withFullLimit("/students/")),
    enabled: isAuthenticated,
  });
  const students = studentsData?.results || [];

  const createInvoice = useMutation({
    mutationFn: async (data: typeof form) => {
      return await api.post("/invoices/", { ...data, amount: parseFloat(data.amount) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setShowForm(false);
      setForm({ student: "", type: "tuition", description: "", amount: "", currency: "DZD", due_at: "" });
      setPage(1);
      setLoading(true);
      loadInvoices(1, false);
      showToast("success", t('finance.invoiceCreated', 'Invoice created.'));
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const recordPayment = useMutation({
    mutationFn: async ({ inv, amount, method }: { inv: Invoice; amount: number; method: string }) => {
      await api.post("/invoices/"+inv.id+"/payments/", { amount, currency: inv.currency, method });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setPayTarget(null);
      setPayAmount("");
      setPage(1);
      setLoading(true);
      loadInvoices(1, false);
      showToast("success", t('finance.paymentRecorded', 'Payment recorded.'));
    },
    onError: () => showToast("error", t('finance.paymentFailed', 'Failed to record payment')),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const v = invoiceSchema.safeParse(form);
    if (!v.success) { showToast("error", v.error.errors[0].message); return; }
    createInvoice.mutate(form);
  };

  const handleRecordPayment = (inv: Invoice) => {
    setPayTarget(inv);
    setPayAmount(String(inv.balance));
    setPayMethod("bank_transfer");
  };

  const confirmPayment = () => {
    if (!payTarget) return;
    const amt = parseFloat(payAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      showToast("error", t('finance.invalidAmount', 'Enter a valid amount greater than zero.'));
      return;
    }
    if (amt > parseFloat(payTarget.balance)) {
      showToast("error", t('finance.amountExceedsBalance', 'Amount cannot exceed the invoice balance.'));
      return;
    }
    recordPayment.mutate({ inv: payTarget, amount: amt, method: payMethod });
  };

  const filterOptions: FilterOption[] = [
    { key: "status", label: t('finance.allStatuses', 'All Statuses'), options: [
      { value: "draft", label: t('finance.draft', 'Draft') },
      { value: "issued", label: t('finance.issued', 'Issued') },
      { value: "paid", label: t('finance.paid', 'Paid') },
      { value: "partially_paid", label: t('finance.partiallyPaid', 'Partially Paid') },
      { value: "overdue", label: t('finance.overdue', 'Overdue') },
      { value: "cancelled", label: t('finance.cancelled', 'Cancelled') },
    ]},
  ];

  const filtered = invoices.filter((i: Invoice) => {
    if (filters.status && i.status !== filters.status) return false;
    if (search && !i.invoice_number?.toLowerCase().includes(search.toLowerCase()) && !i.student_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const columns: Column<any>[] = [
    { key: "invoice_number", header: t('finance.invoice', 'Invoice'), render: (inv) => (
      <div>
        <span className="text-white font-medium text-sm">{inv.invoice_number}</span>
        <span className={`ml-2 text-xs px-2 py-0.5 rounded font-medium ${inv.status === 'paid' ? 'bg-green-500/10 text-green-400' : inv.status === 'overdue' ? 'bg-red-500/10 text-red-400' : inv.status === 'cancelled' ? 'bg-gray-500/10 text-gray-400' : 'bg-blue-500/10 text-blue-400'}`}>{inv.status}</span>
      </div>
    )},
    { key: "student_name", header: t('finance.student', 'Student'), render: (inv) => <span className="text-gray-400 text-sm">{inv.student_name}</span> },
    { key: "due_at", header: t('finance.dueDate', 'Due Date'), render: (inv) => <span className="text-xs text-gray-400">{fmtDate(inv.due_at)}</span> },
    { key: "balance", header: t('finance.balance', 'Balance'), render: (inv) => <span className="text-xs text-gray-400">{fmtCurrency(inv.balance, inv.currency)}</span> },
    { key: "amount", header: t('finance.amount', 'Amount'), render: (inv) => <span className="text-white font-bold">{fmtCurrency(inv.amount, inv.currency)}</span> },
    {
      key: "actions",
      header: "",
      sortable: false,
      render: (inv) => (
        <div className="flex items-center gap-2">
          <button onClick={async(e)=>{e.stopPropagation(); try{const r=await api.download(`/invoices/${inv.id}/pdf/`);const b=await r.blob();const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`${inv.invoice_number}.pdf`;a.click();URL.revokeObjectURL(u);}catch{}}} className="px-3 py-1.5 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded text-xs hover:bg-gold-500 hover:text-navy-900 transition-colors">{t('common.download', 'PDF')}</button>
          {inv.status !== 'paid' && inv.status !== 'cancelled' && (
            <button onClick={(e)=>{e.stopPropagation(); handleRecordPayment(inv);}} disabled={recordPayment.isPending} className="px-3 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded text-xs hover:bg-green-500 hover:text-white transition-colors">{t('finance.pay', 'Pay')}</button>
          )}
        </div>
      ),
    },
  ];

  const modalFooter = (
    <>
      <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">{t('common.cancel', 'Cancel')}</button>
      <button type="submit" form="invoice-form" disabled={createInvoice.isPending} className="px-6 py-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-semibold rounded-lg text-sm">{createInvoice.isPending ? t('common.loading', 'Creating...') : t('finance.createInvoice', 'Create Invoice')}</button>
    </>
  );

  return (
    <div className="flex-1 min-w-0">
      <PageHeader
        title={t('finance.invoices', 'Invoices')}
        actions={<button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-gold-500 text-navy-900 rounded-lg text-sm font-semibold">{showForm ? t('common.cancel', 'Cancel') : t('finance.createInvoice', '+ New Invoice')}</button>}
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && <ErrorCard message={error} onRetry={() => { setError(null); setLoading(true); loadInvoices(1, false); }}/>}

        <ModalForm open={showForm} onClose={() => setShowForm(false)} title={t('finance.createInvoice', 'Create Invoice')} wide footer={modalFooter}>
          <form id="invoice-form" onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">{t('finance.student', 'Student')}</label><select value={form.student} onChange={e => setForm({...form, student: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"><option value="">{t('common.select', 'Select...')}</option>{students.map((s:any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.student_number})</option>)}</select></div>
              <div><label className="block text-sm text-gray-400 mb-1">{t('finance.type', 'Type')}</label><select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"><option value="tuition">{t('finance.tuition', 'Tuition')}</option><option value="exam_fee">{t('finance.examFee', 'Exam Fee')}</option><option value="flight_hours">{t('finance.flightHours', 'Flight Hours')}</option><option value="other">{t('finance.other', 'Other')}</option></select></div>
              <div><label className="block text-sm text-gray-400 mb-1">{t('finance.amountDZD', 'Amount (DZD)')}</label><input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">{t('finance.description', 'Description')}</label><input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">{t('finance.dueDate', 'Due Date')}</label><input type="date" value={form.due_at} onChange={e => setForm({...form, due_at: e.target.value})} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" /></div>
            </div>
          </form>
        </ModalForm>

        {loading ? <LoadingSkeleton type="table" rows={8}/> : filtered.length === 0 && invoices.length === 0 ? <EmptyState message={t('finance.noInvoices', 'No invoices found.')} /> : <>
          <FilterBar filters={filterOptions} values={filters} onChange={(k,v)=>setFilters(p=>({...p,[k]:v}))} onClear={()=>{setFilters({});setSearch("")}} searchValue={search} onSearchChange={setSearch} searchPlaceholder={t('finance.searchInvoices', 'Search invoices...')}/>
          <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(inv) => { setSelected(inv as Invoice); setEditing(false); setEditForm({ status: inv.status || "", due_at: inv.due_at || "" }); }}/>
          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-5 py-2 text-sm bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded-lg hover:bg-gold-500 hover:text-navy-900 transition-colors disabled:opacity-50"
              >
                {loadingMore ? t('common.loading', 'Loading...') : t('common.loadMore', 'Load more')}
              </button>
            </div>
          )}
        </>}

      <ModalForm open={!!payTarget} onClose={() => { if (!recordPayment.isPending) { setPayTarget(null); setPayAmount(""); } }} title={t('finance.recordPayment', 'Record Payment')} footer={(
        <>
          <button onClick={() => setPayTarget(null)} disabled={recordPayment.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">{t('common.cancel', 'Cancel')}</button>
          <button onClick={confirmPayment} disabled={recordPayment.isPending} className="px-4 py-2 text-sm bg-green-500 text-navy-900 font-semibold rounded-lg hover:bg-green-400 disabled:opacity-50">{recordPayment.isPending ? t('common.loading', 'Saving...') : t('finance.confirmPayment', 'Confirm Payment')}</button>
        </>
      )}>
        {payTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">{payTarget.invoice_number} · {payTarget.student_name} · {t('finance.balance', 'Balance')}: <strong className="text-white">{fmtCurrency(payTarget.balance, payTarget.currency)}</strong></p>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('finance.amount', 'Amount')}</label>
              <input type="number" min="0.01" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('finance.method', 'Method')}</label>
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm">
                <option value="bank_transfer">{t('finance.bankTransfer', 'Bank Transfer')}</option>
                <option value="cash">{t('finance.cash', 'Cash')}</option>
                <option value="card">{t('finance.card', 'Card')}</option>
                <option value="check">{t('finance.check', 'Check')}</option>
              </select>
            </div>
          </div>
        )}
      </ModalForm>

      <ModalForm open={!!selected} onClose={() => { setSelected(null); setEditing(false); }} title={editing ? `${t('common.edit', 'Edit')}: ${selected?.invoice_number}` : selected?.invoice_number || ''} footer={editing ? (<><button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">{t('common.cancel', 'Cancel')}</button><button onClick={async () => { try { await api.patch(`/invoices/${selected!.id}/`, editForm); showToast("success", t('finance.updated', 'Updated')); setEditing(false); setSelected(null); setPage(1); setLoading(true); loadInvoices(1, false); } catch(e:any) { showToast("error", e.message); }}} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400">{t('common.save', 'Save')}</button></>) : (<><button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">{t('common.close', 'Close')}</button><button onClick={() => setEditing(true)} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400">{t('common.edit', 'Edit')}</button></>)}>
        {selected && (<div className="space-y-6"><div className="grid grid-cols-2 gap-4">
          <div><p className="text-xs text-gray-500 mb-0.5">{t('finance.invoiceNumber', 'Invoice #')}</p><p className="text-sm text-white">{selected.invoice_number}</p></div>
          <div><p className="text-xs text-gray-500 mb-0.5">{t('finance.student', 'Student')}</p><p className="text-sm text-white">{selected.student_name}</p></div>
          <div><p className="text-xs text-gray-500 mb-0.5">{t('finance.amount', 'Amount')}</p><p className="text-sm text-white">{fmtCurrency(selected.amount, selected.currency)}</p></div>
          <div><p className="text-xs text-gray-500 mb-0.5">{t('finance.balance', 'Balance')}</p><p className="text-sm text-white">{fmtCurrency(selected.balance, selected.currency)}</p></div>
          {editing ? (
            <div><p className="text-xs text-gray-500 mb-0.5">{t('common.status', 'Status')}</p><select value={editForm.status} onChange={e => setEditForm(p => ({...p, status: e.target.value}))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm"><option value="draft">{t('finance.draft', 'Draft')}</option><option value="issued">{t('finance.issued', 'Issued')}</option><option value="paid">{t('finance.paid', 'Paid')}</option><option value="partially_paid">{t('finance.partiallyPaid', 'Partially Paid')}</option><option value="overdue">{t('finance.overdue', 'Overdue')}</option><option value="cancelled">{t('finance.cancelled', 'Cancelled')}</option></select></div>
          ) : (<div><p className="text-xs text-gray-500 mb-0.5">{t('common.status', 'Status')}</p><p className="text-sm text-white">{selected.status}</p></div>)}
          {editing ? (
            <div><p className="text-xs text-gray-500 mb-0.5">{t('finance.dueDate', 'Due Date')}</p><input type="date" value={editForm.due_at} onChange={e => setEditForm(p => ({...p, due_at: e.target.value}))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm" /></div>
          ) : (<div><p className="text-xs text-gray-500 mb-0.5">{t('finance.dueDate', 'Due Date')}</p><p className="text-sm text-white">{fmtDate(selected.due_at)}</p></div>)}
        </div></div>)}
      </ModalForm>
      </main>
    </div>
  );
}
