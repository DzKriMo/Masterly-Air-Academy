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
import { StatsCard } from "@/components/stats-card";
import { PageHeader } from "@/components/page-header";

interface CourseProgression {
  id: string; course_name: string; course_code?: string;
  enrolled: number; completed: number; in_progress: number;
  at_risk: number; avg_score?: number; pass_rate?: number;
  overall_progress: number; status: string;
}

export default function ProgressionOverviewPage() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [courses, setCourses] = useState<CourseProgression[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CourseProgression | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true); setError(null);
    Promise.all([
      api.get("/courses/").catch(() => ({ results: [] })),
      api.get("/course-enrollments/").catch(() => ({ results: [] })),
      api.get("/exam-attempts/").catch(() => ({ results: [] })),
    ]).then(([coursesData, enrollData, examData]) => {
      const enrollByCourse: Record<string, any[]> = {};
      (enrollData.results || []).forEach((e: any) => {
        const cid = e.course || e.course_id;
        if (cid) { if (!enrollByCourse[cid]) enrollByCourse[cid] = []; enrollByCourse[cid].push(e); }
      });
      const examByCourse: Record<string, number[]> = {};
      (examData.results || []).forEach((e: any) => {
        const cid = e.exam || e.course || e.course_id;
        if (cid && e.score != null) { if (!examByCourse[cid]) examByCourse[cid] = []; examByCourse[cid].push(e.score); }
      });
      const progression: CourseProgression[] = ((coursesData as any).results || []).map((c: any) => {
        const enr = enrollByCourse[c.id] || [];
        const scores = examByCourse[c.id] || [];
        const completed = enr.filter((e: any) => e.status === "completed" || e.status === "graduated").length;
        const inPgrs = enr.filter((e: any) => e.status === "active" || e.status === "in_progress").length;
        const atRisk = enr.filter((e: any) => e.status === "at_risk" || e.status === "struggling").length;
        const avg = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : undefined;
        const passed = scores.filter((s: number) => s >= 70).length;
        const passRate = scores.length > 0 ? Math.round((passed / scores.length) * 100) : undefined;
        const total = enr.length || 1;
        const overall = Math.round(((completed * 100) + (inPgrs * 50)) / total);
        return {
          id: c.id, course_name: c.name || c.title || "Unnamed", course_code: c.subject_code || c.code,
          enrolled: enr.length, completed, in_progress: inPgrs, at_risk: atRisk,
          avg_score: avg, pass_rate: passRate, overall_progress: Math.min(overall, 100),
          status: c.status || "active",
        };
      });
      setCourses(progression); setError(null);
    }).catch(err => { console.error(err); setError("Failed to load progression overview."); })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => { load(); }, [load]);

  const filterOptions: FilterOption[] = [
    { key: "status", label: "All Statuses", options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "completed", label: "Completed" },
    ]},
  ];

  const filtered = courses.filter(c => {
    if (filters.status && c.status !== filters.status) return false;
    if (search && !c.course_name?.toLowerCase().includes(search.toLowerCase()) && !c.course_code?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totals = { enrolled: filtered.reduce((a, c) => a + c.enrolled, 0), completed: filtered.reduce((a, c) => a + c.completed, 0), at_risk: filtered.reduce((a, c) => a + c.at_risk, 0) };

  const columns: Column<CourseProgression>[] = [
    { key: "course_name", header: "Course Name", render: (c) => <span className="text-white font-medium">{c.course_name}</span> },
    { key: "course_code", header: "Code", render: (c) => <span className="text-sm text-gray-400 font-mono">{c.course_code || "—"}</span> },
    { key: "enrolled", header: "Enrolled" },
    { key: "overall_progress", header: "Progress", render: (c) => <ProgressBar value={c.overall_progress} className="w-24" size="sm" /> },
    { key: "avg_score", header: "Avg Score", render: (c) => <span className="text-sm">{c.avg_score != null ? `${c.avg_score}%` : "—"}</span> },
    { key: "pass_rate", header: "Pass Rate", render: (c) => <span className="text-sm">{c.pass_rate != null ? `${c.pass_rate}%` : "—"}</span> },
    { key: "at_risk", header: "At Risk", render: (c) => <span className={`text-sm ${c.at_risk > 0 ? "text-red-400 font-semibold" : "text-gray-400"}`}>{c.at_risk}</span> },
  ];

  return (
    <div className="flex-1 min-w-0">
      <PageHeader title={t("instructor.progressionOverview", "Progression Overview")} backHref="/instructor/cgi-dashboard" maxWidth="max-w-6xl" />
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={error} onRetry={load} />}
        {loading ? <LoadingSkeleton type="table" rows={5} /> : courses.length === 0 ? (
          <EmptyState message="No progression data found." />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatsCard label="Total Enrolled" value={String(totals.enrolled)} />
              <StatsCard label="Completed" value={String(totals.completed)} />
              <StatsCard label="At Risk" value={String(totals.at_risk)} />
            </div>
            <FilterBar filters={filterOptions} values={filters} onChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))}
              onClear={() => { setFilters({}); setSearch(""); }}
              searchPlaceholder="Search courses..." searchValue={search} onSearchChange={setSearch} />
            <DataTable columns={columns} data={filtered as any} keyField="id" onRowClick={(item) => setSelected(item as CourseProgression)} />
            <ModalForm open={!!selected} onClose={() => setSelected(null)} title={`${selected?.course_name || ""}`}
              footer={<button onClick={() => setSelected(null)} className="px-5 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-sm">Close</button>}>
              {selected && (
                <div className="space-y-6">
                  <section>
                    <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Course Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <DetailField label="Course" value={selected.course_name || ""} />
                      <DetailField label="Code" value={selected.course_code || "—"} />
                      <DetailField label="Enrolled" value={String(selected.enrolled)} />
                      <DetailField label="Completed" value={String(selected.completed)} />
                      <DetailField label="In Progress" value={String(selected.in_progress)} />
                      <DetailField label="At Risk" value={String(selected.at_risk)} />
                      <DetailField label="Avg Score" value={selected.avg_score != null ? `${selected.avg_score}%` : "—"} />
                      <DetailField label="Pass Rate" value={selected.pass_rate != null ? `${selected.pass_rate}%` : "—"} />
                    </div>
                  </section>
                  <section>
                    <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Overall Progress</h3>
                    <ProgressBar value={selected.overall_progress} />
                    <p className="text-xs text-gray-400 mt-1">{selected.overall_progress}%</p>
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
