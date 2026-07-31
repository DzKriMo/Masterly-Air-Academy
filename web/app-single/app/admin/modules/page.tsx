"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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

interface Module {
  id: string;
  subject: string | null;
  subject_name?: string;
  title: string;
  title_ar: string | null;
  title_fr: string | null;
  description: string | null;
  description_ar: string | null;
  description_fr: string | null;
  duration: number;
  order: number;
  status: string;
  lessons?: any[];
  documents?: any[];
}

const STATUS_OPTIONS = ["active", "inactive"];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-400",
  inactive: "bg-gray-500/10 text-gray-400",
};

function truncate(str: string | null | undefined, len: number): string {
  if (!str) return "—";
  return str.length > len ? str.substring(0, len) + "…" : str;
}

export default function AdminModulesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  const [selected, setSelected] = useState<Module | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    subject: "",
    title: "",
    title_ar: "",
    title_fr: "",
    description: "",
    description_ar: "",
    description_fr: "",
    duration: "",
    order: "",
    status: "active",
  });
  const [createError, setCreateError] = useState("");

  const [editItem, setEditItem] = useState<Module | null>(null);
  const [editForm, setEditForm] = useState({
    subject: "",
    title: "",
    title_ar: "",
    title_fr: "",
    description: "",
    description_ar: "",
    description_fr: "",
    duration: "",
    order: "",
    status: "active",
  });
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Module | null>(null);

  const { data: modules, isLoading, error, refetch } = useQuery<Module[]>({
    queryKey: ["admin-modules"],
    queryFn: async () => {
      const d = await api.get<any>("/modules/");
      return unwrapResults(d);
    },
    enabled: isAuthenticated,
  });

  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ["admin-mod-subjects"],
    queryFn: async () => {
      const d = await api.get<any>("/subjects/");
      return unwrapResults(d);
    },
    enabled: isAuthenticated,
  });

  const resetCreateForm = () => {
    setCreateForm({
      subject: "", title: "", title_ar: "", title_fr: "",
      description: "", description_ar: "", description_fr: "",
      duration: "", order: "", status: "active",
    });
    setCreateError("");
  };

  const buildPayload = (form: typeof createForm) => ({
    subject: form.subject || null,
    title: form.title,
    title_ar: form.title_ar || null,
    title_fr: form.title_fr || null,
    description: form.description || null,
    description_ar: form.description_ar || null,
    description_fr: form.description_fr || null,
    duration: form.duration ? parseInt(form.duration, 10) : null,
    order: form.order ? parseInt(form.order, 10) : null,
    status: form.status,
  });

  const createMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof buildPayload>) =>
      api.post("/modules/", payload),
    onSuccess: () => {
      showToast("success", "Module created successfully");
      setCreateOpen(false);
      resetCreateForm();
      queryClient.invalidateQueries({ queryKey: ["admin-modules"] });
    },
    onError: (err: any) => {
      const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message;
      setCreateError(msg || "Failed to create module");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReturnType<typeof buildPayload> }) =>
      api.patch(`/modules/${id}/`, payload),
    onSuccess: () => {
      showToast("success", "Module updated successfully");
      setEditItem(null);
      queryClient.invalidateQueries({ queryKey: ["admin-modules"] });
    },
    onError: (err: any) => {
      const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message;
      setEditError(msg || "Failed to update module");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/modules/${id}/`),
    onSuccess: () => {
      showToast("success", "Module deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-modules"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to delete module");
    },
  });

  const filtered = useMemo(() => {
    if (!modules) return [];
    let r = modules;
    if (filterValues.subject)
      r = r.filter((m) => m.subject === filterValues.subject);
    if (filterValues.status)
      r = r.filter((m) => m.status === filterValues.status);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.title_ar && item.title_ar.toLowerCase().includes(q)) ||
          (item.title_fr && item.title_fr.toLowerCase().includes(q))
      );
    }
    return r;
  }, [modules, filterValues, searchValue]);

  const columns: Column<Module>[] = useMemo(
    () => [
      {
        key: "title",
        header: "Title",
        render: (m) => (
          <span className="text-sm font-semibold text-white">{truncate(m.title, 60)}</span>
        ),
      },
      {
        key: "subject",
        header: "Subject",
        render: (m) => (
          <span className="text-sm text-gray-300">{m.subject_name || "—"}</span>
        ),
      },
      {
        key: "duration",
        header: "Duration (hrs)",
        render: (m) => (
          <span className="text-sm text-gray-300">{m.duration ?? "—"}</span>
        ),
      },
      {
        key: "order",
        header: "Order",
        render: (m) => (
          <span className="text-sm text-gray-300">{m.order ?? "—"}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (m) => (
          <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[m.status] || "bg-gray-500/10 text-gray-400"}`}>
            {m.status ? m.status.charAt(0).toUpperCase() + m.status.slice(1) : "—"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (m) => (
          <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setEditItem(m);
                setEditForm({
                  subject: m.subject || "",
                  title: m.title,
                  title_ar: m.title_ar || "",
                  title_fr: m.title_fr || "",
                  description: m.description || "",
                  description_ar: m.description_ar || "",
                  description_fr: m.description_fr || "",
                  duration: m.duration?.toString() || "",
                  order: m.order?.toString() || "",
                  status: m.status || "active",
                });
                setEditError("");
              }}
              className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setDeleteTarget(m)}
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

  const filterOptions = useMemo(
    () => ({
      subject: subjects.map((s: any) => ({ value: s.id, label: s.title_en || s.code })),
      status: STATUS_OPTIONS.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
    }),
    [subjects]
  );

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader
        title="Modules"
        backHref="/admin/dashboard"
        backLabel={t("common.back", "Back to Dashboard")}
        actions={
          <button
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors"
          >
            + New Module
          </button>
        }
      />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <ErrorCard
            message={error?.message || "Failed to load modules"}
            onRetry={() => refetch()}
          />
        )}

        <FilterBar
          filters={[
            {
              key: "subject",
              label: "All Subjects",
              options: filterOptions.subject,
            },
            {
              key: "status",
              label: "All Statuses",
              options: filterOptions.status,
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
          searchPlaceholder="Search modules..."
        />

        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              modules?.length === 0
                ? "No modules have been created yet. Click '+ New Module' to add one."
                : "No modules match your filters."
            }
            title={modules?.length === 0 ? "No modules yet" : "No matching modules"}
            action={
              modules?.length === 0
                ? { label: "New Module", onClick: () => setCreateOpen(true) }
                : undefined
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            keyField="id"
            onRowClick={(item) => setSelected(item as Module)}
          />
        )}

        {/* Detail Modal */}
        <ModalForm
          open={!!selected}
          onClose={() => setSelected(null)}
          title="Module Details"
          wide
          footer={
            <button
              onClick={() => setSelected(null)}
              className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white"
            >
              {t("common.close", "Close")}
            </button>
          }
        >
          {selected && (
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Title" value={selected.title} />
                  <DetailField label="Title (Arabic)" value={selected.title_ar || "—"} />
                  <DetailField label="Title (French)" value={selected.title_fr || "—"} />
                  <DetailField label="Subject" value={selected.subject_name || "—"} />
                  <DetailField label="Duration (hours)" value={selected.duration?.toString() || "—"} />
                  <DetailField label="Order" value={selected.order?.toString() || "—"} />
                  <DetailField
                    label="Status"
                    value={
                      <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[selected.status] || "bg-gray-500/10 text-gray-400"}`}>
                        {selected.status ? selected.status.charAt(0).toUpperCase() + selected.status.slice(1) : "—"}
                      </span>
                    }
                  />
                </div>
              </section>
              {(selected.description || selected.description_ar || selected.description_fr) && (
                <section>
                  <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Description</h3>
                  <div className="space-y-3">
                    {selected.description && <DetailField label="English" value={selected.description} />}
                    {selected.description_ar && <DetailField label="Arabic" value={selected.description_ar} />}
                    {selected.description_fr && <DetailField label="French" value={selected.description_fr} />}
                  </div>
                </section>
              )}
              {selected.lessons && selected.lessons.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Lessons</h3>
                  <ul className="space-y-1">
                    {selected.lessons.map((lesson: any, i: number) => (
                      <li key={lesson.id || i} className="text-sm text-gray-300 px-3 py-1.5 bg-navy-700/50 rounded">
                        {lesson.title || `Lesson ${i + 1}`}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {selected.documents && selected.documents.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Documents</h3>
                  <ul className="space-y-1">
                    {selected.documents.map((doc: any, i: number) => (
                      <li key={doc.id || i} className="text-sm text-gray-300 px-3 py-1.5 bg-navy-700/50 rounded">
                        {doc.title || doc.file || `Document ${i + 1}`}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </ModalForm>

        {/* Create Modal */}
        <ModalForm
          open={createOpen}
          onClose={() => { setCreateOpen(false); resetCreateForm(); }}
          title="New Module"
          footer={
            <>
              <button
                onClick={() => { setCreateOpen(false); resetCreateForm(); }}
                disabled={createMutation.isPending}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                onClick={() => createMutation.mutate(buildPayload(createForm))}
                disabled={createMutation.isPending || !createForm.title}
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating..." : t("common.create", "Create")}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {createError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{createError}</div>
            )}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Subject <span className="text-red-400">*</span>
              </label>
              <select
                value={createForm.subject}
                onChange={(e) => setCreateForm((f) => ({ ...f, subject: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="">Select a subject</option>
                {subjects.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.title_en || s.code}</option>
                ))}
              </select>
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
                placeholder="Module title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Title (Arabic)</label>
                <input
                  type="text"
                  value={createForm.title_ar}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title_ar: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                  placeholder="العنوان بالعربية"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Title (French)</label>
                <input
                  type="text"
                  value={createForm.title_fr}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title_fr: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                  placeholder="Titre en français"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
                placeholder="Module description in English"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description (Arabic)</label>
                <textarea
                  value={createForm.description_ar}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description_ar: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
                  placeholder="الوصف بالعربية"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description (French)</label>
                <textarea
                  value={createForm.description_fr}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description_fr: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
                  placeholder="Description en français"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Duration (hours) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={createForm.duration}
                  onChange={(e) => setCreateForm((f) => ({ ...f, duration: e.target.value }))}
                  min={0}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                  placeholder="e.g. 40"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Order <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={createForm.order}
                  onChange={(e) => setCreateForm((f) => ({ ...f, order: e.target.value }))}
                  min={0}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                  placeholder="e.g. 1"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Status</label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </ModalForm>

        {/* Edit Modal */}
        <ModalForm
          open={!!editItem}
          onClose={() => setEditItem(null)}
          title="Edit Module"
          wide
          footer={
            <>
              <button
                onClick={() => setEditItem(null)}
                disabled={updateMutation.isPending}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                onClick={() => { if (editItem) updateMutation.mutate({ id: editItem.id, payload: buildPayload(editForm) }); }}
                disabled={updateMutation.isPending || !editForm.title}
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving..." : t("common.save", "Save")}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {editError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{editError}</div>
            )}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Subject <span className="text-red-400">*</span>
              </label>
              <select
                value={editForm.subject}
                onChange={(e) => setEditForm((f) => ({ ...f, subject: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="">Select a subject</option>
                {subjects.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.title_en || s.code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Title (Arabic)</label>
                <input
                  type="text"
                  value={editForm.title_ar}
                  onChange={(e) => setEditForm((f) => ({ ...f, title_ar: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Title (French)</label>
                <input
                  type="text"
                  value={editForm.title_fr}
                  onChange={(e) => setEditForm((f) => ({ ...f, title_fr: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description (Arabic)</label>
                <textarea
                  value={editForm.description_ar}
                  onChange={(e) => setEditForm((f) => ({ ...f, description_ar: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description (French)</label>
                <textarea
                  value={editForm.description_fr}
                  onChange={(e) => setEditForm((f) => ({ ...f, description_fr: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Duration (hours) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={editForm.duration}
                  onChange={(e) => setEditForm((f) => ({ ...f, duration: e.target.value }))}
                  min={0}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Order <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={editForm.order}
                  onChange={(e) => setEditForm((f) => ({ ...f, order: e.target.value }))}
                  min={0}
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
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </ModalForm>

        {/* Delete Confirmation */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white">Delete Module</h3>
              <p className="text-sm text-gray-400">
                Are you sure you want to delete this module? This action cannot be undone.
              </p>
              <p className="text-sm text-gray-300 bg-navy-900 rounded px-3 py-2 line-clamp-2">
                {truncate(deleteTarget.title, 120)}
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

function DetailField({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      {typeof value === "string" ? (
        <p className="text-sm text-white break-words">{value}</p>
      ) : (
        value
      )}
    </div>
  );
}