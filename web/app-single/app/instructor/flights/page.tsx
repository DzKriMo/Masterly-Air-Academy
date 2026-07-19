"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar, FilterOption } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ExportButton } from "@/components/export-button";

interface Flight {
  id: string; student_name: string; instructor_name: string;
  aircraft_reg: string; scheduled_date: string; start_time: string; end_time: string;
  status: string; flight_duration: number | null; grade: number | null;
  has_preparation: boolean;
}

interface Aircraft { id: string; registration: string; model: string; }

const statusClass = (s: string) =>
  s === "scheduled" ? "bg-blue-500/10 text-blue-400" :
  s === "completed" ? "bg-green-500/10 text-green-400" :
  "bg-gray-500/10 text-gray-400";

export default function FlightsPage() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const { showToast } = useToast();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ student: "", aircraft: "", scheduled_date: "", start_time: "", end_time: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  // Cancel state
  const [cancelFlightId, setCancelFlightId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  // Reschedule state
  const [rescheduleFlight, setRescheduleFlight] = useState<Flight | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState({ scheduled_date: "", start_time: "", end_time: "", aircraft: "" });
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.push("/login"); return; }
  }, [authLoading, isAuthenticated, router]);

  const fetchFlights = () => {
    if (!isAuthenticated) return;
    setLoading(true);
    api.get<any>("/flight-lessons/")
      .then(data => { setFlights((data as unknown as any).results || []); setError(null); })
      .catch(err => { console.error("Failed to load flights:", err); setError(t('instructor.loadErrorMsg')); })
      .finally(() => setLoading(false));
    api.get<any>("/aircraft/")
      .then(data => { setAircraft((data as unknown as any).results || []); })
      .catch(err => { console.error("Failed to load aircraft:", err); });
  };

  useEffect(() => {
    fetchFlights();
  }, [isAuthenticated]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      const resp = await api.post<any>("/flight-lessons/", form);
      const data = resp as unknown as any;
      setShowForm(false);
      setFlights([data, ...flights]);
      setForm({ student: "", aircraft: "", scheduled_date: "", start_time: "", end_time: "" });
      showToast("success", t('instructor.createdSuccess'));
    } catch (err: any) {
      showToast("error", err.message || t('instructor.createFailed'));
    } finally { setSaving(false); }
  };

  const handleCancel = async () => {
    if (!cancelFlightId) return;
    setCancelling(true);
    try {
      await api.patch(`/flight-lessons/${cancelFlightId}/`, { status: 'cancelled' });
      setCancelFlightId(null);
      showToast("success", t('instructor.cancelledSuccess', "Cancelled successfully"));
      fetchFlights();
    } catch (err: any) {
      showToast("error", err.message || t('instructor.createFailed'));
    } finally { setCancelling(false); }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleFlight) return;
    setRescheduling(true);
    try {
      const body: any = {
        scheduled_date: rescheduleForm.scheduled_date,
        start_time: rescheduleForm.start_time,
        end_time: rescheduleForm.end_time,
      };
      if (rescheduleForm.aircraft) {
        body.aircraft = rescheduleForm.aircraft;
      }
      await api.patch(`/flight-lessons/${rescheduleFlight.id}/`, body);
      setRescheduleFlight(null);
      setRescheduleForm({ scheduled_date: "", start_time: "", end_time: "", aircraft: "" });
      showToast("success", t('instructor.rescheduledSuccess', "Rescheduled successfully"));
      fetchFlights();
    } catch (err: any) {
      showToast("error", err.message || t('instructor.createFailed'));
    } finally { setRescheduling(false); }
  };

  const filtered = useMemo(() => {
    let result = flights;
    if (filterValues.status) result = result.filter(f => f.status === filterValues.status);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      result = result.filter(f => f.student_name?.toLowerCase().includes(q) || f.aircraft_reg?.toLowerCase().includes(q));
    }
    return result;
  }, [flights, filterValues, searchValue]);

  const filters: FilterOption[] = [
    { key: "status", label: t('instructor.allStatuses'), options: [
      { value: "scheduled", label: t('instructor.statusScheduled') },
      { value: "completed", label: t('instructor.statusCompleted') },
      { value: "cancelled", label: t('instructor.statusCancelled') },
    ]},
  ];

  const columns: Column<Flight>[] = useMemo(() => [
    { key: "student_name", header: t('common.name') },
    { key: "aircraft_reg", header: t('instructor.aircraftLabel') },
    { key: "scheduled_date", header: t('common.date') },
    { key: "start_time", header: t('instructor.startLabel'), render: (f) => (
      <span className="text-sm text-gray-400">{f.start_time?.slice(0,16)}</span>
    )},
    { key: "status", header: t('common.status'), render: (f) => (
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusClass(f.status)}`}>{f.status}</span>
        {!f.has_preparation && f.status === "scheduled" && (
          <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded">{t('instructor.noPrep')}</span>
        )}
      </div>
    )},
    { key: "flight_duration", header: t("duration"), render: (f) => (
      <span className="text-sm text-gray-400">{f.flight_duration ? `${f.flight_duration}h` : "N/A"}</span>
    )},
    { key: "grade", header: t('common.grade'), render: (f) => (
      <span className="text-sm text-gray-400">{f.grade ?? "-"}</span>
    )},
    { key: "actions", header: "", sortable: false, render: (f) => {
      if (f.status !== "scheduled") return null;
      return (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => router.push(`/instructor/flights/${f.id}/prep`)} className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded text-xs hover:bg-blue-500/20">{t('instructor.prep')}</button>
          <button onClick={() => router.push(`/instructor/flights/${f.id}/evaluate`)} className="px-3 py-1.5 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded text-xs hover:bg-gold-500 hover:text-navy-900">{t('instructor.evaluate')}</button>
          <button
            onClick={() => {
              setRescheduleFlight(f);
              setRescheduleForm({
                scheduled_date: f.scheduled_date || "",
                start_time: f.start_time?.slice(0,16) || "",
                end_time: f.end_time?.slice(0,16) || "",
                aircraft: "",
              });
            }}
            className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded text-xs hover:bg-blue-500/20"
          >
            {t('instructor.reschedule', 'Reschedule')}
          </button>
          <button
            onClick={() => setCancelFlightId(f.id)}
            className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-xs hover:bg-red-500/20"
          >
            {t('instructor.cancel', 'Cancel')}
          </button>
        </div>
      );
    }},
  ], [router]);

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110} />
            <div>
              <h1 className="text-lg font-bold text-white">{t('instructor.flightSchedule')}</h1>
              <button onClick={() => router.push("/instructor/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">{t('instructor.backToDashboard')}</button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ExportButton exports={[{label:t('instructor.exportExcel','Excel'),url:'/export/flights/',filename:'flights.xlsx',type:'excel'}]} />
            <button onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm">
              {t('instructor.newFlight')}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && <ErrorCard message={error} onRetry={fetchFlights} />}

        <FilterBar
          filters={filters}
          values={filterValues}
          onChange={(key, value) => setFilterValues(prev => ({ ...prev, [key]: value }))}
          onClear={() => { setFilterValues({}); setSearchValue(""); }}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder={t('instructor.searchFlights')}
        />

        <ModalForm
          open={showForm}
          onClose={() => setShowForm(false)}
          title={t('instructor.scheduleFlightModal')}
          wide
          footer={
            <button
              type="submit"
              form="flight-form"
              disabled={saving}
              className="px-6 py-2.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-semibold rounded-lg text-sm"
            >
              {saving ? t('instructor.scheduling') : t('instructor.scheduleFlight')}
            </button>
          }
        >
          <form id="flight-form" onSubmit={handleCreate}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('instructor.studentIdLabel')}</label>
                <input value={form.student} onChange={e => setForm({...form, student: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" placeholder={t('instructor.studentIdLabel')} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('instructor.aircraftLabel')}</label>
                <select value={form.aircraft} onChange={e => setForm({...form, aircraft: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
                  <option value="">{t('instructor.selectOption')}</option>
                  {aircraft.map(a => <option key={a.id} value={a.id}>{a.registration} ({a.model})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('instructor.dateLabel')}</label>
                <input type="date" value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('instructor.startLabel')}</label>
                  <input type="datetime-local" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('instructor.endLabel')}</label>
                  <input type="datetime-local" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
                </div>
              </div>
            </div>
          </form>
        </ModalForm>

        {/* Reschedule Flight Modal */}
        <ModalForm
          open={!!rescheduleFlight}
          onClose={() => { setRescheduleFlight(null); setRescheduleForm({ scheduled_date: "", start_time: "", end_time: "", aircraft: "" }); }}
          title={t('instructor.rescheduleFlight', 'Reschedule Flight')}
          footer={
            <button
              type="submit"
              form="reschedule-form"
              disabled={rescheduling}
              className="px-6 py-2.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-semibold rounded-lg text-sm"
            >
              {rescheduling ? t('common.loading', 'Saving...') : t('instructor.reschedule', 'Reschedule')}
            </button>
          }
        >
          <form id="reschedule-form" onSubmit={handleReschedule}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('instructor.aircraftLabel')}</label>
                <select
                  value={rescheduleForm.aircraft}
                  onChange={e => setRescheduleForm(p => ({ ...p, aircraft: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"
                >
                  <option value="">{t('instructor.selectOption', 'Keep current aircraft')}</option>
                  {aircraft.map(a => <option key={a.id} value={a.id}>{a.registration} ({a.model})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{t('instructor.dateLabel')}</label>
                <input
                  type="date"
                  value={rescheduleForm.scheduled_date}
                  onChange={e => setRescheduleForm(p => ({ ...p, scheduled_date: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('instructor.startLabel')}</label>
                  <input
                    type="datetime-local"
                    value={rescheduleForm.start_time}
                    onChange={e => setRescheduleForm(p => ({ ...p, start_time: e.target.value }))}
                    required
                    className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('instructor.endLabel')}</label>
                  <input
                    type="datetime-local"
                    value={rescheduleForm.end_time}
                    onChange={e => setRescheduleForm(p => ({ ...p, end_time: e.target.value }))}
                    required
                    className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"
                  />
                </div>
              </div>
            </div>
          </form>
        </ModalForm>

        {/* Cancel Flight Confirm Dialog */}
        <ConfirmDialog
          open={!!cancelFlightId}
          onClose={() => setCancelFlightId(null)}
          onConfirm={handleCancel}
          title={t('instructor.cancelFlight', 'Cancel Flight')}
          message={t('instructor.cancelFlightConfirm', 'Are you sure you want to cancel this flight?')}
          confirmLabel={t('instructor.cancel', 'Cancel Flight')}
          destructive
          loading={cancelling}
        />

        {loading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? (
          <EmptyState
            message={t('instructor.noFlightsFound')}
            title={flights.length === 0 ? t('instructor.noFlightsYet') : t('instructor.noMatchingFlights')}
            action={flights.length === 0 ? { label: t('instructor.scheduleFlight'), onClick: () => setShowForm(true) } : undefined}
          />
        ) : (
          <DataTable columns={columns} data={filtered} keyField="id" />
        )}
      </main>
    </div>
  );
}
