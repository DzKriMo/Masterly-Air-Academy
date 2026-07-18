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

// ── Types ─────────────────────────────────────────────────

interface Certificate {
  id: string;
  certificate_number: string;
  student_name: string;
  certificate_type: string;
  program: string;
  issue_date: string;
  status: string;
}

// ── Constants ─────────────────────────────────────────────

const TYPES = ["course_completion", "license", "rating", "endorsement", "medical"];
const PROGRAMS = ["PPL", "CPL", "IR", "MEP", "MCC", "ATPL"];
const STATUSES = ["issued", "pending", "revoked", "expired"];

const STATUS_COLORS: Record<string, string> = {
  issued: "bg-green-500/10 text-green-400",
  pending: "bg-amber-500/10 text-amber-400",
  revoked: "bg-red-500/10 text-red-400",
  expired: "bg-gray-500/10 text-gray-400",
};

const TYPE_COLORS: Record<string, string> = {
  course_completion: "bg-blue-500/10 text-blue-400",
  license: "bg-gold-500/10 text-gold-400",
  rating: "bg-purple-500/10 text-purple-400",
  endorsement: "bg-cyan-500/10 text-cyan-400",
  medical: "bg-green-500/10 text-green-400",
};

const fmtLabel = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return "—";
  }
}

// ── Component ─────────────────────────────────────────────

export default function AdminCertificatesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  // ── Filter state ──
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  // ── Auth guard ──
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  // ── Query ──
  const {
    data: certificates,
    isLoading,
    error,
    refetch,
  } = useQuery<Certificate[]>({
    queryKey: ["admin-certificates"],
    queryFn: async () => {
      const d = await api.get<any>("/certificates/");
      return (d as any) ?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  // ── Filtered data ──
  const filtered = useMemo(() => {
    if (!certificates) return [];
    let r = certificates;
    if (filterValues.certificate_type)
      r = r.filter((c) => c.certificate_type === filterValues.certificate_type);
    if (filterValues.program)
      r = r.filter((c) => c.program === filterValues.program);
    if (filterValues.status)
      r = r.filter((c) => c.status === filterValues.status);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter(
        (c) =>
          c.student_name?.toLowerCase().includes(q) ||
          c.certificate_number?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [certificates, filterValues, searchValue]);

  // ── Columns ──
  const columns: Column<Certificate>[] = useMemo(
    () => [
      {
        key: "certificate_number",
        header: "Certificate #",
        render: (c) => (
          <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono font-semibold">
            {c.certificate_number}
          </span>
        ),
      },
      { key: "student_name", header: t("common.name", "Student") },
      {
        key: "certificate_type",
        header: "Type",
        render: (c) => (
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              TYPE_COLORS[c.certificate_type] || "bg-gray-500/10 text-gray-400"
            }`}
          >
            {fmtLabel(c.certificate_type)}
          </span>
        ),
      },
      { key: "program", header: "Program" },
      {
        key: "issue_date",
        header: "Issue Date",
        render: (c) => (
          <span className="text-xs text-gray-400">
            {formatDate(c.issue_date)}
          </span>
        ),
      },
      {
        key: "status",
        header: t("common.status", "Status"),
        render: (c) => (
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              STATUS_COLORS[c.status] || "bg-gray-500/10 text-gray-400"
            }`}
          >
            {fmtLabel(c.status)}
          </span>
        ),
      },
    ],
    [t]
  );

  // ── Stats ──
  const stats = useMemo(() => {
    if (!certificates) return { total: 0, issued: 0, pending: 0 };
    return {
      total: certificates.length,
      issued: certificates.filter((c) => c.status === "issued").length,
      pending: certificates.filter((c) => c.status === "pending").length,
    };
  }, [certificates]);

  // ── Render ──
  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110} />
            <div>
              <h1 className="text-lg font-bold text-white">
                {t("admin.certificates", "Certificates")}
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
            message={(error as any)?.message || "Failed to load certificates"}
            onRetry={() => refetch()}
          />
        )}

        {/* Stats Bar */}
        {!isLoading && certificates && certificates.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total Certificates</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Issued</p>
              <p className="text-2xl font-bold text-green-400 mt-1">{stats.issued}</p>
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Pending</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{stats.pending}</p>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <FilterBar
          filters={[
            {
              key: "certificate_type",
              label: "All Types",
              options: TYPES.map((t) => ({
                value: t,
                label: fmtLabel(t),
              })),
            },
            {
              key: "program",
              label: "All Programs",
              options: PROGRAMS.map((p) => ({
                value: p,
                label: p,
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
          searchPlaceholder="Search student name or certificate #..."
        />

        {/* Table */}
        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              certificates?.length === 0
                ? "No certificates have been issued yet."
                : "No certificates match your filters."
            }
            title={
              certificates?.length === 0
                ? "No certificates yet"
                : "No matching certificates"
            }
          />
        ) : (
          <DataTable columns={columns} data={filtered} keyField="id" />
        )}
      </main>
    </div>
  );
}
