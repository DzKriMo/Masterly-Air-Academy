"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import type { FilterOption } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { DetailField } from "@/components/detail-field";
import { ExerciseChipSelector } from "@/components/exercise-chip-selector";
import { useToast } from "@/components/toast";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuthGuard } from "@/lib/use-auth-guard";
import { PageHeader } from "@/components/page-header";

interface FlightEntry { id: string; date: string; aircraft: string; duration: number; grade: number | null; result: string | null; instructor_name?: string; exercises_completed?: any; competencies_acquired?: any; observations?: string; source?: string; }
interface LogEntry { id: string; date: string; aircraft_reg?: string; aircraft_text?: string; flight_duration: number; exercises: string[]; notes?: string; status: string; validated_by_name?: string; validated_at?: string; rejection_reason?: string; }

export default function StudentFlightsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [log, setLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [selectedFlight, setSelectedFlight] = useState<FlightEntry | null>(null);
  const [printing, setPrinting] = useState(false);
  const [tab, setTab] = useState<"log" | "entries">("log");

  // Self-log state
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editEntry, setEditEntry] = useState<LogEntry | null>(null);
  const [form, setForm] = useState({
    aircraft: "", aircraft_text: "", date: "", departure_time: "", arrival_time: "",
    flight_duration: "", exercises: [] as string[], notes: "",
  });

  useAuthGuard(isAuthenticated, isLoading, "/student/login");

  const loadFlights = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    api.get<any>("/students/flight-log/")
      .then(data => { setLog(data); setError(null); })
      .catch(() => setError(t('student.loadErrorMsg')))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const loadEntries = useCallback(() => {
    if (!isAuthenticated) return;
    setEntriesLoading(true);
    api.get<any>("/flight-log-entries/")
      .then(data => setEntries(data.results || data || []))
      .catch(() => {})
      .finally(() => setEntriesLoading(false));
  }, [isAuthenticated]);

  useEffect(() => { loadFlights(); loadEntries(); }, [loadFlights, loadEntries]);

  const mergedLessons = [
    ...(log?.lessons || []).map((l: FlightEntry) => ({ ...l, source: 'flight' as const })),
    ...(log?.log_entries || []).map((e: FlightEntry) => ({ ...e, source: 'log_entry' as const })),
  ];

  const filterOptions: FilterOption[] = [
    { key: "result", label: t('student.allResults'), options: [
      { value: "passed", label: t("passed") },
      { value: "failed", label: t("failed") },
    ]},
  ];

  const filteredLessons = mergedLessons.filter((f: any) => {
    if (filters.result) {
      if (filters.result === "passed" && !String(f.result || '').toLowerCase().includes("pass")) return false;
      if (filters.result === "failed" && (f.result || '').toLowerCase().includes("pass")) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (f.aircraft || '').toLowerCase().includes(q) || (f.date || '').includes(search) || String(f.duration || '').includes(search);
    }
    return true;
  });

  const downloadLogbookPDF = () => {
    if (!mergedLessons.length) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(10, 22, 40);
    doc.text(t('student.logbookTitle'), 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    const studentRef = log?.student_name || "";
    doc.text(`${t('common.student', 'Student')}: ${studentRef}${log?.student_number ? ` (${log.student_number})` : ""}`, 14, 28);
    doc.text(`${t('common.program', 'Program')}: ${log?.program || "—"}`, 14, 34);
    doc.setTextColor(100, 116, 139);
    doc.text(`${t('student.totalHoursLabel')} ${log?.total_flight_hours || 0}h  |  ${t('student.lessonsLabel')} ${log?.total_lessons || 0}`, 14, 40);

    const rows = mergedLessons.map((l: any) => [
      typeof l.date === 'string' ? l.date.slice(0, 10) : l.date,
      l.aircraft || '—',
      `${l.duration}h`,
      l.grade ? `${l.grade}${l.result ? ` (${l.result})` : ''}` : l.result || '-'
    ]);
    autoTable(doc, {
      head: [[t("date"), t("aircraft"), t("duration"), t("common.grade")]],
      body: rows, startY: 46, theme: 'grid',
      headStyles: { fillColor: [196, 148, 60] },
      styles: { fontSize: 9, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 50 }, 2: { cellWidth: 30 }, 3: { cellWidth: 40 } },
    });
    doc.save('flight-logbook.pdf');
  };

  const handlePrintReport = async (id: string) => {
    setPrinting(true);
    try {
      const res = await api.download(`/flight-lessons/${id}/report/`);
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), '_blank');
    } catch {}
    finally { setPrinting(false); }
  };

  // Self-log handlers
  const resetForm = () => {
    setForm({ aircraft: "", aircraft_text: "", date: "", departure_time: "", arrival_time: "", flight_duration: "", exercises: [], notes: "" });
    setEditEntry(null);
  };

  const openEdit = (entry: LogEntry) => {
    setEditEntry(entry);
    setForm({
      aircraft: entry.aircraft_reg || "", aircraft_text: entry.aircraft_text || "",
      date: entry.date || "", departure_time: "", arrival_time: "",
      flight_duration: String(entry.flight_duration || ""),
      exercises: entry.exercises || [], notes: entry.notes || "",
    });
    setShowForm(true);
  };

  const { showToast } = useToast();

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const body: any = {
      date: form.date,
      flight_duration: parseFloat(form.flight_duration),
      exercises: form.exercises,
      notes: form.notes || null,
    };
    if (form.aircraft) body.aircraft = form.aircraft;
    if (form.aircraft_text) body.aircraft_text = form.aircraft_text;
    if (form.departure_time) body.departure_time = form.departure_time;
    if (form.arrival_time) body.arrival_time = form.arrival_time;

    try {
      if (editEntry) {
        await api.patch(`/flight-log-entries/${editEntry.id}/`, body);
      } else {
        await api.post("/flight-log-entries/", body);
      }
      setShowForm(false); resetForm(); loadEntries();
      showToast("success", editEntry ? t("student.entryUpdated", "Entry updated") : t("student.entryCreated", "Entry submitted"));
    } catch (err: any) {
      showToast("error", err.message || t("student.saveFailed", "Failed to save"));
    } finally { setSaving(false); }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm(t("student.confirmDeleteEntry", "Delete this entry?"))) return;
    try { await api.delete(`/flight-log-entries/${id}/`); loadEntries(); showToast("success", t("student.entryDeleted", "Entry deleted")); }
    catch { showToast("error", t("student.deleteFailed", "Failed to delete")); }
  };

  const statusColors: Record<string, string> = { pending: "bg-amber-500/10 text-amber-400", approved: "bg-green-500/10 text-green-400", rejected: "bg-red-500/10 text-red-400" };

  const entryColumns: Column<LogEntry>[] = [
    { key: "date", header: t("common.date"), render: (e) => <span className="text-white">{e.date}</span> },
    { key: "aircraft", header: t("aircraft"), render: (e) => <span className="text-gray-300">{e.aircraft_reg || e.aircraft_text || "—"}</span> },
    { key: "flight_duration", header: t("duration"), render: (e) => <span>{e.flight_duration}h</span> },
    { key: "status", header: t("common.status"), render: (e) => <span className={`text-xs px-2 py-0.5 rounded ${statusColors[e.status] || ""}`}>{e.status}</span> },
    { key: "exercises", header: t("exercisesCompleted", "Exercises"), render: (e) => <span className="text-gray-400">{e.exercises?.length || 0}</span> },
    { key: "actions", header: "", sortable: false, render: (e) => (
      <div className="flex gap-1" onClick={(ev) => ev.stopPropagation()}>
        {e.status === "pending" && (
          <>
            <button onClick={() => openEdit(e)} className="px-2 py-1 text-xs bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded hover:bg-blue-500/20">Edit</button>
            <button onClick={() => handleDeleteEntry(e.id)} className="px-2 py-1 text-xs bg-red-500/10 border border-red-500/30 text-red-400 rounded hover:bg-red-500/20">Del</button>
          </>
        )}
      </div>
    )},
  ];

  const logColumns: Column<any>[] = [
    { key: "date", header: t('common.date'), render: (item: any) => <span>{typeof item.date === 'string' ? item.date.slice(0, 10) : item.date}</span> },
    { key: "aircraft", header: t("aircraft"), render: (item: any) => <span className="text-white font-medium">{item.aircraft || "—"}</span> },
    { key: "duration", header: t("duration"), render: (item: any) => <span>{item.duration}h</span> },
    { key: "grade", header: t('common.grade'), render: (item: any) => (
      <span className={item.grade && item.grade >= 7 ? "text-green-400 font-medium" : item.grade ? "text-red-400 font-medium" : "text-gray-500"}>
        {item.grade ?? "-"} {item.result && `(${item.result})`}
      </span>
    )},
  ];

  if (loading) return <div className="min-h-screen bg-navy-900"><PageHeader title={t('student.flightLog')} backHref="/student/dashboard" maxWidth="max-w-5xl" /><main className="max-w-5xl mx-auto px-6 py-8"><LoadingSkeleton type="card" rows={3} /></main></div>;
  if (error) return <div className="min-h-screen bg-navy-900"><PageHeader title={t('student.flightLog')} backHref="/student/dashboard" maxWidth="max-w-5xl" /><main className="max-w-5xl mx-auto px-6 py-8"><ErrorCard message={error} onRetry={loadFlights} /></main></div>;

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader
        title={t('student.flightLog')}
        backHref="/student/dashboard"
        backLabel={t('student.backToDashboard')}
        maxWidth="max-w-5xl"
        actions={mergedLessons.length > 0 && (
          <button onClick={downloadLogbookPDF} className="px-4 py-2 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded-lg text-sm hover:bg-gold-500 hover:text-navy-900 transition-colors whitespace-nowrap">
            {t('student.downloadLogbook')}
          </button>
        )}
      />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex gap-4 mb-6 border-b border-navy-700">
          <button onClick={() => setTab("log")} className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === "log" ? "border-gold-500 text-gold-500" : "border-transparent text-gray-400 hover:text-white"}`}>
            {t('student.flightLog')}
          </button>
          <button onClick={() => setTab("entries")} className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === "entries" ? "border-gold-500 text-gold-500" : "border-transparent text-gray-400 hover:text-white"}`}>
            {t('student.myEntries', "My Entries")}
          </button>
        </div>

        {tab === "log" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><p className="text-3xl font-bold text-white">{log?.total_flight_hours || 0}h</p><p className="text-sm text-gray-400 mt-1">{t('student.totalFlightHours')}</p></div>
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><p className="text-3xl font-bold text-white">{log?.total_lessons || 0}</p><p className="text-sm text-gray-400 mt-1">{t('student.lessonsCompleted')}</p></div>
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><p className="text-3xl font-bold text-white">{(log?.total_lessons > 0 ? ((log?.total_flight_hours || 0) / log.total_lessons).toFixed(1) : "0")}h</p><p className="text-sm text-gray-400 mt-1">{t('student.avgPerLesson')}</p></div>
            </div>
            <FilterBar filters={filterOptions} values={filters} onChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))} onClear={() => { setFilters({}); setSearch(""); }} searchPlaceholder={t('student.searchFlights')} searchValue={search} onSearchChange={setSearch} />
            <DataTable columns={logColumns} data={filteredLessons} keyField="id" onRowClick={(item: any) => setSelectedFlight(item)} emptyMessage={t('student.noCompletedFlights')} />

            <ModalForm
              open={!!selectedFlight}
              onClose={() => setSelectedFlight(null)}
              title={t("student.flightDetail", "Flight Details")}
              footer={
                <div className="flex gap-3 justify-end">
                  {selectedFlight?.id && selectedFlight.source !== 'log_entry' && (
                    <button onClick={() => handlePrintReport(selectedFlight!.id)} disabled={printing} className="px-5 py-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 rounded-lg text-sm font-semibold">{printing ? "..." : t("instructor.printReport", "Print Report")}</button>
                  )}
                  <button onClick={() => setSelectedFlight(null)} className="px-5 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-sm">{t("close", "Close")}</button>
                </div>
              }
            >
              {selectedFlight && (
                <div className="space-y-6">
                  <section>
                    <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">{t("common.details", "Details")}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <DetailField label={t("common.date")} value={typeof selectedFlight.date === 'string' ? selectedFlight.date.slice(0, 10) : selectedFlight.date} />
                      <DetailField label={t("aircraft")} value={selectedFlight.aircraft} />
                      <DetailField label={t("duration")} value={`${selectedFlight.duration}h`} />
                      <DetailField label={t("common.grade")} value={selectedFlight.grade != null ? `${selectedFlight.grade}${selectedFlight.result ? ` (${selectedFlight.result})` : ""}` : (selectedFlight.result || "-")} />
                      {selectedFlight.instructor_name && <DetailField label={t("common.instructor")} value={selectedFlight.instructor_name} />}
                    </div>
                  </section>
                  {selectedFlight.exercises_completed && (
                    <section><h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">{t("exercisesCompleted", "Exercises")}</h3>
                      <div className="flex flex-wrap gap-1.5">{Array.isArray(selectedFlight.exercises_completed) ? selectedFlight.exercises_completed.map((x: string, i: number) => <span key={i} className="text-xs px-2 py-0.5 bg-gold-500/10 text-gold-500 rounded">{x}</span>) : <span className="text-sm text-gray-400">{String(selectedFlight.exercises_completed)}</span>}</div>
                    </section>
                  )}
                  {selectedFlight.observations && (
                    <section><h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">{t("observations", "Observations")}</h3><p className="text-sm text-white">{selectedFlight.observations}</p></section>
                  )}
                </div>
              )}
            </ModalForm>
          </>
        )}

        {tab === "entries" && (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={() => { resetForm(); setShowForm(true); }} className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm">
                + {t("student.newEntry", "New Entry")}
              </button>
            </div>

            {entriesLoading ? <LoadingSkeleton type="table" rows={4} /> : entries.length === 0 ? (
              <EmptyState message={t("student.noEntriesYet", "No log entries yet. Submit your first flight!")} />
            ) : (
              <DataTable columns={entryColumns} data={entries} keyField="id" />
            )}

            <ModalForm open={showForm} onClose={() => { setShowForm(false); resetForm(); }}
              title={editEntry ? t("student.editEntry", "Edit Entry") : t("student.newEntry", "New Flight Log Entry")}
              footer={
                <button type="submit" form="log-entry-form" disabled={saving} className="px-6 py-2.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-semibold rounded-lg text-sm">
                  {saving ? t("common.saving", "Saving...") : editEntry ? t("common.update", "Update") : t("common.submit", "Submit")}
                </button>
              }
            >
              <form id="log-entry-form" onSubmit={handleSaveEntry} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t("common.date")} *</label>
                  <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t("aircraft")}</label>
                    <input type="text" value={form.aircraft_text} onChange={e => setForm({...form, aircraft_text: e.target.value})} placeholder={t("student.aircraftPlaceholder", "e.g. C172 G-ABCD")} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t("duration")} (h) *</label>
                    <input type="number" step="0.1" min="0" value={form.flight_duration} onChange={e => setForm({...form, flight_duration: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t("exercisesCompleted", "Exercises")}</label>
                  <ExerciseChipSelector selected={form.exercises} onChange={(vals) => setForm({...form, exercises: vals})} placeholder={t("instructor.exercisesPlaceholder", "Select or type exercises...")} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t("common.notes", "Notes")}</label>
                  <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
                </div>
              </form>
            </ModalForm>
          </>
        )}
      </main>
    </div>
  );
}
