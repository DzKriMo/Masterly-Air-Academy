"use client";
import React from "react";
import Link from "next/link";
import { api } from "@/lib/api";

// ============================================================
// MASTERLY | Landing page block renderer
// Shared by the public landing page and the marketing editor
// preview so both always render identically.
// ============================================================

export const BLOCK_TYPES = [
  "hero",
  "rich_text",
  "stats",
  "features",
  "programs",
  "logos",
  "gallery",
  "video",
  "testimonials",
] as const;

export type BlockType = typeof BLOCK_TYPES[number];

export interface Block {
  type: BlockType;
  data: Record<string, any>;
}

/** A field may be a plain string (all locales) or { en, fr, ar }. */
export function resolveField(field: any, locale: string): string {
  if (field == null) return "";
  if (typeof field === "string") return field;
  if (typeof field === "object") {
    return field[locale] || field["en"] || Object.values(field)[0] || "";
  }
  return String(field);
}

export function mediaUrl(key?: string | null): string {
  if (!key) return "";
  if (key.startsWith("http")) return key;
  return `${api.getBaseUrl()}/api/landing/media/${key}`;
}

export function videoUrl(url: string): string {
  if (!url) return "";
  // YouTube share/shorts/watch links -> embed
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  return mediaUrl(url);
}

export function defaultBlockData(type: BlockType): Record<string, any> {
  switch (type) {
    case "hero":
      return { badge: "Masterly Air Academy", title: "Your Sky Starts Here", subtitle: "Fly with the best training fleet in the region.", image: null, ctas: [{ text: "Explore Programs", link: "#programs" }, { text: "Contact Us", link: "#contact" }] };
    case "rich_text":
      return { heading: "About the Academy", body: "Write your content here." };
    case "stats":
      return { heading: "By the Numbers", items: [{ value: "20+", label: "Aircraft" }, { value: "15", label: "Instructors" }, { value: "100%", label: "Commitment" }] };
    case "features":
      return { heading: "Why Us", items: [{ title: "Modern Fleet", description: "Description here" }, { title: "Expert Instructors", description: "Description here" }, { title: "Full Support", description: "Description here" }] };
    case "programs":
      return { heading: "Training Programs", items: [{ title: "PPL", description: "Private Pilot License", image: null, link: "#programs" }] };
    case "logos":
      return { heading: "Accreditations", items: [{ key: "", alt: "" }] };
    case "gallery":
      return { heading: "Gallery", items: [{ key: "", alt: "", caption: "" }] };
    case "video":
      return { heading: "Videos", items: [{ title: "", url: "" }] };
    case "testimonials":
      return { heading: "Testimonials", items: [{ quote: "", author: "", role: "" }] };
    default:
      return {};
  }
}

function SectionShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`w-full py-14 px-6 ${className}`}>
      <div className="max-w-6xl mx-auto">{children}</div>
    </section>
  );
}

function Heading({ data, locale }: { data: any; locale: string }) {
  const heading = resolveField(data.heading, locale);
  if (!heading) return null;
  return (
    <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center tracking-tight">
      {heading}
    </h2>
  );
}

function HeroBlock({ data, locale }: { data: any; locale: string }) {
  const img = data.image ? mediaUrl(data.image.key) : "";
  return (
    <SectionShell>
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div>
          {data.badge ? (
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-gold-500 mb-4">{resolveField(data.badge, locale)}</span>
          ) : null}
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4">{resolveField(data.title, locale)}</h1>
          {data.subtitle ? <p className="text-lg text-gray-300 mb-8 max-w-xl">{resolveField(data.subtitle, locale)}</p> : null}
          {Array.isArray(data.ctas) && data.ctas.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {data.ctas.filter(Boolean).map((cta: any, i: number) => (
                <Link key={i} href={cta?.link || "#contact"} className={`px-6 py-3 rounded-lg text-sm font-semibold transition-colors ${i === 0 ? "bg-gold-500 text-navy-900 hover:bg-gold-600" : "border border-gray-600 text-white hover:border-gold-500 hover:text-gold-500"}`}>
                  {resolveField(cta?.text, locale)}
                </Link>
              ))}
            </div>
          )}
        </div>
        {img && (
          <div className="flex justify-center">
            <img src={img} alt={data.image?.alt || ""} className="max-w-full rounded-2xl shadow-2xl border border-navy-700" />
          </div>
        )}
      </div>
    </SectionShell>
  );
}

function RichTextBlock({ data, locale }: { data: any; locale: string }) {
  return (
    <SectionShell className="bg-navy-800/40">
      <Heading data={data} locale={locale} />
      {data.body ? (
        <div className="prose-invert max-w-3xl mx-auto text-center text-gray-300 leading-relaxed whitespace-pre-line">
          {resolveField(data.body, locale)}
        </div>
      ) : null}
    </SectionShell>
  );
}

