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

interface Quiz {
  id: string;
  module: string;
  module_name?: string;
  title: string;
  description: string | null;
  duration: number | null;
  passing_grade: number | null;
  max_attempts: number;
  is_open: boolean;
}

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

export default function AdminQuizzesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  const [selected, setSelected] = useState<Quiz | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    module: "",
    title: "",
    description: "",
    duration: "",
    passing_grade: "",
    max_attempts: "1",
    is_open: false,
  });
  const [createError, setCreateError] = useState("");

  const [editItem, setEditItem] = useState<Quiz | null>(null);
  const [editForm, setEditForm] = useState({
    module: "",
    title: "",
    description: "",
    duration: "",
    passing_grade: "",
    max_attempts: "1",
    is_open: false,
  });
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Quiz | null>(null);

  const moduleMap = useMemo(() => new Map<string, any>(), []);

  const { data: quizzes, isLoading, error, refetch } = useQuery<Quiz[]>({
    queryKey: ["admin-quizzes"],
    queryFn: async () => {
      const d = await api.get<any>("/quizzes/");
      return unwrapResults(d);
    },
    enabled: isAuthenticated,
  });

  const { data: modules = [] } = useQuery<any[]>({
    queryKey: ["admin-quiz-modules"],
    queryFn: async () => {
      const d = await api.get<any>("/modules/");
      return unwrapResults(d);
    },
    enabled: isAuthenticated,
  });

  const quizzesWithModule = useMemo(() => {
    if (!quizzes) return [];
    return quizzes.map((q) => ({
      ...q,
      module_name: modules.find((m: any) => m.id === q.module)?.title || "—",
    }));
  }, [quizzes, modules]);

  const resetCreateForm = () => {
    setCreateForm({
      module: "", title: "", description: "", duration: "",
      passing_grade: "", max_attempts: "1", is_open: false,
    });
    setCreateError("");
  };

  const buildPayload = (form: typeof createForm) => ({
    module: form.module,
    title: form.title || null,
    description: form.description || null,
    duration: form.duration ? parseInt(form.duration, 10) : null,
    passing_grade: form.passing_grade ? parseFloat(form.passing_grade) : null,
    max_attempts: parseInt(form.max_attempts, 10) || 1,
    is_open: form.is_open,
  });

  const createMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof buildPayload>) =>
      api.post("/quizzes/", payload),
    onSuccess: () => {
      showToast("success", "Quiz created successfully");
      setCreateOpen(false);
      resetCreateForm();
      queryClient.invalidateQueries({ queryKey: ["admin-quizzes"] });
    },
    onError: (err: any) => {
      const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message;
      setCreateError(msg || "Failed to create quiz");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReturnType<typeof buildPayload> }) =>
      api.patch(`/quizzes/${id}/`, payload),
    onSuccess: () => {
      showToast("success", "Quiz updated successfully");
      setEditItem(null);
      queryClient.invalidateQueries({ queryKey: ["admin-quizzes"] });
    },
    onError: (err: any) => {
      const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message;
      setEditError(msg || "Failed to update quiz");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/quizzes/${id}/`),
    onSuccess: () => {
      showToast("success", "Quiz deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-quizzes"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to delete quiz");
    },
  });

  const filtered = useMemo(() => {
    if (!quizzesWithModule) return [];
    let r = quizzesWithModule;
    if (filterValues.is_open)
      r = r.filter((q) => String(q.is_open) === filterValues.is_open);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter(
        (item) =>
          (item.title || "").toLowerCase().includes(q) ||
          (item.module_name || "").toLowerCase().includes(q)
      );
    }
    return r;
  }, [quizzesWithModule, filterValues, searchValue]);

  const columns: Column<Quiz>[] = useMemo(
    () => [
      {
        key: "title",
        header: "Title",
        render: (q) => (
          <span className="text-sm font-semibold text-white">{q.title || "Untitled Quiz"}</span>
        ),
      },
      {
        key: "module",
        header: "Module",
        render: (q) => (
          <span className="text-sm text-gray-300">{q.module_name || "—"}</span>
        ),
      },
      {
        key: "duration",
        header: "Duration",
        render: (q) => (
          <span className="text-sm text-gray-300">{q.duration ? `${q.duration} min` : "—"}</span>
        ),
      },
      {
        key: "passing_grade",
        header: "Passing",
        render: (q) => (
          <span className="text-sm text-gray-300">{q.passing_grade != null ? `${q.passing_grade}%` : "—"}</span>
        ),
      },
      {
        key: "max_attempts",
        header: "Max Attempts",
        render: (q) => (
          <span className="text-sm text-gray-300">{q.max_attempts}</span>
        ),
      },
      {
        key: "is_open",
        header: "Open",
        render: (q) => (
          <span className={`text-xs px-2 py-0.5 rounded ${q.is_open ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"}`}>
            {q.is_open ? "Open" : "Closed"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (q) => (
          <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setEditItem(q);
                setEditForm({
                  module: q.module,
                  title: q.title || "",
                  description: q.description || "",
                  duration: q.duration != null ? String(q.duration) : "",
                  passing_grade: q.passing_grade != null ? String(q.passing_grade) : "",
                  max_attempts: String(q.max_attempts),
                  is_open: q.is_open,
                });
                setEditError("");
              }}
              className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setDeleteTarget(q)}
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

  const moduleFilterOptions = useMemo(
    () => modules.map((m: any) => ({ value: m.id, label: m.title })),
    [modules]
  );

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader
        title="Quizzes"
        backHref="/admin/dashboard"
        backLabel={t("common.back", "Back to Dashboard")}
        actions={
          <button
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors"
          >
            + New Quiz
          </button>
        }
      />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <ErrorCard
            message={error?.message || "Failed to load quizzes"}
            onRetry={() => refetch()}
          />
        )}

        <FilterBar
          filters={[
            {
              key: "is_open",
              label: "All Status",
              options: [
                { value: "true", label: "Open" },
                { value: "false", label: "Closed" },
              ],
            },
            {
              key: "module",
              label: "All Modules",
              options: moduleFilterOptions,
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
          searchPlaceholder="Search quizzes..."
        />

        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              quizzes?.length === 0
                ? "No quizzes have been created yet."
                : "No quizzes match your filters."
            }
            title={quizzes?.length === 0 ? "No quizzes yet" : "No matching quizzes"}
            action={
              quizzes?.length === 0
                ? { label: "New Quiz", onClick: () => setCreateOpen(true) }
                : undefined
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            keyField="id"
            onRowClick={(item) => setSelected(item as Quiz)}
          />
        )}

        {/* Detail Modal */}
        <ModalForm
          open={!!selected}
          onClose={() => setSelected(null)}
          title={selected?.title || "Quiz Details"}
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
                <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">Quiz Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Title" value={selected.title || "Untitled"} />
                  <DetailField label="Module" value={selected.module_name || "—"} />
                  <DetailField label="Duration" value={selected.duration ? `${selected.duration} minutes` : "—"} />
                  <DetailField label="Passing Grade" value={selected.passing_grade != null ? `${selected.passing_grade}%` : "—"} />
                  <DetailField label="Max Attempts" value={String(selected.max_attempts)} />
                  <DetailField label="Status" value={selected.is_open ? "Open" : "Closed"} />
                  {selected.description && (
                    <div className="col-span-2">
                      <DetailField label="Description" value={selected.description} />
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </ModalForm>

        {/* Create Modal */}
        <ModalForm
          open={createOpen}
          onClose={() => { setCreateOpen(false); resetCreateForm(); }}
          title="New Quiz"
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
                disabled={createMutation.isPending || !createForm.module}
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
                Module <span className="text-red-400">*</span>
              </label>
              <select
                value={createForm.module}
                onChange={(e) => setCreateForm((f) => ({ ...f, module: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="">Select module...</option>
                {modules.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Title</label>
              <input
                type="text"
                value={createForm.title}
                onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                placeholder="e.g. Navigation Week 1 Quiz"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
                placeholder="Optional description..."
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Duration (min)</label>
                <input
                  type="number"
                  min="1"
                  value={createForm.duration}
                  onChange={(e) => setCreateForm((f) => ({ ...f, duration: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                  placeholder="30"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Passing Grade (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={createForm.passing_grade}
                  onChange={(e) => setCreateForm((f) => ({ ...f, passing_grade: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                  placeholder="70"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Max Attempts</label>
                <input
                  type="number"
                  min="1"
                  value={createForm.max_attempts}
                  onChange={(e) => setCreateForm((f) => ({ ...f, max_attempts: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={createForm.is_open}
                onChange={(e) => setCreateForm((f) => ({ ...f, is_open: e.target.checked }))}
                className="w-4 h-4 rounded bg-navy-900 border-navy-700 text-gold-500 focus:ring-gold-500/30"
              />
              <span className="text-sm text-gray-300">Open — students can access this quiz</span>
            </label>
          </div>
        </ModalForm>

        {/* Edit Modal */}
        <ModalForm
          open={!!editItem}
          onClose={() => setEditItem(null)}
          title="Edit Quiz"
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
                disabled={updateMutation.isPending || !editForm.module}
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
                Module <span className="text-red-400">*</span>
              </label>
              <select
                value={editForm.module}
                onChange={(e) => setEditForm((f) => ({ ...f, module: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="">Select module...</option>
                {modules.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
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
            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Duration (min)</label>
                <input
                  type="number"
                  min="1"
                  value={editForm.duration}
                  onChange={(e) => setEditForm((f) => ({ ...f, duration: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Passing Grade (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={editForm.passing_grade}
                  onChange={(e) => setEditForm((f) => ({ ...f, passing_grade: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Max Attempts</label>
                <input
                  type="number"
                  min="1"
                  value={editForm.max_attempts}
                  onChange={(e) => setEditForm((f) => ({ ...f, max_attempts: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.is_open}
                onChange={(e) => setEditForm((f) => ({ ...f, is_open: e.target.checked }))}
                className="w-4 h-4 rounded bg-navy-900 border-navy-700 text-gold-500 focus:ring-gold-500/30"
              />
              <span className="text-sm text-gray-300">Open — students can access this quiz</span>
            </label>
          </div>
        </ModalForm>

        {/* Delete Confirmation */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white">Delete Quiz</h3>
              <p className="text-sm text-gray-400">
                Are you sure you want to delete "{deleteTarget.title || "this quiz"}"? This action cannot be undone.
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