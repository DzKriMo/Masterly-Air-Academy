"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import type { FilterOption } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";
import { useTranslation } from "@/lib/use-translation";
const NCR_COLORS=["#ef4444","#f59e0b","#3b82f6"];

const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "major", label: "Major" },
  { value: "minor", label: "Minor" },
];

export default function NCRsPage() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", severity: "major", audit: "", responsible: "", due_date: "" });
  const { t } = useTranslation();

  const { data: ncrs=[], isLoading } = useQuery({
    queryKey: ['quality-ncrs'],
    queryFn: () => api.get<any>("/non-conformities/").then(d => d.results || []),
  });

  const { data: auditsData } = useQuery({
    queryKey: ['quality-ncrs-audits'],
    queryFn: () => api.get<any>("/audits/").then(d => d.results || []),
    enabled: showForm,
  });

  const { data: usersData } = useQuery({
    queryKey: ['quality-ncrs-users'],
    queryFn: () => api.get<any>("/users/").then(d => d.results || []),
    enabled: showForm,
  });

  const audits = auditsData || [];
  const users = usersData || [];

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing ? api.put(`/non-conformities/${editing.id}/`, data) : api.post("/non-conformities/", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality-ncrs"] });
      setShowForm(false);
      setEditing(null);
      setForm({ title: "", description: "", severity: "major", audit: "", responsible: "", due_date: "" });
      showToast("success", editing ? t('quality.ncrUpdated', 'NCR updated.') : t('quality.ncrCreated', 'NCR created.'));
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", description: "", severity: "major", audit: "", responsible: "", due_date: "" });
    setShowForm(true);
  };

  const openEdit = (ncr: any) => {
    setEditing(ncr);
    setForm({
      title: ncr.title || "",
      description: ncr.description || "",
      severity: ncr.severity || "major",
      audit: ncr.audit || "",
      responsible: ncr.responsible || "",
      due_date: ncr.due_date?.slice(0, 16) || "",
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  const filterOptions: FilterOption[] = [
    { key: "status", label: t('common.allStatuses', 'All Statuses'), options: [
      { value: "open", label: t('quality.open', 'Open') },
      { value: "closed", label: t('quality.closed', 'Closed') },
    ]},
    { key: "severity", label: t('quality.allSeverities', 'All Severities'), options: [
      { value: "critical", label: t('quality.critical', 'Critical') },
      { value: "major", label: t('quality.major', 'Major') },
      { value: "minor", label: t('quality.minor', 'Minor') },
    ]},
  ];

  const filtered = ncrs.filter((n: any) => {
    if (filters.status && n.status !== filters.status) return false;
    if (filters.severity && n.severity !== filters.severity) return false;
    if (search && !n.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const columns: Column<any>[] = [
    { key: "title", header: t('common.title', 'Title'), render: (n) => <span className="text-white font-medium">{n.title}</span> },
    { key: "ncr_number", header: t('quality.ncrNumber', 'NCR #'), render: (n) => <span className="text-xs text-gray-400">{n.ncr_number||t('common.na', 'N/A')}</span> },
    { key: "audit_title", header: t('quality.audit', 'Audit'), render: (n) => <span className="text-sm text-gray-400">{n.audit_title}</span> },
    {
      key: "severity",
      header: t('quality.severity', 'Severity'),
      render: (n) => (
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${n.severity==="critical"?"bg-red-500/10 text-red-400":n.severity==="major"?"bg-orange-500/10 text-orange-400":"bg-yellow-500/10 text-yellow-400"}`}>{n.severity}</span>
      ),
    },
    {
      key: "status",
      header: t('common.status', 'Status'),
      render: (n) => (
        <span className={`text-xs px-2 py-0.5 rounded ${n.status==="open"?"bg-red-500/10 text-red-400":"bg-green-500/10 text-green-400"}`}>{n.status}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      render: (n) => (
        n.status === "open" ? (
          <button onClick={(e) => { e.stopPropagation(); openEdit(n); }} className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded text-xs hover:bg-blue-500/20 transition-colors">{t('common.edit', 'Edit')}</button>
        ) : null
      ),
    },
  ];

  const modalFooter = (
    <>
      <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">{t('common.cancel', 'Cancel')}</button>
      <button type="submit" form="ncr-form" disabled={saveMutation.isPending} className="px-6 py-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-navy-900 font-semibold rounded-lg text-sm">{saveMutation.isPending ? t('common.loading', 'Loading...') : editing ? t('common.update', 'Update') : t('common.create', 'Create')}</button>
    </>
  );

  return (<div><nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between"><h1 className="text-lg font-bold text-white">{t('quality.nonConformities', 'Non-Conformities')}</h1><button onClick={openCreate} className="px-4 py-2 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded-lg text-sm hover:bg-gold-500 hover:text-navy-900">{t('quality.createNcr', '+ Create NCR')}</button></div></nav>
    <main className="px-6 py-8">
      <ModalForm open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? t('quality.editNcr', 'Edit NCR') : t('quality.createNcr', 'Create NCR')} footer={modalFooter}>
        <form id="ncr-form" onSubmit={handleSubmit} className="space-y-4">
          <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required placeholder={t('common.title', 'Title')} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/>
          <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required rows={3} placeholder={t('common.description', 'Description')} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/>
          <select value={form.severity} onChange={e=>setForm({...form,severity:e.target.value})} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
            {SEVERITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={form.audit} onChange={e=>setForm({...form,audit:e.target.value})} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
            <option value="">{t('common.selectAudit', 'Select audit...')}</option>
            {audits.map((a: any) => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
          <select value={form.responsible} onChange={e=>setForm({...form,responsible:e.target.value})} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
            <option value="">{t('common.selectResponsible', 'Select responsible...')}</option>
            {users.map((u: any) => <option key={u.id} value={u.id}>{u.email}</option>)}
          </select>
          <input value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} type="datetime-local" className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/>
        </form>
      </ModalForm>

      {isLoading?<LoadingSkeleton type="table" rows={5}/>:ncrs.length===0?<EmptyState message={t('quality.noNcrs', 'No NCRs found.')}/>:<>
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8"><h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('quality.ncrsBySeverity', 'NCRs by Severity')}</h3><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={[{name:t('quality.critical','Critical'),value:ncrs.filter((n:any)=>n.severity==="critical").length},{name:t('quality.major','Major'),value:ncrs.filter((n:any)=>n.severity==="major").length},{name:t('quality.minor','Minor'),value:ncrs.filter((n:any)=>n.severity==="minor").length}]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({name,value}:any)=>`${name}: ${value}`}>{[0,1,2].map(i=><Cell key={i} fill={NCR_COLORS[i]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div>
        <FilterBar filters={filterOptions} values={filters} onChange={(k,v)=>setFilters(p=>({...p,[k]:v}))} onClear={()=>{setFilters({});setSearch("")}} searchValue={search} onSearchChange={setSearch} searchPlaceholder={t('quality.searchNcrs', 'Search NCRs...')}/>
        <DataTable columns={columns} data={filtered} keyField="id"/>
      </>}</main></div>);
}
