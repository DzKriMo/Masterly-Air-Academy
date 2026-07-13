"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { ExportButton } from "@/components/export-button";
import { useTranslation } from "@/lib/use-translation";

export default function FinanceReportsPage() {
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const { data: invoices=[], isLoading } = useQuery({
    queryKey: ['finance-reports'],
    queryFn: () => api.get("/invoices/").then(d => (d as unknown as {results: any[]}).results || []),
  });

  const statusData = Object.entries(invoices.reduce((acc:any, i:any) => { acc[i.status] = (acc[i.status]||0) + 1; return acc; }, {})).map(([name, value]) => ({name, value}));
  const revenueData = invoices.map((i:any) => ({name: i.invoice_number?.slice(-6)||t('common.na', 'N/A'), amount: parseFloat(i.amount)||0}));

  return (<div className="flex-1 min-w-0">
    <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30"><div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between"><h1 className="text-lg font-bold text-white">{t('finance.reports', 'Financial Reports')}</h1><ExportButton exports={[{label:t('finance.invoicesExcel', 'Invoices (Excel)'),url:"/export/invoices/",filename:"invoices.xlsx",type:"excel"},{label:t('finance.studentsExcel', 'Students (Excel)'),url:"/export/students/",filename:"students.xlsx",type:"excel"}]}/></div></nav>
    <main className="px-6 py-8">{error && <ErrorCard message={error} onRetry={()=>setError(null)}/>}{isLoading?<LoadingSkeleton type="card" rows={4}/>:<>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6"><h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('finance.invoiceStatus', 'Invoice Status Distribution')}</h3><ResponsiveContainer width="100%" height={250}><BarChart data={statusData}><CartesianGrid strokeDasharray="3 3" stroke="#1a2332"/><XAxis dataKey="name" stroke="#94a3b8" fontSize={12}/><YAxis stroke="#94a3b8" fontSize={12}/><Tooltip/><Bar dataKey="value" fill="#c4943c" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6"><h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('finance.revenueByInvoice', 'Revenue by Invoice')}</h3><ResponsiveContainer width="100%" height={250}><BarChart data={revenueData.slice(0,10)}><CartesianGrid strokeDasharray="3 3" stroke="#1a2332"/><XAxis dataKey="name" stroke="#94a3b8" fontSize={12}/><YAxis stroke="#94a3b8" fontSize={12}/><Tooltip/><Bar dataKey="amount" fill="#3b82f6" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
      </div>
      <div className="flex gap-4"><ExportButton exports={[{label:t('finance.invoicesExcel', 'Invoices (Excel)'),url:"/export/invoices/",filename:"invoices.xlsx",type:"excel"},{label:t('finance.studentsExcel', 'Students (Excel)'),url:"/export/students/",filename:"students.xlsx",type:"excel"}]}/></div>
    </>}</main></div>);
}
