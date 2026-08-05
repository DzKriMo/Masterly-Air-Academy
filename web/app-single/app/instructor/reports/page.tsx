"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { StatsCard } from "@/components/stats-card";
import { PageHeader } from "@/components/page-header";
import { ModalForm } from "@/components/modal-form";
import { DetailField } from "@/components/detail-field";

interface ReportSummary {
  total_students: number; active_students: number;
  total_instructors: number; total_courses: number;
  flight_hours: number; ground_hours: number;
  exams_conducted: number; exams_passed: number;
  overall_pass_rate: number;
}

interface RecentActivity {
  id: string; type: string; description: string;
  user: string; timestamp: string;
}

export default function ReportsPage() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<RecentActivity | null>(null);

  const load = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true); setError(null);
    Promise.all([
      api.get("/dashboard/kpis/").catch(() => null),
      api.get("/students/").catch(() => ({ results: [] })),
      api.get("/flight-instructors/").catch(() => ({ results: [] })),
      api.get("/courses/").catch(() => ({ results: [] })),
      api.get("/exam-attempts/").catch(() => ({ results: [] })),
      api.get("/flight-lessons/").catch(() => ({ results: [] })),
      api.get("/notifications/").catch(() => ({ results: [] })),
    ]).then(([kpi, studentsData, instructorsData, coursesData, examsData, flightsData, notifData]) => {
      if (kpi) {
        setSummary(kpi as any);
      } else {
        const students = (studentsData as any).results || [];
        const instructors = (instructorsData as any).results || [];
        const courses = (coursesData as any).results || [];
        const exams = (examsData as any).results || [];
        const flights = (flightsData as any).results || [];
        const passed = exams.filter((e: any) => e.score && e.passing_score && e.score >= e.passing_score).length;
        const flightHrs = flights.reduce((s: number, f: any) => s + (f.duration_hours || f.duration || 0), 0);
        setSummary({
          total_students: students.length, active_students: students.filter((s: any) => s.status === "active").length,
          total_instructors: instructors.length, total_courses: courses.length,
          flight_hours: flightHrs, ground_hours: 0,
          exams_conducted: exams.length, exams_passed: passed,
          overall_pass_rate: exams.length > 0 ? Math.round((passed / exams.length) * 100) : 0,
        });
      }
      const notifs = (notifData as any).results || [];
      setActivities(notifs.slice(0, 50).map((n: any) => ({
        id: n.id, type: n.notification_type || n.type || "general",
        description: n.message || n.description || "No details",
        user: n.sender_name || n.actor || "System",
        timestamp: n.created_at || n.timestamp,
      })));
      setError(null);
    }).catch(err => { console.error(err); setError("Failed to load reports data."); })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => { load(); }, [load]);

  const typeBadge = (t: string) => {
    const colors: Record<string, string> = {
      flight: "bg-blue-500/10 text-blue-400", exam: "bg-purple-500/10 text-purple-400",
      enrollment: "bg-green-500/10 text-green-400", warning: "bg-red-500/10 text-red-400",
      info: "bg-gray-500/10 text-gray-400",
    };
    return <span className={`text-xs px-2 py-0.5 rounded ${colors[t] || colors.info}`}>{t}</span>;
  };

  return (
    <div className="flex-1 min-w-0">
      <PageHeader title={t("instructor.reports", "Reports")} backHref="/instructor/cgi-dashboard" maxWidth="max-w-6xl" />
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {error && <ErrorCard message={error} onRetry={load} />}
        {loading ? <LoadingSkeleton type="card" rows={4} /> : (
          <>
            {summary && (
              <>
                <section>
                  <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatsCard label="Total Students" value={String(summary.total_students)} />
                    <StatsCard label="Active Students" value={String(summary.active_students)} />
                    <StatsCard label="Instructors" value={String(summary.total_instructors)} />
                    <StatsCard label="Courses" value={String(summary.total_courses)} />
                    <StatsCard label="Flight Hours" value={`${summary.flight_hours}h`} />
                    <StatsCard label="Exams Conducted" value={String(summary.exams_conducted)} />
                    <StatsCard label="Exams Passed" value={String(summary.exams_passed)} />
                    <StatsCard label="Pass Rate" value={`${summary.overall_pass_rate}%`} />
                  </div>
                </section>
              </>
            )}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
              </div>
              {activities.length === 0 ? (
                <p className="text-gray-500 text-sm">No recent activity found.</p>
              ) : (
                <div className="space-y-2">
                  {activities.map((a) => (
                    <button key={a.id} onClick={() => setSelectedActivity(a)}
                      className="w-full flex items-center gap-4 p-3 bg-navy-800/50 rounded-lg hover:bg-navy-700/50 transition-colors text-left">
                      {typeBadge(a.type)}
                      <span className="flex-1 text-sm text-gray-300 truncate">{a.description}</span>
                      <span className="text-xs text-gray-500 shrink-0">{a.user}</span>
                      <span className="text-xs text-gray-600 shrink-0">{a.timestamp ? new Date(a.timestamp).toLocaleDateString() : ""}</span>
                    </button>
                  ))}
                </div>
              )}
              <ModalForm open={!!selectedActivity} onClose={() => setSelectedActivity(null)} title="Activity Details"
                footer={<button onClick={() => setSelectedActivity(null)} className="px-5 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-sm">Close</button>}>
                {selectedActivity && (
                  <div className="grid grid-cols-2 gap-4">
                    <DetailField label="Type" value={selectedActivity.type} />
                    <DetailField label="User" value={selectedActivity.user} />
                    <div className="col-span-2">
                      <DetailField label="Description" value={selectedActivity.description} />
                    </div>
                    <DetailField label="Date" value={selectedActivity.timestamp ? new Date(selectedActivity.timestamp).toLocaleString() : "—"} />
                  </div>
                )}
              </ModalForm>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
