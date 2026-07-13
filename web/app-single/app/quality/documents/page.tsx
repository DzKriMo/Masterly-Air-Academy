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

export default function QualityDocumentsPage() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { t } = useTranslation();
  const { data: docs=[], isLoading } = useQuery({
    queryKey: ['quality-documents'],
    queryFn: () => api.get<any>("/quality-documents/").then(d => d.results || []),
  });

  const filterOptions: FilterOption[] = [
    { key: "status", label: t('common.allStatuses', 'All Statuses'), options: [
      { value: "draft", label: t('quality.draft', 'Draft') },
      { value: "review", label: t('quality.underReview', 'Under Review') },
      { value: "approved", label: t('quality.approved', 'Approved') },
      { value: "obsolete", label: t('quality.obsolete', 'Obsolete') },
    ]},
  ];

  const filtered = docs.filter((d: any) => {
    if (filters.status && d.status !== filters.status) return false;
    if (search && !(d.title||d.number)?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const columns: Column<any>[] = [
    { key: "title", header: t('quality.document', 'Document'), render: (d) => <span className="text-white font-medium">{d.title||d.number}</span> },
    { key: "type", header: t('common.type', 'Type'), render: (d) => <span className="text-sm text-gray-400">{d.type}</span> },
    {
      key: "status",
      header: t('common.status', 'Status'),
      render: (d) => (
        <span className={`text-xs px-2 py-0.5 rounded ${d.status==="approved"?"bg-green-500/10 text-green-400":"bg-yellow-500/10 text-yellow-400"}`}>{d.status||t('common.na', 'N/A')}</span>
      ),
    },
  ];

  return (<div><nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center"><h1 className="text-lg font-bold text-white">{t('quality.documents', 'Quality Documents')}</h1></div></nav>
    <main className="px-6 py-8">{isLoading?<LoadingSkeleton type="table" rows={5}/>:docs.length===0?<EmptyState message={t('quality.noDocuments', 'No documents found.')}/>:<>
      <FilterBar filters={filterOptions} values={filters} onChange={(k,v)=>setFilters(p=>({...p,[k]:v}))} onClear={()=>{setFilters({});setSearch("")}} searchValue={search} onSearchChange={setSearch} searchPlaceholder={t('quality.searchDocuments', 'Search documents...')}/>
      <DataTable columns={columns} data={filtered} keyField="id"/>
    </>}</main></div>);
}
