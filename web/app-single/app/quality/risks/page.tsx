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

export default function RisksPage() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { t } = useTranslation();
  const { data: risks=[], isLoading } = useQuery({
    queryKey: ['quality-risks'],
    queryFn: () => api.get<any>("/risk-assessments/").then(d => d.results || []),
  });

  // Risk matrix: 5x5 grid
  const matrix = Array.from({length:5}, (_,r) => Array.from({length:5}, (_,c) => {
    const level = (r+1)*(c+1);
    const color = level <= 4 ? "bg-green-500/20 text-green-400" : level <= 9 ? "bg-yellow-500/20 text-yellow-400" : level <= 15 ? "bg-orange-500/20 text-orange-400" : "bg-red-500/20 text-red-400";
    const items = risks.filter((ri:any) => ri.probability === r+1 && ri.severity === c+1);
    return { level, color, count: items.length, items };
  }));

  const filterOptions: FilterOption[] = [
    { key: "status", label: t('common.allStatuses', 'All Statuses'), options: [
      { value: "active", label: t('quality.active', 'Active') },
      { value: "mitigated", label: t('quality.mitigated', 'Mitigated') },
      { value: "closed", label: t('quality.closed', 'Closed') },
    ]},
  ];

  const filtered = risks.filter((r: any) => {
    if (filters.status && r.status !== filters.status) return false;
    if (search && !r.hazard?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const columns: Column<any>[] = [
    { key: "hazard", header: t('quality.hazard', 'Hazard'), render: (r) => <span className="text-white font-medium">{r.hazard}</span> },
    { key: "risk_level", header: t('quality.riskLevel', 'Risk Level'), render: (r) => <span className="text-sm text-gray-400">P{r.probability}×S{r.severity} = {r.risk_level}</span> },
    {
      key: "status",
      header: t('common.status', 'Status'),
      render: (r) => (
        <span className={`text-xs px-2 py-0.5 rounded ${r.status==="active"?"bg-yellow-500/10 text-yellow-400":"bg-green-500/10 text-green-400"}`}>{r.status}</span>
      ),
    },
  ];

  return (<div><nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center"><h1 className="text-lg font-bold text-white">{t('quality.riskAssessments', 'Risk Assessments')}</h1></div></nav>
    <main className="px-6 py-8">{isLoading?<LoadingSkeleton type="table" rows={5}/>:<>
      <div className="mb-8"><h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('quality.riskMatrix', 'Risk Matrix (Probability × Severity)')}</h3>
        <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
          <div className="grid grid-cols-6 text-xs text-gray-500 p-2 border-b border-navy-700 bg-navy-900"><div className="p-2"></div>{[1,2,3,4,5].map(s=><div key={s} className="p-2 text-center font-bold">S{s}</div>)}</div>
          {matrix.map((row,ri) => (<div key={ri} className="grid grid-cols-6 text-xs border-b border-navy-700/50"><div className="p-2 font-bold text-gray-500 bg-navy-900 flex items-center">P{ri+1}</div>{row.map((cell,ci)=>(<div key={ci} className={`p-2 text-center min-h-[50px] flex items-center justify-center ${cell.color} ${cell.count>0?"font-bold cursor-pointer hover:opacity-80":""}`}>{cell.count>0 ? cell.count : ""}</div>))}</div>))}
        </div>
      </div>
      <FilterBar filters={filterOptions} values={filters} onChange={(k,v)=>setFilters(p=>({...p,[k]:v}))} onClear={()=>{setFilters({});setSearch("")}} searchValue={search} onSearchChange={setSearch} searchPlaceholder={t('quality.searchHazards', 'Search hazards...')}/>
      {filtered.length===0?<EmptyState message={t('quality.noRiskAssessments', 'No risk assessments found.')}/>:<DataTable columns={columns} data={filtered} keyField="id"/>}
    </>}</main></div>);
}
