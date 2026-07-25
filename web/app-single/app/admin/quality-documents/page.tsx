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

interface QualityDocument {
  id: string;
  number: string;
  title: string;
  type: string | null;
  version: string | null;
  issue_date: string | null;
  revision_date: string | null;
  author: string | null;
  author_name: string;
  approver: string | null;
  approver_name: string;
  status: string;
  file_url: string | null;
}

const DOC_TYPES = ["SOP", "Manual", "Form", "Policy", "Checklist", "Report"];

const DOC_STATUSES = ["draft", "in_revision", "approved", "archived", "expired"];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-400",
  in_revision: "bg-blue-500/10 text-blue-400",
  approved: "bg-green-500/10 text-green-400",
  archived: "bg-amber-500/10 text-amber-400",
  expired: "bg-red-500/10 text-red-400",
};

const TYPE_COLORS: Record<string, string> = {
  SOP: "bg-blue-500/10 text-blue-400",
  Manual: "bg-purple-500/10 text-purple-400",
  Form: "bg-green-500/10 text-green-400",
  Policy: "bg-amber-500/10 text-amber-400",
  Checklist: "bg-cyan-500/10 text-cyan-400",
  Report: "bg-pink-500/10 text-pink-400",
};

const fmtStatus = (s: string) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

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

