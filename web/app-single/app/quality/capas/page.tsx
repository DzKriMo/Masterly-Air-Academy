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

export default function CAPAsPage() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { t } = useTranslation();
  const { data: capas=[], isLoading } = useQuery({
    queryKey: ['quality-capas'],
    queryFn: () => api.get<any>("/capas/").then(d => d.results || []),
  });

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
  ];

  return (<div><nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center"><h1 className="text-lg font-bold text-white">{t('quality.capas', 'CAPAs')}</h1></div></nav>
    <main className="px-6 py-8">{isLoading?<LoadingSkeleton type="table" rows={5}/>:capas.length===0?<EmptyState message={t('quality.noCapas', 'No CAPAs found.')}/>:<>
      <FilterBar filters={filterOptions} values={filters} onChange={(k,v)=>setFilters(p=>({...p,[k]:v}))} onClear={()=>{setFilters({});setSearch("")}} searchValue={search} onSearchChange={setSearch} searchPlaceholder={t('quality.searchCapas', 'Search CAPAs...')}/>
      <DataTable columns={columns} data={filtered} keyField="id"/>
    </>}</main></div>);
}
