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

interface GEval {
  id: string; course: string; student: string; student_name: string;
  grade: string | null; appreciation: string | null;
  module_validated: boolean; recommend_remedial: boolean;
  flagged: boolean; created_at: string;
}

const INIT_FORM = { course: "", student: "", grade: "", appreciation: "", module_validated: false, recommend_remedial: false, flagged: false };

function fmtBool(v: boolean) { return v ? "Yes" : "No"; }

export default function AdminGroundEvaluationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<GEval | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(INIT_FORM);
  const [createError, setCreateError] = useState("");
  const [editItem, setEditItem] = useState<GEval | null>(null);
  const [editForm, setEditForm] = useState(INIT_FORM);
  const [editError, setEditError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<GEval | null>(null);

  const { data: records, isLoading, error, refetch } = useQuery<GEval[]>({
    queryKey: ["admin-gevals"],
    queryFn: async () => { const d = await api.get<any>("/ground-evaluations/"); return (d as any)?.results || (d as any) || []; },
    enabled: isAuthenticated,
  });

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ["admin-ge-students"],
    queryFn: async () => { const d = await api.get<any>("/students/"); return (d as any)?.results || (d as any) || []; },
    enabled: isAuthenticated,
  });

  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["admin-ge-courses"],
    queryFn: async () => { const d = await api.get<any>("/courses/"); return (d as any)?.results || (d as any) || []; },
    enabled: isAuthenticated,
  });

  const buildPayload = (f: typeof INIT_FORM) => ({
    course: f.course, student: f.student,
    grade: f.grade ? parseFloat(f.grade) : null,
    appreciation: f.appreciation || null,
    module_validated: f.module_validated,
    recommend_remedial: f.recommend_remedial, flagged: f.flagged,
  });

  const createMutation = useMutation({
    mutationFn: (p: ReturnType<typeof buildPayload>) => api.post("/ground-evaluations/", p),
    onSuccess: () => { showToast("success", "Evaluation created"); setCreateOpen(false); setCreateForm(INIT_FORM); queryClient.invalidateQueries({ queryKey: ["admin-gevals"] }); },
    onError: (err: any) => { const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message; setCreateError(msg || "Failed"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, p }: { id: string; p: ReturnType<typeof buildPayload> }) => api.patch(`/ground-evaluations/${id}/`, p),
    onSuccess: () => { showToast("success", "Evaluation updated"); setEditItem(null); queryClient.invalidateQueries({ queryKey: ["admin-gevals"] }); },
    onError: (err: any) => { const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message; setEditError(msg || "Failed"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/ground-evaluations/${id}/`),
    onSuccess: () => { showToast("success", "Evaluation deleted"); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ["admin-gevals"] }); },
    onError: (err: any) => { showToast("error", err.message || "Failed"); },
  });

  const filtered = useMemo(() => {
    if (!records) return [];
    let r = records;
    if (filterValues.course) r = r.filter((a) => a.course === filterValues.course);
    if (filterValues.flagged !== undefined && filterValues.flagged !== "") r = r.filter((a) => String(a.flagged) === filterValues.flagged);
    if (searchValue) { const q = searchValue.toLowerCase(); r = r.filter((a) => (a.student_name || "").toLowerCase().includes(q)); }
    return r;
  }, [records, filterValues, searchValue]);

  const columns: Column<GEval>[] = useMemo(() => [
    { key: "student_name", header: "Student", render: (a) => <span className="text-sm font-semibold text-white">{a.student_name}</span> },
    { key: "grade", header: "Grade", render: (a) => <span className="text-sm text-gray-300">{a.grade || "—"}</span> },
    { key: "module_validated", header: "Validated", render: (a) => <span className={`text-xs px-2 py-0.5 rounded ${a.module_validated ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"}`}>{fmtBool(a.module_validated)}</span> },
    { key: "flagged", header: "Flagged", render: (a) => a.flagged ? <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400">Flagged</span> : null },
    { key: "actions", header: "", render: (a) => (
      <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => { setEditItem(a); setEditForm({ course: a.course, student: a.student, grade: a.grade || "", appreciation: a.appreciation || "", module_validated: a.module_validated, recommend_remedial: a.recommend_remedial, flagged: a.flagged }); setEditError(""); }} className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded transition-colors">Edit</button>
        <button onClick={() => setDeleteTarget(a)} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors">Delete</button>
      </div>
    )},
  ], []);

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader title="Ground Evaluations" backHref="/admin/dashboard" backLabel={t("common.back", "Back")} actions={
        <button onClick={() => setCreateOpen(true)} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors">+ New Evaluation</button>
      } />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={(error as any)?.message || "Failed"} onRetry={() => refetch()} />}
        {isLoading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? (
          <EmptyState message={records?.length === 0 ? "No evaluations yet." : "No matches."} title={records?.length === 0 ? "No evaluations" : "No matches"} action={records?.length === 0 ? { label: "New Evaluation", onClick: () => setCreateOpen(true) } : undefined} />
        ) : <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(i) => setSelected(i as GEval)} />}

        <ModalForm open={!!selected} onClose={() => setSelected(null)} title="Evaluation Details" footer={<button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">Close</button>}>
          {selected && <div className="space-y-4">
            <DetailField label="Student" value={selected.student_name} />
            <DetailField label="Grade" value={selected.grade || "—"} />
            <DetailField label="Appreciation" value={selected.appreciation || "—"} />
            <DetailField label="Module Validated" value={fmtBool(selected.module_validated)} />
            <DetailField label="Recommend Remedial" value={fmtBool(selected.recommend_remedial)} />
            <DetailField label="Flagged" value={fmtBool(selected.flagged)} />
          </div>}
        </ModalForm>

        <ModalForm open={createOpen} onClose={() => { setCreateOpen(false); setCreateForm(INIT_FORM); }} title="New Evaluation" footer={<>
          <button onClick={() => { setCreateOpen(false); setCreateForm(INIT_FORM); }} disabled={createMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">Cancel</button>
          <button onClick={() => createMutation.mutate(buildPayload(createForm))} disabled={createMutation.isPending || !createForm.course || !createForm.student} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{createMutation.isPending ? "Creating..." : "Create"}</button>
        </>}>
          <div className="space-y-4">
            {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{createError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Course <span className="text-red-400">*</span></label>
                <select value={createForm.course} onChange={(e) => setCreateForm((f) => ({ ...f, course: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  <option value="">Select...</option>{courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Student <span className="text-red-400">*</span></label>
                <select value={createForm.student} onChange={(e) => setCreateForm((f) => ({ ...f, student: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  <option value="">Select...</option>{students.map((s: any) => <option key={s.id} value={s.id}>{s.full_name || `${s.first_name} ${s.last_name}`}</option>)}
                </select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Grade</label>
                <input type="number" step="0.1" value={createForm.grade} onChange={(e) => setCreateForm((f) => ({ ...f, grade: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" placeholder="0.0" /></div>
              <div className="flex items-end gap-4 pb-2">
                <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={createForm.module_validated} onChange={(e) => setCreateForm((f) => ({ ...f, module_validated: e.target.checked }))} className="accent-gold-500" /> Validated</label>
                <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={createForm.flagged} onChange={(e) => setCreateForm((f) => ({ ...f, flagged: e.target.checked }))} className="accent-gold-500" /> Flagged</label>
              </div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Appreciation</label>
              <textarea rows={3} value={createForm.appreciation} onChange={(e) => setCreateForm((f) => ({ ...f, appreciation: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" /></div>
            <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={createForm.recommend_remedial} onChange={(e) => setCreateForm((f) => ({ ...f, recommend_remedial: e.target.checked }))} className="accent-gold-500" /> Recommend Remedial</label>
          </div>
        </ModalForm>

        <ModalForm open={!!editItem} onClose={() => setEditItem(null)} title="Edit Evaluation" footer={<>
          <button onClick={() => setEditItem(null)} disabled={updateMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">Cancel</button>
          <button onClick={() => { if (editItem) updateMutation.mutate({ id: editItem.id, p: buildPayload(editForm) }); }} disabled={updateMutation.isPending || !editForm.course || !editForm.student} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{updateMutation.isPending ? "Saving..." : "Save"}</button>
        </>}>
          <div className="space-y-4">
            {editError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{editError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Course</label>
                <select value={editForm.course} onChange={(e) => setEditForm((f) => ({ ...f, course: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  <option value="">Select...</option>{courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Student</label>
                <select value={editForm.student} onChange={(e) => setEditForm((f) => ({ ...f, student: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  <option value="">Select...</option>{students.map((s: any) => <option key={s.id} value={s.id}>{s.full_name || `${s.first_name} ${s.last_name}`}</option>)}
                </select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Grade</label><input type="number" step="0.1" value={editForm.grade} onChange={(e) => setEditForm((f) => ({ ...f, grade: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
              <div className="flex items-end gap-4 pb-2">
                <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={editForm.module_validated} onChange={(e) => setEditForm((f) => ({ ...f, module_validated: e.target.checked }))} className="accent-gold-500" /> Validated</label>
                <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={editForm.flagged} onChange={(e) => setEditForm((f) => ({ ...f, flagged: e.target.checked }))} className="accent-gold-500" /> Flagged</label>
              </div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Appreciation</label><textarea rows={3} value={editForm.appreciation} onChange={(e) => setEditForm((f) => ({ ...f, appreciation: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={editForm.recommend_remedial} onChange={(e) => setEditForm((f) => ({ ...f, recommend_remedial: e.target.checked }))} className="accent-gold-500" /> Recommend Remedial</label>
          </div>
        </ModalForm>

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white">Delete Evaluation</h3>
              <p className="text-sm text-gray-400">Remove evaluation for {deleteTarget.student_name}?</p>
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
