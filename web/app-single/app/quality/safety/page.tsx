"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { safetySchema } from "@/lib/validators";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import type { FilterOption } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";
import { useTranslation } from "@/lib/use-translation";

export default function SafetyPage() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ title: "", type: "incident", description: "", confidential: false });
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { t } = useTranslation();

  // Analyze modal state
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analysisText, setAnalysisText] = useState("");

  // Resolve confirm dialog state
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['quality-safety'],
    queryFn: () => api.get("/safety-events/"),
  });
  const events = (eventsData as any)?.results || [];

  const reportEvent = useMutation({
    mutationFn: (data: typeof form) => api.post("/safety-events/", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality-safety"] });
      setShow(false);
      setForm({ title: "", type: "incident", description: "", confidential: false });
      showToast("success", t('quality.eventReported', 'Safety event reported.'));
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const handleReport = (e: React.FormEvent) => {
    e.preventDefault();
    const v = safetySchema.safeParse(form);
    if (!v.success) { showToast("error", v.error.errors[0].message); return; }
    reportEvent.mutate(form);
  };

  const transitionEvent = useMutation({
    mutationFn: ({ id, action, analysis }: { id: string; action: string; analysis?: string }) => {
      const body = action === 'analyze' && analysis ? { analysis } : undefined;
      return api.post(`/safety-events/${id}/${action}/`, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality-safety"] });
      showToast("success", t('quality.statusUpdated', 'Status updated.'));
      setAnalyzingId(null);
      setAnalysisText("");
      setResolvingId(null);
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const filterOptions: FilterOption[] = [
    { key: "status", label: t('common.allStatuses', 'All Statuses'), options: [
      { value: "reported", label: t('quality.reported', 'Reported') },
      { value: "investigating", label: t('quality.investigating', 'Investigating') },
      { value: "analyzed", label: t('quality.analyzed', 'Analyzed') },
      { value: "resolved", label: t('quality.resolved', 'Resolved') },
      { value: "closed", label: t('quality.closed', 'Closed') },
    ]},
    { key: "type", label: t('quality.allTypes', 'All Types'), options: [
      { value: "incident", label: t('quality.incident', 'Incident') },
      { value: "near_miss", label: t('quality.nearMiss', 'Near Miss') },
      { value: "hazard", label: t('quality.hazard', 'Hazard') },
      { value: "observation", label: t('quality.observation', 'Observation') },
    ]},
  ];

  const filtered = events.filter((e: any) => {
    if (filters.status && e.status !== filters.status) return false;
    if (filters.type && e.type !== filters.type) return false;
    if (search && !e.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      reported: "bg-yellow-500/10 text-yellow-400",
      investigating: "bg-blue-500/10 text-blue-400",
      analyzed: "bg-purple-500/10 text-purple-400",
      resolved: "bg-green-500/10 text-green-400",
      closed: "bg-gray-500/10 text-gray-400",
    };
    return colors[status] || "bg-gray-500/10 text-gray-400";
  };

  const columns: Column<any>[] = [
    { key: "title", header: t('common.title', 'Title'), render: (e) => <span className="text-white font-medium">{e.title}</span> },
    { key: "type", header: t('common.type', 'Type'), render: (e) => <span className="text-sm text-gray-400">{e.type}</span> },
    {
      key: "status",
      header: t('common.status', 'Status'),
      render: (e) => (
        <span className={`text-xs px-2 py-0.5 rounded ${statusColor(e.status)}`}>{e.status}</span>
      ),
    },
    {
      key: "actions",
      header: t('common.actions', 'Actions'),
      render: (e) => (
        <div className="flex items-center gap-2">
          {e.status === "reported" && (
            <button
              onClick={() => transitionEvent.mutate({ id: e.id, action: 'investigate' })}
              disabled={transitionEvent.isPending}
              className="text-xs px-3 py-1 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 disabled:opacity-50"
            >
              {t('quality.investigate', 'Investigate')}
            </button>
          )}
          {e.status === "investigating" && (
            <button
              onClick={() => { setAnalyzingId(e.id); setAnalysisText(e.analysis || ""); }}
              className="text-xs px-3 py-1 rounded bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
            >
              {t('quality.analyze', 'Analyze')}
            </button>
          )}
          {e.status === "analyzed" && (
            <button
              onClick={() => setResolvingId(e.id)}
              className="text-xs px-3 py-1 rounded bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20"
            >
              {t('quality.resolve', 'Resolve')}
            </button>
          )}
        </div>
      ),
    },
  ];

  const modalFooter = (
    <>
      <button type="button" onClick={() => setShow(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">{t('common.cancel', 'Cancel')}</button>
      <button type="submit" form="safety-form" disabled={reportEvent.isPending} className="px-6 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold rounded-lg text-sm">{reportEvent.isPending ? t('common.loading', 'Loading...') : t('quality.submitReport', 'Submit Report')}</button>
    </>
  );

  return (<div className="flex-1 min-w-0">
    <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between"><h1 className="text-lg font-bold text-white">{t('quality.safetyEvents', 'Safety Events')}</h1><button onClick={()=>setShow(!show)} className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500 hover:text-white">{show ? t('common.cancel', 'Cancel') : t('quality.reportEvent', '+ Report Event')}</button></div></nav>
    <main className="px-6 py-8">
      <ModalForm open={show} onClose={()=>setShow(false)} title={t('quality.reportSafetyEvent', 'Report Safety Event')} footer={modalFooter}>
        <form id="safety-form" onSubmit={handleReport} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required placeholder={t('common.title', 'Title')} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/>
            <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"><option value="incident">{t('quality.incident', 'Incident')}</option><option value="near_miss">{t('quality.nearMiss', 'Near Miss')}</option><option value="hazard">{t('quality.hazard', 'Hazard')}</option><option value="observation">{t('quality.observation', 'Observation')}</option></select>
          </div>
          <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required rows={3} placeholder={t('common.description', 'Description')} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="conf" checked={form.confidential} onChange={e=>setForm({...form,confidential:e.target.checked})}/>
            <label htmlFor="conf" className="text-sm text-gray-400">{t('quality.reportAnonymously', 'Report anonymously')}</label>
          </div>
        </form>
      </ModalForm>

      {/* Analyze modal */}
      <ModalForm
        open={analyzingId !== null}
        onClose={() => { setAnalyzingId(null); setAnalysisText(""); }}
        title={t('quality.analyzeEvent', 'Analyze Event')}
        footer={
          <>
            <button type="button" onClick={() => { setAnalyzingId(null); setAnalysisText(""); }} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">{t('common.cancel', 'Cancel')}</button>
            <button
              type="button"
              onClick={() => analyzingId && transitionEvent.mutate({ id: analyzingId, action: 'analyze', analysis: analysisText })}
              disabled={transitionEvent.isPending}
              className="px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-semibold rounded-lg text-sm"
            >
              {transitionEvent.isPending ? t('common.loading', 'Loading...') : t('quality.submitAnalysis', 'Submit Analysis')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <textarea
            value={analysisText}
            onChange={e => setAnalysisText(e.target.value)}
            rows={5}
            placeholder={t('quality.analysisPlaceholder', 'Enter analysis findings...')}
            className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"
          />
        </div>
      </ModalForm>

      {/* Resolve confirm dialog */}
      <ConfirmDialog
        open={resolvingId !== null}
        onClose={() => setResolvingId(null)}
        onConfirm={() => resolvingId && transitionEvent.mutate({ id: resolvingId, action: 'resolve' })}
        title={t('quality.resolveEvent', 'Resolve Event')}
        message={t('quality.resolveConfirm', 'Are you sure you want to resolve this safety event? This will mark it as resolved and set the closure timestamp.')}
        confirmLabel={t('quality.resolve', 'Resolve')}
        destructive={false}
        loading={transitionEvent.isPending}
      />

      {isLoading?<LoadingSkeleton type="table" rows={5}/>:filtered.length===0&&events.length===0?<EmptyState message={t('quality.noEvents', 'No events reported.')}/>:<>
        <FilterBar filters={filterOptions} values={filters} onChange={(k,v)=>setFilters(p=>({...p,[k]:v}))} onClear={()=>{setFilters({});setSearch("")}} searchValue={search} onSearchChange={setSearch} searchPlaceholder={t('quality.searchEvents', 'Search events...')}/>
        <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(e) => setSelectedEvent(e as any)}/>
      </>}

      <ModalForm open={!!selectedEvent} onClose={() => setSelectedEvent(null)} title={selectedEvent?.title || ''} footer={<button onClick={() => setSelectedEvent(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">Close</button>}>
        {selectedEvent && (<div className="space-y-4"><div className="grid grid-cols-2 gap-4">
          <div><p className="text-xs text-gray-500 mb-0.5">Type</p><p className="text-sm text-white">{selectedEvent.type}</p></div>
          <div><p className="text-xs text-gray-500 mb-0.5">Status</p><p className="text-sm text-white">{selectedEvent.status}</p></div>
          <div><p className="text-xs text-gray-500 mb-0.5">Reported At</p><p className="text-sm text-white">{selectedEvent.created_at?.slice(0,10)||'—'}</p></div>
          <div className="col-span-2"><p className="text-xs text-gray-500 mb-0.5">Description</p><p className="text-sm text-white">{selectedEvent.description||'—'}</p></div>
          {selectedEvent.analysis&&<div className="col-span-2"><p className="text-xs text-gray-500 mb-0.5">Analysis</p><p className="text-sm text-white">{selectedEvent.analysis}</p></div>}
        </div></div>)}
      </ModalForm>
      </main></div>);
}
