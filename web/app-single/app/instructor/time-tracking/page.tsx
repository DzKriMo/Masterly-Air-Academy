"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";

interface TimeEntry {
  id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  break_minutes: number;
  notes: string;
  status: string;
  total_hours: number | null;
}

function formatTime(t: string | null): string {
  if (!t) return "—";
  return t.slice(0, 5);
}

function dayName(d: Date): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getWeekDates(ref: Date): Date[] {
  const start = new Date(ref);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export default function TimeTrackingPage() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [createDate, setCreateDate] = useState("");
  const [form, setForm] = useState({ date: "", clock_in: "", clock_out: "", break_minutes: "0", notes: "" });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const today = dateStr(new Date());
  const weekDays = getWeekDates(addDays(new Date(), weekOffset * 7));

  const load = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true); setError(null);
    const from = dateStr(weekDays[0]);
    const to = dateStr(weekDays[6]);
    api.get<any>(`/time-entries/?date__gte=${from}&date__lte=${to}`)
      .then(d => {
        setEntries((d.results || d || []).sort((a: TimeEntry, b: TimeEntry) => a.date.localeCompare(b.date)));
      })
      .catch(err => setError(err.message || "Failed to load time entries."))
      .finally(() => setLoading(false));
  }, [isAuthenticated, weekOffset]);

  useEffect(() => { load(); }, [load]);

  const entryMap: Record<string, TimeEntry> = {};
  entries.forEach(e => { entryMap[e.date] = e; });

  const weekTotal = entries.reduce((sum, e) => sum + (e.total_hours || 0), 0);

  const openCreate = (d: string) => {
    setEditEntry(null);
    setCreateDate(d);
    setForm({ date: d, clock_in: "", clock_out: "", break_minutes: "0", notes: "" });
  };

  const openEdit = (e: TimeEntry) => {
    setEditEntry(e);
    setForm({
      date: e.date,
      clock_in: e.clock_in?.slice(0, 5) || "",
      clock_out: e.clock_out?.slice(0, 5) || "",
      break_minutes: String(e.break_minutes),
      notes: e.notes || "",
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        clock_in: form.clock_in || null,
        clock_out: form.clock_out || null,
        break_minutes: parseInt(form.break_minutes) || 0,
        notes: form.notes,
      };
      if (editEntry) {
        await api.patch(`/time-entries/${editEntry.id}/`, payload);
        showToast("success", "Entry updated");
      } else {
        await api.post("/time-entries/", payload);
        showToast("success", "Entry created");
      }
      setEditEntry(null);
      setCreateDate("");
      load();
    } catch (err: any) {
      showToast("error", err.message || "Failed to save entry");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/time-entries/${deleteId}/`);
      showToast("success", "Entry deleted");
      setDeleteId(null);
      load();
    } catch (err: any) {
      showToast("error", err.message || "Failed to delete entry");
    }
  };

  return (
    <div className="flex-1 min-w-0">
      <PageHeader title={t("instructor.timeTracking", "Time Tracking")} backHref="/instructor/dashboard" maxWidth="max-w-5xl" />
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {error && <ErrorCard message={error} />}
        {loading ? <LoadingSkeleton type="table" rows={7} /> : (
          <>
            {/* Week navigation */}
            <div className="flex items-center justify-between">
              <button onClick={() => setWeekOffset(w => w - 1)} className="px-3 py-1.5 bg-navy-800 border border-navy-700 rounded-lg text-sm text-gray-400 hover:text-white">&larr; Previous</button>
              <span className="text-sm text-white font-medium">
                {dateStr(weekDays[0])} — {dateStr(weekDays[6])}
                {weekOffset === 0 && <span className="text-gold-500 ml-2">(Current)</span>}
              </span>
              <button onClick={() => setWeekOffset(w => w + 1)} className="px-3 py-1.5 bg-navy-800 border border-navy-700 rounded-lg text-sm text-gray-400 hover:text-white">Next &rarr;</button>
            </div>

            {/* Weekly summary */}
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-sm text-gray-400">{t("instructor.weekTotal", "Week Total")}</p>
              <p className="text-3xl font-bold text-white">{weekTotal.toFixed(1)}h</p>
            </div>

            {/* Day cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
              {weekDays.map(d => {
                const ds = dateStr(d);
                const entry = entryMap[ds];
                const isToday = ds === today;
                return (
                  <div key={ds} className={`bg-navy-800 border rounded-xl p-4 ${isToday ? "border-gold-500" : "border-navy-700"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs text-gray-500">{dayName(d)}</p>
                        <p className={`text-lg font-bold ${isToday ? "text-gold-500" : "text-white"}`}>{d.getDate()}</p>
                      </div>
                      {entry ? (
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(entry)} className="text-xs text-blue-400 hover:text-blue-300">Edit</button>
                          <button onClick={() => setDeleteId(entry.id)} className="text-xs text-red-400 hover:text-red-300">Del</button>
                        </div>
                      ) : (
                        <button onClick={() => openCreate(ds)} className="text-xs text-gold-500 hover:text-gold-400 border border-gold-500/30 px-2 py-1 rounded">+ Add</button>
                      )}
                    </div>
                    {entry ? (
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">In</span>
                          <span className="text-white font-medium">{formatTime(entry.clock_in)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Out</span>
                          <span className="text-white font-medium">{formatTime(entry.clock_out)}</span>
                        </div>
                        {entry.break_minutes > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Break</span>
                            <span className="text-gray-300">{entry.break_minutes}m</span>
                          </div>
                        )}
                        <div className="border-t border-navy-700 pt-1 mt-1 flex justify-between">
                          <span className="text-gray-400">Total</span>
                          <span className="text-gold-500 font-bold">{entry.total_hours !== null ? `${entry.total_hours}h` : "—"}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-600 text-center py-4">{t("instructor.noEntry", "No entry")}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Create / Edit Modal */}
        <ModalForm open={!!editEntry || !!createDate} onClose={() => { setEditEntry(null); setCreateDate(""); }}
          title={editEntry ? `Edit Entry — ${editEntry.date}` : `New Entry — ${createDate}`}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t("instructor.clockIn", "Clock In")}</label>
                <input type="time" value={form.clock_in} onChange={e => setForm({ ...form, clock_in: e.target.value })}
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t("instructor.clockOut", "Clock Out")}</label>
                <input type="time" value={form.clock_out} onChange={e => setForm({ ...form, clock_out: e.target.value })}
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("instructor.breakMinutes", "Break (minutes)")}</label>
              <input type="number" min="0" value={form.break_minutes} onChange={e => setForm({ ...form, break_minutes: e.target.value })}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("instructor.notes", "Notes")}</label>
              <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded text-white text-sm resize-y" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditEntry(null)} className="px-4 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-sm">{t("common.cancel", "Cancel")}</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm disabled:opacity-50">
                {saving ? t("common.saving", "Saving...") : editEntry ? t("common.update", "Update") : t("common.create", "Create")}
              </button>
            </div>
          </div>
        </ModalForm>
      </main>
    </div>
  );
}
