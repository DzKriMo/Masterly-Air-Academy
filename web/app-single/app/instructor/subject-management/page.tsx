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

interface Subject {
  id: string; name: string; code?: string;
  course_name?: string; course_id?: string;
  instructor_name?: string; instructor_id?: string;
  duration_hours?: number; status: string;
  student_count?: number; description?: string;
}

export default function SubjectManagementPage() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<{id: string; name: string}[]>([]);
  const [viewMode, setViewMode] = useState<"subjects" | "by-course">("subjects");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Subject | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true); setError(null);
    Promise.all([
      api.get("/subjects/").catch(() => ({ results: [] })),
      api.get("/courses/").catch(() => ({ results: [] })),
    ]).then(([subjectsData, coursesData]) => {
      const courseMap: Record<string, string> = {};
      const courseList: {id: string; name: string}[] = [];
      ((coursesData as any).results || []).forEach((c: any) => { courseMap[c.id] = c.name || c.title; courseList.push({ id: c.id, name: c.name || c.title }); });
      setCourses(courseList);
      const s: Subject[] = ((subjectsData as any).results || []).map((sub: any) => ({
        id: sub.id, name: sub.name || sub.title || "Unnamed",
        code: sub.code, course_name: courseMap[sub.course || sub.course_id] || sub.course_name || "—",
        course_id: sub.course || sub.course_id, instructor_name: sub.instructor_name || sub.instructor || "—",
        duration_hours: sub.duration_hours || sub.duration, status: sub.status || "active",
        student_count: sub.student_count || 0, description: sub.description,
      }));
      setSubjects(s); setError(null);
    }).catch(err => { console.error(err); setError("Failed to load subjects."); })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => { load(); }, [load]);

  const filterOptions: FilterOption[] = [
    { key: "status", label: "All Statuses", options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "draft", label: "Draft" },
    ]},
  ];

  const filtered = subjects.filter(s => {
    if (filters.status && s.status !== filters.status) return false;
    if (search && !s.name?.toLowerCase().includes(search.toLowerCase()) && !s.code?.toLowerCase().includes(search.toLowerCase()) && !s.course_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = { active: "bg-green-500/10 text-green-400", inactive: "bg-gray-500/10 text-gray-400", draft: "bg-yellow-500/10 text-yellow-400" };
    return <span className={`text-xs px-2 py-0.5 rounded ${colors[s] || "bg-gray-500/10 text-gray-400"}`}>{s}</span>;
  };

  const groupByCourse = () => {
    const grouped: Record<string, Subject[]> = {};
    filtered.forEach(s => {
      const key = s.course_name || "Uncategorized";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    });
    return grouped;
  };

  const columns: Column<Subject>[] = [
    { key: "name", header: "Subject", render: (s) => <span className="text-white font-medium">{s.name}</span> },
    { key: "code", header: "Code", render: (s) => <span className="text-sm text-gray-400 font-mono">{s.code || "—"}</span> },
    { key: "course_name", header: "Course" },
    { key: "instructor_name", header: "Instructor" },
    { key: "duration_hours", header: "Hours", render: (s) => <span className="text-sm">{s.duration_hours ? `${s.duration_hours}h` : "—"}</span> },
    { key: "student_count", header: "Students", render: (s) => <span className="text-sm">{s.student_count ?? "—"}</span> },
    { key: "status", header: "Status", render: (s) => statusBadge(s.status) },
  ];

  return (
    <div className="flex-1 min-w-0">
      <PageHeader title={t("instructor.subjectManagement", "Subject Management")} backHref="/instructor/cgi-dashboard" maxWidth="max-w-6xl" />
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={error} onRetry={load} />}
        {loading ? <LoadingSkeleton type="table" rows={5} /> : subjects.length === 0 ? (
          <EmptyState message="No subjects found." />
        ) : (
          <>
            <div className="flex items-center gap-3">
              <button onClick={() => setViewMode("subjects")}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${viewMode === "subjects" ? "bg-gold-500/20 text-gold-400 border border-gold-500/30" : "bg-navy-700 text-gray-400 hover:text-white border border-transparent"}`}>
                All Subjects
              </button>
              <button onClick={() => setViewMode("by-course")}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${viewMode === "by-course" ? "bg-gold-500/20 text-gold-400 border border-gold-500/30" : "bg-navy-700 text-gray-400 hover:text-white border border-transparent"}`}>
                Group by Course
              </button>
            </div>
            <FilterBar filters={filterOptions} values={filters} onChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))}
              onClear={() => { setFilters({}); setSearch(""); }}
              searchPlaceholder="Search subjects..." searchValue={search} onSearchChange={setSearch} />

            {viewMode === "by-course" ? (
              <div className="space-y-6">
                {Object.entries(groupByCourse()).map(([courseName, subs]) => (
                  <section key={courseName}>
                    <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">{courseName} <span className="text-gray-500 font-normal">({subs.length})</span></h3>
                    <DataTable columns={columns} data={subs as any} keyField="id" onRowClick={(item) => setSelected(item as Subject)} />
                  </section>
                ))}
              </div>
            ) : (
              <DataTable columns={columns} data={filtered as any} keyField="id" onRowClick={(item) => setSelected(item as Subject)} />
            )}

            <ModalForm open={!!selected} onClose={() => setSelected(null)} title={`${selected?.name || ""}`}
              footer={<button onClick={() => setSelected(null)} className="px-5 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-sm">Close</button>}>
              {selected && (
                <div className="space-y-6">
                  <section>
                    <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Subject Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <DetailField label="Name" value={selected.name || ""} />
                      <DetailField label="Code" value={selected.code || "—"} />
                      <DetailField label="Course" value={selected.course_name || ""} />
                      <DetailField label="Instructor" value={selected.instructor_name || ""} />
                      <DetailField label="Duration" value={selected.duration_hours ? `${selected.duration_hours}h` : "—"} />
                      <DetailField label="Status" value={selected.status} />
                      <DetailField label="Students" value={String(selected.student_count ?? "—")} />
                    </div>
                  </section>
                  {selected.description && (
                    <section>
                      <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Description</h3>
                      <p className="text-gray-300 text-sm">{selected.description}</p>
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
