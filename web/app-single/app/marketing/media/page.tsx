"use client";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/use-translation";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { api, unwrapResults, withFullLimit } from "@/lib/api";
import { mediaUrl } from "@/components/landing-blocks";
import { PageHeader } from "@/components/page-header";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";
import { Upload, Trash2, Copy, Check, Film, ImageIcon } from "lucide-react";

interface MediaRow {
  id: string;
  name: string;
  file_key: string;
  mime_type?: string;
  file_size?: number;
  alt_text?: string;
}

export default function MarketingMedia() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [name, setName] = useState("");
  const [alt, setAlt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MediaRow | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useAuthGuard(isAuthenticated, authLoading);

  const load = useCallback(() => {
    setLoading(true);
    api.get<any>(withFullLimit("/landing-media/"))
      .then((d: any) => setMedia(unwrapResults(d)))
      .catch(() => setMedia([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.showToast("error", t("marketing.file")); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", name || file.name);
    if (alt) fd.append("alt_text", alt);
    try {
      await api.upload("/landing-media/", fd);
      toast.showToast("success", t("marketing.mediaUpload"));
      setName(""); setAlt(""); setFile(null);
      load();
    } catch (err: any) {
      toast.showToast("error", err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const copyUrl = async (row: MediaRow) => {
    const url = window.location.origin + mediaUrl(row.file_key);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(row.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast.showToast("error", "Copy failed");
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (m?: string) => (m || "").startsWith("image/");

  return (
    <div className="flex-1 min-w-0">
      <PageHeader title={t("marketing.mediaLibrary")} />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <form onSubmit={handleUpload} className="bg-navy-800 border border-navy-700 rounded-xl p-5 mb-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{t("marketing.mediaUpload")}</h2>
          <div className="grid md:grid-cols-4 gap-3">
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="md:col-span-2 text-xs text-gray-400 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-gold-500/10 file:text-gold-500 file:text-xs file:font-semibold hover:file:bg-gold-500/20"
            />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("marketing.mediaName")} className="px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
            <input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder={t("marketing.altText")} className="px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button type="submit" disabled={uploading || !file} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-gold-500 text-navy-900 rounded-lg font-semibold disabled:opacity-50">
              <Upload className="w-4 h-4" /> {uploading ? t("common.loading", "Uploading...") : t("marketing.mediaUpload")}
            </button>
            <p className="text-xs text-gray-500">{t("marketing.dropHint")}</p>
          </div>
        </form>

        {loading ? (
          <LoadingSkeleton type="card" rows={6} />
        ) : media.length === 0 ? (
          <EmptyState message={t("marketing.noMedia")} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {media.map((m) => (
              <div key={m.id} className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden group">
                <div className="aspect-video bg-navy-900 flex items-center justify-center overflow-hidden">
                  {isImage(m.mime_type) ? (
                    <img src={mediaUrl(m.file_key)} alt={m.alt_text || m.name} className="w-full h-full object-cover" />
                  ) : (
                    <Film className="w-8 h-8 text-gray-600" />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs text-white font-medium truncate" title={m.name}>{m.name}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{m.mime_type} {formatSize(m.file_size)}</p>
                  <div className="flex gap-1.5 mt-2">
                    <button onClick={() => copyUrl(m)} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/20">
                      {copiedId === m.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />} {copiedId === m.id ? t("marketing.copied") : t("marketing.copyUrl")}
                    </button>
                    <button onClick={() => setDeleteTarget(m)} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 rounded hover:bg-red-500/20">
                      <Trash2 className="w-3 h-3" /> {t("common.delete")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t("marketing.deleteSection")}
        message={deleteTarget?.name || ""}
        confirmLabel={t("common.delete")}
        onConfirm={() => {
          if (!deleteTarget) return;
          api.delete(`/landing-media/${deleteTarget.id}/`)
            .then(() => { toast.showToast("success", t("common.delete")); load(); })
            .catch((e: any) => toast.showToast("error", e?.message || "Delete failed"))
            .finally(() => setDeleteTarget(null));
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
