"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { PageHeader } from "@/components/page-header";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { DetailField } from "@/components/detail-field";
import { ProgressBar } from "@/components/progress-bar";

interface StudentWithFlights {
  id: string; student_number: string; full_name: string;
  program: string; status: string; enrollment_date: string;
  flights_completed: number; flights_scheduled: number;
  total_hours: number; last_flight?: string;
  avg_grade?: number; next_flight?: string;
}

export default function InstructorStudentsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [students, setStudents] = useState<StudentWithFlights[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");
  const [selected, setSelected] = useState<StudentWithFlights | null>(null);

  useAuthGuard(isAuthenticated, authLoading);

  const fetchData = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    Promise.all([
      api.get<any>("/students/"),
      api.get<any>("/flight-lessons/").catch(() => ({ results: [] })),
    ]).then(([studentsData, flightsData]) => {
      const studentList = (studentsData as any).results || [];
      const flights = (flightsData as any).results || [];

      const flightByStudent: Record<string, any[]> = {};
      flights.forEach((f: any) => {
        const sid = f.student || f.student_id;
        if (sid) { if (!flightByStudent[sid]) flightByStudent[sid] = []; flightByStudent[sid].push(f); }
      });

      const enriched: StudentWithFlights[] = studentList.map((s: any) => {
        const f = flightByStudent[s.id] || [];
        const completed = f.filter((fl: any) => fl.status === "completed");
        const scheduled = f.filter((fl: any) => fl.status === "scheduled");
        const totalHours = completed.reduce((sum: number, fl: any) => sum + (fl.flight_duration || fl.duration || 0), 0);
        const grades = completed.filter((fl: any) => fl.grade != null).map((fl: any) => fl.grade);
        const avgGrade = grades.length > 0 ? Math.round(grades.reduce((a: number, b: number) => a + b, 0) / grades.length) : undefined;
        const lastFlightDates = completed.map((fl: any) => fl.scheduled_date || fl.date).filter(Boolean).sort().reverse();
        const nextDates = scheduled.map((fl: any) => fl.scheduled_date || fl.date).filter(Boolean).sort();
        return {
          id: s.id, student_number: s.student_number || "—",
          full_name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.email || "Unnamed",
          program: s.program_name || s.program || "—", status: s.status || "active",
          enrollment_date: s.enrollment_date || s.created_at || "—",
          flights_completed: completed.length, flights_scheduled: scheduled.length,
          total_hours: Math.round(totalHours * 10) / 10, last_flight: lastFlightDates[0] || "—",
          avg_grade: avgGrade, next_flight: nextDates[0] || "—",
        };
      });
      setStudents(enriched); setError(null);
    }).catch(err => {
      console.error("Failed to load data:", err);
      setError(t("instructor.failedToLoadStudents", "Failed to load students."));
    }).finally(() => setLoading(false));
  }, [isAuthenticated, t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    let result = students;
    if (filterValues.status) result = result.filter(s => s.status === filterValues.status);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      result = result.filter(s => s.full_name.toLowerCase().includes(q) || s.student_number.toLowerCase().includes(q) || s.program.toLowerCase().includes(q));
    }
    return result;
  }, [students, filterValues, searchValue]);

  const columns: Column<StudentWithFlights>[] = useMemo(() => [
    { key: "student_number", header: t("common.id", "ID"), render: (s) => (
      <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono">{s.student_number}</span>
    )},
    { key: "full_name", header: t("common.name", "Name") },
    { key: "program", header: t("common.program", "Program") },
    { key: "flights_completed", header: "Flights", render: (s) => (
      <div className="flex items-center gap-2">
        <span className="text-sm">{s.flights_completed}<span className="text-gray-500">/{s.flights_completed + s.flights_scheduled}</span></span>
      </div>
    )},
    { key: "total_hours", header: "Hours", render: (s) => <span className="text-sm">{s.total_hours}h</span> },
    { key: "avg_grade", header: "Avg Grade", render: (s) => (
      <span className={`text-sm font-medium ${s.avg_grade != null ? (s.avg_grade >= 80 ? "text-green-400" : s.avg_grade >= 60 ? "text-yellow-400" : "text-red-400") : "text-gray-500"}`}>
        {s.avg_grade != null ? `${s.avg_grade}%` : "—"}
      </span>
    )},
    { key: "status", header: t("common.status", "Status"), render: (s) => (
      <span className={`text-xs px-2 py-0.5 rounded ${s.status === "active" ? "bg-green-500/10 text-green-400" : s.status === "graduated" ? "bg-blue-500/10 text-blue-400" : "bg-gray-500/10 text-gray-400"}`}>{s.status}</span>
    )},
    { key: "actions", header: "", sortable: false, render: (s) => (
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => router.push(`/instructor/flights?student=${s.id}`)}
          className="px-3 py-1.5 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded text-xs hover:bg-gold-500 hover:text-navy-900 transition-colors">
          {t("instructor.scheduleFlight", "Schedule")}
        </button>
        <button onClick={() => router.push(`/instructor/student-progress`)}
          className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded text-xs hover:bg-blue-500/20 transition-colors">
          {t("instructor.viewProgress", "Progress")}
        </button>
      </div>
    )},
  ], [router, t]);

  return (
    <div className="flex-1 min-w-0">
      <PageHeader
        title={t("instructor.myStudents", "My Students")}
        backHref="/instructor/dashboard"
        backLabel={t("instructor.backToDashboard", "Back to Dashboard")}
        maxWidth="max-w-7xl"
      />
      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && <ErrorCard message={error} onRetry={fetchData} />}

        <FilterBar
          filters={[
            { key: "status", label: t("common.allStatuses", "All Statuses"), options: [
              { value: "active", label: t("common.active", "Active") },
              { value: "inactive", label: t("common.inactive", "Inactive") },
              { value: "graduated", label: "Graduated" },
            ]},
          ]}
          values={filterValues}
          onChange={(key, value) => setFilterValues(prev => ({ ...prev, [key]: value }))}
          onClear={() => { setFilterValues({}); setSearchValue(""); }}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder={t("instructor.searchStudents", "Search name or number...")}
        />

        {loading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={t("instructor.noStudentsFound", "No students found.")}
            title={students.length === 0 ? t("instructor.noStudentsYet", "No students yet") : t("instructor.noMatchingStudents", "No matching students")}
          />
        ) : (
          <>
            <DataTable columns={columns as any} data={filtered as any} keyField="id" onRowClick={(item) => setSelected(item as StudentWithFlights)} />
            <ModalForm open={!!selected} onClose={() => setSelected(null)} title={`${selected?.full_name || ""}`}
              footer={
                <div className="flex gap-3">
                  <button onClick={() => { router.push(`/instructor/flights?student=${selected?.id}`); setSelected(null); }}
                    className="px-5 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm transition-colors">
                    {t("instructor.scheduleFlight", "Schedule Flight")}
                  </button>
                  <button onClick={() => setSelected(null)}
                    className="px-5 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-sm">Close</button>
                </div>
              }>
              {selected && (
                <div className="space-y-6">
                  <section>
                    <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Student Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <DetailField label="Name" value={selected.full_name || ""} />
                      <DetailField label="Student #" value={selected.student_number || ""} />
                      <DetailField label="Program" value={selected.program || ""} />
                      <DetailField label="Status" value={selected.status || ""} />
                      <DetailField label="Enrolled" value={selected.enrollment_date || ""} />
                    </div>
                  </section>
                  <section>
                    <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Flight Tracking</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-navy-800 rounded-lg p-3 border border-navy-700">
                        <p className="text-xs text-gray-500">Completed</p>
                        <p className="text-xl font-bold text-white">{selected.flights_completed}</p>
                      </div>
                      <div className="bg-navy-800 rounded-lg p-3 border border-navy-700">
                        <p className="text-xs text-gray-500">Scheduled</p>
                        <p className="text-xl font-bold text-white">{selected.flights_scheduled}</p>
                      </div>
                      <div className="bg-navy-800 rounded-lg p-3 border border-navy-700">
                        <p className="text-xs text-gray-500">Total Hours</p>
                        <p className="text-xl font-bold text-white">{selected.total_hours}h</p>
                      </div>
                      <div className="bg-navy-800 rounded-lg p-3 border border-navy-700">
                        <p className="text-xs text-gray-500">Avg Grade</p>
                        <p className="text-xl font-bold text-white">{selected.avg_grade != null ? `${selected.avg_grade}%` : "—"}</p>
                      </div>
                    </div>
                  </section>
                  <section>
                    <div className="grid grid-cols-2 gap-4">
                      <DetailField label="Last Flight" value={selected.last_flight || "—"} />
                      <DetailField label="Next Flight" value={selected.next_flight || "—"} />
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
