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

interface Contract {
  id: string;
  contract_number: string;
  student_name: string;
  student: string;
  type: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface Student {
  id: string;
  full_name: string;
  student_number: string;
}

// ── Constants ─────────────────────────────────────────────

const STATUSES = ["active", "completed", "terminated", "draft", "cancelled"];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-400",
  completed: "bg-blue-500/10 text-blue-400",
  terminated: "bg-red-500/10 text-red-400",
  draft: "bg-yellow-500/10 text-yellow-400",
  cancelled: "bg-gray-500/10 text-gray-400",
};

const CONTRACT_TYPES = ["training", "employment", "service", "other"];

// ── Helpers ───────────────────────────────────────────────

function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Component ─────────────────────────────────────────────

export default function AdminContractsPage() {
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
    student: "",
    type: "training",
    start_date: "",
    end_date: "",
  });

  // ── Auth guard ──
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  // ── Data query ──
  const {
    data: contracts,
    isLoading,
    error,
    refetch,
  } = useQuery<Contract[]>({
    queryKey: ["admin-contracts"],
    queryFn: async () => {
      const d = await api.get<any>("/contracts/");
      return (d as any) ?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  const { data: students } = useQuery<Student[]>({
    queryKey: ["admin-students-dropdown"],
    queryFn: async () => {
      const d = await api.get<any>("/students/");
      return (d as any) ?.results || (d as any) || [];
    },
    enabled: isAuthenticated && createOpen,
  });

  // ── Create mutation ──
  const createMutation = useMutation({
    mutationFn: async (payload: typeof createForm) => {
      return api.post("/contracts/", payload);
    },
    onSuccess: () => {
      showToast("success", "Contract created successfully");
      setCreateOpen(false);
      setCreateForm({
        student: "",
        type: "training",
        start_date: "",
        end_date: "",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-contracts"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to create contract");
    },
  });

  // ── Filtered data ──
  const filtered = useMemo(() => {
    if (!contracts) return [];
    let r = contracts;
    if (filterValues.status)
      r = r.filter((i) => i.status === filterValues.status);
    if (filterValues.type)
      r = r.filter((i) => i.type === filterValues.type);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter(
        (i) =>
          i.contract_number?.toLowerCase().includes(q) ||
          i.student_name?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [contracts, filterValues, searchValue]);

  // ── Columns ──
  const columns: Column<Contract>[] = useMemo(
    () => [
      {
        key: "contract_number",
        header: "Contract #",
        render: (i) => (
          <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono">
            {i.contract_number}
          </span>
        ),
      },
      { key: "student_name", header: t("common.name", "Student") },
      {
        key: "type",
        header: "Type",
        render: (i) => (
          <span className="text-xs px-2 py-0.5 rounded bg-navy-700 text-gray-300">
            {formatLabel(i.type)}
          </span>
        ),
      },
      {
        key: "start_date",
        header: "Start",
        render: (i) => (
          <span className="text-xs text-gray-500">
            {i.start_date
              ? new Date(i.start_date).toLocaleDateString()
              : "—"}
          </span>
        ),
      },
      {
        key: "end_date",
        header: "End",
        render: (i) => (
          <span className="text-xs text-gray-500">
            {i.end_date
              ? new Date(i.end_date).toLocaleDateString()
              : "—"}
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
            {formatLabel(i.status)}
          </span>
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
                {t("admin.contracts", "Contracts")}
              </h1>
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
            className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400"
          >
            + {t("common.create", "Create Contract")}
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Error */}
        {error && (
          <ErrorCard
            message={(error as any).message || "Failed to load contracts"}
            onRetry={() => refetch()}
          />
        )}

        {/* Filter bar */}
        <FilterBar
          filters={[
            {
              key: "status",
              label: "All Statuses",
              options: STATUSES.map((s) => ({
                value: s,
                label: formatLabel(s),
              })),
            },
            {
              key: "type",
              label: "All Types",
              options: CONTRACT_TYPES.map((t) => ({
                value: t,
                label: formatLabel(t),
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
          searchPlaceholder="Search contract # or student..."
        />

        {/* Table */}
        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message="No contracts found."
            title={
              contracts?.length === 0
                ? "No contracts yet"
                : "No matching contracts"
            }
            action={
              contracts?.length === 0
                ? {
                    label: "Create Contract",
                    onClick: () => setCreateOpen(true),
                  }
                : undefined
            }
          />
        ) : (
          <DataTable columns={columns} data={filtered} keyField="id" />
        )}

        {/* Create Contract Modal */}
        <ModalForm
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Create Contract"
          footer={
            <>
              <button
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                onClick={() => createMutation.mutate(createForm)}
                disabled={
                  createMutation.isPending ||
                  !createForm.student ||
                  !createForm.start_date ||
                  !createForm.end_date
                }
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
                Student
              </label>
              <select
                value={createForm.student}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    student: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="">Select student...</option>
                {(students || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.student_number})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Type</label>
              <select
                value={createForm.type}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    type: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                {CONTRACT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {formatLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={createForm.start_date}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      start_date: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={createForm.end_date}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      end_date: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </ModalForm>
      </main>
    </div>
  );
}
