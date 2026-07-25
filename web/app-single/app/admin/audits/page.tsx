"use client";
import { useState, useMemo } from "react";
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

interface Audit {
  id: string;
  title: string;
  type: string;
  scope: string | null;
  scheduled_date: string;
  completed_date: string | null;
  status: string;
  lead_auditor: string | null;
  lead_auditor_name: string;
  findings: any[];
  report_url: string | null;
  ncr_count: number;
  created_at: string;
}

const AUDIT_TYPES = ["internal", "regulatory", "supplier", "pedagogical", "safety"];

const AUDIT_STATUSES = ["planned", "in_progress", "completed"];

const TYPE_COLORS: Record<string, string> = {
  internal: "bg-blue-500/10 text-blue-400",
  regulatory: "bg-red-500/10 text-red-400",
  supplier: "bg-purple-500/10 text-purple-400",
  pedagogical: "bg-green-500/10 text-green-400",
  safety: "bg-amber-500/10 text-amber-400",
};

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-gray-500/10 text-gray-400",
  in_progress: "bg-amber-500/10 text-amber-400",
  completed: "bg-green-500/10 text-green-400",
};

const fmtStatus = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try { return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return "—"; }
}

export default function AdminAuditsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");
  const [selected, setSelected] = useState<Audit | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", type: "internal", scope: "", scheduled_date: "", lead_auditor: "", report_url: "" });
  const [createError, setCreateError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Audit | null>(null);

  const { data: audits, isLoading, error, refetch } = useQuery<Audit[]>({
    queryKey: ["admin-audits"],
    queryFn: async () => { const d = await api.get<any>("/audits/"); return (d as any)?.results || (d as any) || []; },
    enabled: isAuthenticated,
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["admin-audit-users"],
    queryFn: async () => { const d = await api.get<any>("/users/"); return (d as any)?.results || (d as any) || []; },
    enabled: isAuthenticated,
  });

  const buildPayload = (form: typeof createForm) => ({
    title: form.title,
    type: form.type,
    scope: form.scope || null,
    scheduled_date: form.scheduled_date,
    lead_auditor: form.lead_auditor || null,
    report_url: form.report_url || null,
  });

  const createMutation = useMutation({
    mutationFn: (p: ReturnType<typeof buildPayload>) => api.post("/audits/", p),
    onSuccess: () => { showToast("success", "Audit created"); setCreateOpen(false); setCreateForm({ title: "", type: "internal", scope: "", scheduled_date: "", lead_auditor: "", report_url: "" }); setCreateError(""); queryClient.invalidateQueries({ queryKey: ["admin-audits"] }); },
    onError: (err: any) => { setCreateError(err?.data ? Object.values(err.data).flat().join(", ") : err.message); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/audits/${id}/`),
    onSuccess: () => { showToast("success", "Audit deleted"); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ["admin-audits"] }); },
    onError: (err: any) => { showToast("error", err.message); },
  });

  const transitionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => api.post(`/audits/${id}/${action}/`, {}),
    onSuccess: () => { showToast("success", "Status updated"); setSelected(null); queryClient.invalidateQueries({ queryKey: ["admin-audits"] }); },
    onError: (err: any) => { showToast("error", err.message || "Failed"); },
  });

  const filtered = useMemo(() => {
    if (!audits) return [];
    let r = audits;
    if (filterValues.type) r = r.filter((a) => a.type === filterValues.type);
    if (filterValues.status) r = r.filter((a) => a.status === filterValues.status);
    if (searchValue) { const q = searchValue.toLowerCase(); r = r.filter((a) => a.title.toLowerCase().includes(q)); }
    return r;
  }, [audits, filterValues, searchValue]);

  const columns: Column<Audit>[] = useMemo(() => [
    { key: "title", header: "Title", render: (a) => <span className="text-sm font-semibold text-white">{a.title}</span> },
    { key: "type", header: "Type", render: (a) => <span className={`text-xs px-2 py-0.5 rounded ${TYPE_COLORS[a.type] || "bg-gray-500/10 text-gray-400"}`}>{fmtStatus(a.type)}</span> },
    { key: "status", header: "Status", render: (a) => <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[a.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtStatus(a.status)}</span> },
    { key: "lead_auditor_name", header: "Lead Auditor", render: (a) => <span className="text-sm text-gray-300">{a.lead_auditor_name || "—"}</span> },
    { key: "scheduled_date", header: "Scheduled", render: (a) => <span className="text-sm text-gray-400">{formatDate(a.scheduled_date)}</span> },
    { key: "ncr_count", header: "NCRs", render: (a) => <span className="text-sm text-gray-300 font-mono">{a.ncr_count}</span> },
    {
      key: "actions", header: "", render: (a) => (
        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setDeleteTarget(a)} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded">Delete</button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader title="Audits" backHref="/admin/dashboard" backLabel={t("common.back", "Back to Dashboard")} actions={<button onClick={() => setCreateOpen(true)} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400">+ New Audit</button>} />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={(error as any)?.message || "Failed to load"} onRetry={() => refetch()} />}
        <FilterBar filters={[{ key: "type", label: "All Types", options: AUDIT_TYPES.map((t) => ({ value: t, label: fmtStatus(t) })) }, { key: "status", label: "All Statuses", options: AUDIT_STATUSES.map((s) => ({ value: s, label: fmtStatus(s) })) }]} values={filterValues} onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))} onClear={() => { setFilterValues({}); setSearchValue(""); }} searchValue={searchValue} onSearchChange={setSearchValue} searchPlaceholder="Search audits..." />
        {isLoading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? <EmptyState message={audits?.length === 0 ? "No audits yet." : "No matches."} title={audits?.length === 0 ? "No audits yet" : "No matches"} action={audits?.length === 0 ? { label: "New Audit", onClick: () => setCreateOpen(true) } : undefined} /> : <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(item) => setSelected(item as Audit)} />}

        {/* Detail */}
        <ModalForm open={!!selected} onClose={() => setSelected(null)} title={selected?.title || "Audit Details"} wide footer={<button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">Close</button>}>
          {selected && (
            <div className="space-y-6">
              <section><h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Audit Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Title" value={selected.title} />
                  <DetailField label="Type" value={fmtStatus(selected.type)} />
                  <DetailField label="Status" value={fmtStatus(selected.status)} />
                  <DetailField label="Lead Auditor" value={selected.lead_auditor_name || "—"} />
                  <DetailField label="Scheduled Date" value={formatDate(selected.scheduled_date)} />
                  <DetailField label="Completed Date" value={formatDate(selected.completed_date)} />
                  <DetailField label="Non-Conformities" value={String(selected.ncr_count)} />
                  <DetailField label="Report URL" value={selected.report_url || "—"} />
                  {selected.scope && <div className="col-span-2"><DetailField label="Scope" value={selected.scope} /></div>}
                </div>
              </section>
              {selected.findings && selected.findings.length > 0 && (
                <section><h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Findings</h3>
                  <div className="space-y-2">
                    {selected.findings.map((f: any, i: number) => (
                      <div key={i} className="p-3 bg-navy-700/50 rounded-lg text-sm text-gray-300">{typeof f === "string" ? f : JSON.stringify(f)}</div>
                    ))}
                  </div>
                </section>
              )}
              <section><h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Actions</h3>
                <div className="flex gap-3">
                  {selected.status === "planned" && (
                    <button onClick={() => { transitionMutation.mutate({ id: selected.id, action: "plan" }); }} disabled={transitionMutation.isPending} className="px-4 py-2 text-sm bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 disabled:opacity-50">Plan Audit</button>
                  )}
                  {selected.status === "planned" && (
                    <button onClick={() => { transitionMutation.mutate({ id: selected.id, action: "execute" }); }} disabled={transitionMutation.isPending} className="px-4 py-2 text-sm bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 disabled:opacity-50">Start Audit</button>
                  )}
                  {selected.status === "in_progress" && (
                    <button onClick={() => { transitionMutation.mutate({ id: selected.id, action: "complete" }); }} disabled={transitionMutation.isPending} className="px-4 py-2 text-sm bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/20 disabled:opacity-50">Complete Audit</button>
                  )}
                  {selected.status === "completed" && <p className="text-sm text-gray-500 italic">Audit completed.</p>}
                </div>
              </section>
            </div>
          )}
        </ModalForm>

        {/* Create */}
        <ModalForm open={createOpen} onClose={() => { setCreateOpen(false); setCreateForm({ title: "", type: "internal", scope: "", scheduled_date: "", lead_auditor: "", report_url: "" }); setCreateError(""); }} title="New Audit" footer={<><button onClick={() => { setCreateOpen(false); setCreateForm({ title: "", type: "internal", scope: "", scheduled_date: "", lead_auditor: "", report_url: "" }); setCreateError(""); }} disabled={createMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">Cancel</button><button onClick={() => createMutation.mutate(buildPayload(createForm))} disabled={createMutation.isPending || !createForm.title || !createForm.scheduled_date} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{createMutation.isPending ? "Creating..." : "Create"}</button></>}>
          <div className="space-y-4">
            {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{createError}</div>}
            <div><label className="block text-sm text-gray-400 mb-1">Title <span className="text-red-400">*</span></label><input type="text" value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Type <span className="text-red-400">*</span></label><select value={createForm.type} onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">{AUDIT_TYPES.map((t) => <option key={t} value={t}>{fmtStatus(t)}</option>)}</select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Scheduled Date <span className="text-red-400">*</span></label><input type="datetime-local" value={createForm.scheduled_date} onChange={(e) => setCreateForm((f) => ({ ...f, scheduled_date: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Scope</label><textarea value={createForm.scope} onChange={(e) => setCreateForm((f) => ({ ...f, scope: e.target.value }))} rows={3} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none resize-none" placeholder="Scope of the audit..." /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Lead Auditor</label><select value={createForm.lead_auditor} onChange={(e) => setCreateForm((f) => ({ ...f, lead_auditor: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"><option value="">Select auditor...</option>{users.map((u: any) => <option key={u.id} value={u.id}>{u.email}</option>)}</select></div>
            <div><label className="block text-sm text-gray-400 mb-1">Report URL</label><input type="text" value={createForm.report_url} onChange={(e) => setCreateForm((f) => ({ ...f, report_url: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" placeholder="Link to audit report..." /></div>
          </div>
        </ModalForm>

        {/* Delete */}
        {deleteTarget && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}><div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}><h3 className="text-lg font-semibold text-white">Delete Audit</h3><p className="text-sm text-gray-400">Delete "{deleteTarget.title}"?</p><div className="flex justify-end gap-3 pt-2"><button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">Cancel</button><button onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 disabled:opacity-50">{deleteMutation.isPending ? "Deleting..." : "Delete"}</button></div></div></div>}
      </main>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-gray-500 mb-0.5">{label}</p><p className="text-sm text-white">{value}</p></div>;
}