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

interface FlightLessonTemplate {
  id: string;
  program: string;
  program_title: string;
  lesson_number: number;
  title: string;
  title_ar: string | null;
  title_fr: string | null;
  objective: string | null;
  competencies: string[];
  planned_duration: number | null;
  briefing_time: number | null;
  flight_time: number | null;
  debriefing_time: number | null;
  success_criteria: string | null;
}

interface FlightProgram {
  id: string;
  title: string;
}

const fmtVal = (v: any) => (v ?? "—");
const fmtNum = (v: number | null | undefined) => (v != null ? v.toFixed(1) : "—");

export default function AdminFlightLessonTemplatesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  const [selected, setSelected] = useState<FlightLessonTemplate | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    program: "", lesson_number: 1, title: "", title_ar: "", title_fr: "",
    objective: "", planned_duration: "", briefing_time: "", flight_time: "",
    debriefing_time: "", success_criteria: "", competencies: "",
  });
  const [createError, setCreateError] = useState("");

  const [editItem, setEditItem] = useState<FlightLessonTemplate | null>(null);
  const [editForm, setEditForm] = useState({
    program: "", lesson_number: 1, title: "", title_ar: "", title_fr: "",
    objective: "", planned_duration: "", briefing_time: "", flight_time: "",
    debriefing_time: "", success_criteria: "", competencies: "",
  });
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<FlightLessonTemplate | null>(null);

  const { data: records, isLoading, error, refetch } = useQuery<FlightLessonTemplate[]>({
    queryKey: ["admin-flight-lesson-templates"],
    queryFn: async () => {
      const d = await api.get<any>("/flight-lesson-templates/");
      return (d as any)?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  const { data: programs = [] } = useQuery<FlightProgram[]>({
    queryKey: ["admin-flt-programs"],
    queryFn: async () => {
      const d = await api.get<any>("/flight-programs/");
      return (d as any)?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  const resetCreateForm = () => {
    setCreateForm({
      program: "", lesson_number: 1, title: "", title_ar: "", title_fr: "",
      objective: "", planned_duration: "", briefing_time: "", flight_time: "",
      debriefing_time: "", success_criteria: "", competencies: "",
    });
    setCreateError("");
  };

  const buildPayload = (form: typeof createForm) => ({
    program: form.program,
    lesson_number: form.lesson_number,
    title: form.title,
    title_ar: form.title_ar || null,
    title_fr: form.title_fr || null,
    objective: form.objective || null,
    planned_duration: form.planned_duration ? parseFloat(form.planned_duration) : null,
    briefing_time: form.briefing_time ? parseFloat(form.briefing_time) : null,
    flight_time: form.flight_time ? parseFloat(form.flight_time) : null,
    debriefing_time: form.debriefing_time ? parseFloat(form.debriefing_time) : null,
    success_criteria: form.success_criteria || null,
    competencies: form.competencies
      ? form.competencies.split("\n").map((s) => s.trim()).filter(Boolean)
      : [],
  });

  const createMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof buildPayload>) =>
      api.post("/flight-lesson-templates/", payload),
    onSuccess: () => {
      showToast("success", "Flight lesson template created");
      setCreateOpen(false);
      resetCreateForm();
      queryClient.invalidateQueries({ queryKey: ["admin-flight-lesson-templates"] });
    },
    onError: (err: any) => {
      const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message;
      setCreateError(msg || "Failed to create template");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReturnType<typeof buildPayload> }) =>
      api.patch(`/flight-lesson-templates/${id}/`, payload),
    onSuccess: () => {
      showToast("success", "Flight lesson template updated");
      setEditItem(null);
      queryClient.invalidateQueries({ queryKey: ["admin-flight-lesson-templates"] });
    },
    onError: (err: any) => {
      const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message;
      setEditError(msg || "Failed to update template");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/flight-lesson-templates/${id}/`),
    onSuccess: () => {
      showToast("success", "Flight lesson template deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-flight-lesson-templates"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to delete template");
    },
  });

  const filtered = useMemo(() => {
    if (!records) return [];
    let r = records;
    if (filterValues.program) r = r.filter((a) => a.program === filterValues.program);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter((a) => a.title.toLowerCase().includes(q));
    }
    return r;
  }, [records, filterValues, searchValue]);

  const columns: Column<FlightLessonTemplate>[] = useMemo(
    () => [
      {
        key: "lesson_number",
        header: "Lesson #",
        render: (a) => <span className="text-sm font-semibold text-white">{a.lesson_number}</span>,
      },
      {
        key: "title",
        header: "Title",
        render: (a) => <span className="text-sm text-gray-300">{a.title}</span>,
      },
      {
        key: "program_title",
        header: "Program",
        render: (a) => <span className="text-sm text-gray-300">{a.program_title}</span>,
      },
      {
        key: "planned_duration",
        header: "Duration",
        render: (a) => <span className="text-sm text-gray-300">{fmtNum(a.planned_duration)}h</span>,
      },
      {
        key: "briefing_time",
        header: "Briefing",
        render: (a) => <span className="text-sm text-gray-300">{fmtNum(a.briefing_time)}h</span>,
      },
      {
        key: "flight_time",
        header: "Flight",
        render: (a) => <span className="text-sm text-gray-300">{fmtNum(a.flight_time)}h</span>,
      },
      {
        key: "debriefing_time",
        header: "Debrief",
        render: (a) => <span className="text-sm text-gray-300">{fmtNum(a.debriefing_time)}h</span>,
      },
      {
        key: "competencies",
        header: "Competencies",
        render: (a) => (
          <span className="text-sm text-gray-300">
            {Array.isArray(a.competencies) ? a.competencies.length : 0}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (a) => (
          <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setEditItem(a);
                setEditForm({
                  program: a.program,
                  lesson_number: a.lesson_number,
                  title: a.title,
                  title_ar: a.title_ar || "",
                  title_fr: a.title_fr || "",
                  objective: a.objective || "",
                  planned_duration: a.planned_duration != null ? String(a.planned_duration) : "",
                  briefing_time: a.briefing_time != null ? String(a.briefing_time) : "",
                  flight_time: a.flight_time != null ? String(a.flight_time) : "",
                  debriefing_time: a.debriefing_time != null ? String(a.debriefing_time) : "",
                  success_criteria: a.success_criteria || "",
                  competencies: Array.isArray(a.competencies) ? a.competencies.join("\n") : "",
                });
                setEditError("");
              }}
              className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setDeleteTarget(a)}
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

  const programFilterOptions = useMemo(
    () => programs.map((p: FlightProgram) => ({ value: p.id, label: p.title })),
    [programs]
  );

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader
        title="Flight Lesson Templates"
        backHref="/admin/dashboard"
        backLabel={t("common.back", "Back to Dashboard")}
        actions={
          <button
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors"
          >
            + New Template
          </button>
        }
      />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <ErrorCard
            message={(error as any)?.message || "Failed to load flight lesson templates"}
            onRetry={() => refetch()}
          />
        )}

        <FilterBar
          filters={[
            {
              key: "program",
              label: "All Programs",
              options: programFilterOptions,
            },
          ]}
          values={filterValues}
          onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))}
          onClear={() => { setFilterValues({}); setSearchValue(""); }}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search by title..."
        />

        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              records?.length === 0
                ? "No flight lesson templates yet."
                : "No templates match your filters."
            }
            title={records?.length === 0 ? "No templates yet" : "No matching templates"}
            action={
              records?.length === 0
                ? { label: "New Template", onClick: () => setCreateOpen(true) }
                : undefined
            }
          />
        ) : (
          <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(item) => setSelected(item as FlightLessonTemplate)} />
        )}

        {/* Detail Modal */}
        <ModalForm
          open={!!selected}
          onClose={() => setSelected(null)}
          title="Flight Lesson Template"
          footer={
            <button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">
              {t("common.close", "Close")}
            </button>
          }
        >
          {selected && (
            <div className="space-y-4">
              <DetailField label="Program" value={selected.program_title} />
              <DetailField label="Lesson Number" value={String(selected.lesson_number)} />
              <DetailField label="Title" value={selected.title} />
              <DetailField label="Title (Arabic)" value={fmtVal(selected.title_ar)} />
              <DetailField label="Title (French)" value={fmtVal(selected.title_fr)} />
              <DetailField label="Objective" value={fmtVal(selected.objective)} />
              <DetailField label="Planned Duration" value={fmtNum(selected.planned_duration)} />
              <DetailField label="Briefing Time" value={fmtNum(selected.briefing_time)} />
              <DetailField label="Flight Time" value={fmtNum(selected.flight_time)} />
              <DetailField label="Debriefing Time" value={fmtNum(selected.debriefing_time)} />
              <DetailField label="Success Criteria" value={fmtVal(selected.success_criteria)} />
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Competencies</p>
                {Array.isArray(selected.competencies) && selected.competencies.length > 0 ? (
                  <ul className="list-disc list-inside text-sm text-white space-y-1">
                    {selected.competencies.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">—</p>
                )}
              </div>
            </div>
          )}
        </ModalForm>

        {/* Create Modal */}
        <ModalForm
          open={createOpen}
          onClose={() => { setCreateOpen(false); resetCreateForm(); }}
          title="New Flight Lesson Template"
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
                disabled={createMutation.isPending || !createForm.program || !createForm.title}
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
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Program <span className="text-red-400">*</span>
              </label>
              <select
                value={createForm.program}
                onChange={(e) => setCreateForm((f) => ({ ...f, program: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="">Select program...</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Lesson Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={createForm.lesson_number}
                  onChange={(e) => setCreateForm((f) => ({ ...f, lesson_number: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
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
                  placeholder="Lesson title..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Title (Arabic)</label>
                <input
                  type="text"
                  value={createForm.title_ar}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title_ar: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                  placeholder="عنوان الدرس..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Title (French)</label>
                <input
                  type="text"
                  value={createForm.title_fr}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title_fr: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                  placeholder="Titre de la leçon..."
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Objective</label>
              <textarea
                value={createForm.objective}
                onChange={(e) => setCreateForm((f) => ({ ...f, objective: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
                placeholder="Lesson objective..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Planned Duration (hrs)</label>
                <input
                  type="number"
                  step="0.1"
                  value={createForm.planned_duration}
                  onChange={(e) => setCreateForm((f) => ({ ...f, planned_duration: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                  placeholder="e.g. 1.5"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Briefing Time (hrs)</label>
                <input
                  type="number"
                  step="0.1"
                  value={createForm.briefing_time}
                  onChange={(e) => setCreateForm((f) => ({ ...f, briefing_time: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                  placeholder="e.g. 0.5"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Flight Time (hrs)</label>
                <input
                  type="number"
                  step="0.1"
                  value={createForm.flight_time}
                  onChange={(e) => setCreateForm((f) => ({ ...f, flight_time: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                  placeholder="e.g. 1.0"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Debriefing Time (hrs)</label>
                <input
                  type="number"
                  step="0.1"
                  value={createForm.debriefing_time}
                  onChange={(e) => setCreateForm((f) => ({ ...f, debriefing_time: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                  placeholder="e.g. 0.5"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Success Criteria</label>
              <textarea
                value={createForm.success_criteria}
                onChange={(e) => setCreateForm((f) => ({ ...f, success_criteria: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
                placeholder="Criteria for success..."
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Competencies (one per line)</label>
              <textarea
                value={createForm.competencies}
                onChange={(e) => setCreateForm((f) => ({ ...f, competencies: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
                placeholder={"Enter each competency on a new line...\ne.g.\nDemonstrate pre-flight inspection\nExecute takeoff procedure\nPerform emergency checklist"}
              />
            </div>
          </div>
        </ModalForm>

        {/* Edit Modal */}
        <ModalForm
          open={!!editItem}
          onClose={() => setEditItem(null)}
          title="Edit Flight Lesson Template"
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
                disabled={updateMutation.isPending || !editForm.program || !editForm.title}
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
            <div>
              <label className="block text-sm text-gray-400 mb-1">Program</label>
              <select
                value={editForm.program}
                onChange={(e) => setEditForm((f) => ({ ...f, program: e.target.value }))}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="">Select program...</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Lesson Number</label>
                <input
                  type="number"
                  value={editForm.lesson_number}
                  onChange={(e) => setEditForm((f) => ({ ...f, lesson_number: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
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
              <label className="block text-sm text-gray-400 mb-1">Objective</label>
              <textarea
                value={editForm.objective}
                onChange={(e) => setEditForm((f) => ({ ...f, objective: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Planned Duration (hrs)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editForm.planned_duration}
                  onChange={(e) => setEditForm((f) => ({ ...f, planned_duration: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Briefing Time (hrs)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editForm.briefing_time}
                  onChange={(e) => setEditForm((f) => ({ ...f, briefing_time: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Flight Time (hrs)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editForm.flight_time}
                  onChange={(e) => setEditForm((f) => ({ ...f, flight_time: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Debriefing Time (hrs)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editForm.debriefing_time}
                  onChange={(e) => setEditForm((f) => ({ ...f, debriefing_time: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Success Criteria</label>
              <textarea
                value={editForm.success_criteria}
                onChange={(e) => setEditForm((f) => ({ ...f, success_criteria: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Competencies (one per line)</label>
              <textarea
                value={editForm.competencies}
                onChange={(e) => setEditForm((f) => ({ ...f, competencies: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none resize-none"
              />
            </div>
          </div>
        </ModalForm>

        {/* Delete Confirmation */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white">Delete Template</h3>
              <p className="text-sm text-gray-400">
                Remove lesson {deleteTarget.lesson_number} — {deleteTarget.title}?
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