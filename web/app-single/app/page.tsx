"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/lib/use-translation";

const programKeys = ["PPL", "CPL", "IR", "MEP", "MCC"];
const programTitleKeys: Record<string, string> = { PPL: "prog_ppl_title", CPL: "prog_cpl_title", IR: "prog_ir_title", MEP: "prog_mep_title", MCC: "prog_mcc_title" };

interface ProgramDetail {
  key: string;
  titleKey: string;
  descKey: string;
  durationKey: string;
  prereqKey: string;
  image: string;
  overviewKey: string;
  outline: string[];
  careerKey: string;
}

const programDetails: ProgramDetail[] = [
  {
    key: "PPL", titleKey: "prog_ppl_title", descKey: "prog_ppl_desc", durationKey: "prog_ppl_duration", prereqKey: "prog_ppl_prereq",
    image: "/images/ppl.png",
    overviewKey: "prog_ppl_overview",
    outline: ["prog_ppl_out_1", "prog_ppl_out_2", "prog_ppl_out_3", "prog_ppl_out_4", "prog_ppl_out_5"],
    careerKey: "prog_ppl_career",
  },
  {
    key: "CPL", titleKey: "prog_cpl_title", descKey: "prog_cpl_desc", durationKey: "prog_cpl_duration", prereqKey: "prog_cpl_prereq",
    image: "/images/cpl.png",
    overviewKey: "prog_cpl_overview",
    outline: ["prog_cpl_out_1", "prog_cpl_out_2", "prog_cpl_out_3", "prog_cpl_out_4", "prog_cpl_out_5"],
    careerKey: "prog_cpl_career",
  },
  {
    key: "IR", titleKey: "prog_ir_title", descKey: "prog_ir_desc", durationKey: "prog_ir_duration", prereqKey: "prog_ir_prereq",
    image: "/images/IR.png",
    overviewKey: "prog_ir_overview",
    outline: ["prog_ir_out_1", "prog_ir_out_2", "prog_ir_out_3", "prog_ir_out_4"],
    careerKey: "prog_ir_career",
  },
  {
    key: "MEP", titleKey: "prog_mep_title", descKey: "prog_mep_desc", durationKey: "prog_mep_duration", prereqKey: "prog_mep_prereq",
    image: "/images/mep.png",
    overviewKey: "prog_mep_overview",
    outline: ["prog_mep_out_1", "prog_mep_out_2", "prog_mep_out_3", "prog_mep_out_4"],
    careerKey: "prog_mep_career",
  },
  {
    key: "MCC", titleKey: "prog_mcc_title", descKey: "prog_mcc_desc", durationKey: "prog_mcc_duration", prereqKey: "prog_mcc_prereq",
    image: "/images/mcc.png",
    overviewKey: "prog_mcc_overview",
    outline: ["prog_mcc_out_1", "prog_mcc_out_2", "prog_mcc_out_3", "prog_mcc_out_4"],
    careerKey: "prog_mcc_career",
  },
];

