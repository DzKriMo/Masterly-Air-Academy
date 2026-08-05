"use client";
import { useState, useEffect, useMemo } from "react";
import { CalendarClock, Monitor } from "lucide-react";
import { HubLayout, HubTab } from "@/components/hub-layout";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";

interface Session {
  id: string; simulator_name: string; student_name: string; instructor_name: string;
  scheduled_date: string; duration: number | null; status: string;
}
interface Simulator {
  id: string; name: string; manufacturer: string | null; model_name: string | null;
  qualification_type: string | null; location: string | null; status: string;
}

const SESSION_COLORS: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-400",
  in_progress: "bg-amber-500/10 text-amber-400",
  completed: "bg-green-500/10 text-green-400",
  cancelled: "bg-gray-500/10 text-gray-400",
};
const SIM_COLORS: Record<string, string> = {
  available: "bg-green-500/10 text-green-400",
  in_use: "bg-amber-500/10 text-amber-400",
  maintenance: "bg-red-500/10 text-red-400",
  offline: "bg-gray-500/10 text-gray-400",
};

export default function InstructorSimulatorPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();

  useAuthGuard(isAuthenticated, authLoading);

  const dashboardHref = user?.role === 'chief_flight_instructor' ? "/instructor/cfi-dashboard" : "/instructor/dashboard";

  return (
    <HubLayout
      title={t("instructor.simulator", "Simulator")}
      tabs={[
        { id: "sessions", label: t("instructor.simSessions", "Sessions"), icon: CalendarClock },
        { id: "simulators", label: t("instructor.simulators", "Simulators"), icon: Monitor },
      ]}
      defaultTab="sessions"
      backHref={dashboardHref}
      backLabel={t("instructor.backToDashboard")}
    >
      {(active) => (active === "simulators" ? <SimulatorsTab /> : <SessionsTab />)}
    </HubLayout>
  );
}

function SessionsTab() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!isAuthenticated) return;
    setLoading(true);
    api.get<any>("/simulator-sessions/")
      .then(data => { setSessions((data as unknown as any).results || []); setError(null); })
      .catch(() => setError(t("common.failedToLoad", "Failed to load")))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [isAuthenticated]);

  const upcoming = sessions.filter(s => s.status === "scheduled").length;
  const completed = sessions.filter(s => s.status === "completed").length;
  const totalHours = sessions.filter(s => s.status === "completed").reduce((sum, s) => sum + (Number(s.duration) || 0), 0);

  const columns: Column<Session>[] = [
    { key: "simulator_name", header: t("instructor.simulator", "Simulator"), render: (s) => <span className="text-sm font-semibold text-white">{s.simulator_name}</span> },
    { key: "student_name", header: t("common.student", "Student"), render: (s) => <span className="text-sm text-gray-300">{s.student_name}</span> },
    { key: "scheduled_date", header: t("common.date", "Date"), render: (s) => <span className="text-sm text-gray-400">{s.scheduled_date ? new Date(s.scheduled_date).toLocaleString() : "—"}</span> },
    { key: "duration", header: t("duration", "Duration"), render: (s) => <span className="text-sm text-gray-400">{s.duration != null ? `${s.duration}h` : "—"}</span> },
    { key: "status", header: t("common.status", "Status"), render: (s) => <span className={`text-xs px-2 py-0.5 rounded ${SESSION_COLORS[s.status] || "bg-gray-500/10 text-gray-400"}`}>{s.status}</span> },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><p className="text-3xl font-bold text-white">{upcoming}</p><p className="text-sm text-gray-400 mt-1">{t("instructor.upcomingSessions", "Upcoming Sessions")}</p></div>
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><p className="text-3xl font-bold text-white">{completed}</p><p className="text-sm text-gray-400 mt-1">{t("instructor.completedSessions", "Completed")}</p></div>
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><p className="text-3xl font-bold text-white">{totalHours.toFixed(1)}h</p><p className="text-sm text-gray-400 mt-1">{t("instructor.simHours", "Simulator Hours")}</p></div>
      </div>
      {error && <ErrorCard message={error} onRetry={load} />}
      {loading ? <LoadingSkeleton type="table" rows={8} /> : sessions.length === 0 ? (
        <EmptyState message={t("instructor.noSimSessions", "No simulator sessions yet.")} />
      ) : (
        <DataTable columns={columns} data={sessions} keyField="id" />
      )}
    </div>
  );
}

function SimulatorsTab() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [sims, setSims] = useState<Simulator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!isAuthenticated) return;
    setLoading(true);
    api.get<any>("/simulators/")
      .then(data => { setSims((data as unknown as any).results || []); setError(null); })
      .catch(() => setError(t("common.failedToLoad", "Failed to load")))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [isAuthenticated]);

  const available = sims.filter(s => s.status === "available").length;

  const columns: Column<Simulator>[] = [
    { key: "name", header: t("instructor.simulator", "Simulator"), render: (s) => <span className="text-sm font-semibold text-white">{s.name}</span> },
    { key: "manufacturer", header: "Manufacturer", render: (s) => <span className="text-sm text-gray-300">{s.manufacturer || "—"}</span> },
    { key: "model_name", header: "Model", render: (s) => <span className="text-sm text-gray-300">{s.model_name || "—"}</span> },
    { key: "qualification_type", header: "Qualification", render: (s) => <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono">{s.qualification_type || "—"}</span> },
    { key: "location", header: "Location", render: (s) => <span className="text-sm text-gray-300">{s.location || "—"}</span> },
    { key: "status", header: t("common.status", "Status"), render: (s) => <span className={`text-xs px-2 py-0.5 rounded ${SIM_COLORS[s.status] || "bg-gray-500/10 text-gray-400"}`}>{s.status}</span> },
  ];

  return (
    <div>
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-5 mb-8">
        <p className="text-3xl font-bold text-white">{available}<span className="text-base text-gray-500 font-normal"> / {sims.length}</span></p>
        <p className="text-sm text-gray-400 mt-1">{t("instructor.availableSims", "Simulators Available")}</p>
      </div>
      {error && <ErrorCard message={error} onRetry={load} />}
      {loading ? <LoadingSkeleton type="table" rows={8} /> : sims.length === 0 ? (
        <EmptyState message={t("instructor.noSimulators", "No simulators configured yet.")} />
      ) : (
        <DataTable columns={columns} data={sims} keyField="id" />
      )}
    </div>
  );
}
