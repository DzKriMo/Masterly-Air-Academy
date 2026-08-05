"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { PageHeader } from "@/components/page-header";

interface Session {
  id: string; simulator_name: string; student_name: string; instructor_name: string;
  scheduled_date: string; duration: number | null; status: string; notes?: string;
}

const SESSION_COLORS: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-400",
  in_progress: "bg-amber-500/10 text-amber-400",
  completed: "bg-green-500/10 text-green-400",
  cancelled: "bg-gray-500/10 text-gray-400",
};

export default function StudentSimulatorPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useAuthGuard(isAuthenticated, isLoading, "/student/login");

  const load = () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    api.get<any>("/simulator-sessions/")
      .then(data => { setSessions((data as unknown as any).results || []); setError(null); })
      .catch(() => setError(t("student.simLoadError", "Failed to load simulator sessions.")))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [isAuthenticated]);

  const upcoming = sessions.filter(s => s.status === "scheduled").length;
  const completed = sessions.filter(s => s.status === "completed").length;
  const totalHours = sessions.filter(s => s.status === "completed").reduce((sum, s) => sum + (Number(s.duration) || 0), 0);

  const columns: Column<Session>[] = [
    { key: "simulator_name", header: t("student.simulator", "Simulator"), render: (s) => <span className="text-sm font-semibold text-white">{s.simulator_name}</span> },
    { key: "instructor_name", header: t("common.instructor", "Instructor"), render: (s) => <span className="text-sm text-gray-300">{s.instructor_name || "—"}</span> },
    { key: "scheduled_date", header: t("common.date", "Date"), render: (s) => <span className="text-sm text-gray-400">{s.scheduled_date ? new Date(s.scheduled_date).toLocaleString() : "—"}</span> },
    { key: "duration", header: t("duration", "Duration"), render: (s) => <span className="text-sm text-gray-400">{s.duration != null ? `${s.duration}h` : "—"}</span> },
    { key: "status", header: t("common.status", "Status"), render: (s) => <span className={`text-xs px-2 py-0.5 rounded ${SESSION_COLORS[s.status] || "bg-gray-500/10 text-gray-400"}`}>{s.status}</span> },
  ];

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader
        title={t("student.simulator", "Simulator")}
        backHref="/student/dashboard"
        backLabel={t("student.backToDashboard")}
        maxWidth="max-w-5xl"
        actions={
          <button onClick={async()=>{await logout();router.push("/student/login")}} className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">{t('common.signOut', 'Logout')}</button>
        }
      />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><p className="text-3xl font-bold text-white">{upcoming}</p><p className="text-sm text-gray-400 mt-1">{t("student.upcomingSessions", "Upcoming Sessions")}</p></div>
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><p className="text-3xl font-bold text-white">{completed}</p><p className="text-sm text-gray-400 mt-1">{t("student.completedSessions", "Completed")}</p></div>
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><p className="text-3xl font-bold text-white">{totalHours.toFixed(1)}h</p><p className="text-sm text-gray-400 mt-1">{t("student.simHours", "Simulator Hours")}</p></div>
        </div>
        {error && <ErrorCard message={error} onRetry={load} />}
        {loading ? <LoadingSkeleton type="table" rows={5} /> : sessions.length === 0 ? (
          <EmptyState message={t("student.noSimSessions", "No simulator sessions yet.")} />
        ) : (
          <DataTable columns={columns} data={sessions} keyField="id" />
        )}
      </main>
    </div>
  );
}
