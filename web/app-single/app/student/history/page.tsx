"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import type { FilterOption } from "@/components/filter-bar";

/* ── Types ────────────────────────────────────────── */
interface HistoryEvent {
  id: string;
  event_type: "exam" | "progress_check" | "skill_test" | "certificate";
  date: string;
  title: string;
  subject?: string;
  grade?: number;
  is_passed?: boolean;
  examiner?: string;
  result?: string;
  certificate_type?: string;
  download_url?: string;
}

interface HistoryResponse {
  events: HistoryEvent[];
  student: { name: string; program: string };
}

/* ── Event config ─────────────────────────────────── */
const EVENT_META: Record<string, { label: string; icon: string; color: string; bg: string; border: string; dot: string }> = {
  exam: {
    label: "Exam",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
  },
  progress_check: {
    label: "Progress Check",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    dot: "bg-yellow-500",
  },
  skill_test: {
    label: "Skill Test",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    dot: "bg-purple-500",
  },
  certificate: {
    label: "Certificate",
    icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    dot: "bg-green-500",
  },
};

/* ── Component ────────────────────────────────────── */
export default function StudentHistoryPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [studentInfo, setStudentInfo] = useState<{ name: string; program: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/student/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const loadData = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    api
      .get<HistoryResponse>("/students/me/history/")
      .then((data) => {
        setEvents(data.events || []);
        setStudentInfo(data.student || null);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load history:", err);
        setError(t("student.historyLoadError", "Failed to load academic history. Please try again."));
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Filters ──────────────────────────────────── */
  const filterOptions: FilterOption[] = [
    {
      key: "event_type",
      label: t("common.allTypes", "All Types"),
      options: [
        { value: "exam", label: t("history.exam", "Exam") },
        { value: "progress_check", label: t("history.progressCheck", "Progress Check") },
        { value: "skill_test", label: t("history.skillTest", "Skill Test") },
        { value: "certificate", label: t("history.certificate", "Certificate") },
      ],
    },
  ];

  const filteredEvents = events.filter((e) => {
    if (filters.event_type && e.event_type !== filters.event_type) return false;
    if (search && !e.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  /* ── Sort chronologically (newest first) ──────── */
  const sorted = [...filteredEvents].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  /* ── Render helpers ───────────────────────────── */
  const getMeta = (type: string) =>
    EVENT_META[type] || EVENT_META.exam;

  const renderEventIcon = (meta: typeof EVENT_META.exam) => (
    <svg
      className={`w-5 h-5 ${meta.color}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={meta.icon} />
    </svg>
  );

  const renderEventDetails = (ev: HistoryEvent) => {
    const parts: React.ReactNode[] = [];
    if (ev.subject) {
      parts.push(
        <span key="subject" className="text-xs text-gray-500">
          {ev.subject}
        </span>
      );
    }
    if (ev.grade !== undefined && ev.grade !== null) {
      parts.push(
        <span
          key="grade"
          className={`text-sm font-bold ${
            ev.is_passed ? "text-green-400" : "text-red-400"
          }`}
        >
          {ev.grade}%
        </span>
      );
    }
    if (ev.is_passed !== undefined && ev.is_passed !== null) {
      parts.push(
        <span
          key="badge"
          className={`text-xs px-2 py-0.5 rounded font-medium ${
            ev.is_passed
              ? "bg-green-500/10 text-green-400 border border-green-500/30"
              : "bg-red-500/10 text-red-400 border border-red-500/30"
          }`}
        >
          {ev.is_passed ? t("exams_passed", "Pass") : t("exams_failed", "Fail")}
        </span>
      );
    }
    if (ev.examiner) {
      parts.push(
        <span key="examiner" className="text-xs text-gray-500">
          {t("history.examiner", "Examiner")}: {ev.examiner}
        </span>
      );
    }
    if (ev.result) {
      parts.push(
        <span key="result" className="text-xs text-gray-500">
          {ev.result}
        </span>
      );
    }
    if (ev.certificate_type) {
      parts.push(
        <span
          key="cert-type"
          className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded"
        >
          {ev.certificate_type}
        </span>
      );
    }
    if (ev.download_url) {
      parts.push(
        <a
          key="download"
          href={ev.download_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gold-500 hover:text-gold-400 underline flex items-center gap-1"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          {t("certificate.downloadPdf", "Download PDF")}
        </a>
      );
    }
    return parts;
  };

  /* ── Render ────────────────────────────────────── */
  return (
    <div className="flex-1 min-w-0">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">
            {t("student.history", "Academic History")}
          </h1>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {error && <ErrorCard message={error} onRetry={loadData} />}

        {loading ? (
          <LoadingSkeleton type="card" rows={5} />
        ) : (
          <>
            {/* Header with student info */}
            {studentInfo && (
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-6">
                <h2 className="text-xl font-bold text-white">
                  {studentInfo.name || user?.name || t("student.history", "Academic History")}
                </h2>
                {studentInfo.program && (
                  <span className="inline-block mt-2 text-xs text-gold-500 bg-gold-500/10 px-3 py-1 rounded-full border border-gold-500/30 font-semibold">
                    {studentInfo.program}
                  </span>
                )}
              </div>
            )}

            {/* FilterBar */}
            <FilterBar
              filters={filterOptions}
              values={filters}
              onChange={(key, value) =>
                setFilters((prev) => ({ ...prev, [key]: value }))
              }
              onClear={() => {
                setFilters({});
                setSearch("");
              }}
              searchPlaceholder={t("history.search", "Search by title...")}
              searchValue={search}
              onSearchChange={setSearch}
            />

            {/* Timeline */}
            {sorted.length === 0 ? (
              <EmptyState
                message={t(
                  "history.noEvents",
                  "No academic history events found."
                )}
              />
            ) : (
              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-navy-700" />

                <div className="space-y-0">
                  {sorted.map((ev) => {
                    const meta = getMeta(ev.event_type);
                    return (
                      <div key={ev.id} className="relative flex items-start gap-5 pb-8 last:pb-0">
                        {/* Timeline dot */}
                        <div className="relative z-10 shrink-0">
                          <div
                            className={`w-10 h-10 rounded-full ${meta.bg} ${meta.border} border flex items-center justify-center`}
                          >
                            {renderEventIcon(meta)}
                          </div>
                        </div>

                        {/* Event card */}
                        <div className="flex-1 min-w-0 bg-navy-800 border border-navy-700 rounded-xl p-5 hover:bg-navy-700/50 transition-colors">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h3 className="text-white font-bold text-base">
                              {ev.title}
                            </h3>
                            <span
                              className={`shrink-0 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded ${meta.bg} ${meta.color} ${meta.border} border`}
                            >
                              {meta.label}
                            </span>
                          </div>

                          <p className="text-xs text-gray-500 mb-3">
                            {new Date(ev.date).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>

                          {/* Details row */}
                          <div className="flex flex-wrap items-center gap-3">
                            {renderEventDetails(ev)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
