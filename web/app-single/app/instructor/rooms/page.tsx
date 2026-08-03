"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { PageHeader } from "@/components/page-header";
import { api, unwrapResults, withFullLimit } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";

interface Room {
  id: string;
  name: string;
  capacity: number;
  location: string;
  equipment: string;
  status: string;
}

const STATUSES = ["available", "occupied", "maintenance", "out_of_service"];

const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-500/10 text-green-400",
  occupied: "bg-red-500/10 text-red-400",
  maintenance: "bg-amber-500/10 text-amber-400",
  out_of_service: "bg-gray-500/10 text-gray-400",
};

export default function InstructorRoomsPage() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Room | null>(null);
  const [form, setForm] = useState({ name: "", capacity: "", location: "", status: "available" as string });
  const [equipmentList, setEquipmentList] = useState<string[]>([]);
  const [newEquipment, setNewEquipment] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true); setError(null);
    api.get<any>(withFullLimit("/rooms/"))
      .then(d => {
        const list = unwrapResults(d).map((r: any) => ({
          ...r,
          equipment: Array.isArray(r.equipment) ? r.equipment.join(", ") : r.equipment || "",
        }));
        setRooms(list);
      })
      .catch(err => setError(err.message || "Failed to load rooms."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated]);

  const resetForm = () => {
    setForm({ name: "", capacity: "", location: "", status: "available" });
    setEquipmentList([]);
    setNewEquipment("");
  };

  const openCreate = () => { resetForm(); setCreateOpen(true); };
  const openEdit = (r: Room) => {
    setEditTarget(r);
    setForm({ name: r.name, capacity: String(r.capacity), location: r.location || "", status: r.status });
    setEquipmentList(r.equipment ? r.equipment.split(", ").filter(Boolean) : []);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, capacity: parseInt(form.capacity) || 0, equipment: equipmentList };
      if (editTarget) {
        await api.patch(`/rooms/${editTarget.id}/`, payload);
        showToast("success", "Room updated");
      } else {
        await api.post("/rooms/", payload);
        showToast("success", "Room created");
      }
      setCreateOpen(false); setEditTarget(null);
      load();
    } catch (err: any) {
      showToast("error", err.message || "Failed to save room");
    } finally { setSaving(false); }
  };

  const addEquipment = () => {
    const val = newEquipment.trim();
    if (val && !equipmentList.includes(val)) setEquipmentList([...equipmentList, val]);
    setNewEquipment("");
  };

  const filtered = rooms.filter(r => {
    if (filterValues.status && r.status !== filterValues.status) return false;
    if (searchValue) {
      const q = searchValue.toLowerCase();
      if (!r.name.toLowerCase().includes(q) && !r.location?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const columns: Column<Room>[] = [
    { key: "name", header: t("rooms.name", "Name"), render: (r) => <span className="text-white font-medium">{r.name}</span> },
    { key: "capacity", header: t("rooms.capacity", "Capacity") },
    { key: "location", header: t("rooms.location", "Location"), render: (r) => <span className="text-gray-400">{r.location || "—"}</span> },
    { key: "equipment", header: t("rooms.equipment", "Equipment"), render: (r) => <span className="text-xs text-gray-400 truncate max-w-[200px] block">{r.equipment || "—"}</span> },
    { key: "status", header: t("rooms.status", "Status"), render: (r) => (
      <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[r.status] || "bg-gray-500/10 text-gray-400"}`}>
        {r.status.replace(/_/g, " ")}
      </span>
    )},
    { key: "actions", header: "", render: (r) => (
      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
        <button onClick={() => openEdit(r)} className="px-2 py-1 text-xs text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/10 transition-colors">Edit</button>
      </div>
    )},
  ];

  const formFields = (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t("rooms.name", "Name")} *</label>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t("rooms.capacity", "Capacity")} *</label>
          <input type="number" min="0" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t("rooms.status", "Status")}</label>
          <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm">
            {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t("rooms.location", "Location")}</label>
        <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t("rooms.equipment", "Equipment")}</label>
        <div className="flex gap-2 mb-2">
          <input value={newEquipment} onChange={e => setNewEquipment(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addEquipment(); } }}
            className="flex-1 px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm" />
          <button onClick={addEquipment} type="button" className="px-3 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 rounded text-sm font-semibold">Add</button>
        </div>
        {equipmentList.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {equipmentList.map((item, i) => (
              <span key={i} className="flex items-center gap-1 bg-navy-700 text-gray-300 text-xs px-2 py-1 rounded">
                {item}
                <button onClick={() => setEquipmentList(equipmentList.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300">&times;</button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 min-w-0">
      <PageHeader title={t("instructor.rooms", "Classrooms")} backHref="/instructor/dashboard" maxWidth="max-w-6xl" />
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={error} />}
        {loading ? <LoadingSkeleton type="table" rows={5} /> : rooms.length === 0 ? (
          <>
            <EmptyState message="No classrooms found." />
            <div className="text-center">
              <button onClick={openCreate} className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm">Create Room</button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <FilterBar filters={[{ key: "status", label: "All Statuses", options: STATUSES.map(s => ({ value: s, label: s.replace(/_/g, " ") })) }]}
                values={filterValues} onChange={(k, v) => setFilterValues(p => ({ ...p, [k]: v }))}
                onClear={() => { setFilterValues({}); setSearchValue(""); }}
                searchPlaceholder="Search rooms..." searchValue={searchValue} onSearchChange={setSearchValue} />
              <button onClick={openCreate} className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm whitespace-nowrap shrink-0">+ Create</button>
            </div>
            <DataTable columns={columns} data={filtered as any} keyField="id" />

            <ModalForm open={createOpen || !!editTarget} onClose={() => { setCreateOpen(false); setEditTarget(null); }}
              title={editTarget ? `Edit Room: ${editTarget.name}` : "Create Classroom"}
              footer={
                <div className="flex gap-2">
                  <button onClick={() => { setCreateOpen(false); setEditTarget(null); }} className="px-5 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-sm">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm disabled:opacity-50">
                    {saving ? "Saving..." : editTarget ? "Update" : "Create"}
                  </button>
                </div>
              }>
              {formFields}
            </ModalForm>
          </>
        )}
      </main>
    </div>
  );
}
