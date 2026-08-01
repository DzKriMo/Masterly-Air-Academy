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
import { DetailField } from "@/components/detail-field";
import { truncate } from "@/lib/format-utils";

interface FlightProgram {
  id: string;
  code: string;
  title: string;
  description: string | null;
  program: string;
  status: string;
}

const PROGRAMS = ["PPL", "CPL", "IR", "MEP", "MCC"];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-400",
  inactive: "bg-gray-500/10 text-gray-400",
};

const PROGRAM_COLORS: Record<string, string> = {
  PPL: "bg-blue-500/10 text-blue-400",
  CPL: "bg-purple-500/10 text-purple-400",
  IR: "bg-amber-500/10 text-amber-400",
  MEP: "bg-cyan-500/10 text-cyan-400",
  MCC: "bg-pink-500/10 text-pink-400",
};



export default function AdminFlightProgramsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  const [selected, setSelected] = useState<FlightProgram | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ code: "", title: "", description: "", program: "PPL", status: "active" });
  const [createError, setCreateError] = useState("");

  const [editItem, setEditItem] = useState<FlightProgram | null>(null);
  const [editForm, setEditForm] = useState({ code: "", title: "", description: "", program: "PPL", status: "active" });
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<FlightProgram | null>(null);

  const { data: programs, isLoading, error, refetch } = useQuery<FlightProgram[]>({
    queryKey: ["admin-flight-programs"],
    queryFn: async () => {
      const d = await api.get<any>("/flight-programs/");
      return unwrapResults(d);
    },
    enabled: isAuthenticated,
  });

  const resetCreateForm = () => {
    setCreateForm({ code: "", title: "", description: "", program: "PPL", status: "active" });
    setCreateError("");
  };

  const buildPayload = (form: typeof createForm) => ({
    code: form.code,
    title: form.title,
    description: form.description || null,
    program: form.program,
    status: form.status,
  });

  const createMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof buildPayload>) =>
      api.post("/flight-programs/", payload),
    onSuccess: () => {
      showToast("success", "Flight program created");
      setCreateOpen(false);
      resetCreateForm();
      queryClient.invalidateQueries({ queryKey: ["admin-flight-programs"] });
    },
    onError: (err: any) => {
      const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message;
      setCreateError(msg || "Failed to create program");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReturnType<typeof buildPayload> }) =>
      api.patch(`/flight-programs/${id}/`, payload),
    onSuccess: () => {
      showToast("success", "Flight program updated");
      setEditItem(null);
      queryClient.invalidateQueries({ queryKey: ["admin-flight-programs"] });
    },
    onError: (err: any) => {
      const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message;
      setEditError(msg || "Failed to update program");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/flight-programs/${id}/`),
    onSuccess: () => {
      showToast("success", "Flight program deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-flight-programs"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to delete program");
    },
  });

  const filtered = useMemo(() => {
    if (!programs) return [];
    let r = programs;
    if (filterValues.program) r = r.filter((p) => p.program === filterValues.program);
    if (filterValues.status) r = r.filter((p) => p.status === filterValues.status);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter((p) => p.title.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
    }
    return r;
  }, [programs, filterValues, searchValue]);

  const columns: Column<FlightProgram>[] = useMemo(
    () => [
      {
        key: "code",
        header: "Code",
        render: (p) => <span className="text-sm font-semibold text-white font-mono">{p.code}</span>,
      },
      {
        key: "title",
        header: "Title",
        render: (p) => <span className="text-sm text-gray-300">{truncate(p.title, 40)}</span>,
      },
      {
        key: "program",
        header: "Program",
        render: (p) => (
          <span className={`text-xs px-2 py-0.5 rounded ${PROGRAM_COLORS[p.program] || "bg-gray-500/10 text-gray-400"}`}>
            {p.program}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (p) => (
          <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[p.status] || "bg-gray-500/10 text-gray-400"}`}>
            {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (p) => (
          <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setEditItem(p);
                setEditForm({ code: p.code, title: p.title, description: p.description || "", program: p.program, status: p.status });
                setEditError("");
              }}
              className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded"
            >
              Edit
            </button>
            <button onClick={() => setDeleteTarget(p)} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded">
              Delete
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader
        title="Flight Programs"
        backHref="/admin/dashboard"
        backLabel={t("common.back", "Back to Dashboard")}
        actions={
          <button onClick={() => setCreateOpen(true)} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400">
            + New Program
          </button>
        }
      />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={error?.message || "Failed to load"} onRetry={() => refetch()} />}

        <FilterBar
          filters={[
            { key: "program", label: "All Programs", options: PROGRAMS.map((p) => ({ value: p, label: p })) },
            { key: "status", label: "All Statuses", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
          ]}
          values={filterValues}
          onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))}
          onClear={() => { setFilterValues({}); setSearchValue(""); }}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search programs..."
        />

        {isLoading ? (
          <LoadingSkeleton type="table" rows={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={programs?.length === 0 ? "No flight programs yet." : "No matching programs."}
            title={programs?.length === 0 ? "No programs yet" : "No matches"}
            action={programs?.length === 0 ? { label: "New Program", onClick: () => setCreateOpen(true) } : undefined}
          />
        ) : (
          <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(item) => setSelected(item as FlightProgram)} />
        )}

        {/* Detail Modal */}
        <ModalForm open={!!selected} onClose={() => setSelected(null)} title={selected?.code || ""} footer={
          <button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">{t('common.close')}</button>
        }>
          {selected && (
            <div className="space-y-4">
              <DetailField label="Code" value={selected.code} />
              <DetailField label="Title" value={selected.title} />
              <DetailField label="Program" value={selected.program} />
              <DetailField label="Status" value={selected.status} />
              <DetailField label="Description" value={selected.description || "—"} />
            </div>
          )}
        </ModalForm>

        {/* Create Modal */}
        <ModalForm open={createOpen} onClose={() => { setCreateOpen(false); resetCreateForm(); }} title="New Flight Program" footer={
          <><button onClick={() => { setCreateOpen(false); resetCreateForm(); }} disabled={createMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button>
          <button onClick={() => createMutation.mutate(buildPayload(createForm))} disabled={createMutation.isPending || !createForm.code || !createForm.title} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">
            {createMutation.isPending ? "Creating..." : "Create"}
          </button></>
        }>
          <div className="space-y-4">
            {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{createError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Code <span className="text-red-400">*</span></label>
                <input type="text" value={createForm.code} onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none font-mono" placeholder="PPL-A" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Program <span className="text-red-400">*</span></label>
                <select value={createForm.program} onChange={(e) => setCreateForm((f) => ({ ...f, program: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  {PROGRAMS.map((p) => (<option key={p} value={p}>{p}</option>))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Title <span className="text-red-400">*</span></label>
              <input type="text" value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none resize-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              <select value={createForm.status} onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </ModalForm>

        {/* Edit Modal */}
        <ModalForm open={!!editItem} onClose={() => setEditItem(null)} title="Edit Flight Program" footer={
          <><button onClick={() => setEditItem(null)} disabled={updateMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button>
          <button onClick={() => { if (editItem) updateMutation.mutate({ id: editItem.id, payload: buildPayload(editForm) }); }} disabled={updateMutation.isPending || !editForm.code || !editForm.title} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">
            {updateMutation.isPending ? "Saving..." : "Save"}
          </button></>
        }>
          <div className="space-y-4">
            {editError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{editError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Code <span className="text-red-400">*</span></label>
                <input type="text" value={editForm.code} onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none font-mono" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Program</label>
                <select value={editForm.program} onChange={(e) => setEditForm((f) => ({ ...f, program: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  {PROGRAMS.map((p) => (<option key={p} value={p}>{p}</option>))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Title</label>
              <input type="text" value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none resize-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </ModalForm>

        {/* Delete */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white">Delete Program</h3>
              <p className="text-sm text-gray-400">Delete "{deleteTarget.code} - {deleteTarget.title}"?</p>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button>
                <button onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 disabled:opacity-50">
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

