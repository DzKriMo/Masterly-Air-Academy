"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { XCircle, Mail, Phone, MapPin, Link2, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";

// ============================================================
// MASTERLY | Landing page block renderer
// Shared by the public landing page and the marketing editor
// preview so both always render identically.
// Each block accepts an optional per-section ``theme`` so social
// managers can re-style sections (accent colour, background,
// padding, alignment) without touching code.
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
  "cta",
  "faq",
  "team",
  "image",
  "embed",
  "contact",
] as const;

export type BlockType = typeof BLOCK_TYPES[number];

export interface Block {
  type: BlockType;
  data: Record<string, any>;
}

export interface LandingTheme {
  accent?: string;
  background?: string;
  padding?: "none" | "sm" | "md" | "lg";
  align?: "left" | "center";
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
  if (key.startsWith("http") || key.startsWith("/")) return key;
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
      return { kicker: "", heading: "About the Academy", subtitle: "", body: "Write your content here." };
    case "stats":
      return { kicker: "", heading: "By the Numbers", subtitle: "", items: [{ value: "20+", label: "Aircraft" }, { value: "15", label: "Instructors" }, { value: "100%", label: "Commitment" }] };
    case "features":
      return { kicker: "", heading: "Why Us", subtitle: "", items: [{ title: "Modern Fleet", description: "Description here" }, { title: "Expert Instructors", description: "Description here" }, { title: "Full Support", description: "Description here" }] };
    case "programs":
      return { kicker: "", heading: "Training Programs", subtitle: "", durationLabel: "Duration", prereqLabel: "Prerequisites", items: [{ code: "PPL", title: "PPL", description: "Private Pilot License", image: null, link: "#programs", duration: "", prereq: "" }] };
    case "logos":
      return { kicker: "", heading: "Accreditations", subtitle: "", items: [{ key: "", alt: "" }] };
    case "gallery":
      return { kicker: "", heading: "Gallery", subtitle: "", items: [{ key: "", alt: "", caption: "" }] };
    case "video":
      return { kicker: "", heading: "Videos", subtitle: "", items: [{ title: "", url: "" }] };
    case "testimonials":
      return { kicker: "", heading: "Testimonials", subtitle: "", items: [{ quote: "", author: "", role: "" }] };
    case "cta":
      return { heading: "Ready to Start?", subtitle: "Contact us to begin your journey with Masterly Air Academy.", ctas: [{ text: "Contact Us", link: "#contact", style: "solid" }, { text: "Learn More", link: "#programs", style: "outline" }] };
    case "faq":
      return { kicker: "", heading: "Frequently Asked Questions", subtitle: "", items: [{ question: "How do I apply?", answer: "Write your answer here." }] };
    case "team":
      return { kicker: "", heading: "Our Instructors", subtitle: "", items: [{ name: "Name", role: "Lead Instructor", bio: "Short bio", image: null }] };
    case "image":
      return { image: { key: "", alt: "" }, caption: "Add a caption" };
    case "embed":
      return { title: "Embedded content", html: '<iframe width="560" height="315" src="https://www.youtube.com/embed/VIDEO_ID" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>' };
    case "contact":
      return { heading: "Get in Touch", subtitle: "Our team is ready to answer your questions.", items: [{ label: "Email", value: "info@masterly-air-academy.dz", type: "email" }, { label: "Phone", value: "+213 000 00 00 00", type: "phone" }], ctas: [{ text: "Contact Us", link: "#contact" }] };
    default:
      return {};
  }
}

function itemImage(item: any): string {
  if (!item || !item.image) return "";
  if (typeof item.image === "string") return mediaUrl(item.image);
  return mediaUrl(item.image.key);
}

