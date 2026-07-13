"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FlightEntry { date: string; aircraft: string; duration: number; grade: number | null; result: string | null; }

export default function StudentFlightsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [log, setLog] = useState<{ total_flight_hours: number; total_lessons: number; lessons: FlightEntry[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) { router.push("/student/login"); return; }
  }, [isLoading, isAuthenticated, router]);

  const loadFlights = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    api.get<{ total_flight_hours: number; total_lessons: number; lessons: FlightEntry[] }>("/students/flight-log/")
      .then(data => {
        const payload = (data as unknown as { total_flight_hours: number; total_lessons: number; lessons: FlightEntry[] });
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
    if (search && !f.aircraft.toLowerCase().includes(search.toLowerCase()) && !f.date.includes(search)) return false;
    return true;
  });

  const downloadLogbookPDF = () => {
    if (!lessons.length) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(10, 22, 40);
    doc.text(t('student.logbookTitle'), 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`${t('student.totalHoursLabel')} ${log?.total_flight_hours || 0}h  |  ${t('student.lessonsLabel')} ${log?.total_lessons || 0}`, 14, 28);

    const rows = lessons.map(l => [
      l.date,
      l.aircraft,
      `${l.duration}h`,
      l.grade ? `${l.grade}${l.result ? ` (${l.result})` : ''}` : '-'
    ]);

    autoTable(doc, {
      head: [[t("date"), t("aircraft"), t("duration"), t("common.grade")]],
      body: rows,
      startY: 34,
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
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-3">
          <Image src="/logo.png" alt="MAA" width={110} height={110} />
          <div><h1 className="text-lg font-bold text-white">{t('student.flightLog')}</h1>
            <button onClick={() => router.push("/student/dashboard")} className="text-xs text-gray-500 hover:text-gold-500">{t('student.backToDashboard')}</button></div>
          {lessons.length > 0 && (
            <button onClick={downloadLogbookPDF} className="ml-auto px-4 py-2 bg-gold-500/10 border border-gold-500/30 text-gold-500 rounded-lg text-sm hover:bg-gold-500 hover:text-navy-900 transition-colors whitespace-nowrap">
              {t('student.downloadLogbook')}
            </button>
          )}
        </div>
      </nav>

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
              emptyMessage={t('student.noCompletedFlights')}
            />
          </>
        )}
      </main>
    </div>
  );
}
