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
      { value: "in_revision", label: t('quality.underReview', 'Under Review') },
      { value: "approved", label: t('quality.approved', 'Approved') },
      { value: "archived", label: t('quality.archived', 'Archived') },
      { value: "expired", label: t('quality.expired', 'Expired') },
    ]},
  ];

  const filtered = docs.filter((d: any) => {
    if (filters.status && d.status !== filters.status) return false;
    if (search && !(d.title||d.number)?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const columns: Column<any>[] = [
    { key: "title", header: t('quality.document', 'Document'), render: (d) => <span className="text-white font-medium">{d.title||d.number}</span> },
    { key: "number", header: t('quality.docNumber', 'Number'), render: (d) => <span className="text-sm text-gray-400">{d.number}</span> },
    { key: "version", header: t('quality.version', 'Version'), render: (d) => <span className="text-sm text-gray-400">{d.version||t('common.na', 'N/A')}</span> },
    { key: "issue_date", header: t('quality.issueDate', 'Issue Date'), render: (d) => <span className="text-xs text-gray-400">{d.issue_date?.slice(0,10)||t('common.na', 'N/A')}</span> },
    { key: "revision_date", header: t('quality.revisionDate', 'Revision Date'), render: (d) => <span className="text-xs text-gray-400">{d.revision_date?.slice(0,10)||t('common.na', 'N/A')}</span> },
    { key: "author_name", header: t('quality.author', 'Author'), render: (d) => <span className="text-sm text-gray-400">{d.author_name||t('common.na', 'N/A')}</span> },
    { key: "approver_name", header: t('quality.approver', 'Approver'), render: (d) => <span className="text-sm text-gray-400">{d.approver_name||t('common.na', 'N/A')}</span> },
    {
      key: "status",
      header: t('common.status', 'Status'),
      render: (d) => (
        <span className={`text-xs px-2 py-0.5 rounded ${d.status==="approved"?"bg-green-500/10 text-green-400":d.status==="draft"?"bg-yellow-500/10 text-yellow-400":d.status==="in_revision"?"bg-blue-500/10 text-blue-400":d.status==="archived"?"bg-gray-500/10 text-gray-400":"bg-red-500/10 text-red-400"}`}>{d.status||t('common.na', 'N/A')}</span>
      ),
    },
  ];

  return (<div><nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center"><h1 className="text-lg font-bold text-white">{t('quality.documents', 'Quality Documents')}</h1></div></nav>
    <main className="px-6 py-8">{isLoading?<LoadingSkeleton type="table" rows={5}/>:docs.length===0?<EmptyState message={t('quality.noDocuments', 'No documents found.')}/>:<>
      <FilterBar filters={filterOptions} values={filters} onChange={(k,v)=>setFilters(p=>({...p,[k]:v}))} onClear={()=>{setFilters({});setSearch("")}} searchValue={search} onSearchChange={setSearch} searchPlaceholder={t('quality.searchDocuments', 'Search documents...')}/>
      <DataTable columns={columns} data={filtered} keyField="id"/>
    </>}</main></div>);
}
