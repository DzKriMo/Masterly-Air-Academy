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

interface ModuleLesson {
  id: string; module: string; module_title: string; lesson_no: number;
  title: string; content: string | null; video_url: string | null;
}

const INIT_FORM = { module: "", lesson_no: 0, title: "", content: "", video_url: "" };

export default function AdminModuleLessonsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");
  const [selected, setSelected] = useState<ModuleLesson | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(INIT_FORM);
  const [createError, setCreateError] = useState("");
  const [editItem, setEditItem] = useState<ModuleLesson | null>(null);
  const [editForm, setEditForm] = useState(INIT_FORM);
  const [editError, setEditError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ModuleLesson | null>(null);

  const { data: records, isLoading, error, refetch } = useQuery<ModuleLesson[]>({
    queryKey: ["admin-module-lessons"],
    queryFn: async () => { const d = await api.get<any>("/module-lessons/"); return (d as any)?.results || (d as any) || []; },
    enabled: isAuthenticated,
  });

  const { data: modules = [] } = useQuery<any[]>({
    queryKey: ["admin-ml-modules"],
    queryFn: async () => { const d = await api.get<any>("/modules/"); return (d as any)?.results || (d as any) || []; },
    enabled: isAuthenticated,
  });

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ["admin-ml-students"],
    queryFn: async () => { const d = await api.get<any>("/students/"); return (d as any)?.results || (d as any) || []; },
    enabled: isAuthenticated,
  });

  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["admin-ml-courses"],
    queryFn: async () => { const d = await api.get<any>("/courses/"); return (d as any)?.results || (d as any) || []; },
    enabled: isAuthenticated,
  });

  const buildPayload = (f: typeof INIT_FORM) => ({
    module: f.module, lesson_no: Number(f.lesson_no), title: f.title || null,
    content: f.content || null, video_url: f.video_url || null,
  });

  const createMutation = useMutation({
    mutationFn: (p: ReturnType<typeof buildPayload>) => api.post("/module-lessons/", p),
    onSuccess: () => { showToast("success", "Lesson created"); setCreateOpen(false); setCreateForm(INIT_FORM); queryClient.invalidateQueries({ queryKey: ["admin-module-lessons"] }); },
    onError: (err: any) => { const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message; setCreateError(msg || "Failed"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, p }: { id: string; p: ReturnType<typeof buildPayload> }) => api.patch(`/module-lessons/${id}/`, p),
    onSuccess: () => { showToast("success", "Lesson updated"); setEditItem(null); queryClient.invalidateQueries({ queryKey: ["admin-module-lessons"] }); },
    onError: (err: any) => { const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message; setEditError(msg || "Failed"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/module-lessons/${id}/`),
    onSuccess: () => { showToast("success", "Lesson deleted"); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ["admin-module-lessons"] }); },
    onError: (err: any) => { showToast("error", err.message || "Failed to delete"); },
  });

  const filtered = useMemo(() => {
    if (!records) return [];
    let r = records;
    if (filterValues.module) r = r.filter((a) => a.module === filterValues.module);
    if (searchValue) { const q = searchValue.toLowerCase(); r = r.filter((a) => (a.title || "").toLowerCase().includes(q) || (a.module_title || "").toLowerCase().includes(q)); }
    return r;
  }, [records, filterValues, searchValue]);

  const columns: Column<ModuleLesson>[] = useMemo(() => [
    { key: "lesson_no", header: "No.", render: (a) => <span className="text-sm text-gray-300">{a.lesson_no}</span> },
    { key: "title", header: "Title", render: (a) => <span className="text-sm font-semibold text-white">{a.title || "—"}</span> },
    { key: "module_title", header: "Module", render: (a) => <span className="text-sm text-gray-400">{a.module_title}</span> },
    { key: "actions", header: "", render: (a) => (
      <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => { setEditItem(a); setEditForm({ module: a.module, lesson_no: a.lesson_no, title: a.title || "", content: a.content || "", video_url: a.video_url || "" }); setEditError(""); }} className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded transition-colors">Edit</button>
        <button onClick={() => setDeleteTarget(a)} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors">Delete</button>
      </div>
    )},
  ], []);

  const moduleOptions = useMemo(() => modules.map((m: any) => ({ value: m.id, label: m.title })), [modules]);

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader title="Module Lessons" backHref="/admin/dashboard" backLabel={t("common.back", "Back to Dashboard")} actions={
        <button onClick={() => setCreateOpen(true)} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors">+ New Lesson</button>
      } />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={(error as any)?.message || "Failed to load"} onRetry={() => refetch()} />}
        {isLoading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? (
          <EmptyState message={records?.length === 0 ? "No lessons yet." : "No matches."} title={records?.length === 0 ? "No lessons" : "No matches"} action={records?.length === 0 ? { label: "New Lesson", onClick: () => setCreateOpen(true) } : undefined} />
        ) : <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(i) => setSelected(i as ModuleLesson)} />}

        <ModalForm open={!!selected} onClose={() => setSelected(null)} title="Lesson Details" footer={<button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">Close</button>}>
          {selected && <div className="space-y-4">
            <DetailField label="Lesson No." value={String(selected.lesson_no)} />
            <DetailField label="Title" value={selected.title || "—"} />
            <DetailField label="Module" value={selected.module_title} />
            <DetailField label="Content" value={selected.content || "—"} />
            <DetailField label="Video URL" value={selected.video_url || "—"} />
          </div>}
        </ModalForm>

        <ModalForm open={createOpen} onClose={() => { setCreateOpen(false); setCreateForm(INIT_FORM); }} title="New Lesson" footer={<>
          <button onClick={() => { setCreateOpen(false); setCreateForm(INIT_FORM); }} disabled={createMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">Cancel</button>
          <button onClick={() => createMutation.mutate(buildPayload(createForm))} disabled={createMutation.isPending || !createForm.module} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{createMutation.isPending ? "Creating..." : "Create"}</button>
        </>}>
          <div className="space-y-4">
            {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{createError}</div>}
            <div><label className="block text-sm text-gray-400 mb-1">Module <span className="text-red-400">*</span></label>
              <select value={createForm.module} onChange={(e) => setCreateForm((f) => ({ ...f, module: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                <option value="">Select module...</option>{modules.map((m: any) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select></div>
            <div><label className="block text-sm text-gray-400 mb-1">Lesson No.</label>
              <input type="number" value={createForm.lesson_no || ""} onChange={(e) => setCreateForm((f) => ({ ...f, lesson_no: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Title</label>
              <input type="text" value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" placeholder="Lesson title..." /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Content</label>
              <textarea rows={3} value={createForm.content} onChange={(e) => setCreateForm((f) => ({ ...f, content: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" placeholder="Lesson content..." /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Video URL</label>
              <input type="url" value={createForm.video_url} onChange={(e) => setCreateForm((f) => ({ ...f, video_url: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" placeholder="https://..." /></div>
          </div>
        </ModalForm>

        <ModalForm open={!!editItem} onClose={() => setEditItem(null)} title="Edit Lesson" footer={<>
          <button onClick={() => setEditItem(null)} disabled={updateMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">Cancel</button>
          <button onClick={() => { if (editItem) updateMutation.mutate({ id: editItem.id, p: buildPayload(editForm) }); }} disabled={updateMutation.isPending || !editForm.module} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{updateMutation.isPending ? "Saving..." : "Save"}</button>
        </>}>
          <div className="space-y-4">
            {editError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{editError}</div>}
            <div><label className="block text-sm text-gray-400 mb-1">Module</label>
              <select value={editForm.module} onChange={(e) => setEditForm((f) => ({ ...f, module: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                <option value="">Select module...</option>{modules.map((m: any) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select></div>
            <div><label className="block text-sm text-gray-400 mb-1">Lesson No.</label>
              <input type="number" value={editForm.lesson_no || ""} onChange={(e) => setEditForm((f) => ({ ...f, lesson_no: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Title</label>
              <input type="text" value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Content</label>
              <textarea rows={3} value={editForm.content} onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Video URL</label>
              <input type="url" value={editForm.video_url} onChange={(e) => setEditForm((f) => ({ ...f, video_url: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" /></div>
          </div>
        </ModalForm>

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white">Delete Lesson</h3>
              <p className="text-sm text-gray-400">Remove lesson {deleteTarget.title || `#${deleteTarget.lesson_no}`}?</p>
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