function toItems(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

// ============================================================
// Theme helpers — a per-section theme is exposed as CSS custom
// properties so accents follow the accent colour automatically.
// ============================================================

const DEFAULT_ACCENT = "#c4943c";

const THEME_PADDING: Record<string, string> = {
  none: "py-0",
  sm: "py-10 md:py-12",
  md: "py-16 md:py-20",
  lg: "py-20 md:py-28",
};

function blockPadding(theme?: LandingTheme): string {
  return theme?.padding ? THEME_PADDING[theme.padding] : "py-20 md:py-28";
}

function blockBgStyle(theme?: LandingTheme): React.CSSProperties | undefined {
  return theme?.background ? { backgroundColor: theme.background } : undefined;
}

const accentText = (): React.CSSProperties => ({ color: "var(--accent, #c4943c)" });
const accentBg = (): React.CSSProperties => ({ backgroundColor: "var(--accent, #c4943c)" });
const accentBorder = (): React.CSSProperties => ({ borderColor: "var(--accent, #c4943c)" });

function SectionHeader({ data, locale, theme, className }: { data: any; locale: string; theme?: LandingTheme; className?: string }) {
  const kicker = data.kicker ? resolveField(data.kicker, locale) : "";
  const heading = data.heading ? resolveField(data.heading, locale) : "";
  const subtitle = data.subtitle ? resolveField(data.subtitle, locale) : "";
  if (!kicker && !heading && !subtitle) return null;
  const centered = !theme || theme.align !== "left";
  return (
    <div className={className || (centered ? "text-center mb-16" : "text-left mb-12")}>
      {kicker && <p className="text-gold-500 font-semibold text-sm tracking-widest uppercase mb-3" style={accentText()}>{kicker}</p>}
      {heading && <h2 className="text-3xl md:text-4xl font-bold mb-4">{heading}</h2>}
      {subtitle && <p className={`text-gray-400 max-w-2xl ${centered ? "mx-auto" : ""}`}>{subtitle}</p>}
    </div>
  );
}

// Original "Why Us" icon styles (gold / blue / green), cycled by index.
const FEATURE_STYLES = [
  { icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z", bg: "bg-gold-500/10", border: "border-gold-500/20", text: "text-gold-400" },
  { icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z", bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400" },
  { icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z", bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-400" },
];

const CONTACT_LABEL: Record<string, string> = { en: "Contact Us", fr: "Nous Contacter", ar: "اتصل بنا" };
const CLOSE_LABEL: Record<string, string> = { en: "Close", fr: "Fermer", ar: "إغلاق" };

function HeroBlock({ data, locale, theme }: { data: any; locale: string; theme?: LandingTheme }) {
  const img = data.image ? mediaUrl(data.image.key) : "";
  return (
    <section className="relative overflow-hidden" style={blockBgStyle(theme)}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gold-500/[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/[0.03] rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
      </div>
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-24 pb-24 md:pt-28 md:pb-32">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <div className="flex-1 text-center lg:text-left">
            {data.badge ? <p className="text-gold-500 font-semibold text-sm tracking-widest uppercase mb-4" style={accentText()}>{resolveField(data.badge, locale)}</p> : null}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">{resolveField(data.title, locale)}</h1>
            {data.subtitle ? <p className="text-lg md:text-xl text-gray-400 leading-relaxed mb-10">{resolveField(data.subtitle, locale)}</p> : null}
            {Array.isArray(data.ctas) && data.ctas.length > 0 && (
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                {data.ctas.filter(Boolean).map((cta: any, i: number) => (
                  <a key={i} href={cta?.link || "#contact"} className={`px-8 py-3.5 ${i === 0 ? "bg-gold-500 hover:brightness-110 text-navy-900 font-bold" : "border border-gold-500/30 hover:border-gold-500 text-gold-500 font-semibold"} rounded-lg transition-all`} style={i === 0 ? accentBg() : { ...accentText(), borderColor: "var(--accent, #c4943c)" }}>
                    {resolveField(cta?.text, locale)}
                  </a>
                ))}
              </div>
            )}
          </div>
          {img && (
            <div className="flex-shrink-0">
              <img src={img} alt={data.image?.alt || ""} className="w-64 md:w-80 lg:w-96 object-contain" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function RichTextBlock({ data, locale, theme }: { data: any; locale: string; theme?: LandingTheme }) {
  const kicker = data.kicker ? resolveField(data.kicker, locale) : "";
  const heading = data.heading ? resolveField(data.heading, locale) : "";
  const body = data.body ? resolveField(data.body, locale) : "";
  if (!heading && !body && !kicker) return null;
  const centered = !theme || theme.align !== "left";
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8" style={blockBgStyle(theme)}>
      <div className={`max-w-3xl ${blockPadding(theme)} ${centered ? "mx-auto text-center" : ""}`}>
        {kicker && <p className="text-gold-500 font-semibold text-sm tracking-widest uppercase mb-3" style={accentText()}>{kicker}</p>}
        {heading && <h2 className="text-3xl md:text-4xl font-bold mb-6">{heading}</h2>}
        {body && (
          <div className="space-y-4 text-gray-400 leading-relaxed">
            {body.split(/\n+/).filter(Boolean).map((p: string, i: number) => <p key={i}>{p}</p>)}
          </div>
        )}
      </div>
    </section>
  );
}

function StatsBlock({ data, locale, theme }: { data: any; locale: string; theme?: LandingTheme }) {
  const items: any[] = toItems(data.items).filter((i) => i?.value);
  if (!items.length) return null;
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8" style={blockBgStyle(theme)}>
      <div className={blockPadding(theme)}>
        <SectionHeader data={data} locale={locale} theme={theme} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((item, i) => (
            <div key={i} className="bg-navy-800 border border-navy-700 rounded-xl p-6 text-center">
              <p className="text-3xl font-extrabold text-gold-500" style={accentText()}>{resolveField(item.value, locale)}</p>
              <p className="text-sm text-gray-400 mt-2">{resolveField(item.label, locale)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// 4+ items render like the original About "big number" cards (2x2),
// 3 items render like the original Why Us icon cards (3 columns).
function FeaturesBlock({ data, locale, theme }: { data: any; locale: string; theme?: LandingTheme }) {
  const items: any[] = toItems(data.items).filter((i) => i?.title);
  if (!items.length) return null;
  const twoCol = items.length >= 4;
  return (
    <section className={twoCol ? "" : "bg-navy-800/30 border-y border-navy-800"} style={blockBgStyle(theme)}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className={blockPadding(theme)}>
          <SectionHeader data={data} locale={locale} theme={theme} />
          <div className={twoCol ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "grid grid-cols-1 md:grid-cols-3 gap-8"}>
            {items.map((item, i) =>
              twoCol ? (
                <div key={i} className="bg-navy-800 border border-navy-700 rounded-xl p-6">
                  <div className="text-2xl font-bold text-white mb-1">{resolveField(item.title, locale)}</div>
                  <p className="text-sm text-gray-400">{resolveField(item.description, locale)}</p>
                </div>
              ) : (
                <div key={i} className="text-center">
                  <div className={`w-14 h-14 mx-auto mb-5 rounded-xl ${FEATURE_STYLES[i % 3].bg} border ${FEATURE_STYLES[i % 3].border} flex items-center justify-center`}>
                    <svg className={`w-6 h-6 ${FEATURE_STYLES[i % 3].text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={FEATURE_STYLES[i % 3].icon} />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{resolveField(item.title, locale)}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{resolveField(item.description, locale)}</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// Original "Programs" carousel: infinite loop, drag/swipe, autoplay, arrows, dots.
function ProgramsBlock({ data, locale, theme }: { data: any; locale: string; theme?: LandingTheme }) {
  const items: any[] = toItems(data.items).filter((i) => i?.title);
  const totalSlides = items.length;
  const EXTENDED = [...items, ...items, ...items];
  const SWIPE_THRESHOLD = 50;
  const [cardsPerView, setCardsPerView] = useState(3);
  const [isHovering, setIsHovering] = useState(false);
  const [rawSlide, setRawSlide] = useState(totalSlides);
  const [transitionOn, setTransitionOn] = useState(true);
  const [dragOffset, setDragOffset] = useState(0);
  const [selected, setSelected] = useState<any>(null);
  const snappingRef = useRef(false);
  const dragMeta = useRef({ active: false, startX: 0, moved: false });
  const dragOffsetRef = useRef(0);

  useEffect(() => {
    const update = () => setCardsPerView(window.innerWidth < 620 ? 1 : 3);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    setRawSlide(totalSlides);
  }, [totalSlides]);

  const handleTransitionEnd = useCallback(() => {
    if (rawSlide >= totalSlides * 2) {
      snappingRef.current = true;
      setTransitionOn(false);
      setRawSlide(rawSlide - totalSlides);
    } else if (rawSlide < totalSlides) {
      snappingRef.current = true;
      setTransitionOn(false);
      setRawSlide(rawSlide + totalSlides);
    }
  }, [rawSlide, totalSlides]);

  useEffect(() => {
    if (!transitionOn) {
      requestAnimationFrame(() => requestAnimationFrame(() => { setTransitionOn(true); snappingRef.current = false; }));
    }
  }, [transitionOn]);

  const goToSlide = useCallback((idx: number) => {
    if (snappingRef.current) return;
    setRawSlide(idx + totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    if (snappingRef.current) return;
    setRawSlide(prev => prev - 1);
  }, []);

  const nextSlide = useCallback(() => {
    if (snappingRef.current) return;
    setRawSlide(prev => prev + 1);
  }, []);

  const dragStart = useCallback((clientX: number) => {
    dragMeta.current = { active: true, startX: clientX, moved: false };
    setDragOffset(0);
  }, []);

  const dragMove = useCallback((clientX: number) => {
    const m = dragMeta.current;
    if (!m.active) return;
    const offset = clientX - m.startX;
    if (Math.abs(offset) > 5) m.moved = true;
    dragOffsetRef.current = offset;
    setDragOffset(offset);
  }, []);

  const dragEnd = useCallback(() => {
    const m = dragMeta.current;
    if (!m.active) return;
    m.active = false;
    if (m.moved) {
      if (dragOffsetRef.current > SWIPE_THRESHOLD) prevSlide();
      else if (dragOffsetRef.current < -SWIPE_THRESHOLD) nextSlide();
    }
    setDragOffset(0);
  }, [prevSlide, nextSlide, SWIPE_THRESHOLD]);

  useEffect(() => {
    if (isHovering) return;
    if (dragMeta.current.active) return;
    if (snappingRef.current) return;
    const timer = setInterval(() => {
      setRawSlide(prev => prev + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, [isHovering, totalSlides]);

  if (totalSlides === 0) return null;

  return (
    <section className="bg-navy-800/30 border-y border-navy-800" style={blockBgStyle(theme)}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className={blockPadding(theme)}>
          <SectionHeader data={data} locale={locale} theme={theme} />

          <style>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{scrollbar-width:none;-ms-overflow-style:none}`}</style>

          <div className="relative px-1 md:px-12" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
            <div className="overflow-hidden rounded-xl select-none">
              <div className="flex gap-3" style={{
                transform: dragMeta.current.active
                  ? `translateX(calc(-${rawSlide * (100 / cardsPerView)}% + ${dragOffset}px))`
                  : `translateX(-${rawSlide * (100 / cardsPerView)}%)`,
                transition: dragMeta.current.active ? "none" : (transitionOn ? "transform 500ms ease-out" : "none"),
              }}
                onTransitionEnd={handleTransitionEnd}
                onMouseDown={e => dragStart(e.clientX)}
                onMouseMove={e => dragMove(e.clientX)}
                onMouseUp={dragEnd}
                onMouseLeave={dragEnd}
                onTouchStart={e => dragStart(e.touches[0].clientX)}
                onTouchMove={e => dragMove(e.touches[0].clientX)}
                onTouchEnd={dragEnd}>
                {EXTENDED.map((prog, i) => {
                  const img = itemImage(prog);
                  const inner = (
                    <>
                      <div className="relative h-44 bg-navy-800 overflow-hidden shrink-0">
                        {img && <img src={img} alt={prog.image?.alt || resolveField(prog.title, locale)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-transparent to-transparent" />
                        {prog.code && <span className="absolute top-3 left-3 text-xs font-bold text-gold-500 bg-navy-900/80 px-3 py-1 rounded-full tracking-wider backdrop-blur" style={accentText()}>{prog.code}</span>}
                      </div>
                      <div className="flex-1 p-5 flex flex-col">
                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-gold-500 transition-colors">{resolveField(prog.title, locale)}</h3>
                        <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 flex-1">{resolveField(prog.description, locale)}</p>
                        {(prog.duration || prog.prereq) && (
                          <div className="border-t border-navy-700 pt-4 mt-4 space-y-1.5 shrink-0">
                            {prog.duration && <div className="flex justify-between text-xs"><span className="text-gray-500">{resolveField(prog.durationLabel || data.durationLabel, locale) || "Duration"}</span><span className="text-gray-300">{resolveField(prog.duration, locale)}</span></div>}
                            {prog.prereq && <div className="flex justify-between text-xs"><span className="text-gray-500">{resolveField(prog.prereqLabel || data.prereqLabel, locale) || "Prerequisites"}</span><span className="text-gray-300">{resolveField(prog.prereq, locale)}</span></div>}
                          </div>
                        )}
                      </div>
                    </>
                  );
                  return (
                    <div key={`${i}-${prog.code || "prog"}`} className="shrink-0" style={{ width: `calc(${100 / cardsPerView}% - 8px)` }}>
                      <button
                        onClick={(e) => { if (dragMeta.current.moved) e.preventDefault(); else setSelected(prog); }}
                        className="h-full w-full group bg-navy-900 border border-navy-700 rounded-xl overflow-hidden hover:border-gold-500/50 transition-all text-left hover:-translate-y-1 hover:shadow-xl hover:shadow-gold-500/5 flex flex-col">
                        {inner}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <button onClick={prevSlide}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 md:-translate-x-4 w-10 h-10 bg-navy-800/90 border border-navy-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-navy-700 transition-all backdrop-blur shadow-lg z-10">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>

            <button onClick={nextSlide}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 md:translate-x-4 w-10 h-10 bg-navy-800/90 border border-navy-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-navy-700 transition-all backdrop-blur shadow-lg z-10">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          <div className="flex justify-center items-center gap-2 mt-8">
            {items.map((_, i) => (
              <button key={i} onClick={() => goToSlide(i)}
                className={`w-2 rounded-full transition-all duration-300 ${i === rawSlide % totalSlides ? "w-6" : "bg-navy-600 hover:bg-navy-500 w-2"} h-2`}
                style={i === rawSlide % totalSlides ? accentBg() : undefined} />
            ))}
          </div>
        </div>
      </div>

      {/* Program Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="bg-navy-800 border border-navy-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="relative h-48 bg-navy-800 overflow-hidden rounded-t-2xl">
              {itemImage(selected) && <img src={itemImage(selected)} alt={selected.image?.alt || resolveField(selected.title, locale)} className="w-full h-full object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-t from-navy-800 via-transparent to-transparent" />
              <button onClick={() => setSelected(null)} className="absolute top-3 right-3 w-8 h-8 bg-navy-900/80 rounded-full flex items-center justify-center backdrop-blur hover:bg-navy-700 transition-colors" aria-label="Close">
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
              {selected.code && <span className="absolute bottom-4 left-5 text-xs font-bold text-gold-500 bg-navy-900/80 px-3 py-1 rounded-full tracking-wider backdrop-blur" style={accentText()}>{selected.code}</span>}
            </div>

            <div className="p-6 md:p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">{resolveField(selected.title, locale)}</h3>
                <p className="text-gray-400 leading-relaxed">{resolveField(selected.description, locale)}</p>
              </div>

              {(selected.duration || selected.prereq) && (
                <div className="grid grid-cols-2 gap-4 bg-navy-900 rounded-xl p-4">
                  {selected.duration && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">{resolveField(data.durationLabel || "Duration", locale)}</p>
                      <p className="text-sm text-white font-medium mt-1">{resolveField(selected.duration, locale)}</p>
                    </div>
                  )}
                  {selected.prereq && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">{resolveField(data.prereqLabel || "Prerequisites", locale)}</p>
                      <p className="text-sm text-white font-medium mt-1">{resolveField(selected.prereq, locale)}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <a href="#contact" onClick={() => setSelected(null)} className="flex-1 text-center px-6 py-3 bg-gold-500 hover:brightness-110 text-navy-900 font-bold rounded-lg transition-all text-sm" style={accentBg()}>{CONTACT_LABEL[locale] || CONTACT_LABEL.en}</a>
                <button onClick={() => setSelected(null)} className="px-6 py-3 border border-navy-600 text-gray-400 hover:text-white rounded-lg transition-colors text-sm">{CLOSE_LABEL[locale] || CLOSE_LABEL.en}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// Original "Accreditations" white logo tiles with label underneath.
function LogosBlock({ data, locale, theme }: { data: any; locale: string; theme?: LandingTheme }) {
  const items: any[] = toItems(data.items).filter((i) => i?.key);
  if (!items.length) return null;
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8" style={blockBgStyle(theme)}>
      <div className={blockPadding(theme)}>
        <SectionHeader data={data} locale={locale} theme={theme} />
        <div className="flex flex-wrap justify-center items-center gap-12 md:gap-16">
          {items.map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-3">
              <div className="w-28 h-28 bg-white border border-navy-700 rounded-2xl p-4 flex items-center justify-center">
                <img src={mediaUrl(item.key)} alt={resolveField(item.alt, locale)} className="max-w-full max-h-full object-contain" />
              </div>
              {item.alt && <p className="text-xs text-gray-400 text-center max-w-[140px]">{resolveField(item.alt, locale)}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GalleryBlock({ data, locale, theme }: { data: any; locale: string; theme?: LandingTheme }) {
  const items: any[] = toItems(data.items).filter((i) => i?.key);
  if (!items.length) return null;
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8" style={blockBgStyle(theme)}>
      <div className={blockPadding(theme)}>
        <SectionHeader data={data} locale={locale} theme={theme} />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item, i) => (
            <figure key={i} className="relative rounded-xl overflow-hidden border border-navy-700 aspect-video">
              <img src={mediaUrl(item.key)} alt={resolveField(item.alt, locale)} className="w-full h-full object-cover" />
              {item.caption && <figcaption className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent text-white text-xs p-3">{resolveField(item.caption, locale)}</figcaption>}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function VideoBlock({ data, locale, theme }: { data: any; locale: string; theme?: LandingTheme }) {
  const videos: any[] = toItems(data.items).filter((i) => i?.url);
  if (!videos.length) return null;
  return (
    <section className="bg-navy-800/30 border-y border-navy-800" style={blockBgStyle(theme)}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className={blockPadding(theme)}>
          <SectionHeader data={data} locale={locale} theme={theme} />
          <div className="grid md:grid-cols-2 gap-6">
            {videos.map((item, i) => {
              const src = videoUrl(item.url);
              const isEmbed = src.includes("youtube") || src.includes("player.");
              return (
                <div key={i} className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
                  {isEmbed ? (
                    <div className="aspect-video">
                      <iframe src={src} className="w-full h-full" allowFullScreen title={resolveField(item.title, locale) || "video"} />
                    </div>
                  ) : (
                    <video src={src} controls className="w-full aspect-video bg-black" />
                  )}
                  {item.title && <p className="text-sm text-gray-300 p-3">{resolveField(item.title, locale)}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialsBlock({ data, locale, theme }: { data: any; locale: string; theme?: LandingTheme }) {
  const items: any[] = toItems(data.items).filter((i) => i?.quote);
  if (!items.length) return null;
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8" style={blockBgStyle(theme)}>
      <div className={blockPadding(theme)}>
        <SectionHeader data={data} locale={locale} theme={theme} />
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <blockquote key={i} className="bg-navy-800 border border-navy-700 rounded-xl p-6">
              <p className="text-gray-300 text-sm italic mb-4">&ldquo;{resolveField(item.quote, locale)}&rdquo;</p>
              <footer className="text-white text-sm font-semibold">{resolveField(item.author, locale)}</footer>
              {item.role && <p className="text-xs text-gray-500">{resolveField(item.role, locale)}</p>}
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

// Call-to-action banner.
function CtaBlock({ data, locale, theme }: { data: any; locale: string; theme?: LandingTheme }) {
  const heading = data.heading ? resolveField(data.heading, locale) : "";
  const subtitle = data.subtitle ? resolveField(data.subtitle, locale) : "";
  const ctas: any[] = toItems(data.ctas).filter((c) => c && (c.text || c.link));
  if (!heading && !subtitle && !ctas.length) return null;
  const centered = !theme || theme.align !== "left";
  return (
    <section className="bg-navy-800/30 border-y border-navy-800" style={blockBgStyle(theme)}>
      <div className={`max-w-4xl mx-auto px-6 lg:px-8 ${blockPadding(theme)} ${centered ? "text-center" : "text-left"}`}>
        {heading && <h2 className="text-3xl md:text-4xl font-bold mb-4">{heading}</h2>}
        {subtitle && <p className={`text-gray-400 leading-relaxed max-w-2xl ${centered ? "mx-auto" : ""}`}>{subtitle}</p>}
        {ctas.length > 0 && (
          <div className={`flex flex-wrap gap-4 mt-8 ${centered ? "justify-center" : ""}`}>
            {ctas.map((cta, i) => (
              <a key={i} href={cta.link || "#contact"}
                className={`px-7 py-3 rounded-lg text-sm transition-all ${cta.style === "outline" ? "border border-gold-500/40 hover:border-gold-500 text-gold-500 font-semibold" : "bg-gold-500 hover:brightness-110 text-navy-900 font-bold"}`}
                style={cta.style === "outline" ? { ...accentText(), borderColor: "var(--accent, #c4943c)" } : accentBg()}>
                {resolveField(cta.text, locale)}
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// FAQ accordion.
function FaqBlock({ data, locale, theme }: { data: any; locale: string; theme?: LandingTheme }) {
  const items: any[] = toItems(data.items).filter((i) => i?.question);
  if (!items.length) return null;
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8" style={blockBgStyle(theme)}>
      <div className={blockPadding(theme)}>
        <SectionHeader data={data} locale={locale} theme={theme} />
        <div className="max-w-3xl mx-auto space-y-3">
          {items.map((item, i) => (
            <details key={i} className="group bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none select-none">
                <span className="text-sm font-semibold text-white">{resolveField(item.question, locale)}</span>
                <ChevronDown className="w-4 h-4 text-gold-500 shrink-0 transition-transform group-open:rotate-180" style={accentText()} />
              </summary>
              <div className="px-5 pb-4 text-sm text-gray-400 leading-relaxed">{resolveField(item.answer, locale)}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// Team / instructors grid.
function TeamBlock({ data, locale, theme }: { data: any; locale: string; theme?: LandingTheme }) {
  const items: any[] = toItems(data.items).filter((i) => i?.name);
  if (!items.length) return null;
  return (
    <section className="bg-navy-800/30 border-y border-navy-800" style={blockBgStyle(theme)}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className={blockPadding(theme)}>
          <SectionHeader data={data} locale={locale} theme={theme} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item, i) => {
              const img = itemImage(item);
              return (
                <div key={i} className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
                  {img && (
                    <div className="relative h-56 overflow-hidden">
                      <img src={img} alt={item.image?.alt || resolveField(item.name, locale)} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-5 text-center">
                    <h3 className="text-lg font-bold text-white">{resolveField(item.name, locale)}</h3>
                    {item.role ? <p className="text-xs text-gold-500 mt-1 font-semibold" style={accentText()}>{resolveField(item.role, locale)}</p> : null}
                    {item.bio ? <p className="text-sm text-gray-400 mt-3 leading-relaxed">{resolveField(item.bio, locale)}</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// Single image with optional caption.
function ImageBlock({ data, locale, theme }: { data: any; locale: string; theme?: LandingTheme }) {
  const key = data.image?.key;
  if (!key) return null;
  const centered = !theme || theme.align !== "left";
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8" style={blockBgStyle(theme)}>
      <div className={`${blockPadding(theme)} ${centered ? "text-center" : "text-left"}`}>
        <figure className={`max-w-3xl ${centered ? "mx-auto" : ""}`}>
          <img src={mediaUrl(key)} alt={data.image?.alt || ""} className="w-full rounded-xl border border-navy-700 object-cover" />
          {data.caption && <figcaption className="mt-3 text-sm text-gray-400">{resolveField(data.caption, locale)}</figcaption>}
        </figure>
      </div>
    </section>
  );
}

// Raw HTML embed (trusted marketing managers only).
function EmbedBlock({ data, locale, theme }: { data: any; locale: string; theme?: LandingTheme }) {
  const html = data.html;
  if (!html) return null;
  const centered = !theme || theme.align !== "left";
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8" style={blockBgStyle(theme)}>
      <div className={blockPadding(theme)}>
        {data.title && <h2 className={`text-2xl font-bold mb-6 ${centered ? "text-center" : "text-left"}`}>{resolveField(data.title, locale)}</h2>}
        <div className={centered ? "flex justify-center" : ""} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </section>
  );
}

const CONTACT_CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="w-5 h-5" />,
  phone: <Phone className="w-5 h-5" />,
  address: <MapPin className="w-5 h-5" />,
  link: <Link2 className="w-5 h-5" />,
};

// Contact channel band.
function ContactBlock({ data, locale, theme }: { data: any; locale: string; theme?: LandingTheme }) {
  const heading = data.heading ? resolveField(data.heading, locale) : "";
  const subtitle = data.subtitle ? resolveField(data.subtitle, locale) : "";
  const items: any[] = toItems(data.items).filter((i) => i?.label || i?.value);
  const ctas: any[] = toItems(data.ctas).filter((c) => c && (c.text || c.link));
  if (!heading && !items.length) return null;
  const centered = !theme || theme.align !== "left";
  return (
    <section className="bg-navy-800/30 border-y border-navy-800" style={blockBgStyle(theme)}>
      <div className={`max-w-7xl mx-auto px-6 lg:px-8 ${blockPadding(theme)} ${centered ? "text-center" : "text-left"}`}>
        {heading && <h2 className="text-3xl md:text-4xl font-bold mb-3">{heading}</h2>}
        {subtitle && <p className={`text-gray-400 max-w-2xl ${centered ? "mx-auto" : ""}`}>{subtitle}</p>}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${heading || subtitle ? "mt-10" : ""}`}>
          {items.map((item, i) => {
            const icon = CONTACT_CHANNEL_ICONS[item.type] || <Link2 className="w-5 h-5" />;
            const href = item.type === "email" ? `mailto:${item.value}` : item.type === "phone" ? `tel:${item.value}` : item.link || undefined;
            const body = (
              <>
                <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400 ${centered ? "" : "mx-0"}`} style={accentText()}>
                  {icon}
                </div>
                {item.label && <p className="text-xs text-gray-500 uppercase tracking-wider">{resolveField(item.label, locale)}</p>}
                {item.value && <p className="text-sm text-white font-medium mt-1 break-all">{resolveField(item.value, locale)}</p>}
              </>
            );
            return href ? (
              <a key={i} href={href} className="bg-navy-800 border border-navy-700 rounded-xl p-6 transition-colors hover:border-gold-500/40">{body}</a>
            ) : (
              <div key={i} className="bg-navy-800 border border-navy-700 rounded-xl p-6">{body}</div>
            );
          })}
        </div>
        {ctas.length > 0 && (
          <div className={`flex flex-wrap gap-4 mt-8 ${centered ? "justify-center" : ""}`}>
            {ctas.map((cta, i) => (
              <a key={i} href={cta.link || "#contact"} className={`px-7 py-3 rounded-lg text-sm transition-all ${cta.style === "outline" ? "border border-gold-500/40 text-gold-500 font-semibold" : "bg-gold-500 hover:brightness-110 text-navy-900 font-bold"}`} style={cta.style === "outline" ? accentText() : accentBg()}>
                {resolveField(cta.text, locale)}
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function LandingBlocks({ blocks, locale, theme, className = "" }: { blocks: Block[]; locale: string; theme?: LandingTheme; className?: string }) {
  if (!blocks || blocks.length === 0) return null;
  return (
    <div className={className} style={{ "--accent": theme?.accent || DEFAULT_ACCENT } as React.CSSProperties}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "hero": return <HeroBlock key={i} data={block.data} locale={locale} theme={theme} />;
          case "rich_text": return <RichTextBlock key={i} data={block.data} locale={locale} theme={theme} />;
          case "stats": return <StatsBlock key={i} data={block.data} locale={locale} theme={theme} />;
          case "features": return <FeaturesBlock key={i} data={block.data} locale={locale} theme={theme} />;
          case "programs": return <ProgramsBlock key={i} data={block.data} locale={locale} theme={theme} />;
          case "logos": return <LogosBlock key={i} data={block.data} locale={locale} theme={theme} />;
          case "gallery": return <GalleryBlock key={i} data={block.data} locale={locale} theme={theme} />;
          case "video": return <VideoBlock key={i} data={block.data} locale={locale} theme={theme} />;
          case "testimonials": return <TestimonialsBlock key={i} data={block.data} locale={locale} theme={theme} />;
          case "cta": return <CtaBlock key={i} data={block.data} locale={locale} theme={theme} />;
          case "faq": return <FaqBlock key={i} data={block.data} locale={locale} theme={theme} />;
          case "team": return <TeamBlock key={i} data={block.data} locale={locale} theme={theme} />;
          case "image": return <ImageBlock key={i} data={block.data} locale={locale} theme={theme} />;
          case "embed": return <EmbedBlock key={i} data={block.data} locale={locale} theme={theme} />;
          case "contact": return <ContactBlock key={i} data={block.data} locale={locale} theme={theme} />;
          default: return null;
        }
      })}
    </div>
  );
}
