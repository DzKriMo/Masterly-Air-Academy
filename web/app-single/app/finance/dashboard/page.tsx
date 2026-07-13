"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { ExportButton } from "@/components/export-button";
import { useTranslation } from "@/lib/use-translation";
const FCOLORS = ["#22c55e","#3b82f6","#ef4444","#f59e0b"];
const BUCKET_COLORS = ["#22c55e","#f59e0b","#f97316","#ef4444"];

interface Invoice { id: string; invoice_number: string; student_name: string; amount: string; currency: string; status: string; balance: string; due_at: string | null; }

interface ReportsData {
  revenue_by_month: {month: number; revenue: number}[];
  revenue_by_program: {program: string; program_name: string; revenue: number}[];
  outstanding_by_age: {label: string; total: number}[];
  top_debtors: {student_id: string; student_name: string; total_outstanding: number}[];
  collection_rate: number;
}

export default function FinanceDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      api.get("/invoices/").catch(() => ({results: []})),
      api.get("/finance/reports/").catch(() => null)
    ])
      .then(([invData, rptData]) => {
        setInvoices((invData as unknown as {results: Invoice[]}).results || []);
        setReports(rptData as unknown as ReportsData);
        setError(null);
      })
      .catch(err => { console.error("Failed to load data:", err); setError(t('common.error', 'Failed to load data. Please try again.')); })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const totalIssued = invoices.filter(i => i.status !== 'draft').reduce((s, i) => s + parseFloat(i.amount), 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + parseFloat(i.amount), 0);
  const outstanding = invoices.filter(i => i.status === 'issued' || i.status === 'partially_paid').reduce((s, i) => s + parseFloat(i.amount), 0);
  const overdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + parseFloat(i.amount), 0);

  const collectionRate = reports?.collection_rate ?? (totalIssued > 0 ? Math.round((totalPaid / totalIssued) * 1000) / 10 : 0);
  const outstandingAgeData = reports?.outstanding_by_age ?? [];
  const topDebtors = reports?.top_debtors ?? [];
  const revenueByMonth = reports?.revenue_by_month ?? [];
  const revenueByProgram = reports?.revenue_by_program ?? [];

  const { t } = useTranslation();

  return (
    <div className="flex-1 min-w-0">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">{t('finance.dashboard', 'Finance Dashboard')}</h1>
          <div className="flex items-center gap-3">
            <ExportButton exports={[{label:t('finance.invoicesExcel','Invoices (Excel)'),url:"/export/invoices/",filename:"invoices.xlsx",type:"excel"},{label:t('finance.paymentsExcel','Payments (Excel)'),url:"/export/payments/",filename:"payments.xlsx",type:"excel"}]}/>
            <span className="text-sm text-gray-400 hidden sm:inline">{user?.name || user?.email}</span>
          </div>
        </div>
      </nav>

      <main className="px-6 py-8">
        {error && <ErrorCard message={error} onRetry={() => { setError(null); setLoading(true); Promise.all([api.get("/invoices/").catch(() => ({results: []})), api.get("/finance/reports/").catch(() => null)]).then(([invData, rptData]) => { setInvoices((invData as unknown as {results: Invoice[]}).results || []); setReports(rptData as unknown as ReportsData); setError(null); }).catch(err => { setError(t('common.error', 'Failed to load data. Please try again.')); }).finally(() => setLoading(false)); }} />}
        {loading ? <LoadingSkeleton type="card" rows={4} /> : <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard label={t('finance.totalIssued','Total Issued')} value={`${totalIssued.toLocaleString()} DZD`} color="text-blue-400" />
            <StatCard label={t('finance.collected','Collected')} value={`${totalPaid.toLocaleString()} DZD`} color="text-green-400" />
            <StatCard label={t('finance.outstanding','Outstanding')} value={`${outstanding.toLocaleString()} DZD`} color="text-yellow-400" />
            <StatCard label={t('finance.overdue','Overdue')} value={`${overdue.toLocaleString()} DZD`} color="text-red-400" />
            <StatCard label={t('finance.collectionRate','Collection Rate')} value={`${collectionRate}%`} color="text-cyan-400" />
          </div>

          {invoices.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('finance.revenue', 'Revenue (DZD)')}</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={[{name:t('finance.collected','Collected'),value:totalPaid},{name:t('finance.outstanding','Outstanding'),value:outstanding},{name:t('finance.overdue','Overdue'),value:overdue}]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2332"/>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12}/>
                    <YAxis stroke="#94a3b8" fontSize={12}/>
                    <Tooltip/>
                    <Bar dataKey="value" fill="#c4943c" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('finance.invoices', 'Invoice Status')}</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={[{name:t('finance.paid','Paid'),value:invoices.filter(i=>i.status==="paid").length},{name:t('finance.issued','Issued'),value:invoices.filter(i=>i.status==="issued").length},{name:t('finance.overdue','Overdue'),value:invoices.filter(i=>i.status==="overdue").length},{name:t('finance.draft','Draft'),value:invoices.filter(i=>i.status==="draft").length}]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name,value}:any)=>`${name}: ${value}`}>
                      {[0,1,2,3].map(i=><Cell key={i} fill={FCOLORS[i]}/>)}
                    </Pie>
                    <Tooltip/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {revenueByMonth.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('finance.revenueByMonth', 'Monthly Revenue')}</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2332"/>
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickFormatter={(m:string)=>['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m)]}/>
                    <YAxis stroke="#94a3b8" fontSize={12}/>
                    <Tooltip/>
                    <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} dot={{r:4}}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('finance.revenueByProgram', 'Revenue by Program')}</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={revenueByProgram} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2332"/>
                    <XAxis type="number" stroke="#94a3b8" fontSize={12}/>
                    <YAxis dataKey="program_name" type="category" stroke="#94a3b8" fontSize={11} width={60}/>
                    <Tooltip/>
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Outstanding by Age BarChart */}
          {outstandingAgeData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('finance.outstandingByAge', 'Outstanding by Age')}</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={outstandingAgeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2332"/>
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={11}/>
                    <YAxis stroke="#94a3b8" fontSize={12}/>
                    <Tooltip/>
                    <Bar dataKey="total" radius={[4,4,0,0]}>
                      {outstandingAgeData.map((_:any,i:number)=><Cell key={i} fill={BUCKET_COLORS[i % BUCKET_COLORS.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top Debtors Table */}
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('finance.topDebtors', 'Top Debtors')}</h3>
                {topDebtors.length === 0 ? <p className="text-gray-500 text-sm text-center py-8">{t('finance.noDebtors', 'No outstanding debtors')}</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-500 border-b border-navy-700">
                          <th className="text-left py-2 font-medium">{t('common.number', '#')}</th>
                          <th className="text-left py-2 font-medium">{t('finance.student', 'Student')}</th>
                          <th className="text-right py-2 font-medium">{t('finance.outstanding', 'Outstanding')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topDebtors.map((d:any,i:number)=>(
                          <tr key={d.student_id} className="border-b border-navy-700/50">
                            <td className="py-2 text-gray-500">{i+1}</td>
                            <td className="py-2 text-white">{d.student_name}</td>
                            <td className="py-2 text-right text-red-400 font-medium">{d.total_outstanding.toLocaleString()} DZD</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">{t('finance.invoices', 'Recent Invoices')}</h3>
            {invoices.length === 0 ? <EmptyState message={t('finance.noInvoices', 'No invoices yet.')} /> : (
              <div className="space-y-2">
                {invoices.slice(0, 10).map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-navy-900 rounded-lg border border-navy-700">
                    <div>
                      <span className="text-white font-medium text-sm">{inv.invoice_number}</span>
                      <span className="text-gray-400 text-sm ml-3">{inv.student_name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-white font-semibold text-sm">{parseFloat(inv.amount).toLocaleString()} {inv.currency}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${inv.status === 'paid' ? 'bg-green-500/10 text-green-400' : inv.status === 'overdue' ? 'bg-red-500/10 text-red-400' : inv.status === 'issued' ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-500/10 text-gray-400'}`}>{inv.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>}
      </main>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl p-5">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
