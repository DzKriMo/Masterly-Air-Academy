"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import type { FilterOption } from "@/components/filter-bar";
import { useTranslation } from "@/lib/use-translation";
const NCR_COLORS=["#ef4444","#f59e0b","#3b82f6"];
export default function NCRsPage() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { t } = useTranslation();
  const { data: ncrs=[], isLoading } = useQuery({
    queryKey: ['quality-ncrs'],
    queryFn: () => api.get<any>("/non-conformities/").then(d => d.results || []),
  });

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
  ];

  return (<div><nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center"><h1 className="text-lg font-bold text-white">{t('quality.nonConformities', 'Non-Conformities')}</h1></div></nav>
    <main className="px-6 py-8">{isLoading?<LoadingSkeleton type="table" rows={5}/>:ncrs.length===0?<EmptyState message={t('quality.noNcrs', 'No NCRs found.')}/>:<>
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8"><h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('quality.ncrsBySeverity', 'NCRs by Severity')}</h3><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={[{name:t('quality.critical','Critical'),value:ncrs.filter((n:any)=>n.severity==="critical").length},{name:t('quality.major','Major'),value:ncrs.filter((n:any)=>n.severity==="major").length},{name:t('quality.minor','Minor'),value:ncrs.filter((n:any)=>n.severity==="minor").length}]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({name,value}:any)=>`${name}: ${value}`}>{[0,1,2].map(i=><Cell key={i} fill={NCR_COLORS[i]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div>
      <FilterBar filters={filterOptions} values={filters} onChange={(k,v)=>setFilters(p=>({...p,[k]:v}))} onClear={()=>{setFilters({});setSearch("")}} searchValue={search} onSearchChange={setSearch} searchPlaceholder={t('quality.searchNcrs', 'Search NCRs...')}/>
      <DataTable columns={columns} data={filtered} keyField="id"/>
    </>}</main></div>);
}