function StatsBlock({ data, locale }: { data: any; locale: string }) {
  const items: any[] = Array.isArray(data.items) ? data.items : [];
  return (
    <SectionShell>
      <Heading data={data} locale={locale} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.filter((i) => i?.value).map((item, i) => (
          <div key={i} className="bg-navy-800 border border-navy-700 rounded-xl p-6 text-center">
            <p className="text-3xl font-extrabold text-gold-500">{resolveField(item.value, locale)}</p>
            <p className="text-sm text-gray-400 mt-2">{resolveField(item.label, locale)}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function FeaturesBlock({ data, locale }: { data: any; locale: string }) {
  const items: any[] = Array.isArray(data.items) ? data.items : [];
  return (
    <SectionShell className="bg-navy-800/40">
      <Heading data={data} locale={locale} />
      <div className="grid md:grid-cols-3 gap-6">
        {items.filter((i) => i?.title).map((item, i) => (
          <div key={i} className="bg-navy-800 border border-navy-700 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-gold-500/10 text-gold-500 flex items-center justify-center text-lg font-bold mb-4">{i + 1}</div>
            <h3 className="text-white font-semibold mb-2">{resolveField(item.title, locale)}</h3>
            <p className="text-sm text-gray-400">{resolveField(item.description, locale)}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function ProgramsBlock({ data, locale }: { data: any; locale: string }) {
  const items: any[] = Array.isArray(data.items) ? data.items : [];
  return (
    <SectionShell>
      <Heading data={data} locale={locale} />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.filter((i) => i?.title).map((item, i) => {
          const img = item.image ? mediaUrl(item.image.key) : "";
          const inner = (
            <>
              {img && <img src={img} alt={item.image?.alt || ""} className="w-full h-40 object-cover rounded-t-xl" />}
              <div className="p-5">
                <h3 className="text-white font-bold mb-2">{resolveField(item.title, locale)}</h3>
                <p className="text-sm text-gray-400">{resolveField(item.description, locale)}</p>
              </div>
            </>
          );
          return (
            <div key={i} className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
              {item.link ? <Link href={item.link}>{inner}</Link> : inner}
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

function LogosBlock({ data, locale }: { data: any; locale: string }) {
  const items: any[] = Array.isArray(data.items) ? data.items : [];
  return (
    <SectionShell className="bg-navy-800/40">
      <Heading data={data} locale={locale} />
      <div className="flex flex-wrap items-center justify-center gap-8">
        {items.filter((i) => i?.key).map((item, i) => (
          <img key={i} src={mediaUrl(item.key)} alt={item.alt || ""} className="h-16 w-auto object-contain opacity-80" />
        ))}
      </div>
    </SectionShell>
  );
}

function GalleryBlock({ data, locale }: { data: any; locale: string }) {
  const items: any[] = Array.isArray(data.items) ? data.items : [];
  return (
    <SectionShell>
      <Heading data={data} locale={locale} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.filter((i) => i?.key).map((item, i) => (
          <figure key={i} className="relative rounded-xl overflow-hidden border border-navy-700 aspect-video">
            <img src={mediaUrl(item.key)} alt={item.alt || ""} className="w-full h-full object-cover" />
            {item.caption && <figcaption className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent text-white text-xs p-3">{resolveField(item.caption, locale)}</figcaption>}
          </figure>
        ))}
      </div>
    </SectionShell>
  );
}

function VideoBlock({ data, locale }: { data: any; locale: string }) {
  const items: any[] = Array.isArray(data.items) ? data.items : [];
  const videos = items.filter((i) => i?.url);
  return (
    <SectionShell>
      <Heading data={data} locale={locale} />
      <div className="grid md:grid-cols-2 gap-6">
        {videos.map((item, i) => {
          const src = videoUrl(item.url);
          const isEmbed = src.includes("youtube") || src.includes("player.");
          return (
            <div key={i} className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
              {isEmbed ? (
                <div className="aspect-video">
                  <iframe src={src} className="w-full h-full" allowFullScreen title={item.title || "video"} />
                </div>
              ) : (
                <video src={src} controls className="w-full aspect-video bg-black" />
              )}
              {item.title && <p className="text-sm text-gray-300 p-3">{resolveField(item.title, locale)}</p>}
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

function TestimonialsBlock({ data, locale }: { data: any; locale: string }) {
  const items: any[] = Array.isArray(data.items) ? data.items : [];
  return (
    <SectionShell className="bg-navy-800/40">
      <Heading data={data} locale={locale} />
      <div className="grid md:grid-cols-3 gap-6">
        {items.filter((i) => i?.quote).map((item, i) => (
          <blockquote key={i} className="bg-navy-800 border border-navy-700 rounded-xl p-6">
            <p className="text-gray-300 text-sm italic mb-4">"{resolveField(item.quote, locale)}"</p>
            <footer className="text-white text-sm font-semibold">{resolveField(item.author, locale)}</footer>
            {item.role && <p className="text-xs text-gray-500">{resolveField(item.role, locale)}</p>}
          </blockquote>
        ))}
      </div>
    </SectionShell>
  );
}

export function LandingBlocks({ blocks, locale, className = "" }: { blocks: Block[]; locale: string; className?: string }) {
  if (!blocks || blocks.length === 0) return null;
  return (
    <div className={className}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "hero": return <HeroBlock key={i} data={block.data} locale={locale} />;
          case "rich_text": return <RichTextBlock key={i} data={block.data} locale={locale} />;
          case "stats": return <StatsBlock key={i} data={block.data} locale={locale} />;
          case "features": return <FeaturesBlock key={i} data={block.data} locale={locale} />;
          case "programs": return <ProgramsBlock key={i} data={block.data} locale={locale} />;
          case "logos": return <LogosBlock key={i} data={block.data} locale={locale} />;
          case "gallery": return <GalleryBlock key={i} data={block.data} locale={locale} />;
          case "video": return <VideoBlock key={i} data={block.data} locale={locale} />;
          case "testimonials": return <TestimonialsBlock key={i} data={block.data} locale={locale} />;
          default: return null;
        }
      })}
    </div>
  );
}
