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

interface Aircraft {
  id: string;
  registration: string;
  manufacturer: string;
  model: string;
  serial_number?: string;
  year?: number;
  status: string;
  total_hours?: number;
  next_maintenance?: string;
}

// ── Constants ─────────────────────────────────────────────

const MANUFACTURERS = [
  "Cessna",
  "Piper",
  "Beechcraft",
  "Diamond",
  "Cirrus",
  "Mooney",
  "Other",
];

const STATUSES = ["active", "in_maintenance", "grounded", "retired"];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-400",
  in_maintenance: "bg-amber-500/10 text-amber-400",
  grounded: "bg-red-500/10 text-red-400",
  retired: "bg-gray-500/10 text-gray-400",
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

// ── Component ─────────────────────────────────────────────

export default function AdminAircraftPage() {
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
    registration: "",
    manufacturer: "",
    model: "",
    serial_number: "",
    year: "",
    status: "active",
  });

  // ── Auth guard ──
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  // ── Query ──
  const {
    data: aircraft,
    isLoading,
    error,
    refetch,
  } = useQuery<Aircraft[]>({
    queryKey: ["admin-aircraft"],
    queryFn: async () => {
      const d = await api.get<any>("/aircraft/");
      return (d as any) || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  // ── Create mutation ──
  const createMutation = useMutation({
    mutationFn: (payload: typeof createForm) => api.post("/aircraft/", payload),
    onSuccess: () => {
      showToast("success", "Aircraft added successfully");
      setCreateOpen(false);
      setCreateForm({
        registration: "", manufacturer: "", model: "",
        serial_number: "", year: "", status: "active",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-aircraft"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to add aircraft");
    },
  });

  // ── Filtered data ──
  const filtered = useMemo(() => {
    if (!aircraft) return [];
    let r = aircraft;
    if (filterValues.status)
      r = r.filter((a) => a.status === filterValues.status);
    if (filterValues.manufacturer)
      r = r.filter((a) => a.manufacturer === filterValues.manufacturer);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter(
        (a) =>
          a.registration?.toLowerCase().includes(q) ||
          a.model?.toLowerCase().includes(q) ||
          a.manufacturer?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [aircraft, filterValues, searchValue]);

  // ── Columns ──
  const columns: Column<Aircraft>[] = useMemo(
    () => [
      {
        key: "registration",
        header: "Registration",
        render: (a) => (
          <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono font-semibold">
            {a.registration}
          </span>
        ),
      },
      {
        key: "manufacturer",
        header: "Manufacturer",
        render: (a) => <span className="text-sm text-white">{a.manufacturer}</span>,
      },
      {
        key: "model",
        header: "Model",
        render: (a) => <span className="text-sm text-gray-300">{a.model}</span>,
      },
      {
        key: "status",
        header: t("common.status", "Status"),
        render: (a) => (
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              STATUS_COLORS[a.status] || "bg-gray-500/10 text-gray-400"
            }`}
          >
            {fmtStatus(a.status)}
          </span>
        ),
      },
      {
        key: "total_hours",
        header: "Hours",
        render: (a) => (
          <span className="text-sm text-white font-mono">
            {a.total_hours ?? "—"}
          </span>
        ),
      },
      {
        key: "next_maintenance",
        header: "Next Maintenance",
        render: (a) => (
          <span className="text-xs text-gray-400">
            {formatDate(a.next_maintenance)}
          </span>
        ),
      },
    ],
    [t]
  );

  // ── Stats ──
  const stats = useMemo(() => {
    if (!aircraft) return { total: 0, active: 0, inMaintenance: 0, grounded: 0 };
    return {
      total: aircraft.length,
      active: aircraft.filter((a) => a.status === "active").length,
      inMaintenance: aircraft.filter((a) => a.status === "in_maintenance").length,
      grounded: aircraft.filter((a) => a.status === "grounded").length,
    };
  }, [aircraft]);

  // ── Render ──
  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110} />
            <div>
              <h1 className="text-lg font-bold text-white">
                {t("admin.aircraft", "Fleet")}
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
            className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors"
          >
            + {t("common.create", "Add Aircraft")}
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Error */}
        {error && (
          <ErrorCard
            message={(error as any)?.message || "Failed to load aircraft"}
            onRetry={() => refetch()}
          />
        )}

        {/* Stats Bar */}
        {!isLoading && aircraft && aircraft.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total Fleet</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Active</p>
              <p className="text-2xl font-bold text-green-400 mt-1">{stats.active}</p>
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">In Maintenance</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{stats.inMaintenance}</p>
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Grounded</p>
              <p className="text-2xl font-bold text-red-400 mt-1">{stats.grounded}</p>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <FilterBar
          filters={[
            {
              key: "status",
              label: "All Statuses",
              options: STATUSES.map((s) => ({
                value: s,
                label: fmtStatus(s),
              })),
            },
            {
              key: "manufacturer",
              label: "All Manufacturers",
              options: MANUFACTURERS.map((m) => ({
                value: m,
                label: m,
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
          searchPlaceholder="Search registration, model, or manufacturer..."
        />

        {/* Table */}
        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              aircraft?.length === 0
                ? "No aircraft in the fleet yet."
                : "No aircraft match your filters."
            }
            title={aircraft?.length === 0 ? "No aircraft yet" : "No matching aircraft"}
            action={
              aircraft?.length === 0
                ? { label: "Add Aircraft", onClick: () => setCreateOpen(true) }
                : undefined
            }
          />
        ) : (
          <DataTable columns={columns} data={filtered} keyField="id" />
        )}

        {/* Create Aircraft Modal */}
        <ModalForm
          open={createOpen}
          onClose={() => {
            setCreateOpen(false);
            setCreateForm({
              registration: "", manufacturer: "", model: "",
              serial_number: "", year: "", status: "active",
            });
          }}
          title="Add Aircraft"
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
                disabled={createMutation.isPending || !createForm.registration}
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50"
              >
                {createMutation.isPending
                  ? "Adding..."
                  : t("common.create", "Add")}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Registration <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={createForm.registration}
                onChange={(e) => setCreateForm((f) => ({ ...f, registration: e.target.value }))}
                placeholder="7T-VSA"
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Manufacturer</label>
                <select
                  value={createForm.manufacturer}
                  onChange={(e) => setCreateForm((f) => ({ ...f, manufacturer: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                >
                  <option value="">Select...</option>
                  {MANUFACTURERS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Model</label>
                <input
                  type="text"
                  value={createForm.model}
                  onChange={(e) => setCreateForm((f) => ({ ...f, model: e.target.value }))}
                  placeholder="172 Skyhawk"
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Serial Number</label>
                <input
                  type="text"
                  value={createForm.serial_number}
                  onChange={(e) => setCreateForm((f) => ({ ...f, serial_number: e.target.value }))}
                  placeholder="SN-12345"
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Year</label>
                <input
                  type="number"
                  min="1950"
                  max="2030"
                  value={createForm.year}
                  onChange={(e) => setCreateForm((f) => ({ ...f, year: e.target.value }))}
                  placeholder="2024"
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {t("common.status", "Status")}
              </label>
              <select
                value={createForm.status}
                onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {fmtStatus(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </ModalForm>
      </main>
    </div>
  );
}
