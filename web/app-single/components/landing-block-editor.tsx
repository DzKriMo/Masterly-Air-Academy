"use client";
import React, { useState } from "react";
import { useTranslation } from "@/lib/use-translation";
import { BLOCK_TYPES, Block, BlockType, defaultBlockData, resolveField } from "@/components/landing-blocks";
import { Plus, Trash2, GripVertical, CopyPlus } from "lucide-react";

// ============================================================
// MASTERLY | Landing block editor
// Typed editors for each block type, with per-locale fields
// and a media picker fed from the landing media library.
// ============================================================

type Loc = string | { en?: string; fr?: string; ar?: string } | undefined;

type LocaleText = { en?: string; fr?: string; ar?: string };
type LocaleCode = keyof LocaleText;

function toLoc(value: any): LocaleText {
  if (!value) return {};
  if (typeof value === "string") return { en: value };
  if (typeof value === "object") return { en: value.en || "", fr: value.fr || "", ar: value.ar || "" };
  return {};
}

const LOCALES: { code: LocaleCode; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "ar", label: "AR" },
];

function LocalizedInput({ label, value, onChange, textarea = false }: { label: string; value: Loc; onChange: (v: any) => void; textarea?: boolean }) {
  const loc = toLoc(value);
  const set = (code: LocaleCode, v: string) => onChange({ ...loc, [code]: v });
  return (
    <div className="mb-3">
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <div className="grid grid-cols-3 gap-2">
        {LOCALES.map((l) => (
          <div key={l.code} className="relative">
            <span className="absolute left-2 top-2 text-[9px] font-bold text-gray-500 uppercase">{l.label}</span>
            {textarea ? (
              <textarea value={loc[l.code] || ""} onChange={(e) => set(l.code, e.target.value)} rows={3} className="w-full pt-6 px-2 pb-2 bg-navy-900 border border-navy-600 rounded-lg text-white text-xs" />
            ) : (
              <input value={loc[l.code] || ""} onChange={(e) => set(l.code, e.target.value)} className="w-full pt-5 px-2 pb-1.5 bg-navy-900 border border-navy-600 rounded-lg text-white text-xs" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ListEditor<T>({ label, items, onChange, renderItem }: { label: string; items: T[]; onChange: (items: T[]) => void; renderItem: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode }) {
  const { t } = useTranslation();
  const list = items || [];
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const moveItem = (from: number, to: number) => {
    if (from === to) return;
    const next = [...list];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onChange(next);
  };

  return (
    <div className="mb-3">
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <div className="space-y-2">
        {list.map((item, i) => (
          <div
            key={i}
            onDragOver={(e) => { if (dragIndex !== null && dragIndex !== i) { e.preventDefault(); setOverIndex(i); } }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null && dragIndex !== i) moveItem(dragIndex, i);
              setDragIndex(null); setOverIndex(null);
            }}
            className={`border border-navy-700 rounded-lg p-2 bg-navy-900/50 transition-colors ${dragIndex === i ? "opacity-40" : ""} ${overIndex === i && dragIndex !== null && dragIndex !== i ? "ring-2 ring-gold-500/60" : ""}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                draggable
                onDragStart={(e) => { setDragIndex(i); e.dataTransfer.effectAllowed = "move"; }}
                onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-white p-1 -m-1"
                title={t("marketing.dragToReorder")}
              >
                <GripVertical className="w-4 h-4" />
              </span>
              <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300" title={t("marketing.removeBlock")}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {renderItem(item, (patch) => {
              const next = list.map((it, j) => (j === i ? { ...(it as object), ...patch } : it));
              onChange(next as T[]);
            })}
          </div>
        ))}
        <button type="button" onClick={() => onChange([...list, {} as T])} className="flex items-center gap-1 text-xs text-gold-500 hover:text-gold-400">
          <Plus className="w-3.5 h-3.5" /> {t("marketing.addBlock")}
        </button>
      </div>
    </div>
  );
}

function MediaPicker({ value, onChange, media }: { value: any; onChange: (v: any) => void; media: any[] }) {
  const { t } = useTranslation();
  return (
    <div className="mb-3">
      <label className="block text-xs text-gray-400 mb-1">{t("marketing.file")}</label>
      <div className="flex gap-2">
        <select value={value?.key || ""} onChange={(e) => onChange({ ...(value || {}), key: e.target.value })} className="flex-1 px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white text-xs">
          <option value="">—</option>
          {media.map((m: any) => (
            <option key={m.id} value={m.file_key}>{m.name}</option>
          ))}
        </select>
        <input
          value={value?.alt || ""}
          onChange={(e) => onChange({ ...(value || {}), alt: e.target.value })}
          placeholder={t("marketing.altText")}
          className="flex-1 px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white text-xs"
        />
      </div>
    </div>
  );
}

function HeaderFields({ d, setField }: { d: any; setField: (k: string, v: any) => void }) {
  return (
    <>
      <LocalizedInput label="Kicker" value={d.kicker} onChange={(v) => setField("kicker", v)} />
      <LocalizedInput label="Heading" value={d.heading} onChange={(v) => setField("heading", v)} />
      <LocalizedInput label="Subtitle" value={d.subtitle} onChange={(v) => setField("subtitle", v)} textarea />
    </>
  );
}

function BlockFields({ block, media, onChange }: { block: Block; media: any[]; onChange: (data: any) => void }) {
  const { t } = useTranslation();
  const d = block.data || {};

  const setField = (key: string, v: any) => onChange({ ...d, [key]: v });
  const setItems = (key: string, items: any[]) => onChange({ ...d, [key]: items });

  switch (block.type) {
    case "hero":
      return (
        <>
          <LocalizedInput label="Badge" value={d.badge} onChange={(v) => setField("badge", v)} />
          <LocalizedInput label="Title" value={d.title} onChange={(v) => setField("title", v)} />
          <LocalizedInput label="Subtitle" value={d.subtitle} onChange={(v) => setField("subtitle", v)} textarea />
          <MediaPicker value={d.image} onChange={(v) => setField("image", v?.key ? v : null)} media={media} />
          <ListEditor label="CTAs" items={d.ctas || []} onChange={(items) => setItems("ctas", items)} renderItem={(item, update) => (
            <div className="grid grid-cols-2 gap-2">
              <LocalizedInput label="Text" value={(item as any).text} onChange={(v) => update({ text: v })} />
              <div className="mb-3">
                <label className="block text-xs text-gray-400 mb-1">Link</label>
                <input value={(item as any).link || ""} onChange={(e) => update({ link: e.target.value })} className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white text-xs" />
              </div>
            </div>
          )} />
        </>
      );
    case "rich_text":
      return (
        <>
          <HeaderFields d={d} setField={setField} />
          <LocalizedInput label="Body" value={d.body} onChange={(v) => setField("body", v)} textarea />
        </>
      );
    case "stats":
      return (
        <>
          <HeaderFields d={d} setField={setField} />
          <ListEditor label="Stats" items={d.items || []} onChange={(items) => setItems("items", items)} renderItem={(item, update) => (
            <div className="grid grid-cols-2 gap-2">
              <LocalizedInput label="Value" value={(item as any).value} onChange={(v) => update({ value: v })} />
              <LocalizedInput label="Label" value={(item as any).label} onChange={(v) => update({ label: v })} />
            </div>
          )} />
        </>
      );
    case "features":
      return (
        <>
          <HeaderFields d={d} setField={setField} />
          <ListEditor label="Features" items={d.items || []} onChange={(items) => setItems("items", items)} renderItem={(item, update) => (
            <div className="space-y-2">
              <LocalizedInput label="Title" value={(item as any).title} onChange={(v) => update({ title: v })} />
              <LocalizedInput label="Description" value={(item as any).description} onChange={(v) => update({ description: v })} textarea />
            </div>
          )} />
        </>
      );
    case "programs":
      return (
        <>
          <HeaderFields d={d} setField={setField} />
          <div className="grid grid-cols-2 gap-2">
            <LocalizedInput label="Duration label" value={d.durationLabel} onChange={(v) => setField("durationLabel", v)} />
            <LocalizedInput label="Prereq label" value={d.prereqLabel} onChange={(v) => setField("prereqLabel", v)} />
          </div>
          <ListEditor label="Programs" items={d.items || []} onChange={(items) => setItems("items", items)} renderItem={(item, update) => (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="mb-3">
                  <label className="block text-xs text-gray-400 mb-1">Code</label>
                  <input value={(item as any).code || ""} onChange={(e) => update({ code: e.target.value })} className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white text-xs" />
                </div>
                <div className="mb-3">
                  <label className="block text-xs text-gray-400 mb-1">Link</label>
                  <input value={(item as any).link || ""} onChange={(e) => update({ link: e.target.value })} className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <LocalizedInput label="Title" value={(item as any).title} onChange={(v) => update({ title: v })} />
                <LocalizedInput label="Duration" value={(item as any).duration} onChange={(v) => update({ duration: v })} />
              </div>
              <LocalizedInput label="Description" value={(item as any).description} onChange={(v) => update({ description: v })} textarea />
              <LocalizedInput label="Prerequisites" value={(item as any).prereq} onChange={(v) => update({ prereq: v })} />
              <MediaPicker value={(item as any).image} onChange={(v) => update({ image: v?.key ? v : null })} media={media} />
            </div>
          )} />
        </>
      );
    case "logos":
    case "gallery":
      return (
        <>
          <HeaderFields d={d} setField={setField} />
          <ListEditor label={block.type === "logos" ? "Logos" : "Gallery"} items={d.items || []} onChange={(items) => setItems("items", items)} renderItem={(item, update) => (
            <div className="space-y-2">
              <MediaPicker value={{ key: (item as any).key, alt: (item as any).alt }} onChange={(v) => update({ key: v.key, alt: v.alt })} media={media} />
              {block.type === "gallery" && <LocalizedInput label="Caption" value={(item as any).caption} onChange={(v) => update({ caption: v })} />}
            </div>
          )} />
        </>
      );
    case "video":
      return (
        <>
          <HeaderFields d={d} setField={setField} />
          <ListEditor label="Videos" items={d.items || []} onChange={(items) => setItems("items", items)} renderItem={(item, update) => (
            <div className="space-y-2">
              <LocalizedInput label="Title" value={(item as any).title} onChange={(v) => update({ title: v })} />
              <div className="mb-3">
                <label className="block text-xs text-gray-400 mb-1">YouTube URL or media key</label>
                <input value={(item as any).url || ""} onChange={(e) => update({ url: e.target.value })} className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white text-xs" />
              </div>
            </div>
          )} />
        </>
      );
    case "testimonials":
      return (
        <>
          <HeaderFields d={d} setField={setField} />
          <ListEditor label="Testimonials" items={d.items || []} onChange={(items) => setItems("items", items)} renderItem={(item, update) => (
            <div className="space-y-2">
              <LocalizedInput label="Quote" value={(item as any).quote} onChange={(v) => update({ quote: v })} textarea />
              <div className="grid grid-cols-2 gap-2">
                <LocalizedInput label="Author" value={(item as any).author} onChange={(v) => update({ author: v })} />
                <LocalizedInput label="Role" value={(item as any).role} onChange={(v) => update({ role: v })} />
              </div>
            </div>
          )} />
        </>
      );
    case "cta":
      return (
        <>
          <LocalizedInput label="Heading" value={d.heading} onChange={(v) => setField("heading", v)} />
          <LocalizedInput label="Subtitle" value={d.subtitle} onChange={(v) => setField("subtitle", v)} textarea />
          <ListEditor label="Buttons" items={d.ctas || []} onChange={(items) => setItems("ctas", items)} renderItem={(item, update) => (
            <div className="space-y-2">
              <LocalizedInput label="Text" value={(item as any).text} onChange={(v) => update({ text: v })} />
              <div className="grid grid-cols-2 gap-2">
                <div className="mb-3">
                  <label className="block text-xs text-gray-400 mb-1">Link</label>
                  <input value={(item as any).link || ""} onChange={(e) => update({ link: e.target.value })} className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white text-xs" />
                </div>
                <div className="mb-3">
                  <label className="block text-xs text-gray-400 mb-1">Style</label>
                  <select value={(item as any).style || "solid"} onChange={(e) => update({ style: e.target.value })} className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white text-xs">
                    <option value="solid">Solid</option>
                    <option value="outline">Outline</option>
                  </select>
                </div>
              </div>
            </div>
          )} />
        </>
      );
    case "faq":
      return (
        <>
          <HeaderFields d={d} setField={setField} />
          <ListEditor label="Questions" items={d.items || []} onChange={(items) => setItems("items", items)} renderItem={(item, update) => (
            <div className="space-y-2">
              <LocalizedInput label="Question" value={(item as any).question} onChange={(v) => update({ question: v })} />
              <LocalizedInput label="Answer" value={(item as any).answer} onChange={(v) => update({ answer: v })} textarea />
            </div>
          )} />
        </>
      );
    case "team":
      return (
        <>
          <HeaderFields d={d} setField={setField} />
          <ListEditor label="Members" items={d.items || []} onChange={(items) => setItems("items", items)} renderItem={(item, update) => (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <LocalizedInput label="Name" value={(item as any).name} onChange={(v) => update({ name: v })} />
                <LocalizedInput label="Role" value={(item as any).role} onChange={(v) => update({ role: v })} />
              </div>
              <LocalizedInput label="Bio" value={(item as any).bio} onChange={(v) => update({ bio: v })} textarea />
              <MediaPicker value={(item as any).image} onChange={(v) => update({ image: v?.key ? v : null })} media={media} />
            </div>
          )} />
        </>
      );
    case "image":
      return (
        <>
          <MediaPicker value={d.image} onChange={(v) => setField("image", v?.key ? v : null)} media={media} />
          <LocalizedInput label="Caption" value={d.caption} onChange={(v) => setField("caption", v)} />
        </>
      );
    case "embed":
      return (
        <>
          <LocalizedInput label="Title" value={d.title} onChange={(v) => setField("title", v)} />
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">HTML code</label>
            <textarea value={d.html || ""} onChange={(e) => setField("html", e.target.value)} rows={6} className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white text-xs font-mono" />
            <p className="text-[10px] text-gray-500 mt-1">Trusted embeds only (iframes, maps, forms).</p>
          </div>
        </>
      );
    case "contact":
      return (
        <>
          <LocalizedInput label="Heading" value={d.heading} onChange={(v) => setField("heading", v)} />
          <LocalizedInput label="Subtitle" value={d.subtitle} onChange={(v) => setField("subtitle", v)} textarea />
          <ListEditor label="Channels" items={d.items || []} onChange={(items) => setItems("items", items)} renderItem={(item, update) => (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <LocalizedInput label="Label" value={(item as any).label} onChange={(v) => update({ label: v })} />
                <div className="mb-3">
                  <label className="block text-xs text-gray-400 mb-1">Type</label>
                  <select value={(item as any).type || "link"} onChange={(e) => update({ type: e.target.value })} className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white text-xs">
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="address">Address</option>
                    <option value="link">Link</option>
                  </select>
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs text-gray-400 mb-1">Value</label>
                <input value={(item as any).value || ""} onChange={(e) => update({ value: e.target.value })} className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white text-xs" />
              </div>
              {(item as any).type === "link" && (
                <div className="mb-3">
                  <label className="block text-xs text-gray-400 mb-1">Link URL</label>
                  <input value={(item as any).link || ""} onChange={(e) => update({ link: e.target.value })} className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white text-xs" />
                </div>
              )}
            </div>
          )} />
        </>
      );
    default:
      return null;
  }
}

const BLOCK_LABEL_KEYS: Record<BlockType, string> = {
  hero: "marketing.blockHero",
  rich_text: "marketing.blockRichText",
  stats: "marketing.blockStats",
  features: "marketing.blockFeatures",
  programs: "marketing.blockPrograms",
  logos: "marketing.blockLogos",
  gallery: "marketing.blockGallery",
  video: "marketing.blockVideo",
  testimonials: "marketing.blockTestimonials",
  cta: "marketing.blockCta",
  faq: "marketing.blockFaq",
  team: "marketing.blockTeam",
  image: "marketing.blockImage",
  embed: "marketing.blockEmbed",
  contact: "marketing.blockContact",
};

export default function LandingBlockEditor({ blocks, media, onChange }: { blocks: Block[]; media: any[]; onChange: (blocks: Block[]) => void }) {
  const { t } = useTranslation();
  const list = blocks || [];
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [newBlockType, setNewBlockType] = useState<BlockType>("rich_text");

  const updateBlock = (i: number, patch: Partial<Block>) => {
    onChange(list.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  };
  const updateData = (i: number, data: any) => updateBlock(i, { data });
  const mergeBlockData = (old: any, type: BlockType): Record<string, any> => {
    const fresh = defaultBlockData(type);
    const merged: Record<string, any> = {};
    for (const k of Object.keys(fresh)) merged[k] = old && k in old ? old[k] : fresh[k];
    return merged;
  };
  const changeType = (i: number, type: BlockType) => {
    onChange(list.map((b, j) => (j === i ? { type, data: mergeBlockData(b.data, type) } : b)));
  };
  const cloneBlock = (i: number) => {
    const copy = JSON.parse(JSON.stringify(list[i])) as Block;
    const next = [...list];
    next.splice(i + 1, 0, copy);
    onChange(next);
  };
  const addBlock = (type: BlockType) => {
    onChange([...list, { type, data: defaultBlockData(type) }]);
  };
  const moveBlock = (from: number, to: number) => {
    if (from === to) return;
    const next = [...list];
    const [b] = next.splice(from, 1);
    next.splice(to, 0, b);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {list.length === 0 && <p className="text-sm text-gray-500">{t("marketing.noSections")}</p>}
      {list.map((block, i) => (
        <div
          key={i}
          onDragOver={(e) => { if (dragIndex !== null && dragIndex !== i) { e.preventDefault(); setOverIndex(i); } }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragIndex !== null && dragIndex !== i) moveBlock(dragIndex, i);
            setDragIndex(null); setOverIndex(null);
          }}
          className={`bg-navy-800 border border-navy-700 rounded-xl p-4 transition-colors ${dragIndex === i ? "opacity-40" : ""} ${overIndex === i && dragIndex !== null && dragIndex !== i ? "ring-2 ring-gold-500/60" : ""}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                draggable
                onDragStart={(e) => { setDragIndex(i); e.dataTransfer.effectAllowed = "move"; }}
                onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-white"
                title={t("marketing.dragToReorder")}
              >
                <GripVertical className="w-4 h-4" />
              </span>
              <select
                value={block.type}
                onChange={(e) => changeType(i, e.target.value as BlockType)}
                className="px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-white text-sm"
              >
                {BLOCK_TYPES.map((bt) => (
                  <option key={bt} value={bt}>{t(BLOCK_LABEL_KEYS[bt], bt)}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => cloneBlock(i)} className="text-gray-500 hover:text-gold-500" title={t("marketing.duplicate")}>
                <CopyPlus className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300" title={t("marketing.removeBlock")}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <BlockFields block={block} media={media} onChange={(data) => updateData(i, data)} />
        </div>
      ))}
      <div className="flex gap-2">
        <select
          value={newBlockType}
          onChange={(e) => setNewBlockType(e.target.value as BlockType)}
          className="flex-1 px-3 py-2 text-sm bg-navy-900 border border-dashed border-gold-500/40 rounded-lg text-gold-500"
        >
          {BLOCK_TYPES.map((bt) => (
            <option key={bt} value={bt} className="bg-navy-900 text-white">{t(BLOCK_LABEL_KEYS[bt], bt)}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => addBlock(newBlockType)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm text-gold-500 border border-dashed border-gold-500/40 rounded-lg hover:bg-gold-500/10"
        >
          <Plus className="w-4 h-4" /> {t("marketing.addBlock")}
        </button>
      </div>
    </div>
  );
}

export { resolveField };
