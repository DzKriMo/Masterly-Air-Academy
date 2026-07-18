"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";

// ── Types ────────────────────────────────────────────────────────────

interface Invoice {
  id: string;
  invoice_number: string;
  student: string;
  student_name: string;
  student_full_name?: string;
  amount: string;
  currency: string;
  status: string;
  due_at: string;
  description?: string;
  type?: string;
  balance?: string;
  created_at?: string;
  updated_at?: string;
}

interface Student {
  id: string;
  student_number: string;
  full_name: string;
  first_name: string;
  last_name: string;
}

// ── Constants ────────────────────────────────────────────────────────

const STATUSES = ["draft", "issued", "partially_paid", "paid", "overdue", "cancelled"];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-400 border border-gray-500/20",
  issued: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  partially_paid: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  paid: "bg-green-500/10 text-green-400 border border-green-500/20",
  overdue: "bg-red-500/10 text-red-400 border border-red-500/20",
  cancelled: "bg-gray-500/10 text-gray-400 border border-gray-500/20",
};

const CURRENCIES = ["DZD", "USD", "EUR"];

const fmtStatus = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const fmtCurrency = (amount: string | number, currency = "DZD") => {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

// ── Page Component ───────────────────────────────────────────────────

export default function AdminInvoicesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // ── State ────────────────────────────────────────────────────────
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    student: "",
    type: "tuition",
    amount: "",
    currency: "DZD",
    description: "",
    due_at: "",
  });

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Invoice | null>(null);
  const [editForm, setEditForm] = useState({
    student: "",
    type: "tuition",
    amount: "",
    currency: "DZD",
    description: "",
    due_at: "",
  });

  // Payment modal
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "bank_transfer",
    reference: "",
  });

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Invoice | null>(null);

  // ── Auth guard ───────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  // ── Queries ──────────────────────────────────────────────────────
  const invoicesQuery = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: () => api.get<any>("/invoices/"),
    enabled: isAuthenticated,
    select: (data: any) => (data?.results || data || []) as Invoice[],
  });

  const studentsQuery = useQuery({
    queryKey: ["admin-students-dropdown"],
    queryFn: () => api.get<any>("/students/"),
    enabled: isAuthenticated && (createOpen || editOpen),
    select: (data: any) => (data?.results || data || []) as Student[],
    staleTime: 60000,
  });

  const invoices = invoicesQuery.data ?? [];
  const students = studentsQuery.data ?? [];
  const loading = invoicesQuery.isLoading;
  const error = invoicesQuery.error;

  // ── Filtering ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let r = invoices;
    if (filterValues.status) r = r.filter((i) => i.status === filterValues.status);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter(
        (i) =>
          i.invoice_number?.toLowerCase().includes(q) ||
          i.student_name?.toLowerCase().includes(q) ||
          i.student_full_name?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [invoices, filterValues, searchValue]);

  // ── Stats computation ─────────────────────────────────────────────
  const stats = useMemo(() => {
    let total = 0;
    let collected = 0;
    let outstanding = 0;
    let overdue = 0;
    invoices.forEach((i) => {
      const amt = parseFloat(i.amount) || 0;
      const bal = parseFloat(i.balance as string) || amt;
      total += amt;
      if (i.status === "paid") collected += amt;
      else if (i.status === "overdue") {
        outstanding += bal;
        overdue += bal;
      } else outstanding += bal;
    });
    return { total, collected, outstanding, overdue };
  }, [invoices]);

  // ── Mutations ─────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (body: typeof createForm) => api.post("/invoices/", body),
    onSuccess: () => {
      showToast("success", "Invoice created successfully");
      setCreateOpen(false);
      setCreateForm({ student: "", type: "tuition", amount: "", currency: "DZD", description: "", due_at: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to create invoice");
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: typeof editForm }) => api.put(`/invoices/${id}/`, body),
    onSuccess: () => {
      showToast("success", "Invoice updated successfully");
      setEditOpen(false);
      setEditItem(null);
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to update invoice");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/invoices/${id}/`),
    onSuccess: () => {
      showToast("success", "Invoice deleted");
      setDeleteOpen(false);
      setDeleteItem(null);
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to delete invoice");
    },
  });

  const paymentMutation = useMutation({
    mutationFn: ({ invoiceId, body }: { invoiceId: string; body: typeof paymentForm }) =>
      api.post(`/invoices/${invoiceId}/payments/`, body),
    onSuccess: () => {
      showToast("success", "Payment recorded");
      setPaymentOpen(false);
      setPaymentInvoice(null);
      setPaymentForm({ amount: "", method: "bank_transfer", reference: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to record payment");
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────
  const handleCreate = () => createMutation.mutate(createForm);

  const openEdit = (inv: Invoice) => {
    setEditItem(inv);
    setEditForm({
      student: inv.student || "",
      type: inv.type || "tuition",
      amount: inv.amount,
      currency: inv.currency || "DZD",
      description: inv.description || "",
      due_at: inv.due_at || "",
    });
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!editItem) return;
    editMutation.mutate({ id: editItem.id, body: editForm });
  };

  const openPayment = (inv: Invoice) => {
    setPaymentInvoice(inv);
    setPaymentForm({
      amount: inv.balance || inv.amount,
      method: "bank_transfer",
      reference: "",
    });
    setPaymentOpen(true);
  };

  const handlePayment = () => {
    if (!paymentInvoice) return;
    paymentMutation.mutate({ invoiceId: paymentInvoice.id, body: paymentForm });
  };

  const openDelete = (inv: Invoice) => {
    setDeleteItem(inv);
    setDeleteOpen(true);
  };

  const handleDelete = () => {
    if (!deleteItem) return;
    deleteMutation.mutate(deleteItem.id);
  };

  // ── Columns ───────────────────────────────────────────────────────
  const columns: Column<Invoice>[] = useMemo(
    () => [
      {
        key: "invoice_number",
        header: t("admin.invoiceNumber", "Invoice #"),
        render: (i) => (
          <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono font-semibold">
            {i.invoice_number}
          </span>
        ),
      },
      {
        key: "student_name",
        header: t("common.name", "Student"),
        render: (i) => (
          <span className="text-sm text-white">{i.student_name || i.student_full_name || "—"}</span>
        ),
      },
      {
        key: "amount",
        header: "Amount",
        render: (i) => (
          <span className="text-sm text-white font-medium">
            {fmtCurrency(i.amount, i.currency || "DZD")}
          </span>
        ),
      },
      {
        key: "currency",
        header: "Ccy",
        render: (i) => (
          <span className="text-xs text-gray-400 font-mono">{i.currency || "DZD"}</span>
        ),
      },
      {
        key: "status",
        header: t("common.status", "Status"),
        render: (i) => (
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              STATUS_COLORS[i.status] || "bg-gray-500/10 text-gray-400"
            }`}
          >
            {fmtStatus(i.status)}
          </span>
        ),
      },
      {
        key: "due_at",
        header: "Due Date",
        render: (i) => (
          <span className="text-xs text-gray-400">
            {i.due_at
              ? new Date(i.due_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "—"}
          </span>
        ),
      },
      {
        key: "balance",
        header: "Balance",
        render: (i) => {
          const bal = i.balance ? parseFloat(i.balance) : parseFloat(i.amount);
          return (
            <span className={`text-sm font-medium ${bal > 0 ? "text-red-400" : "text-green-400"}`}>
              {fmtCurrency(bal, i.currency || "DZD")}
            </span>
          );
        },
      },
      {
        key: "actions",
        header: t("common.actions", "Actions"),
        sortable: false,
        render: (i) => (
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEdit(i);
              }}
              className="text-xs px-2 py-1 rounded bg-navy-700 text-gray-300 hover:bg-navy-600 hover:text-white transition-colors"
              title="Edit invoice"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            {i.status !== "paid" && i.status !== "cancelled" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openPayment(i);
                }}
                className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                title="Record payment"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                openDelete(i);
              }}
              className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              title="Delete invoice"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ),
      },
    ],
    [t]
  );

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-navy-900">
      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110} />
            <div>
              <h1 className="text-lg font-bold text-white">
                {t("admin.invoices", "Invoices")}
              </h1>
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="text-xs text-gray-500 hover:text-gold-500 transition-colors"
              >
                {t("common.back", "Back to Dashboard")}
              </button>
            </div>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t("common.create", "Create Invoice")}
          </button>
        </div>
      </nav>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Error */}
        {error && !loading && (
          <ErrorCard
            message={(error as any)?.message || "Failed to load invoices"}
            onRetry={() => invoicesQuery.refetch()}
          />
        )}

        {/* ═══ Stats Bar ════════════════════════════════════════════ */}
        {!loading && invoices.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Total Invoiced"
              value={fmtCurrency(stats.total)}
              accent="border-l-blue-500"
            />
            <StatCard
              label="Collected"
              value={fmtCurrency(stats.collected)}
              accent="border-l-green-500"
            />
            <StatCard
              label="Outstanding"
              value={fmtCurrency(stats.outstanding)}
              accent="border-l-amber-500"
            />
            <StatCard
              label="Overdue"
              value={fmtCurrency(stats.overdue)}
              accent="border-l-red-500"
            />
          </div>
        )}

        {/* ═══ Filter Bar ════════════════════════════════════════════ */}
        <FilterBar
          filters={[
            {
              key: "status",
              label: "All Statuses",
              options: STATUSES.map((s) => ({
                value: s,
                label: fmtStatus(s),
              })),
            },
          ]}
          values={filterValues}
          onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))}
          onClear={() => {
            setFilterValues({});
            setSearchValue("");
          }}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search invoice # or student..."
        />

        {/* ═══ Table / Empty / Loading ════════════════════════════════ */}
        {loading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={invoices.length === 0 ? "No invoices yet. Create your first invoice to get started." : "No invoices match your filters."}
            title={invoices.length === 0 ? "No invoices yet" : "No matching invoices"}
            action={
              invoices.length === 0
                ? { label: "Create Invoice", onClick: () => setCreateOpen(true) }
                : undefined
            }
          />
        ) : (
          <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
            <DataTable
              columns={columns}
              data={filtered}
              keyField="id"
            />
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* CREATE INVOICE MODAL                                           */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <ModalForm
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateForm({
            student: "",
            type: "tuition",
            amount: "",
            currency: "DZD",
            description: "",
            due_at: "",
          });
        }}
        title="Create Invoice"
        wide
        footer={
          <>
            <button
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white transition-colors"
            >
              {t("common.cancel", "Cancel")}
            </button>
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending || !createForm.student || !createForm.amount}
              className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                  Creating...
                </span>
              ) : (
                t("common.create", "Create")
              )}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Student */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {t("common.student", "Student")} <span className="text-red-400">*</span>
            </label>
            <select
              value={createForm.student}
              onChange={(e) => setCreateForm((f) => ({ ...f, student: e.target.value }))}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
            >
              <option value="">Select a student...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || `${s.first_name} ${s.last_name}`} ({s.student_number})
                </option>
              ))}
            </select>
          </div>

          {/* Type + Currency row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t("common.type", "Type")}</label>
              <select
                value={createForm.type}
                onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="tuition">Tuition</option>
                <option value="exam">Exam</option>
                <option value="accommodation">Accommodation</option>
                <option value="material">Material</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Currency</label>
              <select
                value={createForm.currency}
                onChange={(e) => setCreateForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount + Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {t("common.amount", "Amount")} <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={createForm.amount}
                onChange={(e) => setCreateForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {t("common.dueDate", "Due Date")} <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={createForm.due_at}
                onChange={(e) => setCreateForm((f) => ({ ...f, due_at: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {t("common.description", "Description")}
            </label>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Optional description..."
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
            />
          </div>
        </div>
      </ModalForm>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* EDIT INVOICE MODAL                                             */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <ModalForm
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditItem(null);
        }}
        title={`Edit Invoice ${editItem?.invoice_number || ""}`}
        wide
        footer={
          <>
            <button
              onClick={() => {
                setEditOpen(false);
                setEditItem(null);
              }}
              className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white transition-colors"
            >
              {t("common.cancel", "Cancel")}
            </button>
            <button
              onClick={handleEdit}
              disabled={editMutation.isPending || !editForm.amount}
              className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50 transition-colors"
            >
              {editMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                t("common.save", "Save Changes")
              )}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Student */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t("common.student", "Student")}</label>
            <select
              value={editForm.student}
              onChange={(e) => setEditForm((f) => ({ ...f, student: e.target.value }))}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
            >
              <option value="">Select a student...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || `${s.first_name} ${s.last_name}`} ({s.student_number})
                </option>
              ))}
            </select>
          </div>

          {/* Type + Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t("common.type", "Type")}</label>
              <select
                value={editForm.type}
                onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="tuition">Tuition</option>
                <option value="exam">Exam</option>
                <option value="accommodation">Accommodation</option>
                <option value="material">Material</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Currency</label>
              <select
                value={editForm.currency}
                onChange={(e) => setEditForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount + Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {t("common.amount", "Amount")} <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editForm.amount}
                onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t("common.dueDate", "Due Date")}</label>
              <input
                type="date"
                value={editForm.due_at}
                onChange={(e) => setEditForm((f) => ({ ...f, due_at: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t("common.description", "Description")}</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
            />
          </div>
        </div>
      </ModalForm>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* RECORD PAYMENT MODAL                                          */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <ModalForm
        open={paymentOpen}
        onClose={() => {
          setPaymentOpen(false);
          setPaymentInvoice(null);
        }}
        title={`Record Payment — ${paymentInvoice?.invoice_number || ""}`}
        footer={
          <>
            <button
              onClick={() => {
                setPaymentOpen(false);
                setPaymentInvoice(null);
              }}
              className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white transition-colors"
            >
              {t("common.cancel", "Cancel")}
            </button>
            <button
              onClick={handlePayment}
              disabled={paymentMutation.isPending || !paymentForm.amount || parseFloat(paymentForm.amount) <= 0}
              className="px-4 py-2 text-sm bg-green-500 text-white font-semibold rounded-lg hover:bg-green-400 disabled:opacity-50 transition-colors"
            >
              {paymentMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Recording...
                </span>
              ) : (
                "Record Payment"
              )}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-navy-900/50 rounded-lg p-3 border border-navy-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Invoice:</span>
              <span className="text-gold-500 font-mono font-semibold">{paymentInvoice?.invoice_number || "—"}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-400">Amount Due:</span>
              <span className="text-white font-medium">
                {fmtCurrency(paymentInvoice?.balance || paymentInvoice?.amount || 0, paymentInvoice?.currency || "DZD")}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {t("common.amount", "Payment Amount")} <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">{t("common.method", "Payment Method")}</label>
            <select
              value={paymentForm.method}
              onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="credit_card">Credit Card</option>
              <option value="online">Online Payment</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">{t("common.reference", "Reference")}</label>
            <input
              type="text"
              value={paymentForm.reference}
              onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))}
              placeholder="Transaction ref / check number..."
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
            />
          </div>
        </div>
      </ModalForm>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* DELETE CONFIRM DIALOG                                         */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteItem(null);
        }}
        onConfirm={handleDelete}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice ${deleteItem?.invoice_number || ""}? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

// ── Stat Card Component ──────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div
      className={`bg-navy-800 border border-navy-700 rounded-xl p-4 border-l-4 ${accent}`}
    >
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}
