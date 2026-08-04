"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useTranslation } from "@/lib/use-translation";
import { PageHeader } from "@/components/page-header";
import { api, unwrapResults, withFullLimit } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorCard } from "@/components/error-card";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/toast";
import { fmtLabel } from "@/lib/format-utils";
import { VideoPlayer } from "@/components/video-player";

// ── Types ─────────────────────────────────────────────────

export interface LibraryCategory {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  document_count?: number;
}

export interface LibraryItem {
  id: string;
  name: string;
  title_ar?: string | null;
  title_fr?: string | null;
  description?: string | null;
  type?: string | null;
  category?: string | null;
  category_name?: string | null;
  library_category?: string | null;
  file_url: string;
  mime_type?: string | null;
  file_size?: number | null;
  version: number;
  version_history?: any[];
  status?: string | null;
  expiry_date?: string | null;
  download_count: number;
  is_public: boolean;
  visible_to_roles?: string[];
  promotions?: string[];
  individual_students?: string[];
  uploaded_by_name?: string | null;
  is_expired?: boolean;
  can_manage?: boolean;
  created_at: string;
}

const ROLES = [
  "director_general",
  "head_of_training",
  "chief_ground_instructor",
  "ground_instructor",
  "chief_flight_instructor",
  "flight_instructor",
  "system_admin",
  "admin_responsible",
  "admin_agent",
  "finance_responsible",
  "accounting_agent",
  "admissions_responsible",
  "training_admin",
  "quality_manager",
  "compliance_monitoring_manager",
  "safety_manager",
  "scheduler",
  "student",
  "candidate",
  "graduate",
];

const COLOR_BG: Record<string, string> = {
  blue: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  red: "bg-red-500/15 text-red-400 border-red-500/30",
  green: "bg-green-500/15 text-green-400 border-green-500/30",
  gold: "bg-gold-500/15 text-gold-500 border-gold-500/30",
  gray: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  purple: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  navy: "bg-navy-700/50 text-gray-300 border-navy-600",
};

const ICON_PATH: Record<string, string> = {
  book: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  shield: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  document: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  clipboard: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  gear: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  video: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  folder: "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z",
};

const typeIcon = (mime?: string | null) => {
  if (!mime) return "file";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "image";
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("spreadsheet") || mime.includes("excel")) return "sheet";
  if (mime.includes("word") || mime.includes("text")) return "doc";
  return "file";
};

