"use client";
import { useState, useMemo } from "react";
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
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";

interface Message {
  id: string; sender: string; sender_name: string; receiver: string; receiver_name: string;
  subject: string | null; body: string; is_read: boolean; created_at: string;
}

const INIT_FORM = { receiver: "", subject: "", body: "" };

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; }
}

export default function AdminMessagesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Message | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(INIT_FORM);
  const [createError, setCreateError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);

  const { data: records, isLoading, error, refetch } = useQuery<Message[]>({
    queryKey: ["admin-messages"],
    queryFn: async () => {
      const d = await api.get<any>("/messages/");
      const results = (d as any)?.results || (d as any) || [];
      return results.map((msg: any) => ({
        id: msg.id, sender: msg.sender, sender_name: msg.sender_name || "Unknown",
        receiver: msg.receiver, receiver_name: msg.receiver_name || "Unknown",
        subject: msg.subject, body: msg.body, is_read: msg.is_read,
        created_at: msg.created_at,
      }));
    },
    enabled: isAuthenticated,
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["admin-msg-users"],
    queryFn: async () => { const d = await api.get<any>("/users/"); return (d as any)?.results || (d as any) || []; },
    enabled: isAuthenticated,
  });

  const buildPayload = (f: typeof INIT_FORM) => ({ receiver: f.receiver, subject: f.subject || null, body: f.body });

  const createMutation = useMutation({
    mutationFn: (p: ReturnType<typeof buildPayload>) => api.post("/messages/", p),
    onSuccess: () => { showToast("success", "Message sent"); setCreateOpen(false); setCreateForm(INIT_FORM); queryClient.invalidateQueries({ queryKey: ["admin-messages"] }); },
    onError: (err: any) => { const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message; setCreateError(msg || "Failed to send"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/messages/${id}/`),
    onSuccess: () => { showToast("success", "Message deleted"); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ["admin-messages"] }); },
    onError: (err: any) => { showToast("error", err.message || "Failed"); },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.post(`/messages/${id}/mark_read/`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-messages"] }); },
  });

  const filtered = useMemo(() => {
    if (!records) return [];
    let r = records;
    if (filterValues.read !== undefined && filterValues.read !== "") r = r.filter((a) => String(a.is_read) === filterValues.read);
    if (searchValue) { const q = searchValue.toLowerCase(); r = r.filter((a) => (a.subject || "").toLowerCase().includes(q) || a.sender_name.toLowerCase().includes(q) || a.receiver_name.toLowerCase().includes(q)); }
    return r;
  }, [records, filterValues, searchValue]);

  const columns: Column<Message>[] = useMemo(() => [
    { key: "subject", header: "Subject", render: (a) => (
      <div className="flex items-center gap-2">
        {!a.is_read && <span className="w-2 h-2 rounded-full bg-gold-500" />}
        <span className={`text-sm ${a.is_read ? "text-gray-400" : "font-semibold text-white"}`}>{a.subject || "(no subject)"}</span>
      </div>
    )},
    { key: "sender_name", header: "From", render: (a) => <span className="text-sm text-gray-300">{a.sender_name}</span> },
    { key: "receiver_name", header: "To", render: (a) => <span className="text-sm text-gray-300">{a.receiver_name}</span> },
    { key: "created_at", header: "Date", render: (a) => <span className="text-sm text-gray-400">{fmtDate(a.created_at)}</span> },
    { key: "actions", header: "", render: (a) => (
      <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => { if (!a.is_read) markReadMutation.mutate(a.id); setSelected(a); }} className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded transition-colors">View</button>
        <button onClick={() => setDeleteTarget(a)} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors">Delete</button>
      </div>
    )},
  ], []);

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader title="Messages" backHref="/admin/dashboard" backLabel={t("common.back", "Back")} actions={
        <button onClick={() => setCreateOpen(true)} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors">+ New Message</button>
      } />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={(error as any)?.message || "Failed"} onRetry={() => refetch()} />}
        {isLoading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? (
          <EmptyState message={records?.length === 0 ? "No messages yet." : "No matches."} title={records?.length === 0 ? "No messages" : "No matches"} action={records?.length === 0 ? { label: "New Message", onClick: () => setCreateOpen(true) } : undefined} />
        ) : <DataTable columns={columns} data={filtered} keyField="id" />}

        <ModalForm open={!!selected} onClose={() => setSelected(null)} title={selected?.subject || "Message"} footer={<button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">Close</button>}>
          {selected && <div className="space-y-4">
            <DetailField label="From" value={selected.sender_name} />
            <DetailField label="To" value={selected.receiver_name} />
            <DetailField label="Subject" value={selected.subject || "(no subject)"} />
            <DetailField label="Date" value={fmtDate(selected.created_at)} />
            <div><p className="text-xs text-gray-500 mb-0.5">Body</p>
              <div className="p-3 bg-navy-950 border border-navy-700 rounded-lg text-sm text-gray-200 whitespace-pre-wrap">{selected.body}</div>
            </div>
            <DetailField label="Read" value={selected.is_read ? "Yes" : "No"} />
          </div>}
        </ModalForm>

        <ModalForm open={createOpen} onClose={() => { setCreateOpen(false); setCreateForm(INIT_FORM); }} title="New Message" footer={<>
          <button onClick={() => { setCreateOpen(false); setCreateForm(INIT_FORM); }} disabled={createMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">Cancel</button>
          <button onClick={() => createMutation.mutate(buildPayload(createForm))} disabled={createMutation.isPending || !createForm.receiver || !createForm.body} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{createMutation.isPending ? "Sending..." : "Send"}</button>
        </>}>
          <div className="space-y-4">
            {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{createError}</div>}
            <div><label className="block text-sm text-gray-400 mb-1">To <span className="text-red-400">*</span></label>
              <select value={createForm.receiver} onChange={(e) => setCreateForm((f) => ({ ...f, receiver: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                <option value="">Select user...</option>{users.map((u: any) => <option key={u.id} value={u.id}>{u.email}</option>)}
              </select></div>
            <div><label className="block text-sm text-gray-400 mb-1">Subject</label>
              <input type="text" value={createForm.subject} onChange={(e) => setCreateForm((f) => ({ ...f, subject: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" placeholder="Message subject..." /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Body <span className="text-red-400">*</span></label>
              <textarea rows={5} value={createForm.body} onChange={(e) => setCreateForm((f) => ({ ...f, body: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none" placeholder="Message body..." /></div>
          </div>
        </ModalForm>

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white">Delete Message</h3>
              <p className="text-sm text-gray-400">Remove "{deleteTarget.subject || "(no subject)"}"?</p>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">Cancel</button>
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
