"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ExportButton } from "@/components/export-button";
import { StatsCard } from "@/components/stats-card";
import { useTranslation } from "@/lib/use-translation";
import { downloadBlob } from "@/lib/download";

const NCR_COLORS = ["#ef4444", "#f59e0b", "#3b82f6"];
const STATUS_COLORS: Record<string, string> = {
  reported: "#f59e0b",
  investigating: "#3b82f6",
  analyzed: "#8b5cf6",
  resolved: "#10b981",
  closed: "#6b7280",
};
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function QualityDashboard() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const TABS = ["overview", "audits", "ncrs", "capas", "risks", "safety", "documents"] as const;
  const tabLabels: Record<string, string> = {
    overview: t('quality.overview', 'Overview'),
    audits: t('quality.audits', 'Audits'),
    ncrs: t('quality.nonConformities', 'NCRs'),
    capas: t('quality.capas', 'CAPAs'),
    risks: t('quality.riskAssessments', 'Risk Assessments'),
    safety: t('quality.safetyEvents', 'Safety Events'),
    documents: t('quality.documents', 'Documents'),
  };
  const [tab, setTab] = useState<string>("overview");
  const [expanded, setExpanded] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [reportForm, setReportForm] = useState({ title: "", type: "incident", description: "", confidential: false });
  const [msg, setMsg] = useState("");

  // Date range filter
  const today = new Date().toISOString().slice(0, 10);
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(sixMonthsAgo);
  const [dateTo, setDateTo] = useState(today);
  const [appliedFrom, setAppliedFrom] = useState(sixMonthsAgo);
  const [appliedTo, setAppliedTo] = useState(today);

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['quality-dashboard', appliedFrom, appliedTo],
    queryFn: () => api.get(`/quality/dashboard/?from=${appliedFrom}&to=${appliedTo}`).catch(() => ({
      upcoming_deadlines: [], safety_by_month: [], safety_by_type: [], safety_by_status: [],
      audits_by_type: [], overdue_audits: 0, ncr_severity_dist: [],
      capa_effectiveness_rate: 0, avg_closure_days: 0, closed_capa_count: 0, total_capa_count: 0,
      audit_completion_rate: 0, open_ncr_count: 0, overdue_capa_count: 0, safety_events_this_month: 0,
      risk_distribution: { low: 0, medium: 0, high: 0, critical: 0 },
    })),
    enabled: isAuthenticated,
  });

  const { data, isLoading: loading } = useQuery({
    queryKey: ['quality-all'],
    queryFn: () => Promise.all([
      "/audits/", "/non-conformities/", "/capas/",
      "/safety-events/", "/risk-assessments/", "/quality-documents/",
    ].map(u => api.get(u).catch(() => ({ results: [] })))),
    enabled: isAuthenticated,
  });
  const [audits = [], ncrs = [], capas = [], events = [], risks = [], documents = []] =
    data ? data.map((d: any) => d.results || []) : [[], [], [], [], [], []];

  const upcoming_deadlines = dashboardData?.upcoming_deadlines || [];
  const safety_by_month = dashboardData?.safety_by_month || [];
  const safety_by_type = dashboardData?.safety_by_type || [];
  const safety_by_status = dashboardData?.safety_by_status || [];
  const audits_by_type = dashboardData?.audits_by_type || [];
  const ncr_severity_dist = dashboardData?.ncr_severity_dist || [];

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await api.post("/safety-events/", reportForm);
      if (r.success) {
        setMsg(t('quality.reported', 'Reported.'));
        setShowReport(false);
        setReportForm({ title: "", type: "incident", description: "", confidential: false });
      } else {
        setMsg(r.message || t('common.error', 'Failed'));
      }
    } catch {
      setMsg(t('common.error', 'Connection error'));
    }
  };

  const applyFilter = () => {
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
  };

  const resetFilter = () => {
    setDateFrom(sixMonthsAgo);
    setDateTo(today);
    setAppliedFrom(sixMonthsAgo);
    setAppliedTo(today);
  };

  const daysColor = (days: number) => {
    if (days < 7) return "text-red-400";
    if (days < 30) return "text-yellow-400";
    return "text-green-400";
  };

  const chartLabel = (v: any) => `${MONTH_NAMES[v.month - 1]} ${v.year}`;

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">{t('quality.dashboard', 'Quality Dashboard')}</h1>
          <div className="flex items-center gap-3">
            <ExportButton exports={[
              { label: t('quality.auditsExcel', 'Audits (Excel)'), url: "/export/audits/", filename: "audits.xlsx", type: "excel" },
              { label: t('quality.ncrsExcel', 'NCRs (Excel)'), url: "/export/non-conformities/", filename: "ncrs.xlsx", type: "excel" },
              { label: t('quality.capasExcel', 'CAPAs (Excel)'), url: "/export/capas/", filename: "capas.xlsx", type: "excel" },
            ]} />
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* ── Date Range Filter ── */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <label className="text-xs text-gray-400 uppercase tracking-wider">{t('quality.filterFrom', 'From')}:</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-1.5 bg-navy-800 border border-navy-600 rounded-lg text-white text-sm" />
          <label className="text-xs text-gray-400 uppercase tracking-wider">{t('quality.filterTo', 'To')}:</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-1.5 bg-navy-800 border border-navy-600 rounded-lg text-white text-sm" />
          <button onClick={applyFilter}
            className="px-4 py-1.5 bg-gold-500/20 border border-gold-500/30 text-gold-500 rounded-lg text-sm hover:bg-gold-500 hover:text-navy-900">
            {t('quality.filterApply', 'Apply')}
          </button>
          <button onClick={resetFilter}
            className="px-4 py-1.5 bg-navy-800 border border-navy-600 text-gray-400 rounded-lg text-sm hover:text-white">
            {t('quality.filterReset', 'Reset')}
          </button>
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {TABS.map(id => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab === id ? "bg-gold-500/20 text-gold-500 border border-gold-500/30" : "text-gray-400 hover:text-white hover:bg-navy-700 border border-transparent"}`}>
              {tabLabels[id]}
            </button>
          ))}
          <button onClick={() => setShowReport(!showReport)}
            className="ml-auto px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500 hover:text-white whitespace-nowrap">
            {t('quality.reportEvent', '+ Report Event')}
          </button>
        </div>

        {msg && (
          <div className="mb-4 p-3 rounded-lg text-sm bg-navy-800 border border-navy-700 text-gray-300">{msg}</div>
        )}

        {showReport && (
          <form onSubmit={handleReport} className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">{t('quality.reportSafetyEvent', 'Report Safety Event')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <input value={reportForm.title} onChange={e => setReportForm({ ...reportForm, title: e.target.value })}
                  required placeholder={t('common.title', 'Title')}
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
              </div>
              <div>
                <select value={reportForm.type} onChange={e => setReportForm({ ...reportForm, type: e.target.value })}
                  className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
                  <option value="incident">{t('quality.incident', 'Incident')}</option>
                  <option value="near_miss">{t('quality.nearMiss', 'Near Miss')}</option>
                  <option value="hazard">{t('quality.hazard', 'Hazard')}</option>
                  <option value="observation">{t('quality.observation', 'Observation')}</option>
                </select>
              </div>
            </div>
            <textarea value={reportForm.description} onChange={e => setReportForm({ ...reportForm, description: e.target.value })}
              required rows={3} placeholder={t('common.description', 'Description')}
              className="w-full mt-4 px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
            <div className="flex items-center gap-2 mt-4">
              <input type="checkbox" id="conf" checked={reportForm.confidential}
                onChange={e => setReportForm({ ...reportForm, confidential: e.target.checked })} />
              <label htmlFor="conf" className="text-sm text-gray-400">{t('quality.reportAnonymously', 'Report anonymously')}</label>
            </div>
            <button type="submit"
              className="mt-4 px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg text-sm">
              {t('quality.submitReport', 'Submit Report')}
            </button>
          </form>
        )}

        {/* ═══════════════════ OVERVIEW TAB ═══════════════════ */}
        {tab === "overview" && (
          <>
            {dashboardLoading ? (
              <LoadingSkeleton type="card" rows={4} />
            ) : (
              <>
                {/* ── KPI Cards ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <StatsCard label={t('quality.auditCompletionRate', 'Audit Completion Rate')}
                    value={`${dashboardData?.audit_completion_rate || 0}%`}
                    valueClassName={dashboardData?.audit_completion_rate >= 70 ? "text-green-400" : "text-yellow-400"} />
                  <StatsCard label={t('quality.openNCRs', 'Open NCRs')}
                    value={dashboardData?.open_ncr_count || 0}
                    valueClassName={(dashboardData?.open_ncr_count || 0) > 0 ? "text-red-400" : "text-green-400"} />
                  <StatsCard label={t('quality.overdueCAPAs', 'Overdue CAPAs')}
                    value={dashboardData?.overdue_capa_count || 0}
                    valueClassName={(dashboardData?.overdue_capa_count || 0) > 0 ? "text-red-400" : "text-green-400"} />
                  <StatsCard label={t('quality.safetyEvents', 'Safety Events')}
                    value={dashboardData?.safety_events_this_month || 0} />
                </div>

                {/* ── Safety Trends ── */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">
                    {t('quality.safetyTrends', 'Safety Trends')}
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Bar chart: events by month */}
                    <div className="bg-navy-800 border border-navy-700 rounded-xl p-4 col-span-1 lg:col-span-2">
                      <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                        {t('quality.eventsByMonth', 'Events by Month')}
                      </h4>
                      {safety_by_month.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={safety_by_month}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey={chartLabel} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                            <Tooltip
                              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                              labelStyle={{ color: '#f1f5f9' }}
                            />
                            <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-gray-500 text-sm py-8 text-center">{t('no_data', 'No data available')}</p>
                      )}
                    </div>

                    {/* Pie: by type */}
                    <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
                      <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                        {t('quality.riskAssessments', 'By Type')}
                      </h4>
                      {safety_by_type.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={safety_by_type} dataKey="count" nameKey="type"
                              cx="50%" cy="50%" outerRadius={70}
                              label={({ type, count }: any) => `${type}: ${count}`}>
                              {safety_by_type.map((_: any, i: number) => (
                                <Cell key={i} fill={['#f59e0b', '#3b82f6', '#ef4444', '#10b981', '#8b5cf6'][i % 5]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-gray-500 text-sm py-8 text-center">{t('no_data', 'No data available')}</p>
                      )}
                    </div>
                  </div>

                  {/* Funnel: by status */}
                  {safety_by_status.length > 0 && (
                    <div className="bg-navy-800 border border-navy-700 rounded-xl p-4 mt-4">
                      <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                        {t('quality.byStatus', 'By Status')}
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {safety_by_status.map((s: any) => (
                          <div key={s.status}
                            className="flex items-center gap-2 px-3 py-2 bg-navy-900 rounded-lg border border-navy-700">
                            <span className="w-2.5 h-2.5 rounded-full"
                              style={{ background: STATUS_COLORS[s.status] || '#6b7280' }} />
                            <span className="text-sm text-gray-300 capitalize">{s.status.replace(/_/g, ' ')}</span>
                            <span className="text-sm font-bold text-white">{s.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Audit Compliance + CAPA Effectiveness ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Audit Compliance */}
                  <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">
                      {t('quality.auditCompliance', 'Audit Compliance')}
                    </h3>
                    {audits_by_type.length > 0 ? (
                      <div className="space-y-3">
                        {audits_by_type.map((a: any) => (
                          <div key={a.type} className="flex items-center justify-between">
                            <span className="text-sm text-gray-300 capitalize">{a.type}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-gray-500">{t('common.total', 'Total')}: {a.total}</span>
                              <span className="text-xs text-green-400">{t('quality.completed', 'Completed')}: {a.completed}</span>
                              <div className="w-20 h-1.5 bg-navy-700 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full"
                                  style={{ width: `${a.total > 0 ? (a.completed / a.total) * 100 : 0}%` }} />
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-3 border-t border-navy-700">
                          <span className="text-sm text-red-400">{t('quality.overdueAudits', 'Overdue Audits')}</span>
                          <span className="text-lg font-bold text-red-400">{dashboardData?.overdue_audits || 0}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm py-4 text-center">{t('no_data', 'No data available')}</p>
                    )}
                  </div>

                  {/* CAPA Effectiveness */}
                  <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">
                      {t('quality.capaEffectiveness', 'CAPA Effectiveness')}
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <StatsCard label={t('quality.closedOnTimeRate', 'Closed on Time Rate')}
                        value={`${dashboardData?.capa_effectiveness_rate || 0}%`}
                        valueClassName={(dashboardData?.capa_effectiveness_rate || 0) >= 80 ? "text-green-400" : "text-yellow-400"} />
                      <StatsCard label={t('quality.avgClosureDays', 'Avg Closure Days')}
                        value={dashboardData?.avg_closure_days || 0} />
                      <StatsCard label={t('quality.closed', 'Closed')}
                        value={`${dashboardData?.closed_capa_count || 0}/${dashboardData?.total_capa_count || 0}`} />
                    </div>
                  </div>
                </div>

                {/* ── Risk Distribution ── */}
                <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8">
                  <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">
                    {t('quality.riskMatrix', 'Risk Distribution')}
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { label: t('quality.low', 'Low'), value: dashboardData?.risk_distribution?.low || 0, color: "text-green-400" },
                      { label: t('quality.medium', 'Medium'), value: dashboardData?.risk_distribution?.medium || 0, color: "text-yellow-400" },
                      { label: t('quality.high', 'High'), value: dashboardData?.risk_distribution?.high || 0, color: "text-orange-400" },
                      { label: t('quality.critical', 'Critical'), value: dashboardData?.risk_distribution?.critical || 0, color: "text-red-400" },
                    ].map(r => (
                      <div key={r.label} className="text-center p-3 bg-navy-900 rounded-lg border border-navy-700">
                        <p className={`text-2xl font-bold ${r.color}`}>{r.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{r.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Deadlines ── */}
                {upcoming_deadlines.length > 0 && (
                  <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8">
                    <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">
                      {t('quality.upcomingDeadlines', 'Upcoming Deadlines')}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-navy-700">
                            <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase tracking-wider">{t('common.item', 'Item')}</th>
                            <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase tracking-wider">{t('common.type', 'Type')}</th>
                            <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase tracking-wider">{t('quality.dueDate', 'Due Date')}</th>
                            <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase tracking-wider">{t('quality.daysRemaining', 'Days Left')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {upcoming_deadlines.map((d: any, i: number) => (
                            <tr key={i} className="border-b border-navy-700/50 hover:bg-navy-700/20 transition-colors">
                              <td className="px-3 py-2.5 text-white font-medium">{d.item_name}</td>
                              <td className="px-3 py-2.5 text-gray-400">{d.type.replace(/_/g, ' ')}</td>
                              <td className="px-3 py-2.5 text-gray-400">{d.expiry_date?.slice(0, 10)}</td>
                              <td className={`px-3 py-2.5 font-semibold ${daysColor(d.days_remaining)}`}>
                                {d.days_remaining}d
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ═══════════════════ LIST TABS ═══════════════════ */}
        {loading ? (
          <LoadingSkeleton type="card" rows={6} />
        ) : (
          <div className="space-y-3">
            {tab === "audits" && audits.map((a: any) => (
              <div key={a.id} className="bg-navy-800 border border-navy-700 rounded-xl">
                <button onClick={() => setExpanded(expanded === a.id ? "" : a.id)}
                  className="w-full p-4 flex items-center justify-between text-left">
                  <div>
                    <span className="text-white font-medium">{a.title}</span>
                    <span className="text-sm text-gray-400 ml-3">{a.type}</span>
                    <span className="text-xs text-gray-500 ml-3">{a.scheduled_date?.slice(0, 10)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{a.ncr_count} {t('quality.ncrs', 'NCRs')}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${a.status === "completed" ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"}`}>
                      {a.status}
                    </span>
                  </div>
                </button>
                {expanded === a.id && (
                  <div className="border-t border-navy-700 p-4 space-y-3">
                    <p className="text-sm text-gray-400">
                      <strong className="text-gray-300">{t('quality.scope', 'Scope:')}</strong> {a.scope || t('common.na', 'N/A')}
                    </p>
                    <button onClick={() => downloadBlob(`/audits/${a.id}/pdf/`, `${(a.title || a.id)}.pdf`)}
                      className="inline-block px-4 py-1.5 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded text-xs hover:bg-gold-500 hover:text-navy-900">
                      {t('quality.downloadPdf', 'Download PDF')}
                    </button>
                  </div>
                )}
              </div>
            ))}
            {tab === "ncrs" && ncrs.map((n: any) => (
              <div key={n.id} className="bg-navy-800 border border-navy-700 rounded-xl">
                <button onClick={() => setExpanded(expanded === n.id ? "" : n.id)}
                  className="w-full p-4 flex items-center justify-between text-left">
                  <div>
                    <span className="text-white font-medium">{n.title}</span>
                    <span className="text-sm text-gray-400 ml-3">{n.audit_title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${n.severity === "critical" ? "bg-red-500/10 text-red-400" : n.severity === "major" ? "bg-orange-500/10 text-orange-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                      {n.severity}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${n.status === "open" ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                      {n.status}
                    </span>
                  </div>
                </button>
                {expanded === n.id && (
                  <div className="border-t border-navy-700 p-4 space-y-3">
                    <p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.description', 'Description:')}</strong> {n.description || t('common.na', 'N/A')}</p>
                    <p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.finding', 'Finding:')}</strong> {n.finding || t('common.na', 'N/A')}</p>
                    <p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.correctiveAction', 'Corrective Action:')}</strong> {n.corrective_action || t('common.na', 'N/A')}</p>
                  </div>
                )}
              </div>
            ))}
            {tab === "capas" && capas.map((c: any) => (
              <div key={c.id} className="bg-navy-800 border border-navy-700 rounded-xl">
                <button onClick={() => setExpanded(expanded === c.id ? "" : c.id)}
                  className="w-full p-4 flex items-center justify-between text-left">
                  <div>
                    <span className="text-white font-medium">{c.title}</span>
                    <span className="text-sm text-gray-400 ml-3">{c.ncr_title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{t('quality.due', 'Due:')} {c.due_date?.slice(0, 10) || t('common.na', 'N/A')}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${c.type === "corrective" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"}`}>{c.type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${c.status === "open" ? "bg-yellow-500/10 text-yellow-400" : "bg-green-500/10 text-green-400"}`}>{c.status}</span>
                  </div>
                </button>
                {expanded === c.id && (
                  <div className="border-t border-navy-700 p-4 space-y-3">
                    <p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.description', 'Description:')}</strong> {c.description || t('common.na', 'N/A')}</p>
                    <p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.actionPlan', 'Action Plan:')}</strong> {c.action_plan || t('common.na', 'N/A')}</p>
                    <p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.responsible', 'Responsible:')}</strong> {c.responsible || t('common.na', 'N/A')}</p>
                  </div>
                )}
              </div>
            ))}
            {tab === "risks" && risks.map((r: any) => (
              <div key={r.id} className="bg-navy-800 border border-navy-700 rounded-xl">
                <button onClick={() => setExpanded(expanded === r.id ? "" : r.id)}
                  className="w-full p-4 flex items-center justify-between text-left">
                  <div>
                    <span className="text-white font-medium">{r.hazard}</span>
                    <span className="text-sm text-gray-400 ml-3">{t('quality.risk', 'Risk:')} {r.risk_level}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${r.status === "active" ? "bg-yellow-500/10 text-yellow-400" : "bg-green-500/10 text-green-400"}`}>{r.status}</span>
                </button>
                {expanded === r.id && (
                  <div className="border-t border-navy-700 p-4 space-y-3">
                    <p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.likelihood', 'Likelihood:')}</strong> {r.likelihood || t('common.na', 'N/A')}</p>
                    <p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.consequence', 'Consequence:')}</strong> {r.consequence || t('common.na', 'N/A')}</p>
                    <p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.mitigation', 'Mitigation:')}</strong> {r.mitigation || t('common.na', 'N/A')}</p>
                  </div>
                )}
              </div>
            ))}
            {tab === "safety" && events.map((e: any) => (
              <div key={e.id} className="bg-navy-800 border border-navy-700 rounded-xl">
                <button onClick={() => setExpanded(expanded === e.id ? "" : e.id)}
                  className="w-full p-4 flex items-center justify-between text-left">
                  <div>
                    <span className="text-white font-medium">{e.title}</span>
                    <span className="text-sm text-gray-400 ml-3">{e.type}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${e.status === "reported" ? "bg-yellow-500/10 text-yellow-400" : "bg-green-500/10 text-green-400"}`}>{e.status}</span>
                </button>
                {expanded === e.id && (
                  <div className="border-t border-navy-700 p-4 space-y-3">
                    <p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.description', 'Description:')}</strong> {e.description || t('common.na', 'N/A')}</p>
                    <p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.location', 'Location:')}</strong> {e.location || t('common.na', 'N/A')}</p>
                    <p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.reportedBy', 'Reported By:')}</strong> {e.reported_by_name || t('common.na', 'N/A')}</p>
                  </div>
                )}
              </div>
            ))}
            {tab === "documents" && documents.map((d: any) => (
              <div key={d.id} className="bg-navy-800 border border-navy-700 rounded-xl">
                <button onClick={() => setExpanded(expanded === d.id ? "" : d.id)}
                  className="w-full p-4 flex items-center justify-between text-left">
                  <div>
                    <span className="text-white font-medium">{d.title || d.number}</span>
                    <span className="text-sm text-gray-400 ml-3">{d.type}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${d.status === "approved" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>{d.status || t('common.na', 'N/A')}</span>
                </button>
                {expanded === d.id && (
                  <div className="border-t border-navy-700 p-4 space-y-3">
                    <p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.version', 'Version:')}</strong> {d.version || t('common.na', 'N/A')}</p>
                    <p className="text-sm text-gray-400"><strong className="text-gray-300">{t('quality.reviewDate', 'Review Date:')}</strong> {d.review_date?.slice(0, 10) || t('common.na', 'N/A')}</p>
                    {d.file_url && (
                      <a href={d.file_url} target="_blank"
                        className="inline-block px-4 py-1.5 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded text-xs hover:bg-gold-500 hover:text-navy-900">
                        {t('common.download', 'Download')}
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
