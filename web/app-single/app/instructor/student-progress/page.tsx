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
import { ProgressBar } from "@/components/progress-bar";
import { PageHeader } from "@/components/page-header";

interface StudentProgress {
  id: string; name: string; email: string;
  program?: string; program_id?: string;
  overall_progress: number; flights_completed: number;
  flights_total: number; exams_passed: number;
  exams_total: number; status: string;
  last_activity?: string; start_date?: string;
}

export default function StudentProgressPage() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<StudentProgress | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true); setError(null);
    Promise.all([
      api.get("/students/").catch(() => ({ results: [] })),
      api.get("/flight-lessons/").catch(() => ({ results: [] })),
      api.get("/exam-attempts/").catch(() => ({ results: [] })),
    ]).then(([studentsData, flightsData, examsData]) => {
      const flightCounts: Record<string, number> = {};
      const flightTotal: Record<string, number> = {};
      (flightsData.results || []).forEach((f: any) => {
        const sid = f.student || f.student_id;
        if (sid) { flightCounts[sid] = (flightCounts[sid] || 0) + 1; if (f.status === "completed") flightTotal[sid] = (flightTotal[sid] || 0) + 1; }
      });
      const examPass: Record<string, number> = {};
      const examTotal: Record<string, number> = {};
      (examsData.results || []).forEach((e: any) => {
        const sid = e.student || e.student_id;
        if (sid) { examTotal[sid] = (examTotal[sid] || 0) + 1; if (e.score && e.passing_score && e.score >= e.passing_score) examPass[sid] = (examPass[sid] || 0) + 1; }
      });
      const progress: StudentProgress[] = ((studentsData as any).results || []).map((s: any) => {
        const fc = flightCounts[s.id] || 0;
        const ft = flightTotal[s.id] || 0;
        const ep = examPass[s.id] || 0;
        const et = examTotal[s.id] || 0;
        const totalItems = (ft || 1) * 2 + (et || 1);
        const completedItems = fc + ep;
        const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
        return {
          id: s.id, name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.email,
          email: s.email || "", program: s.program_name || s.program || "—",
          overall_progress: pct, flights_completed: fc, flights_total: ft,
          exams_passed: ep, exams_total: et, status: s.status || "active",
          last_activity: s.last_login || s.updated_at, start_date: s.created_at,
        };
      });
      setStudents(progress); setError(null);
    }).catch(err => { console.error(err); setError("Failed to load student progress data."); })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => { load(); }, [load]);

  const filterOptions: FilterOption[] = [
    { key: "status", label: "All Statuses", options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "graduated", label: "Graduated" },
      { value: "suspended", label: "Suspended" },
    ]},
  ];

  const filtered = students.filter(s => {
    if (filters.status && s.status !== filters.status) return false;
    if (search && !s.name?.toLowerCase().includes(search.toLowerCase()) && !s.email?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = { active: "bg-green-500/10 text-green-400", inactive: "bg-gray-500/10 text-gray-400", graduated: "bg-blue-500/10 text-blue-400", suspended: "bg-red-500/10 text-red-400" };
    return <span className={`text-xs px-2 py-0.5 rounded ${colors[s] || "bg-gray-500/10 text-gray-400"}`}>{s}</span>;
  };

  const columns: Column<StudentProgress>[] = [
    { key: "name", header: "Name", render: (s) => <span className="text-white font-medium">{s.name || s.email}</span> },
    { key: "program", header: "Program" },
    { key: "overall_progress", header: "Progress", render: (s) => <ProgressBar value={s.overall_progress} className="w-28" /> },
    { key: "flights_completed", header: "Flights", render: (s) => <span className="text-sm">{s.flights_completed}/{s.flights_total}</span> },
    { key: "exams_passed", header: "Exams", render: (s) => <span className="text-sm">{s.exams_passed}/{s.exams_total}</span> },
    { key: "status", header: "Status", render: (s) => statusBadge(s.status) },
  ];

  return (
    <div className="flex-1 min-w-0">
      <PageHeader title={t("instructor.studentProgress", "Student Progress")} backHref="/instructor/cfi-dashboard" maxWidth="max-w-6xl" />
      <main className="max-w-6xl mx-auto px-6 py-8">
        {error && <ErrorCard message={error} onRetry={load} />}
        {loading ? <LoadingSkeleton type="table" rows={5} /> : students.length === 0 ? (
          <EmptyState message="No student progress data found." />
        ) : (
          <>
            <FilterBar filters={filterOptions} values={filters} onChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))}
              onClear={() => { setFilters({}); setSearch(""); }}
              searchPlaceholder="Search students..." searchValue={search} onSearchChange={setSearch} />
            <DataTable columns={columns} data={filtered as any} keyField="id" onRowClick={(item) => setSelected(item as StudentProgress)} />
            <ModalForm open={!!selected} onClose={() => setSelected(null)} title={`${selected?.name || ""}`}
              footer={<button onClick={() => setSelected(null)} className="px-5 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-sm">Close</button>}>
              {selected && (
                <div className="space-y-6">
                  <section>
                    <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Student Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <DetailField label="Name" value={selected.name || ""} />
                      <DetailField label="Email" value={selected.email || ""} />
                      <DetailField label="Program" value={selected.program || ""} />
                      <DetailField label="Status" value={selected.status || ""} />
                      <DetailField label="Start Date" value={selected.start_date ? new Date(selected.start_date).toLocaleDateString() : "—"} />
                      <DetailField label="Last Activity" value={selected.last_activity ? new Date(selected.last_activity).toLocaleDateString() : "—"} />
                    </div>
                  </section>
                  <section>
                    <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Progress Metrics</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Overall Progress</p>
                        <ProgressBar value={selected.overall_progress} />
                        <p className="text-xs text-gray-400 mt-1">{selected.overall_progress}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Flights</p>
                        <p className="text-xl font-semibold text-white">{selected.flights_completed} <span className="text-sm text-gray-400">/ {selected.flights_total}</span></p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Exams Passed</p>
                        <p className="text-xl font-semibold text-white">{selected.exams_passed} <span className="text-sm text-gray-400">/ {selected.exams_total}</span></p>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </ModalForm>
          </>
        )}
      </main>
    </div>
  );
}
