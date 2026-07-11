"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

interface Invoice { id: string; invoice_number: string; student_name: string; amount: string; currency: string; status: string; balance: string; due_at: string | null; }

export default function FinanceDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/login"); } }, [isLoading, isAuthenticated, router]);

  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/invoices/", { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => setInvoices(d.results || [])).finally(() => setLoading(false));
  }, [isAuthenticated]);

  const totalIssued = invoices.filter(i => i.status !== 'draft').reduce((s, i) => s + parseFloat(i.amount), 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + parseFloat(i.amount), 0);
  const outstanding = invoices.filter(i => i.status === 'issued' || i.status === 'partially_paid').reduce((s, i) => s + parseFloat(i.amount), 0);
  const overdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + parseFloat(i.amount), 0);

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/mast.svg" alt="MAA" width={72} height={72} className="rounded-lg" />
            <div><h1 className="text-lg font-bold text-white">Finance</h1><p className="text-xs text-gold-500">Dashboard</p></div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push("/finance/invoices")} className="px-4 py-2 bg-gold-500 text-navy-900 rounded-lg text-sm font-semibold">Invoices</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Issued" value={`${totalIssued.toLocaleString()} MAD`} color="text-blue-400" />
          <StatCard label="Collected" value={`${totalPaid.toLocaleString()} MAD`} color="text-green-400" />
          <StatCard label="Outstanding" value={`${outstanding.toLocaleString()} MAD`} color="text-yellow-400" />
          <StatCard label="Overdue" value={`${overdue.toLocaleString()} MAD`} color="text-red-400" />
        </div>

        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Invoices</h3>
          {loading ? <p className="text-gray-500 text-sm">Loading...</p> : invoices.length === 0 ? <p className="text-gray-500 text-sm">No invoices yet.</p> : (
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
