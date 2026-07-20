"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";

// ── Types ─────────────────────────────────────────────────

interface Instructor {
  id: string;
  name: string;
  email: string;
  license_number?: string;
  qualifications?: any;
  status: string;
  student_count?: number;
  phone?: string;
  total_flight_hours?: number;
  instruction_hours?: number;
}

interface GroundInstructor extends Instructor {}
interface FlightInstructor extends Instructor {}

// ── Constants ─────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-400",
  inactive: "bg-gray-500/10 text-gray-400",
  on_leave: "bg-amber-500/10 text-amber-400",
  suspended: "bg-red-500/10 text-red-400",
};

const STATUSES = ["active", "inactive", "on_leave", "suspended"];

// ── Component ─────────────────────────────────────────────

export default function AdminInstructorsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  useToast();

  // ── Tabs ──
  const [activeTab, setActiveTab] = useState<"ground" | "flight">("ground");

  // ── Detail modal ──
  const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null);

  // ── Filter state ──
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  // ── Auth guard ──
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  // ── Queries ──
  const groundQuery = useQuery<GroundInstructor[]>({
    queryKey: ["admin-ground-instructors"],
    queryFn: async () => {
      const d = await api.get<any>("/ground-instructors/");
      return (d as any) ?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  const flightQuery = useQuery<FlightInstructor[]>({
    queryKey: ["admin-flight-instructors"],
    queryFn: async () => {
      const d = await api.get<any>("/flight-instructors/");
      return (d as any) ?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  const currentQuery = activeTab === "ground" ? groundQuery : flightQuery;
  const instructors = currentQuery.data ?? [];
  const isLoading = currentQuery.isLoading;
  const error = currentQuery.error;
  const refetch = currentQuery.refetch;

  // ── Filtered data ──
  const filtered = useMemo(() => {
    let r = instructors;
    if (filterValues.status)
      r = r.filter((i) => i.status === filterValues.status);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter(
        (i) =>
          i.name?.toLowerCase().includes(q) ||
          i.email?.toLowerCase().includes(q) ||
          (i.license_number || "").toLowerCase().includes(q)
      );
    }
    return r;
  }, [instructors, filterValues, searchValue]);

  // ── Columns ──
  const columns: Column<Instructor>[] = useMemo(
    () => [
      {
        key: "name",
        header: t("common.name", "Name"),
        render: (i) => (
          <div>
            <p className="text-sm text-white font-medium">{i.name}</p>
            <p className="text-xs text-gray-500">{i.email}</p>
          </div>
        ),
      },
      {
        key: "license",
        header: "License / Quals",
        render: (i) => (
          <span className="text-xs text-gray-300">
            {i.license_number || (typeof i.qualifications === 'string' ? i.qualifications : Array.isArray(i.qualifications) ? i.qualifications.join(', ') : '') || "—"}
          </span>
        ),
      },
      {
        key: "status",
        header: t("common.status", "Status"),
        render: (i) => (
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              STATUS_COLORS[i.status] || "bg-gray-500/10 text-gray-400"
            }`}
          >
            {i.status
              ? i.status.charAt(0).toUpperCase() + i.status.slice(1).replace(/_/g, " ")
              : "—"}
          </span>
        ),
      },
      {
        key: "student_count",
        header: "Students",
        render: (i) => (
          <span className="text-sm text-white font-mono">
            {i.student_count ?? 0}
          </span>
        ),
      },
      {
        key: "actions",
        header: t("common.actions", "Actions"),
        sortable: false,
        render: () => (
          <span className="text-xs text-gray-500">View in Django Admin</span>
        ),
      },
    ],
    [t]
  );

  // ── Render ──
  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110} />
            <div>
              <h1 className="text-lg font-bold text-white">
                {t("admin.instructors", "Instructors")}
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
        {/* Tabs */}
        <div className="flex gap-1 bg-navy-800 rounded-lg p-1 w-fit border border-navy-700">
          <button
            onClick={() => setActiveTab("ground")}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activeTab === "ground"
                ? "bg-gold-500/20 text-gold-500 font-medium"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Ground Instructors
          </button>
          <button
            onClick={() => setActiveTab("flight")}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activeTab === "flight"
                ? "bg-gold-500/20 text-gold-500 font-medium"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Flight Instructors
          </button>
        </div>

        {/* Stats Bar */}
        {!isLoading && instructors.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                Total {activeTab === "ground" ? "Ground" : "Flight"}
              </p>
              <p className="text-2xl font-bold text-white mt-1">
                {instructors.length}
              </p>
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Active</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {instructors.filter((i) => i.status === "active").length}
              </p>
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">On Leave</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">
                {instructors.filter((i) => i.status === "on_leave").length}
              </p>
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total Students</p>
              <p className="text-2xl font-bold text-gold-500 mt-1">
                {instructors.reduce((sum, i) => sum + (i.student_count || 0), 0)}
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <ErrorCard
            message={(error as any)?.message || "Failed to load instructors"}
            onRetry={() => refetch()}
          />
        )}

        {/* Filter Bar */}
        <FilterBar
          filters={[
            {
              key: "status",
              label: "All Statuses",
              options: STATUSES.map((s) => ({
                value: s,
                label: s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " "),
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
          searchPlaceholder="Search name, email, or license..."
        />

        {/* Table */}
        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              instructors.length === 0
                ? `No ${activeTab === "ground" ? "ground" : "flight"} instructors found.`
                : "No instructors match your filters."
            }
            title={
              instructors.length === 0
                ? "No instructors yet"
                : "No matching instructors"
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            keyField="id"
            onRowClick={(i) => setSelectedInstructor(i as Instructor)}
          />
        )}
      </main>

      {/* Instructor Detail Modal */}
      <ModalForm
        open={!!selectedInstructor}
        onClose={() => setSelectedInstructor(null)}
        title={selectedInstructor?.name || ''}
        footer={
          <button
            onClick={() => setSelectedInstructor(null)}
            className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white"
          >
            {t("common.close", "Close")}
          </button>
        }
      >
        {selectedInstructor && (
          <div className="space-y-6">
            <section>
              <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Contact</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Email</p>
                  <p className="text-sm text-white">{selectedInstructor.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Phone</p>
                  <p className="text-sm text-white">{selectedInstructor.phone || "—"}</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Professional</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">License #</p>
                  <p className="text-sm text-white">{selectedInstructor.license_number || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Status</p>
                  <p className="text-sm text-white">{selectedInstructor.status ? selectedInstructor.status.charAt(0).toUpperCase() + selectedInstructor.status.slice(1).replace(/_/g, " ") : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Total Flight Hours</p>
                  <p className="text-sm text-white">{selectedInstructor.total_flight_hours ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Instruction Hours</p>
                  <p className="text-sm text-white">{selectedInstructor.instruction_hours ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Students Assigned</p>
                  <p className="text-sm text-white">{selectedInstructor.student_count ?? 0}</p>
                </div>
              </div>
            </section>

            {selectedInstructor.qualifications && (Array.isArray(selectedInstructor.qualifications) ? selectedInstructor.qualifications.length > 0 : true) && (
              <section>
                <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Qualifications</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(selectedInstructor.qualifications)
                    ? selectedInstructor.qualifications.map((q: string, i: number) => (
                        <span key={i} className="text-xs px-2 py-1 bg-gold-500/10 text-gold-400 border border-gold-500/20 rounded-full">{q}</span>
                      ))
                    : typeof selectedInstructor.qualifications === 'string'
                    ? <span className="text-sm text-white">{selectedInstructor.qualifications}</span>
                    : null
                  }
                </div>
              </section>
            )}
          </div>
        )}
      </ModalForm>
    </div>
  );
}
