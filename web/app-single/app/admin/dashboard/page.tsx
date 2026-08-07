"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { api, unwrapResults, withFullLimit } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { ExportButton } from "@/components/export-button";
import { useTranslation } from "@/lib/use-translation";

const PIE_COLORS = ["#c4943c", "#3b82f6", "#22c55e", "#ef4444", "#8b5cf6", "#f59e0b", "#14b8a6", "#ec4899"];

export default function AdminDashboard() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  useAuthGuard(isAuthenticated, authLoading);
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  // ── KPIs: parallel fetch of dashboard/kpis, users, invoices ──────
  const kpisQuery = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: () =>
      Promise.all([
        api.get<any>("/dashboard/kpis/").catch(() => ({})),
        api.get<any>(withFullLimit("/users/")).catch(() => ({ results: [] })),
        api.get<any>(withFullLimit("/invoices/")).catch(() => ({ results: [] })),
        api.get<any>(withFullLimit("/courses/")).catch(() => ({ results: [] })),
        api.get<any>(withFullLimit("/flight-lessons/")).catch(() => ({ results: [] })),
        api.get<any>(withFullLimit("/applications/")).catch(() => ({ results: [] })),
      ]),
    enabled: isAuthenticated,
  });

  // ── Contact/Application inquiries ──────────────────────────────
  const inquiriesQuery = useQuery({
    queryKey: ["admin-inquiries"],
    queryFn: () => api.get<any>("/notifications/?limit=20").catch(() => null),
    enabled: isAuthenticated,
  });

  if (authLoading || !isAuthenticated) return null;

  // ── Destructure query results ────────────────────────────────────
  const loading = kpisQuery.isLoading;
  const qError = kpisQuery.error;
  if (qError && !error) setError((qError as any)?.message || "Failed to load dashboard data");

  const [kpis = {}, usersResp = { results: [] }, invoicesResp = { results: [] }, coursesResp = { results: [] }, flightsResp = { results: [] }, applicationsResp = { results: [] }] = kpisQuery.data || [];
  const uList = unwrapResults(usersResp);
  const iList = unwrapResults(invoicesResp);

  // ── Training KPIs ──────────────────────────────────────────────────
  const todayStr = new Date().toDateString();
  const safeList = (resp: any) => {
    if (resp?.results) return resp.results;
    if (Array.isArray(resp)) return resp;
    return [];
  };
  const allCourses = safeList(coursesResp);
  const coursesToday = allCourses.filter((c: any) => c.scheduled_date && new Date(c.scheduled_date).toDateString() === todayStr).length;
  const allFlights = safeList(flightsResp);
  const flightsToday = allFlights.filter((f: any) => f.scheduled_date && new Date(f.scheduled_date).toDateString() === todayStr).length;
  const allApplications = safeList(applicationsResp);
  const applicationsPending = allApplications.filter((a: any) => a.status === "pending").length;

  // ── Compute KPIs ──────────────────────────────────────────────────
  const totalUsers = uList.length;
  const activeStudents = uList.filter((u: any) => u.role === "student" && u.status === "active").length;
  const isTrainingAdmin = user?.role === "training_admin";
  const revenue = (kpis as Record<string, number>)?.revenue ?? 0;
  const outstanding = (kpis as Record<string, number>)?.outstanding ?? 0;

  // ── Compute chart data ────────────────────────────────────────────
  const invCounts: Record<string, number> = {};
  iList.forEach((i: any) => {
    invCounts[i.status] = (invCounts[i.status] || 0) + 1;
  });

  const invoiceChart = Object.entries(invCounts).map(([name, value]) => ({ name, value }));

  // ── Format helpers ────────────────────────────────────────────────
  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat("en-DZ", { style: "currency", currency: "DZD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-navy-900">
      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110} />
            <div>
              <h1 className="text-lg font-bold text-white">
                {t("admin.dashboard", "Administration Dashboard")}
              </h1>
              <p className="text-xs text-gold-500">
                {t("layout.administrationPortal", "Administration Portal")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ExportButton
              exports={[
                { label: "Users (Excel)", url: "/export/users/", filename: "users.xlsx", type: "excel" },
                { label: "Invoices (Excel)", url: "/export/invoices/", filename: "invoices.xlsx", type: "excel" },
              ]}
            />
            <button
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
              className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
            >
              {t("common.signOut", "Sign Out")}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Main Content ────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && !loading && <ErrorCard message={error} onRetry={() => { setError(null); kpisQuery.refetch(); }} />}

        {/* ═══ KPI ROW ════════════════════════════════════════════ */}
        {loading ? (
          <LoadingSkeleton type="card" rows={4} />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KpiCard
                label={t("admin.totalUsers", "Total Users")}
                value={totalUsers}
                icon={
                  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                }
                accent="border-l-4 border-l-blue-500"
              />
              <KpiCard
                label={t("admin.activeStudents", "Active Students")}
                value={activeStudents}
                icon={
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 7l-7-4v-5l7 4 7-4v5l-7 4z" />
                  </svg>
                }
                accent="border-l-4 border-l-green-500"
              />
              {!isTrainingAdmin && (
                <KpiCard
                  label={t("admin.revenue", "Revenue This Month")}
                  value={fmtCurrency(revenue)}
                  icon={
                    <svg className="w-5 h-5 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  accent="border-l-4 border-l-gold-500"
                />
              )}
              {!isTrainingAdmin && (
                <KpiCard
                  label={t("admin.outstanding", "Outstanding")}
                  value={fmtCurrency(outstanding)}
                  icon={
                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  accent="border-l-4 border-l-red-500"
                />
              )}
            </div>

            {/* ═══ TRAINING KPIs ═══════════════════════════════════ */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                {t("admin.trainingOverview", "Training Overview")}
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label={t("admin.coursesToday", "Courses Today")}
                  value={coursesToday}
                  icon={
                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  }
                  accent="border-l-4 border-l-blue-500"
                />
                <KpiCard
                  label={t("admin.flightsToday", "Flights Today")}
                  value={flightsToday}
                  icon={
                    <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  }
                  accent="border-l-4 border-l-cyan-500"
                />
                <KpiCard
                  label={t("admin.activeStudents", "Active Students")}
                  value={activeStudents}
                  icon={
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 7l-7-4v-5l7 4 7-4v5l-7 4z" />
                    </svg>
                  }
                  accent="border-l-4 border-l-green-500"
                />
                <KpiCard
                  label={t("admin.applicationsPending", "Applications Pending")}
                  value={applicationsPending}
                  icon={
                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  }
                  accent="border-l-4 border-l-amber-500"
                />
              </div>
            </div>

            {/* ═══ CHARTS ROW ══════════════════════════════════════ */}
            {!isTrainingAdmin && (
              <div className="mb-8">
                <ChartCard title={t("admin.invoiceStatus", "Invoice Status")}>
                  {invoiceChart.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-8">{t("common.noData", "No invoice data")}</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={invoiceChart}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          innerRadius={40}
                          label={({ name, value, percent }: any) =>
                            `${name.replace(/_/g, " ")}: ${value} (${(percent * 100).toFixed(0)}%)`
                          }
                          labelLine={false}
                        >
                          {invoiceChart.map((_: any, i: number) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "#1e293b",
                            border: "1px solid #334155",
                            borderRadius: "8px",
                            color: "#fff",
                          }}
                          formatter={(value: number, name: string) => [
                            `${value} invoices`,
                            name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>
            )}

            {/* ═══ QUICK ACTIONS ═══════════════════════════════════ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {!isTrainingAdmin && (
                <QuickActionCard
                  href="/admin/users"
                  label={t("admin.users", "Users")}
                  desc={t("admin.usersDesc", "Manage system users")}
                  color="border-l-blue-500"
                />
              )}
              <QuickActionCard
                href="/admin/applications"
                label={t("admin.applications", "Applications")}
                desc={t("admin.applicationsDesc", "Review applications")}
                color="border-l-amber-500"
              />
              {!isTrainingAdmin && (
                <QuickActionCard
                  href="/admin/invoices"
                  label={t("admin.invoices", "Invoices")}
                  desc={t("admin.invoicesDesc", "Manage invoices")}
                  color="border-l-green-500"
                />
              )}
              <QuickActionCard
                href="/admin/students"
                label={t("admin.students", "Students")}
                desc={t("admin.studentsDesc", "View students")}
                color="border-l-purple-500"
              />
            </div>

            {/* ═══ RECENT INQUIRIES ══════════════════════════════════ */}
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  Recent Inquiries
                </h3>
                {inquiriesQuery.isLoading && (
                  <span className="text-xs text-gray-500 animate-pulse">{t("common.loading", "Loading...")}</span>
                )}
              </div>
              {(() => {
                const raw = inquiriesQuery.data;
                const notifs = (Array.isArray(raw) ? raw : unwrapResults(raw) as any) || [];
                const contacts = notifs
                  .filter((n: any) => n.type === "contact_form")
                  .map((n: any) => ({
                    id: `notif-${n.id}`,
                    type: "contact",
                    title: n.title,
                    email: n.data?.email || n.data?.name || "—",
                    created_at: n.created_at,
                  }));
                const apps = safeList(applicationsResp).map((a: any) => ({
                  id: `app-${a.id}`,
                  type: "application",
                  title: a.student_name || a.application_number,
                  email: a.documents?.[0]?.email || "—",
                  created_at: a.submitted_at,
                }));
                const inquiries = [...contacts, ...apps]
                  .sort(
                    (x: any, y: any) =>
                      new Date(y.created_at || 0).getTime() - new Date(x.created_at || 0).getTime()
                  )
                  .slice(0, 5);
                if (inquiriesQuery.isLoading && !inquiries.length) {
                  return <LoadingSkeleton type="table" rows={3} />;
                }
                if (!inquiries.length) {
                  return <EmptyState message="No recent inquiries" />;
                }
                return (
                  <div className="space-y-1">
                    {inquiries.map((n: any) => (
                      <div
                        key={n.id}
                        className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-navy-700/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              n.type === "application" ? "bg-amber-400" : "bg-blue-400"
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="text-sm text-white truncate">{n.title}</p>
                            <p className="text-xs text-gray-500 truncate">{n.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              n.type === "application"
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-blue-500/10 text-blue-400"
                            }`}
                          >
                            {n.type === "application" ? "Application" : "Contact"}
                          </span>
                          <span className="text-xs text-gray-500">
                            {n.created_at
                              ? new Date(n.created_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon,
  accent = "",
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div
      className={`bg-navy-800 border border-navy-700 rounded-xl p-5 ${accent} hover:bg-navy-700/50 transition-colors`}
    >
      <div className="flex items-start justify-between mb-2">
        {icon && <div className="p-2 rounded-lg bg-navy-700/50">{icon}</div>}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">
        {title}
      </h3>
      {children}
    </div>
  );
}

function QuickActionCard({
  href,
  label,
  desc,
  color,
}: {
  href: string;
  label: string;
  desc: string;
  color: string;
}) {
  return (
    <a
      href={href}
      className={`block p-5 bg-navy-800 border border-navy-700 rounded-xl hover:border-gold-500 border-l-4 ${color} transition-all group`}
    >
      <p className="text-white font-semibold group-hover:text-gold-400 transition-colors">
        {label}
      </p>
      <p className="text-xs text-gray-400 mt-1">{desc}</p>
    </a>
  );
}
