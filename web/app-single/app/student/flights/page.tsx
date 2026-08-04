"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import type { FilterOption } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { DetailField } from "@/components/detail-field";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuthGuard } from "@/lib/use-auth-guard";
import { PageHeader } from "@/components/page-header";

interface FlightEntry { id: string; date: string; aircraft: string; duration: number; grade: number | null; result: string | null; instructor_name?: string; exercises_completed?: number; competencies_acquired?: number; observations?: string; }

export default function StudentFlightsPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [log, setLog] = useState<{ total_flight_hours: number; total_lessons: number; program?: string | null; student_name?: string | null; student_number?: string | null; lessons: FlightEntry[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [selectedFlight, setSelectedFlight] = useState<FlightEntry | null>(null);
  const [printing, setPrinting] = useState(false);

  useAuthGuard(isAuthenticated, isLoading, "/student/login");

  const loadFlights = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    api.get<{ total_flight_hours: number; total_lessons: number; program?: string | null; student_name?: string | null; student_number?: string | null; lessons: FlightEntry[] }>("/students/flight-log/")
      .then(data => {
        const payload = (data as unknown as { total_flight_hours: number; total_lessons: number; program?: string | null; student_name?: string | null; student_number?: string | null; lessons: FlightEntry[] });
        setLog(payload);
        setError(null);
      })
      .catch(err => {
        console.error("Failed to load flight log:", err);
        setError(t('student.loadErrorMsg'));
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => { loadFlights(); }, [loadFlights]);

  const filterOptions: FilterOption[] = [
    { key: "result", label: t('student.allResults'), options: [
      { value: "passed", label: t("passed") },
      { value: "failed", label: t("failed") },
    ]},
  ];

  const lessons = log?.lessons || [];
  const filteredLessons = lessons.filter(f => {
    if (filters.result) {
      if (filters.result === "passed" && !f.result?.toLowerCase().includes("pass")) return false;
      if (filters.result === "failed" && (!f.result || f.result.toLowerCase().includes("pass"))) return false;
    }
    if (search) {
      const searchLower = search.toLowerCase();
      const matchAircraft = f.aircraft?.toLowerCase().includes(searchLower) ?? false;
      const matchDate = f.date?.includes(search) ?? false;
      const matchDuration = String(f.duration ?? '').includes(search);
      if (!matchAircraft && !matchDate && !matchDuration) return false;
    }
    return true;
  });

  const downloadLogbookPDF = () => {
    if (!lessons.length) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(10, 22, 40);
    doc.text(t('student.logbookTitle'), 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    const studentRef = log?.student_name || user?.name || "";
    doc.text(`${t('common.student', 'Student')}: ${studentRef}${log?.student_number ? ` (${log.student_number})` : ""}`, 14, 28);
    doc.text(`${t('common.program', 'Program')}: ${log?.program || "—"}`, 14, 34);
    doc.setTextColor(100, 116, 139);
    doc.text(`${t('student.totalHoursLabel')} ${log?.total_flight_hours || 0}h  |  ${t('student.lessonsLabel')} ${log?.total_lessons || 0}`, 14, 40);

    const rows = lessons.map(l => [
      l.date,
      l.aircraft,
      `${l.duration}h`,
      l.grade ? `${l.grade}${l.result ? ` (${l.result})` : ''}` : '-'
    ]);

    autoTable(doc, {
      head: [[t("date"), t("aircraft"), t("duration"), t("common.grade")]],
      body: rows,
      startY: 46,
      theme: 'grid',
      headStyles: { fillColor: [196, 148, 60] },
      styles: { fontSize: 9, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 50 },
        2: { cellWidth: 30 },
        3: { cellWidth: 40 },
      },
    });

    doc.save('flight-logbook.pdf');
  };

  const handlePrintReport = async (id: string) => {
    setPrinting(true);
    try {
      const res = await api.download(`/flight-lessons/${id}/report/`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err: any) {
      console.error("Failed to generate report:", err);
    } finally {
      setPrinting(false);
    }
  };

  const columns: Column<FlightEntry>[] = [
    { key: "date", header: t('common.date') },
    { key: "aircraft", header: t("aircraft"), render: (item) => <span className="text-white font-medium">{item.aircraft}</span> },
    { key: "duration", header: t("duration"), render: (item) => <span>{item.duration}h</span> },
    { key: "grade", header: t('common.grade'), render: (item) => (
      <span className={item.grade && item.grade >= 7 ? "text-green-400 font-medium" : item.grade ? "text-red-400 font-medium" : "text-gray-500"}>{item.grade ?? "-"} {item.result && `(${item.result})`}</span>
    )},
  ];

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader
        title={t('student.flightLog')}
        backHref="/student/dashboard"
        backLabel={t('student.backToDashboard')}
        maxWidth="max-w-5xl"
        actions={lessons.length > 0 && (
          <button onClick={downloadLogbookPDF} className="px-4 py-2 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded-lg text-sm hover:bg-gold-500 hover:text-navy-900 transition-colors whitespace-nowrap">
            {t('student.downloadLogbook')}
          </button>
        )}
      />

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <LoadingSkeleton type="card" rows={3} />
        ) : error ? (
          <ErrorCard message={error} onRetry={loadFlights} />
        ) : !log || !log.lessons ? (
          <EmptyState message={t('student.noFlightDataMsg')} />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><p className="text-3xl font-bold text-white">{log.total_flight_hours || 0}h</p><p className="text-sm text-gray-400 mt-1">{t('student.totalFlightHours')}</p></div>
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><p className="text-3xl font-bold text-white">{log.total_lessons || 0}</p><p className="text-sm text-gray-400 mt-1">{t('student.lessonsCompleted')}</p></div>
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-5"><p className="text-3xl font-bold text-white">{(log.total_lessons > 0 ? ((log.total_flight_hours || 0) / log.total_lessons).toFixed(1) : "0")}h</p><p className="text-sm text-gray-400 mt-1">{t('student.avgPerLesson')}</p></div>
            </div>

            <FilterBar
              filters={filterOptions}
              values={filters}
              onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
              onClear={() => { setFilters({}); setSearch(""); }}
              searchPlaceholder={t('student.searchFlights')}
              searchValue={search}
              onSearchChange={setSearch}
            />

            <DataTable
              columns={columns}
              data={filteredLessons as any}
              keyField="date"
              onRowClick={(item) => setSelectedFlight(item as FlightEntry)}
              emptyMessage={t('student.noCompletedFlights')}
            />

            <ModalForm
              open={!!selectedFlight}
              onClose={() => setSelectedFlight(null)}
              title={t("student.flightDetail", "Flight Details")}
              footer={
                <div className="flex gap-3 justify-end">
                  {selectedFlight && (
                    <button onClick={() => handlePrintReport(selectedFlight.id)} disabled={printing} className="px-5 py-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-navy-900 rounded-lg text-sm font-semibold transition-colors">
                      {printing ? "..." : t("instructor.printReport", "Print Report")}
                    </button>
                  )}
                  <button onClick={() => setSelectedFlight(null)} className="px-5 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-sm transition-colors">
                    {t("close", "Close")}
                  </button>
                </div>
              }
            >
              {selectedFlight && (
                <div className="space-y-6">
                  <section>
                    <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">{t("common.details", "Details")}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <DetailField label={t("common.date")} value={selectedFlight.date} />
                      <DetailField label={t("aircraft")} value={selectedFlight.aircraft} />
                      <DetailField label={t("duration")} value={`${selectedFlight.duration}h`} />
                      <DetailField label={t("common.grade")} value={selectedFlight.grade != null ? `${selectedFlight.grade}${selectedFlight.result ? ` (${selectedFlight.result})` : ""}` : "-"} />
                      {selectedFlight.instructor_name && <DetailField label={t("common.instructor")} value={selectedFlight.instructor_name} />}
                      {selectedFlight.exercises_completed != null && <DetailField label={t("exercisesCompleted", "Exercises Completed")} value={String(selectedFlight.exercises_completed)} />}
                      {selectedFlight.competencies_acquired != null && <DetailField label={t("competenciesAcquired", "Competencies Acquired")} value={String(selectedFlight.competencies_acquired)} />}
                    </div>
                  </section>
                  {selectedFlight.observations && (
                    <section>
                      <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">{t("observations", "Observations")}</h3>
                      <p className="text-sm text-white leading-relaxed">{selectedFlight.observations}</p>
                    </section>
                  )}
                </div>
              )}
            </ModalForm>
          </>
        )}
      </main>
    </div>
  );
}
