"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { PageHeader } from "@/components/page-header";
import { StatsCard } from "@/components/stats-card";
import { fmtLabel, formatDate, PROGRAMS, STATUS_COLORS, TYPE_COLORS, CERT_TYPES as TYPES, CERT_STATUSES as STATUSES } from "@/lib/format-utils";

interface Certificate {
  id: string;
  certificate_number: string;
  student_name: string;
  student?: string;
  type?: string;
  certificate_type?: string;
  program: string;
  issue_date: string;
  expiry_date?: string;
  status: string;
}

interface StudentOption {
  id: string;
  full_name: string;
  student_number: string;
}

interface CertFormData {
  student: string;
  certificate_number: string;
  type: string;
  title: string;
  program: string;
  issue_date: string;
  expiry_date: string;
  status: string;
}

const emptyForm: CertFormData = {
  student: "", certificate_number: "", type: "course_completion", title: "",
  program: "PPL", issue_date: "", expiry_date: "", status: "issued",
};

export default function AdminCertificatesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CertFormData>(emptyForm);
  const [mutationError, setMutationError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  const { data: certificates, isLoading, error, refetch } = useQuery<Certificate[]>({
    queryKey: ["admin-certificates"],
    queryFn: async () => {
      const d = await api.get<any>("/certificates/");
      return (d as any)?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  const { data: students = [] } = useQuery<StudentOption[]>({
    queryKey: ["admin-students-dropdown"],
    queryFn: async () => {
      const d = await api.get<any>("/students/?limit=500");
      const list = (d as any)?.results || (d as any) || [];
      return list.map((s: any) => ({
        id: s.id, full_name: s.full_name || `${s.first_name || ""} ${s.last_name || ""}`.trim(),
        student_number: s.student_number || "",
      }));
    },
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: (data: CertFormData) =>
      api.post("/certificates/", {
        student: data.student,
        certificate_number: data.certificate_number,
        type: data.type,
        title: data.title || undefined,
        program: data.program || undefined,
        issue_date: data.issue_date,
        expiry_date: data.expiry_date || undefined,
        status: data.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-certificates"] });
      setCreateOpen(false);
      setForm(emptyForm);
    },
    onError: (err: any) => setMutationError(err?.message || "Failed to create certificate"),
  });

  const filtered = useMemo(() => {
    if (!certificates) return [];
    let r = certificates;
    if (filterValues.certificate_type)
      r = r.filter((c) => (c.type || c.certificate_type) === filterValues.certificate_type);
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
        key: "type",
        header: "Type",
        render: (c) => (
          <span className={`text-xs px-2 py-0.5 rounded ${TYPE_COLORS[c.type || c.certificate_type || ""] || "bg-gray-500/10 text-gray-400"}`}>
            {fmtLabel(c.type || c.certificate_type || "")}
          </span>
        ),
      },
      { key: "program", header: "Program" },
      {
        key: "issue_date",
        header: "Issue Date",
        render: (c) => <span className="text-xs text-gray-400">{formatDate(c.issue_date)}</span>,
      },
      {
        key: "status",
        header: t("common.status", "Status"),
        render: (c) => (
          <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[c.status] || "bg-gray-500/10 text-gray-400"}`}>
            {fmtLabel(c.status)}
          </span>
        ),
      },
    ],
    [t]
  );

  const stats = useMemo(() => {
    if (!certificates) return { total: 0, issued: 0, pending: 0 };
    return {
      total: certificates.length,
      issued: certificates.filter((c) => c.status === "issued").length,
      pending: certificates.filter((c) => c.status === "pending").length,
    };
  }, [certificates]);

  const set = (key: keyof CertFormData, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader
        title={t("admin.certificates", "Certificates")}
        backHref="/admin/dashboard"
        backLabel={t("common.back", "Back to Dashboard")}
        actions={
          <button onClick={() => { setForm(emptyForm); setMutationError(null); setCreateOpen(true); }}
            className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors">
            + Issue Certificate
          </button>
        }
      />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <ErrorCard message={(error as any)?.message || "Failed to load certificates"} onRetry={() => refetch()} />
        )}

        {!isLoading && certificates && certificates.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatsCard label="Total Certificates" value={stats.total} />
            <StatsCard label="Issued" value={stats.issued} valueClassName="text-green-400" />
            <StatsCard label="Pending" value={stats.pending} valueClassName="text-amber-400" />
          </div>
        )}

        <FilterBar
          filters={[
            {
              key: "certificate_type",
              label: "All Types",
              options: TYPES.map((t) => ({ value: t, label: fmtLabel(t) })),
            },
            {
              key: "program",
              label: "All Programs",
              options: PROGRAMS.map((p) => ({ value: p, label: p })),
            },
            {
              key: "status",
              label: "All Statuses",
              options: STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })),
            },
          ]}
          values={filterValues}
          onChange={(k, v) => setFilterValues((p) => ({ ...p, [k]: v }))}
          onClear={() => { setFilterValues({}); setSearchValue(""); }}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search student name or certificate #..."
        />

        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={certificates?.length === 0 ? "No certificates have been issued yet." : "No certificates match your filters."}
            title={certificates?.length === 0 ? "No certificates yet" : "No matching certificates"}
          />
        ) : (
          <DataTable columns={columns} data={filtered} keyField="id" onRowClick={(item) => setSelectedCert(item as Certificate)} />
        )}

        {/* Detail Modal */}
        <ModalForm
          open={selectedCert !== null}
          onClose={() => setSelectedCert(null)}
          title={`Certificate: ${selectedCert?.certificate_number || ""}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Certificate #</label>
              <p className="text-white">{selectedCert?.certificate_number || "—"}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Student Name</label>
              <p className="text-white">{selectedCert?.student_name || "—"}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Type</label>
              {selectedCert?.type || selectedCert?.certificate_type ? (
                <span className={`text-xs px-2 py-0.5 rounded ${TYPE_COLORS[selectedCert.type || selectedCert.certificate_type || ""] || "bg-gray-500/10 text-gray-400"}`}>
                  {fmtLabel(selectedCert.type || selectedCert.certificate_type || "")}
                </span>
              ) : (<p className="text-white">—</p>)}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Program</label>
              <p className="text-white">{selectedCert?.program || "—"}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Issue Date</label>
              <p className="text-white">{formatDate(selectedCert?.issue_date)}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              {selectedCert?.status ? (
                <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[selectedCert.status] || "bg-gray-500/10 text-gray-400"}`}>
                  {fmtLabel(selectedCert.status)}
                </span>
              ) : (<p className="text-white">—</p>)}
            </div>
          </div>
        </ModalForm>

        {/* Create Modal */}
        <ModalForm
          open={createOpen}
          onClose={() => { setCreateOpen(false); setForm(emptyForm); setMutationError(null); }}
          title="Issue New Certificate"
          wide
          footer={
            <>
              <button
                onClick={() => { setCreateOpen(false); setForm(emptyForm); setMutationError(null); }}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.student || !form.certificate_number || !form.issue_date}
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? "Issuing..." : "Issue Certificate"}
              </button>
            </>
          }
        >
          {mutationError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400 mb-4">{mutationError}</div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Student *</label>
              <select value={form.student} onChange={(e) => set("student", e.target.value)}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none text-sm">
                <option value="">Select a student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name} ({s.student_number})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Certificate Number *</label>
                <input type="text" value={form.certificate_number} onChange={(e) => set("certificate_number", e.target.value)}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none text-sm"
                  placeholder="e.g. CERT-2026-001" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Type *</label>
                <select value={form.type} onChange={(e) => set("type", e.target.value)}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none text-sm">
                  {TYPES.map((t) => <option key={t} value={t}>{fmtLabel(t)}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Title (optional)</label>
              <input type="text" value={form.title} onChange={(e) => set("title", e.target.value)}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none text-sm"
                placeholder="e.g. Private Pilot License" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Program</label>
                <select value={form.program} onChange={(e) => set("program", e.target.value)}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none text-sm">
                  {PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Issue Date *</label>
                <input type="date" value={form.issue_date} onChange={(e) => set("issue_date", e.target.value)}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Expiry Date</label>
                <input type="date" value={form.expiry_date} onChange={(e) => set("expiry_date", e.target.value)}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none text-sm">
                {STATUSES.map((s) => <option key={s} value={s}>{fmtLabel(s)}</option>)}
              </select>
            </div>
          </div>
        </ModalForm>
      </main>
    </div>
  );
}
