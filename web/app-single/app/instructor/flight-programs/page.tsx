"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import type { FilterOption } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { DetailField } from "@/components/detail-field";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";

interface FlightProgram {
  id: string; name: string; code?: string; description?: string;
  duration_hours?: number; difficulty_level?: string;
  required_licenses?: string[]; status: string;
  student_count?: number; created_at?: string;
}

export default function FlightProgramsPage() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [programs, setPrograms] = useState<FlightProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FlightProgram | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true); setError(null);
    api.get("/flight-programs/")
      .then((d: any) => { setPrograms(d.results || []); setError(null); })
      .catch(err => { console.error(err); setError("Failed to load flight programs."); })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => { load(); }, [load]);

  const filterOptions: FilterOption[] = [
    { key: "status", label: "All Statuses", options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "draft", label: "Draft" },
    ]},
    { key: "difficulty_level", label: "Difficulty", options: [
      { value: "beginner", label: "Beginner" },
      { value: "intermediate", label: "Intermediate" },
      { value: "advanced", label: "Advanced" },
    ]},
  ];

  const filtered = programs.filter(p => {
    if (filters.status && p.status !== filters.status) return false;
    if (filters.difficulty_level && p.difficulty_level !== filters.difficulty_level) return false;
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase()) && !p.code?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = { active: "bg-green-500/10 text-green-400", inactive: "bg-gray-500/10 text-gray-400", draft: "bg-yellow-500/10 text-yellow-400" };
    return <span className={`text-xs px-2 py-0.5 rounded ${colors[s] || "bg-gray-500/10 text-gray-400"}`}>{s}</span>;
  };

  const difficultyBadge = (d: string) => {
    const colors: Record<string, string> = { beginner: "bg-blue-500/10 text-blue-400", intermediate: "bg-yellow-500/10 text-yellow-400", advanced: "bg-red-500/10 text-red-400" };
    return <span className={`text-xs px-2 py-0.5 rounded ${colors[d] || "bg-gray-500/10 text-gray-400"}`}>{d}</span>;
  };

  const columns: Column<FlightProgram>[] = [
    { key: "name", header: "Name", render: (p) => (
      <Link href={`/instructor/flight-programs/${p.id}`} className="text-white font-medium hover:text-gold-500 transition-colors">
        {p.name}
      </Link>
    )},
    { key: "code", header: "Code", render: (p) => <span className="text-sm text-gray-400 font-mono">{p.code || "—"}</span> },
    { key: "difficulty_level", header: "Difficulty", render: (p) => difficultyBadge(p.difficulty_level || "") },
    { key: "duration_hours", header: "Hours", render: (p) => <span className="text-sm">{p.duration_hours ? `${p.duration_hours}h` : "—"}</span> },
    { key: "student_count", header: "Students", render: (p) => <span className="text-sm">{p.student_count ?? "—"}</span> },
    { key: "status", header: "Status", render: (p) => statusBadge(p.status) },
  ];

  return (
    <div className="flex-1 min-w-0">
      <PageHeader title={t("instructor.flightPrograms", "Flight Programs")} backHref="/instructor/cfi-dashboard" maxWidth="max-w-6xl" />
      <main className="max-w-6xl mx-auto px-6 py-8">
        {error && <ErrorCard message={error} onRetry={load} />}
        {loading ? <LoadingSkeleton type="table" rows={5} /> : programs.length === 0 ? (
          <EmptyState message="No flight programs found." />
        ) : (
          <>
            <FilterBar filters={filterOptions} values={filters} onChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))}
              onClear={() => { setFilters({}); setSearch(""); }}
              searchPlaceholder="Search programs..." searchValue={search} onSearchChange={setSearch} />
            <DataTable columns={columns} data={filtered as any} keyField="id" onRowClick={(item) => setSelected(item as FlightProgram)} />
            <ModalForm open={!!selected} onClose={() => setSelected(null)} title={`${selected?.name || ""}`}
              footer={<button onClick={() => setSelected(null)} className="px-5 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-sm">Close</button>}>
              {selected && (
                <div className="space-y-6">
                  <section>
                    <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Program Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <DetailField label="Name" value={selected.name} />
                      <DetailField label="Code" value={selected.code || "—"} />
                      <DetailField label="Difficulty" value={selected.difficulty_level || "—"} />
                      <DetailField label="Duration" value={selected.duration_hours ? `${selected.duration_hours}h` : "—"} />
                      <DetailField label="Status" value={selected.status} />
                      <DetailField label="Students Enrolled" value={String(selected.student_count ?? "—")} />
                      <DetailField label="Created" value={selected.created_at ? new Date(selected.created_at).toLocaleDateString() : "—"} />
                    </div>
                  </section>
                  {selected.description && (
                    <section>
                      <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Description</h3>
                      <p className="text-gray-300 text-sm">{selected.description}</p>
                    </section>
                  )}
                  {selected.required_licenses && selected.required_licenses.length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Required Licenses</h3>
                      <div className="flex flex-wrap gap-2">
                        {selected.required_licenses.map((l, i) => (
                          <span key={i} className="text-xs bg-navy-700 text-gray-300 px-2.5 py-1 rounded-full">{l}</span>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </ModalForm>
          </>
        )}
      </main>
    </div>
  );
}
