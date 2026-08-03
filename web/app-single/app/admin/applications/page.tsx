"use client";
import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useTranslation } from "@/lib/use-translation";
import { PageHeader } from "@/components/page-header";
import { api, unwrapResults, withFullLimit } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable, Column } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { ModalForm } from "@/components/modal-form";
import { useToast } from "@/components/toast";
import { generateStrongPassword, copyToClipboard } from "@/lib/password";

// ── Types ─────────────────────────────────────────────────

interface Application {
  id: string;
  application_number: string;
  student_name: string;
  student: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  notes: string | null;
  interview_date: string | null;
  test_date: string | null;
  documents: Record<string, string>[];
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

function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// ── Component ─────────────────────────────────────────────

export default function AdminApplicationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading);
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

  // ── Detail modal state ──
  const [detailApp, setDetailApp] = useState<Application | null>(null);
  const [reviewForm, setReviewForm] = useState({
    status: "",
    notes: "",
    interview_date: "",
    test_date: "",
    activate_student: false,
    student_email: "",
    student_username: "",
    student_password: "",
  });

  // ── Auth guard ──

  // ── Data fetching ──
  const {
    data: applications,
    isLoading,
    error,
    refetch,
  } = useQuery<Application[]>({
    queryKey: ["admin-applications"],
    queryFn: async () => {
      const d = await api.get<any>(withFullLimit("/applications/"));
      return unwrapResults(d);
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
      activate_student?: boolean;
      student_email?: string;
      student_username?: string;
      student_password?: string;
    }) => {
      return api.post(`/applications/${id}/review/`, payload);
    },
    onSuccess: (data: any, variables) => {
      if (variables.activate_student) {
        showToast("success", "Application accepted and student account created");
      } else {
        showToast("success", "Application reviewed successfully");
      }
      setReviewOpen(false);
      setSelectedApp(null);
      setReviewForm({ status: "", notes: "", interview_date: "", test_date: "", activate_student: false, student_email: "", student_username: "", student_password: "" });
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
    const doc = app.documents?.[0] || {};
    const email = doc.email || "";
    setSelectedApp(app);
    setReviewForm({
      status: app.status,
      notes: app.notes || "",
      interview_date: toDateInputValue(app.interview_date),
      test_date: toDateInputValue(app.test_date),
      activate_student: false,
      student_email: email,
      student_username: email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_"),
      student_password: "",
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
        key: "submitted_at",
        header: t("common.date", "Submitted"),
        render: (i) => (
          <span className="text-xs text-gray-500">
            {i.submitted_at ? new Date(i.submitted_at).toLocaleDateString() : "—"}
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
        render: (i) => {
          const disabled = ["accepted", "rejected"].includes(i.status);
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openReview(i);
              }}
              disabled={disabled}
              className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${
                disabled
                  ? "bg-gray-500/10 text-gray-500 cursor-not-allowed"
                  : "bg-gold-500/20 text-gold-500 hover:bg-gold-500/30"
              }`}
            >
              Review
            </button>
          );
        },
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
      <PageHeader title={t("admin.applications", "Applications")} backHref="/admin/dashboard" backLabel={t("common.back", "Back to Dashboard")} />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Error */}
        {error && (
          <ErrorCard
            message={error?.message || "Failed to load applications"}
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
          <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(item) => setDetailApp(item as Application)} />
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
                  if (
                    reviewForm.status === "accepted" &&
                    reviewForm.activate_student &&
                    (!reviewForm.student_password || reviewForm.student_password.length < 8)
                  ) {
                    showToast("error", "A password of at least 8 characters is required");
                    return;
                  }
                  reviewMutation.mutate({
                    id: selectedApp.id,
                    status: reviewForm.status,
                    notes: reviewForm.notes,
                    interview_date: reviewForm.interview_date,
                    test_date: reviewForm.test_date,
                    activate_student: reviewForm.activate_student,
                    student_email: reviewForm.student_email,
                    student_username: reviewForm.student_username,
                    student_password: reviewForm.student_password,
                  });
                }}
                disabled={reviewMutation.isPending || !reviewForm.status}
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50"
              >
                {reviewMutation.isPending
                  ? "Saving..."
                  : reviewForm.status === "accepted" && reviewForm.activate_student
                  ? "Accept & Create Account"
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
            {reviewForm.status === "accepted" && (
              <div className="border-t border-navy-700 pt-4 space-y-4">
                <label className="flex items-center gap-3 p-3 bg-navy-900 border border-navy-700 rounded-lg cursor-pointer hover:border-gold-500/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={reviewForm.activate_student}
                    onChange={(e) =>
                      setReviewForm((f) => ({ ...f, activate_student: e.target.checked }))
                    }
                    className="w-4 h-4 accent-gold-500"
                  />
                  <div>
                    <p className="text-sm text-white font-medium">Create Student Account</p>
                    <p className="text-xs text-gray-500">Promote candidate to active student and set credentials</p>
                  </div>
                </label>

                {reviewForm.activate_student && (
                  <div className="space-y-4 bg-navy-900/60 border border-navy-700 rounded-lg p-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Email</label>
                      <input
                        type="email"
                        value={reviewForm.student_email}
                        onChange={(e) =>
                          setReviewForm((f) => ({ ...f, student_email: e.target.value }))
                        }
                        className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Username</label>
                      <input
                        type="text"
                        value={reviewForm.student_username}
                        onChange={(e) =>
                          setReviewForm((f) => ({ ...f, student_username: e.target.value }))
                        }
                        className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Password <span className="text-red-400">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={reviewForm.student_password}
                          onChange={(e) =>
                            setReviewForm((f) => ({ ...f, student_password: e.target.value }))
                          }
                          placeholder="Min. 8 characters"
                          className="flex-1 px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white placeholder-gray-600 focus:border-gold-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const pw = generateStrongPassword();
                            setReviewForm((f) => ({ ...f, student_password: pw }));
                            if (await copyToClipboard(pw)) {
                              showToast("success", "Strong password generated and copied to clipboard");
                            } else {
                              showToast("success", "Strong password generated");
                            }
                          }}
                          className="px-3 py-2 text-xs rounded-lg bg-navy-700 text-gold-400 hover:bg-navy-600 font-medium whitespace-nowrap transition-colors"
                          title="Generate strong password"
                        >
                          Generate
                        </button>
                        {reviewForm.student_password && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (await copyToClipboard(reviewForm.student_password)) {
                                showToast("success", "Password copied to clipboard");
                              } else {
                                showToast("error", "Could not copy password");
                              }
                            }}
                            className="px-3 py-2 text-xs rounded-lg bg-navy-700 text-gray-300 hover:bg-navy-600 font-medium whitespace-nowrap transition-colors"
                            title="Copy password"
                          >
                            Copy
                          </button>
                        )}
                      </div>
                      {reviewForm.student_password.length > 0 && reviewForm.student_password.length < 8 && (
                        <p className="text-xs text-red-400 mt-1">
                          Password must be at least 8 characters
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ModalForm>

        {/* Detail Modal */}
        <ModalForm
          open={detailApp !== null}
          onClose={() => setDetailApp(null)}
          title={`Application: ${detailApp?.application_number || ""}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Application #</label>
              <p className="text-white">{detailApp?.application_number || "—"}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Student Name</label>
              <p className="text-white">{detailApp?.student_name || "—"}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              {detailApp?.status ? (
                <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[detailApp.status] || "bg-gray-500/10 text-gray-400"}`}>
                  {formatStatus(detailApp.status)}
                </span>
              ) : (
                <p className="text-white">—</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Submitted At</label>
              <p className="text-white">{detailApp?.submitted_at ? new Date(detailApp.submitted_at).toLocaleDateString() : "—"}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Reviewed At</label>
              <p className="text-white">{detailApp?.reviewed_at ? new Date(detailApp.reviewed_at).toLocaleDateString() : "—"}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Interview Date</label>
              <p className="text-white">{detailApp?.interview_date ? new Date(detailApp.interview_date).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" }) : "—"}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Test Date</label>
              <p className="text-white">{detailApp?.test_date ? new Date(detailApp.test_date).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" }) : "—"}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Notes</label>
              <p className="text-white">{detailApp?.notes || "—"}</p>
            </div>
            {detailApp?.documents?.[0] && (
              <div className="border-t border-navy-700 pt-4">
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Form Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  {detailApp.documents[0].gender && (
                    <div>
                      <label className="block text-xs text-gray-500">Gender</label>
                      <p className="text-sm text-white">{detailApp.documents[0].gender}</p>
                    </div>
                  )}
                  {detailApp.documents[0].date_of_birth && (
                    <div>
                      <label className="block text-xs text-gray-500">Date of Birth</label>
                      <p className="text-sm text-white">{detailApp.documents[0].date_of_birth}</p>
                    </div>
                  )}
                  {detailApp.documents[0].nationality && (
                    <div>
                      <label className="block text-xs text-gray-500">Nationality</label>
                      <p className="text-sm text-white">{detailApp.documents[0].nationality}</p>
                    </div>
                  )}
                  {detailApp.documents[0].email && (
                    <div>
                      <label className="block text-xs text-gray-500">Email</label>
                      <p className="text-sm text-white">{detailApp.documents[0].email}</p>
                    </div>
                  )}
                  {detailApp.documents[0].phone && (
                    <div>
                      <label className="block text-xs text-gray-500">Phone</label>
                      <p className="text-sm text-white">{detailApp.documents[0].phone}</p>
                    </div>
                  )}
                  {detailApp.documents[0].program && (
                    <div>
                      <label className="block text-xs text-gray-500">Program</label>
                      <p className="text-sm text-white">{detailApp.documents[0].program}</p>
                    </div>
                  )}
                  {detailApp.documents[0].english_proficiency && (
                    <div>
                      <label className="block text-xs text-gray-500">English Proficiency</label>
                      <p className="text-sm text-white">{detailApp.documents[0].english_proficiency}</p>
                    </div>
                  )}
                  {detailApp.documents[0].education_level && (
                    <div>
                      <label className="block text-xs text-gray-500">Education Level</label>
                      <p className="text-sm text-white">{detailApp.documents[0].education_level}</p>
                    </div>
                  )}
                  {detailApp.documents[0].source && (
                    <div>
                      <label className="block text-xs text-gray-500">Source</label>
                      <p className="text-sm text-white">{detailApp.documents[0].source}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ModalForm>
      </main>
    </div>
  );
}
