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
import { DetailField } from "@/components/detail-field";

interface PE {
  id: string; student: string; instructor: string; lesson_type: string | null;
  date: string; result: string | null; grade: string | null; observations: string | null;
  strengths: string | null; improvements: string | null; recommendations: string | null; decision: string | null;
}

const INIT_FORM = { student: "", instructor: "", lesson_type: "", date: "", result: "", grade: "", observations: "", strengths: "", improvements: "", recommendations: "", decision: "" };

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; }
}

export default function AdminPracticalEvaluationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<PE | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(INIT_FORM);
  const [createError, setCreateError] = useState("");
  const [editItem, setEditItem] = useState<PE | null>(null);
  const [editForm, setEditForm] = useState(INIT_FORM);
  const [editError, setEditError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PE | null>(null);

  const { data: records, isLoading, error, refetch } = useQuery<PE[]>({
    queryKey: ["admin-pe"],
    queryFn: async () => { const d = await api.get<any>("/practical-evaluations/"); return unwrapResults(d); },
    enabled: isAuthenticated,
  });

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ["admin-pe-students"],
    queryFn: async () => { const d = await api.get<any>("/students/"); return unwrapResults(d); },
    enabled: isAuthenticated,
  });

  const { data: instructors = [] } = useQuery<any[]>({
    queryKey: ["admin-pe-instructors"],
    queryFn: async () => { const d = await api.get<any>("/flight-instructors/"); return unwrapResults(d); },
    enabled: isAuthenticated,
  });

  const buildPayload = (f: typeof INIT_FORM) => ({
    student: f.student, instructor: f.instructor, lesson_type: f.lesson_type || null,
    date: f.date, result: f.result || null, grade: f.grade ? parseFloat(f.grade) : null,
    observations: f.observations || null, strengths: f.strengths || null,
    improvements: f.improvements || null, recommendations: f.recommendations || null, decision: f.decision || null,
  });

  const createMutation = useMutation({
    mutationFn: (p: ReturnType<typeof buildPayload>) => api.post("/practical-evaluations/", p),
    onSuccess: () => { showToast("success", "Evaluation created"); setCreateOpen(false); setCreateForm(INIT_FORM); queryClient.invalidateQueries({ queryKey: ["admin-pe"] }); },
    onError: (err: any) => { const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message; setCreateError(msg || "Failed"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, p }: { id: string; p: ReturnType<typeof buildPayload> }) => api.patch(`/practical-evaluations/${id}/`, p),
    onSuccess: () => { showToast("success", "Evaluation updated"); setEditItem(null); queryClient.invalidateQueries({ queryKey: ["admin-pe"] }); },
    onError: (err: any) => { const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message; setEditError(msg || "Failed"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/practical-evaluations/${id}/`),
    onSuccess: () => { showToast("success", "Evaluation deleted"); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ["admin-pe"] }); },
    onError: (err: any) => { showToast("error", err.message || "Failed"); },
  });

  const filtered = useMemo(() => {
    if (!records) return [];
    let r = records;
    if (filterValues.result) r = r.filter((a) => a.result === filterValues.result);
    if (filterValues.decision) r = r.filter((a) => a.decision === filterValues.decision);
    if (searchValue) { const q = searchValue.toLowerCase(); r = r.filter((a) => a.observations?.toLowerCase().includes(q) || a.strengths?.toLowerCase().includes(q)); }
    return r;
  }, [records, filterValues, searchValue]);

  const columns: Column<PE>[] = useMemo(() => [
    { key: "date", header: "Date", render: (a) => <span className="text-sm text-gray-300">{fmtDate(a.date)}</span> },
    { key: "result", header: "Result", render: (a) => a.result ? <span className={`text-xs px-2 py-0.5 rounded ${a.result === "pass" ? "bg-green-500/10 text-green-400" : a.result === "fail" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>{a.result}</span> : <span className="text-xs text-gray-500">—</span> },
    { key: "grade", header: "Grade", render: (a) => <span className="text-sm text-gray-300">{a.grade || "—"}</span> },
    { key: "decision", header: "Decision", render: (a) => <span className="text-sm text-gray-400">{a.decision || "—"}</span> },
    { key: "actions", header: "", render: (a) => (
      <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => { setEditItem(a); setEditForm({ student: a.student, instructor: a.instructor, lesson_type: a.lesson_type || "", date: a.date, result: a.result || "", grade: a.grade || "", observations: a.observations || "", strengths: a.strengths || "", improvements: a.improvements || "", recommendations: a.recommendations || "", decision: a.decision || "" }); setEditError(""); }} className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded transition-colors">{t('common.edit')}</button>
        <button onClick={() => setDeleteTarget(a)} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors">{t('common.delete')}</button>
      </div>
    )},
  ], []);

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader title={t("admin.practicalEvaluations", "Practical Evaluations")} backHref="/admin/dashboard" backLabel={t("common.back", "Back")} actions={
        <button onClick={() => setCreateOpen(true)} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors">+ New Evaluation</button>
      } />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={error?.message || "Failed"} onRetry={() => refetch()} />}
        {isLoading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? (
          <EmptyState message={records?.length === 0 ? "No evaluations yet." : "No matches."} title={records?.length === 0 ? "No evaluations" : "No matches"} action={records?.length === 0 ? { label: "New Evaluation", onClick: () => setCreateOpen(true) } : undefined} />
        ) : <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(i) => setSelected(i as PE)} />}

        <ModalForm open={!!selected} onClose={() => setSelected(null)} title="Evaluation Details" footer={<button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">{t('common.close')}</button>}>
          {selected && <div className="space-y-4">
            <DetailField label="Date" value={fmtDate(selected.date)} />
            <DetailField label="Result" value={selected.result || "—"} />
            <DetailField label="Grade" value={selected.grade || "—"} />
            <DetailField label="Decision" value={selected.decision || "—"} />
            <DetailField label="Observations" value={selected.observations || "—"} />
            <DetailField label="Strengths" value={selected.strengths || "—"} />
            <DetailField label="Improvements" value={selected.improvements || "—"} />
            <DetailField label="Recommendations" value={selected.recommendations || "—"} />
          </div>}
        </ModalForm>

        <ModalForm open={createOpen} onClose={() => { setCreateOpen(false); setCreateForm(INIT_FORM); }} title="New Evaluation" footer={<>
          <button onClick={() => { setCreateOpen(false); setCreateForm(INIT_FORM); }} disabled={createMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button>
          <button onClick={() => createMutation.mutate(buildPayload(createForm))} disabled={createMutation.isPending || !createForm.student || !createForm.instructor || !createForm.date} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{createMutation.isPending ? "Creating..." : "Create"}</button>
        </>}>
          <div className="space-y-4">
            {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{createError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Student <span className="text-red-400">*</span></label>
                <select value={createForm.student} onChange={(e) => setCreateForm((f) => ({ ...f, student: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  <option value="">Select...</option>{students.map((s: any) => <option key={s.id} value={s.id}>{s.full_name || `${s.first_name} ${s.last_name}`}</option>)}
                </select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Instructor <span className="text-red-400">*</span></label>
                <select value={createForm.instructor} onChange={(e) => setCreateForm((f) => ({ ...f, instructor: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  <option value="">Select...</option>{instructors.map((i: any) => <option key={i.id} value={i.id}>{i.name || i.email}</option>)}
                </select></div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Date <span className="text-red-400">*</span></label><input type="datetime-local" value={createForm.date} onChange={(e) => setCreateForm((f) => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Result</label>
                <select value={createForm.result} onChange={(e) => setCreateForm((f) => ({ ...f, result: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  <option value="">—</option><option value="pass">Pass</option><option value="fail">Fail</option><option value="partial">Partial</option>
                </select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Grade</label><input type="number" step="0.1" value={createForm.grade} onChange={(e) => setCreateForm((f) => ({ ...f, grade: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Decision</label>
              <select value={createForm.decision} onChange={(e) => setCreateForm((f) => ({ ...f, decision: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                <option value="">—</option><option value="satisfactory">Satisfactory</option><option value="needs_improvement">Needs Improvement</option><option value="unsatisfactory">Unsatisfactory</option>
              </select></div>
            <div><label className="block text-sm text-gray-400 mb-1">Observations</label><textarea rows={2} value={createForm.observations} onChange={(e) => setCreateForm((f) => ({ ...f, observations: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Strengths</label><textarea rows={2} value={createForm.strengths} onChange={(e) => setCreateForm((f) => ({ ...f, strengths: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Areas for Improvement</label><textarea rows={2} value={createForm.improvements} onChange={(e) => setCreateForm((f) => ({ ...f, improvements: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Recommendations</label><textarea rows={2} value={createForm.recommendations} onChange={(e) => setCreateForm((f) => ({ ...f, recommendations: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" /></div>
          </div>
        </ModalForm>

        <ModalForm open={!!editItem} onClose={() => setEditItem(null)} title="Edit Evaluation" footer={<>
          <button onClick={() => setEditItem(null)} disabled={updateMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button>
          <button onClick={() => { if (editItem) updateMutation.mutate({ id: editItem.id, p: buildPayload(editForm) }); }} disabled={updateMutation.isPending || !editForm.student || !editForm.instructor || !editForm.date} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{updateMutation.isPending ? "Saving..." : "Save"}</button>
        </>}>
          <div className="space-y-4">
            {editError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{editError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Student</label>
                <select value={editForm.student} onChange={(e) => setEditForm((f) => ({ ...f, student: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  <option value="">Select...</option>{students.map((s: any) => <option key={s.id} value={s.id}>{s.full_name || `${s.first_name} ${s.last_name}`}</option>)}
                </select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Instructor</label>
                <select value={editForm.instructor} onChange={(e) => setEditForm((f) => ({ ...f, instructor: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  <option value="">Select...</option>{instructors.map((i: any) => <option key={i.id} value={i.id}>{i.name || i.email}</option>)}
                </select></div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Date</label><input type="datetime-local" value={editForm.date} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Result</label>
                <select value={editForm.result} onChange={(e) => setEditForm((f) => ({ ...f, result: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  <option value="">—</option><option value="pass">Pass</option><option value="fail">Fail</option><option value="partial">Partial</option>
                </select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Grade</label><input type="number" step="0.1" value={editForm.grade} onChange={(e) => setEditForm((f) => ({ ...f, grade: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Decision</label>
              <select value={editForm.decision} onChange={(e) => setEditForm((f) => ({ ...f, decision: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                <option value="">—</option><option value="satisfactory">Satisfactory</option><option value="needs_improvement">Needs Improvement</option><option value="unsatisfactory">Unsatisfactory</option>
              </select></div>
            <div><label className="block text-sm text-gray-400 mb-1">Observations</label><textarea rows={2} value={editForm.observations} onChange={(e) => setEditForm((f) => ({ ...f, observations: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Strengths</label><textarea rows={2} value={editForm.strengths} onChange={(e) => setEditForm((f) => ({ ...f, strengths: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Areas for Improvement</label><textarea rows={2} value={editForm.improvements} onChange={(e) => setEditForm((f) => ({ ...f, improvements: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Recommendations</label><textarea rows={2} value={editForm.recommendations} onChange={(e) => setEditForm((f) => ({ ...f, recommendations: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
          </div>
        </ModalForm>

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white">Delete Evaluation</h3>
              <p className="text-sm text-gray-400">Remove this practical evaluation?</p>
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


