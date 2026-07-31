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
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";

interface AP {
  id: string; user: string; first_name: string | null; last_name: string | null; department: string | null;
}

const INIT_FORM = { user: "", first_name: "", last_name: "", department: "" };

export default function AdminAdminProfilesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [selected, setSelected] = useState<AP | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(INIT_FORM);
  const [createError, setCreateError] = useState("");
  const [editItem, setEditItem] = useState<AP | null>(null);
  const [editForm, setEditForm] = useState(INIT_FORM);
  const [editError, setEditError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AP | null>(null);

  const { data: records, isLoading, error, refetch } = useQuery<AP[]>({
    queryKey: ["admin-ap"],
    queryFn: async () => { const d = await api.get<any>("/admin-profiles/"); return unwrapResults(d); },
    enabled: isAuthenticated,
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["admin-ap-users"],
    queryFn: async () => { const d = await api.get<any>("/users/"); return unwrapResults(d); },
    enabled: isAuthenticated,
  });

  const buildPayload = (f: typeof INIT_FORM) => ({
    user: f.user, first_name: f.first_name || null, last_name: f.last_name || null, department: f.department || null,
  });

  const createMutation = useMutation({
    mutationFn: (p: ReturnType<typeof buildPayload>) => api.post("/admin-profiles/", p),
    onSuccess: () => { showToast("success", "Profile created"); setCreateOpen(false); setCreateForm(INIT_FORM); queryClient.invalidateQueries({ queryKey: ["admin-ap"] }); },
    onError: (err: any) => { const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message; setCreateError(msg || "Failed"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, p }: { id: string; p: ReturnType<typeof buildPayload> }) => api.patch(`/admin-profiles/${id}/`, p),
    onSuccess: () => { showToast("success", "Profile updated"); setEditItem(null); queryClient.invalidateQueries({ queryKey: ["admin-ap"] }); },
    onError: (err: any) => { const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message; setEditError(msg || "Failed"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin-profiles/${id}/`),
    onSuccess: () => { showToast("success", "Profile deleted"); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ["admin-ap"] }); },
    onError: (err: any) => { showToast("error", err.message || "Failed"); },
  });

  const filtered = useMemo(() => {
    if (!records) return [];
    let r = records;
    if (searchValue) { const q = searchValue.toLowerCase(); r = r.filter((a) => (a.first_name || "").toLowerCase().includes(q) || (a.last_name || "").toLowerCase().includes(q) || (a.department || "").toLowerCase().includes(q)); }
    return r;
  }, [records, searchValue]);

  const columns: Column<AP>[] = useMemo(() => [
    { key: "first_name", header: "Name", render: (a) => <span className="text-sm font-semibold text-white">{`${a.first_name || ""} ${a.last_name || ""}`.trim() || "—"}</span> },
    { key: "department", header: "Department", render: (a) => <span className="text-sm text-gray-300">{a.department || "—"}</span> },
    { key: "actions", header: "", render: (a) => (
      <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => { setEditItem(a); setEditForm({ user: a.user, first_name: a.first_name || "", last_name: a.last_name || "", department: a.department || "" }); setEditError(""); }} className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded transition-colors">{t('common.edit')}</button>
        <button onClick={() => setDeleteTarget(a)} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors">{t('common.delete')}</button>
      </div>
    )},
  ], []);

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader title={t("admin.adminProfiles", "Admin Profiles")} backHref="/admin/dashboard" backLabel={t("common.back", "Back")} actions={
        <button onClick={() => setCreateOpen(true)} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors">+ New Profile</button>
      } />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={error?.message || "Failed"} onRetry={() => refetch()} />}
        {isLoading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? (
          <EmptyState message={records?.length === 0 ? "No admin profiles yet." : "No matches."} title={records?.length === 0 ? "No profiles" : "No matches"} action={records?.length === 0 ? { label: "New Profile", onClick: () => setCreateOpen(true) } : undefined} />
        ) : <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(i) => setSelected(i as AP)} />}

        <ModalForm open={!!selected} onClose={() => setSelected(null)} title="Profile Details" footer={<button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">{t('common.close')}</button>}>
          {selected && <div className="space-y-4">
            <DetailField label="First Name" value={selected.first_name || "—"} />
            <DetailField label="Last Name" value={selected.last_name || "—"} />
            <DetailField label="Department" value={selected.department || "—"} />
          </div>}
        </ModalForm>

        <ModalForm open={createOpen} onClose={() => { setCreateOpen(false); setCreateForm(INIT_FORM); }} title="New Profile" footer={<>
          <button onClick={() => { setCreateOpen(false); setCreateForm(INIT_FORM); }} disabled={createMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button>
          <button onClick={() => createMutation.mutate(buildPayload(createForm))} disabled={createMutation.isPending || !createForm.user} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{createMutation.isPending ? "Creating..." : "Create"}</button>
        </>}>
          <div className="space-y-4">
            {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{createError}</div>}
            <div><label className="block text-sm text-gray-400 mb-1">User <span className="text-red-400">*</span></label>
              <select value={createForm.user} onChange={(e) => setCreateForm((f) => ({ ...f, user: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                <option value="">Select user...</option>{users.map((u: any) => <option key={u.id} value={u.id}>{u.email}</option>)}
              </select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">First Name</label><input value={createForm.first_name} onChange={(e) => setCreateForm((f) => ({ ...f, first_name: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Last Name</label><input value={createForm.last_name} onChange={(e) => setCreateForm((f) => ({ ...f, last_name: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" /></div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Department</label><input value={createForm.department} onChange={(e) => setCreateForm((f) => ({ ...f, department: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" /></div>
          </div>
        </ModalForm>

        <ModalForm open={!!editItem} onClose={() => setEditItem(null)} title="Edit Profile" footer={<>
          <button onClick={() => setEditItem(null)} disabled={updateMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button>
          <button onClick={() => { if (editItem) updateMutation.mutate({ id: editItem.id, p: buildPayload(editForm) }); }} disabled={updateMutation.isPending || !editForm.user} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{updateMutation.isPending ? "Saving..." : "Save"}</button>
        </>}>
          <div className="space-y-4">
            {editError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{editError}</div>}
            <div><label className="block text-sm text-gray-400 mb-1">User</label>
              <select value={editForm.user} onChange={(e) => setEditForm((f) => ({ ...f, user: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                <option value="">Select...</option>{users.map((u: any) => <option key={u.id} value={u.id}>{u.email}</option>)}
              </select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">First Name</label><input value={editForm.first_name} onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Last Name</label><input value={editForm.last_name} onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Department</label><input value={editForm.department} onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
          </div>
        </ModalForm>

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white">Delete Profile</h3>
              <p className="text-sm text-gray-400">Remove this admin profile?</p>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button>
                <button onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 disabled:opacity-50">{deleteMutation.isPending ? "Deleting..." : "Delete"}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-gray-500 mb-0.5">{label}</p><p className="text-sm text-white">{value}</p></div>;
}
