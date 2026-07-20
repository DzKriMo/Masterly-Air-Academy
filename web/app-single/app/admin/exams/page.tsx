"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";

// ── Types ─────────────────────────────────────────────────

interface Exam {
  id: string;
  code: string;
  title: string;
  subject?: string;
  program: string;
  exam_type: string;
  questions_count?: number;
  status: string;
}

// ── Constants ─────────────────────────────────────────────

const PROGRAMS = ["PPL", "CPL", "IR", "MEP", "MCC", "ATPL"];
const TYPES = ["theory", "practical", "mock", "final"];
const STATUSES = ["active", "inactive", "draft"];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-400",
  inactive: "bg-gray-500/10 text-gray-400",
  draft: "bg-amber-500/10 text-amber-400",
};

const TYPE_COLORS: Record<string, string> = {
  theory: "bg-blue-500/10 text-blue-400",
  practical: "bg-purple-500/10 text-purple-400",
  mock: "bg-cyan-500/10 text-cyan-400",
  final: "bg-red-500/10 text-red-400",
};

const fmtLabel = (s: string) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

// ── Component ─────────────────────────────────────────────

export default function AdminExamsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  // ── Filter state ──
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  // ── Detail modal ──
  const [selected, setSelected] = useState<Exam | null>(null);

  // ── Auth guard ──
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  // ── Query ──
  const {
    data: exams,
    isLoading,
    error,
    refetch,
  } = useQuery<Exam[]>({
    queryKey: ["admin-exams"],
    queryFn: async () => {
      const d = await api.get<any>("/exams/");
      return (d as any) ?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  // ── Filtered data ──
  const filtered = useMemo(() => {
    if (!exams) return [];
    let r = exams;
    if (filterValues.program)
      r = r.filter((e) => e.program === filterValues.program);
    if (filterValues.exam_type)
      r = r.filter((e) => e.exam_type === filterValues.exam_type);
    if (filterValues.status)
      r = r.filter((e) => e.status === filterValues.status);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter(
        (e) =>
          e.code?.toLowerCase().includes(q) ||
          e.title?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [exams, filterValues, searchValue]);

  // ── Columns ──
  const columns: Column<Exam>[] = useMemo(
    () => [
      {
        key: "code",
        header: "Code",
        render: (e) => (
          <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono font-semibold">
            {e.code}
          </span>
        ),
      },
      { key: "title", header: t("common.title", "Title") },
      { key: "subject", header: "Subject" },
      { key: "program", header: "Program" },
      {
        key: "exam_type",
        header: "Type",
        render: (e) => (
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              TYPE_COLORS[e.exam_type] || "bg-gray-500/10 text-gray-400"
            }`}
          >
            {fmtLabel(e.exam_type)}
          </span>
        ),
      },
      {
        key: "questions_count",
        header: "Questions",
        render: (e) => (
          <span className="text-sm text-white font-mono">
            {e.questions_count ?? 0}
          </span>
        ),
      },
      {
        key: "status",
        header: t("common.status", "Status"),
        render: (e) => (
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              STATUS_COLORS[e.status] || "bg-gray-500/10 text-gray-400"
            }`}
          >
            {fmtLabel(e.status)}
          </span>
        ),
      },
    ],
    [t]
  );

  // ── Stats ──
  const stats = useMemo(() => {
    if (!exams) return { total: 0, theory: 0, practical: 0, mock: 0, final: 0 };
    return {
      total: exams.length,
      theory: exams.filter((e) => e.exam_type === "theory").length,
      practical: exams.filter((e) => e.exam_type === "practical").length,
      mock: exams.filter((e) => e.exam_type === "mock").length,
      final: exams.filter((e) => e.exam_type === "final").length,
    };
  }, [exams]);

  // ── Render ──
  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110} />
            <div>
              <h1 className="text-lg font-bold text-white">
                {t("admin.exams", "Exams")}
              </h1>
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="text-xs text-gray-500 hover:text-gold-500"
              >
                {t("common.back", "Back to Dashboard")}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Error */}
        {error && (
          <ErrorCard
            message={(error as any)?.message || "Failed to load exams"}
            onRetry={() => refetch()}
          />
        )}

        {/* Stats Bar */}
        {!isLoading && exams && exams.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total Exams</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Theory</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">{stats.theory}</p>
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Practical</p>
              <p className="text-2xl font-bold text-purple-400 mt-1">{stats.practical}</p>
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Mock</p>
              <p className="text-2xl font-bold text-cyan-400 mt-1">{stats.mock}</p>
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Final</p>
              <p className="text-2xl font-bold text-red-400 mt-1">{stats.final}</p>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <FilterBar
          filters={[
            {
              key: "program",
              label: "All Programs",
              options: PROGRAMS.map((p) => ({
                value: p,
                label: p,
              })),
            },
            {
              key: "exam_type",
              label: "All Types",
              options: TYPES.map((t) => ({
                value: t,
                label: fmtLabel(t),
              })),
            },
            {
              key: "status",
              label: "All Statuses",
              options: STATUSES.map((s) => ({
                value: s,
                label: fmtLabel(s),
              })),
            },
          ]}
          values={filterValues}
          onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))}
          onClear={() => {
            setFilterValues({});
            setSearchValue("");
          }}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search code or title..."
        />

        {/* Table */}
        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              exams?.length === 0
                ? "No exams have been created yet."
                : "No exams match your filters."
            }
            title={exams?.length === 0 ? "No exams yet" : "No matching exams"}
          />
        ) : (
          <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(item) => setSelected(item as Exam)} />
        )}

        {/* Detail Modal */}
        <ModalForm
          open={!!selected}
          onClose={() => setSelected(null)}
          title={`Exam: ${selected?.title || selected?.code || ""}`}
          wide
          footer={
            <button
              onClick={() => setSelected(null)}
              className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white"
            >
              {t("common.close", "Close")}
            </button>
          }
        >
          {selected && (
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">
                  Exam Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Code" value={selected.code} />
                  <DetailField
                    label="Status"
                    value={
                      selected.status
                        ? selected.status.charAt(0).toUpperCase() +
                          selected.status.slice(1)
                        : "—"
                    }
                  />
                  <div className="col-span-2">
                    <DetailField label="Title" value={selected.title} />
                  </div>
                  <DetailField label="Program" value={selected.program} />
                  <DetailField
                    label="Exam Type"
                    value={
                      selected.exam_type
                        ? selected.exam_type
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase())
                        : "—"
                    }
                  />
                  <DetailField
                    label="Subject"
                    value={selected.subject || "—"}
                  />
                  <DetailField
                    label="Questions"
                    value={String(selected.questions_count ?? 0)}
                  />
                </div>
              </section>
            </div>
          )}
        </ModalForm>
      </main>
    </div>
  );
}

// ── Detail Field ──────────────────────────────────────────

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}
