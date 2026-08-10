"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "@/lib/use-translation";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { api, unwrapResults, withFullLimit } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { useToast } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import LandingBlockEditor from "@/components/landing-block-editor";
import { LandingBlocks, Block, LandingTheme } from "@/components/landing-blocks";
import { Send, RotateCcw, Save, Eye, ExternalLink, Check, History, Palette, X } from "lucide-react";

interface SectionVersion {
  id: string;
  version: number;
  created_by_name?: string;
  created_at: string;
}

export default function MarketingSectionEditor() {
  const params = useParams<{ sectionId: string }>();
  const sectionId = params.sectionId;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t, locale } = useTranslation();
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [theme, setTheme] = useState<LandingTheme>({});
  const [status, setStatus] = useState<string>("draft");
  const [version, setVersion] = useState(0);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [publishedBlocks, setPublishedBlocks] = useState<Block[] | null>(null);
  const [media, setMedia] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<SectionVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<SectionVersion | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  useAuthGuard(isAuthenticated, authLoading);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<any>(`/landing-sections/${sectionId}/`),
      api.get<any>(withFullLimit("/landing-media/")),
    ]).then(([section, mediaRes]) => {
      setTitle(section.title || "");
      setDescription(section.description || "");
      setBlocks(Array.isArray(section.content) ? section.content : []);
      setTheme(section.theme && typeof section.theme === "object" ? section.theme : {});
      setStatus(section.status || "draft");
      setVersion(section.published_version || 0);
      setHasPendingChanges(!!section.has_pending_changes);
      setPublishedBlocks(section.published_content ? section.published_content : null);
      setMedia(unwrapResults(mediaRes));
      setLoading(false);
    }).catch(() => {
      setNotFound(true);
      setLoading(false);
    });
  }, [sectionId]);

  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

  const persist = useCallback(() => {
    dirtyRef.current = false;
    setSaving(true);
    api.patch(`/landing-sections/${sectionId}/`, { title, description, content: blocks, theme })
      .then((section: any) => {
        setSavedAt(new Date().toLocaleTimeString());
        toast.showToast("success", t("marketing.save"));
        if (section?.status) setStatus(section.status);
        if (typeof section?.has_pending_changes === "boolean") setHasPendingChanges(section.has_pending_changes);
      })
      .catch((e: any) => toast.showToast("error", e?.message || "Save failed"))
      .finally(() => setSaving(false));
  }, [sectionId, title, description, blocks, theme, toast, t]);

  // Debounced autosave — 800ms after the last change.
  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persist, 800);
  }, [persist]);

  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  const publish = async () => {
    setSaving(true);
    try {
      // Flush any pending autosave first so the snapshot includes the latest edits.
      if (saveTimer.current) clearTimeout(saveTimer.current);
      dirtyRef.current = false;
      await api.patch(`/landing-sections/${sectionId}/`, { title, description, content: blocks, theme });
      const section: any = await api.post(`/landing-sections/${sectionId}/publish/`);
      setStatus(section.status);
      setVersion(section.published_version);
      setPublishedBlocks(Array.isArray(section.published_content) ? section.published_content : null);
      setHasPendingChanges(!!section.has_pending_changes);
      toast.showToast("success", t("marketing.published"));
    } catch (e: any) {
      toast.showToast("error", e?.message || "Publish failed");
    } finally {
      setSaving(false);
    }
  };

  const rollback = async () => {
    setSaving(true);
    try {
      const section: any = await api.post(`/landing-sections/${sectionId}/rollback/`);
      setBlocks(Array.isArray(section.content) ? section.content : []);
      if (typeof section?.has_pending_changes === "boolean") setHasPendingChanges(section.has_pending_changes);
      toast.showToast("success", t("marketing.rollback"));
    } catch (e: any) {
      toast.showToast("error", e?.message || "Rollback failed");
    } finally {
      setSaving(false);
    }
  };

  const updateTheme = (key: string, value: string) => {
    const next: LandingTheme = { ...theme };
    if (!value) delete (next as any)[key];
    else (next as any)[key] = value;
    setTheme(next);
    scheduleSave();
  };

  const loadVersions = useCallback(() => {
    setVersionsLoading(true);
    api.get<SectionVersion[]>(`/landing-sections/${sectionId}/versions/`)
      .then((data: any) => {
        const list = Array.isArray(data) ? data : (data?.results || []);
        setVersions(list);
      })
      .catch(() => setVersions([]))
      .finally(() => setVersionsLoading(false));
  }, [sectionId]);

  const openVersions = () => {
    setShowVersions(true);
    loadVersions();
  };

  const restoreVersion = async () => {
    if (!restoreTarget) return;
    setSaving(true);
    try {
      const section: any = await api.post(`/landing-sections/${sectionId}/restore/`, { version: restoreTarget.version });
      setBlocks(Array.isArray(section.content) ? section.content : []);
      setTheme(section.theme && typeof section.theme === "object" ? section.theme : {});
      if (typeof section?.has_pending_changes === "boolean") setHasPendingChanges(section.has_pending_changes);
      setRestoreTarget(null);
      setShowVersions(false);
      toast.showToast("success", t("marketing.restored"));
    } catch (e: any) {
      toast.showToast("error", e?.message || "Restore failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-navy-900"><LoadingSkeleton type="detail" rows={6} /></div>;
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <p className="text-gray-400 text-sm">{t("marketing.noSections")}</p>
      </div>
    );
  }

  const liveBlocks = blocks;

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader
        title={t("marketing.editor")}
        backHref="/marketing/sections"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-1 rounded ${status === "published" ? "bg-green-500/10 text-green-400" : "bg-gold-500/10 text-gold-500"}`}>
              {status === "published" ? t("marketing.published") : t("marketing.draft")}{status === "published" ? ` · v${version}` : ""}
            </span>
            {status === "published" && hasPendingChanges && (
              <span className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-400">
                {t("marketing.draft")} · {t("marketing.hasChanges")}
              </span>
            )}
            <button onClick={() => setShowPreview(!showPreview)} className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${showPreview ? "border-gold-500/40 text-gold-500" : "border-gray-600 text-white hover:border-gold-500 hover:text-gold-500"}`}>
              <Eye className="w-4 h-4" /> {t("marketing.livePreview")}
            </button>
            <button onClick={persist} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 disabled:opacity-50">
              <Save className="w-4 h-4" /> {t("marketing.save")}
            </button>
            {!hasPendingChanges && status === "published" ? null : (
              <button onClick={publish} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/20 disabled:opacity-50">
                <Send className="w-4 h-4" /> {t("marketing.publish")}
              </button>
            )}
            {publishedBlocks !== null && (
              <button onClick={rollback} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 disabled:opacity-50">
                <RotateCcw className="w-4 h-4" /> {t("marketing.rollback")}
              </button>
            )}
            <button onClick={openVersions} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-600 text-white rounded-lg hover:border-gold-500 hover:text-gold-500 transition-colors">
              <History className="w-4 h-4" /> {t("marketing.versions")}
            </button>
            <a href="/" target="_blank" className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-600 text-white rounded-lg hover:border-gold-500 hover:text-gold-500 transition-colors">
              <ExternalLink className="w-4 h-4" /> {t("marketing.openPublicSite")}
            </a>
          </div>
        }
      />

      {savedAt && (
        <div className="max-w-7xl mx-auto px-6 -mt-3 flex items-center gap-1.5 text-xs text-gray-500">
          <Check className="w-3.5 h-3.5 text-green-400" /> {t("marketing.save")} {savedAt}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{t("marketing.sectionList")}</h2>
              <div className="mb-3">
                <label className="block text-xs text-gray-400 mb-1">{t("marketing.title")}</label>
                <input value={title} onChange={(e) => { setTitle(e.target.value); scheduleSave(); }} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
              </div>
              <div className="mb-3">
                <label className="block text-xs text-gray-400 mb-1">{t("marketing.description")}</label>
                <input value={description} onChange={(e) => { setDescription(e.target.value); scheduleSave(); }} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
              </div>
            </div>

            <div className="bg-navy-800 border border-navy-700 rounded-xl p-5 space-y-3">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" /> {t("marketing.theme")}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t("marketing.themeAccent")}</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={theme.accent || "#c4943c"} onChange={(e) => updateTheme("accent", e.target.value)} className="w-10 h-9 rounded bg-navy-900 border border-navy-600 cursor-pointer" />
                    <button onClick={() => updateTheme("accent", "")} className="text-[10px] text-gray-500 hover:text-white">Reset</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t("marketing.themeBackground")}</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={theme.background || "#0a1628"} onChange={(e) => updateTheme("background", e.target.value)} className="w-10 h-9 rounded bg-navy-900 border border-navy-600 cursor-pointer" />
                    <button onClick={() => updateTheme("background", "")} className="text-[10px] text-gray-500 hover:text-white">{t("marketing.themeTransparent")}</button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t("marketing.themePadding")}</label>
                  <select value={theme.padding || ""} onChange={(e) => updateTheme("padding", e.target.value)} className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white text-xs">
                    <option value="">Default</option>
                    <option value="none">{t("marketing.themePaddingNone")}</option>
                    <option value="sm">{t("marketing.themePaddingSm")}</option>
                    <option value="md">{t("marketing.themePaddingMd")}</option>
                    <option value="lg">{t("marketing.themePaddingLg")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t("marketing.themeAlign")}</label>
                  <select value={theme.align || ""} onChange={(e) => updateTheme("align", e.target.value)} className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white text-xs">
                    <option value="">{t("marketing.themeAlignCenter")}</option>
                    <option value="left">{t("marketing.themeAlignLeft")}</option>
                  </select>
                </div>
              </div>
            </div>

            <LandingBlockEditor blocks={blocks} media={media} onChange={(next) => { setBlocks(next); scheduleSave(); }} />
          </div>

          <div className={`${showPreview ? "" : "hidden"} lg:sticky lg:top-4 h-fit`}>
            <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-navy-700">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> {t("marketing.livePreview")} · {locale.toUpperCase()}
                </h2>
                <span className="text-[10px] text-green-400 flex items-center gap-1"><Check className="w-3 h-3" /> live</span>
              </div>
              <div className="bg-navy-900 min-h-[400px] max-h-[70vh] overflow-y-auto">
                {liveBlocks.length > 0 ? (
                  <LandingBlocks blocks={liveBlocks} locale={locale} theme={theme} />
                ) : (
                  <div className="p-6 text-sm text-gray-500">{t("marketing.noSections")}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Version history modal */}
      {showVersions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowVersions(false)}>
          <div className="bg-navy-800 border border-navy-700 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-navy-700">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-gold-500" /> {t("marketing.versionHistory")}
              </h2>
              <button onClick={() => setShowVersions(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {versionsLoading ? (
                <p className="text-sm text-gray-500">{t("marketing.noSections")}</p>
              ) : versions.length === 0 ? (
                <p className="text-sm text-gray-500">{t("marketing.noVersions")}</p>
              ) : (
                versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-3 bg-navy-900 border border-navy-700 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-white">v{v.version}</p>
                      <p className="text-[11px] text-gray-500">
                        {new Date(v.created_at).toLocaleString()} {v.created_by_name ? `· ${t("marketing.by")} ${v.created_by_name}` : ""}
                      </p>
                    </div>
                    <button onClick={() => setRestoreTarget(v)} disabled={saving} className="px-3 py-1.5 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 disabled:opacity-50">
                      {t("marketing.restoreVersion")}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!restoreTarget}
        title={t("marketing.restoreVersion")}
        message={restoreTarget ? `${t("marketing.restoreConfirm")} (v${restoreTarget.version})` : ""}
        confirmLabel={t("marketing.restoreVersion")}
        onConfirm={restoreVersion}
        onClose={() => setRestoreTarget(null)}
      />
    </div>
  );
}
