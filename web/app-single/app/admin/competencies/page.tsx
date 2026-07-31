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
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";

interface Competency {
  id: string; student: string; program: string; competency: string;
  status: string; achieved_at: string | null; notes: string | null;
}

const PROGRAMS = ["PPL", "CPL", "IR", "MEP", "MCC"];
const STATUSES = ["not_started", "in_progress", "acquired", "needs_reinforcement"];
const INIT_FORM = { student: "", program: "PPL", competency: "", status: "not_started", achieved_at: "", notes: "" };

const STATUS_COLORS: Record<string, string> = {
  not_started: "bg-gray-500/10 text-gray-400", in_progress: "bg-blue-500/10 text-blue-400",
  acquired: "bg-green-500/10 text-green-400", needs_reinforcement: "bg-amber-500/10 text-amber-400",
};

const fmtStatus = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); } catch { return "—"; }
}

export default function AdminCompetenciesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Competency | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(INIT_FORM);
  const [createError, setCreateError] = useState("");
  const [editItem, setEditItem] = useState<Competency | null>(null);
  const [editForm, setEditForm] = useState(INIT_FORM);
  const [editError, setEditError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Competency | null>(null);

  const { data: records, isLoading, error, refetch } = useQuery<Competency[]>({
    queryKey: ["admin-competencies"],
    queryFn: async () => { const d = await api.get<any>("/competencies/"); return unwrapResults(d); },
    enabled: isAuthenticated,
  });

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ["admin-comp-students"],
    queryFn: async () => { const d = await api.get<any>("/students/"); return unwrapResults(d); },
    enabled: isAuthenticated,
  });

  const buildPayload = (f: typeof INIT_FORM) => ({
    student: f.student, program: f.program, competency: f.competency,
    status: f.status, achieved_at: f.achieved_at || null, notes: f.notes || null,
  });

  const createMutation = useMutation({
    mutationFn: (p: ReturnType<typeof buildPayload>) => api.post("/competencies/", p),
    onSuccess: () => { showToast("success", "Competency created"); setCreateOpen(false); setCreateForm(INIT_FORM); queryClient.invalidateQueries({ queryKey: ["admin-competencies"] }); },
    onError: (err: any) => { const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message; setCreateError(msg || "Failed"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, p }: { id: string; p: ReturnType<typeof buildPayload> }) => api.patch(`/competencies/${id}/`, p),
    onSuccess: () => { showToast("success", "Competency updated"); setEditItem(null); queryClient.invalidateQueries({ queryKey: ["admin-competencies"] }); },
    onError: (err: any) => { const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message; setEditError(msg || "Failed"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/competencies/${id}/`),
    onSuccess: () => { showToast("success", "Competency deleted"); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ["admin-competencies"] }); },
    onError: (err: any) => { showToast("error", err.message || "Failed"); },
  });

  const filtered = useMemo(() => {
    if (!records) return [];
    let r = records;
    if (filterValues.status) r = r.filter((a) => a.status === filterValues.status);
    if (filterValues.program) r = r.filter((a) => a.program === filterValues.program);
    if (searchValue) { const q = searchValue.toLowerCase(); r = r.filter((a) => a.competency.toLowerCase().includes(q)); }
    return r;
  }, [records, filterValues, searchValue]);

  const columns: Column<Competency>[] = useMemo(() => [
    { key: "competency", header: "Competency", render: (a) => <span className="text-sm font-semibold text-white">{a.competency}</span> },
    { key: "program", header: "Program", render: (a) => <span className="text-xs px-2 py-0.5 rounded bg-navy-700 text-gray-300">{a.program}</span> },
    { key: "status", header: "Status", render: (a) => <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[a.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtStatus(a.status)}</span> },
    { key: "achieved_at", header: "Achieved", render: (a) => <span className="text-sm text-gray-400">{fmtDate(a.achieved_at)}</span> },
    { key: "actions", header: "", render: (a) => (
      <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => { setEditItem(a); setEditForm({ student: a.student, program: a.program, competency: a.competency, status: a.status, achieved_at: a.achieved_at || "", notes: a.notes || "" }); setEditError(""); }} className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded transition-colors">{t('common.edit')}</button>
        <button onClick={() => setDeleteTarget(a)} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors">{t('common.delete')}</button>
      </div>
    )},
  ], []);

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader title={t("admin.competencies", "Competencies")} backHref="/admin/dashboard" backLabel={t("common.back", "Back")} actions={
        <button onClick={() => setCreateOpen(true)} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors">+ New Competency</button>
      } />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={error?.message || "Failed"} onRetry={() => refetch()} />}
        {isLoading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? (
          <EmptyState message={records?.length === 0 ? "No competencies yet." : "No matches."} title={records?.length === 0 ? "No competencies" : "No matches"} action={records?.length === 0 ? { label: "New Competency", onClick: () => setCreateOpen(true) } : undefined} />
        ) : <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(i) => setSelected(i as Competency)} />}

        <ModalForm open={!!selected} onClose={() => setSelected(null)} title="Competency Details" footer={<button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">{t('common.close')}</button>}>
          {selected && <div className="space-y-4">
            <DetailField label="Competency" value={selected.competency} />
            <DetailField label="Program" value={selected.program} />
            <DetailField label="Status" value={fmtStatus(selected.status)} />
            <DetailField label="Achieved At" value={fmtDate(selected.achieved_at)} />
            <DetailField label="Notes" value={selected.notes || "—"} />
          </div>}
        </ModalForm>

        <ModalForm open={createOpen} onClose={() => { setCreateOpen(false); setCreateForm(INIT_FORM); }} title="New Competency" footer={<>
          <button onClick={() => { setCreateOpen(false); setCreateForm(INIT_FORM); }} disabled={createMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button>
          <button onClick={() => createMutation.mutate(buildPayload(createForm))} disabled={createMutation.isPending || !createForm.student || !createForm.competency} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{createMutation.isPending ? "Creating..." : "Create"}</button>
        </>}>
          <div className="space-y-4">
            {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{createError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Student <span className="text-red-400">*</span></label>
                <select value={createForm.student} onChange={(e) => setCreateForm((f) => ({ ...f, student: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  <option value="">Select...</option>{students.map((s: any) => <option key={s.id} value={s.id}>{s.full_name || `${s.first_name} ${s.last_name}`}</option>)}
                </select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Program</label>
                <select value={createForm.program} onChange={(e) => setCreateForm((f) => ({ ...f, program: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">{PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Competency <span className="text-red-400">*</span></label>
              <input value={createForm.competency} onChange={(e) => setCreateForm((f) => ({ ...f, competency: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" placeholder="e.g. Navigation" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Status</label>
                <select value={createForm.status} onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">{STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}</select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Achieved At</label><input type="datetime-local" value={createForm.achieved_at} onChange={(e) => setCreateForm((f) => ({ ...f, achieved_at: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Notes</label><textarea rows={2} value={createForm.notes} onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" /></div>
          </div>
        </ModalForm>

        <ModalForm open={!!editItem} onClose={() => setEditItem(null)} title="Edit Competency" footer={<>
          <button onClick={() => setEditItem(null)} disabled={updateMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button>
          <button onClick={() => { if (editItem) updateMutation.mutate({ id: editItem.id, p: buildPayload(editForm) }); }} disabled={updateMutation.isPending || !editForm.student || !editForm.competency} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{updateMutation.isPending ? "Saving..." : "Save"}</button>
        </>}>
          <div className="space-y-4">
            {editError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{editError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Student</label>
                <select value={editForm.student} onChange={(e) => setEditForm((f) => ({ ...f, student: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  <option value="">Select...</option>{students.map((s: any) => <option key={s.id} value={s.id}>{s.full_name || `${s.first_name} ${s.last_name}`}</option>)}
                </select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Program</label>
                <select value={editForm.program} onChange={(e) => setEditForm((f) => ({ ...f, program: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">{PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Competency</label><input value={editForm.competency} onChange={(e) => setEditForm((f) => ({ ...f, competency: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">{STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}</select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Achieved At</label><input type="datetime-local" value={editForm.achieved_at} onChange={(e) => setEditForm((f) => ({ ...f, achieved_at: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Notes</label><textarea rows={2} value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
          </div>
        </ModalForm>

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white">Delete Competency</h3>
              <p className="text-sm text-gray-400">Remove "{deleteTarget.competency}"?</p>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button>
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
