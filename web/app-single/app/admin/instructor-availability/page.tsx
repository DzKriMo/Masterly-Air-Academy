"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useTranslation } from "@/lib/use-translation";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";

interface Availability {
  id: string;
  instructor: string;
  instructor_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function fmtTime(t: string) {
  if (!t) return "—";
  try {
    const [h, m] = t.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${m} ${ampm}`;
  } catch { return t; }
}

export default function AdminInstructorAvailabilityPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");
  const [selected, setSelected] = useState<Availability | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ instructor: "", day_of_week: "0", start_time: "08:00", end_time: "17:00", is_available: true });
  const [createError, setCreateError] = useState("");
  const [editItem, setEditItem] = useState<Availability | null>(null);
  const [editForm, setEditForm] = useState({ instructor: "", day_of_week: "0", start_time: "08:00", end_time: "17:00", is_available: true });
  const [editError, setEditError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Availability | null>(null);

  const { data: records, isLoading, error, refetch } = useQuery<Availability[]>({
    queryKey: ["admin-availability"],
    queryFn: async () => { const d = await api.get<any>("/instructor-availability/"); return (d as any)?.results || (d as any) || []; },
    enabled: isAuthenticated,
  });

  const { data: instructors = [] } = useQuery<any[]>({
    queryKey: ["admin-avail-instructors"],
    queryFn: async () => { const d = await api.get<any>("/flight-instructors/"); return (d as any)?.results || (d as any) || []; },
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: (p: typeof createForm) => api.post("/instructor-availability/", { ...p, day_of_week: parseInt(p.day_of_week, 10), instructor: p.instructor || null }),
    onSuccess: () => { showToast("success", "Availability added"); setCreateOpen(false); setCreateForm({ instructor: "", day_of_week: "0", start_time: "08:00", end_time: "17:00", is_available: true }); setCreateError(""); queryClient.invalidateQueries({ queryKey: ["admin-availability"] }); },
    onError: (err: any) => { setCreateError(err?.data ? Object.values(err.data).flat().join(", ") : err.message); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, p }: { id: string; p: typeof editForm }) => api.patch(`/instructor-availability/${id}/`, { ...p, day_of_week: parseInt(p.day_of_week, 10) }),
    onSuccess: () => { showToast("success", "Updated"); setEditItem(null); queryClient.invalidateQueries({ queryKey: ["admin-availability"] }); },
    onError: (err: any) => { setEditError(err?.data ? Object.values(err.data).flat().join(", ") : err.message); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/instructor-availability/${id}/`),
    onSuccess: () => { showToast("success", "Deleted"); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ["admin-availability"] }); },
    onError: (err: any) => { showToast("error", err.message); },
  });

  const filtered = useMemo(() => {
    if (!records) return [];
    let r = records;
    if (filterValues.instructor) r = r.filter((a) => a.instructor === filterValues.instructor);
    if (searchValue) { const q = searchValue.toLowerCase(); r = r.filter((a) => (a.instructor_name || "").toLowerCase().includes(q)); }
    return r;
  }, [records, filterValues, searchValue]);

  const columns: Column<Availability>[] = useMemo(() => [
    { key: "instructor_name", header: "Instructor", render: (a) => <span className="text-sm font-semibold text-white">{a.instructor_name}</span> },
    { key: "day_of_week", header: "Day", render: (a) => <span className="text-sm text-gray-300">{DAY_NAMES[a.day_of_week] || "—"}</span> },
    { key: "start_time", header: "Start", render: (a) => <span className="text-sm text-gray-300">{fmtTime(a.start_time)}</span> },
    { key: "end_time", header: "End", render: (a) => <span className="text-sm text-gray-300">{fmtTime(a.end_time)}</span> },
    { key: "is_available", header: "Available", render: (a) => <span className={`text-xs px-2 py-0.5 rounded ${a.is_available ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{a.is_available ? "Yes" : "No"}</span> },
    {
      key: "actions", header: "", render: (a) => (
        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { setEditItem(a); setEditForm({ instructor: a.instructor, day_of_week: String(a.day_of_week), start_time: a.start_time, end_time: a.end_time, is_available: a.is_available }); setEditError(""); }} className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded">Edit</button>
          <button onClick={() => setDeleteTarget(a)} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded">Delete</button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader title="Instructor Availability" backHref="/admin/dashboard" backLabel={t("common.back", "Back to Dashboard")} actions={<button onClick={() => setCreateOpen(true)} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400">+ Add Slot</button>} />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={(error as any)?.message || "Failed to load"} onRetry={() => refetch()} />}
        <FilterBar filters={[{ key: "instructor", label: "All Instructors", options: instructors.map((i: any) => ({ value: i.id, label: `${i.first_name} ${i.last_name}` })) }]} values={filterValues} onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))} onClear={() => { setFilterValues({}); setSearchValue(""); }} searchValue={searchValue} onSearchChange={setSearchValue} searchPlaceholder="Search by instructor..." />
        {isLoading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? <EmptyState message={records?.length === 0 ? "No availability slots." : "No matches."} title={records?.length === 0 ? "No slots yet" : "No matches"} action={records?.length === 0 ? { label: "Add Slot", onClick: () => setCreateOpen(true) } : undefined} /> : <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(item) => setSelected(item as Availability)} />}

        <ModalForm open={!!selected} onClose={() => setSelected(null)} title="Availability Slot" footer={<button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">Close</button>}>
          {selected && <div className="space-y-4">
            <DetailField label="Instructor" value={selected.instructor_name} />
            <DetailField label="Day" value={DAY_NAMES[selected.day_of_week] || "—"} />
            <DetailField label="Start Time" value={fmtTime(selected.start_time)} />
            <DetailField label="End Time" value={fmtTime(selected.end_time)} />
            <DetailField label="Available" value={selected.is_available ? "Yes" : "No"} />
          </div>}
        </ModalForm>

        <ModalForm open={createOpen} onClose={() => { setCreateOpen(false); setCreateForm({ instructor: "", day_of_week: "0", start_time: "08:00", end_time: "17:00", is_available: true }); setCreateError(""); }} title="Add Availability Slot" footer={<><button onClick={() => { setCreateOpen(false); setCreateForm({ instructor: "", day_of_week: "0", start_time: "08:00", end_time: "17:00", is_available: true }); setCreateError(""); }} disabled={createMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">Cancel</button><button onClick={() => createMutation.mutate(createForm)} disabled={createMutation.isPending || !createForm.instructor} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{createMutation.isPending ? "Creating..." : "Create"}</button></>}>
          <div className="space-y-4">
            {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{createError}</div>}
            <div><label className="block text-sm text-gray-400 mb-1">Instructor <span className="text-red-400">*</span></label><select value={createForm.instructor} onChange={(e) => setCreateForm((f) => ({ ...f, instructor: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"><option value="">Select instructor...</option>{instructors.map((i: any) => <option key={i.id} value={i.id}>{i.first_name} {i.last_name}</option>)}</select></div>
            <div><label className="block text-sm text-gray-400 mb-1">Day of Week</label><select value={createForm.day_of_week} onChange={(e) => setCreateForm((f) => ({ ...f, day_of_week: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">{DAY_NAMES.map((d, i) => <option key={i} value={String(i)}>{d}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Start Time</label><input type="time" value={createForm.start_time} onChange={(e) => setCreateForm((f) => ({ ...f, start_time: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">End Time</label><input type="time" value={createForm.end_time} onChange={(e) => setCreateForm((f) => ({ ...f, end_time: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={createForm.is_available} onChange={(e) => setCreateForm((f) => ({ ...f, is_available: e.target.checked }))} className="w-4 h-4 rounded bg-navy-900 border-navy-700 text-gold-500 focus:ring-gold-500/30" /><span className="text-sm text-gray-300">Available</span></label>
          </div>
        </ModalForm>

        <ModalForm open={!!editItem} onClose={() => setEditItem(null)} title="Edit Slot" footer={<><button onClick={() => setEditItem(null)} disabled={updateMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">Cancel</button><button onClick={() => { if (editItem) updateMutation.mutate({ id: editItem.id, p: editForm }); }} disabled={updateMutation.isPending || !editForm.instructor} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{updateMutation.isPending ? "Saving..." : "Save"}</button></>}>
          <div className="space-y-4">
            {editError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{editError}</div>}
            <div><label className="block text-sm text-gray-400 mb-1">Instructor</label><select value={editForm.instructor} onChange={(e) => setEditForm((f) => ({ ...f, instructor: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">{instructors.map((i: any) => <option key={i.id} value={i.id}>{i.first_name} {i.last_name}</option>)}</select></div>
            <div><label className="block text-sm text-gray-400 mb-1">Day</label><select value={editForm.day_of_week} onChange={(e) => setEditForm((f) => ({ ...f, day_of_week: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">{DAY_NAMES.map((d, i) => <option key={i} value={String(i)}>{d}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Start</label><input type="time" value={editForm.start_time} onChange={(e) => setEditForm((f) => ({ ...f, start_time: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">End</label><input type="time" value={editForm.end_time} onChange={(e) => setEditForm((f) => ({ ...f, end_time: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={editForm.is_available} onChange={(e) => setEditForm((f) => ({ ...f, is_available: e.target.checked }))} className="w-4 h-4 rounded bg-navy-900 border-navy-700 text-gold-500 focus:ring-gold-500/30" /><span className="text-sm text-gray-300">Available</span></label>
          </div>
        </ModalForm>

        {deleteTarget && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}><div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}><h3 className="text-lg font-semibold text-white">Delete Slot</h3><p className="text-sm text-gray-400">Delete this availability slot?</p><div className="flex justify-end gap-3 pt-2"><button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">Cancel</button><button onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 disabled:opacity-50">{deleteMutation.isPending ? "Deleting..." : "Delete"}</button></div></div></div>}
      </main>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-gray-500 mb-0.5">{label}</p><p className="text-sm text-white">{value}</p></div>;
}