export default function AdminQualityDocumentsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  const [selected, setSelected] = useState<QualityDocument | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    number: "", title: "", type: "", version: "",
    issue_date: "", revision_date: "", author: "", approver: "",
    status: "draft", file_url: "",
  });
  const [createError, setCreateError] = useState("");

  const [editItem, setEditItem] = useState<QualityDocument | null>(null);
  const [editForm, setEditForm] = useState({
    number: "", title: "", type: "", version: "",
    issue_date: "", revision_date: "", author: "", approver: "",
    status: "draft", file_url: "",
  });
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<QualityDocument | null>(null);

  const { data: records, isLoading, error, refetch } = useQuery<QualityDocument[]>({
    queryKey: ["admin-quality-documents"],
    queryFn: async () => {
      const d = await api.get<any>("/quality-documents/");
      return (d as any)?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["admin-qd-users"],
    queryFn: async () => {
      const d = await api.get<any>("/users/");
      return (d as any)?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  const resetCreateForm = () => {
    setCreateForm({
      number: "", title: "", type: "", version: "",
      issue_date: "", revision_date: "", author: "", approver: "",
      status: "draft", file_url: "",
    });
    setCreateError("");
  };

  const buildPayload = (form: typeof createForm) => ({
    number: form.number,
    title: form.title,
    type: form.type || null,
    version: form.version || null,
    issue_date: form.issue_date || null,
    revision_date: form.revision_date || null,
    author: form.author || null,
    approver: form.approver || null,
    status: form.status,
    file_url: form.file_url || null,
  });

  const createMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof buildPayload>) =>
      api.post("/quality-documents/", payload),
    onSuccess: () => {
      showToast("success", "Quality document created");
      setCreateOpen(false);
      resetCreateForm();
      queryClient.invalidateQueries({ queryKey: ["admin-quality-documents"] });
    },
    onError: (err: any) => {
      const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message;
      setCreateError(msg || "Failed to create document");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReturnType<typeof buildPayload> }) =>
      api.patch(`/quality-documents/${id}/`, payload),
    onSuccess: () => {
      showToast("success", "Quality document updated");
      setEditItem(null);
      queryClient.invalidateQueries({ queryKey: ["admin-quality-documents"] });
    },
    onError: (err: any) => {
      const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message;
      setEditError(msg || "Failed to update document");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/quality-documents/${id}/`),
    onSuccess: () => {
      showToast("success", "Quality document deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-quality-documents"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to delete document");
    },
  });

  const filtered = useMemo(() => {
    if (!records) return [];
    let r = records;
    if (filterValues.type) r = r.filter((d) => d.type === filterValues.type);
    if (filterValues.status) r = r.filter((d) => d.status === filterValues.status);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter(
        (d) =>
          (d.number || "").toLowerCase().includes(q) ||
          (d.title || "").toLowerCase().includes(q)
      );
    }
    return r;
  }, [records, filterValues, searchValue]);

  const columns: Column<QualityDocument>[] = useMemo(
    () => [
      {
        key: "number",
        header: "Number",
        render: (d) => <span className="text-sm font-bold text-white">{d.number}</span>,
      },
      {
        key: "title",
        header: "Title",
        render: (d) => (
          <span className="text-sm text-gray-300 truncate max-w-[200px] block" title={d.title}>
            {d.title || "—"}
          </span>
        ),
      },
      {
        key: "type",
        header: "Type",
        render: (d) =>
          d.type ? (
            <span className={`text-xs px-2 py-0.5 rounded ${TYPE_COLORS[d.type] || "bg-gray-500/10 text-gray-400"}`}>
              {d.type}
            </span>
          ) : (
            <span className="text-sm text-gray-500">—</span>
          ),
      },
      {
        key: "version",
        header: "Version",
        render: (d) => <span className="text-sm text-gray-300">{d.version || "—"}</span>,
      },
      {
        key: "status",
        header: "Status",
        render: (d) => (
          <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[d.status] || "bg-gray-500/10 text-gray-400"}`}>
            {fmtStatus(d.status)}
          </span>
        ),
      },
      {
        key: "issue_date",
        header: "Issue Date",
        render: (d) => <span className="text-sm text-gray-300">{formatDate(d.issue_date)}</span>,
      },
      {
        key: "author_name",
        header: "Author",
        render: (d) => <span className="text-sm text-gray-300">{d.author_name || "—"}</span>,
      },
      {
        key: "actions",
        header: "",
        render: (d) => (
          <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setEditItem(d);
                setEditForm({
                  number: d.number, title: d.title, type: d.type || "",
                  version: d.version || "", issue_date: d.issue_date || "",
                  revision_date: d.revision_date || "", author: d.author || "",
                  approver: d.approver || "", status: d.status, file_url: d.file_url || "",
                });
                setEditError("");
              }}
              className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setDeleteTarget(d)}
              className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors"
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const typeFilterOptions = useMemo(
    () => DOC_TYPES.map((t) => ({ value: t, label: t })),
    []
  );

  const statusFilterOptions = useMemo(
    () => DOC_STATUSES.map((s) => ({ value: s, label: fmtStatus(s) })),
    []
  );

  const userOptions = useMemo(
    () => users.map((u: any) => ({ value: u.id, label: u.email })),
    [users]
  );

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader
        title="Quality Documents"
        backHref="/admin/dashboard"
        backLabel={t("common.back", "Back to Dashboard")}
        actions={
          <button
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors"
          >
            + New Document
          </button>
        }
      />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <ErrorCard
            message={(error as any)?.message || "Failed to load quality documents"}
            onRetry={() => refetch()}
          />
        )}

        <FilterBar
          filters={[
            {
              key: "type",
              label: "All Types",
              options: typeFilterOptions,
            },
            {
              key: "status",
              label: "All Statuses",
              options: statusFilterOptions,
            },
          ]}
          values={filterValues}
          onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))}
          onClear={() => { setFilterValues({}); setSearchValue(""); }}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search by number or title..."
        />

        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              records?.length === 0
                ? "No quality documents yet."
                : "No documents match your filters."
            }
            title={records?.length === 0 ? "No documents yet" : "No matching documents"}
            action={
              records?.length === 0
                ? { label: "New Document", onClick: () => setCreateOpen(true) }
                : undefined
            }
          />
        ) : (
          <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(item) => setSelected(item as QualityDocument)} />
        )}

        {/* Detail Modal */}
        <ModalForm
          open={!!selected}
          onClose={() => setSelected(null)}
          title="Quality Document"
          footer={
            <button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">
              {t("common.close", "Close")}
            </button>
          }
        >
          {selected && (
            <div className="space-y-4">
              <DetailField label="Number" value={selected.number} />
              <DetailField label="Title" value={selected.title} />
              <DetailField label="Type" value={selected.type || "—"} />
              <DetailField label="Version" value={selected.version || "—"} />
              <DetailField label="Status" value={fmtStatus(selected.status)} />
              <DetailField label="Issue Date" value={formatDate(selected.issue_date)} />
              <DetailField label="Revision Date" value={formatDate(selected.revision_date)} />
              <DetailField label="Author" value={selected.author_name || "—"} />
              <DetailField label="Approver" value={selected.approver_name || "—"} />
              {selected.file_url ? (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">File URL</p>
                  <a
                    href={selected.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gold-500 hover:text-gold-400 underline break-all"
                  >
                    {selected.file_url}
                  </a>
                </div>
              ) : (
                <DetailField label="File URL" value="—" />
              )}
            </div>
          )}
        </ModalForm>

        {/* Create Modal */}
        <ModalForm
          open={createOpen}
          onClose={() => { setCreateOpen(false); resetCreateForm(); }}
          title="New Quality Document"
          footer={
            <>
              <button
                onClick={() => { setCreateOpen(false); resetCreateForm(); }}
                disabled={createMutation.isPending}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate(buildPayload(createForm))}
                disabled={createMutation.isPending || !createForm.number || !createForm.title}
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {createError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{createError}</div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.number}
                  onChange={(e) => setCreateForm((f) => ({ ...f, number: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                  placeholder="e.g. QM-001"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                  placeholder="Document title"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Type</label>
                <select
                  value={createForm.type}
                  onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                >
                  <option value="">Select type...</option>
                  {DOC_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Version</label>
                <input
                  type="text"
                  value={createForm.version}
                  onChange={(e) => setCreateForm((f) => ({ ...f, version: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                  placeholder="e.g. 1.0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Issue Date</label>
                <input
                  type="date"
                  value={createForm.issue_date}
                  onChange={(e) => setCreateForm((f) => ({ ...f, issue_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Revision Date</label>
                <input
                  type="date"
                  value={createForm.revision_date}
                  onChange={(e) => setCreateForm((f) => ({ ...f, revision_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Author</label>
                <select
                  value={createForm.author}
                  onChange={(e) => setCreateForm((f) => ({ ...f, author: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                >
                  <option value="">Select author...</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Approver</label>
                <select
                  value={createForm.approver}
                  onChange={(e) => setCreateForm((f) => ({ ...f, approver: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                >
                  <option value="">Select approver...</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.email}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Status
                </label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                >
                  {DOC_STATUSES.map((s) => (
                    <option key={s} value={s}>{fmtStatus(s)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">File URL</label>
                <input
                  type="text"
                  value={createForm.file_url}
                  onChange={(e) => setCreateForm((f) => ({ ...f, file_url: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>
        </ModalForm>

        {/* Edit Modal */}
        <ModalForm
          open={!!editItem}
          onClose={() => setEditItem(null)}
          title="Edit Quality Document"
          footer={
            <>
              <button
                onClick={() => setEditItem(null)}
                disabled={updateMutation.isPending}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => { if (editItem) updateMutation.mutate({ id: editItem.id, payload: buildPayload(editForm) }); }}
                disabled={updateMutation.isPending || !editForm.number || !editForm.title}
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving..." : "Save"}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {editError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{editError}</div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Number</label>
                <input
                  type="text"
                  value={editForm.number}
                  onChange={(e) => setEditForm((f) => ({ ...f, number: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Type</label>
                <select
                  value={editForm.type}
                  onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                >
                  <option value="">Select type...</option>
                  {DOC_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Version</label>
                <input
                  type="text"
                  value={editForm.version}
                  onChange={(e) => setEditForm((f) => ({ ...f, version: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Issue Date</label>
                <input
                  type="date"
                  value={editForm.issue_date}
                  onChange={(e) => setEditForm((f) => ({ ...f, issue_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Revision Date</label>
                <input
                  type="date"
                  value={editForm.revision_date}
                  onChange={(e) => setEditForm((f) => ({ ...f, revision_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Author</label>
                <select
                  value={editForm.author}
                  onChange={(e) => setEditForm((f) => ({ ...f, author: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                >
                  <option value="">Select author...</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Approver</label>
                <select
                  value={editForm.approver}
                  onChange={(e) => setEditForm((f) => ({ ...f, approver: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                >
                  <option value="">Select approver...</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.email}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                >
                  {DOC_STATUSES.map((s) => (
                    <option key={s} value={s}>{fmtStatus(s)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">File URL</label>
                <input
                  type="text"
                  value={editForm.file_url}
                  onChange={(e) => setEditForm((f) => ({ ...f, file_url: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </ModalForm>

        {/* Delete Confirmation */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white">Delete Document</h3>
              <p className="text-sm text-gray-400">
                Remove quality document {deleteTarget.number} — {deleteTarget.title}?
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMutation.mutate(deleteTarget.id)}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-sm bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}
