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

interface CAPA {
  id: string;
  non_conformity: string | null;
  ncr_title: string;
  type: string;
  title: string;
  description: string | null;
  capa_number: string;
  responsible: string | null;
  due_date: string | null;
  status: string;
  closing_notes: string | null;
  validation_date: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  corrective: "bg-blue-500/10 text-blue-400",
  preventive: "bg-purple-500/10 text-purple-400",
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

export default function AdminCAPAsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");
  const [selected, setSelected] = useState<CAPA | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ non_conformity: "", type: "corrective", title: "", description: "", responsible: "", due_date: "" });
  const [createError, setCreateError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CAPA | null>(null);
  const [closeNotes, setCloseNotes] = useState("");

  const { data: capas, isLoading, error, refetch } = useQuery<CAPA[]>({
    queryKey: ["admin-capas"],
    queryFn: async () => { const d = await api.get<any>("/capas/"); return unwrapResults(d); },
    enabled: isAuthenticated,
  });

  const { data: ncrs = [] } = useQuery<any[]>({
    queryKey: ["admin-capa-ncrs"],
    queryFn: async () => { const d = await api.get<any>("/non-conformities/"); return unwrapResults(d); },
    enabled: isAuthenticated,
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["admin-capa-users"],
    queryFn: async () => { const d = await api.get<any>("/users/"); return unwrapResults(d); },
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: (p: typeof createForm) => api.post("/capas/", { ...p, non_conformity: p.non_conformity || null, responsible: p.responsible || null, due_date: p.due_date || null }),
    onSuccess: () => { showToast("success", "CAPA created"); setCreateOpen(false); setCreateForm({ non_conformity: "", type: "corrective", title: "", description: "", responsible: "", due_date: "" }); setCreateError(""); queryClient.invalidateQueries({ queryKey: ["admin-capas"] }); },
    onError: (err: any) => { setCreateError(err?.data ? Object.values(err.data).flat().join(", ") : err.message); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/capas/${id}/`),
    onSuccess: () => { showToast("success", "CAPA deleted"); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ["admin-capas"] }); },
    onError: (err: any) => { showToast("error", err.message); },
  });

  const closeMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => api.post(`/capas/${id}/close/`, { closing_notes: notes }),
    onSuccess: () => { showToast("success", "CAPA closed"); setSelected(null); setCloseNotes(""); queryClient.invalidateQueries({ queryKey: ["admin-capas"] }); },
    onError: (err: any) => { showToast("error", err.message || "Failed to close"); },
  });

  const filtered = useMemo(() => {
    if (!capas) return [];
    let r = capas;
    if (filterValues.type) r = r.filter((c) => c.type === filterValues.type);
    if (filterValues.status) r = r.filter((c) => c.status === filterValues.status);
    if (searchValue) { const q = searchValue.toLowerCase(); r = r.filter((c) => c.title.toLowerCase().includes(q) || c.capa_number.toLowerCase().includes(q)); }
    return r;
  }, [capas, filterValues, searchValue]);

  const columns: Column<CAPA>[] = useMemo(() => [
    { key: "capa_number", header: "CAPA #", render: (c) => <span className="text-sm font-semibold text-white font-mono">{c.capa_number}</span> },
    { key: "title", header: "Title", render: (c) => <span className="text-sm text-gray-300">{c.title}</span> },
    { key: "type", header: "Type", render: (c) => <span className={`text-xs px-2 py-0.5 rounded ${TYPE_COLORS[c.type] || "bg-gray-500/10 text-gray-400"}`}>{fmtStatus(c.type)}</span> },
    { key: "ncr_title", header: "NCR", render: (c) => <span className="text-sm text-gray-400">{c.ncr_title || "—"}</span> },
    { key: "status", header: "Status", render: (c) => <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[c.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtStatus(c.status)}</span> },
    { key: "due_date", header: "Due", render: (c) => <span className="text-sm text-gray-400">{formatDate(c.due_date)}</span> },
    {
      key: "actions", header: "", render: (c) => (
        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setDeleteTarget(c)} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded">{t('common.delete')}</button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader title={t("admin.capas", "CAPAs")} backHref="/admin/dashboard" backLabel={t("common.back", "Back to Dashboard")} actions={<button onClick={() => setCreateOpen(true)} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400">+ New CAPA</button>} />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={error?.message || "Failed to load"} onRetry={() => refetch()} />}
        <FilterBar filters={[{ key: "type", label: "All Types", options: [{ value: "corrective", label: "Corrective" }, { value: "preventive", label: "Preventive" }] }, { key: "status", label: "All Statuses", options: [{ value: "open", label: "Open" }, { value: "closed", label: "Closed" }] }]} values={filterValues} onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))} onClear={() => { setFilterValues({}); setSearchValue(""); }} searchValue={searchValue} onSearchChange={setSearchValue} searchPlaceholder="Search CAPAs..." />
        {isLoading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? <EmptyState message={capas?.length === 0 ? "No CAPAs yet." : "No matches."} title={capas?.length === 0 ? "No CAPAs yet" : "No matches"} action={capas?.length === 0 ? { label: "New CAPA", onClick: () => setCreateOpen(true) } : undefined} /> : <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(item) => setSelected(item as CAPA)} />}

        {/* Detail */}
        <ModalForm open={!!selected} onClose={() => setSelected(null)} title={`${selected?.capa_number || ""} - ${selected?.title || ""}`} wide footer={<button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">{t('common.close')}</button>}>
          {selected && (
            <div className="space-y-6">
              <section><h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">CAPA Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="CAPA Number" value={selected.capa_number} />
                  <DetailField label="Title" value={selected.title} />
                  <DetailField label="Type" value={fmtStatus(selected.type)} />
                  <DetailField label="Status" value={fmtStatus(selected.status)} />
                  <DetailField label="NCR" value={selected.ncr_title || "—"} />
                  <DetailField label="Due Date" value={formatDate(selected.due_date)} />
                  <DetailField label="Validation Date" value={formatDate(selected.validation_date)} />
                  {selected.description && <div className="col-span-2"><DetailField label="Description" value={selected.description} /></div>}
                  {selected.closing_notes && <div className="col-span-2"><DetailField label="Closing Notes" value={selected.closing_notes} /></div>}
                </div>
              </section>
              {selected.status === "open" && (
                <section><h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Close CAPA</h3>
                  <div className="space-y-3">
                    <textarea value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} rows={3} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none resize-none" placeholder="Closing notes..." />
                    <button onClick={() => closeMutation.mutate({ id: selected.id, notes: closeNotes })} disabled={closeMutation.isPending || !closeNotes} className="px-4 py-2 text-sm bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/20 disabled:opacity-50">{closeMutation.isPending ? "Closing..." : "Close CAPA"}</button>
                  </div>
                </section>
              )}
            </div>
          )}
        </ModalForm>

        {/* Create */}
        <ModalForm open={createOpen} onClose={() => { setCreateOpen(false); setCreateForm({ non_conformity: "", type: "corrective", title: "", description: "", responsible: "", due_date: "" }); setCreateError(""); }} title="New CAPA" footer={<><button onClick={() => { setCreateOpen(false); setCreateForm({ non_conformity: "", type: "corrective", title: "", description: "", responsible: "", due_date: "" }); setCreateError(""); }} disabled={createMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button><button onClick={() => createMutation.mutate(createForm)} disabled={createMutation.isPending || !createForm.title} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{createMutation.isPending ? "Creating..." : "Create"}</button></>}>
          <div className="space-y-4">
            {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{createError}</div>}
            <div><label className="block text-sm text-gray-400 mb-1">Title <span className="text-red-400">*</span></label><input type="text" value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Description</label><textarea value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none resize-none" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Type <span className="text-red-400">*</span></label><select value={createForm.type} onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"><option value="corrective">Corrective</option><option value="preventive">Preventive</option></select></div>
              <div><label className="block text-sm text-gray-400 mb-1">NCR</label><select value={createForm.non_conformity} onChange={(e) => setCreateForm((f) => ({ ...f, non_conformity: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"><option value="">No NCR</option>{ncrs.map((n: any) => <option key={n.id} value={n.id}>{n.ncr_number}</option>)}</select></div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Responsible</label><select value={createForm.responsible} onChange={(e) => setCreateForm((f) => ({ ...f, responsible: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"><option value="">Select user...</option>{users.map((u: any) => <option key={u.id} value={u.id}>{u.email}</option>)}</select></div>
            <div><label className="block text-sm text-gray-400 mb-1">Due Date</label><input type="datetime-local" value={createForm.due_date} onChange={(e) => setCreateForm((f) => ({ ...f, due_date: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
          </div>
        </ModalForm>

        {/* Delete */}
        {deleteTarget && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}><div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}><h3 className="text-lg font-semibold text-white">Delete CAPA</h3><p className="text-sm text-gray-400">Delete {deleteTarget.capa_number}?</p><div className="flex justify-end gap-3 pt-2"><button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button><button onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 disabled:opacity-50">{deleteMutation.isPending ? "Deleting..." : "Delete"}</button></div></div></div>}
      </main>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-gray-500 mb-0.5">{label}</p><p className="text-sm text-white">{value}</p></div>;
}