function fileSizeFmt(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Main component ────────────────────────────────────────

export default function LibraryPage({
  canManage = false,
  backHref,
  backLabel,
  loginHref,
}: {
  canManage?: boolean;
  backHref?: string;
  backLabel?: string;
  loginHref?: string;
}) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useAuthGuard(isAuthenticated, authLoading, loginHref || "/login");
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const token = isAuthenticated ? api.getAccessToken() : null;

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<LibraryItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    name: "",
    title_ar: "",
    title_fr: "",
    description: "",
    library_category: "",
    new_category: "",
    is_public: true,
    visible_to_roles: [] as string[],
    promotions: [] as string[],
    individual_students: [] as string[],
    expiry_date: "",
  });

  const { data: documents, isLoading, error, refetch } = useQuery<LibraryItem[]>({
    queryKey: ["library"],
    queryFn: async () => {
      const d = await api.get<any>(withFullLimit("/documents/"));
      return unwrapResults(d);
    },
    enabled: isAuthenticated,
  });

  const { data: categories } = useQuery<LibraryCategory[]>({
    queryKey: ["library-categories"],
    queryFn: async () => {
      const d = await api.get<any>("/documents/categories/");
      return Array.isArray(d) ? d : [];
    },
    enabled: isAuthenticated,
  });

  const { data: promotions } = useQuery<any[]>({
    queryKey: ["promotions-options"],
    queryFn: async () => {
      const d = await api.get<any>(withFullLimit("/promotions/"));
      return unwrapResults(d);
    },
    enabled: isAuthenticated && canManage,
  });

  const { data: students } = useQuery<any[]>({
    queryKey: ["students-options"],
    queryFn: async () => {
      const d = await api.get<any>(withFullLimit("/students/"));
      return unwrapResults(d);
    },
    enabled: isAuthenticated && canManage,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, ...payload }: any) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", payload.name);
      if (payload.title_ar) formData.append("title_ar", payload.title_ar);
      if (payload.title_fr) formData.append("title_fr", payload.title_fr);
      if (payload.description) formData.append("description", payload.description);
      formData.append("is_public", payload.is_public ? "true" : "false");
      if (payload.library_category) {
        formData.append("library_category", payload.library_category);
      } else if (payload.new_category) {
        formData.append("new_category", payload.new_category);
      }
      if (payload.visible_to_roles?.length) {
        formData.append("visible_to_roles", payload.visible_to_roles.join(","));
      }
      if (payload.promotions?.length) {
        formData.append("promotions", payload.promotions.join(","));
      }
      if (payload.individual_students?.length) {
        formData.append("individual_students", payload.individual_students.join(","));
      }
      if (payload.expiry_date) formData.append("expiry_date", payload.expiry_date);
      return api.upload("/documents/upload/", formData);
    },
    onSuccess: () => {
      showToast("success", t("library.uploaded", "File uploaded to library"));
      setUploadOpen(false);
      setUploadFile(null);
      setUploadForm({
        name: "", title_ar: "", title_fr: "", description: "",
        library_category: "", new_category: "", is_public: true,
        visible_to_roles: [], promotions: [], individual_students: [],
        expiry_date: "",
      });
      queryClient.invalidateQueries({ queryKey: ["library"] });
      queryClient.invalidateQueries({ queryKey: ["library-categories"] });
    },
    onError: (err: any) => {
      showToast("error", err?.message || "Upload failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/documents/${id}/`),
    onSuccess: () => {
      showToast("success", t("library.deleted", "Item removed"));
      queryClient.invalidateQueries({ queryKey: ["library"] });
    },
    onError: (err: any) => showToast("error", err?.message || "Delete failed"),
  });

  const handleDownload = async (item: LibraryItem) => {
    try {
      const res = await api.download(`/documents/${item.id}/download/`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.name || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      queryClient.invalidateQueries({ queryKey: ["library"] });
    } catch {
      showToast("error", t("library.downloadFailed", "Download failed"));
    }
  };

  const streamUrl = (item: LibraryItem) => {
    const base = process.env.NEXT_PUBLIC_API_URL || "";
    return `${base}/api/documents/${item.id}/stream/?token=${encodeURIComponent(token || "")}`;
  };

  const filtered = useMemo(() => {
    if (!documents) return [];
    let r = documents;
    if (activeCategory) {
      r = r.filter((i) => i.library_category === activeCategory);
    }
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(
        (i) =>
          i.name?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q) ||
          i.category_name?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [documents, activeCategory, search]);

  const grouped = useMemo(() => {
    if (!categories) return [];
    return categories
      .map((c) => ({
        category: c,
        items: (documents || []).filter((d) => d.library_category === c.id),
      }))
      .filter((g) => g.items.length > 0);
  }, [categories, documents]);

  const resetUpload = () => {
    setUploadOpen(false);
    setUploadFile(null);
    setUploadForm({
      name: "", title_ar: "", title_fr: "", description: "",
      library_category: "", new_category: "", is_public: true,
      visible_to_roles: [], promotions: [], individual_students: [],
      expiry_date: "",
    });
  };

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader
        title={t("library.title", "Library")}
        backHref={backHref}
        backLabel={backLabel}
        actions={
          canManage ? (
            <button
              onClick={() => setUploadOpen(true)}
              className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400"
            >
              + {t("library.upload", "Upload")}
            </button>
          ) : undefined
        }
      />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <ErrorCard message={error?.message || "Failed to load library"} onRetry={() => refetch()} />
        )}

        {/* Category chips */}
        {categories && categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                activeCategory === null
                  ? "bg-gold-500/20 border-gold-500 text-gold-500"
                  : "bg-navy-800 border-navy-700 text-gray-400 hover:text-white"
              }`}
            >
              {t("library.all", "All")}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(activeCategory === c.id ? null : c.id)}
                className={`px-3 py-1.5 text-xs rounded-lg border flex items-center gap-1.5 transition-colors ${
                  activeCategory === c.id
                    ? "bg-gold-500/20 border-gold-500 text-gold-500"
                    : "bg-navy-800 border-navy-700 text-gray-400 hover:text-white"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={ICON_PATH[c.icon || "folder"] || ICON_PATH.folder} />
                </svg>
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("library.search", "Search library...")}
            className="w-full px-4 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:border-gold-500 focus:outline-none"
          />
        </div>

        {isLoading ? (
          <LoadingSkeleton type="card" rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              documents?.length === 0
                ? t("library.empty", "The library is empty.")
                : t("library.noMatch", "No files match your search.")
            }
            action={
              documents?.length === 0 && canManage
                ? { label: t("library.upload", "Upload"), onClick: () => setUploadOpen(true) }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <LibraryCard
                key={item.id}
                item={item}
                canManage={canManage}
                onDownload={() => handleDownload(item)}
                onPreview={() => setPreview(item)}
                onDelete={() => deleteMutation.mutate(item.id)}
              />
            ))}
          </div>
        )}
      </main>

      {preview && (
        <PreviewModal
          item={preview}
          token={token}
          streamUrl={streamUrl}
          onClose={() => setPreview(null)}
          onDownload={() => handleDownload(preview)}
        />
      )}

      {uploadOpen && canManage && (
        <UploadModal
          uploadFile={uploadFile}
          setUploadFile={setUploadFile}
          form={uploadForm}
          setForm={setUploadForm}
          categories={categories}
          promotions={promotions}
          students={students}
          pending={uploadMutation.isPending}
          onClose={resetUpload}
          onSubmit={() => {
            if (!uploadFile) {
              showToast("error", t("library.selectFile", "Please select a file"));
              return;
            }
            if (!uploadForm.name) {
              showToast("error", t("library.enterName", "Please enter a name"));
              return;
            }
            uploadMutation.mutate({ ...uploadForm, file: uploadFile });
          }}
          t={t}
        />
      )}
    </div>
  );
}

