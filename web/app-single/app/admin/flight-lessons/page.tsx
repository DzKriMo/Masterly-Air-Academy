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

interface FL {
  id: string; student: string; student_name: string; instructor: string | null; instructor_name: string | null;
  aircraft: string; aircraft_reg: string; lesson_template: string | null;
  scheduled_date: string; start_time: string; end_time: string; status: string;
  flight_duration: string | null; briefing_duration: string | null; debrief_duration: string | null;
  exercises_completed: string[] | null; competencies_acquired: string[] | null;
  difficulties: string | null; observations: string | null; recommendations: string | null;
  grade: string | null; result: string | null; pedagogical_note: string | null;
  departure_time: string | null; arrival_time: string | null; signed_by_instructor: boolean;
  has_preparation: boolean;
}

const STATUSES = ["scheduled", "in_progress", "completed", "cancelled", "postponed"];
const INIT_FORM = { student: "", instructor: "", aircraft: "", lesson_template: "", scheduled_date: "", start_time: "", end_time: "", status: "scheduled" };

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-400", in_progress: "bg-amber-500/10 text-amber-400",
  completed: "bg-green-500/10 text-green-400", cancelled: "bg-red-500/10 text-red-400", postponed: "bg-gray-500/10 text-gray-400",
};

const fmtStatus = (s: string) => s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); } catch { return "—"; }
}

function fmtTime(d: string | null | undefined) {
  if (!d) return "—";
  try { return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }); } catch { return "—"; }
}

