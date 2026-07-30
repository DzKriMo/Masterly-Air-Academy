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

interface Instructor {
  id: string; name: string; email: string; role: string;
  status: string; license?: string; qualifications?: string[];
  students_count?: number; flight_hours?: number;
}

export default function InstructorManagementPage() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Instructor | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true); setError(null);
    Promise.all([
      api.get<any>("/users/?role=flight_instructor"),
      api.get<any>("/users/?role=chief_flight_instructor"),
    ]).then(([fiRes, cfiRes]) => {
      setInstructors([...(fiRes.results || []), ...(cfiRes.results || [])]);
      setError(null);
    }).catch(err => { console.error(err); setError("Failed to load instructors."); })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => { load(); }, [load]);

  const filterOptions: FilterOption[] = [
    { key: "status", label: "All Statuses", options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "suspended", label: "Suspended" },
    ]},
  ];

  const filtered = instructors.filter(i => {
    if (filters.status && i.status !== filters.status) return false;
    if (search && !i.name?.toLowerCase().includes(search.toLowerCase()) && !i.email?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = { active: "bg-green-500/10 text-green-400", inactive: "bg-gray-500/10 text-gray-400", suspended: "bg-red-500/10 text-red-400" };
    return <span className={`text-xs px-2 py-0.5 rounded ${colors[s] || "bg-gray-500/10 text-gray-400"}`}>{s}</span>;
  };

  const columns: Column<Instructor>[] = [
    { key: "name", header: "Name", render: (i) => <span className="text-white font-medium">{i.name}</span> },
    { key: "email", header: "Email" },
    { key: "role", header: "Role", render: (i) => <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded">{i.role.replace(/_/g, " ")}</span> },
    { key: "status", header: "Status", render: (i) => statusBadge(i.status) },
    { key: "students_count", header: "Students", render: (i) => <span className="text-sm">{i.students_count ?? "—"}</span> },
    { key: "flight_hours", header: "Hours", render: (i) => <span className="text-sm">{i.flight_hours ? `${i.flight_hours}h` : "—"}</span> },
  ];

  return (
    <div className="flex-1 min-w-0">
      <PageHeader title={t("instructor.instructorManagement", "Instructor Management")} backHref="/instructor/cfi-dashboard" maxWidth="max-w-6xl" />
      <main className="max-w-6xl mx-auto px-6 py-8">
        {error && <ErrorCard message={error} onRetry={load} />}
        {loading ? <LoadingSkeleton type="table" rows={5} /> : instructors.length === 0 ? (
          <EmptyState message="No instructors found." />
        ) : (
          <>
            <FilterBar filters={filterOptions} values={filters} onChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))}
              onClear={() => { setFilters({}); setSearch(""); }}
              searchPlaceholder="Search instructors..." searchValue={search} onSearchChange={setSearch} />
            <DataTable columns={columns} data={filtered as any} keyField="id" onRowClick={(item) => setSelected(item as Instructor)} />
            <ModalForm open={!!selected} onClose={() => setSelected(null)} title={`${selected?.name || ""}`}
              footer={<button onClick={() => setSelected(null)} className="px-5 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-sm">Close</button>}>
              {selected && (
                <div className="space-y-6">
                  <section>
                    <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <DetailField label="Name" value={selected.name} />
                      <DetailField label="Email" value={selected.email} />
                      <DetailField label="Role" value={selected.role.replace(/_/g, " ")} />
                      <DetailField label="Status" value={selected.status} />
                      <DetailField label="License" value={selected.license || "—"} />
                      <DetailField label="Students" value={String(selected.students_count ?? "—")} />
                      <DetailField label="Flight Hours" value={selected.flight_hours ? `${selected.flight_hours}h` : "—"} />
                    </div>
                  </section>
                  {selected.qualifications && selected.qualifications.length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Qualifications</h3>
                      <div className="flex flex-wrap gap-2">
                        {selected.qualifications.map((q, i) => (
                          <span key={i} className="text-xs bg-navy-700 text-gray-300 px-2.5 py-1 rounded-full">{q}</span>
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
