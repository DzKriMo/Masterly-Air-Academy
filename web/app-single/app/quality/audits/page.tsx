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

const AUDIT_TYPES = [
  { value: "internal", label: "Internal" },
  { value: "regulatory", label: "Regulatory" },
  { value: "supplier", label: "Supplier" },
  { value: "pedagogical", label: "Pedagogical" },
  { value: "safety", label: "Safety" },
];

export default function AuditsPage() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", type: "internal", scope: "", scheduled_date: "", lead_auditor: "" });
  const [checklistItems, setChecklistItems] = useState<{text: string; status: string}[]>([]);
  const [newItemText, setNewItemText] = useState("");
  const [selectedAudit, setSelectedAudit] = useState<any>(null);
  const { t } = useTranslation();

  const { data: audits=[], isLoading } = useQuery({
    queryKey: ['quality-audits'],
    queryFn: () => api.get<any>("/audits/").then(d => d.results || []),
  });

  const { data: usersData } = useQuery({
    queryKey: ['quality-managers'],
    queryFn: () => api.get("/users/?role=quality_manager").then(r => r.results || []),
    enabled: showForm,
  });
  const qualityManagers = usersData || [];

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing ? api.put(`/audits/${editing.id}/`, data) : api.post("/audits/", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality-audits"] });
      setShowForm(false);
      setEditing(null);
      setForm({ title: "", type: "internal", scope: "", scheduled_date: "", lead_auditor: "" });
      setChecklistItems([]);
      setNewItemText("");
      showToast("success", editing ? t('quality.auditUpdated', 'Audit updated.') : t('quality.auditCreated', 'Audit created.'));
    },
    onError: (e: Error) => showToast("error", e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", type: "internal", scope: "", scheduled_date: "", lead_auditor: "" });
    setChecklistItems([]);
    setNewItemText("");
    setShowForm(true);
  };

  const openEdit = (audit: any) => {
    setEditing(audit);
    setForm({
      title: audit.title || "",
      type: audit.type || "internal",
      scope: audit.scope || "",
      scheduled_date: audit.scheduled_date?.slice(0, 16) || "",
      lead_auditor: audit.lead_auditor || "",
    });
    setChecklistItems(
      (audit.checklist_items || []).map((item: any) => ({
        text: typeof item === "string" ? item : (item.text || ""),
        status: item.status || "pending",
      }))
    );
    setNewItemText("");
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...form,
      checklist_items: checklistItems.map(item => ({
        text: item.text,
        status: item.status,
      })),
    });
  };

  const filterOptions: FilterOption[] = [
    { key: "status", label: t('common.allStatuses', 'All Statuses'), options: [
      { value: "planned", label: t('quality.planned', 'Planned') },
      { value: "in_progress", label: t('quality.inProgress', 'In Progress') },
      { value: "completed", label: t('quality.completed', 'Completed') },
    ]},
  ];

  const filtered = audits.filter((a: any) => {
    if (filters.status && a.status !== filters.status) return false;
    if (search && !a.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const columns: Column<any>[] = [
    {
      key: "title",
      header: t('quality.audit', 'Audit'),
      render: (a) => (
        <div>
          <span className="text-white font-medium">{a.title}</span>
          <span className="text-sm text-gray-400 ml-3">{a.type}</span>
          <span className="text-xs text-gray-500 ml-3">{a.scheduled_date?.slice(0,10)}</span>
        </div>
      ),
    },
    { key: "scope", header: t('common.scope', 'Scope'), render: (a) => <span className="text-sm text-gray-400">{a.scope||t('common.na', 'N/A')}</span> },
    { key: "ncr_count", header: t('quality.ncrs', 'NCRs'), render: (a) => <span className="text-xs text-gray-400">{a.ncr_count}</span> },
    {
      key: "status",
      header: t('common.status', 'Status'),
      render: (a) => (
        <span className={`text-xs px-2 py-0.5 rounded ${a.status==="completed"?"bg-green-500/10 text-green-400":"bg-blue-500/10 text-blue-400"}`}>{a.status}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      render: (a) => (
        <div className="flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); openEdit(a); }} className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded text-xs hover:bg-blue-500/20 transition-colors">{t('common.edit', 'Edit')}</button>
          <a href={`/api/audits/${a.id}/pdf/`} className="px-3 py-1.5 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded text-xs hover:bg-gold-500 hover:text-navy-900 transition-colors">{t('common.download', 'PDF')}</a>
        </div>
      ),
    },
  ];

  const modalFooter = (
    <>
      <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">{t('common.cancel', 'Cancel')}</button>
      <button type="submit" form="audit-form" disabled={saveMutation.isPending} className="px-6 py-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-navy-900 font-semibold rounded-lg text-sm">{saveMutation.isPending ? t('common.loading', 'Loading...') : editing ? t('common.update', 'Update') : t('common.create', 'Create')}</button>
    </>
  );

  return (<div className="flex-1 min-w-0">
    <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between"><h1 className="text-lg font-bold text-white">{t('quality.audits', 'Audits')}</h1><button onClick={openCreate} className="px-4 py-2 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded-lg text-sm hover:bg-gold-500 hover:text-navy-900">{t('quality.createAudit', '+ Create Audit')}</button></div></nav>
    <main className="px-6 py-8">
      <ModalForm open={showForm} onClose={() => { setShowForm(false); setEditing(null); setChecklistItems([]); setNewItemText(""); }} title={editing ? t('quality.editAudit', 'Edit Audit') : t('quality.createAudit', 'Create Audit')} footer={modalFooter} wide>
        <form id="audit-form" onSubmit={handleSubmit} className="space-y-4">
          <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required placeholder={t('common.title', 'Title')} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/>
          <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
            {AUDIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <textarea value={form.scope} onChange={e=>setForm({...form,scope:e.target.value})} rows={3} placeholder={t('common.scope', 'Scope')} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/>
          <input value={form.scheduled_date} onChange={e=>setForm({...form,scheduled_date:e.target.value})} required type="datetime-local" className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"/>
          <select value={form.lead_auditor} onChange={e=>setForm({...form,lead_auditor:e.target.value})} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
            <option value="">{t('common.selectLeadAuditor', 'Select lead auditor...')}</option>
            {qualityManagers.map((u: any) => <option key={u.id} value={u.id}>{u.email}</option>)}
          </select>

          {/* Checklist Items Section */}
          <div className="border-t border-navy-700 pt-4">
            <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">
              {t('quality.checklistItems', 'Checklist Items')}
            </h3>

            {/* Existing items */}
            {checklistItems.length > 0 && (
              <div className="space-y-2 mb-3">
                {checklistItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-navy-900/50 rounded-lg p-2">
                    <input
                      value={item.text}
                      onChange={e => {
                        const updated = [...checklistItems];
                        updated[idx] = { ...updated[idx], text: e.target.value };
                        setChecklistItems(updated);
                      }}
                      placeholder={t('quality.checklistItemPlaceholder', 'Checklist item...')}
                      className="flex-1 px-3 py-1.5 bg-navy-900 border border-navy-600 rounded text-white text-sm"
                    />
                    {editing && (
                      <select
                        value={item.status}
                        onChange={e => {
                          const updated = [...checklistItems];
                          updated[idx] = { ...updated[idx], status: e.target.value };
                          setChecklistItems(updated);
                        }}
                        className="px-2 py-1.5 bg-navy-900 border border-navy-600 rounded text-white text-sm"
                      >
                        <option value="pending">{t('quality.pending', 'Pending')}</option>
                        <option value="pass">{t('quality.pass', 'Pass')}</option>
                        <option value="fail">{t('quality.fail', 'Fail')}</option>
                        <option value="na">{t('quality.na', 'N/A')}</option>
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={() => setChecklistItems(prev => prev.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add item input */}
            <div className="flex gap-2">
              <input
                value={newItemText}
                onChange={e => setNewItemText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && newItemText.trim()) {
                    e.preventDefault();
                    setChecklistItems(prev => [...prev, { text: newItemText.trim(), status: "pending" }]);
                    setNewItemText("");
                  }
                }}
                placeholder={t('quality.addChecklistItem', 'Add a checklist item...')}
                className="flex-1 px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm placeholder-gray-500"
              />
              <button
                type="button"
                disabled={!newItemText.trim()}
                onClick={() => {
                  if (newItemText.trim()) {
                    setChecklistItems(prev => [...prev, { text: newItemText.trim(), status: "pending" }]);
                    setNewItemText("");
                  }
                }}
                className="px-4 py-2 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded-lg text-sm hover:bg-gold-500 hover:text-navy-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {t('quality.addItem', 'Add Item')}
              </button>
            </div>
            {checklistItems.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">{t('quality.noChecklistItems', 'No checklist items yet. Add items above to track audit criteria.')}</p>
            )}
          </div>
        </form>
      </ModalForm>

      {isLoading?<LoadingSkeleton type="table" rows={5}/>:audits.length===0?<EmptyState message={t('quality.noAudits', 'No audits found.')}/>:<>
        <FilterBar filters={filterOptions} values={filters} onChange={(k,v)=>setFilters(p=>({...p,[k]:v}))} onClear={()=>{setFilters({});setSearch("")}} searchValue={search} onSearchChange={setSearch} searchPlaceholder={t('quality.searchAudits', 'Search audits...')}/>
        <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(a) => setSelectedAudit(a as any)}/>
      </>}

      <ModalForm open={!!selectedAudit} onClose={() => setSelectedAudit(null)} title={selectedAudit?.title || ''} footer={<button onClick={() => setSelectedAudit(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">Close</button>}>
        {selectedAudit && (<div className="space-y-4"><div className="grid grid-cols-2 gap-4">
          <div><p className="text-xs text-gray-500 mb-0.5">Type</p><p className="text-sm text-white">{selectedAudit.type}</p></div>
          <div><p className="text-xs text-gray-500 mb-0.5">Status</p><p className="text-sm text-white">{selectedAudit.status}</p></div>
          <div><p className="text-xs text-gray-500 mb-0.5">Scheduled</p><p className="text-sm text-white">{selectedAudit.scheduled_date?.slice(0,10)||'—'}</p></div>
          <div><p className="text-xs text-gray-500 mb-0.5">NCR Count</p><p className="text-sm text-white">{selectedAudit.ncr_count||0}</p></div>
          <div className="col-span-2"><p className="text-xs text-gray-500 mb-0.5">Scope</p><p className="text-sm text-white">{selectedAudit.scope||'—'}</p></div>
        </div></div>)}
      </ModalForm>
      </main></div>);
}
