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
  manufacturer: string | null;
  model_name: string | null;
  qualification_type: string | null;
  location: string | null;
  status: string;
  last_maintenance?: string | null;
  next_maintenance?: string | null;
  created_at?: string;
}

// ── Constants ─────────────────────────────────────────────

const STATUSES = ["available", "in_use", "in_maintenance", "offline"];

const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-500/10 text-green-400",
  in_use: "bg-blue-500/10 text-blue-400",
  in_maintenance: "bg-amber-500/10 text-amber-400",
  offline: "bg-gray-500/10 text-gray-400",
};

const QUALIFICATION_TYPES = ["FNPT II", "FNPT II MCC", "FTD", "FFS", "Other"];

const fmtStatus = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// ── Component ─────────────────────────────────────────────

export default function AdminSimulatorsPage() {
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
  const [selectedSim, setSelectedSim] = useState<Simulator | null>(null);
  const [editingSim, setEditingSim] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", manufacturer: "", model_name: "", qualification_type: "", location: "", status: "" });
  const [createForm, setCreateForm] = useState({
    name: "",
    manufacturer: "",
    model_name: "",
    qualification_type: "",
    location: "",
    status: "available",
  });

  // ── Detail/edit modal state ──
  const [selectedSim, setSelectedSim] = useState<Simulator | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    manufacturer: "",
    model_name: "",
    qualification_type: "",
    location: "",
    status: "",
  });

  // ── Auth guard ──
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  // ── Query ──
  const {
    data: simulators,
    isLoading,
    error,
    refetch,
  } = useQuery<Simulator[]>({
    queryKey: ["admin-simulators"],
    queryFn: async () => {
      const d = await api.get<any>("/simulators/");
      return (d as any)?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  // ── Create mutation ──
  const createMutation = useMutation({
    mutationFn: (payload: typeof createForm) => api.post("/simulators/", payload),
    onSuccess: () => {
      showToast("success", "Simulator added successfully");
      setCreateOpen(false);
      setCreateForm({
        name: "", manufacturer: "", model_name: "",
        qualification_type: "", location: "", status: "available",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-simulators"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to add simulator");
    },
  });

  // ── Update mutation ──
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/simulators/${id}/`, data),
    onSuccess: () => {
      showToast("success", "Updated");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["admin-simulators"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to update simulator");
    },
  });

  // ── Filtered data ──
  const filtered = useMemo(() => {
    if (!simulators) return [];
    let r = simulators;
    if (filterValues.status)
      r = r.filter((s) => s.status === filterValues.status);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.manufacturer?.toLowerCase().includes(q) ||
          s.model_name?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [simulators, filterValues, searchValue]);

  // ── Columns ──
  const columns: Column<Simulator>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Name",
        render: (s) => (
          <span className="text-sm font-semibold text-white">{s.name}</span>
        ),
      },
      {
        key: "manufacturer",
        header: "Manufacturer",
        render: (s) => (
          <span className="text-sm text-gray-300">{s.manufacturer || "—"}</span>
        ),
      },
      {
        key: "model_name",
        header: "Model",
        render: (s) => (
          <span className="text-sm text-gray-300">{s.model_name || "—"}</span>
        ),
      },
      {
        key: "qualification_type",
        header: "Qualification",
        render: (s) => (
          <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono">
            {s.qualification_type || "—"}
          </span>
        ),
      },
      {
        key: "location",
        header: "Location",
        render: (s) => (
          <span className="text-sm text-gray-300">{s.location || "—"}</span>
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

  // ── Stats ──
  const stats = useMemo(() => {
    if (!simulators) return { total: 0, available: 0, inUse: 0, inMaintenance: 0 };
    return {
      total: simulators.length,
      available: simulators.filter((s) => s.status === "available").length,
      inUse: simulators.filter((s) => s.status === "in_use").length,
      inMaintenance: simulators.filter((s) => s.status === "in_maintenance").length,
    };
  }, [simulators]);

  // ── Render ──
  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110} />
            <div>
              <h1 className="text-lg font-bold text-white">Simulators</h1>
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
            + Add Simulator
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Error */}
        {error && (
          <ErrorCard
            message={(error as any)?.message || "Failed to load simulators"}
            onRetry={() => refetch()}
          />
        )}

        {/* Stats Bar */}
        {!isLoading && simulators && simulators.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Available</p>
              <p className="text-2xl font-bold text-green-400 mt-1">{stats.available}</p>
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">In Use</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">{stats.inUse}</p>
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">In Maintenance</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{stats.inMaintenance}</p>
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
          ]}
          values={filterValues}
          onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))}
          onClear={() => {
            setFilterValues({});
            setSearchValue("");
          }}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search by name..."
        />

        {/* Table */}
        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              simulators?.length === 0
                ? "No simulators have been added yet."
                : "No simulators match your filters."
            }
            title={simulators?.length === 0 ? "No simulators yet" : "No matching simulators"}
            action={
              simulators?.length === 0
                ? { label: "Add Simulator", onClick: () => setCreateOpen(true) }
                : undefined
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            keyField="id"
            onRowClick={(s) => {
              setSelectedSim(s as Simulator);
              setEditing(false);
              setEditForm({
                name: s.name,
                manufacturer: s.manufacturer || "",
                model_name: s.model_name || "",
                qualification_type: s.qualification_type || "",
                location: s.location || "",
                status: s.status,
              });
            }}
          />
        )}

        {/* Create Simulator Modal */}
        <ModalForm
          open={createOpen}
          onClose={() => {
            setCreateOpen(false);
            setCreateForm({
              name: "", manufacturer: "", model_name: "",
              qualification_type: "", location: "", status: "available",
            });
          }}
          title="Add Simulator"
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
                disabled={createMutation.isPending || !createForm.name}
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
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Simulator 1"
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={createForm.manufacturer}
                  onChange={(e) => setCreateForm((f) => ({ ...f, manufacturer: e.target.value }))}
                  placeholder="Frasca"
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Model</label>
                <input
                  type="text"
                  value={createForm.model_name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, model_name: e.target.value }))}
                  placeholder="142"
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Qualification Type</label>
                <select
                  value={createForm.qualification_type}
                  onChange={(e) => setCreateForm((f) => ({ ...f, qualification_type: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                >
                  <option value="">Select...</option>
                  {QUALIFICATION_TYPES.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Location</label>
                <input
                  type="text"
                  value={createForm.location}
                  onChange={(e) => setCreateForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="Building A, Room 101"
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

        {/* Detail / Edit Simulator Modal */}
        <ModalForm
          open={selectedSim !== null}
          onClose={() => {
            setSelectedSim(null);
            setEditing(false);
          }}
          title={
            editing
              ? `Edit: ${selectedSim?.name}`
              : selectedSim?.name || ""
          }
          footer={
            editing ? (
              <>
                <button
                  onClick={() => setEditing(false)}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!selectedSim) return;
                    updateMutation.mutate({ id: selectedSim.id, data: editForm });
                  }}
                  disabled={updateMutation.isPending || !editForm.name}
                  className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50"
                >
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setSelectedSim(null);
                    setEditing(false);
                  }}
                  className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white"
                >
                  Close
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400"
                >
                  Edit
                </button>
              </>
            )
          }
        >
          {selectedSim && !editing ? (
            /* ── View Mode ── */
            <div className="space-y-6">
              {/* Details Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Name</span>
                    <span className="text-sm text-white">{selectedSim.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Manufacturer</span>
                    <span className="text-sm text-white">{selectedSim.manufacturer || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Model</span>
                    <span className="text-sm text-white">{selectedSim.model_name || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Qualification</span>
                    <span className="text-sm text-white">{selectedSim.qualification_type || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Location</span>
                    <span className="text-sm text-white">{selectedSim.location || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        STATUS_COLORS[selectedSim.status] || "bg-gray-500/10 text-gray-400"
                      }`}
                    >
                      {fmtStatus(selectedSim.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Maintenance Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Maintenance
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Last Maintenance</span>
                    <span className="text-sm text-white">
                      {selectedSim.last_maintenance
                        ? new Date(selectedSim.last_maintenance).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Next Maintenance</span>
                    <span className="text-sm text-white">
                      {selectedSim.next_maintenance
                        ? new Date(selectedSim.next_maintenance).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dates Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Dates
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Created</span>
                    <span className="text-sm text-white">
                      {selectedSim.created_at
                        ? new Date(selectedSim.created_at).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ── Edit Mode ── */
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={editForm.manufacturer}
                  onChange={(e) => setEditForm((f) => ({ ...f, manufacturer: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Model</label>
                <input
                  type="text"
                  value={editForm.model_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, model_name: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Qualification Type</label>
                <select
                  value={editForm.qualification_type}
                  onChange={(e) => setEditForm((f) => ({ ...f, qualification_type: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                >
                  <option value="">Select...</option>
                  {QUALIFICATION_TYPES.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Location</label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
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
          )}
        </ModalForm>
      </main>
    </div>
  );
}
