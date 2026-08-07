"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import type { FilterOption } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/components/toast";
import { useTranslation } from "@/lib/use-translation";
import { fmtDate } from "@/lib/format-utils";

export default function ContractsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  useAuthGuard(isAuthenticated, isLoading);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ type: "", status: "", start_date: "", end_date: "" });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const { t } = useTranslation();
  const { showToast } = useToast();

  const loadContracts = useCallback(async (p: number, append: boolean) => {
    try {
      const data = await api.get<any>(p > 1 ? `/contracts/?page=${p}` : "/contracts/");
      const results = data?.results || (Array.isArray(data) ? data : []);
      setContracts((prev) => (append ? [...prev, ...results] : results));
      setHasMore(!!data?.next);
      setError(null);
    } catch (err: any) {
      console.error("Failed to load contracts:", err);
      setError(t('common.error', 'Failed to load data. Please try again.'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [t]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    loadContracts(1, false);
  }, [isAuthenticated, loadContracts]);

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setPage((p) => p + 1);
    loadContracts(page + 1, true);
  };

  const filterOptions: FilterOption[] = [
    { key: "status", label: t('common.allStatuses', 'All Statuses'), options: [
      { value: "active", label: t('finance.active', 'Active') },
      { value: "expired", label: t('finance.expired', 'Expired') },
      { value: "terminated", label: t('finance.terminated', 'Terminated') },
      { value: "draft", label: t('finance.draft', 'Draft') },
    ]},
  ];

  const filtered = contracts.filter((c: any) => {
    if (filters.status && c.status !== filters.status) return false;
    if (search && !c.contract_number?.toLowerCase().includes(search.toLowerCase()) && !c.student_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const columns: Column<any>[] = [
    { key: "contract_number", header: t('finance.contract', 'Contract'), render: (c) => <span className="text-white font-medium">{c.contract_number}</span> },
    { key: "student_name", header: t('finance.student', 'Student'), render: (c) => <span className="text-sm text-gray-400">{c.student_name}</span> },
    { key: "type", header: t('common.type', 'Type'), render: (c) => <span className="text-xs text-gray-400">{c.type}</span> },
    {
      key: "status",
      header: t('common.status', 'Status'),
      render: (c) => (
        <span className={`text-xs px-2 py-0.5 rounded ${c.status==="active"?"bg-green-500/10 text-green-400":"bg-gray-500/10 text-gray-400"}`}>{c.status}</span>
      ),
    },
    {
      key: "actions", header: "", sortable: false,
      render: (c) => (<div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
        <button onClick={async()=>{try{const data=await api.post(`/contracts/${c.id}/generate_pdf/`);if(!data?.file_url){throw new Error(data?.error||"Failed to generate PDF");}const blobRes=await fetch(data.file_url,{credentials:"include"});if(!blobRes.ok)throw new Error("Failed to download PDF");const b=await blobRes.blob();const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`${c.contract_number}.pdf`;a.click();URL.revokeObjectURL(u);setPage(1);setLoading(true);loadContracts(1,false);showToast("success","PDF generated");}catch(e:any){showToast("error",e.message)}}} className="px-2 py-1 text-xs bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded hover:bg-gold-500/20">Generate PDF</button>
        {c.file_url && <a href={c.file_url} target="_blank" className="px-2 py-1 text-xs bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded hover:bg-blue-500/20">View</a>}
      </div>),
    },
  ];

  return (<div className="flex-1 min-w-0">
    <PageHeader title={t('finance.contracts', 'Contracts')} />
    <main className="max-w-7xl mx-auto px-6 py-8">{error && <ErrorCard message={error} onRetry={() => { setError(null); setLoading(true); loadContracts(1, false); }} />}{loading?<LoadingSkeleton type="table" rows={5}/>:filtered.length===0?<EmptyState message={t('finance.noContracts', 'No contracts found.')}/>:<>
      <FilterBar filters={filterOptions} values={filters} onChange={(k,v)=>setFilters(p=>({...p,[k]:v}))} onClear={()=>{setFilters({});setSearch("")}} searchValue={search} onSearchChange={setSearch} searchPlaceholder={t('finance.searchContracts', 'Search contracts...')}/>
      <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(c) => { setSelected(c as any); setEditing(false); setEditForm({ type: c.type || "", status: c.status || "", start_date: c.start_date || "", end_date: c.end_date || "" }); }}/>
      {hasMore && (
        <div className="flex justify-center mt-6">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-5 py-2 text-sm bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded-lg hover:bg-gold-500 hover:text-navy-900 transition-colors disabled:opacity-50"
          >
            {loadingMore ? t('common.loading', 'Loading...') : 'Load more'}
          </button>
        </div>
      )}
    </>}

    <ModalForm open={!!selected} onClose={() => { setSelected(null); setEditing(false); }} title={editing ? `Edit: ${selected?.contract_number}` : selected?.contract_number || ''} footer={editing ? (<><button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">Cancel</button><button onClick={async () => { try { await api.patch(`/contracts/${selected.id}/`, editForm); showToast("success", "Updated"); setEditing(false); setSelected(null); setPage(1); setLoading(true); loadContracts(1, false); } catch(e:any) { showToast("error", e.message); }}} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400">Save</button></>) : (<><button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">Close</button><button onClick={() => setEditing(true)} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400">Edit</button></>)}>
      {selected && (<div className="space-y-6"><div className="grid grid-cols-2 gap-4">
        <div><p className="text-xs text-gray-500 mb-0.5">Contract #</p><p className="text-sm text-white">{selected.contract_number}</p></div>
        <div><p className="text-xs text-gray-500 mb-0.5">Student</p><p className="text-sm text-white">{selected.student_name}</p></div>
        {editing ? (
          <div><p className="text-xs text-gray-500 mb-0.5">Type</p><select value={editForm.type} onChange={e => setEditForm(p => ({...p, type: e.target.value}))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm"><option value="training">Training</option><option value="employment">Employment</option><option value="service">Service</option><option value="other">Other</option></select></div>
        ) : (<div><p className="text-xs text-gray-500 mb-0.5">Type</p><p className="text-sm text-white">{selected.type}</p></div>)}
        {editing ? (
          <div><p className="text-xs text-gray-500 mb-0.5">Status</p><select value={editForm.status} onChange={e => setEditForm(p => ({...p, status: e.target.value}))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm"><option value="active">Active</option><option value="completed">Completed</option><option value="terminated">Terminated</option><option value="draft">Draft</option></select></div>
        ) : (<div><p className="text-xs text-gray-500 mb-0.5">Status</p><p className="text-sm text-white">{selected.status}</p></div>)}
        {editing ? (
          <div><p className="text-xs text-gray-500 mb-0.5">Start Date</p><input type="date" value={editForm.start_date} onChange={e => setEditForm(p => ({...p, start_date: e.target.value}))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm" /></div>
        ) : (<div><p className="text-xs text-gray-500 mb-0.5">Start</p><p className="text-sm text-white">{fmtDate(selected.start_date)}</p></div>)}
        {editing ? (
          <div><p className="text-xs text-gray-500 mb-0.5">End Date</p><input type="date" value={editForm.end_date} onChange={e => setEditForm(p => ({...p, end_date: e.target.value}))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm" /></div>
        ) : (<div><p className="text-xs text-gray-500 mb-0.5">End</p><p className="text-sm text-white">{fmtDate(selected.end_date)}</p></div>)}
      </div></div>)}
    </ModalForm>
    </main></div>);
}
