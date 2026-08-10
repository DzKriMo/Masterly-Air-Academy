"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/use-translation";
import { useAuth } from "@/lib/auth-context";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { api, unwrapResults, withFullLimit } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { DataTable, Column } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/toast";
import { Pencil, Send, RotateCcw, Trash2, Plus, ChevronUp, ChevronDown, Copy } from "lucide-react";

interface SectionRow {
  id: string;
  key: string;
  title: string;
  description?: string;
  status: string;
  published_version: number;
  has_pending_changes?: boolean;
  updated_at?: string;
  updated_by_name?: string;
  sort_order?: number;
  content?: any[];
  theme?: Record<string, any>;
}

const SECTION_KEYS = ["hero", "about", "programs", "why_us", "accreditations", "gallery", "videos", "testimonials"];

export default function MarketingSections() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SectionRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({ key: "hero", title: "", description: "" });

  useAuthGuard(isAuthenticated, authLoading);

  const load = useCallback(() => {
    setLoading(true);
    api.get<any>(withFullLimit("/landing-sections/"))
      .then((d: any) => setSections(unwrapResults(d)))
      .catch(() => setSections([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

  const run = async (id: string, action: (() => Promise<any>), successMsg: string) => {
    if (busy) return;
    setBusy(id);
    try {
      await action();
      toast.showToast("success", successMsg);
      load();
    } catch (e: any) {
      toast.showToast("error", e?.message || "Failed");
    } finally {
      setBusy(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/landing-sections/", form);
      toast.showToast("success", t("marketing.newSection"));
      setShowCreate(false);
      setForm({ key: "hero", title: "", description: "" });
      load();
    } catch (err: any) {
      toast.showToast("error", err?.message || "Failed to create section");
    }
  };

  const moveSection = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    const orderedIds = next.map((s) => s.id);
    run(sections[index].id, () => api.post("/landing-sections/reorder/", { ordered_ids: orderedIds }), t("marketing.sectionOrder"));
  };

  const duplicateSection = async (s: SectionRow) => {
    const existing = new Set(sections.map((x) => x.key));
    let base = `${s.key}-copy`;
    let key = base;
    let n = 2;
    while (existing.has(key)) {
      key = `${base}-${n}`;
      n += 1;
    }
    try {
      await api.post("/landing-sections/", {
        key,
        title: `${s.title} (Copy)`,
        description: s.description || "",
        content: s.content && s.content.length ? JSON.parse(JSON.stringify(s.content)) : [],
        theme: s.theme ? JSON.parse(JSON.stringify(s.theme)) : {},
      });
      toast.showToast("success", t("marketing.newSection"));
      load();
    } catch (err: any) {
      toast.showToast("error", err?.message || "Failed to duplicate section");
    }
  };

  const columns: Column<SectionRow>[] = [
    { key: "key", header: t("marketing.key"), render: (s) => <span className="text-white font-mono text-xs">{s.key}</span> },
    { key: "title", header: t("marketing.title"), render: (s) => <span className="text-white font-medium">{s.title}</span> },
    {
      key: "status", header: t("marketing.status"),
      render: (s) => (
        <span className={`text-xs px-2 py-0.5 rounded ${s.status === "published" ? "bg-green-500/10 text-green-400" : "bg-gold-500/10 text-gold-500"}`}>
          {s.status === "published" ? t("marketing.published") : t("marketing.draft")}
          {s.status === "published" && s.has_pending_changes && (
            <span className="ml-1.5 text-amber-400">· {t("marketing.hasChanges")}</span>
          )}
        </span>
      ),
    },
    { key: "published_version", header: t("marketing.publishedVersion"), render: (s) => <span className="text-xs text-gray-400">{s.status === "published" ? `v${s.published_version}` : "—"}</span> },
    {
      key: "sort_order", header: t("marketing.sectionOrder"), sortable: false,
      render: (s) => {
        const idx = sections.findIndex((x) => x.id === s.id);
        return (
          <div className="flex gap-1">
            <button disabled={idx <= 0 || busy === s.id} onClick={(e) => { e.stopPropagation(); moveSection(idx, -1); }} className="px-1.5 py-1 text-xs bg-navy-900 border border-navy-700 rounded text-gray-400 hover:text-white disabled:opacity-30" title={t("marketing.moveUp")}>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button disabled={idx < 0 || idx >= sections.length - 1 || busy === s.id} onClick={(e) => { e.stopPropagation(); moveSection(idx, 1); }} className="px-1.5 py-1 text-xs bg-navy-900 border border-navy-700 rounded text-gray-400 hover:text-white disabled:opacity-30" title={t("marketing.moveDown")}>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
    { key: "updated_at", header: t("marketing.updated"), render: (s) => <span className="text-xs text-gray-400">{s.updated_at ? new Date(s.updated_at).toLocaleString() : "—"}</span> },
    {
      key: "actions", header: t("marketing.actions"), sortable: false,
      render: (s) => (
        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => duplicateSection(s)} className="px-2 py-1 text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded hover:bg-indigo-500/20" title={t("marketing.duplicate")}>
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => router.push(`/marketing/sections/${s.id}`)} className="px-2 py-1 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/20" title={t("marketing.editSection")}>
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {(s.status !== "published" || s.has_pending_changes) && (
            <button disabled={busy === s.id} onClick={() => run(s.id, () => api.post(`/landing-sections/${s.id}/publish/`), t("marketing.published"))} className="px-2 py-1 text-xs bg-green-500/10 text-green-400 border border-green-500/30 rounded hover:bg-green-500/20 disabled:opacity-50" title={t("marketing.publish")}>
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
          {s.status === "published" && s.published_version > 0 && (
            <button disabled={busy === s.id} onClick={() => run(s.id, () => api.post(`/landing-sections/${s.id}/rollback/`), t("marketing.rollback"))} className="px-2 py-1 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded hover:bg-amber-500/20 disabled:opacity-50" title={t("marketing.rollback")}>
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => setDeleteTarget(s)} className="px-2 py-1 text-xs bg-red-500/10 text-red-400 border border-red-500/30 rounded hover:bg-red-500/20" title={t("marketing.deleteSection")}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 min-w-0">
      <PageHeader
        title={t("marketing.sectionList")}
        actions={
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 bg-gold-500 text-navy-900 rounded-lg text-sm font-semibold">
            <Plus className="w-4 h-4" /> {t("marketing.newSection")}
          </button>
        }
      />
      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <LoadingSkeleton type="table" rows={6} />
        ) : sections.length === 0 ? (
          <EmptyState message={t("marketing.noSections")} />
        ) : (
          <DataTable columns={columns} data={sections} keyField="id" onRowClick={(s) => router.push(`/marketing/sections/${s.id}`)} />
        )}
      </main>

      <ModalForm open={showCreate} onClose={() => setShowCreate(false)} title={t("marketing.newSection")} footer={(
        <>
          <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">{t("common.cancel")}</button>
          <button type="submit" form="new-section-form" className="px-6 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg text-sm">{t("common.create")}</button>
        </>
      )}>
        <form id="new-section-form" onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t("marketing.key")}</label>
            <select value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm">
              {SECTION_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t("marketing.title")}</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t("marketing.description")}</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm" />
          </div>
        </form>
      </ModalForm>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t("marketing.deleteSection")}
        message={deleteTarget ? `${deleteTarget.title} (${deleteTarget.key})` : ""}
        confirmLabel={t("common.delete")}
        onConfirm={() => {
          if (!deleteTarget) return;
          run(deleteTarget.id, () => api.delete(`/landing-sections/${deleteTarget.id}/`), t("marketing.deleteSection"));
          setDeleteTarget(null);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
