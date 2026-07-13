"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "@/lib/use-translation";

const programKeys = ["PPL", "CPL", "IR", "MEP", "MCC"];
const programTitleKeys: Record<string, string> = { PPL: "prog_ppl_title", CPL: "prog_cpl_title", IR: "prog_ir_title", MEP: "prog_mep_title", MCC: "prog_mcc_title" };

export default function LandingPage() {
  const { t, locale } = useTranslation();

  const whyItems = [
    { icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z", title: t("ato_certified"), desc: t("ato_certified_desc"), color: "gold" },
    { icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z", title: t("modern_fleet"), desc: t("modern_fleet_desc"), color: "blue" },
    { icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z", title: t("efficient_training"), desc: t("efficient_training_desc"), color: "green" },
  ];

  return (
    <div className="min-h-screen bg-navy-900 text-white" dir={locale === "ar" ? "rtl" : "ltr"}>
      <nav className="sticky top-0 z-50 bg-navy-900/95 backdrop-blur border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="MAA" width={110} height={110} />
              <span className="text-white font-bold text-lg tracking-tight">{t("app_name")}</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
              <a href="#programs" className="hover:text-white transition-colors">{t("programs")}</a>
              <a href="#about" className="hover:text-white transition-colors">{t("about")}</a>
              <a href="#why-us" className="hover:text-white transition-colors">{t("why_us")}</a>
              <Link href="/student/login" className="text-gold-500 hover:text-gold-400 font-medium transition-colors">{t("nav_student")}</Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gold-500/[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/[0.03] rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-20 pb-24 md:pt-24 md:pb-32">
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

      <section id="programs" className="bg-navy-800/30 border-y border-navy-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center mb-16">
            <p className="text-gold-500 font-semibold text-sm tracking-widest uppercase mb-3">{t("programs_title")}</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("programs_subtitle")}</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">{t("programs_desc")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programKeys.map((code) => (
              <div key={code} className="group bg-navy-900 border border-navy-700 rounded-xl p-6 hover:border-gold-500/40 transition-all">
                <div className="flex items-center justify-between mb-4"><span className="text-xs font-bold text-gold-500 bg-gold-500/10 px-3 py-1 rounded-full tracking-wider">{code}</span></div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-gold-500 transition-colors">{t(programTitleKeys[code])}</h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">{t(`prog_${code.toLowerCase()}_desc`)}</p>
                <div className="border-t border-navy-700 pt-4 space-y-1.5">
                  <div className="flex justify-between text-xs"><span className="text-gray-500">{t("landing_duration")}</span><span className="text-gray-300">{t(`prog_${code.toLowerCase()}_duration`)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-500">{t("landing_prerequisites")}</span><span className="text-gray-300">{t(`prog_${code.toLowerCase()}_prereq`)}</span></div></div></div>))}
          </div></div>
      </section>

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

      <section id="access" className="max-w-7xl mx-auto px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center mb-10"><h2 className="text-xl font-bold text-white mb-2">{t("portal_access")}</h2><p className="text-sm text-gray-500">{t("portal_access_desc")}</p></div>
        <div className="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
          <Link href="/student/login" className="px-6 py-2.5 bg-gold-500/10 border border-gold-500/30 text-gold-500 hover:bg-gold-500 hover:text-navy-900 font-medium rounded-lg transition-all text-sm">{t("student_portal")}</Link>
          <Link href="/login" className="px-6 py-2.5 bg-navy-800 border border-navy-700 text-gray-400 hover:border-gray-400 hover:text-white font-medium rounded-lg transition-all text-sm">{t("staff_access")}</Link>
          <a href="/admin" className="px-6 py-2.5 bg-navy-800 border border-navy-700 text-gray-400 hover:border-gray-400 hover:text-white font-medium rounded-lg transition-all text-sm">{t("administration")}</a>
        </div>
      </section>

      <footer id="contact" className="border-t border-navy-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-3"><Image src="/logo.png" alt="MAA" width={110} height={110} className="opacity-80" /><span>{t("app_name")}, {t("tagline")}</span></div>
            <div className="flex gap-4"><span>{t("footer_onprem")}</span><span className="text-gray-700">|</span><span>{t("footer_languages")}</span></div>
          </div>
          <p className="text-center text-xs text-gray-600 mt-6">&copy; {new Date().getFullYear()} {t("footer_copyright")}</p>
        </div>
      </footer>
    </div>
  );
}
