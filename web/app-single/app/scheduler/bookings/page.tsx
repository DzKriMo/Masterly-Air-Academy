"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/use-translation";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorCard } from "@/components/error-card";

export default function BookingsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ resource_type: "", resource_id: "", start_time: "", end_time: "", notes: "" });

  const [aircraft, setAircraft] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [simulators, setSimulators] = useState<any[]>([]);

  const STATUS_COLORS: Record<string, string> = {
    confirmed: "text-green-400 bg-green-500/10",
    pending: "text-yellow-400 bg-yellow-500/10",
    cancelled: "text-red-400 bg-red-500/10",
  };

  useAuthGuard(isAuthenticated, authLoading);

  const fetchBookings = () => {
    if (!isAuthenticated) return;
    setLoading(true);
    Promise.all([
      api.get<any>("/resource-bookings/"),
      api.get<any>("/aircraft/").catch(() => ({ results: [] })),
      api.get<any>("/rooms/").catch(() => ({ results: [] })),
      api.get<any>("/simulators/").catch(() => ({ results: [] })),
    ]).then(([bookRes, acRes, roomRes, simRes]) => {
      setBookings((bookRes as any)?.results || []);
      setAircraft(((acRes as any)?.results || []).filter((a: any) => a.status !== "retired"));
      setRooms((roomRes as any)?.results || []);
      setSimulators((simRes as any)?.results || []);
      setError(null);
    }).catch(() => setError(t("common.error", "Failed to load bookings"))).finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/resource-bookings/", { ...form, status: "confirmed" });
      setShowForm(false);
      setForm({ resource_type: "", resource_id: "", start_time: "", end_time: "", notes: "" });
      fetchBookings();
    } catch {
      setError(t("common.error", "Failed to create booking"));
    }
  };

  const cancelBooking = async (id: string) => {
    try {
      await api.patch(`/resource-bookings/${id}/`, { status: "cancelled" });
      fetchBookings();
    } catch {
      setError(t("common.error", "Failed to cancel booking"));
    }
  };

  const resourceOptions = (() => {
    if (form.resource_type === "aircraft") return aircraft.map((a: any) => ({ value: a.id, label: `${a.registration} (${a.manufacturer} ${a.model})` }));
    if (form.resource_type === "classroom") return rooms.map((r: any) => ({ value: r.id, label: r.name }));
    if (form.resource_type === "simulator") return simulators.map((s: any) => ({ value: s.id, label: s.name }));
    return [];
  })();

  return (
    <div className="min-h-screen bg-navy-900">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-bold text-white">{t("scheduler.bookings")}</h1>
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-gold-500/20 border border-gold-500/30 text-gold-500 rounded-lg text-sm hover:bg-gold-500 hover:text-navy-900">
            {t("scheduler.newBooking")}
          </button>
        </div>

        {error && <ErrorCard message={error} onRetry={fetchBookings} />}

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t("scheduler.resourceType")}</label>
                <select value={form.resource_type} onChange={e => setForm({ ...form, resource_type: "", resource_id: "" })} required
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
                  <option value="">Select...</option>
                  <option value="aircraft">Aircraft</option>
                  <option value="classroom">Classroom</option>
                  <option value="simulator">Simulator</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t("scheduler.activityType")}</label>
                <select value={form.resource_id} onChange={e => setForm({ ...form, resource_id: e.target.value })} required
                  disabled={!form.resource_type}
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm disabled:opacity-50">
                  <option value="">{form.resource_type ? `Select ${form.resource_type}...` : "Select resource type first"}</option>
                  {resourceOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Start</label>
                <input type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} required
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">End</label>
                <input type="datetime-local" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} required
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
              </div>
            </div>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={2} placeholder="Notes" className="w-full mt-4 px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
            <div className="flex gap-2 mt-4">
              <button type="submit" className="px-6 py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm">
                {t("common.create")}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-6 py-2.5 bg-navy-700 text-gray-300 rounded-lg text-sm hover:text-white">
                {t("common.cancel")}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <LoadingSkeleton type="table" rows={6} />
        ) : bookings.length === 0 ? (
          <EmptyState message={t("common.noData", "No bookings found")} />
        ) : (
          <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">{t("scheduler.resourceType")}</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Resource ID</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Start</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">End</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">{t("common.status")}</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Notes</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase"></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b: any) => (
                  <tr key={b.id} className="border-b border-navy-700/50 hover:bg-navy-700/20 transition-colors">
                    <td className="px-4 py-3 text-white">{b.resource_type}</td>
                    <td className="px-4 py-3 text-gray-400">{b.resource_id?.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-gray-400">{b.start_time?.slice(0, 16).replace("T", " ")}</td>
                    <td className="px-4 py-3 text-gray-400">{b.end_time?.slice(0, 16).replace("T", " ")}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[b.status] || "text-gray-400"}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 truncate max-w-[120px]">{b.notes || "-"}</td>
                    <td className="px-4 py-3">
                      {b.status !== "cancelled" && (
                        <button onClick={() => cancelBooking(b.id)}
                          className="text-xs text-red-400 hover:text-red-300">
                          {t("common.delete", "Cancel")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
