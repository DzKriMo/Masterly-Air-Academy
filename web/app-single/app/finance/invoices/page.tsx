"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

interface Invoice { id: string; invoice_number: string; student_name: string; amount: string; currency: string; status: string; balance: string; due_at: string | null; }
interface Student { id: string; first_name: string; last_name: string; student_number: string; }

export default function InvoicesPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ student: "", type: "tuition", description: "", amount: "", currency: "DZD", due_at: "" });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!isLoading && !isAuthenticated) { router.push("/login"); } }, [isLoading, isAuthenticated, router]);

  const token = () => { try { return JSON.parse(sessionStorage.getItem("maa_session") || "{}").token; } catch { return ""; } };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/invoices/", { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => setInvoices(d.results || [])).finally(() => setLoading(false));
    fetch("/api/students/", { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => setStudents(d.results || d || []));
  }, [isAuthenticated]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.student) { setMsg("Please select a student."); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { setMsg("Please enter a valid amount."); return; }
    try {
      const res = await fetch("/api/invoices/", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      if (res.ok) {
        const data = await res.json();
        setInvoices([data, ...invoices]);
        setShowForm(false); setMsg("Invoice created.");
        setForm({ student: "", type: "tuition", description: "", amount: "", currency: "DZD", due_at: "" });
      } else {
        const d = await res.json();
        setMsg(d.message || Object.values(d).flat().join(", ") || "Failed");
      }
    } catch { setMsg("Connection error"); }
  };

  const handleRecordPayment = async (inv: Invoice) => {
    const amt = prompt(`Enter payment amount for ${inv.invoice_number} (Balance: ${parseFloat(inv.balance).toLocaleString()} ${inv.currency}):`, inv.balance);
    if (!amt) return;
    try {
      const res = await fetch("/api/payments/", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ student: "", invoice: inv.id, amount: parseFloat(amt), currency: inv.currency, method: "bank_transfer" }),
      });
      if (res.ok) {
        const updated = await fetch("/api/invoices/", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json());
        setInvoices(updated.results || []);
        setMsg("Payment recorded.");
      }
    } catch { setMsg("Failed to record payment"); }
  };

  const filtered = filter ? invoices.filter(i => i.status === filter) : invoices;

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-lg" />
            <div><h1 className="text-lg font-bold text-white">Invoices</h1>
              <button onClick={() => router.push("/finance/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">Back to Finance</button></div>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-gold-500 text-navy-900 rounded-lg text-sm font-semibold">{showForm ? "Cancel" : "+ New Invoice"}</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {msg && <div className="mb-4 p-3 rounded-lg text-sm bg-navy-800 border border-navy-700 text-gray-300">{msg}</div>}

        {showForm && (
          <form onSubmit={handleCreate} className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Create Invoice</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="block text-sm text-gray-400 mb-1">Student</label><select value={form.student} onChange={e => setForm({...form, student: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"><option value="">Select...</option>{students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.student_number})</option>)}</select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Type</label><select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"><option value="tuition">Tuition</option><option value="exam_fee">Exam Fee</option><option value="flight_hours">Flight Hours</option><option value="other">Other</option></select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Amount (DZD)</label><input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Description</label><input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Due Date</label><input type="date" value={form.due_at} onChange={e => setForm({...form, due_at: e.target.value})} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" /></div>
            </div>
            <button type="submit" className="mt-4 px-6 py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm">Create Invoice</button>
          </form>
        )}

        <div className="flex gap-2 mb-6">
          {["", "draft", "issued", "paid", "partially_paid", "overdue"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === f ? "bg-gold-500 text-navy-900" : "bg-navy-800 text-gray-400 border border-navy-700"}`}>{f || "All"}</button>
          ))}
        </div>

        {loading ? <p className="text-gray-500 text-sm">Loading...</p> : (
          <div className="space-y-2">
            {filtered.map(inv => (
              <div key={inv.id} className="bg-navy-800 border border-navy-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium text-sm">{inv.invoice_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${inv.status === 'paid' ? 'bg-green-500/10 text-green-400' : inv.status === 'overdue' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>{inv.status}</span>
                  </div>
                  <p className="text-sm text-gray-400">{inv.student_name} | Due: {inv.due_at || "N/A"} | Balance: {parseFloat(inv.balance).toLocaleString()} {inv.currency}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold">{parseFloat(inv.amount).toLocaleString()} {inv.currency}</span>
                  {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                    <button onClick={() => handleRecordPayment(inv)} className="px-3 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded text-xs hover:bg-green-500 hover:text-white transition-colors">Record Payment</button>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-gray-500 text-center py-8">No invoices found.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
