"use client";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useTranslation } from "@/lib/use-translation";
import { PageHeader } from "@/components/page-header";
import { api, unwrapResults } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";

interface NCR {
  id: string;
  audit: string | null;
  audit_title: string;
  title: string;
  description: string;
  severity: string;
  ncr_number: string;
  responsible: string | null;
  due_date: string | null;
  status: string;
  root_cause: string | null;
  closing_notes: string | null;
  capa_count: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-green-500/10 text-green-400",
  medium: "bg-amber-500/10 text-amber-400",
  high: "bg-orange-500/10 text-orange-400",
  critical: "bg-red-500/10 text-red-400",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-400",
  closed: "bg-gray-500/10 text-gray-400",
};

const fmtStatus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try { return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return "—"; }
}

function truncate(str: string | null, len: number): string {
  if (!str) return "—";
  return str.length > len ? str.substring(0, len) + "…" : str;
}

export default function AdminNCRsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");
  const [selected, setSelected] = useState<NCR | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ audit: "", title: "", description: "", severity: "medium", responsible: "", due_date: "" });
  const [createError, setCreateError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<NCR | null>(null);

  const { data: ncrs, isLoading, error, refetch } = useQuery<NCR[]>({
    queryKey: ["admin-ncrs"],
    queryFn: async () => { const d = await api.get<any>("/non-conformities/"); return unwrapResults(d); },
    enabled: isAuthenticated,
  });

  const { data: audits = [] } = useQuery<any[]>({
    queryKey: ["admin-ncr-audits"],
    queryFn: async () => { const d = await api.get<any>("/audits/"); return unwrapResults(d); },
    enabled: isAuthenticated,
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["admin-ncr-users"],
    queryFn: async () => { const d = await api.get<any>("/users/"); return unwrapResults(d); },
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: (p: typeof createForm) => api.post("/non-conformities/", { ...p, audit: p.audit || null, responsible: p.responsible || null, due_date: p.due_date || null }),
    onSuccess: () => { showToast("success", "NCR created"); setCreateOpen(false); setCreateForm({ audit: "", title: "", description: "", severity: "medium", responsible: "", due_date: "" }); setCreateError(""); queryClient.invalidateQueries({ queryKey: ["admin-ncrs"] }); },
    onError: (err: any) => { setCreateError(err?.data ? Object.values(err.data).flat().join(", ") : err.message); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/non-conformities/${id}/`),
    onSuccess: () => { showToast("success", "NCR deleted"); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ["admin-ncrs"] }); },
    onError: (err: any) => { showToast("error", err.message); },
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/non-conformities/${id}/close/`, {}),
    onSuccess: () => { showToast("success", "NCR closed"); setSelected(null); queryClient.invalidateQueries({ queryKey: ["admin-ncrs"] }); },
    onError: (err: any) => { showToast("error", err.message || "Failed to close"); },
  });

  const filtered = useMemo(() => {
    if (!ncrs) return [];
    let r = ncrs;
    if (filterValues.severity) r = r.filter((n) => n.severity === filterValues.severity);
    if (filterValues.status) r = r.filter((n) => n.status === filterValues.status);
    if (filterValues.audit) r = r.filter((n) => n.audit === filterValues.audit);
    if (searchValue) { const q = searchValue.toLowerCase(); r = r.filter((n) => n.title.toLowerCase().includes(q) || n.ncr_number.toLowerCase().includes(q)); }
    return r;
  }, [ncrs, filterValues, searchValue]);

  const columns: Column<NCR>[] = useMemo(() => [
    { key: "ncr_number", header: "NCR #", render: (n) => <span className="text-sm font-semibold text-white font-mono">{n.ncr_number}</span> },
    { key: "title", header: "Title", render: (n) => <span className="text-sm text-gray-300">{truncate(n.title, 50)}</span> },
    { key: "severity", header: "Severity", render: (n) => <span className={`text-xs px-2 py-0.5 rounded ${SEVERITY_COLORS[n.severity] || "bg-gray-500/10 text-gray-400"}`}>{fmtStatus(n.severity)}</span> },
    { key: "status", header: "Status", render: (n) => <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[n.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtStatus(n.status)}</span> },
    { key: "audit_title", header: "Audit", render: (n) => <span className="text-sm text-gray-400">{truncate(n.audit_title, 30)}</span> },
    { key: "due_date", header: "Due", render: (n) => <span className="text-sm text-gray-400">{formatDate(n.due_date)}</span> },
    { key: "capa_count", header: "CAPAs", render: (n) => <span className="text-sm text-gray-300 font-mono">{n.capa_count}</span> },
    {
      key: "actions", header: "", render: (n) => (
        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setDeleteTarget(n)} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded">{t('common.delete')}</button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader title={t("admin.nonConformities", "Non-Conformities")} backHref="/admin/dashboard" backLabel={t("common.back", "Back to Dashboard")} actions={<button onClick={() => setCreateOpen(true)} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400">+ New NCR</button>} />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={error?.message || "Failed to load"} onRetry={() => refetch()} />}
        <FilterBar filters={[{ key: "severity", label: "All Severities", options: ["low", "medium", "high", "critical"].map((s) => ({ value: s, label: fmtStatus(s) })) }, { key: "status", label: "All Statuses", options: [{ value: "open", label: "Open" }, { value: "closed", label: "Closed" }] }, { key: "audit", label: "All Audits", options: audits.map((a: any) => ({ value: a.id, label: a.title })) }]} values={filterValues} onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))} onClear={() => { setFilterValues({}); setSearchValue(""); }} searchValue={searchValue} onSearchChange={setSearchValue} searchPlaceholder="Search NCRs..." />
        {isLoading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? <EmptyState message={ncrs?.length === 0 ? "No NCRs yet." : "No matches."} title={ncrs?.length === 0 ? "No NCRs yet" : "No matches"} action={ncrs?.length === 0 ? { label: "New NCR", onClick: () => setCreateOpen(true) } : undefined} /> : <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(item) => setSelected(item as NCR)} />}

        {/* Detail */}
        <ModalForm open={!!selected} onClose={() => setSelected(null)} title={`${selected?.ncr_number || ""} - ${selected?.title || ""}`} wide footer={<button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">{t('common.close')}</button>}>
          {selected && (
            <div className="space-y-6">
              <section><h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">NCR Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="NCR Number" value={selected.ncr_number} />
                  <DetailField label="Title" value={selected.title} />
                  <DetailField label="Severity" value={fmtStatus(selected.severity)} />
                  <DetailField label="Status" value={fmtStatus(selected.status)} />
                  <DetailField label="Audit" value={selected.audit_title || "—"} />
                  <DetailField label="Due Date" value={formatDate(selected.due_date)} />
                  <DetailField label="CAPAs" value={String(selected.capa_count)} />
                  <div className="col-span-2"><DetailField label="Description" value={selected.description} /></div>
                  {selected.root_cause && <div className="col-span-2"><DetailField label="Root Cause" value={selected.root_cause} /></div>}
                  {selected.closing_notes && <div className="col-span-2"><DetailField label="Closing Notes" value={selected.closing_notes} /></div>}
                </div>
              </section>
              {selected.status === "open" && (
                <section><h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Actions</h3>
                  <button onClick={() => closeMutation.mutate(selected.id)} disabled={closeMutation.isPending} className="px-4 py-2 text-sm bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/20 disabled:opacity-50">{closeMutation.isPending ? "Closing..." : "Close NCR"}</button>
                </section>
              )}
            </div>
          )}
        </ModalForm>

        {/* Create */}
        <ModalForm open={createOpen} onClose={() => { setCreateOpen(false); setCreateForm({ audit: "", title: "", description: "", severity: "medium", responsible: "", due_date: "" }); setCreateError(""); }} title="New Non-Conformity" footer={<><button onClick={() => { setCreateOpen(false); setCreateForm({ audit: "", title: "", description: "", severity: "medium", responsible: "", due_date: "" }); setCreateError(""); }} disabled={createMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button><button onClick={() => createMutation.mutate(createForm)} disabled={createMutation.isPending || !createForm.title || !createForm.description} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{createMutation.isPending ? "Creating..." : "Create"}</button></>}>
          <div className="space-y-4">
            {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{createError}</div>}
            <div><label className="block text-sm text-gray-400 mb-1">Title <span className="text-red-400">*</span></label><input type="text" value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Description <span className="text-red-400">*</span></label><textarea value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none resize-none" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Severity <span className="text-red-400">*</span></label><select value={createForm.severity} onChange={(e) => setCreateForm((f) => ({ ...f, severity: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">{["low", "medium", "high", "critical"].map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}</select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Audit</label><select value={createForm.audit} onChange={(e) => setCreateForm((f) => ({ ...f, audit: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"><option value="">No audit</option>{audits.map((a: any) => <option key={a.id} value={a.id}>{a.title}</option>)}</select></div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Responsible</label><select value={createForm.responsible} onChange={(e) => setCreateForm((f) => ({ ...f, responsible: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"><option value="">Select user...</option>{users.map((u: any) => <option key={u.id} value={u.id}>{u.email}</option>)}</select></div>
            <div><label className="block text-sm text-gray-400 mb-1">Due Date</label><input type="datetime-local" value={createForm.due_date} onChange={(e) => setCreateForm((f) => ({ ...f, due_date: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
          </div>
        </ModalForm>

        {/* Delete */}
        {deleteTarget && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}><div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}><h3 className="text-lg font-semibold text-white">Delete NCR</h3><p className="text-sm text-gray-400">Delete {deleteTarget.ncr_number}?</p><div className="flex justify-end gap-3 pt-2"><button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button><button onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 disabled:opacity-50">{deleteMutation.isPending ? "Deleting..." : "Delete"}</button></div></div></div>}
      </main>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-gray-500 mb-0.5">{label}</p><p className="text-sm text-white">{value}</p></div>;
}