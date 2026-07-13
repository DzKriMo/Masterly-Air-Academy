"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";

interface Student { id: string; student_number: string; first_name: string; last_name: string; full_name: string; program: string; status: string; enrollment_date: string; }

export default function InstructorStudentsPage() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => { if (!authLoading && !isAuthenticated) { router.push("/login"); } }, [authLoading, isAuthenticated, router]);

  const fetchStudents = () => {
    if (!isAuthenticated) return;
    setLoading(true);
    api.get<any>("/students/")
      .then(data => { setStudents((data as unknown as any).results || (data as unknown as any) || []); setError(null); })
      .catch(err => { console.error("Failed to load students:", err); setError(t("instructor.failedToLoadStudents", "Failed to load students. Please try again.")); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStudents(); }, [isAuthenticated]);

  const filtered = useMemo(() => {
    let result = students;
    if (filterValues.status) result = result.filter(s => s.status === filterValues.status);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      result = result.filter(s => s.full_name.toLowerCase().includes(q) || s.student_number.includes(q));
    }
    return result;
  }, [students, filterValues, searchValue]);

  const columns: Column<Student>[] = useMemo(() => [
    { key: "student_number", header: t("common.id", "ID"), render: (s) => (
      <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono">{s.student_number}</span>
    )},
    { key: "full_name", header: t("common.name", "Name") },
    { key: "program", header: t("common.program", "Program") },
    { key: "status", header: t("common.status", "Status"), render: (s) => (
      <span className={`text-xs px-2 py-0.5 rounded ${s.status === "active" ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"}`}>{s.status}</span>
    )},
    { key: "enrollment_date", header: t("common.enrolled", "Enrolled") },
  ], [t]);

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110} />
            <div>
              <h1 className="text-lg font-bold text-white">{t("instructor.myStudents", "My Students")}</h1>
              <button onClick={() => router.push("/instructor/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">{t("instructor.backToDashboard", "Back to Dashboard")}</button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && <ErrorCard message={error} onRetry={fetchStudents} />}

        <FilterBar
          filters={[
            { key: "status", label: t("common.allStatuses", "All Statuses"), options: [
              { value: "active", label: t("common.active", "Active") },
              { value: "inactive", label: t("common.inactive", "Inactive") },
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
          <DataTable columns={columns} data={filtered} keyField="id" />
        )}
      </main>
    </div>
  );
}
