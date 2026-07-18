"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";

// ── Types ─────────────────────────────────────────────────

interface Student {
  id: string;
  student_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  date_of_birth: string;
  program: string;
  status: string;
  enrollment_date: string;
  instructor_name: string;
  nationality: string;
  medical_certificate: string;
  medical_expiry: string;
  emergency_contact: string;
  emergency_phone: string;
  notes: string;
}

interface StudentStats {
  total_active: number;
  by_program: Record<string, number>;
  total: number;
}

// ── Constants ─────────────────────────────────────────────

const PROGRAMS = ["PPL", "CPL", "IR", "MEP", "MCC"];
const STATUSES = ["active", "inactive", "graduated", "suspended", "archived"];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-400",
  inactive: "bg-gray-500/10 text-gray-400",
  graduated: "bg-blue-500/10 text-blue-400",
  suspended: "bg-red-500/10 text-red-400",
  archived: "bg-gray-500/10 text-gray-500",
};

// ── Component ─────────────────────────────────────────────

export default function AdminStudentsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // ── Filter state ──
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  // ── Detail modal state ──
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // ── Lifecycle action state ──
  const [confirmAction, setConfirmAction] = useState<{ student: Student; action: "suspend" | "reactivate" | "archive" } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleLifecycleAction = useCallback(async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      await api.post(`/students/${confirmAction.student.id}/${confirmAction.action}/`, {});
      showToast("success", `Student ${confirmAction.action}ed successfully`);
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
    } catch {
      showToast("error", `Failed to ${confirmAction.action} student`);
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  }, [confirmAction, showToast]);

  // ── Auth guard ──
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  // ── Data query ──
  const {
    data: students,
    isLoading,
    error,
    refetch,
  } = useQuery<Student[]>({
    queryKey: ["admin-students"],
    queryFn: async () => {
      const d = await api.get<any>("/students/");
      return (d as any) || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  // ── Stats query ──
  const { data: stats } = useQuery<StudentStats>({
    queryKey: ["admin-students-stats"],
    queryFn: async () => {
      const d = await api.get<any>("/students/stats/");
      return d as StudentStats;
    },
    enabled: isAuthenticated,
  });

  // ── Filtered data ──
  const filtered = useMemo(() => {
    if (!students) return [];
    let r = students;
    if (filterValues.program)
      r = r.filter((i) => i.program === filterValues.program);
    if (filterValues.status)
      r = r.filter((i) => i.status === filterValues.status);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter(
        (i) =>
          i.full_name?.toLowerCase().includes(q) ||
          i.student_number?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [students, filterValues, searchValue]);

  // ── Open detail ──
  const openDetail = useCallback((student: Student) => {
    setSelectedStudent(student);
    setDetailOpen(true);
  }, []);

  // ── Columns ──
  const columns: Column<Student>[] = useMemo(
    () => [
      {
        key: "student_number",
        header: "Student #",
        render: (s) => (
          <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono">
            {s.student_number}
          </span>
        ),
      },
      { key: "full_name", header: t("common.name", "Name") },
      { key: "program", header: "Program" },
      {
        key: "status",
        header: t("common.status", "Status"),
        render: (s) => (
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              STATUS_COLORS[s.status] || "bg-gray-500/10 text-gray-400"
            }`}
          >
            {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
          </span>
        ),
      },
      {
        key: "enrollment_date",
        header: t("common.date", "Enrolled"),
        render: (s) => (
          <span className="text-xs text-gray-500">
            {s.enrollment_date
              ? new Date(s.enrollment_date).toLocaleDateString()
              : "—"}
          </span>
        ),
      },
      {
        key: "instructor_name",
        header: "Instructor",
        render: (s) => (
          <span className="text-xs text-gray-400">
            {s.instructor_name || "—"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        sortable: false,
        render: (s) => (
          <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            {s.status === "active" && (
              <button
                onClick={() => setConfirmAction({ student: s, action: "suspend" })}
                className="px-2 py-1 text-xs bg-red-500/10 text-red-400 rounded-md hover:bg-red-500/20 transition-colors"
              >
                Suspend
              </button>
            )}
            {s.status === "suspended" && (
              <button
                onClick={() => setConfirmAction({ student: s, action: "reactivate" })}
                className="px-2 py-1 text-xs bg-green-500/10 text-green-400 rounded-md hover:bg-green-500/20 transition-colors"
              >
                Reactivate
              </button>
            )}
            {!["archived", "graduated"].includes(s.status) && (
              <button
                onClick={() => setConfirmAction({ student: s, action: "archive" })}
                className="px-2 py-1 text-xs bg-gray-500/10 text-gray-400 rounded-md hover:bg-gray-500/20 transition-colors"
              >
                Archive
              </button>
            )}
          </div>
        ),
      },
    ],
    [t]
  );

  // ── Stats bar ──
  const programEntries = stats?.by_program
    ? Object.entries(stats.by_program)
    : [];

  // ── Render ──
  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110} />
            <div>
              <h1 className="text-lg font-bold text-white">
                {t("admin.students", "Students")}
              </h1>
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="text-xs text-gray-500 hover:text-gold-500"
              >
                {t("common.back", "Back to Dashboard")}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Error */}
        {error && (
          <ErrorCard
            message={(error as any).message || "Failed to load students"}
            onRetry={() => refetch()}
          />
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Total Active
            </p>
            <p className="text-2xl font-bold text-green-400 mt-1">
              {isLoading ? "—" : stats?.total_active ?? 0}
            </p>
          </div>
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Total Students
            </p>
            <p className="text-2xl font-bold text-white mt-1">
              {isLoading ? "—" : stats?.total ?? 0}
            </p>
          </div>
          {programEntries.map(([program, count]) => (
            <div
              key={program}
              className="bg-navy-800 border border-navy-700 rounded-xl p-4"
            >
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {program}
              </p>
              <p className="text-2xl font-bold text-gold-500 mt-1">{count}</p>
            </div>
          ))}
          {isLoading &&
            [...Array(4)].map((_, i) => (
              <div
                key={`skel-${i}`}
                className="bg-navy-800 border border-navy-700 rounded-xl p-4 animate-pulse"
              >
                <div className="h-3 bg-navy-700 rounded w-16 mb-2" />
                <div className="h-7 bg-navy-700 rounded w-10" />
              </div>
            ))}
        </div>

        {/* Filter bar */}
        <FilterBar
          filters={[
            {
              key: "program",
              label: "All Programs",
              options: PROGRAMS.map((p) => ({
                value: p,
                label: p,
              })),
            },
            {
              key: "status",
              label: "All Statuses",
              options: STATUSES.map((s) => ({
                value: s,
                label: s.charAt(0).toUpperCase() + s.slice(1),
              })),
            },
          ]}
          values={filterValues}
          onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))}
          onClear={() => {
            setFilterValues({});
            setSearchValue("");
          }}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search name or number..."
        />

        {/* Table */}
        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message="No students found."
            title={
              students?.length === 0
                ? "No students yet"
                : "No matching students"
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            keyField="id"
            onRowClick={openDetail}
          />
        )}

        {/* Student Detail Modal */}
        <ModalForm
          open={detailOpen}
          onClose={() => {
            setDetailOpen(false);
            setSelectedStudent(null);
          }}
          title={`Student Details: ${selectedStudent?.full_name || ""}`}
          wide
          footer={
            <button
              onClick={() => {
                setDetailOpen(false);
                setSelectedStudent(null);
              }}
              className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white"
            >
              {t("common.close", "Close")}
            </button>
          }
        >
          {selectedStudent && (
            <div className="space-y-6">
              {/* Personal Info */}
              <section>
                <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailField
                    label="Student #"
                    value={selectedStudent.student_number}
                  />
                  <DetailField
                    label="Full Name"
                    value={selectedStudent.full_name}
                  />
                  <DetailField
                    label="First Name"
                    value={selectedStudent.first_name}
                  />
                  <DetailField
                    label="Last Name"
                    value={selectedStudent.last_name}
                  />
                  <DetailField
                    label="Date of Birth"
                    value={
                      selectedStudent.date_of_birth
                        ? new Date(
                            selectedStudent.date_of_birth
                          ).toLocaleDateString()
                        : "—"
                    }
                  />
                  <DetailField
                    label="Nationality"
                    value={selectedStudent.nationality || "—"}
                  />
                </div>
              </section>

              {/* Contact Info */}
              <section>
                <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">
                  Contact Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailField
                    label="Email"
                    value={selectedStudent.email || "—"}
                  />
                  <DetailField
                    label="Phone"
                    value={selectedStudent.phone || "—"}
                  />
                  <div className="col-span-2">
                    <DetailField
                      label="Address"
                      value={selectedStudent.address || "—"}
                    />
                  </div>
                  <DetailField
                    label="Emergency Contact"
                    value={selectedStudent.emergency_contact || "—"}
                  />
                  <DetailField
                    label="Emergency Phone"
                    value={selectedStudent.emergency_phone || "—"}
                  />
                </div>
              </section>

              {/* Academic Info */}
              <section>
                <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">
                  Academic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Program" value={selectedStudent.program} />
                  <DetailField
                    label="Status"
                    value={
                      selectedStudent.status
                        ? selectedStudent.status.charAt(0).toUpperCase() +
                          selectedStudent.status.slice(1)
                        : "—"
                    }
                  />
                  <DetailField
                    label="Enrollment Date"
                    value={
                      selectedStudent.enrollment_date
                        ? new Date(
                            selectedStudent.enrollment_date
                          ).toLocaleDateString()
                        : "—"
                    }
                  />
                  <DetailField
                    label="Instructor"
                    value={selectedStudent.instructor_name || "—"}
                  />
                </div>
              </section>

              {/* Medical Certificates */}
              <section>
                <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">
                  Medical Certificates
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailField
                    label="Medical Certificate"
                    value={selectedStudent.medical_certificate || "—"}
                  />
                  <DetailField
                    label="Medical Expiry"
                    value={
                      selectedStudent.medical_expiry
                        ? new Date(
                            selectedStudent.medical_expiry
                          ).toLocaleDateString()
                        : "—"
                    }
                  />
                </div>
              </section>

              {/* Notes */}
              {selectedStudent.notes && (
                <section>
                  <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">
                    Notes
                  </h3>
                  <p className="text-sm text-gray-300 bg-navy-900 rounded-lg p-3">
                    {selectedStudent.notes}
                  </p>
                </section>
              )}
            </div>
          )}
        </ModalForm>

        {/* Lifecycle Action Confirm Dialog */}
        <ConfirmDialog
          open={!!confirmAction}
          onClose={() => !actionLoading && setConfirmAction(null)}
          onConfirm={handleLifecycleAction}
          title={confirmAction ? `${confirmAction.action.charAt(0).toUpperCase() + confirmAction.action.slice(1)} Student` : ""}
          message={confirmAction ? `Are you sure you want to ${confirmAction.action} ${confirmAction.student.full_name}?` : ""}
          confirmLabel={confirmAction ? confirmAction.action.charAt(0).toUpperCase() + confirmAction.action.slice(1) : "Confirm"}
          destructive={confirmAction?.action === "suspend" || confirmAction?.action === "archive"}
          loading={actionLoading}
        />
      </main>
    </div>
  );
}

// ── Detail Field Sub-component ───────────────────────────

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}
