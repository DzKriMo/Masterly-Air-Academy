"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import type { FilterOption } from "@/components/filter-bar";
import { useTranslation } from "@/lib/use-translation";

export default function ContractsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { t } = useTranslation();

  useEffect(() => { if (!authLoading && !isAuthenticated) { router.push("/login"); } }, [authLoading, isAuthenticated, router]);
  useEffect(() => { if (!isAuthenticated) return;
    api.get("/contracts/")
      .then(data => { setContracts((data as unknown as {results: any[]}).results || []); setError(null); })
      .catch(err => { console.error("Failed to load contracts:", err); setError(t('common.error', 'Failed to load data. Please try again.')); })
      .finally(() => setLoading(false));
  },[isAuthenticated]);

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
  ];

  return (<div className="flex-1 min-w-0">
    <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center"><h1 className="text-lg font-bold text-white">{t('finance.contracts', 'Contracts')}</h1></div></nav>
    <main className="max-w-7xl mx-auto px-6 py-8">{error && <ErrorCard message={error} onRetry={() => { setError(null); setLoading(true); api.get("/contracts/").then(data => { setContracts((data as unknown as {results: any[]}).results || []); setError(null); }).catch(err => { setError(t('common.error', 'Failed to load data. Please try again.')); }).finally(() => setLoading(false)); }} />}{loading?<LoadingSkeleton type="table" rows={5}/>:filtered.length===0?<EmptyState message={t('finance.noContracts', 'No contracts found.')}/>:<>
      <FilterBar filters={filterOptions} values={filters} onChange={(k,v)=>setFilters(p=>({...p,[k]:v}))} onClear={()=>{setFilters({});setSearch("")}} searchValue={search} onSearchChange={setSearch} searchPlaceholder={t('finance.searchContracts', 'Search contracts...')}/>
      <DataTable columns={columns} data={filtered} keyField="id"/>
    </>}</main></div>);
}
