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

interface Room {
  id: string;
  name: string;
  capacity: number;
  location: string;
  equipment: string;
  status: string;
}

// ── Constants ─────────────────────────────────────────────

const STATUSES = ["available", "occupied", "maintenance", "out_of_service"];

const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-500/10 text-green-400",
  occupied: "bg-red-500/10 text-red-400",
  maintenance: "bg-amber-500/10 text-amber-400",
  out_of_service: "bg-gray-500/10 text-gray-400",
};

const fmtStatus = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// ── Component ─────────────────────────────────────────────

export default function AdminRoomsPage() {
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
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [createForm, setCreateForm] = useState({
    name: "",
    capacity: "",
    location: "",
    status: "available" as string,
  });
  const [equipmentList, setEquipmentList] = useState<string[]>([]);
  const [newEquipment, setNewEquipment] = useState("");

  // ── Auth guard ──
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  // ── Query ──
  const {
    data: rooms,
    isLoading,
    error,
    refetch,
  } = useQuery<Room[]>({
    queryKey: ["admin-rooms"],
    queryFn: async () => {
      const d = await api.get<any>("/rooms/");
      return (d as any) ?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  // ── Create mutation ──
  const createMutation = useMutation({
    mutationFn: () => api.post("/rooms/", {
      ...createForm,
      equipment: equipmentList,
    }),
    onSuccess: () => {
      showToast("success", "Room created successfully");
      setCreateOpen(false);
      setCreateForm({ name: "", capacity: "", location: "", status: "available" });
      setEquipmentList([]);
      setNewEquipment("");
      queryClient.invalidateQueries({ queryKey: ["admin-rooms"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to create room");
    },
  });

  // ── Filtered data ──
  const filtered = useMemo(() => {
    if (!rooms) return [];
    let r = rooms;
    if (filterValues.status)
      r = r.filter((room) => room.status === filterValues.status);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter(
        (room) =>
          room.name?.toLowerCase().includes(q) ||
          (room.location || "").toLowerCase().includes(q)
      );
    }
    return r;
  }, [rooms, filterValues, searchValue]);

  // ── Columns ──
  const columns: Column<Room>[] = useMemo(
    () => [
      {
        key: "name",
        header: t("common.name", "Name"),
        render: (r) => <span className="text-sm text-white font-medium">{r.name}</span>,
      },
      {
        key: "capacity",
        header: "Capacity",
        render: (r) => (
          <span className="text-sm text-white font-mono">{r.capacity}</span>
        ),
      },
      {
        key: "location",
        header: "Location",
        render: (r) => (
          <span className="text-sm text-gray-400">{r.location || "—"}</span>
        ),
      },
      {
        key: "equipment",
        header: "Equipment",
        render: (r) => (
          <span className="text-xs text-gray-400 max-w-[200px] truncate block">
            {r.equipment || "—"}
          </span>
        ),
      },
      {
        key: "status",
        header: t("common.status", "Status"),
        render: (r) => (
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              STATUS_COLORS[r.status] || "bg-gray-500/10 text-gray-400"
            }`}
          >
            {fmtStatus(r.status)}
          </span>
        ),
      },
    ],
    [t]
  );

  // ── Stats ──
  const stats = useMemo(() => {
    if (!rooms) return { total: 0, available: 0, occupied: 0, maintenance: 0 };
    return {
      total: rooms.length,
      available: rooms.filter((r) => r.status === "available").length,
      occupied: rooms.filter((r) => r.status === "occupied").length,
      maintenance: rooms.filter((r) => r.status === "maintenance").length,
    };
  }, [rooms]);

  // ── Render ──
  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110} />
            <div>
              <h1 className="text-lg font-bold text-white">
                {t("admin.rooms", "Classrooms")}
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
            + {t("common.create", "Create Room")}
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Error */}
        {error && (
          <ErrorCard
            message={(error as any)?.message || "Failed to load rooms"}
            onRetry={() => refetch()}
          />
        )}

        {/* Stats Bar */}
        {!isLoading && rooms && rooms.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total Rooms</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Available</p>
              <p className="text-2xl font-bold text-green-400 mt-1">{stats.available}</p>
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Occupied</p>
              <p className="text-2xl font-bold text-red-400 mt-1">{stats.occupied}</p>
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Maintenance</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{stats.maintenance}</p>
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
          searchPlaceholder="Search name or location..."
        />

        {/* Table */}
        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              rooms?.length === 0
                ? "No rooms have been created yet."
                : "No rooms match your filters."
            }
            title={rooms?.length === 0 ? "No rooms yet" : "No matching rooms"}
            action={
              rooms?.length === 0
                ? { label: "Create Room", onClick: () => setCreateOpen(true) }
                : undefined
            }
          />
        ) : (
          <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(r) => setSelectedRoom(r as Room)} />
        )}

        {/* Create Room Modal */}
        <ModalForm
          open={createOpen}
          onClose={() => {
            setCreateOpen(false);
            setCreateForm({ name: "", capacity: "", location: "", status: "available" });
            setEquipmentList([]);
            setNewEquipment("");
          }}
          title="Create Room"
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
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !createForm.name}
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
                {t("common.name", "Name")} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Room 101"
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Capacity</label>
              <input
                type="number"
                min="1"
                value={createForm.capacity}
                onChange={(e) => setCreateForm((f) => ({ ...f, capacity: e.target.value }))}
                placeholder="30"
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Location</label>
              <input
                type="text"
                value={createForm.location}
                onChange={(e) => setCreateForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Building A, 2nd Floor"
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Equipment</label>
              {equipmentList.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {equipmentList.map((item, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-gold-500/10 text-gold-400 border border-gold-500/20 rounded-full">
                      {item}
                      <button
                        type="button"
                        onClick={() => setEquipmentList(prev => prev.filter((_, j) => j !== i))}
                        className="text-gold-500 hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newEquipment}
                  onChange={(e) => setNewEquipment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newEquipment.trim()) {
                      e.preventDefault();
                      setEquipmentList(prev => [...prev, newEquipment.trim()]);
                      setNewEquipment('');
                    }
                  }}
                  placeholder="e.g. Projector, Whiteboard..."
                  className="flex-1 px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newEquipment.trim()) {
                      setEquipmentList(prev => [...prev, newEquipment.trim()]);
                      setNewEquipment('');
                    }
                  }}
                  disabled={!newEquipment.trim()}
                  className="px-4 py-2 text-xs bg-gold-500/20 text-gold-400 border border-gold-500/30 rounded-lg hover:bg-gold-500/30 disabled:opacity-40 transition-colors"
                >
                  + Add
                </button>
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

        {/* Room Detail Modal */}
        <ModalForm
          open={!!selectedRoom}
          onClose={() => setSelectedRoom(null)}
          title={selectedRoom?.name || ''}
          footer={
            <button
              onClick={() => setSelectedRoom(null)}
              className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white"
            >
              {t("common.close", "Close")}
            </button>
          }
        >
          {selectedRoom && (
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Room Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Name</p>
                    <p className="text-sm text-white font-medium">{selectedRoom.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Capacity</p>
                    <p className="text-sm text-white font-mono">{selectedRoom.capacity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Location</p>
                    <p className="text-sm text-white">{selectedRoom.location || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Status</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[selectedRoom.status] || "bg-gray-500/10 text-gray-400"}`}>
                      {fmtStatus(selectedRoom.status)}
                    </span>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Equipment</h3>
                {(() => {
                  try {
                    const eq = typeof selectedRoom.equipment === 'string' ? JSON.parse(selectedRoom.equipment) : selectedRoom.equipment;
                    if (Array.isArray(eq) && eq.length > 0) {
                      return (
                        <div className="flex flex-wrap gap-2">
                          {eq.map((item: string, i: number) => (
                            <span key={i} className="text-xs px-2.5 py-1 bg-gold-500/10 text-gold-400 border border-gold-500/20 rounded-full">{item}</span>
                          ))}
                        </div>
                      );
                    }
                    if (eq && typeof eq === 'object' && !Array.isArray(eq)) {
                      return (
                        <div className="space-y-2">
                          {Object.entries(eq).map(([k, v]) => (
                            <div key={k} className="flex items-center justify-between bg-navy-900 rounded-lg px-3 py-2">
                              <span className="text-sm text-white">{k}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${v ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>
                                {v ? 'Yes' : 'No'}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                  } catch {}
                  return <p className="text-sm text-gray-500">No equipment listed</p>;
                })()}
              </section>
            </div>
          )}
        </ModalForm>
      </main>
    </div>
  );
}
