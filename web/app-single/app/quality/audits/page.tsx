"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import type { FilterOption } from "@/components/filter-bar";
import { useTranslation } from "@/lib/use-translation";

export default function AuditsPage() {
  const [expanded, setExpanded] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { t } = useTranslation();
  const { data: audits=[], isLoading } = useQuery({
    queryKey: ['quality-audits'],
    queryFn: () => api.get<any>("/audits/").then(d => d.results || []),
  });

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
        <a href={`/api/audits/${a.id}/pdf/`} className="px-3 py-1.5 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded text-xs hover:bg-gold-500 hover:text-navy-900 transition-colors">{t('common.download', 'PDF')}</a>
      ),
    },
  ];

  return (<div className="flex-1 min-w-0">
    <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center"><h1 className="text-lg font-bold text-white">{t('quality.audits', 'Audits')}</h1></div></nav>
    <main className="px-6 py-8">{isLoading?<LoadingSkeleton type="table" rows={5}/>:audits.length===0?<EmptyState message={t('quality.noAudits', 'No audits found.')}/>:<>
      <FilterBar filters={filterOptions} values={filters} onChange={(k,v)=>setFilters(p=>({...p,[k]:v}))} onClear={()=>{setFilters({});setSearch("")}} searchValue={search} onSearchChange={setSearch} searchPlaceholder={t('quality.searchAudits', 'Search audits...')}/>
      <DataTable columns={columns} data={filtered} keyField="id"/>
    </>}</main></div>);
}
