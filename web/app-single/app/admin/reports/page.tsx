"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { ExportButton } from "@/components/export-button";
import { useTranslation } from "@/lib/use-translation";

const PIE_COLORS = ["#c4943c", "#3b82f6", "#22c55e", "#ef4444", "#8b5cf6", "#f59e0b", "#14b8a6", "#ec4899"];

type TabId = "students" | "financial" | "exams";

export default function AdminReportsPage() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>("students");
  const [error, setError] = useState<string | null>(null);

  // ── Data queries ──────────────────────────────────────────
  const studentsReport = useQuery({
    queryKey: ["report-students"],
    queryFn: () => api.get<any>("/reports/students/").catch(() => null),
    enabled: isAuthenticated,
  });

  const financialReport = useQuery({
    queryKey: ["report-financial"],
    queryFn: () => api.get<any>("/reports/financial/").catch(() => null),
    enabled: isAuthenticated,
  });

  const examReport = useQuery({
    queryKey: ["report-exams"],
    queryFn: () => api.get<any>("/reports/exams/").catch(() => null),
    enabled: isAuthenticated,
  });

  // ── Auth guard ────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || !isAuthenticated) return null;

  const sData = studentsReport.data;
  const fData = financialReport.data;
  const eData = examReport.data;
  const loading = studentsReport.isLoading || financialReport.isLoading || examReport.isLoading;

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat("en-DZ", { style: "currency", currency: "DZD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-navy-900">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110} />
            <div>
              <h1 className="text-lg font-bold text-white">
                {t("admin.reports", "Reports")}
              </h1>
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="text-xs text-gray-500 hover:text-gold-500"
              >
                {t("common.back", "Back to Dashboard")}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ExportButton
              exports={
                activeTab === "students"
                  ? [{ label: "Student Report (Excel)", url: "/export/students/", filename: "student_report.xlsx", type: "excel" }]
                  : activeTab === "financial"
                  ? [{ label: "Financial Report (Excel)", url: "/export/invoices/", filename: "financial_report.xlsx", type: "excel" }]
                  : [{ label: "Exam Report (Excel)", url: "/export/exams/", filename: "exam_report.xlsx", type: "excel" }]
              }
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

      {/* ── Main Content ────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && !loading && <ErrorCard message={error} onRetry={() => { setError(null); studentsReport.refetch(); financialReport.refetch(); examReport.refetch(); }} />}

        {/* ═══ Tabs ════════════════════════════════════════════ */}
        <div className="flex gap-1 bg-navy-800 border border-navy-700 rounded-xl p-1 mb-8 w-fit">
          <TabButton active={activeTab === "students"} onClick={() => setActiveTab("students")}>
            {t("admin.studentReports", "Student Reports")}
          </TabButton>
          <TabButton active={activeTab === "financial"} onClick={() => setActiveTab("financial")}>
            {t("admin.financialReports", "Financial Reports")}
          </TabButton>
          <TabButton active={activeTab === "exams"} onClick={() => setActiveTab("exams")}>
            {t("admin.examReports", "Exam Reports")}
          </TabButton>
        </div>

        {loading ? (
          <LoadingSkeleton type="card" rows={4} />
        ) : activeTab === "students" ? (
          /* ═══ STUDENT REPORTS ═══════════════════════════════ */
          sData ? (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label={t("reports.totalStudents", "Total Students")}
                  value={sData.total ?? 0}
                  icon={
                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  }
                  accent="border-l-4 border-l-blue-500"
                />
                <KpiCard
                  label={t("reports.newThisMonth", "New This Month")}
                  value={sData.new_this_month ?? 0}
                  icon={
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  }
                  accent="border-l-4 border-l-green-500"
                />
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Program distribution pie chart */}
                <ChartCard title={t("reports.byProgram", "Students by Program")}>
                  {(!sData.by_program || sData.by_program.length === 0) ? (
                    <p className="text-gray-500 text-sm text-center py-8">{t("common.noData", "No data")}</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={sData.by_program}
                          dataKey="count"
                          nameKey="program"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          innerRadius={40}
                          label={({ program, count, percent }: any) =>
                            `${program}: ${count} (${(percent * 100).toFixed(0)}%)`
                          }
                          labelLine={false}
                        >
                          {sData.by_program.map((_: any, i: number) => (
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
                          formatter={(value: number, name: string) => [`${value} students`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                {/* Status bar chart */}
                <ChartCard title={t("reports.byStatus", "Students by Status")}>
                  {(!sData.by_status || sData.by_status.length === 0) ? (
                    <p className="text-gray-500 text-sm text-center py-8">{t("common.noData", "No data")}</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={sData.by_status}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="status" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            background: "#1e293b",
                            border: "1px solid #334155",
                            borderRadius: "8px",
                            color: "#fff",
                          }}
                        />
                        <Bar dataKey="count" fill="#c4943c" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </div>
            </div>
          ) : (
            <EmptyState message={t("common.noData", "No student report data available")} />
          )
        ) : activeTab === "financial" ? (
          /* ═══ FINANCIAL REPORTS ════════════════════════════ */
          fData ? (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label={t("reports.totalInvoiced", "Total Invoiced")}
                  value={fmtCurrency(fData.total_invoiced ?? 0)}
                  icon={
                    <svg className="w-5 h-5 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  accent="border-l-4 border-l-gold-500"
                />
                <KpiCard
                  label={t("reports.totalPaid", "Total Paid")}
                  value={fmtCurrency(fData.total_paid ?? 0)}
                  icon={
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  accent="border-l-4 border-l-green-500"
                />
                <KpiCard
                  label={t("reports.outstanding", "Outstanding")}
                  value={fmtCurrency(fData.overdue ?? 0)}
                  icon={
                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M20.618 20H3.382a1 1 0 01-.894-1.447L10.8 4.106a1 1 0 011.788 0l8.312 14.447A1 1 0 0120.618 20z" />
                    </svg>
                  }
                  accent="border-l-4 border-l-red-500"
                />
              </div>

              {/* Status pie chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title={t("reports.byInvoiceStatus", "Invoices by Status")}>
                  {(!fData.by_status || fData.by_status.length === 0) ? (
                    <p className="text-gray-500 text-sm text-center py-8">{t("common.noData", "No data")}</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={fData.by_status}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          innerRadius={45}
                          label={({ status, count, percent }: any) =>
                            `${status.replace(/_/g, " ")}: ${count} (${(percent * 100).toFixed(0)}%)`
                          }
                          labelLine={false}
                        >
                          {fData.by_status.map((_: any, i: number) => (
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
            </div>
          ) : (
            <EmptyState message={t("common.noData", "No financial report data available")} />
          )
        ) : (
          /* ═══ EXAM REPORTS ══════════════════════════════════ */
          eData ? (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label={t("reports.totalExams", "Total Exams")}
                  value={eData.total_exams ?? 0}
                  icon={
                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  }
                  accent="border-l-4 border-l-blue-500"
                />
                <KpiCard
                  label={t("reports.totalAttempts", "Total Attempts")}
                  value={eData.total_attempts ?? 0}
                  icon={
                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                  accent="border-l-4 border-l-indigo-500"
                />
                <KpiCard
                  label={t("reports.passRate", "Pass Rate %")}
                  value={eData.pass_rate != null ? `${Math.round(eData.pass_rate)}%` : "-"}
                  icon={
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  accent="border-l-4 border-l-green-500"
                />
                <KpiCard
                  label={t("reports.averageScore", "Average Score")}
                  value={eData.average_score != null ? `${Math.round(eData.average_score)}%` : "-"}
                  icon={
                    <svg className="w-5 h-5 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  }
                  accent="border-l-4 border-l-gold-500"
                />
              </div>
            </div>
          ) : (
            <EmptyState message={t("common.noData", "No exam report data available")} />
          )
        )}
      </main>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function TabButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? "bg-gold-500 text-navy-900"
          : "text-gray-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

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
