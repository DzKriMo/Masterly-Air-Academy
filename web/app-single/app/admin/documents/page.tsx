"use client";
import { useEffect, useState, useMemo } from "react";
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

interface Document {
  id: string;
  name: string;
  document_type: string;
  category: string;
  status: string;
  version: string;
  file_url: string;
  uploaded_at: string;
}

// ── Constants ─────────────────────────────────────────────

const TYPES = [
  "certificate",
  "license",
  "medical",
  "id",
  "contract",
  "other",
  "transcript",
  "report",
];

const CATEGORIES = [
  "personal",
  "training",
  "medical",
  "administrative",
  "legal",
  "other",
];

const STATUSES = ["active", "expired", "pending", "revoked"];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-400",
  expired: "bg-red-500/10 text-red-400",
  pending: "bg-yellow-500/10 text-yellow-400",
  revoked: "bg-gray-500/10 text-gray-400",
};

// ── Helpers ───────────────────────────────────────────────

function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Component ─────────────────────────────────────────────

export default function AdminDocumentsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // ── Filter state ──
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState("");

  // ── Upload modal state ──
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: "",
    document_type: "other",
    category: "other",
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // ── Auth guard ──
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  // ── Data query ──
  const {
    data: documents,
    isLoading,
    error,
    refetch,
  } = useQuery<Document[]>({
    queryKey: ["admin-documents"],
    queryFn: async () => {
      const d = await api.get<any>("/documents/");
      return (d as any) ?.results || (d as any) || [];
    },
    enabled: isAuthenticated,
  });

  // ── Upload mutation ──
  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      ...payload
    }: {
      name: string;
      document_type: string;
      category: string;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append("name", payload.name);
      formData.append("document_type", payload.document_type);
      formData.append("category", payload.category);
      formData.append("file", file);

      const url = `${process.env.NEXT_PUBLIC_API_URL || ""}/api/documents/upload/`;
      const headers: Record<string, string> = {
        Accept: "application/json",
      };
      const token = api.getAccessToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.message || errData.detail || `Upload failed (${res.status})`
        );
      }

      return res.json();
    },
    onSuccess: () => {
      showToast("success", "Document uploaded successfully");
      setUploadOpen(false);
      setUploadForm({ name: "", document_type: "other", category: "other" });
      setUploadFile(null);
      queryClient.invalidateQueries({ queryKey: ["admin-documents"] });
    },
    onError: (err: any) => {
      showToast("error", err.message || "Failed to upload document");
    },
  });

  // ── Filtered data ──
  const filtered = useMemo(() => {
    if (!documents) return [];
    let r = documents;
    if (filterValues.type)
      r = r.filter((i) => i.document_type === filterValues.type);
    if (filterValues.category)
      r = r.filter((i) => i.category === filterValues.category);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      r = r.filter((i) => i.name?.toLowerCase().includes(q));
    }
    return r;
  }, [documents, filterValues, searchValue]);

  // ── Columns ──
  const columns: Column<Document>[] = useMemo(
    () => [
      { key: "name", header: t("common.name", "Name") },
      {
        key: "document_type",
        header: "Type",
        render: (i) => (
          <span className="text-xs px-2 py-0.5 rounded bg-navy-700 text-gray-300">
            {formatLabel(i.document_type)}
          </span>
        ),
      },
      {
        key: "category",
        header: "Category",
        render: (i) => (
          <span className="text-xs px-2 py-0.5 rounded bg-navy-700 text-gray-300">
            {formatLabel(i.category)}
          </span>
        ),
      },
      {
        key: "status",
        header: t("common.status", "Status"),
        render: (i) => (
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              STATUS_COLORS[i.status] || "bg-gray-500/10 text-gray-400"
            }`}
          >
            {formatLabel(i.status)}
          </span>
        ),
      },
      { key: "version", header: "Version" },
      {
        key: "uploaded_at",
        header: "Uploaded",
        render: (i) => (
          <span className="text-xs text-gray-500">
            {i.uploaded_at
              ? new Date(i.uploaded_at).toLocaleDateString()
              : "—"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        sortable: false,
        render: (i) =>
          i.file_url ? (
            <a
              href={i.file_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-navy-700 text-gray-300 hover:bg-navy-600 hover:text-white transition-colors"
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
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {t("common.download", "Download")}
            </a>
          ) : null,
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
                {t("admin.documents", "Documents")}
              </h1>
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="text-xs text-gray-500 hover:text-gold-500"
              >
                {t("common.back", "Back to Dashboard")}
              </button>
            </div>
          </div>
          <button
            onClick={() => setUploadOpen(true)}
            className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400"
          >
            + {t("common.upload", "Upload")}
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Error */}
        {error && (
          <ErrorCard
            message={(error as any).message || "Failed to load documents"}
            onRetry={() => refetch()}
          />
        )}

        {/* Filter bar */}
        <FilterBar
          filters={[
            {
              key: "type",
              label: "All Types",
              options: TYPES.map((t) => ({
                value: t,
                label: formatLabel(t),
              })),
            },
            {
              key: "category",
              label: "All Categories",
              options: CATEGORIES.map((c) => ({
                value: c,
                label: formatLabel(c),
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
          searchPlaceholder="Search document name..."
        />

        {/* Table */}
        {isLoading ? (
          <LoadingSkeleton type="table" rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message="No documents found."
            title={
              documents?.length === 0
                ? "No documents yet"
                : "No matching documents"
            }
            action={
              documents?.length === 0
                ? {
                    label: "Upload Document",
                    onClick: () => setUploadOpen(true),
                  }
                : undefined
            }
          />
        ) : (
          <DataTable columns={columns} data={filtered} keyField="id" />
        )}

        {/* Upload Modal */}
        <ModalForm
          open={uploadOpen}
          onClose={() => {
            setUploadOpen(false);
            setUploadFile(null);
          }}
          title="Upload Document"
          footer={
            <>
              <button
                onClick={() => {
                  setUploadOpen(false);
                  setUploadFile(null);
                }}
                className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                onClick={() => {
                  if (!uploadFile) {
                    showToast("error", "Please select a file to upload");
                    return;
                  }
                  uploadMutation.mutate({
                    ...uploadForm,
                    file: uploadFile,
                  });
                }}
                disabled={uploadMutation.isPending || !uploadFile || !uploadForm.name}
                className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50"
              >
                {uploadMutation.isPending
                  ? "Uploading..."
                  : t("common.upload", "Upload")}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Document Name
              </label>
              <input
                type="text"
                value={uploadForm.name}
                onChange={(e) =>
                  setUploadForm((f) => ({ ...f, name: e.target.value }))
                }
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
                placeholder="e.g. Medical Certificate Class 1"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Type</label>
              <select
                value={uploadForm.document_type}
                onChange={(e) =>
                  setUploadForm((f) => ({
                    ...f,
                    document_type: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {formatLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Category
              </label>
              <select
                value={uploadForm.category}
                onChange={(e) =>
                  setUploadForm((f) => ({
                    ...f,
                    category: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {formatLabel(c)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">File</label>
              <div className="relative">
                <input
                  type="file"
                  onChange={(e) =>
                    setUploadFile(e.target.files?.[0] || null)
                  }
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gold-500/20 file:text-gold-500 hover:file:bg-gold-500/30 focus:outline-none"
                />
              </div>
              {uploadFile && (
                <p className="text-xs text-gray-500 mt-1">
                  Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </div>
        </ModalForm>
      </main>
    </div>
  );
}
