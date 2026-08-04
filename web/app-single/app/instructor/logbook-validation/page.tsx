"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { PageHeader } from "@/components/page-header";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar, FilterOption } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { DetailField } from "@/components/detail-field";
import { useToast } from "@/components/toast";

interface LogEntry {
  id: string; student: string; student_name: string; student_number: string;
  aircraft_reg?: string; aircraft_text?: string; date: string;
  flight_duration: number; exercises: string[]; notes?: string;
  status: string; validated_by_name?: string; validated_at?: string;
  rejection_reason?: string; created_at: string;
}

export default function LogbookValidationPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");
  const [selected, setSelected] = useState<LogEntry | null>(null);
  const [showValidate, setShowValidate] = useState(false);
  const [validateForm, setValidateForm] = useState({ status: "approved", rejection_reason: "" });
  const [validating, setValidating] = useState(false);

  useAuthGuard(isAuthenticated, authLoading);

  const fetchEntries = () => {
    if (!isAuthenticated) return;
    setLoading(true);
    api.get<any>("/flight-log-entries/")
      .then(data => { setEntries(data.results || data || []); setError(null); })
      .catch(() => setError(t("common.failedToLoad", "Failed to load")))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEntries(); }, [isAuthenticated]);

  const filtered = useMemo(() => {
    let result = entries;
    if (filterValues.status) result = result.filter(e => e.status === filterValues.status);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      result = result.filter(e => e.student_name?.toLowerCase().includes(q) || e.student_number?.toLowerCase().includes(q));
    }
    return result;
  }, [entries, filterValues, searchValue]);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault(); setValidating(true);
    if (!selected) return;
    try {
      await api.post(`/flight-log-entries/${selected.id}/validate_entry/`, validateForm);
      setShowValidate(false); setSelected(null);
      setValidateForm({ status: "approved", rejection_reason: "" });
      showToast("success", validateForm.status === "approved" ? t("instructor.entryApproved", "Entry approved") : t("instructor.entryRejected", "Entry rejected"));
      fetchEntries();
    } catch (err: any) {
      showToast("error", err.message || t("common.failed", "Failed"));
    } finally { setValidating(false); }
  };

  const openValidate = (entry: LogEntry) => {
    setSelected(entry);
    setValidateForm({ status: "approved", rejection_reason: "" });
    setShowValidate(true);
  };

  const filters: FilterOption[] = [
    { key: "status", label: t("common.allStatuses"), options: [
      { value: "pending", label: t("common.pending", "Pending") },
      { value: "approved", label: t("common.approved", "Approved") },
      { value: "rejected", label: t("common.rejected", "Rejected") },
    ]},
  ];

  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-400", approved: "bg-green-500/10 text-green-400", rejected: "bg-red-500/10 text-red-400",
  };

  const columns: Column<LogEntry>[] = useMemo(() => [
    { key: "student_name", header: t("common.student"), render: (e) => <span className="text-white font-semibold">{e.student_name}</span> },
    { key: "date", header: t("common.date") },
    { key: "aircraft", header: t("aircraft"), render: (e) => <span className="text-gray-400">{e.aircraft_reg || e.aircraft_text || "—"}</span> },
    { key: "flight_duration", header: t("duration"), render: (e) => <span>{e.flight_duration}h</span> },
    { key: "status", header: t("common.status"), render: (e) => <span className={`text-xs px-2 py-0.5 rounded ${statusColors[e.status]}`}>{e.status}</span> },
    { key: "actions", header: "", sortable: false, render: (e) => (
      <div className="flex gap-1" onClick={(ev) => ev.stopPropagation()}>
        {e.status === "pending" && (
          <button onClick={() => openValidate(e)} className="px-3 py-1 text-xs bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded hover:bg-gold-500 hover:text-navy-900">Validate</button>
        )}
      </div>
    )},
  ], [t]);

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader title={t("instructor.logbookValidation", "Logbook Validation")} backHref={authLoading ? "" : "/instructor/dashboard"} backLabel={t("instructor.backToDashboard")} />
      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && <ErrorCard message={error} onRetry={fetchEntries} />}
        <FilterBar filters={filters} values={filterValues} onChange={(k, v) => setFilterValues(p => ({ ...p, [k]: v }))} onClear={() => { setFilterValues({}); setSearchValue(""); }} searchValue={searchValue} onSearchChange={setSearchValue} searchPlaceholder={t("instructor.searchStudents", "Search students...")} />
        {loading ? <LoadingSkeleton type="table" rows={8} /> : filtered.length === 0 ? (
          <EmptyState message={t("instructor.noPendingEntries", "No log entries found.")} title={entries.length === 0 ? t("instructor.noEntriesYet", "No entries yet") : t("instructor.noMatchingEntries", "No matching entries")} />
        ) : (
          <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(e: any) => openValidate(e)} />
        )}

        <ModalForm
          open={showValidate}
          onClose={() => setShowValidate(false)}
          title={`${t("instructor.validateEntry", "Validate Entry")} — ${selected?.student_name || ""}`}
          footer={
            <button type="submit" form="validate-form" disabled={validating} className="px-6 py-2.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 font-semibold rounded-lg text-sm">
              {validating ? t("common.validating", "Validating...") : t("instructor.confirmValidation", "Confirm")}
            </button>
          }
        >
          <form id="validate-form" onSubmit={handleValidate}>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <DetailField label={t("common.student")} value={selected?.student_name || "—"} />
                <DetailField label={t("common.date")} value={selected?.date || "—"} />
                <DetailField label={t("aircraft")} value={selected?.aircraft_reg || selected?.aircraft_text || "—"} />
                <DetailField label={t("duration")} value={selected ? `${selected.flight_duration}h` : "—"} />
              </div>
              {selected?.exercises && selected.exercises.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t("exercisesCompleted", "Exercises")}</p>
                  <div className="flex flex-wrap gap-1.5">{selected.exercises.map((x, i) => <span key={i} className="text-xs px-2 py-0.5 bg-gold-500/10 text-gold-500 rounded">{x}</span>)}</div>
                </div>
              )}
              {selected?.notes && (
                <div><p className="text-xs text-gray-500 mb-1">{t("common.notes")}</p><p className="text-sm text-white">{selected.notes}</p></div>
              )}
              {selected?.rejection_reason && selected.status === 'rejected' && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"><p className="text-xs text-red-400 mb-1">{t("instructor.rejectionReason", "Rejection Reason")}</p><p className="text-sm text-red-300">{selected.rejection_reason}</p></div>
              )}
              {selected?.status === 'pending' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t("common.decision", "Decision")}</label>
                    <select value={validateForm.status} onChange={e => setValidateForm({...validateForm, status: e.target.value})} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
                      <option value="approved">{t("common.approve", "Approve")}</option>
                      <option value="rejected">{t("common.reject", "Reject")}</option>
                    </select>
                  </div>
                  {validateForm.status === "rejected" && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">{t("instructor.rejectionReason")} *</label>
                      <textarea value={validateForm.rejection_reason} onChange={e => setValidateForm({...validateForm, rejection_reason: e.target.value})} required rows={2} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
                    </div>
                  )}
                </>
              )}
            </div>
          </form>
        </ModalForm>
      </main>
    </div>
  );
}
