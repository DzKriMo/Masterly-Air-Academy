"use client";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useTranslation } from "@/lib/use-translation";
import { PageHeader } from "@/components/page-header";
import { api, unwrapResults, withFullLimit } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";
import { DetailField } from "@/components/detail-field";
import { formatDate } from "@/lib/format-utils";

interface RiskAssessment {
  id: string;
  hazard: string;
  description: string | null;
  probability: number;
  severity: number;
  risk_level: number;
  mitigation_measures: string | null;
  responsible: string | null;
  reeval_date: string | null;
  status: string;
}

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-500/10 text-green-400",
  medium: "bg-amber-500/10 text-amber-400",
  high: "bg-orange-500/10 text-orange-400",
  critical: "bg-red-500/10 text-red-400",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-400",
  inactive: "bg-gray-500/10 text-gray-400",
};

function getRiskCategory(level: number): { label: string; color: string } {
  if (level <= 4) return { label: "Low", color: RISK_COLORS.low };
  if (level <= 9) return { label: "Medium", color: RISK_COLORS.medium };
  if (level <= 15) return { label: "High", color: RISK_COLORS.high };
  return { label: "Critical", color: RISK_COLORS.critical };
}



export default function AdminRiskAssessmentsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");
  const [selected, setSelected] = useState<RiskAssessment | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ hazard: "", description: "", probability: "3", severity: "3", mitigation_measures: "", reeval_date: "", status: "active" });
  const [createError, setCreateError] = useState("");
  const [editItem, setEditItem] = useState<RiskAssessment | null>(null);
  const [editForm, setEditForm] = useState({ hazard: "", description: "", probability: "3", severity: "3", mitigation_measures: "", reeval_date: "", status: "active" });
  const [editError, setEditError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<RiskAssessment | null>(null);

  const { data: assessments, isLoading, error, refetch } = useQuery<RiskAssessment[]>({
    queryKey: ["admin-risk-assessments"],
    queryFn: async () => { const d = await api.get<any>(withFullLimit("/risk-assessments/")); return unwrapResults(d); },
    enabled: isAuthenticated,
  });

  const buildPayload = (form: typeof createForm) => ({
    hazard: form.hazard,
    description: form.description || null,
    probability: parseInt(form.probability, 10),
    severity: parseInt(form.severity, 10),
    mitigation_measures: form.mitigation_measures || null,
    reeval_date: form.reeval_date || null,
    status: form.status,
  });

  const createMutation = useMutation({
    mutationFn: (p: ReturnType<typeof buildPayload>) => api.post("/risk-assessments/", p),
    onSuccess: () => { showToast("success", "Risk assessment created"); setCreateOpen(false); setCreateForm({ hazard: "", description: "", probability: "3", severity: "3", mitigation_measures: "", reeval_date: "", status: "active" }); setCreateError(""); queryClient.invalidateQueries({ queryKey: ["admin-risk-assessments"] }); },
    onError: (err: any) => { setCreateError(err?.data ? Object.values(err.data).flat().join(", ") : err.message); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReturnType<typeof buildPayload> }) => api.patch(`/risk-assessments/${id}/`, payload),
    onSuccess: () => { showToast("success", "Updated"); setEditItem(null); queryClient.invalidateQueries({ queryKey: ["admin-risk-assessments"] }); },
    onError: (err: any) => { setEditError(err?.data ? Object.values(err.data).flat().join(", ") : err.message); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/risk-assessments/${id}/`),
    onSuccess: () => { showToast("success", "Deleted"); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ["admin-risk-assessments"] }); },
    onError: (err: any) => { showToast("error", err.message); },
  });

  const filtered = useMemo(() => {
    if (!assessments) return [];
    let r = assessments;
    if (filterValues.status) r = r.filter((a) => a.status === filterValues.status);
    if (searchValue) { const q = searchValue.toLowerCase(); r = r.filter((a) => a.hazard.toLowerCase().includes(q)); }
    return r;
  }, [assessments, filterValues, searchValue]);

  const computedRiskLevel = useMemo(() => {
    const p = parseInt(createForm.probability, 10) || 1;
    const s = parseInt(createForm.severity, 10) || 1;
    return p * s;
  }, [createForm.probability, createForm.severity]);

  const computedRiskLevelEdit = useMemo(() => {
    const p = parseInt(editForm.probability, 10) || 1;
    const s = parseInt(editForm.severity, 10) || 1;
    return p * s;
  }, [editForm.probability, editForm.severity]);

  const columns: Column<RiskAssessment>[] = useMemo(() => [
    { key: "hazard", header: "Hazard", render: (a) => <span className="text-sm font-semibold text-white">{a.hazard}</span> },
    { key: "probability", header: "P", render: (a) => <span className="text-sm text-gray-300 font-mono">{a.probability}</span> },
    { key: "severity", header: "S", render: (a) => <span className="text-sm text-gray-300 font-mono">{a.severity}</span> },
    {
      key: "risk_level", header: "Risk",
      render: (a) => { const r = getRiskCategory(a.risk_level); return <span className={`text-xs px-2 py-0.5 rounded ${r.color}`}>{r.label} ({a.risk_level})</span>; },
    },
    { key: "status", header: "Status", render: (a) => <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[a.status] || "bg-gray-500/10 text-gray-400"}`}>{a.status.charAt(0).toUpperCase() + a.status.slice(1)}</span> },
    { key: "reeval_date", header: "Re-eval", render: (a) => <span className="text-sm text-gray-400">{formatDate(a.reeval_date)}</span> },
    {
      key: "actions", header: "", render: (a) => (
        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { setEditItem(a); setEditForm({ hazard: a.hazard, description: a.description || "", probability: String(a.probability), severity: String(a.severity), mitigation_measures: a.mitigation_measures || "", reeval_date: a.reeval_date ? new Date(a.reeval_date).toISOString().slice(0, 16) : "", status: a.status }); setEditError(""); }} className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded">{t('common.edit')}</button>
          <button onClick={() => setDeleteTarget(a)} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded">{t('common.delete')}</button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader title={t("admin.riskAssessments", "Risk Assessments")} backHref="/admin/dashboard" backLabel={t("common.back", "Back to Dashboard")} actions={<button onClick={() => setCreateOpen(true)} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400">+ New Assessment</button>} />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={error?.message || "Failed to load"} onRetry={() => refetch()} />}
        <FilterBar filters={[{ key: "status", label: "All Statuses", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] }]} values={filterValues} onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))} onClear={() => { setFilterValues({}); setSearchValue(""); }} searchValue={searchValue} onSearchChange={setSearchValue} searchPlaceholder="Search hazards..." />
        {isLoading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? <EmptyState message={assessments?.length === 0 ? "No risk assessments yet." : "No matches."} title={assessments?.length === 0 ? "No assessments yet" : "No matches"} action={assessments?.length === 0 ? { label: "New Assessment", onClick: () => setCreateOpen(true) } : undefined} /> : <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(item) => setSelected(item as RiskAssessment)} />}

        {/* Detail */}
        <ModalForm open={!!selected} onClose={() => setSelected(null)} title="Risk Assessment" footer={<button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">{t('common.close')}</button>}>
          {selected && (
            <div className="space-y-4">
              <DetailField label="Hazard" value={selected.hazard} />
              <div className="grid grid-cols-3 gap-4">
                <DetailField label="Probability" value={String(selected.probability)} />
                <DetailField label="Severity" value={String(selected.severity)} />
                <div><p className="text-xs text-gray-500 mb-0.5">Risk Level</p><span className={`text-xs px-2 py-0.5 rounded ${getRiskCategory(selected.risk_level).color}`}>{getRiskCategory(selected.risk_level).label} ({selected.risk_level})</span></div>
              </div>
              <DetailField label="Description" value={selected.description || "—"} />
              <DetailField label="Mitigation Measures" value={selected.mitigation_measures || "—"} />
              <DetailField label="Re-evaluation Date" value={formatDate(selected.reeval_date)} />
              <DetailField label="Status" value={selected.status} />
            </div>
          )}
        </ModalForm>

        {/* Create */}
        <ModalForm open={createOpen} onClose={() => { setCreateOpen(false); setCreateForm({ hazard: "", description: "", probability: "3", severity: "3", mitigation_measures: "", reeval_date: "", status: "active" }); setCreateError(""); }} title="New Risk Assessment" footer={<><button onClick={() => { setCreateOpen(false); setCreateForm({ hazard: "", description: "", probability: "3", severity: "3", mitigation_measures: "", reeval_date: "", status: "active" }); setCreateError(""); }} disabled={createMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button><button onClick={() => createMutation.mutate(buildPayload(createForm))} disabled={createMutation.isPending || !createForm.hazard} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{createMutation.isPending ? "Creating..." : "Create"}</button></>}>
          <div className="space-y-4">
            {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{createError}</div>}
            <div><label className="block text-sm text-gray-400 mb-1">Hazard <span className="text-red-400">*</span></label><input type="text" value={createForm.hazard} onChange={(e) => setCreateForm((f) => ({ ...f, hazard: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Description</label><textarea value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none resize-none" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Probability (1-5) <span className="text-red-400">*</span></label><input type="number" min="1" max="5" value={createForm.probability} onChange={(e) => setCreateForm((f) => ({ ...f, probability: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Severity (1-5) <span className="text-red-400">*</span></label><input type="number" min="1" max="5" value={createForm.severity} onChange={(e) => setCreateForm((f) => ({ ...f, severity: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            </div>
            <div className="p-3 bg-navy-700/50 rounded-lg text-center"><span className="text-sm text-gray-400">Risk Level: </span><span className={`text-sm px-2 py-0.5 rounded font-semibold ${getRiskCategory(computedRiskLevel).color}`}>{getRiskCategory(computedRiskLevel).label} ({computedRiskLevel})</span></div>
            <div><label className="block text-sm text-gray-400 mb-1">Mitigation Measures</label><textarea value={createForm.mitigation_measures} onChange={(e) => setCreateForm((f) => ({ ...f, mitigation_measures: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none resize-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Re-evaluation Date</label><input type="datetime-local" value={createForm.reeval_date} onChange={(e) => setCreateForm((f) => ({ ...f, reeval_date: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Status</label><select value={createForm.status} onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
          </div>
        </ModalForm>

        {/* Edit */}
        <ModalForm open={!!editItem} onClose={() => setEditItem(null)} title="Edit Risk Assessment" footer={<><button onClick={() => setEditItem(null)} disabled={updateMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button><button onClick={() => { if (editItem) updateMutation.mutate({ id: editItem.id, payload: buildPayload(editForm) }); }} disabled={updateMutation.isPending || !editForm.hazard} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{updateMutation.isPending ? "Saving..." : "Save"}</button></>}>
          <div className="space-y-4">
            {editError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{editError}</div>}
            <div><label className="block text-sm text-gray-400 mb-1">Hazard</label><input type="text" value={editForm.hazard} onChange={(e) => setEditForm((f) => ({ ...f, hazard: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Description</label><textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none resize-none" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Probability (1-5)</label><input type="number" min="1" max="5" value={editForm.probability} onChange={(e) => setEditForm((f) => ({ ...f, probability: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Severity (1-5)</label><input type="number" min="1" max="5" value={editForm.severity} onChange={(e) => setEditForm((f) => ({ ...f, severity: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            </div>
            <div className="p-3 bg-navy-700/50 rounded-lg text-center"><span className="text-sm text-gray-400">Risk Level: </span><span className={`text-sm px-2 py-0.5 rounded font-semibold ${getRiskCategory(computedRiskLevelEdit).color}`}>{getRiskCategory(computedRiskLevelEdit).label} ({computedRiskLevelEdit})</span></div>
            <div><label className="block text-sm text-gray-400 mb-1">Mitigation Measures</label><textarea value={editForm.mitigation_measures} onChange={(e) => setEditForm((f) => ({ ...f, mitigation_measures: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none resize-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Re-evaluation Date</label><input type="datetime-local" value={editForm.reeval_date} onChange={(e) => setEditForm((f) => ({ ...f, reeval_date: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Status</label><select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
          </div>
        </ModalForm>

        {/* Delete */}
        {deleteTarget && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}><div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}><h3 className="text-lg font-semibold text-white">Delete Assessment</h3><p className="text-sm text-gray-400">Delete "{deleteTarget.hazard}"?</p><div className="flex justify-end gap-3 pt-2"><button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button><button onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 disabled:opacity-50">{deleteMutation.isPending ? "Deleting..." : "Delete"}</button></div></div></div>}
      </main>
    </div>
  );
}