// ── LibraryCard ───────────────────────────────────────────

function LibraryCard({
  item,
  canManage,
  onDownload,
  onPreview,
  onDelete,
}: {
  item: LibraryItem;
  canManage: boolean;
  onDownload: () => void;
  onPreview: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const mime = item.mime_type || "";
  const isVideo = mime.startsWith("video/");
  const isImage = mime.startsWith("image/");
  const isPdf = mime.includes("pdf");
  const icon = typeIcon(mime);

  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl p-5 hover:border-gold-500/40 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className={`w-11 h-11 rounded-lg border flex items-center justify-center ${COLOR_BG[item.library_category ? "navy" : "navy"] || COLOR_BG.navy}`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {item.category_name && (
              <span className="text-[10px] uppercase tracking-wide text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded">
                {item.category_name}
              </span>
            )}
            <span className="text-[10px] text-gray-500">
              v{item.version} · {fileSizeFmt(item.file_size) || "—"}
            </span>
          </div>
          <h3 className="text-white font-semibold text-sm mt-1.5 truncate" title={item.name}>
            {item.name}
          </h3>
          {item.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
            <span>{item.download_count} {t("library.downloads", "downloads")}</span>
            {item.uploaded_by_name && <span>{item.uploaded_by_name}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        {(isVideo || isImage || isPdf) && (
          <button
            onClick={onPreview}
            className="flex-1 py-2 text-xs bg-navy-700 hover:bg-navy-600 text-gray-200 rounded-lg transition-colors"
          >
            {isVideo ? t("library.play", "Play") : t("library.preview", "Preview")}
          </button>
        )}
        <button
          onClick={onDownload}
          className={`${isVideo || isImage || isPdf ? "" : "flex-1"} py-2 text-xs bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg transition-colors`}
        >
          {t("common.download", "Download")}
        </button>
        {canManage && (
          <button
            onClick={onDelete}
            className="p-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title={t("common.delete", "Delete")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ── PreviewModal ──────────────────────────────────────────

function PreviewModal({
  item,
  token,
  streamUrl,
  onClose,
  onDownload,
}: {
  item: LibraryItem;
  token: string | null;
  streamUrl: (i: LibraryItem) => string;
  onClose: () => void;
  onDownload: () => void;
}) {
  const { t } = useTranslation();
  const mime = item.mime_type || "";
  const url = streamUrl(item);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-navy-800 border border-navy-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-navy-700">
          <div className="min-w-0">
            <h3 className="text-white font-semibold truncate">{item.name}</h3>
            <p className="text-xs text-gray-500">
              {item.category_name} · v{item.version} · {fileSizeFmt(item.file_size)}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white ml-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          {mime.startsWith("video/") ? (
            <VideoPlayer src={url} />
          ) : mime.startsWith("image/") ? (
            <img src={url} alt={item.name} className="w-full rounded-xl object-contain max-h-[60vh] bg-navy-900" />
          ) : mime.includes("pdf") ? (
            <iframe src={url} className="w-full h-[60vh] rounded-xl bg-navy-900" title={item.name} />
          ) : (
            <div className="p-10 text-center text-gray-400">
              {t("library.noPreview", "No inline preview available for this file type.")}
            </div>
          )}

          {item.description && (
            <p className="text-sm text-gray-400 mt-4">{item.description}</p>
          )}

          <button
            onClick={onDownload}
            className="w-full mt-5 py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm transition-colors"
          >
            {t("common.download", "Download")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── UploadModal ───────────────────────────────────────────

function UploadModal({
  uploadFile,
  setUploadFile,
  form,
  setForm,
  categories,
  promotions,
  students,
  pending,
  onClose,
  onSubmit,
  t,
}: {
  uploadFile: File | null;
  setUploadFile: (f: File | null) => void;
  form: any;
  setForm: (f: any) => void;
  categories?: LibraryCategory[];
  promotions?: any[];
  students?: any[];
  pending: boolean;
  onClose: () => void;
  onSubmit: () => void;
  t: any;
}) {
  const toggle = (key: string, value: string) => {
    const arr = form[key] as string[];
    setForm({ ...form, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-navy-800 border border-navy-700 rounded-2xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between p-5 border-b border-navy-700">
          <h3 className="text-lg font-bold text-white">{t("library.uploadTitle", "Upload to Library")}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* File */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {t("library.file", "File")} *
            </label>
            <input
              type="file"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gold-500/20 file:text-gold-500 hover:file:bg-gold-500/30 focus:outline-none"
            />
            {uploadFile && (
              <p className="text-xs text-gray-500 mt-1">
                {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {t("library.name", "Name")} *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              placeholder="e.g. Ground School Manual"
            />
          </div>

          {/* Localized titles */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t("library.titleFr", "Title (FR)")}</label>
              <input
                type="text"
                value={form.title_fr}
                onChange={(e) => setForm({ ...form, title_fr: e.target.value })}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t("library.titleAr", "Title (AR)")}</label>
              <input
                type="text"
                value={form.title_ar}
                onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
                dir="rtl"
                className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {t("library.description", "Description")}
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none resize-y"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {t("library.category", "Category")}
            </label>
            <select
              value={form.library_category}
              onChange={(e) => setForm({ ...form, library_category: e.target.value, new_category: "" })}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
            >
              <option value="">{t("library.selectCategory", "Select a category...")}</option>
              {(categories || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* New category */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {t("library.newCategory", "Or create a new category")}
            </label>
            <input
              type="text"
              value={form.new_category}
              onChange={(e) => setForm({ ...form, new_category: e.target.value, library_category: "" })}
              disabled={!!form.library_category}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none disabled:opacity-50"
              placeholder={t("library.newCategoryPlaceholder", "e.g. Safety Manuals")}
            />
          </div>

          {/* Visibility */}
          <div className="border border-navy-700 rounded-xl p-4">
            <label className="flex items-center gap-2 text-sm text-gray-200 mb-3">
              <input
                type="checkbox"
                checked={form.is_public}
                onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                className="accent-gold-500"
              />
              {t("library.public", "Visible to everyone")}
            </label>

            {!form.is_public && (
              <div className="space-y-4 mt-2">
                <div>
                  <p className="text-xs text-gray-400 mb-2">
                    {t("library.visibleToRoles", "Visible to roles")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ROLES.map((r) => (
                      <button
                        key={r}
                        onClick={() => toggle("visible_to_roles", r)}
                        className={`text-[11px] px-2 py-1 rounded border transition-colors ${
                          form.visible_to_roles.includes(r)
                            ? "bg-gold-500/20 border-gold-500 text-gold-500"
                            : "bg-navy-900 border-navy-700 text-gray-400 hover:text-white"
                        }`}
                      >
                        {fmtLabel(r)}
                      </button>
                    ))}
                  </div>
                </div>

                {promotions && promotions.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">
                      {t("library.visibleToPromotions", "Visible to promotions")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {promotions.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => toggle("promotions", p.id)}
                          className={`text-[11px] px-2 py-1 rounded border transition-colors ${
                            form.promotions.includes(p.id)
                              ? "bg-gold-500/20 border-gold-500 text-gold-500"
                              : "bg-navy-900 border-navy-700 text-gray-400 hover:text-white"
                          }`}
                        >
                          {p.code} - {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {students && students.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">
                      {t("library.visibleToStudents", "Visible to individual students")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {students.slice(0, 50).map((s) => (
                        <button
                          key={s.id}
                          onClick={() => toggle("individual_students", s.id)}
                          className={`text-[11px] px-2 py-1 rounded border transition-colors ${
                            form.individual_students.includes(s.id)
                              ? "bg-gold-500/20 border-gold-500 text-gold-500"
                              : "bg-navy-900 border-navy-700 text-gray-400 hover:text-white"
                          }`}
                        >
                          {s.full_name || s.name || s.id}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {t("library.expiry", "Expiry date (optional)")}
            </label>
            <input
              type="datetime-local"
              value={form.expiry_date}
              onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-navy-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 border border-navy-700 rounded-lg hover:text-white">
            {t("common.cancel", "Cancel")}
          </button>
          <button
            onClick={onSubmit}
            disabled={pending || !uploadFile || !form.name}
            className="px-4 py-2 text-sm bg-gold-500 text-navy-900 font-semibold rounded-lg hover:bg-gold-400 disabled:opacity-50"
          >
            {pending ? "Uploading..." : t("library.upload", "Upload")}
          </button>
        </div>
      </div>
    </div>
  );
}
