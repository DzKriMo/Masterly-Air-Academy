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

interface FP {
  id: string; flight_lesson: string; weather_check: boolean; notam_check: boolean;
  performance_check: boolean; document_check: boolean; medical_check: boolean;
  lesson_objectives: string | null; briefing_notes: string | null; prepared_at: string;
}

const INIT_FORM = { flight_lesson: "", weather_check: false, notam_check: false, performance_check: false, document_check: false, medical_check: false, lesson_objectives: "", briefing_notes: "" };

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; }
}

const fmtBool = (v: boolean) => v ? "Yes" : "No";

export default function AdminFlightPreparationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<FP | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(INIT_FORM);
  const [createError, setCreateError] = useState("");
  const [editItem, setEditItem] = useState<FP | null>(null);
  const [editForm, setEditForm] = useState(INIT_FORM);
  const [editError, setEditError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<FP | null>(null);

  const { data: records, isLoading, error, refetch } = useQuery<FP[]>({
    queryKey: ["admin-fp"],
    queryFn: async () => { const d = await api.get<any>("/flight-preparations/"); return (d as any)?.results || (d as any) || []; },
    enabled: isAuthenticated,
  });

  const { data: lessons = [] } = useQuery<any[]>({
    queryKey: ["admin-fp-lessons"],
    queryFn: async () => { const d = await api.get<any>("/flight-lessons/"); return (d as any)?.results || (d as any) || []; },
    enabled: isAuthenticated,
  });

  const buildPayload = (f: typeof INIT_FORM) => ({
    flight_lesson: f.flight_lesson, weather_check: f.weather_check, notam_check: f.notam_check,
    performance_check: f.performance_check, document_check: f.document_check, medical_check: f.medical_check,
    lesson_objectives: f.lesson_objectives || null, briefing_notes: f.briefing_notes || null,
  });

  const createMutation = useMutation({
    mutationFn: (p: ReturnType<typeof buildPayload>) => api.post("/flight-preparations/", p),
    onSuccess: () => { showToast("success", "Preparation created"); setCreateOpen(false); setCreateForm(INIT_FORM); queryClient.invalidateQueries({ queryKey: ["admin-fp"] }); },
    onError: (err: any) => { const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message; setCreateError(msg || "Failed"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, p }: { id: string; p: ReturnType<typeof buildPayload> }) => api.patch(`/flight-preparations/${id}/`, p),
    onSuccess: () => { showToast("success", "Preparation updated"); setEditItem(null); queryClient.invalidateQueries({ queryKey: ["admin-fp"] }); },
    onError: (err: any) => { const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message; setEditError(msg || "Failed"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/flight-preparations/${id}/`),
    onSuccess: () => { showToast("success", "Preparation deleted"); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ["admin-fp"] }); },
    onError: (err: any) => { showToast("error", err.message || "Failed"); },
  });

  const filtered = useMemo(() => {
    if (!records) return [];
    let r = records;
    if (searchValue) { const q = searchValue.toLowerCase(); r = r.filter((a) => (a.lesson_objectives || "").toLowerCase().includes(q)); }
    return r;
  }, [records, searchValue]);

  const columns: Column<FP>[] = useMemo(() => [
    { key: "weather_check", header: "Weather", render: (a) => <span className={`text-xs px-2 py-0.5 rounded ${a.weather_check ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"}`}>{fmtBool(a.weather_check)}</span> },
    { key: "notam_check", header: "NOTAM", render: (a) => <span className={`text-xs px-2 py-0.5 rounded ${a.notam_check ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"}`}>{fmtBool(a.notam_check)}</span> },
    { key: "performance_check", header: "Perf.", render: (a) => <span className={`text-xs px-2 py-0.5 rounded ${a.performance_check ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"}`}>{fmtBool(a.performance_check)}</span> },
    { key: "document_check", header: "Docs", render: (a) => <span className={`text-xs px-2 py-0.5 rounded ${a.document_check ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"}`}>{fmtBool(a.document_check)}</span> },
    { key: "prepared_at", header: "Prepared", render: (a) => <span className="text-sm text-gray-400">{fmtDate(a.prepared_at)}</span> },
    { key: "actions", header: "", render: (a) => (
      <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => { setEditItem(a); setEditForm({ flight_lesson: a.flight_lesson, weather_check: a.weather_check, notam_check: a.notam_check, performance_check: a.performance_check, document_check: a.document_check, medical_check: a.medical_check, lesson_objectives: a.lesson_objectives || "", briefing_notes: a.briefing_notes || "" }); setEditError(""); }} className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded transition-colors">Edit</button>
        <button onClick={() => setDeleteTarget(a)} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors">Delete</button>
      </div>
    )},
  ], []);

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader title="Flight Preparations" backHref="/admin/dashboard" backLabel={t("common.back", "Back")} actions={
        <button onClick={() => setCreateOpen(true)} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors">+ New Preparation</button>
      } />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={(error as any)?.message || "Failed"} onRetry={() => refetch()} />}
        {isLoading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? (
          <EmptyState message={records?.length === 0 ? "No preparations yet." : "No matches."} title={records?.length === 0 ? "No preparations" : "No matches"} action={records?.length === 0 ? { label: "New Preparation", onClick: () => setCreateOpen(true) } : undefined} />
        ) : <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(i) => setSelected(i as FP)} />}

        <ModalForm open={!!selected} onClose={() => setSelected(null)} title="Preparation Details" footer={<button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">Close</button>}>
          {selected && <div className="space-y-4">
            <DetailField label="Weather Check" value={fmtBool(selected.weather_check)} />
            <DetailField label="NOTAM Check" value={fmtBool(selected.notam_check)} />
            <DetailField label="Performance Check" value={fmtBool(selected.performance_check)} />
            <DetailField label="Document Check" value={fmtBool(selected.document_check)} />
            <DetailField label="Medical Check" value={fmtBool(selected.medical_check)} />
            <DetailField label="Objectives" value={selected.lesson_objectives || "—"} />
            <DetailField label="Briefing Notes" value={selected.briefing_notes || "—"} />
          </div>}
        </ModalForm>

        <ModalForm open={createOpen} onClose={() => { setCreateOpen(false); setCreateForm(INIT_FORM); }} title="New Preparation" footer={<>
          <button onClick={() => { setCreateOpen(false); setCreateForm(INIT_FORM); }} disabled={createMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">Cancel</button>
          <button onClick={() => createMutation.mutate(buildPayload(createForm))} disabled={createMutation.isPending || !createForm.flight_lesson} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{createMutation.isPending ? "Creating..." : "Create"}</button>
        </>}>
          <div className="space-y-4">
            {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{createError}</div>}
            <div><label className="block text-sm text-gray-400 mb-1">Flight Lesson <span className="text-red-400">*</span></label>
              <select value={createForm.flight_lesson} onChange={(e) => setCreateForm((f) => ({ ...f, flight_lesson: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                <option value="">Select lesson...</option>{lessons.map((l: any) => <option key={l.id} value={l.id}>{l.student_name || l.id?.slice(0, 8)}</option>)}
              </select></div>
            <div className="grid grid-cols-5 gap-2">
              {([["weather_check", "Weather"], ["notam_check", "NOTAM"], ["performance_check", "Perf."], ["document_check", "Docs"], ["medical_check", "Medical"]] as const).map(([key, label]) => (
                <label key={key} className="flex flex-col items-center gap-1 p-2 bg-navy-950 border border-navy-700 rounded-lg text-xs text-gray-300">
                  <input type="checkbox" checked={(createForm as any)[key]} onChange={(e) => setCreateForm((f) => ({ ...f, [key]: e.target.checked }))} className="accent-gold-500" />
                  {label}
                </label>
              ))}
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Lesson Objectives</label><textarea rows={3} value={createForm.lesson_objectives} onChange={(e) => setCreateForm((f) => ({ ...f, lesson_objectives: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Briefing Notes</label><textarea rows={3} value={createForm.briefing_notes} onChange={(e) => setCreateForm((f) => ({ ...f, briefing_notes: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" /></div>
          </div>
        </ModalForm>

        <ModalForm open={!!editItem} onClose={() => setEditItem(null)} title="Edit Preparation" footer={<>
          <button onClick={() => setEditItem(null)} disabled={updateMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">Cancel</button>
          <button onClick={() => { if (editItem) updateMutation.mutate({ id: editItem.id, p: buildPayload(editForm) }); }} disabled={updateMutation.isPending || !editForm.flight_lesson} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{updateMutation.isPending ? "Saving..." : "Save"}</button>
        </>}>
          <div className="space-y-4">
            {editError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{editError}</div>}
            <div><label className="block text-sm text-gray-400 mb-1">Flight Lesson</label>
              <select value={editForm.flight_lesson} onChange={(e) => setEditForm((f) => ({ ...f, flight_lesson: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                <option value="">Select...</option>{lessons.map((l: any) => <option key={l.id} value={l.id}>{l.student_name || l.id?.slice(0, 8)}</option>)}
              </select></div>
            <div className="grid grid-cols-5 gap-2">
              {([["weather_check", "Weather"], ["notam_check", "NOTAM"], ["performance_check", "Perf."], ["document_check", "Docs"], ["medical_check", "Medical"]] as const).map(([key, label]) => (
                <label key={key} className="flex flex-col items-center gap-1 p-2 bg-navy-950 border border-navy-700 rounded-lg text-xs text-gray-300">
                  <input type="checkbox" checked={(editForm as any)[key]} onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.checked }))} className="accent-gold-500" />
                  {label}
                </label>
              ))}
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Lesson Objectives</label><textarea rows={3} value={editForm.lesson_objectives} onChange={(e) => setEditForm((f) => ({ ...f, lesson_objectives: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Briefing Notes</label><textarea rows={3} value={editForm.briefing_notes} onChange={(e) => setEditForm((f) => ({ ...f, briefing_notes: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
          </div>
        </ModalForm>

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white">Delete Preparation</h3>
              <p className="text-sm text-gray-400">Remove this flight preparation?</p>
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
