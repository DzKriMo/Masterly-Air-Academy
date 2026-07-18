"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
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

interface SubjectModule {
  id: string;
  code: string;
  title: string;
  hours: number;
}

interface Subject {
  id: string;
  code: string;
  title_en: string;
  title_ar?: string;
  title_fr?: string;
  program: string;
  total_hours: number;
  status: string;
  modules_count?: number;
  modules?: SubjectModule[];
}

// ── Constants ─────────────────────────────────────────────

const PROGRAMS = ["PPL", "CPL", "IR", "MEP", "MCC", "ATPL"];
const STATUSES = ["active", "inactive", "draft"];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-400",
  inactive: "bg-gray-500/10 text-gray-400",
  draft: "bg-amber-500/10 text-amber-400",
};

// ── Component ─────────────────────────────────────────────

export default function AdminSubjectsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  // ── Filter state ──
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  // ── Detail modal state ──
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // ── Auth guard ──
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  // ── Query ──
  const {
    data: subjects,
    isLoading,
    error,
    refetch,
  } = useQuery<Subject[]>({
    queryKey: ["admin-subjects"],
    queryFn: async () => {
      const d = await api.get<any>("/subjects/");
      return (d as any) ?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  // ── Filtered data ──
  const filtered = useMemo(() => {
    if (!subjects) return [];
    let r = subjects;
    if (filterValues.program)
      r = r.filter((s) => s.program === filterValues.program);
    if (filterValues.status)
      r = r.filter((s) => s.status === filterValues.status);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter(
        (s) =>
          s.code?.toLowerCase().includes(q) ||
          s.title_en?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [subjects, filterValues, searchValue]);

  // ── Open detail ──
  const openDetail = useCallback((subject: Subject) => {
    setSelectedSubject(subject);
    setDetailOpen(true);
  }, []);

  // ── Columns ──
  const columns: Column<Subject>[] = useMemo(
    () => [
      {
        key: "code",
        header: "Code",
        render: (s) => (
          <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono font-semibold">
            {s.code}
          </span>
        ),
      },
      {
        key: "title_en",
        header: t("common.title", "Title (EN)"),
        render: (s) => (
          <div>
            <p className="text-sm text-white">{s.title_en}</p>
            {s.title_fr && (
              <p className="text-xs text-gray-500">{s.title_fr}</p>
            )}
          </div>
        ),
      },
      { key: "program", header: "Program" },
      {
        key: "total_hours",
        header: "Total Hours",
        render: (s) => (
          <span className="text-sm text-white font-mono">{s.total_hours}</span>
        ),
      },
      {
        key: "status",
        header: t("common.status", "Status"),
        render: (s) => (
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              STATUS_COLORS[s.status] || "bg-gray-500/10 text-gray-400"
            }`}
          >
            {s.status ? s.status.charAt(0).toUpperCase() + s.status.slice(1) : "—"}
          </span>
        ),
      },
      {
        key: "modules_count",
        header: "Modules",
        render: (s) => (
          <span className="text-sm text-white font-mono">
            {s.modules_count ?? s.modules?.length ?? 0}
          </span>
        ),
      },
    ],
    [t]
  );

  // ── Render ──
  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110} />
            <div>
              <h1 className="text-lg font-bold text-white">
                {t("admin.subjects", "Subjects")}
              </h1>
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="text-xs text-gray-500 hover:text-gold-500"
              >
                {t("common.back", "Back to Dashboard")}
              </button>
            </div>
          </div>
          <a
            href="/django-admin/subjects/"
            target="_blank"
            className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors"
          >
            + {t("common.create", "Create Subject")}
          </a>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Error */}
        {error && (
          <ErrorCard
            message={(error as any)?.message || "Failed to load subjects"}
            onRetry={() => refetch()}
          />
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
              key: "status",
              label: "All Statuses",
              options: STATUSES.map((s) => ({
                value: s,
                label: s.charAt(0).toUpperCase() + s.slice(1),
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
              subjects?.length === 0
                ? "No subjects have been created yet."
                : "No subjects match your filters."
            }
            title={
              subjects?.length === 0 ? "No subjects yet" : "No matching subjects"
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            keyField="id"
            onRowClick={openDetail}
          />
        )}

        {/* Detail Modal */}
        <ModalForm
          open={detailOpen}
          onClose={() => {
            setDetailOpen(false);
            setSelectedSubject(null);
          }}
          title={`Subject: ${selectedSubject?.code || ""}`}
          wide
          footer={
            <>
              <button
                onClick={() => {
                  setDetailOpen(false);
                  setSelectedSubject(null);
                }}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white"
              >
                {t("common.close", "Close")}
              </button>
              <a
                href={
                  selectedSubject
                    ? `/django-admin/subjects/${selectedSubject.id}/change/`
                    : "/django-admin/subjects/"
                }
                target="_blank"
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors"
              >
                Edit in Django Admin
              </a>
            </>
          }
        >
          {selectedSubject && (
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">
                  Subject Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Code" value={selectedSubject.code} />
                  <DetailField
                    label="Status"
                    value={
                      selectedSubject.status
                        ? selectedSubject.status.charAt(0).toUpperCase() +
                          selectedSubject.status.slice(1)
                        : "—"
                    }
                  />
                  <div className="col-span-2">
                    <DetailField
                      label="Title (EN)"
                      value={selectedSubject.title_en}
                    />
                  </div>
                  {selectedSubject.title_fr && (
                    <div className="col-span-2">
                      <DetailField
                        label="Title (FR)"
                        value={selectedSubject.title_fr}
                      />
                    </div>
                  )}
                  {selectedSubject.title_ar && (
                    <div className="col-span-2">
                      <DetailField
                        label="Title (AR)"
                        value={selectedSubject.title_ar}
                      />
                    </div>
                  )}
                  <DetailField label="Program" value={selectedSubject.program} />
                  <DetailField
                    label="Total Hours"
                    value={String(selectedSubject.total_hours)}
                  />
                </div>
              </section>

              {/* Modules */}
              {selectedSubject.modules && selectedSubject.modules.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gold-500 mb-3 uppercase tracking-wider">
                    Modules
                  </h3>
                  <div className="overflow-hidden rounded-lg border border-navy-700">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-navy-800">
                          <th className="text-left px-4 py-2 text-gray-400 font-medium">
                            Code
                          </th>
                          <th className="text-left px-4 py-2 text-gray-400 font-medium">
                            Title
                          </th>
                          <th className="text-left px-4 py-2 text-gray-400 font-medium">
                            Hours
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSubject.modules.map((mod) => (
                          <tr
                            key={mod.id}
                            className="border-t border-navy-700 hover:bg-navy-800/50"
                          >
                            <td className="px-4 py-2 text-gold-500 font-mono text-xs">
                              {mod.code}
                            </td>
                            <td className="px-4 py-2 text-white">{mod.title}</td>
                            <td className="px-4 py-2 text-white font-mono">
                              {mod.hours}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}
        </ModalForm>
      </main>
    </div>
  );
}

// ── Detail Field Sub-component ───────────────────────────

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}
