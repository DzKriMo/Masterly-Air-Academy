"use client";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useTranslation } from "@/lib/use-translation";
import { PageHeader } from "@/components/page-header";
import { api, unwrapResults } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";

interface Booking {
  id: string;
  resource_type: string;
  resource_id: string;
  start_time: string;
  end_time: string;
  activity_type: string | null;
  activity_id: string | null;
  status: string;
  notes: string | null;
}

const RESOURCE_TYPES = ["aircraft", "simulator", "room"];
const BOOKING_STATUSES = ["confirmed", "cancelled"];

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-green-500/10 text-green-400",
  cancelled: "bg-red-500/10 text-red-400",
};

const TYPE_COLORS: Record<string, string> = {
  aircraft: "bg-blue-500/10 text-blue-400",
  simulator: "bg-purple-500/10 text-purple-400",
  room: "bg-amber-500/10 text-amber-400",
};

const fmtStatus = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try { return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
}

export default function AdminResourceBookingsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ resource_type: "aircraft", resource_id: "", start_time: "", end_time: "", activity_type: "", activity_id: "", status: "confirmed", notes: "" });
  const [createError, setCreateError] = useState("");
  const [editItem, setEditItem] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState({ resource_type: "aircraft", resource_id: "", start_time: "", end_time: "", activity_type: "", activity_id: "", status: "confirmed", notes: "" });
  const [editError, setEditError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null);

  const { data: bookings, isLoading, error, refetch } = useQuery<Booking[]>({
    queryKey: ["admin-bookings"],
    queryFn: async () => { const d = await api.get<any>("/resource-bookings/"); return unwrapResults(d); },
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: (p: typeof createForm) => api.post("/resource-bookings/", { ...p, activity_type: p.activity_type || null, activity_id: p.activity_id || null, notes: p.notes || null }),
    onSuccess: () => { showToast("success", "Booking created"); setCreateOpen(false); setCreateForm({ resource_type: "aircraft", resource_id: "", start_time: "", end_time: "", activity_type: "", activity_id: "", status: "confirmed", notes: "" }); setCreateError(""); queryClient.invalidateQueries({ queryKey: ["admin-bookings"] }); },
    onError: (err: any) => { setCreateError(err?.data ? Object.values(err.data).flat().join(", ") : err.message); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, p }: { id: string; p: typeof editForm }) => api.patch(`/resource-bookings/${id}/`, { ...p, activity_type: p.activity_type || null, activity_id: p.activity_id || null, notes: p.notes || null }),
    onSuccess: () => { showToast("success", "Updated"); setEditItem(null); queryClient.invalidateQueries({ queryKey: ["admin-bookings"] }); },
    onError: (err: any) => { setEditError(err?.data ? Object.values(err.data).flat().join(", ") : err.message); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/resource-bookings/${id}/`),
    onSuccess: () => { showToast("success", "Deleted"); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ["admin-bookings"] }); },
    onError: (err: any) => { showToast("error", err.message); },
  });

  const filtered = useMemo(() => {
    if (!bookings) return [];
    let r = bookings;
    if (filterValues.resource_type) r = r.filter((b) => b.resource_type === filterValues.resource_type);
    if (filterValues.status) r = r.filter((b) => b.status === filterValues.status);
    if (searchValue) { const q = searchValue.toLowerCase(); r = r.filter((b) => b.resource_type.toLowerCase().includes(q) || (b.notes || "").toLowerCase().includes(q)); }
    return r;
  }, [bookings, filterValues, searchValue]);

  const columns: Column<Booking>[] = useMemo(() => [
    { key: "resource_type", header: "Type", render: (b) => <span className={`text-xs px-2 py-0.5 rounded ${TYPE_COLORS[b.resource_type] || "bg-gray-500/10 text-gray-400"}`}>{fmtStatus(b.resource_type)}</span> },
    { key: "resource_id", header: "Resource", render: (b) => <span className="text-sm font-mono text-gray-300">{b.resource_id.slice(0, 8)}…</span> },
    { key: "start_time", header: "Start", render: (b) => <span className="text-sm text-gray-300">{formatDateTime(b.start_time)}</span> },
    { key: "end_time", header: "End", render: (b) => <span className="text-sm text-gray-300">{formatDateTime(b.end_time)}</span> },
    { key: "status", header: "Status", render: (b) => <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[b.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtStatus(b.status)}</span> },
    {
      key: "actions", header: "", render: (b) => (
        <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { setEditItem(b); setEditForm({ resource_type: b.resource_type, resource_id: b.resource_id, start_time: new Date(b.start_time).toISOString().slice(0, 16), end_time: new Date(b.end_time).toISOString().slice(0, 16), activity_type: b.activity_type || "", activity_id: b.activity_id || "", status: b.status, notes: b.notes || "" }); setEditError(""); }} className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded">{t('common.edit')}</button>
          <button onClick={() => setDeleteTarget(b)} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded">{t('common.delete')}</button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader title={t("admin.resourceBookings", "Resource Bookings")} backHref="/admin/dashboard" backLabel={t("common.back", "Back to Dashboard")} actions={<button onClick={() => setCreateOpen(true)} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400">+ New Booking</button>} />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={error?.message || "Failed to load"} onRetry={() => refetch()} />}
        <FilterBar filters={[{ key: "resource_type", label: "All Types", options: RESOURCE_TYPES.map((t) => ({ value: t, label: fmtStatus(t) })) }, { key: "status", label: "All Statuses", options: BOOKING_STATUSES.map((s) => ({ value: s, label: fmtStatus(s) })) }]} values={filterValues} onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))} onClear={() => { setFilterValues({}); setSearchValue(""); }} searchValue={searchValue} onSearchChange={setSearchValue} searchPlaceholder="Search bookings..." />
        {isLoading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? <EmptyState message={bookings?.length === 0 ? "No bookings yet." : "No matches."} title={bookings?.length === 0 ? "No bookings yet" : "No matches"} action={bookings?.length === 0 ? { label: "New Booking", onClick: () => setCreateOpen(true) } : undefined} /> : <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(item) => setSelected(item as Booking)} />}

        <ModalForm open={!!selected} onClose={() => setSelected(null)} title="Booking Details" footer={<button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">{t('common.close')}</button>}>
          {selected && <div className="space-y-4">
            <DetailField label="Resource Type" value={fmtStatus(selected.resource_type)} />
            <DetailField label="Resource ID" value={selected.resource_id} />
            <DetailField label="Start" value={formatDateTime(selected.start_time)} />
            <DetailField label="End" value={formatDateTime(selected.end_time)} />
            <DetailField label="Status" value={fmtStatus(selected.status)} />
            <DetailField label="Activity" value={selected.activity_type ? `${selected.activity_type} (${selected.activity_id?.slice(0, 8) || ""})` : "—"} />
            <DetailField label="Notes" value={selected.notes || "—"} />
          </div>}
        </ModalForm>

        <ModalForm open={createOpen} onClose={() => { setCreateOpen(false); setCreateForm({ resource_type: "aircraft", resource_id: "", start_time: "", end_time: "", activity_type: "", activity_id: "", status: "confirmed", notes: "" }); setCreateError(""); }} title="New Booking" footer={<><button onClick={() => { setCreateOpen(false); setCreateForm({ resource_type: "aircraft", resource_id: "", start_time: "", end_time: "", activity_type: "", activity_id: "", status: "confirmed", notes: "" }); setCreateError(""); }} disabled={createMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button><button onClick={() => createMutation.mutate(createForm)} disabled={createMutation.isPending || !createForm.resource_id || !createForm.start_time || !createForm.end_time} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{createMutation.isPending ? "Creating..." : "Create"}</button></>}>
          <div className="space-y-4">
            {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{createError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Resource Type <span className="text-red-400">*</span></label><select value={createForm.resource_type} onChange={(e) => setCreateForm((f) => ({ ...f, resource_type: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">{RESOURCE_TYPES.map((t) => <option key={t} value={t}>{fmtStatus(t)}</option>)}</select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Resource ID <span className="text-red-400">*</span></label><input type="text" value={createForm.resource_id} onChange={(e) => setCreateForm((f) => ({ ...f, resource_id: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none font-mono" placeholder="UUID..." /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Start <span className="text-red-400">*</span></label><input type="datetime-local" value={createForm.start_time} onChange={(e) => setCreateForm((f) => ({ ...f, start_time: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">End <span className="text-red-400">*</span></label><input type="datetime-local" value={createForm.end_time} onChange={(e) => setCreateForm((f) => ({ ...f, end_time: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Status</label><select value={createForm.status} onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">{BOOKING_STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}</select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Activity Type</label><input type="text" value={createForm.activity_type} onChange={(e) => setCreateForm((f) => ({ ...f, activity_type: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" placeholder="flight_lesson" /></div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Activity ID</label><input type="text" value={createForm.activity_id} onChange={(e) => setCreateForm((f) => ({ ...f, activity_id: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none font-mono" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Notes</label><textarea value={createForm.notes} onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none resize-none" /></div>
          </div>
        </ModalForm>

        <ModalForm open={!!editItem} onClose={() => setEditItem(null)} title="Edit Booking" footer={<><button onClick={() => setEditItem(null)} disabled={updateMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button><button onClick={() => { if (editItem) updateMutation.mutate({ id: editItem.id, p: editForm }); }} disabled={updateMutation.isPending || !editForm.resource_id || !editForm.start_time || !editForm.end_time} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{updateMutation.isPending ? "Saving..." : "Save"}</button></>}>
          <div className="space-y-4">
            {editError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{editError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Type</label><select value={editForm.resource_type} onChange={(e) => setEditForm((f) => ({ ...f, resource_type: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">{RESOURCE_TYPES.map((t) => <option key={t} value={t}>{fmtStatus(t)}</option>)}</select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Resource ID</label><input type="text" value={editForm.resource_id} onChange={(e) => setEditForm((f) => ({ ...f, resource_id: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none font-mono" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Start</label><input type="datetime-local" value={editForm.start_time} onChange={(e) => setEditForm((f) => ({ ...f, start_time: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">End</label><input type="datetime-local" value={editForm.end_time} onChange={(e) => setEditForm((f) => ({ ...f, end_time: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Status</label><select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">{BOOKING_STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}</select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Activity Type</label><input type="text" value={editForm.activity_type} onChange={(e) => setEditForm((f) => ({ ...f, activity_type: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Notes</label><textarea value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none resize-none" /></div>
          </div>
        </ModalForm>

        {deleteTarget && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}><div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}><h3 className="text-lg font-semibold text-white">Delete Booking</h3><p className="text-sm text-gray-400">Delete this booking?</p><div className="flex justify-end gap-3 pt-2"><button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button><button onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 disabled:opacity-50">{deleteMutation.isPending ? "Deleting..." : "Delete"}</button></div></div></div>}
      </main>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-gray-500 mb-0.5">{label}</p><p className="text-sm text-white">{value}</p></div>;
}