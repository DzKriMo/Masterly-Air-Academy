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

interface ST {
  id: string; student: string; student_name: string; examiner: string; examiner_name: string;
  scheduled_date: string; completed_date: string | null; result: string | null;
  report_url: string | null; observations: string | null; recommendations: string | null; status: string;
}

const STATUSES = ["authorized", "in_progress", "completed", "failed", "cancelled"];
const INIT_FORM = { student: "", examiner: "", scheduled_date: "", result: "", observations: "", recommendations: "", status: "authorized" };

const STATUS_COLORS: Record<string, string> = {
  authorized: "bg-blue-500/10 text-blue-400", in_progress: "bg-amber-500/10 text-amber-400",
  completed: "bg-green-500/10 text-green-400", failed: "bg-red-500/10 text-red-400", cancelled: "bg-gray-500/10 text-gray-400",
};

const fmtStatus = (s: string) => s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; }
}

export default function AdminSkillTestsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<ST | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(INIT_FORM);
  const [createError, setCreateError] = useState("");
  const [editItem, setEditItem] = useState<ST | null>(null);
  const [editForm, setEditForm] = useState(INIT_FORM);
  const [editError, setEditError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ST | null>(null);

  const { data: records, isLoading, error, refetch } = useQuery<ST[]>({
    queryKey: ["admin-st"],
    queryFn: async () => { const d = await api.get<any>("/skill-tests/"); return (d as any)?.results || (d as any) || []; },
    enabled: isAuthenticated,
  });

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ["admin-st-students"],
    queryFn: async () => { const d = await api.get<any>("/students/"); return (d as any)?.results || (d as any) || []; },
    enabled: isAuthenticated,
  });

  const { data: instructors = [] } = useQuery<any[]>({
    queryKey: ["admin-st-instructors"],
    queryFn: async () => { const d = await api.get<any>("/flight-instructors/"); return (d as any)?.results || (d as any) || []; },
    enabled: isAuthenticated,
  });

  const buildPayload = (f: typeof INIT_FORM) => ({
    student: f.student, examiner: f.examiner, scheduled_date: f.scheduled_date,
    result: f.result || null, observations: f.observations || null,
    recommendations: f.recommendations || null, status: f.status,
  });

  const createMutation = useMutation({
    mutationFn: (p: ReturnType<typeof buildPayload>) => api.post("/skill-tests/", p),
    onSuccess: () => { showToast("success", "Skill test created"); setCreateOpen(false); setCreateForm(INIT_FORM); queryClient.invalidateQueries({ queryKey: ["admin-st"] }); },
    onError: (err: any) => { const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message; setCreateError(msg || "Failed"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, p }: { id: string; p: ReturnType<typeof buildPayload> }) => api.patch(`/skill-tests/${id}/`, p),
    onSuccess: () => { showToast("success", "Skill test updated"); setEditItem(null); queryClient.invalidateQueries({ queryKey: ["admin-st"] }); },
    onError: (err: any) => { const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message; setEditError(msg || "Failed"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/skill-tests/${id}/`),
    onSuccess: () => { showToast("success", "Skill test deleted"); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ["admin-st"] }); },
    onError: (err: any) => { showToast("error", err.message || "Failed"); },
  });

  const filtered = useMemo(() => {
    if (!records) return [];
    let r = records;
    if (filterValues.status) r = r.filter((a) => a.status === filterValues.status);
    if (filterValues.result) r = r.filter((a) => a.result === filterValues.result);
    if (searchValue) { const q = searchValue.toLowerCase(); r = r.filter((a) => (a.student_name || "").toLowerCase().includes(q)); }
    return r;
  }, [records, filterValues, searchValue]);

  const columns: Column<ST>[] = useMemo(() => [
    { key: "student_name", header: "Student", render: (a) => <span className="text-sm font-semibold text-white">{a.student_name}</span> },
    { key: "examiner_name", header: "Examiner", render: (a) => <span className="text-sm text-gray-300">{a.examiner_name}</span> },
    { key: "scheduled_date", header: "Scheduled", render: (a) => <span className="text-sm text-gray-300">{fmtDate(a.scheduled_date)}</span> },
    { key: "status", header: "Status", render: (a) => <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[a.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtStatus(a.status)}</span> },
    { key: "result", header: "Result", render: (a) => a.result ? <span className={`text-xs px-2 py-0.5 rounded ${a.result === "pass" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{fmtStatus(a.result)}</span> : <span className="text-xs text-gray-500">—</span> },
    { key: "actions", header: "", render: (a) => (
      <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => { setEditItem(a); setEditForm({ student: a.student, examiner: a.examiner, scheduled_date: a.scheduled_date, result: a.result || "", observations: a.observations || "", recommendations: a.recommendations || "", status: a.status }); setEditError(""); }} className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded transition-colors">Edit</button>
        <button onClick={() => setDeleteTarget(a)} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors">Delete</button>
      </div>
    )},
  ], []);

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader title="Skill Tests" backHref="/admin/dashboard" backLabel={t("common.back", "Back")} actions={
        <button onClick={() => setCreateOpen(true)} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors">+ New Test</button>
      } />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={(error as any)?.message || "Failed"} onRetry={() => refetch()} />}
        {isLoading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? (
          <EmptyState message={records?.length === 0 ? "No skill tests yet." : "No matches."} title={records?.length === 0 ? "No tests" : "No matches"} action={records?.length === 0 ? { label: "New Test", onClick: () => setCreateOpen(true) } : undefined} />
        ) : <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(i) => setSelected(i as ST)} />}

        <ModalForm open={!!selected} onClose={() => setSelected(null)} title="Skill Test Details" footer={<button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">Close</button>}>
          {selected && <div className="space-y-4">
            <DetailField label="Student" value={selected.student_name} />
            <DetailField label="Examiner" value={selected.examiner_name} />
            <DetailField label="Scheduled" value={fmtDate(selected.scheduled_date)} />
            <DetailField label="Completed" value={fmtDate(selected.completed_date)} />
            <DetailField label="Status" value={fmtStatus(selected.status)} />
            <DetailField label="Result" value={selected.result ? fmtStatus(selected.result) : "—"} />
            <DetailField label="Observations" value={selected.observations || "—"} />
            <DetailField label="Recommendations" value={selected.recommendations || "—"} />
            {selected.report_url && <div><a href={selected.report_url} target="_blank" rel="noopener noreferrer" className="text-sm text-gold-500 hover:underline">View Report</a></div>}
          </div>}
        </ModalForm>

        <ModalForm open={createOpen} onClose={() => { setCreateOpen(false); setCreateForm(INIT_FORM); }} title="New Skill Test" footer={<>
          <button onClick={() => { setCreateOpen(false); setCreateForm(INIT_FORM); }} disabled={createMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">Cancel</button>
          <button onClick={() => createMutation.mutate(buildPayload(createForm))} disabled={createMutation.isPending || !createForm.student || !createForm.examiner || !createForm.scheduled_date} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{createMutation.isPending ? "Creating..." : "Create"}</button>
        </>}>
          <div className="space-y-4">
            {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{createError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Student <span className="text-red-400">*</span></label>
                <select value={createForm.student} onChange={(e) => setCreateForm((f) => ({ ...f, student: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  <option value="">Select...</option>{students.map((s: any) => <option key={s.id} value={s.id}>{s.full_name || `${s.first_name} ${s.last_name}`}</option>)}
                </select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Examiner <span className="text-red-400">*</span></label>
                <select value={createForm.examiner} onChange={(e) => setCreateForm((f) => ({ ...f, examiner: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  <option value="">Select...</option>{instructors.map((i: any) => <option key={i.id} value={i.id}>{i.name || i.email}</option>)}
                </select></div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Scheduled <span className="text-red-400">*</span></label><input type="datetime-local" value={createForm.scheduled_date} onChange={(e) => setCreateForm((f) => ({ ...f, scheduled_date: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Status</label>
              <select value={createForm.status} onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">{STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}</select></div>
            <div><label className="block text-sm text-gray-400 mb-1">Observations</label><textarea rows={2} value={createForm.observations} onChange={(e) => setCreateForm((f) => ({ ...f, observations: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Recommendations</label><textarea rows={2} value={createForm.recommendations} onChange={(e) => setCreateForm((f) => ({ ...f, recommendations: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" /></div>
          </div>
        </ModalForm>

        <ModalForm open={!!editItem} onClose={() => setEditItem(null)} title="Edit Skill Test" footer={<>
          <button onClick={() => setEditItem(null)} disabled={updateMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">Cancel</button>
          <button onClick={() => { if (editItem) updateMutation.mutate({ id: editItem.id, p: buildPayload(editForm) }); }} disabled={updateMutation.isPending || !editForm.student || !editForm.examiner || !editForm.scheduled_date} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{updateMutation.isPending ? "Saving..." : "Save"}</button>
        </>}>
          <div className="space-y-4">
            {editError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{editError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Student</label>
                <select value={editForm.student} onChange={(e) => setEditForm((f) => ({ ...f, student: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  <option value="">Select...</option>{students.map((s: any) => <option key={s.id} value={s.id}>{s.full_name || `${s.first_name} ${s.last_name}`}</option>)}
                </select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Examiner</label>
                <select value={editForm.examiner} onChange={(e) => setEditForm((f) => ({ ...f, examiner: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  <option value="">Select...</option>{instructors.map((i: any) => <option key={i.id} value={i.id}>{i.name || i.email}</option>)}
                </select></div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Scheduled</label><input type="datetime-local" value={editForm.scheduled_date} onChange={(e) => setEditForm((f) => ({ ...f, scheduled_date: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Status</label>
              <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">{STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}</select></div>
            <div><label className="block text-sm text-gray-400 mb-1">Result</label>
              <select value={editForm.result || ""} onChange={(e) => setEditForm((f) => ({ ...f, result: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                <option value="">No result</option><option value="pass">Pass</option><option value="fail">Fail</option>
              </select></div>
            <div><label className="block text-sm text-gray-400 mb-1">Observations</label><textarea rows={2} value={editForm.observations} onChange={(e) => setEditForm((f) => ({ ...f, observations: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Recommendations</label><textarea rows={2} value={editForm.recommendations} onChange={(e) => setEditForm((f) => ({ ...f, recommendations: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
          </div>
        </ModalForm>

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white">Delete Skill Test</h3>
              <p className="text-sm text-gray-400">Remove test for {deleteTarget.student_name}?</p>
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
