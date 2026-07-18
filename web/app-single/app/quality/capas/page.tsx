"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import type { FilterOption } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";
import { useTranslation } from "@/lib/use-translation";

const CAPA_TYPES = [
  { value: "corrective", label: "Corrective" },
  { value: "preventive", label: "Preventive" },
];

export default function CAPAsPage() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ type: "corrective", title: "", description: "", non_conformity: "", responsible: "", due_date: "" });
  const { t } = useTranslation();

  const { data: capas=[], isLoading } = useQuery({
    queryKey: ['quality-capas'],
    queryFn: () => api.get<any>("/capas/").then(d => d.results || []),
  });

  const { data: ncrsData } = useQuery({
    queryKey: ['quality-capas-ncrs'],
    queryFn: () => api.get<any>("/non-conformities/").then(d => d.results || []),
    enabled: showForm,
  });

  const { data: usersData } = useQuery({
    queryKey: ['quality-capas-users'],
    queryFn: () => api.get<any>("/users/").then(d => d.results || []),
    enabled: showForm,
  });

  const ncrs = ncrsData || [];
  const users = usersData || [];

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing ? api.put(`/capas/${editing.id}/`, data) : api.post("/capas/", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality-capas"] });
      setShowForm(false);
      setEditing(null);
      setForm({ type: "corrective", title: "", description: "", non_conformity: "", responsible: "", due_date: "" });
      showToast("success", editing ? t('quality.capaUpdated', 'CAPA updated.') : t('quality.capaCreated', 'CAPA created.'));
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ type: "corrective", title: "", description: "", non_conformity: "", responsible: "", due_date: "" });
    setShowForm(true);
  };

  const openEdit = (capa: any) => {
    setEditing(capa);
    setForm({
      type: capa.type || "corrective",
      title: capa.title || "",
      description: capa.description || "",
      non_conformity: capa.non_conformity || "",
      responsible: capa.responsible || "",
      due_date: capa.due_date?.slice(0, 16) || "",
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
      { value: "in_progress", label: t('quality.inProgress', 'In Progress') },
      { value: "closed", label: t('quality.closed', 'Closed') },
    ]},
    { key: "type", label: t('quality.allTypes', 'All Types'), options: [
      { value: "corrective", label: t('quality.corrective', 'Corrective') },
      { value: "preventive", label: t('quality.preventive', 'Preventive') },
    ]},
  ];

  const filtered = capas.filter((c: any) => {
    if (filters.status && c.status !== filters.status) return false;
    if (filters.type && c.type !== filters.type) return false;
    if (search && !c.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const columns: Column<any>[] = [
    { key: "title", header: t('common.title', 'Title'), render: (c) => <span className="text-white font-medium">{c.title}</span> },
    { key: "capa_number", header: t('quality.capaNumber', 'CAPA #'), render: (c) => <span className="text-xs text-gray-400">{c.capa_number||t('common.na', 'N/A')}</span> },
    { key: "ncr_title", header: t('quality.relatedNcr', 'Related NCR'), render: (c) => <span className="text-sm text-gray-400">{c.ncr_title}</span> },
    { key: "due_date", header: t('quality.dueDate', 'Due Date'), render: (c) => <span className="text-xs text-gray-400">{c.due_date?.slice(0,10)||t('common.na', 'N/A')}</span> },
    {
      key: "type",
      header: t('common.type', 'Type'),
      render: (c) => (
        <span className={`text-xs px-2 py-0.5 rounded ${c.type==="corrective"?"bg-red-500/10 text-red-400":"bg-blue-500/10 text-blue-400"}`}>{c.type}</span>
      ),
    },
    {
      key: "status",
      header: t('common.status', 'Status'),
      render: (c) => (
        <span className={`text-xs px-2 py-0.5 rounded ${c.status==="open"?"bg-yellow-500/10 text-yellow-400":"bg-green-500/10 text-green-400"}`}>{c.status}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      render: (c) => (
        c.status === "open" || c.status === "in_progress" ? (
          <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded text-xs hover:bg-blue-500/20 transition-colors">{t('common.edit', 'Edit')}</button>
        ) : null
      ),
    },
  ];

  const modalFooter = (
    <>
      <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">{t('common.cancel', 'Cancel')}</button>
      <button type="submit" form="capa-form" disabled={saveMutation.isPending} className="px-6 py-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-navy-900 font-semibold rounded-lg text-sm">{saveMutation.isPending ? t('common.loading', 'Loading...') : editing ? t('common.update', 'Update') : t('common.create', 'Create')}</button>
    </>
  );

  return (<div><nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between"><h1 className="text-lg font-bold text-white">{t('quality.capas', 'CAPAs')}</h1><button onClick={openCreate} className="px-4 py-2 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded-lg text-sm hover:bg-gold-500 hover:text-navy-900">{t('quality.createCapa', '+ Create CAPA')}</button></div></nav>
    <main className="px-6 py-8">
      <ModalForm open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? t('quality.editCapa', 'Edit CAPA') : t('quality.createCapa', 'Create CAPA')} footer={modalFooter}>
        <form id="capa-form" onSubmit={handleSubmit} className="space-y-4">
          <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
            {CAPA_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required placeholder={t('common.title', 'Title')} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/>
          <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={3} placeholder={t('common.description', 'Description')} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/>
          <select value={form.non_conformity} onChange={e=>setForm({...form,non_conformity:e.target.value})} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
            <option value="">{t('common.selectNcr', 'Select NCR...')}</option>
            {ncrs.map((n: any) => <option key={n.id} value={n.id}>{n.title}</option>)}
          </select>
          <select value={form.responsible} onChange={e=>setForm({...form,responsible:e.target.value})} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
            <option value="">{t('common.selectResponsible', 'Select responsible...')}</option>
            {users.map((u: any) => <option key={u.id} value={u.id}>{u.email}</option>)}
          </select>
          <input value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} type="datetime-local" className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/>
        </form>
      </ModalForm>

      {isLoading?<LoadingSkeleton type="table" rows={5}/>:capas.length===0?<EmptyState message={t('quality.noCapas', 'No CAPAs found.')}/>:<>
        <FilterBar filters={filterOptions} values={filters} onChange={(k,v)=>setFilters(p=>({...p,[k]:v}))} onClear={()=>{setFilters({});setSearch("")}} searchValue={search} onSearchChange={setSearch} searchPlaceholder={t('quality.searchCapas', 'Search CAPAs...')}/>
        <DataTable columns={columns} data={filtered} keyField="id"/>
      </>}</main></div>);
}
