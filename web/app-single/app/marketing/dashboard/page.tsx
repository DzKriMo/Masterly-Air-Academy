"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/lib/use-translation";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { api, unwrapResults } from "@/lib/api";
import { withFullLimit } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { StatsCard } from "@/components/stats-card";
import { LayoutList, Images, Globe, Pencil, CheckCircle2, FilePenLine } from "lucide-react";

export default function MarketingDashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [published, setPublished] = useState(0);
  const [drafts, setDrafts] = useState(0);
  const [mediaCount, setMediaCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useAuthGuard(isAuthenticated, authLoading);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    Promise.all([
      api.get<any>(withFullLimit("/landing-sections/")).catch(() => ({ results: [] })),
      api.get<any>(withFullLimit("/landing-media/")).catch(() => ({ results: [] })),
    ]).then(([sectionsRes, mediaRes]) => {
      const sections = unwrapResults(sectionsRes);
      const media = unwrapResults(mediaRes);
      setPublished(sections.filter((s: any) => s.status === "published").length);
      setDrafts(sections.filter((s: any) => s.status !== "published").length);
      setMediaCount(media.length);
      const latest = sections.map((s: any) => s.updated_at || "").sort().reverse()[0];
      setLastUpdated(latest || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-navy-900">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-lg font-bold text-white">{t("marketing.dashboardTitle")}</h1>
          <Link href="/?preview=1" target="_blank" className="flex items-center gap-2 px-4 py-2 text-sm bg-gold-500/10 text-gold-500 border border-gold-500/30 rounded-lg hover:bg-gold-500 hover:text-navy-900 transition-colors">
            <Globe className="w-4 h-4" /> {t("marketing.openPublicSite")}
          </Link>
        </div>

        {loading ? (
          <LoadingSkeleton type="card" rows={4} />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatsCard label={t("marketing.publishedSections")} value={published} valueClassName="text-green-400" />
              <StatsCard label={t("marketing.draftSections")} value={drafts} valueClassName="text-gold-500" />
              <StatsCard label={t("marketing.totalMedia")} value={mediaCount} valueClassName="text-blue-400" />
              <StatsCard label={t("marketing.lastUpdatedBy")} value={lastUpdated ? new Date(lastUpdated).toLocaleDateString() : "—"} valueClassName="text-gray-300" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Link href="/marketing/sections" className="group bg-navy-800 border border-navy-700 rounded-xl p-5 hover:border-gold-500/40 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gold-500/10 flex items-center justify-center text-gold-500"><LayoutList className="w-5 h-5" /></div>
                  <h2 className="text-sm font-semibold text-white">{t("marketing.sectionList")}</h2>
                </div>
                <p className="text-xs text-gray-400">{t("marketing.publishedHint")}</p>
                <p className="mt-4 text-xs text-gold-500 flex items-center gap-1 group-hover:gap-2 transition-all"><Pencil className="w-3 h-3" /> {t("marketing.editSection")}</p>
              </Link>

              <Link href="/marketing/media" className="group bg-navy-800 border border-navy-700 rounded-xl p-5 hover:border-gold-500/40 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400"><Images className="w-5 h-5" /></div>
                  <h2 className="text-sm font-semibold text-white">{t("marketing.mediaLibrary")}</h2>
                </div>
                <p className="text-xs text-gray-400">{mediaCount > 0 ? t("marketing.totalMedia") + ": " + mediaCount : t("marketing.noMedia")}</p>
                <p className="mt-4 text-xs text-gold-500 flex items-center gap-1 group-hover:gap-2 transition-all"><FilePenLine className="w-3 h-3" /> {t("marketing.mediaUpload")}</p>
              </Link>
            </div>

            <div className="mt-6 flex items-start gap-2 bg-navy-800/60 border border-navy-700 rounded-xl p-4">
              <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-400">{t("marketing.publishedHint")}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
