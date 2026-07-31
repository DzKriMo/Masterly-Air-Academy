"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useTranslation } from "@/lib/use-translation";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";
import { StatsCard } from "@/components/stats-card";
import { fmtCurrency, fmtDate } from "@/lib/format-utils";

// ── Types ─────────────────────────────────────────────────

interface Payment {
  id: string;
  student_name: string;
  student: string;
  invoice_number: string;
  invoice: string;
  amount: string;
  currency: string;
  method: string;
  reference: string;
  notes: string;
  paid_at: string;
}

interface Student {
  id: string;
  full_name: string;
  student_number: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  student_name: string;
  amount: string;
}

interface PaymentStats {
  total_amount: number;
  this_month: number;
  by_method: Record<string, number>;
}

// ── Constants ─────────────────────────────────────────────

const METHODS = ["cash", "bank_transfer", "credit_card", "check", "other"];

// ── Helpers ───────────────────────────────────────────────

function formatMethod(method: string): string {
  return method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Component ─────────────────────────────────────────────

export default function AdminPaymentsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // ── Filter state ──
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  // ── Pagination state ──
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Detail modal ──
  const [selected, setSelected] = useState<Payment | null>(null);

  // ── Create modal state ──
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    student: "",
    invoice: "",
    amount: "",
    currency: "DZD",
    method: "cash",
    reference: "",
    notes: "",
  });

  // ── Auth guard ──

  // ── Data queries ──
  const loadPayments = useCallback(async (p: number, append: boolean) => {
    try {
      const d = await api.get<any>(p > 1 ? `/payments/?page=${p}` : "/payments/");
      const results = d?.results || (Array.isArray(d) ? d : []);
      setPayments((prev) => (append ? [...prev, ...results] : results));
      setHasMore(!!d?.next);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to load payments");
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    loadPayments(1, false);
  }, [isAuthenticated, loadPayments]);

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setPage((p) => p + 1);
    loadPayments(page + 1, true);
  };

  const { data: students } = useQuery<Student[]>({
    queryKey: ["admin-students-dropdown"],
    queryFn: async () => {
      const d = await api.get<any>("/students/");
      return (d as any) ?.results || (d as any) || [];
    },
    enabled: isAuthenticated && createOpen,
  });

  const { data: invoices } = useQuery<Invoice[]>({
    queryKey: ["admin-invoices-dropdown"],
    queryFn: async () => {
      const d = await api.get<any>("/invoices/");
      return (d as any) ?.results || (d as any) || [];
    },
    enabled: isAuthenticated && createOpen,
  });

  const { data: stats } = useQuery<PaymentStats>({
    queryKey: ["admin-payments-stats"],
    queryFn: async () => {
      const d = await api.get<any>("/payments/stats/");
      return d as PaymentStats;
    },
    enabled: isAuthenticated,
  });

  // ── Create mutation ──
  const createMutation = useMutation({
    mutationFn: async (payload: typeof createForm) => {
      return api.post("/payments/", payload);
    },
    onSuccess: () => {
      showToast("success", "Payment recorded successfully");
      setCreateOpen(false);
      setCreateForm({
        student: "",
        invoice: "",
        amount: "",
        currency: "DZD",
        method: "cash",
        reference: "",
        notes: "",
      });
      setPage(1);
      setIsLoading(true);
      loadPayments(1, false);
      queryClient.invalidateQueries({ queryKey: ["admin-payments-stats"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to record payment");
    },
  });

  // ── Filtered data ──
  const filtered = useMemo(() => {
    if (!payments) return [];
    let r = payments;
    if (filterValues.method)
      r = r.filter((i) => i.method === filterValues.method);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter(
        (i) =>
          i.student_name?.toLowerCase().includes(q) ||
          i.invoice_number?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [payments, filterValues, searchValue]);

  // ── Columns ──
  const columns: Column<Payment>[] = useMemo(
    () => [
      { key: "student_name", header: t("common.name", "Student") },
      { key: "invoice_number", header: "Invoice #" },
      {
        key: "amount",
        header: "Amount",
        render: (i) => (
          <span className="font-mono text-white">
            {fmtCurrency(i.amount, i.currency)}
          </span>
        ),
      },
      {
        key: "method",
        header: "Method",
        render: (i) => (
          <span className="text-xs px-2 py-0.5 rounded bg-navy-700 text-gray-300">
            {formatMethod(i.method)}
          </span>
        ),
      },
      { key: "reference", header: "Reference" },
      {
        key: "paid_at",
        header: t("common.date", "Date"),
        render: (i) => (
          <span className="text-xs text-gray-500">
            {fmtDate(i.paid_at)}
          </span>
        ),
      },
    ],
    [t]
  );

  // ── Stats bar ──
  const methodEntries = stats?.by_method
    ? Object.entries(stats.by_method)
    : [];

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader title={t("admin.payments", "Payments")} backHref="/admin/dashboard" backLabel={t("common.back", "Back to Dashboard")} actions={
          <button
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400"
          >
            + {t("common.create", "Record Payment")}
          </button>
        } />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Error */}
        {error && (
          <ErrorCard
            message={error || "Failed to load payments"}
            onRetry={() => { setIsLoading(true); loadPayments(1, false); }}
          />
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard label="Total Payments" value={isLoading ? "—" : fmtCurrency(stats?.total_amount ?? 0, "DZD")} />
          <StatsCard label="This Month" value={isLoading ? "—" : fmtCurrency(stats?.this_month ?? 0, "DZD")} valueClassName="text-gold-500" />
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              By Method
            </p>
            <div className="mt-1 space-y-0.5">
              {isLoading ? (
                <p className="text-sm text-gray-400">—</p>
              ) : methodEntries.length === 0 ? (
                <p className="text-sm text-gray-400">No data</p>
              ) : (
                methodEntries.map(([method, amount]) => (
                  <div
                    key={method}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-400">
                      {formatMethod(method)}:
                    </span>
                    <span className="text-white font-mono">
                      {fmtCurrency(amount, "DZD")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <FilterBar
          filters={[
            {
              key: "method",
              label: "All Methods",
              options: METHODS.map((m) => ({
                value: m,
                label: formatMethod(m),
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
          searchPlaceholder="Search student or invoice..."
        />

        {/* Table */}
        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message="No payments found."
            title={
              payments?.length === 0
                ? "No payments yet"
                : "No matching payments"
            }
            action={
              payments?.length === 0
                ? {
                    label: "Record Payment",
                    onClick: () => setCreateOpen(true),
                  }
                : undefined
            }
          />
        ) : (
          <>
            <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(item) => setSelected(item as Payment)} />
            {hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-5 py-2 text-sm bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded-lg hover:bg-gold-500 hover:text-navy-900 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}

        {/* Detail Modal */}
        <ModalForm
          open={!!selected}
          onClose={() => setSelected(null)}
          title={`Payment: ${selected?.invoice_number || ""}`}
          wide
          footer={
            <button
              onClick={() => setSelected(null)}
              className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white"
            >
              {t("common.close", "Close")}
            </button>
          }
        >
          {selected && (
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">
                  Payment Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Student" value={selected.student_name} />
                  <DetailField
                    label="Amount"
                    value={fmtCurrency(selected.amount, selected.currency)}
                  />
                  <DetailField label="Invoice #" value={selected.invoice_number} />
                  <DetailField
                    label="Method"
                    value={
                      selected.method
                        ? selected.method
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase())
                        : "—"
                    }
                  />
                  <DetailField
                    label="Reference"
                    value={selected.reference || "—"}
                  />
                  <DetailField
                    label="Date"
                    value={fmtDate(selected.paid_at)}
                  />
                  <div className="col-span-2">
                    <DetailField
                      label="Notes"
                      value={selected.notes || "—"}
                    />
                  </div>
                </div>
              </section>
            </div>
          )}
        </ModalForm>

        {/* Create Payment Modal */}
        <ModalForm
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Record Payment"
          footer={
            <>
              <button
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                onClick={() => createMutation.mutate(createForm)}
                disabled={
                  createMutation.isPending ||
                  !createForm.student ||
                  !createForm.amount
                }
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50"
              >
                {createMutation.isPending
                  ? "Recording..."
                  : t("common.create", "Record")}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Student
              </label>
              <select
                value={createForm.student}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    student: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="">Select student...</option>
                {(students || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.student_number})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Invoice
              </label>
              <select
                value={createForm.invoice}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    invoice: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="">Select invoice (optional)...</option>
                  {(invoices || []).map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} - {inv.student_name} (
                      {fmtCurrency(inv.amount, "DZD")})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Amount (DZD)
              </label>
              <input
                type="number"
                value={createForm.amount}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, amount: e.target.value }))
                }
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Method
              </label>
              <select
                value={createForm.method}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    method: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {formatMethod(m)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Reference
              </label>
              <input
                type="text"
                value={createForm.reference}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, reference: e.target.value }))
                }
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                placeholder="Transaction reference..."
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Notes
              </label>
              <textarea
                value={createForm.notes}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none resize-none"
                placeholder="Optional notes..."
              />
            </div>
          </div>
        </ModalForm>
      </main>
    </div>
  );
}

// ── Detail Field ──────────────────────────────────────────

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}
