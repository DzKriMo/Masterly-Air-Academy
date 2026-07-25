"use client";
import { useState, useMemo } from "react";
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
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";

interface ModuleDocument {
  id: string; module: string; name: string | null;
  file_url: string | null; type: string | null;
}

const INIT_FORM = { module: "", name: "", file_url: "", type: "" };

export default function AdminModuleDocumentsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<ModuleDocument | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(INIT_FORM);
  const [createError, setCreateError] = useState("");
  const [editItem, setEditItem] = useState<ModuleDocument | null>(null);
  const [editForm, setEditForm] = useState(INIT_FORM);
  const [editError, setEditError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ModuleDocument | null>(null);

  const { data: records, isLoading, error, refetch } = useQuery<ModuleDocument[]>({
    queryKey: ["admin-module-docs"],
    queryFn: async () => { const d = await api.get<any>("/module-documents/"); return (d as any)?.results || (d as any) || []; },
    enabled: isAuthenticated,
  });

  const { data: modules = [] } = useQuery<any[]>({
    queryKey: ["admin-md-modules"],
    queryFn: async () => { const d = await api.get<any>("/modules/"); return (d as any)?.results || (d as any) || []; },
    enabled: isAuthenticated,
  });

  const buildPayload = (f: typeof INIT_FORM) => ({
    module: f.module, name: f.name || null, file_url: f.file_url || null, type: f.type || null,
  });

  const createMutation = useMutation({
    mutationFn: (p: ReturnType<typeof buildPayload>) => api.post("/module-documents/", p),
    onSuccess: () => { showToast("success", "Document created"); setCreateOpen(false); setCreateForm(INIT_FORM); queryClient.invalidateQueries({ queryKey: ["admin-module-docs"] }); },
    onError: (err: any) => { const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message; setCreateError(msg || "Failed"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, p }: { id: string; p: ReturnType<typeof buildPayload> }) => api.patch(`/module-documents/${id}/`, p),
    onSuccess: () => { showToast("success", "Document updated"); setEditItem(null); queryClient.invalidateQueries({ queryKey: ["admin-module-docs"] }); },
    onError: (err: any) => { const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message; setEditError(msg || "Failed"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/module-documents/${id}/`),
    onSuccess: () => { showToast("success", "Document deleted"); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ["admin-module-docs"] }); },
    onError: (err: any) => { showToast("error", err.message || "Failed"); },
  });

  const filtered = useMemo(() => {
    if (!records) return [];
    let r = records;
    if (filterValues.module) r = r.filter((a) => a.module === filterValues.module);
    if (filterValues.type) r = r.filter((a) => a.type === filterValues.type);
    if (searchValue) { const q = searchValue.toLowerCase(); r = r.filter((a) => (a.name || "").toLowerCase().includes(q)); }
    return r;
  }, [records, filterValues, searchValue]);

  const columns: Column<ModuleDocument>[] = useMemo(() => [
    { key: "name", header: "Name", render: (a) => <span className="text-sm font-semibold text-white">{a.name || "—"}</span> },
    { key: "type", header: "Type", render: (a) => <span className="text-xs px-2 py-0.5 rounded bg-navy-700 text-gray-300">{a.type || "—"}</span> },
    { key: "file_url", header: "File", render: (a) => a.file_url ? <a href={a.file_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-gold-500 hover:underline">Open</a> : <span className="text-xs text-gray-500">—</span> },
    { key: "actions", header: "", render: (a) => (
      <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => { setEditItem(a); setEditForm({ module: a.module, name: a.name || "", file_url: a.file_url || "", type: a.type || "" }); setEditError(""); }} className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded transition-colors">Edit</button>
        <button onClick={() => setDeleteTarget(a)} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors">Delete</button>
      </div>
    )},
  ], []);

  const moduleOptions = useMemo(() => modules.map((m: any) => ({ value: m.id, label: m.title })), [modules]);

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader title="Module Documents" backHref="/admin/dashboard" backLabel={t("common.back", "Back")} actions={
        <button onClick={() => setCreateOpen(true)} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors">+ New Document</button>
      } />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={(error as any)?.message || "Failed"} onRetry={() => refetch()} />}
        {isLoading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? (
          <EmptyState message={records?.length === 0 ? "No documents yet." : "No matches."} title={records?.length === 0 ? "No documents" : "No matches"} action={records?.length === 0 ? { label: "New Document", onClick: () => setCreateOpen(true) } : undefined} />
        ) : <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(i) => setSelected(i as ModuleDocument)} />}

        <ModalForm open={!!selected} onClose={() => setSelected(null)} title="Document Details" footer={<button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">Close</button>}>
          {selected && <div className="space-y-4">
            <DetailField label="Name" value={selected.name || "—"} />
            <DetailField label="Type" value={selected.type || "—"} />
            <DetailField label="File URL" value={selected.file_url || "—"} />
          </div>}
        </ModalForm>

        <ModalForm open={createOpen} onClose={() => { setCreateOpen(false); setCreateForm(INIT_FORM); }} title="New Document" footer={<>
          <button onClick={() => { setCreateOpen(false); setCreateForm(INIT_FORM); }} disabled={createMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">Cancel</button>
          <button onClick={() => createMutation.mutate(buildPayload(createForm))} disabled={createMutation.isPending || !createForm.module} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{createMutation.isPending ? "Creating..." : "Create"}</button>
        </>}>
          <div className="space-y-4">
            {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{createError}</div>}
            <div><label className="block text-sm text-gray-400 mb-1">Module <span className="text-red-400">*</span></label>
              <select value={createForm.module} onChange={(e) => setCreateForm((f) => ({ ...f, module: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                <option value="">Select module...</option>{modules.map((m: any) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select></div>
            <div><label className="block text-sm text-gray-400 mb-1">Name</label>
              <input type="text" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" placeholder="Document name..." /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Type</label>
              <input type="text" value={createForm.type} onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" placeholder="pdf, doc, etc." /></div>
            <div><label className="block text-sm text-gray-400 mb-1">File URL</label>
              <input type="url" value={createForm.file_url} onChange={(e) => setCreateForm((f) => ({ ...f, file_url: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" placeholder="https://..." /></div>
          </div>
        </ModalForm>

        <ModalForm open={!!editItem} onClose={() => setEditItem(null)} title="Edit Document" footer={<>
          <button onClick={() => setEditItem(null)} disabled={updateMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">Cancel</button>
          <button onClick={() => { if (editItem) updateMutation.mutate({ id: editItem.id, p: buildPayload(editForm) }); }} disabled={updateMutation.isPending || !editForm.module} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{updateMutation.isPending ? "Saving..." : "Save"}</button>
        </>}>
          <div className="space-y-4">
            {editError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{editError}</div>}
            <div><label className="block text-sm text-gray-400 mb-1">Module</label>
              <select value={editForm.module} onChange={(e) => setEditForm((f) => ({ ...f, module: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                <option value="">Select module...</option>{modules.map((m: any) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select></div>
            <div><label className="block text-sm text-gray-400 mb-1">Name</label><input type="text" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Type</label><input type="text" value={editForm.type} onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">File URL</label><input type="url" value={editForm.file_url} onChange={(e) => setEditForm((f) => ({ ...f, file_url: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
          </div>
        </ModalForm>

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white">Delete Document</h3>
              <p className="text-sm text-gray-400">Remove document {deleteTarget.name || "this item"}?</p>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">Cancel</button>
                <button onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 disabled:opacity-50">{deleteMutation.isPending ? "Deleting..." : "Delete"}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-gray-500 mb-0.5">{label}</p><p className="text-sm text-white">{value}</p></div>;
}
