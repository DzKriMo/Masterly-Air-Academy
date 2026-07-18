"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";

// ── Types ─────────────────────────────────────────────────

interface Simulator {
  id: string;
  name: string;
}

interface SimulatorSession {
  id: string;
  simulator: string;
  simulator_name: string;
  student: string;
  student_name: string;
  instructor: string;
  instructor_name: string;
  scheduled_date: string;
  duration: number | null;
  status: string;
  notes?: string | null;
}

// ── Constants ─────────────────────────────────────────────

const SESSION_STATUSES = ["scheduled", "in_progress", "completed", "cancelled"];

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-400",
  in_progress: "bg-amber-500/10 text-amber-400",
  completed: "bg-green-500/10 text-green-400",
  cancelled: "bg-gray-500/10 text-gray-400",
};

const fmtStatus = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

// ── Component ─────────────────────────────────────────────

export default function AdminSimulatorSessionsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // ── Filter state ──
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  // ── Create modal state ──
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    simulator: "",
    student: "",
    instructor: "",
    scheduled_date: "",
    duration: "",
  });

  // ── Auth guard ──
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  // ── Query: simulator sessions ──
  const {
    data: sessions,
    isLoading,
    error,
    refetch,
  } = useQuery<SimulatorSession[]>({
    queryKey: ["admin-simulator-sessions"],
    queryFn: async () => {
      const d = await api.get<any>("/simulator-sessions/");
      return (d as any) ?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  // ── Query: simulators (for dropdown) ──
  const { data: simulators = [] } = useQuery<Simulator[]>({
    queryKey: ["admin-simulators-list"],
    queryFn: async () => {
      const d = await api.get<any>("/simulators/");
      return (d as any) ?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  // ── Query: students (for dropdown) ──
  const { data: students = [] } = useQuery<any[]>({
    queryKey: ["admin-students-list"],
    queryFn: async () => {
      const d = await api.get<any>("/students/");
      return (d as any) ?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  // ── Query: instructors (for dropdown) ──
  const { data: instructors = [] } = useQuery<any[]>({
    queryKey: ["admin-instructors-list"],
    queryFn: async () => {
      const d = await api.get<any>("/flight-instructors/");
      return (d as any) ?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  // ── Create mutation ──
  const createMutation = useMutation({
    mutationFn: (payload: typeof createForm) =>
      api.post("/simulator-sessions/", {
        ...payload,
        duration: payload.duration ? parseFloat(payload.duration) : null,
      }),
    onSuccess: () => {
      showToast("success", "Simulator session created successfully");
      setCreateOpen(false);
      setCreateForm({
        simulator: "", student: "", instructor: "",
        scheduled_date: "", duration: "",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-simulator-sessions"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to create simulator session");
    },
  });

  // ── Filtered data ──
  const filtered = useMemo(() => {
    if (!sessions) return [];
    let r = sessions;
    if (filterValues.status)
      r = r.filter((s) => s.status === filterValues.status);
    if (filterValues.simulator)
      r = r.filter((s) => s.simulator === filterValues.simulator);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter(
        (s) =>
          s.simulator_name?.toLowerCase().includes(q) ||
          s.student_name?.toLowerCase().includes(q) ||
          s.instructor_name?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [sessions, filterValues, searchValue]);

  // ── Columns ──
  const columns: Column<SimulatorSession>[] = useMemo(
    () => [
      {
        key: "simulator_name",
        header: "Simulator",
        render: (s) => (
          <span className="text-sm font-semibold text-white">{s.simulator_name}</span>
        ),
      },
      {
        key: "student_name",
        header: "Student",
        render: (s) => (
          <span className="text-sm text-gray-300">{s.student_name}</span>
        ),
      },
      {
        key: "instructor_name",
        header: "Instructor",
        render: (s) => (
          <span className="text-sm text-gray-300">{s.instructor_name}</span>
        ),
      },
      {
        key: "scheduled_date",
        header: "Date",
        render: (s) => (
          <span className="text-sm text-gray-300">{formatDateTime(s.scheduled_date)}</span>
        ),
      },
      {
        key: "duration",
        header: "Duration (h)",
        render: (s) => (
          <span className="text-sm text-white font-mono">{s.duration ?? "—"}</span>
        ),
      },
      {
        key: "status",
        header: t("common.status", "Status"),
        render: (s) => (
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              STATUS_COLORS[s.status] || "bg-gray-500/10 text-gray-400"
            }`}
          >
            {fmtStatus(s.status)}
          </span>
        ),
      },
    ],
    [t]
  );

  // ── Simulator filter options ──
  const simulatorFilterOptions = useMemo(
    () =>
      simulators.map((sim: Simulator) => ({
        value: sim.id,
        label: sim.name,
      })),
    [simulators]
  );

  // ── Render ──
  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110} />
            <div>
              <h1 className="text-lg font-bold text-white">Simulator Sessions</h1>
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="text-xs text-gray-500 hover:text-gold-500"
              >
                {t("common.back", "Back to Dashboard")}
              </button>
            </div>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors"
          >
            + New Session
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Error */}
        {error && (
          <ErrorCard
            message={(error as any)?.message || "Failed to load simulator sessions"}
            onRetry={() => refetch()}
          />
        )}

        {/* Filter Bar */}
        <FilterBar
          filters={[
            {
              key: "status",
              label: "All Statuses",
              options: SESSION_STATUSES.map((s) => ({
                value: s,
                label: fmtStatus(s),
              })),
            },
            {
              key: "simulator",
              label: "All Simulators",
              options: simulatorFilterOptions,
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
          searchPlaceholder="Search simulator, student, or instructor..."
        />

        {/* Table */}
        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              sessions?.length === 0
                ? "No simulator sessions have been created yet."
                : "No sessions match your filters."
            }
            title={sessions?.length === 0 ? "No sessions yet" : "No matching sessions"}
            action={
              sessions?.length === 0
                ? { label: "New Session", onClick: () => setCreateOpen(true) }
                : undefined
            }
          />
        ) : (
          <DataTable columns={columns} data={filtered} keyField="id" />
        )}

        {/* Create Session Modal */}
        <ModalForm
          open={createOpen}
          onClose={() => {
            setCreateOpen(false);
            setCreateForm({
              simulator: "", student: "", instructor: "",
              scheduled_date: "", duration: "",
            });
          }}
          title="New Simulator Session"
          footer={
            <>
              <button
                onClick={() => setCreateOpen(false)}
                disabled={createMutation.isPending}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                onClick={() => createMutation.mutate(createForm)}
                disabled={createMutation.isPending || !createForm.simulator || !createForm.student || !createForm.instructor || !createForm.scheduled_date}
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50"
              >
                {createMutation.isPending
                  ? "Creating..."
                  : t("common.create", "Create")}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Simulator <span className="text-red-400">*</span>
              </label>
              <select
                value={createForm.simulator}
                onChange={(e) => setCreateForm((f) => ({ ...f, simulator: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="">Select simulator...</option>
                {simulators.map((sim: Simulator) => (
                  <option key={sim.id} value={sim.id}>{sim.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Student <span className="text-red-400">*</span>
                </label>
                <select
                  value={createForm.student}
                  onChange={(e) => setCreateForm((f) => ({ ...f, student: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                >
                  <option value="">Select student...</option>
                  {students.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.full_name || `${s.first_name} ${s.last_name}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Instructor <span className="text-red-400">*</span>
                </label>
                <select
                  value={createForm.instructor}
                  onChange={(e) => setCreateForm((f) => ({ ...f, instructor: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                >
                  <option value="">Select instructor...</option>
                  {instructors.map((inst: any) => (
                    <option key={inst.id} value={inst.id}>{inst.first_name} {inst.last_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Scheduled Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={createForm.scheduled_date}
                  onChange={(e) => setCreateForm((f) => ({ ...f, scheduled_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Duration (hours)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={createForm.duration}
                  onChange={(e) => setCreateForm((f) => ({ ...f, duration: e.target.value }))}
                  placeholder="2.0"
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </ModalForm>
      </main>
    </div>
  );
}