export default function AdminFlightLessonsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<FL | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(INIT_FORM);
  const [createError, setCreateError] = useState("");
  const [editItem, setEditItem] = useState<FL | null>(null);
  const [editForm, setEditForm] = useState(INIT_FORM);
  const [editError, setEditError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<FL | null>(null);

  const { data: records, isLoading, error, refetch } = useQuery<FL[]>({
    queryKey: ["admin-fl"],
    queryFn: async () => { const d = await api.get<any>("/flight-lessons/"); return unwrapResults(d); },
    enabled: isAuthenticated,
  });

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ["admin-fl-students"],
    queryFn: async () => { const d = await api.get<any>("/students/"); return unwrapResults(d); },
    enabled: isAuthenticated,
  });

  const { data: instructors = [] } = useQuery<any[]>({
    queryKey: ["admin-fl-instructors"],
    queryFn: async () => { const d = await api.get<any>("/flight-instructors/"); return unwrapResults(d); },
    enabled: isAuthenticated,
  });

  const { data: aircraft = [] } = useQuery<any[]>({
    queryKey: ["admin-fl-aircraft"],
    queryFn: async () => { const d = await api.get<any>("/aircraft/"); return unwrapResults(d); },
    enabled: isAuthenticated,
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["admin-fl-templates"],
    queryFn: async () => { const d = await api.get<any>("/flight-lesson-templates/"); return unwrapResults(d); },
    enabled: isAuthenticated,
  });

  const buildPayload = (f: typeof INIT_FORM) => ({
    student: f.student, instructor: f.instructor || null, aircraft: f.aircraft,
    lesson_template: f.lesson_template || null, scheduled_date: f.scheduled_date,
    start_time: f.start_time, end_time: f.end_time, status: f.status,
  });

  const createMutation = useMutation({
    mutationFn: (p: ReturnType<typeof buildPayload>) => api.post("/flight-lessons/", p),
    onSuccess: () => { showToast("success", "Flight lesson created"); setCreateOpen(false); setCreateForm(INIT_FORM); queryClient.invalidateQueries({ queryKey: ["admin-fl"] }); },
    onError: (err: any) => { const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message; setCreateError(msg || "Failed"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, p }: { id: string; p: ReturnType<typeof buildPayload> }) => api.patch(`/flight-lessons/${id}/`, p),
    onSuccess: () => { showToast("success", "Flight lesson updated"); setEditItem(null); queryClient.invalidateQueries({ queryKey: ["admin-fl"] }); },
    onError: (err: any) => { const msg = err?.data ? Object.values(err.data).flat().join(", ") : err.message; setEditError(msg || "Failed"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/flight-lessons/${id}/`),
    onSuccess: () => { showToast("success", "Flight lesson deleted"); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ["admin-fl"] }); },
    onError: (err: any) => { showToast("error", err.message || "Failed"); },
  });

  const statusActionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => api.post(`/flight-lessons/${id}/${action}/`),
    onSuccess: (_data, vars) => { showToast("success", `Lesson ${vars.action} completed`); queryClient.invalidateQueries({ queryKey: ["admin-fl"] }); },
    onError: (err: any) => { showToast("error", err.message || "Action failed"); },
  });

  const filtered = useMemo(() => {
    if (!records) return [];
    let r = records;
    if (filterValues.status) r = r.filter((a) => a.status === filterValues.status);
    if (searchValue) { const q = searchValue.toLowerCase(); r = r.filter((a) => (a.student_name || "").toLowerCase().includes(q) || (a.aircraft_reg || "").toLowerCase().includes(q)); }
    return r;
  }, [records, filterValues, searchValue]);

  const columns: Column<FL>[] = useMemo(() => [
    { key: "student_name", header: "Student", render: (a) => <span className="text-sm font-semibold text-white">{a.student_name}</span> },
    { key: "aircraft_reg", header: "Aircraft", render: (a) => <span className="text-sm text-gray-300">{a.aircraft_reg}</span> },
    { key: "scheduled_date", header: "Date", render: (a) => <span className="text-sm text-gray-300">{fmtDate(a.scheduled_date)}</span> },
    { key: "start_time", header: "Start", render: (a) => <span className="text-sm text-gray-400">{fmtTime(a.start_time)}</span> },
    { key: "status", header: "Status", render: (a) => <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[a.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtStatus(a.status)}</span> },
    { key: "actions", header: "", render: (a) => (
      <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
        {a.status === "scheduled" && <button onClick={() => statusActionMutation.mutate({ id: a.id, action: "conflicts" })} disabled={statusActionMutation.isPending} className="px-2 py-1 text-xs text-amber-400 hover:bg-amber-500/10 rounded transition-colors">Check</button>}
        <button onClick={() => { setEditItem(a); setEditForm({ student: a.student, instructor: a.instructor || "", aircraft: a.aircraft, lesson_template: a.lesson_template || "", scheduled_date: a.scheduled_date, start_time: a.start_time, end_time: a.end_time, status: a.status }); setEditError(""); }} className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded transition-colors">{t('common.edit')}</button>
        <button onClick={() => setDeleteTarget(a)} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors">{t('common.delete')}</button>
      </div>
    )},
  ], []);

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader title={t("admin.flightLessons", "Flight Lessons")} backHref="/admin/dashboard" backLabel={t("common.back", "Back")} actions={
        <button onClick={() => setCreateOpen(true)} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors">+ New Lesson</button>
      } />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={error?.message || "Failed"} onRetry={() => refetch()} />}
        {isLoading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? (
          <EmptyState message={records?.length === 0 ? "No flight lessons yet." : "No matches."} title={records?.length === 0 ? "No lessons" : "No matches"} action={records?.length === 0 ? { label: "New Lesson", onClick: () => setCreateOpen(true) } : undefined} />
        ) : <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(i) => setSelected(i as FL)} />}

        <ModalForm open={!!selected} onClose={() => setSelected(null)} title="Flight Lesson Details" footer={
          <div className="flex gap-2">
            {selected && selected.status === "scheduled" && !selected.has_preparation && (
              <button onClick={() => statusActionMutation.mutate({ id: selected.id, action: "preparation" })} disabled={statusActionMutation.isPending} className="px-4 py-2 text-sm bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/20">{statusActionMutation.isPending ? "..." : "Prepare"}</button>
            )}
            {selected && selected.status === "in_progress" && (
              <button onClick={() => statusActionMutation.mutate({ id: selected.id, action: "evaluate" })} disabled={statusActionMutation.isPending} className="px-4 py-2 text-sm bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/20">{statusActionMutation.isPending ? "..." : "Evaluate"}</button>
            )}
            <button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">{t('common.close')}</button>
          </div>
        }>
          {selected && <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Student" value={selected.student_name} />
              <DetailField label="Instructor" value={selected.instructor_name || "—"} />
              <DetailField label="Aircraft" value={selected.aircraft_reg} />
              <DetailField label="Date" value={fmtDate(selected.scheduled_date)} />
              <DetailField label="Start" value={fmtTime(selected.start_time)} />
              <DetailField label="End" value={fmtTime(selected.end_time)} />
              <DetailField label="Status" value={fmtStatus(selected.status)} />
              <DetailField label="Flight Duration" value={selected.flight_duration ? `${selected.flight_duration}h` : "—"} />
              <DetailField label="Briefing" value={selected.briefing_duration ? `${selected.briefing_duration}h` : "—"} />
              <DetailField label="Debrief" value={selected.debrief_duration ? `${selected.debrief_duration}h` : "—"} />
              <DetailField label="Grade" value={selected.grade || "—"} />
              <DetailField label="Result" value={selected.result || "—"} />
              <DetailField label="Departure" value={fmtTime(selected.departure_time)} />
              <DetailField label="Arrival" value={fmtTime(selected.arrival_time)} />
            </div>
            {selected.exercises_completed?.length ? <DetailField label="Exercises" value={selected.exercises_completed.join(", ")} /> : null}
            {selected.competencies_acquired?.length ? <DetailField label="Competencies" value={selected.competencies_acquired.join(", ")} /> : null}
            <DetailField label="Difficulties" value={selected.difficulties || "—"} />
            <DetailField label="Observations" value={selected.observations || "—"} />
            <DetailField label="Recommendations" value={selected.recommendations || "—"} />
            <DetailField label="Pedagogical Note" value={selected.pedagogical_note || "—"} />
            <DetailField label="Signed by Instructor" value={selected.signed_by_instructor ? "Yes" : "No"} />
          </div>}
        </ModalForm>

        <ModalForm open={createOpen} onClose={() => { setCreateOpen(false); setCreateForm(INIT_FORM); }} title="New Flight Lesson" footer={<>
          <button onClick={() => { setCreateOpen(false); setCreateForm(INIT_FORM); }} disabled={createMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button>
          <button onClick={() => createMutation.mutate(buildPayload(createForm))} disabled={createMutation.isPending || !createForm.student || !createForm.aircraft || !createForm.scheduled_date || !createForm.start_time || !createForm.end_time} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{createMutation.isPending ? "Creating..." : "Create"}</button>
        </>}>
          <div className="space-y-4">
            {createError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{createError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Student <span className="text-red-400">*</span></label>
                <select value={createForm.student} onChange={(e) => setCreateForm((f) => ({ ...f, student: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  <option value="">Select...</option>{students.map((s: any) => <option key={s.id} value={s.id}>{s.full_name || `${s.first_name} ${s.last_name}`}</option>)}
                </select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Aircraft <span className="text-red-400">*</span></label>
                <select value={createForm.aircraft} onChange={(e) => setCreateForm((f) => ({ ...f, aircraft: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  <option value="">Select...</option>{aircraft.map((a: any) => <option key={a.id} value={a.id}>{a.registration || a.type}</option>)}
                </select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Instructor</label>
                <select value={createForm.instructor} onChange={(e) => setCreateForm((f) => ({ ...f, instructor: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  <option value="">Auto-assign</option>{instructors.map((i: any) => <option key={i.id} value={i.id}>{i.name || i.email}</option>)}
                </select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Template</label>
                <select value={createForm.lesson_template} onChange={(e) => setCreateForm((f) => ({ ...f, lesson_template: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  <option value="">None</option>{templates.map((t: any) => <option key={t.id} value={t.id}>{t.name || t.code}</option>)}
                </select></div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Scheduled Date <span className="text-red-400">*</span></label><input type="date" value={createForm.scheduled_date} onChange={(e) => setCreateForm((f) => ({ ...f, scheduled_date: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Start Time <span className="text-red-400">*</span></label><input type="datetime-local" value={createForm.start_time} onChange={(e) => setCreateForm((f) => ({ ...f, start_time: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">End Time <span className="text-red-400">*</span></label><input type="datetime-local" value={createForm.end_time} onChange={(e) => setCreateForm((f) => ({ ...f, end_time: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Status</label>
              <select value={createForm.status} onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">{STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}</select></div>
          </div>
        </ModalForm>

        <ModalForm open={!!editItem} onClose={() => setEditItem(null)} title="Edit Flight Lesson" footer={<>
          <button onClick={() => setEditItem(null)} disabled={updateMutation.isPending} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white disabled:opacity-50">{t('common.cancel')}</button>
          <button onClick={() => { if (editItem) updateMutation.mutate({ id: editItem.id, p: buildPayload(editForm) }); }} disabled={updateMutation.isPending || !editForm.student || !editForm.aircraft || !editForm.scheduled_date || !editForm.start_time || !editForm.end_time} className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50">{updateMutation.isPending ? "Saving..." : "Save"}</button>
        </>}>
          <div className="space-y-4">
            {editError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{editError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Student</label>
                <select value={editForm.student} onChange={(e) => setEditForm((f) => ({ ...f, student: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  <option value="">Select...</option>{students.map((s: any) => <option key={s.id} value={s.id}>{s.full_name || `${s.first_name} ${s.last_name}`}</option>)}
                </select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Aircraft</label>
                <select value={editForm.aircraft} onChange={(e) => setEditForm((f) => ({ ...f, aircraft: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  <option value="">Select...</option>{aircraft.map((a: any) => <option key={a.id} value={a.id}>{a.registration || a.type}</option>)}
                </select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Instructor</label>
                <select value={editForm.instructor} onChange={(e) => setEditForm((f) => ({ ...f, instructor: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  <option value="">Auto-assign</option>{instructors.map((i: any) => <option key={i.id} value={i.id}>{i.name || i.email}</option>)}
                </select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Template</label>
                <select value={editForm.lesson_template} onChange={(e) => setEditForm((f) => ({ ...f, lesson_template: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                  <option value="">None</option>{templates.map((t: any) => <option key={t.id} value={t.id}>{t.name || t.code}</option>)}
                </select></div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Date</label><input type="date" value={editForm.scheduled_date} onChange={(e) => setEditForm((f) => ({ ...f, scheduled_date: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Start</label><input type="datetime-local" value={editForm.start_time} onChange={(e) => setEditForm((f) => ({ ...f, start_time: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">End</label><input type="datetime-local" value={editForm.end_time} onChange={(e) => setEditForm((f) => ({ ...f, end_time: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" /></div>
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Status</label>
              <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">{STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}</select></div>
          </div>
        </ModalForm>

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white">Delete Flight Lesson</h3>
              <p className="text-sm text-gray-400">Remove lesson for {deleteTarget.student_name}?</p>
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