export default function LandingPage() {
  const { t, locale } = useTranslation();
  const [navOpen, setNavOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<ProgramDetail | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const totalSlides = programDetails.length;
  const EXTENDED = [...programDetails, ...programDetails, ...programDetails];
  const [cardsPerView, setCardsPerView] = useState(3);
  const SWIPE_THRESHOLD = 50;

  useEffect(() => {
    const update = () => setCardsPerView(window.innerWidth < 620 ? 1 : 3);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    setRawSlide(totalSlides);
  }, [cardsPerView, totalSlides]);

  const [rawSlide, setRawSlide] = useState(totalSlides);
  const [transitionOn, setTransitionOn] = useState(true);
  const snappingRef = useRef(false);

  // Drag state
  const [dragOffset, setDragOffset] = useState(0);
  const dragMeta = useRef({ active: false, startX: 0, moved: false });

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
    setDragOffset(offset);
  }, []);

  const dragEnd = useCallback(() => {
    const m = dragMeta.current;
    if (!m.active) return;
    m.active = false;
    if (m.moved) {
      if (dragOffset > SWIPE_THRESHOLD) prevSlide();
      else if (dragOffset < -SWIPE_THRESHOLD) nextSlide();
    }
    setDragOffset(0);
  }, [dragOffset, prevSlide, nextSlide, SWIPE_THRESHOLD]);

  useEffect(() => {
    if (isHovering) return;
    if (dragMeta.current.active) return;
    if (snappingRef.current) return;
    const timer = setInterval(() => {
      setRawSlide(prev => prev + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, [isHovering, totalSlides]);

  const whyItems = [
    { icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z", title: t("ato_certified"), desc: t("ato_certified_desc"), color: "gold" },
    { icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z", title: t("modern_fleet"), desc: t("modern_fleet_desc"), color: "blue" },
    { icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z", title: t("efficient_training"), desc: t("efficient_training_desc"), color: "green" },
  ];

  return (
    <div className="min-h-screen bg-navy-900 text-white" dir={locale === "ar" ? "rtl" : "ltr"}>
      <nav className="sticky top-0 z-40 bg-navy-900/95 backdrop-blur border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-24">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="MAA" width={110} height={110} />
              <span className="text-white font-bold text-lg tracking-tight">{t("app_name")}</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
              <a href="#programs" className="hover:text-white transition-colors">{t("programs")}</a>
              <a href="#about" className="hover:text-white transition-colors">{t("about")}</a>
              <a href="#why-us" className="hover:text-white transition-colors">{t("why_us")}</a>
              <a href="#accreditations" className="hover:text-white transition-colors">{t("nav_accreditations", "Accreditations")}</a>
              <a href="#contact" className="hover:text-white transition-colors">{t("nav_contact")}</a>
              <Link href="/student/login" className="text-gold-500 hover:text-gold-400 font-medium transition-colors">{t("nav_student")}</Link>
            </div>
            <button onClick={() => setNavOpen(!navOpen)} className="md:hidden flex items-center justify-center w-[50px] h-[50px] text-gray-400 active:text-white rounded-lg transition-colors">
              {navOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
          {navOpen && (
            <div className="md:hidden pb-5 space-y-1">
              <a href="#programs" onClick={() => setNavOpen(false)} className="block px-3 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-navy-800 rounded-lg transition-colors">{t("programs")}</a>
              <a href="#about" onClick={() => setNavOpen(false)} className="block px-3 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-navy-800 rounded-lg transition-colors">{t("about")}</a>
              <a href="#why-us" onClick={() => setNavOpen(false)} className="block px-3 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-navy-800 rounded-lg transition-colors">{t("why_us")}</a>
              <a href="#accreditations" onClick={() => setNavOpen(false)} className="block px-3 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-navy-800 rounded-lg transition-colors">{t("nav_accreditations", "Accreditations")}</a>
              <a href="#contact" onClick={() => setNavOpen(false)} className="block px-3 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-navy-800 rounded-lg transition-colors">{t("nav_contact")}</a>
              <Link href="/student/login" onClick={() => setNavOpen(false)} className="block px-3 py-2.5 text-sm text-gold-500 hover:text-gold-400 font-medium hover:bg-navy-800 rounded-lg transition-colors">{t("nav_student")}</Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gold-500/[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/[0.03] rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-24 pb-24 md:pt-28 md:pb-32">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            <div className="flex-1 text-center lg:text-left">
              <p className="text-gold-500 font-semibold text-sm tracking-widest uppercase mb-4">{t("tagline")}</p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">{t("hero_title")}</h1>
              <p className="text-lg md:text-xl text-gray-400 leading-relaxed mb-10">{t("hero_desc")}</p>
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <a href="#programs" className="px-8 py-3.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold rounded-lg transition-colors">{t("explore_programs")}</a>
                <a href="#contact" className="px-8 py-3.5 border border-gold-500/30 hover:border-gold-500 text-gold-500 font-semibold rounded-lg transition-colors">{t("contact_us")}</a>
              </div>
            </div>
            <div className="flex-shrink-0"><Image src="/logo.png" alt="MAA" width={480} height={480} className="w-64 md:w-80 lg:w-96 object-contain" priority /></div>
          </div>
        </div>
      </section>

      {/* Programs — Carousel */}
      <section id="programs" className="bg-navy-800/30 border-y border-navy-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center mb-16">
            <p className="text-gold-500 font-semibold text-sm tracking-widest uppercase mb-3">{t("programs_title")}</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("programs_subtitle")}</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">{t("programs_desc")}</p>
          </div>

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
                {EXTENDED.map((prog, i) => (
                  <div key={`${prog.key}-${i}`} className="shrink-0" style={{ width: `calc(${100 / cardsPerView}% - 8px)` }}>
                    <button onClick={(e) => { if (dragMeta.current.moved) e.preventDefault(); else setSelectedProgram(prog); }}
                      className="h-full w-full group bg-navy-900 border border-navy-700 rounded-xl overflow-hidden hover:border-gold-500/50 transition-all text-left hover:-translate-y-1 hover:shadow-xl hover:shadow-gold-500/5 flex flex-col">
                      <div className="relative h-44 bg-navy-800 overflow-hidden shrink-0">
                        <Image src={prog.image} alt={t(prog.titleKey)} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-transparent to-transparent" />
                        <span className="absolute top-3 left-3 text-xs font-bold text-gold-500 bg-navy-900/80 px-3 py-1 rounded-full tracking-wider backdrop-blur">{prog.key}</span>
                      </div>
                      <div className="flex-1 p-5 flex flex-col">
                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-gold-500 transition-colors">{t(prog.titleKey)}</h3>
                        <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 flex-1">{t(prog.descKey)}</p>
                        <div className="border-t border-navy-700 pt-4 mt-4 space-y-1.5 shrink-0">
                          <div className="flex justify-between text-xs"><span className="text-gray-500">{t("landing_duration")}</span><span className="text-gray-300">{t(prog.durationKey)}</span></div>
                          <div className="flex justify-between text-xs"><span className="text-gray-500">{t("landing_prerequisites")}</span><span className="text-gray-300">{t(prog.prereqKey)}</span></div>
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Prev arrow */}
            <button onClick={prevSlide}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 md:-translate-x-4 w-10 h-10 bg-navy-800/90 border border-navy-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-navy-700 transition-all backdrop-blur shadow-lg z-10">
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Next arrow */}
            <button onClick={nextSlide}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 md:translate-x-4 w-10 h-10 bg-navy-800/90 border border-navy-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-navy-700 transition-all backdrop-blur shadow-lg z-10">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Dots */}
          <div className="flex justify-center items-center gap-2 mt-8">
            {programDetails.map((_, i) => (
              <button key={i} onClick={() => goToSlide(i)}
                className={`w-2 rounded-full transition-all duration-300 ${i === rawSlide % totalSlides ? "bg-gold-500 w-6" : "bg-navy-600 hover:bg-navy-500 w-2"} h-2`} />
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-gold-500 font-semibold text-sm tracking-widest uppercase mb-3">{t("about_title")}</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">{t("about_heading")}</h2>
            <div className="space-y-4 text-gray-400 leading-relaxed"><p>{t("about_p1")}</p><p>{t("about_p2")}</p><p>{t("about_p3")}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[{ k: "modern_fleet", v: t("modern_fleet"), d: t("modern_fleet_desc") }, { k: "expert_team", v: t("expert_team"), d: t("expert_team_desc") }, { k: "structured_curriculum", v: t("structured_curriculum"), d: t("structured_curriculum_desc") }, { k: "full_support", v: t("full_support"), d: t("full_support_desc") }].map(item => (
              <div key={item.k} className="bg-navy-800 border border-navy-700 rounded-xl p-6"><div className="text-2xl font-bold text-white mb-1">{item.v}</div><p className="text-sm text-gray-400">{item.d}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section id="why-us" className="bg-navy-800/30 border-y border-navy-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center mb-16">
            <p className="text-gold-500 font-semibold text-sm tracking-widest uppercase mb-3">{t("why_us_title")}</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("why_us_subtitle")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {whyItems.map((item, i) => (
              <div key={i} className="text-center">
                <div className={`w-14 h-14 mx-auto mb-5 rounded-xl bg-${item.color}-500/10 border border-${item.color}-500/20 flex items-center justify-center`}>
                  <svg className={`w-6 h-6 text-${item.color}-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Accreditations */}
      <section id="accreditations" className="max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-28">
        <div className="text-center mb-12">
          <p className="text-gold-500 font-semibold text-sm tracking-widest uppercase mb-3">{t("accreditations_title", "Accreditations & Approvals")}</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("accreditations_heading", "Approved & Recognized By")}</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">{t("accreditations_desc", "Masterly Air Academy is officially approved and accredited by the following national authorities.")}</p>
        </div>
        <div className="flex flex-wrap justify-center items-center gap-12 md:gap-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-28 h-28 bg-white border border-navy-700 rounded-2xl p-4 flex items-center justify-center">
              <Image src="/images/1.webp" alt="Ministry of Interior and Transport" width={100} height={100} className="object-contain" />
            </div>
            <p className="text-xs text-gray-400 text-center max-w-[140px]">{t("accred_ministry_interior", "Ministry of Interior & Transport")}</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-28 h-28 bg-white border border-navy-700 rounded-2xl p-4 flex items-center justify-center">
              <Image src="/images/2.jfif" alt="Ministry of Defence" width={100} height={100} className="object-contain" />
            </div>
            <p className="text-xs text-gray-400 text-center max-w-[140px]">{t("accred_ministry_defence", "Ministry of Defence")}</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-28 h-28 bg-white border border-navy-700 rounded-2xl p-4 flex items-center justify-center">
              <Image src="/images/3.png" alt="National Civil Aviation Agency" width={100} height={100} className="object-contain" />
            </div>
            <p className="text-xs text-gray-400 text-center max-w-[140px]">{t("accred_anac", "National Civil Aviation Agency")}</p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-28">
        <div className="text-center mb-16">
          <p className="text-gold-500 font-semibold text-sm tracking-widest uppercase mb-3">{t("contact_title")}</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("contact_heading")}</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">{t("contact_subtitle")}</p>
        </div>
        <ContactForm t={t} />
      </section>

      {/* Portal Access */}
      <section id="access" className="max-w-7xl mx-auto px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center mb-10"><h2 className="text-xl font-bold text-white mb-2">{t("portal_access")}</h2><p className="text-sm text-gray-500">{t("portal_access_desc")}</p></div>
        <div className="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
          <Link href="/student/login" className="px-6 py-2.5 bg-gold-500/10 border border-gold-500/30 text-gold-500 hover:bg-gold-500 hover:text-navy-900 font-medium rounded-lg transition-all text-sm">{t("student_portal")}</Link>
          <Link href="/login" className="px-6 py-2.5 bg-navy-800 border border-navy-700 text-gray-400 hover:border-gray-400 hover:text-white font-medium rounded-lg transition-all text-sm">{t("staff_access")}</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-navy-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-3"><Image src="/logo.png" alt="MAA" width={110} height={110} className="opacity-80" /><span>{t("app_name")}, {t("tagline")}</span></div>
            <div className="flex gap-4"><span>{t("footer_onprem")}</span><span className="text-gray-700">|</span><span>{t("footer_languages")}</span></div>
          </div>
          <p className="text-center text-xs text-gray-600 mt-6">&copy; {new Date().getFullYear()} {t("footer_copyright")}</p>
        </div>
      </footer>

      {/* Program Detail Modal */}
      {selectedProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedProgram(null)}>
          <div className="bg-navy-800 border border-navy-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="relative h-48 bg-navy-800 overflow-hidden rounded-t-2xl">
              <Image src={selectedProgram.image} alt={t(selectedProgram.titleKey)} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-800 via-transparent to-transparent" />
              <button onClick={() => setSelectedProgram(null)} className="absolute top-3 right-3 w-8 h-8 bg-navy-900/80 rounded-full flex items-center justify-center backdrop-blur hover:bg-navy-700 transition-colors">
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
              <span className="absolute bottom-4 left-5 text-xs font-bold text-gold-500 bg-navy-900/80 px-3 py-1 rounded-full tracking-wider backdrop-blur">{selectedProgram.key}</span>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">{t(selectedProgram.titleKey)}</h3>
                <p className="text-gray-400 leading-relaxed">{t(selectedProgram.descKey)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-navy-900 rounded-xl p-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{t("landing_duration")}</p>
                  <p className="text-sm text-white font-medium mt-1">{t(selectedProgram.durationKey)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{t("landing_prerequisites")}</p>
                  <p className="text-sm text-white font-medium mt-1">{t(selectedProgram.prereqKey)}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gold-500 uppercase tracking-wider mb-3">{t("prog_overview", "Program Overview")}</h4>
                <p className="text-gray-300 text-sm leading-relaxed">{t(selectedProgram.overviewKey)}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gold-500 uppercase tracking-wider mb-3">{t("prog_curriculum", "Curriculum Outline")}</h4>
                <ul className="space-y-2">
                  {selectedProgram.outline.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold-500 shrink-0 mt-1.5" />
                      {t(item)}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gold-500 uppercase tracking-wider mb-3">{t("prog_career", "Career Opportunities")}</h4>
                <p className="text-gray-300 text-sm leading-relaxed">{t(selectedProgram.careerKey)}</p>
              </div>

              <div className="flex gap-3 pt-2">
                <a href="#contact" onClick={() => setSelectedProgram(null)} className="flex-1 text-center px-6 py-3 bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold rounded-lg transition-colors text-sm">{t("contact_us")}</a>
                <button onClick={() => setSelectedProgram(null)} className="px-6 py-3 border border-navy-600 text-gray-400 hover:text-white rounded-lg transition-colors text-sm">{t("common.close", "Close")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const NATIONALITIES = [
  "Algerian", "American", "Argentinean", "Australian", "Austrian", "Bahraini", "Bangladeshi", "Belgian",
  "Brazilian", "British", "Bulgarian", "Canadian", "Chinese", "Colombian", "Croatian", "Cypriot",
  "Czech", "Danish", "Dutch", "Egyptian", "Emirian", "Estonian", "Finnish", "French",
  "German", "Greek", "Hungarian", "Icelandic", "Indian", "Indonesian", "Iranian", "Iraqi",
  "Irish", "Israeli", "Italian", "Japanese", "Jordanian", "Kazakhstani", "Kenyan", "Kuwaiti",
  "Latvian", "Lebanese", "Libyan", "Lithuanian", "Luxembourger", "Macedonian", "Malaysian", "Maltese",
  "Mexican", "Moldovan", "Monacan", "Montenegrin", "Moroccan", "Nigerian", "Norwegian", "Omani",
  "Pakistani", "Palestinian", "Polish", "Portuguese", "Qatari", "Romanian", "Russian", "Saudi",
  "Senegalese", "Serbian", "Singaporean", "Slovakian", "Slovenian", "South African", "South Korean", "Spanish",
  "Sri Lankan", "Sudanese", "Swedish", "Swiss", "Syrian", "Taiwanese", "Tunisian", "Turkish",
  "Ukrainian", "Uruguayan", "Venezuelan", "Vietnamese", "Other",
];

function ContactForm({ t }: { t: (key: string, fallback?: string) => string }) {
  const [activeTab, setActiveTab] = useState<"contact" | "application">("application");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("");
  const [appPhone, setAppPhone] = useState("");
  const [appEmail, setAppEmail] = useState("");
  const [english, setEnglish] = useState("");
  const [education, setEducation] = useState("");
  const [source, setSource] = useState("");
  const [program, setProgram] = useState("");
  const [appNotes, setAppNotes] = useState("");

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) { setError("Name, email, and message are required."); return; }
    setSubmitting(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/contact/submit/", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, subject, message, type: "contact" }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || data.data?.message || "Your message has been received. We will get back to you shortly.");
        setName(""); setEmail(""); setPhone(""); setSubject(""); setMessage("");
      } else {
        setError(data.error || (data.data && (data.data as any).error) || "Something went wrong.");
      }
    } catch { setError("Connection error. Please try again."); }
    finally { setSubmitting(false); }
  };

  const handleAppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !gender || !dob || !nationality || !appPhone || !appEmail || !english || !education || !source || !program) {
      setError("Please fill in all required fields."); return;
    }
    setSubmitting(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/contact/submit/", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "application", first_name: firstName, last_name: lastName,
          gender, date_of_birth: dob, nationality, phone: appPhone, email: appEmail,
          english_proficiency: english, education_level: education, source, program, notes: appNotes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || data.data?.message || "Your application has been received. We will contact you shortly.");
        setFirstName(""); setLastName(""); setGender(""); setDob(""); setNationality("");
        setAppPhone(""); setAppEmail(""); setEnglish(""); setEducation(""); setSource(""); setProgram(""); setAppNotes("");
      } else {
        setError(data.error || (data.data && (data.data as any).error) || "Something went wrong.");
      }
    } catch { setError("Connection error. Please try again."); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-center mb-8">
        <button onClick={() => setActiveTab("contact")} className={`px-6 py-2 font-semibold rounded-l-lg transition-colors ${activeTab === "contact" ? "bg-gold-500 text-navy-900" : "bg-navy-800 border border-navy-700 text-gray-400"}`}>
          {t("contact_general", "General Inquiry")}
        </button>
        <button onClick={() => setActiveTab("application")} className={`px-6 py-2 font-semibold rounded-r-lg transition-colors ${activeTab === "application" ? "bg-gold-500 text-navy-900" : "bg-navy-800 border border-navy-700 text-gray-400"}`}>
          {t("contact_apply", "Apply Now")}
        </button>
      </div>

      {activeTab === "contact" ? (
        <form onSubmit={handleContactSubmit} className="bg-navy-800 border border-navy-700 rounded-2xl p-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t("contact_name", "Full Name")} *</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" placeholder={t("contact_name_placeholder", "Your full name")} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t("contact_email", "Email")} *</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" placeholder="your@email.com" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t("contact_phone", "Phone")}</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-3 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" placeholder="+213 ..." />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t("contact_subject_label", "Subject")}</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-4 py-3 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" placeholder={t("contact_subject_placeholder", "Subject")} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">{t("contact_message", "Message")} *</label>
            <textarea required rows={5} value={message} onChange={e => setMessage(e.target.value)} className="w-full px-4 py-3 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none resize-y" placeholder={t("contact_message_placeholder", "Your message...")} />
          </div>
          <button type="submit" disabled={submitting} className="w-full py-3.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold rounded-lg transition-colors disabled:opacity-50 text-lg">
            {submitting ? t("contact_sending", "Sending...") : t("contact_send", "Send Message")}
          </button>
          {success && <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm text-center">{success}</div>}
          {error && <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">{error}</div>}
        </form>
      ) : (
        <form onSubmit={handleAppSubmit} className="bg-navy-800 border border-navy-700 rounded-2xl p-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t("app_first_name", "First Name")} *</label>
              <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-4 py-3 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" placeholder="John" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t("app_last_name", "Last Name")} *</label>
              <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-4 py-3 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" placeholder="Doe" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t("app_gender", "Gender")} *</label>
              <select required value={gender} onChange={e => setGender(e.target.value)} className="w-full px-4 py-3 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                <option value="">{t("app_select", "Select")}</option>
                <option value="male">{t("app_male", "Male")}</option>
                <option value="female">{t("app_female", "Female")}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t("app_dob", "Date of Birth")} *</label>
              <input type="date" required value={dob} onChange={e => setDob(e.target.value)} className="w-full px-4 py-3 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" style={{ minWidth: 0, maxWidth: "100%" }} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t("app_nationality", "Nationality")} *</label>
              <select required value={nationality} onChange={e => setNationality(e.target.value)} className="w-full px-4 py-3 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                <option value="">{t("app_select", "Select")}</option>
                {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t("app_phone", "Phone")} *</label>
              <input type="tel" required value={appPhone} onChange={e => setAppPhone(e.target.value)} className="w-full px-4 py-3 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" placeholder="+213 ..." />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t("contact_email", "Email")} *</label>
              <input type="email" required value={appEmail} onChange={e => setAppEmail(e.target.value)} className="w-full px-4 py-3 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none" placeholder="your@email.com" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t("app_english", "Can you read, write and converse fluently in English?")} *</label>
              <select required value={english} onChange={e => setEnglish(e.target.value)} className="w-full px-4 py-3 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                <option value="">{t("app_select", "Select")}</option>
                <option value="yes">{t("app_yes", "Yes")}</option>
                <option value="no">{t("app_no", "No")}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t("app_education", "Education Level")} *</label>
              <select required value={education} onChange={e => setEducation(e.target.value)} className="w-full px-4 py-3 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                <option value="">{t("app_select", "Select")}</option>
                <option value="high_school">{t("edu_high_school", "High School / Baccalaureate")}</option>
                <option value="associate">{t("edu_associate", "Associate Degree / License")}</option>
                <option value="bachelor">{t("edu_bachelor", "Bachelor's Degree")}</option>
                <option value="master">{t("edu_master", "Master's Degree")}</option>
                <option value="doctorate">{t("edu_doctorate", "Doctorate")}</option>
                <option value="other">{t("edu_other", "Other")}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t("app_source", "How did you hear about us?")} *</label>
              <select required value={source} onChange={e => setSource(e.target.value)} className="w-full px-4 py-3 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                <option value="">{t("app_select", "Select")}</option>
                <option value="internet">{t("src_internet", "Internet")}</option>
                <option value="social">{t("src_social", "Social Media")}</option>
                <option value="friend">{t("src_friend", "Friend / Family")}</option>
                <option value="visit">{t("src_visit", "Visited our facilities")}</option>
                <option value="press">{t("src_press", "Press / Media")}</option>
                <option value="other">{t("src_other", "Other")}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t("contact_program", "Program of Interest")} *</label>
              <select required value={program} onChange={e => setProgram(e.target.value)} className="w-full px-4 py-3 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none">
                <option value="">{t("contact_select_program", "Select a program")}</option>
                <option value="PPL">PPL — Private Pilot License</option>
                <option value="CPL">CPL — Commercial Pilot License</option>
                <option value="IR">IR — Instrument Rating</option>
                <option value="MEP">MEP — Multi-Engine Piston</option>
                <option value="MCC">MCC — Multi-Crew Cooperation</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">{t("contact_message", "Additional Notes")}</label>
            <textarea rows={4} value={appNotes} onChange={e => setAppNotes(e.target.value)} className="w-full px-4 py-3 bg-navy-900 border border-navy-700 rounded-lg text-white focus:border-gold-500 focus:outline-none resize-y" placeholder={t("app_notes_placeholder", "Previous aviation experience, medical conditions, or any additional information...")} />
          </div>
          <button type="submit" disabled={submitting} className="w-full py-3.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold rounded-lg transition-colors disabled:opacity-50 text-lg">
            {submitting ? t("contact_sending", "Sending...") : t("contact_submit_application", "Submit Application")}
          </button>
          {success && <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm text-center">{success}</div>}
          {error && <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">{error}</div>}
        </form>
      )}
    </div>
  );
}
