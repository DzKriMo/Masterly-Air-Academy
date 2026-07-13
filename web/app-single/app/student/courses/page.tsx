"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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

interface Course { id: string; title: string; subject_code: string; scheduled_date: string; start_time: string; end_time: string; status: string; room_name: string | null; enrollment_count: number; }

export default function StudentCoursesPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/student/login"); } }, [isLoading, isAuthenticated, router]);

  const loadCourses = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    api.get("/courses/")
      .then((data: any) => { setCourses(data.results || []); setError(null); })
      .catch(err => { console.error("Failed to load courses:", err); setError(t('student.coursesLoadError', "Failed to load courses. Please try again.")); })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  const filterOptions: FilterOption[] = [
    { key: "status", label: t('instructor.allStatuses', 'All Statuses'), options: [
      { value: "scheduled", label: t('instructor.statusScheduled', 'Scheduled') },
      { value: "active", label: t('instructor.statusActive', 'Active') },
      { value: "completed", label: t('instructor.statusCompleted', 'Completed') },
    ]},
  ];

  const filteredCourses = courses.filter(c => {
    if (filters.status && c.status !== filters.status) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.subject_code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const columns: Column<Course>[] = [
    { key: "subject_code", header: t('common.code', 'Code'), render: (item) => (
      <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-medium">{item.subject_code}</span>
    )},
    { key: "title", header: t('common.title', 'Title') },
    { key: "scheduled_date", header: t('common.date'), render: (item) => (
      <span className="text-gray-400">{item.scheduled_date} | {item.start_time?.slice(0,5)} - {item.end_time?.slice(0,5)} | {item.room_name || t('common.tbd', 'TBD')}</span>
    )},
    { key: "enrollment_count", header: t('common.enrolled', 'Enrolled') },
    { key: "status", header: t('common.status'), render: (item) => (
      <span className={`text-xs px-2 py-0.5 rounded font-medium ${item.status === "scheduled" ? "bg-blue-500/10 text-blue-400" : "bg-green-500/10 text-green-400"}`}>{item.status}</span>
    )},
    { key: "actions", header: "", sortable: false, render: (item) => (
      <button
        onClick={(e) => { e.stopPropagation(); router.push(`/student/courses/${item.id}`); }}
        className="px-3 py-1.5 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded-lg text-xs hover:bg-gold-500 hover:text-navy-900 transition-colors"
      >
        {t('student.viewDetails', 'View')}
      </button>
    )},
  ];

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-3">
          <Image src="/logo.png" alt="MAA" width={110} height={110} />
          <div><h1 className="text-lg font-bold text-white">{t('student.myCourses')}</h1>
            <button onClick={() => router.push("/student/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">{t('student.backToDashboard')}</button></div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">
        {error && <ErrorCard message={error} onRetry={loadCourses} />}
        {loading ? <LoadingSkeleton type="table" rows={5} /> : courses.length === 0 ? <EmptyState message={t('student.noCourses', 'You are not enrolled in any courses yet.')} /> : (
          <>
            <FilterBar
              filters={filterOptions}
              values={filters}
              onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
              onClear={() => { setFilters({}); setSearch(""); }}
              searchPlaceholder={t('student.searchCourses', 'Search by title or code...')}
              searchValue={search}
              onSearchChange={setSearch}
            />
            <DataTable
              columns={columns}
              data={filteredCourses as any}
              keyField="id"
              emptyMessage={t('student.noCoursesFilter', 'No courses match your filters.')}
            />
          </>
        )}
      </main>
    </div>
  );
}
