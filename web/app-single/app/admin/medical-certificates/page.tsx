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
import { DetailField } from "@/components/detail-field";

interface MC {
  id: string; student: string; issue_date: string; expiry_date: string;
  issuer: string | null; file_url: string | null; status: string;
}

const INIT_FORM = { student: "", issue_date: "", expiry_date: "", issuer: "", file_url: "", status: "valid" };

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); } catch { return "—"; }
}

const STATUS_COLORS: Record<string, string> = { valid: "bg-green-500/10 text-green-400", expired: "bg-red-500/10 text-red-400", pending: "bg-amber-500/10 text-amber-400" };

export default function AdminMedicalCertificatesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<MC | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(INIT_FORM);
  const [createError, setCreateError] = useState("");
  const [editItem, setEditItem] = useState<MC | null>(null);
  const [editForm, setEditForm] = useState(INIT_FORM);
  const [editError, setEditError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MC | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: records, isLoading, error, refetch } = useQuery<MC[]>({
    queryKey: ["admin-mc"],
    queryFn: async () => { const d = await api.get<any>("/medical-certificates/"); return unwrapResults(d); },
    enabled: isAuthenticated,
  });

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ["admin-mc-students"],
    queryFn: async () => { const d = await api.get<any>("/students/"); return unwrapResults(d); },
    enabled: isAuthenticated,
  });

  const buildPayload = (f: typeof INIT_FORM) => ({
    student: f.student, issue_date: f.issue_date, expiry_date: f.expiry_date,
    issuer: f.issuer || null, file_url: f.file_url || null, status: f.status,
  });

  const createMutation = useMutation({
    mutationFn: (p: ReturnType<typeof buildPayload>) => api.post("/medical-certificates/", p),
    onSuccess: () => { showToast("success", "Certificate created"); setCreateOpen(false); setCreateForm(INIT_FORM); queryClient.invalidateQueries({ queryKey: ["admin-mc"] }); },
    onError: (err: any) => { const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message; setCreateError(msg || "Failed"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, p }: { id: string; p: ReturnType<typeof buildPayload> }) => api.patch(`/medical-certificates/${id}/`, p),
    onSuccess: () => { showToast("success", "Certificate updated"); setEditItem(null); queryClient.invalidateQueries({ queryKey: ["admin-mc"] }); },
    onError: (err: any) => { const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message; setEditError(msg || "Failed"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/medical-certificates/${id}/`),
    onSuccess: () => { showToast("success", "Certificate deleted"); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ["admin-mc"] }); },
    onError: (err: any) => { showToast("error", err.message || "Failed"); },
  });

  const downloadFile = async (mc: MC) => {
    if (!mc.file_url) { showToast("error", "No file attached"); return; }
    if (mc.file_url.startsWith("http")) { window.open(mc.file_url, "_blank", "noopener,noreferrer"); return; }
    try {
      const token = api.getAccessToken();
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/medical-certificates/${mc.id}/download/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) { showToast("error", "Download failed"); return; }
      const b = await r.blob();
      const u = window.URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = u;
      a.download = mc.file_url.split("/").pop() || `medical-${mc.id}`;
      a.click();
      window.URL.revokeObjectURL(u);
    } catch {
      showToast("error", "Download failed");
    }
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>, apply: (url: string) => void, certId?: string) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    if (certId) formData.append("certificate_id", certId);
    setUploading(true);
    try {
      const token = api.getAccessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/medical-certificates/upload/`, {
        method: "POST",
        headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const body = data && typeof data === "object" && data.success === true && "data" in data ? data.data : data;
      if (body?.file_url) {
        apply(body.file_url);
        showToast("success", "File uploaded");
        if (certId) {
          queryClient.invalidateQueries({ queryKey: ["admin-mc"] });
        }
      } else {
        showToast("error", "Upload response missing file URL");
      }
    } catch {
      showToast("error", "File upload failed");
    } finally {
      setUploading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!records) return [];
    let r = records;
    if (filterValues.status) r = r.filter((a) => a.status === filterValues.status);
    if (searchValue) { const q = searchValue.toLowerCase(); r = r.filter((a) => (a.issuer || "").toLowerCase().includes(q)); }
    return r;
  }, [records, filterValues, searchValue]);

  const columns: Column<MC>[] = useMemo(() => [
    { key: "status", header: "Status", render: (a) => <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[a.status] || "bg-gray-500/10 text-gray-400"}`}>{a.status}</span> },
    { key: "issue_date", header: "Issue Date", render: (a) => <span className="text-sm text-gray-300">{fmtDate(a.issue_date)}</span> },
    { key: "expiry_date", header: "Expiry Date", render: (a) => <span className="text-sm text-gray-300">{fmtDate(a.expiry_date)}</span> },
    { key: "issuer", header: "Issuer", render: (a) => <span className="text-sm text-gray-400">{a.issuer || "—"}</span> },
    { key: "actions", header: "", render: (a) => (
      <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
        {a.file_url && (
          <button onClick={() => downloadFile(a)} className="px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/10 rounded transition-colors">{t('common.download', 'Download')}</button>
        )}
        <button onClick={() => { setEditItem(a); setEditForm({ student: a.student, issue_date: a.issue_date, expiry_date: a.expiry_date, issuer: a.issuer || "", file_url: a.file_url || "", status: a.status }); setEditError(""); }} className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded transition-colors">{t('common.edit')}</button>
        <button onClick={() => setDeleteTarget(a)} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors">{t('common.delete')}</button>
      </div>
    )},
  ], [downloadFile]);

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader title={t("admin.medicalCertificates", "Medical Certificates")} backHref="/admin/dashboard" backLabel={t("common.back", "Back")} actions={
        <button onClick={() => setCreateOpen(true)} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors">+ New Certificate</button>
      } />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={error?.message || "Failed"} onRetry={() => refetch()} />}
        {isLoading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? (
          <EmptyState message={records?.length === 0 ? "No certificates yet." : "No matches."} title={records?.length === 0 ? "No certificates" : "No matches"} action={records?.length === 0 ? { label: "New Certificate", onClick: () => setCreateOpen(true) } : undefined} />
        ) : <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(i) => setSelected(i as MC)} />}

        <ModalForm open={!!selected} onClose={() => setSelected(null)} title="Certificate Details" footer={<button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">{t('common.close')}</button>}>
          {selected && <div className="space-y-4">
            <DetailField label="Student" value={(() => { const s = students.find((x: any) => x.id === selected.student); return s?.full_name || `${s?.first_name || ""} ${s?.last_name || ""}`.trim() || selected.student; })()} />
            <DetailField label="Status" value={selected.status} />
            <DetailField label="Issue Date" value={fmtDate(selected.issue_date)} />
            <DetailField label="Expiry Date" value={fmtDate(selected.expiry_date)} />
            <DetailField label="Issuer" value={selected.issuer || "—"} />
            <div>
              <label className="block text-sm text-gray-400 mb-1">File</label>
              {selected.file_url ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 truncate">{selected.file_url}</p>
                  <button onClick={() => downloadFile(selected)} className="px-3 py-1.5 text-xs bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded-lg hover:bg-gold-500 hover:text-navy-900 transition-colors">{t('common.view', 'View File')}</button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">—</p>
              )}
            </div>
          </div>}
        </ModalForm>

        <ModalForm open={createOpen} onClose={() => { setCreateOpen(false); setCreateForm(INIT_FORM); }} title="New Certificate" footer={<>
          <button onClick={() => { setCreateOpen(false); setCreateForm(INIT_FORM); }} disabled={createMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button>
          <button onClick={() => createMutation.mutate(buildPayload(createForm))} disabled={createMutation.isPending || !createForm.student || !createForm.issue_date || !createForm.expiry_date} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{createMutation.isPending ? "Creating..." : "Create"}</button>
        </>}>
          <div className="space-y-4">
            {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{createError}</div>}
            <div><label className="block text-sm text-gray-400 mb-1">Student <span className="text-red-400">*</span></label>
              <select value={createForm.student} onChange={(e) => setCreateForm((f) => ({ ...f, student: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                <option value="">Select student...</option>{students.map((s: any) => <option key={s.id} value={s.id}>{s.full_name || `${s.first_name} ${s.last_name}`}</option>)}
              </select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Issue Date <span className="text-red-400">*</span></label><input type="date" value={createForm.issue_date} onChange={(e) => setCreateForm((f) => ({ ...f, issue_date: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Expiry Date <span className="text-red-400">*</span></label><input type="date" value={createForm.expiry_date} onChange={(e) => setCreateForm((f) => ({ ...f, expiry_date: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Issuer</label><input type="text" value={createForm.issuer} onChange={(e) => setCreateForm((f) => ({ ...f, issuer: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" /></div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Upload File</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => handleFilePick(e, (url) => setCreateForm((f) => ({ ...f, file_url: url })))}
                  className="block w-full text-xs text-gray-400 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-gold-500 file:text-navy-900 file:font-semibold file:cursor-pointer hover:file:bg-gold-400"
                />
                {uploading && <span className="text-xs text-gray-500 animate-pulse shrink-0">Uploading...</span>}
              </div>
              {createForm.file_url && <p className="text-xs text-gold-400 mt-1 truncate">{createForm.file_url}</p>}
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">File URL (optional, alternative to upload)</label><input type="url" value={createForm.file_url} onChange={(e) => setCreateForm((f) => ({ ...f, file_url: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Status</label>
              <select value={createForm.status} onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                <option value="valid">Valid</option><option value="expired">Expired</option><option value="pending">Pending</option>
              </select></div>
          </div>
        </ModalForm>

        <ModalForm open={!!editItem} onClose={() => setEditItem(null)} title="Edit Certificate" footer={<>
          <button onClick={() => setEditItem(null)} disabled={updateMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button>
          <button onClick={() => { if (editItem) updateMutation.mutate({ id: editItem.id, p: buildPayload(editForm) }); }} disabled={updateMutation.isPending || !editForm.student || !editForm.issue_date || !editForm.expiry_date} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{updateMutation.isPending ? "Saving..." : "Save"}</button>
        </>}>
          <div className="space-y-4">
            {editError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{editError}</div>}
            <div><label className="block text-sm text-gray-400 mb-1">Student</label>
              <select value={editForm.student} onChange={(e) => setEditForm((f) => ({ ...f, student: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                <option value="">Select...</option>{students.map((s: any) => <option key={s.id} value={s.id}>{s.full_name || `${s.first_name} ${s.last_name}`}</option>)}
              </select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Issue Date</label><input type="date" value={editForm.issue_date} onChange={(e) => setEditForm((f) => ({ ...f, issue_date: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Expiry Date</label><input type="date" value={editForm.expiry_date} onChange={(e) => setEditForm((f) => ({ ...f, expiry_date: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Issuer</label><input type="text" value={editForm.issuer} onChange={(e) => setEditForm((f) => ({ ...f, issuer: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Upload File</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => handleFilePick(e, (url) => setEditForm((f) => ({ ...f, file_url: url })), editItem?.id)}
                  className="block w-full text-xs text-gray-400 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-gold-500 file:text-navy-900 file:font-semibold file:cursor-pointer hover:file:bg-gold-400"
                />
                {uploading && <span className="text-xs text-gray-500 animate-pulse shrink-0">Uploading...</span>}
              </div>
              {editForm.file_url && <p className="text-xs text-gold-400 mt-1 truncate">{editForm.file_url}</p>}
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">File URL (optional, alternative to upload)</label><input type="url" value={editForm.file_url} onChange={(e) => setEditForm((f) => ({ ...f, file_url: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Status</label>
              <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                <option value="valid">Valid</option><option value="expired">Expired</option><option value="pending">Pending</option>
              </select></div>
          </div>
        </ModalForm>

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white">Delete Certificate</h3>
              <p className="text-sm text-gray-400">Remove this medical certificate?</p>
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


