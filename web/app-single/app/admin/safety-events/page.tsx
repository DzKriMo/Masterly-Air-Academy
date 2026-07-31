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

interface SafetyEvent {
  id: string;
  title: string;
  type: string;
  description: string;
  reported_by: string | null;
  reporter_name: string;
  confidential: boolean;
  analysis: string | null;
  status: string;
  closed_at: string | null;
  created_at: string;
}

const EVENT_TYPES = ["incident", "accident", "near_miss", "hazard_report"];

const EVENT_STATUSES = ["reported", "investigating", "analyzed", "resolved", "closed"];

const TYPE_COLORS: Record<string, string> = {
  incident: "bg-red-500/10 text-red-400",
  accident: "bg-red-500/10 text-red-400",
  near_miss: "bg-amber-500/10 text-amber-400",
  hazard_report: "bg-blue-500/10 text-blue-400",
};

const STATUS_COLORS: Record<string, string> = {
  reported: "bg-gray-500/10 text-gray-400",
  investigating: "bg-blue-500/10 text-blue-400",
  analyzed: "bg-amber-500/10 text-amber-400",
  resolved: "bg-green-500/10 text-green-400",
  closed: "bg-gray-500/10 text-gray-400",
};

const fmtStatus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try { return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return "—"; }
}

export default function AdminSafetyEventsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");
  const [selected, setSelected] = useState<SafetyEvent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", type: "incident", description: "", confidential: false });
  const [createError, setCreateError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SafetyEvent | null>(null);

  // Analyze modal state
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [analyzeTarget, setAnalyzeTarget] = useState<SafetyEvent | null>(null);
  const [analysisText, setAnalysisText] = useState("");

  const { data: events, isLoading, error, refetch } = useQuery<SafetyEvent[]>({
    queryKey: ["admin-safety-events"],
    queryFn: async () => { const d = await api.get<any>("/safety-events/"); return unwrapResults(d); },
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: (p: typeof createForm) => api.post("/safety-events/", p),
    onSuccess: () => { showToast("success", "Safety event reported"); setCreateOpen(false); setCreateForm({ title: "", type: "incident", description: "", confidential: false }); setCreateError(""); queryClient.invalidateQueries({ queryKey: ["admin-safety-events"] }); },
    onError: (err: any) => { setCreateError(err?.data ? Object.values(err.data).flat().join(", ") : err.message); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/safety-events/${id}/`),
    onSuccess: () => { showToast("success", "Event deleted"); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ["admin-safety-events"] }); },
    onError: (err: any) => { showToast("error", err.message); },
  });

  const transitionMutation = useMutation({
    mutationFn: ({ id, action, data }: { id: string; action: string; data?: any }) => api.post(`/safety-events/${id}/${action}/`, data || {}),
    onSuccess: () => { showToast("success", "Status updated"); setSelected(null); setAnalyzeOpen(false); queryClient.invalidateQueries({ queryKey: ["admin-safety-events"] }); },
    onError: (err: any) => { showToast("error", err.message || "Failed to update status"); },
  });

  const filtered = useMemo(() => {
    if (!events) return [];
    let r = events;
    if (filterValues.type) r = r.filter((e) => e.type === filterValues.type);
    if (filterValues.status) r = r.filter((e) => e.status === filterValues.status);
    if (searchValue) { const q = searchValue.toLowerCase(); r = r.filter((e) => e.title.toLowerCase().includes(q) || (e.reporter_name || "").toLowerCase().includes(q)); }
    return r;
  }, [events, filterValues, searchValue]);

  const columns: Column<SafetyEvent>[] = useMemo(() => [
    { key: "title", header: "Title", render: (e) => <span className="text-sm font-semibold text-white">{e.title}</span> },
    { key: "type", header: "Type", render: (e) => <span className={`text-xs px-2 py-0.5 rounded ${TYPE_COLORS[e.type] || "bg-gray-500/10 text-gray-400"}`}>{fmtStatus(e.type)}</span> },
    { key: "reporter_name", header: "Reported By", render: (e) => <span className="text-sm text-gray-300">{e.confidential ? "Anonymous" : e.reporter_name}</span> },
    { key: "status", header: "Status", render: (e) => <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[e.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtStatus(e.status)}</span> },
    { key: "created_at", header: "Date", render: (e) => <span className="text-sm text-gray-400">{formatDate(e.created_at)}</span> },
    {
      key: "actions", header: "", render: (e) => (
        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setDeleteTarget(e)} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded">{t('common.delete')}</button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader title={t("admin.safetyEvents", "Safety Events")} backHref="/admin/dashboard" backLabel={t("common.back", "Back to Dashboard")} actions={<button onClick={() => setCreateOpen(true)} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400">+ Report Event</button>} />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={error?.message || "Failed to load"} onRetry={() => refetch()} />}
        <FilterBar filters={[{ key: "type", label: "All Types", options: EVENT_TYPES.map((t) => ({ value: t, label: fmtStatus(t) })) }, { key: "status", label: "All Statuses", options: EVENT_STATUSES.map((s) => ({ value: s, label: fmtStatus(s) })) }]} values={filterValues} onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))} onClear={() => { setFilterValues({}); setSearchValue(""); }} searchValue={searchValue} onSearchChange={setSearchValue} searchPlaceholder="Search events..." />
        {isLoading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? <EmptyState message={events?.length === 0 ? "No safety events reported." : "No matches."} title={events?.length === 0 ? "No events yet" : "No matches"} action={events?.length === 0 ? { label: "Report Event", onClick: () => setCreateOpen(true) } : undefined} /> : <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(item) => setSelected(item as SafetyEvent)} />}

        {/* Detail Modal */}
        <ModalForm open={!!selected} onClose={() => setSelected(null)} title={selected?.title || "Event Details"} wide footer={<button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">{t('common.close')}</button>}>
          {selected && (
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Event Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Title" value={selected.title} />
                  <DetailField label="Type" value={fmtStatus(selected.type)} />
                  <DetailField label="Reported By" value={selected.confidential ? "Anonymous" : selected.reporter_name} />
                  <DetailField label="Status" value={fmtStatus(selected.status)} />
                  <DetailField label="Date" value={formatDate(selected.created_at)} />
                  <DetailField label="Confidential" value={selected.confidential ? "Yes" : "No"} />
                  <div className="col-span-2"><DetailField label="Description" value={selected.description} /></div>
                  {selected.analysis && <div className="col-span-2"><DetailField label="Analysis" value={selected.analysis} /></div>}
                </div>
              </section>
              <section>
                <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Actions</h3>
                <div className="flex gap-3">
                  {selected.status === "reported" && (
                    <button onClick={() => transitionMutation.mutate({ id: selected.id, action: "investigate" })} disabled={transitionMutation.isPending} className="px-4 py-2 text-sm bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 disabled:opacity-50">
                      Start Investigation
                    </button>
                  )}
                  {selected.status === "investigating" && (
                    <button onClick={() => { setAnalyzeTarget(selected); setAnalysisText(selected.analysis || ""); setAnalyzeOpen(true); }} className="px-4 py-2 text-sm bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/20">
                      Add Analysis
                    </button>
                  )}
                  {selected.status === "analyzed" && (
                    <button onClick={() => transitionMutation.mutate({ id: selected.id, action: "resolve" })} disabled={transitionMutation.isPending} className="px-4 py-2 text-sm bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/20 disabled:opacity-50">
                      Resolve Event
                    </button>
                  )}
                  {(selected.status === "resolved" || selected.status === "closed") && (
                    <p className="text-sm text-gray-500 italic">No further actions available.</p>
                  )}
                </div>
              </section>
            </div>
          )}
        </ModalForm>

        {/* Analyze Modal */}
        <ModalForm open={analyzeOpen} onClose={() => setAnalyzeOpen(false)} title="Add Analysis" footer={<><button onClick={() => setAnalyzeOpen(false)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">{t('common.cancel')}</button><button onClick={() => { if (analyzeTarget) transitionMutation.mutate({ id: analyzeTarget.id, action: "analyze", data: { analysis: analysisText } }); }} disabled={transitionMutation.isPending || !analysisText} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{transitionMutation.isPending ? "Saving..." : "Submit Analysis"}</button></>}>
          <div className="space-y-4">
            <div><label className="block text-sm text-gray-400 mb-1">Analysis <span className="text-red-400">*</span></label><textarea value={analysisText} onChange={(e) => setAnalysisText(e.target.value)} rows={6} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none resize-none" placeholder="Enter your analysis of the event..." /></div>
          </div>
        </ModalForm>

        {/* Create Modal */}
        <ModalForm open={createOpen} onClose={() => { setCreateOpen(false); setCreateForm({ title: "", type: "incident", description: "", confidential: false }); setCreateError(""); }} title="Report Safety Event" footer={<><button onClick={() => { setCreateOpen(false); setCreateForm({ title: "", type: "incident", description: "", confidential: false }); setCreateError(""); }} disabled={createMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button><button onClick={() => createMutation.mutate(createForm)} disabled={createMutation.isPending || !createForm.title || !createForm.description} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{createMutation.isPending ? "Submitting..." : "Submit Report"}</button></>}>
          <div className="space-y-4">
            {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{createError}</div>}
            <div><label className="block text-sm text-gray-400 mb-1">Title <span className="text-red-400">*</span></label><input type="text" value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Type <span className="text-red-400">*</span></label><select value={createForm.type} onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">{EVENT_TYPES.map((t) => <option key={t} value={t}>{fmtStatus(t)}</option>)}</select></div>
            <div><label className="block text-sm text-gray-400 mb-1">Description <span className="text-red-400">*</span></label><textarea value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} rows={4} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none resize-none" placeholder="Describe what happened..." /></div>
            <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={createForm.confidential} onChange={(e) => setCreateForm((f) => ({ ...f, confidential: e.target.checked }))} className="w-4 h-4 rounded bg-navy-900 border-navy-700 text-gold-500 focus:ring-gold-500/30" /><span className="text-sm text-gray-300">Report anonymously (confidential)</span></label>
          </div>
        </ModalForm>

        {/* Delete */}
        {deleteTarget && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}><div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}><h3 className="text-lg font-semibold text-white">Delete Event</h3><p className="text-sm text-gray-400">Delete "{deleteTarget.title}"?</p><div className="flex justify-end gap-3 pt-2"><button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button><button onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 disabled:opacity-50">{deleteMutation.isPending ? "Deleting..." : "Delete"}</button></div></div></div>}
      </main>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-gray-500 mb-0.5">{label}</p><p className="text-sm text-white">{value}</p></div>;
}