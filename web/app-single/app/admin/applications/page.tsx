"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";

// ── Types ─────────────────────────────────────────────────

interface Application {
  id: string;
  application_number: string;
  student_name: string;
  student_id: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  notes: string | null;
  interview_date: string | null;
  test_date: string | null;
}

interface ApplicationStats {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
}

// ── Constants ─────────────────────────────────────────────

const STATUSES = ["pending", "submitted", "under_review", "accepted", "rejected", "withdrawn"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400",
  submitted: "bg-blue-500/10 text-blue-400",
  under_review: "bg-purple-500/10 text-purple-400",
  accepted: "bg-green-500/10 text-green-400",
  rejected: "bg-red-500/10 text-red-400",
  withdrawn: "bg-gray-500/10 text-gray-400",
};

// ── Sorting order for statuses ────────────────────────────

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  submitted: 1,
  under_review: 2,
  accepted: 3,
  rejected: 4,
  withdrawn: 5,
};

// ── Helpers ───────────────────────────────────────────────

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Component ─────────────────────────────────────────────

export default function AdminApplicationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // ── Filter state ──
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  // ── Review modal state ──
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [reviewForm, setReviewForm] = useState({
    status: "",
    notes: "",
    interview_date: "",
    test_date: "",
  });

  // ── Auth guard ──
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  // ── Data fetching ──
  const {
    data: applications,
    isLoading,
    error,
    refetch,
  } = useQuery<Application[]>({
    queryKey: ["admin-applications"],
    queryFn: async () => {
      const d = await api.get<any>("/applications/");
      return (d as any) || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  // ── Stats computed from data ──
  const stats = useMemo(() => ({
    total: (applications || []).length,
    pending: (applications || []).filter((a: Application) => a.status === 'pending').length,
    accepted: (applications || []).filter((a: Application) => a.status === 'accepted' || a.status === 'approved').length,
    rejected: (applications || []).filter((a: Application) => a.status === 'rejected').length,
  }), [applications]);

  // ── Review mutation ──
  const reviewMutation = useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      status: string;
      notes: string;
      interview_date: string;
      test_date: string;
    }) => {
      return api.post(`/applications/${id}/review/`, payload);
    },
    onSuccess: () => {
      showToast("success", "Application reviewed successfully");
      setReviewOpen(false);
      setSelectedApp(null);
      setReviewForm({ status: "", notes: "", interview_date: "", test_date: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin-applications-stats"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to review application");
    },
  });

  // ── Filtered data ──
  const filtered = useMemo(() => {
    if (!applications) return [];
    let r = applications;
    if (filterValues.status) r = r.filter((i) => i.status === filterValues.status);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter(
        (i) =>
          i.application_number?.toLowerCase().includes(q) ||
          i.student_name?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [applications, filterValues, searchValue]);

  // ── Open review modal ──
  const openReview = useCallback((app: Application) => {
    setSelectedApp(app);
    setReviewForm({
      status: app.status,
      notes: app.notes || "",
      interview_date: app.interview_date || "",
      test_date: app.test_date || "",
    });
    setReviewOpen(true);
  }, []);

  // ── Columns ──
  const columns: Column<Application>[] = useMemo(
    () => [
      {
        key: "application_number",
        header: "App #",
        render: (i) => (
          <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono">
            {i.application_number}
          </span>
        ),
      },
      { key: "student_name", header: t("common.name", "Student") },
      {
        key: "status",
        header: t("common.status", "Status"),
        render: (i) => (
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              STATUS_COLORS[i.status] || "bg-gray-500/10 text-gray-400"
            }`}
          >
            {formatStatus(i.status)}
          </span>
        ),
      },
      {
        key: "created_at",
        header: t("common.date", "Submitted"),
        render: (i) => (
          <span className="text-xs text-gray-500">
            {i.created_at ? new Date(i.created_at).toLocaleDateString() : "—"}
          </span>
        ),
      },
      {
        key: "reviewed_at",
        header: "Reviewed",
        render: (i) => (
          <span className="text-xs text-gray-500">
            {i.reviewed_at ? new Date(i.reviewed_at).toLocaleDateString() : "—"}
          </span>
        ),
      },
      {
        key: "actions",
        header: t("common.actions", "Actions"),
        sortable: false,
        render: (i) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openReview(i);
            }}
            className="text-xs px-3 py-1.5 rounded bg-gold-500/20 text-gold-500 hover:bg-gold-500/30 font-medium transition-colors"
          >
            Review
          </button>
        ),
      },
    ],
    [t, openReview]
  );

  // ── Stats bar ──
  const statsData = [
    { label: "Total", value: stats?.total ?? 0, color: "text-white" },
    { label: "Pending", value: stats?.pending ?? 0, color: "text-yellow-400" },
    { label: "Accepted", value: stats?.accepted ?? 0, color: "text-green-400" },
    { label: "Rejected", value: stats?.rejected ?? 0, color: "text-red-400" },
  ];

  // ── Render ──
  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="sticky top-0 bg-navy-800/95 backdrop-blur border-b border-navy-700 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MAA" width={110} height={110} />
            <div>
              <h1 className="text-lg font-bold text-white">
                {t("admin.applications", "Applications")}
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
            message={(error as any).message || "Failed to load applications"}
            onRetry={() => refetch()}
          />
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statsData.map((s) => (
            <div
              key={s.label}
              className="bg-navy-800 border border-navy-700 rounded-xl p-4"
            >
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {s.label}
              </p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>
                {isLoading ? "—" : s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <FilterBar
          filters={[
            {
              key: "status",
              label: "All Statuses",
              options: STATUSES.map((s) => ({
                value: s,
                label: formatStatus(s),
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
          searchPlaceholder="Search app # or student..."
        />

        {/* Table */}
        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message="No applications found."
            title={
              applications?.length === 0
                ? "No applications yet"
                : "No matching applications"
            }
          />
        ) : (
          <DataTable columns={columns} data={filtered} keyField="id" />
        )}

        {/* Review Modal */}
        <ModalForm
          open={reviewOpen}
          onClose={() => {
            setReviewOpen(false);
            setSelectedApp(null);
          }}
          title={`Review Application: ${selectedApp?.application_number || ""}`}
          footer={
            <>
              <button
                onClick={() => {
                  setReviewOpen(false);
                  setSelectedApp(null);
                }}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                onClick={() => {
                  if (!selectedApp) return;
                  reviewMutation.mutate({
                    id: selectedApp.id,
                    ...reviewForm,
                  });
                }}
                disabled={reviewMutation.isPending || !reviewForm.status}
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50"
              >
                {reviewMutation.isPending
                  ? "Saving..."
                  : t("common.save", "Save Review")}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Status
              </label>
              <select
                value={reviewForm.status}
                onChange={(e) =>
                  setReviewForm((f) => ({ ...f, status: e.target.value }))
                }
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="">Select status...</option>
                {["pending", "under_review", "accepted", "rejected"].map(
                  (s) => (
                    <option key={s} value={s}>
                      {formatStatus(s)}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Notes
              </label>
              <textarea
                value={reviewForm.notes}
                onChange={(e) =>
                  setReviewForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={3}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none resize-none"
                placeholder="Review notes..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Interview Date
                </label>
                <input
                  type="date"
                  value={reviewForm.interview_date}
                  onChange={(e) =>
                    setReviewForm((f) => ({
                      ...f,
                      interview_date: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Test Date
                </label>
                <input
                  type="date"
                  value={reviewForm.test_date}
                  onChange={(e) =>
                    setReviewForm((f) => ({
                      ...f,
                      test_date: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </ModalForm>
      </main>
    </div>
  );
}
