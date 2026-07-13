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

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['quality-safety'],
    queryFn: () => api.get("/safety-events/").then(r=>r.data),
  });
  const events = eventsData?.results || [];

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

  const filterOptions: FilterOption[] = [
    { key: "status", label: t('common.allStatuses', 'All Statuses'), options: [
      { value: "reported", label: t('quality.reported', 'Reported') },
      { value: "investigating", label: t('quality.investigating', 'Investigating') },
      { value: "resolved", label: t('quality.resolved', 'Resolved') },
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

  const columns: Column<any>[] = [
    { key: "title", header: t('common.title', 'Title'), render: (e) => <span className="text-white font-medium">{e.title}</span> },
    { key: "type", header: t('common.type', 'Type'), render: (e) => <span className="text-sm text-gray-400">{e.type}</span> },
    {
      key: "status",
      header: t('common.status', 'Status'),
      render: (e) => (
        <span className={`text-xs px-2 py-0.5 rounded ${e.status==="reported"?"bg-yellow-500/10 text-yellow-400":"bg-green-500/10 text-green-400"}`}>{e.status}</span>
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
    <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between"><h1 className="text-lg font-bold text-white">{t('quality.safetyEvents', 'Safety Events')}</h1><button onClick={()=>setShow(!show)} className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500 hover:text-white">{show ? t('common.cancel', 'Cancel') : t('quality.reportEvent', '+ Report Event')}</button></div></nav>
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

      {isLoading?<LoadingSkeleton type="table" rows={5}/>:filtered.length===0&&events.length===0?<EmptyState message={t('quality.noEvents', 'No events reported.')}/>:<>
        <FilterBar filters={filterOptions} values={filters} onChange={(k,v)=>setFilters(p=>({...p,[k]:v}))} onClear={()=>{setFilters({});setSearch("")}} searchValue={search} onSearchChange={setSearch} searchPlaceholder={t('quality.searchEvents', 'Search events...')}/>
        <DataTable columns={columns} data={filtered} keyField="id"/>
      </>}</main></div>);
}
