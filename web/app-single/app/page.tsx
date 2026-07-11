"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "@/lib/use-translation";

const programs = [
  { code: "PPL", desc: "The foundation of your aviation career. Learn basic flight maneuvers, navigation, and aircraft handling under Visual Flight Rules.", durationKey: "ppl", prereqKey: "ppl" },
  { code: "CPL", desc: "Advanced training for professional pilots. Master complex aircraft operations, instrument flying, and multi-engine handling.", durationKey: "cpl", prereqKey: "cpl" },
  { code: "IR", desc: "Fly solely by reference to instruments. Essential for commercial operations in all weather conditions and controlled airspace.", durationKey: "ir", prereqKey: "ir" },
  { code: "MEP", desc: "Transition to multi-engine aircraft. Learn asymmetric flight management, engine-out procedures, and advanced performance calculations.", durationKey: "mep", prereqKey: "mep" },
  { code: "MCC", desc: "Prepare for airline operations. Develop crew resource management, standard operating procedures, and multi-pilot cockpit discipline.", durationKey: "mcc", prereqKey: "mcc" },
];

const programTitles: Record<string, string> = { PPL: "Private Pilot License", CPL: "Commercial Pilot License", IR: "Instrument Rating", MEP: "Multi-Engine Piston", MCC: "Multi-Crew Cooperation" };
const durationLabels: Record<string, Record<string, string>> = { en: { ppl: "6-8 months", cpl: "12-18 months", ir: "3-4 months", mep: "1-2 months", mcc: "2-3 weeks" }, fr: { ppl: "6-8 mois", cpl: "12-18 mois", ir: "3-4 mois", mep: "1-2 mois", mcc: "2-3 semaines" }, ar: { ppl: "٦-٨ أشهر", cpl: "١٢-١٨ شهراً", ir: "٣-٤ أشهر", mep: "١-٢ شهر", mcc: "٢-٣ أسابيع" } };
const prereqLabels: Record<string, Record<string, string>> = { en: { ppl: "Class 2 Medical Certificate", cpl: "PPL + Class 1 Medical Certificate", ir: "PPL + 50 hours cross-country", mep: "CPL or in progress", mcc: "CPL + IR" }, fr: { ppl: "Certificat Medical Classe 2", cpl: "PPL + Certificat Medical Classe 1", ir: "PPL + 50 heures de navigation", mep: "CPL ou en cours", mcc: "CPL + IR" }, ar: { ppl: "شهادة طبية فئة ٢", cpl: "PPL + شهادة طبية فئة ١", ir: "PPL + ٥٠ ساعة طيران", mep: "CPL أو قيد التقدم", mcc: "CPL + IR" } };

export default function LandingPage() {
  const { t, locale } = useTranslation();
  const dLbl = durationLabels[locale] || durationLabels.en;
  const pLbl = prereqLabels[locale] || prereqLabels.en;
  const durLabel = locale === "fr" ? "Duree" : locale === "ar" ? "المدة" : "Duration";
  const preLabel = locale === "fr" ? "Prerequis" : locale === "ar" ? "المتطلبات" : "Prerequisites";

  return (
    <div className="min-h-screen bg-navy-900 text-white" dir={locale === "ar" ? "rtl" : "ltr"}>
      <nav className="sticky top-0 z-50 bg-navy-900/95 backdrop-blur border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-xl" />
              <span className="text-white font-bold text-lg tracking-tight">{t.app_name || "Masterly"} <span className="text-gold-500">{locale === "ar" ? "للطيران" : "Air Academy"}</span></span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
              <a href="#programs" className="hover:text-white transition-colors">{t.programs || "Programs"}</a>
              <a href="#about" className="hover:text-white transition-colors">{t.about || "About"}</a>
              <a href="#why-us" className="hover:text-white transition-colors">{t.why_us || "Why Us"}</a>
              <Link href="/student/login" className="text-gold-500 hover:text-gold-400 font-medium transition-colors">{t.nav_student || "Student Access"}</Link>
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
              <p className="text-gold-500 font-semibold text-sm tracking-widest uppercase mb-4">{t.tagline || "Approved Training Organization"}</p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">{t.hero_title || "Your Aviation Career"}<br /><span className="text-gold-500">{locale !== "ar" ? "Starts Here" : ""}</span></h1>
              <p className="text-lg md:text-xl text-gray-400 leading-relaxed mb-10">{t.hero_desc}</p>
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <a href="#programs" className="px-8 py-3.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold rounded-lg transition-colors">{t.explore_programs || "Explore Programs"}</a>
                <a href="#contact" className="px-8 py-3.5 border border-gold-500/30 hover:border-gold-500 text-gold-500 font-semibold rounded-lg transition-colors">{t.contact_us || "Contact Us"}</a>
              </div>
            </div>
            <div className="flex-shrink-0"><Image src="/mast.svg" alt="MAA" width={360} height={360} className="w-52 h-52 md:w-64 md:h-64 lg:w-72 lg:h-72" priority /></div>
          </div>
        </div>
      </section>

      <section id="programs" className="bg-navy-800/30 border-y border-navy-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center mb-16">
            <p className="text-gold-500 font-semibold text-sm tracking-widest uppercase mb-3">{t.programs_title || "Training Programs"}</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.programs_subtitle || "Choose Your Path"}</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">{t.programs_desc}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((p) => (
              <div key={p.code} className="group bg-navy-900 border border-navy-700 rounded-xl p-6 hover:border-gold-500/40 transition-all">
                <div className="flex items-center justify-between mb-4"><span className="text-xs font-bold text-gold-500 bg-gold-500/10 px-3 py-1 rounded-full tracking-wider">{p.code}</span></div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-gold-500 transition-colors">{programTitles[p.code]}</h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">{p.desc}</p>
                <div className="border-t border-navy-700 pt-4 space-y-1.5">
                  <div className="flex justify-between text-xs"><span className="text-gray-500">{durLabel}</span><span className="text-gray-300">{dLbl[p.durationKey]}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-500">{preLabel}</span><span className="text-gray-300">{pLbl[p.prereqKey]}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-gold-500 font-semibold text-sm tracking-widest uppercase mb-3">{t.about_title || "About the Academy"}</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">{t.about_heading || "Training Pilots to the Highest Standard"}</h2>
            <div className="space-y-4 text-gray-400 leading-relaxed"><p>{t.about_p1}</p><p>{t.about_p2}</p><p>{t.about_p3}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6"><div className="text-2xl font-bold text-white mb-1">{t.modern_fleet || "Modern Fleet"}</div><p className="text-sm text-gray-400">{t.modern_fleet_desc}</p></div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6"><div className="text-2xl font-bold text-white mb-1">Expert Team</div><p className="text-sm text-gray-400">Instructors with thousands of hours of instructional and operational experience.</p></div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6"><div className="text-2xl font-bold text-white mb-1">Structured Curriculum</div><p className="text-sm text-gray-400">Approved syllabus aligned with international aviation standards and best practices.</p></div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6"><div className="text-2xl font-bold text-white mb-1">Full Support</div><p className="text-sm text-gray-400">Dedicated ground school, briefing facilities, and student progress tracking.</p></div>
          </div>
        </div>
      </section>

      <section id="why-us" className="bg-navy-800/30 border-y border-navy-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center mb-16">
            <p className="text-gold-500 font-semibold text-sm tracking-widest uppercase mb-3">{t.why_us_title || "Why Masterly Air Academy"}</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.why_us_subtitle || "Built for Serious Training"}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[{ icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z", title: t.ato_certified || "ATO Certified", desc: t.ato_certified_desc, color: "gold" }, { icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z", title: t.modern_fleet || "Modern Fleet", desc: t.modern_fleet_desc, color: "blue" }, { icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z", title: t.efficient_training || "Efficient Training", desc: t.efficient_training_desc, color: "green" }].map((item, i) => (
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
        <div className="text-center mb-10"><h2 className="text-xl font-bold text-white mb-2">{t.portal_access || "Academy Portal Access"}</h2><p className="text-sm text-gray-500">{t.portal_access_desc || "Select your portal to continue."}</p></div>
        <div className="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
          <Link href="/student/login" className="px-6 py-2.5 bg-gold-500/10 border border-gold-500/30 text-gold-500 hover:bg-gold-500 hover:text-navy-900 font-medium rounded-lg transition-all text-sm">{t.student_portal || "Student Portal"}</Link>
          <Link href="/login" className="px-6 py-2.5 bg-navy-800 border border-navy-700 text-gray-400 hover:border-gray-400 hover:text-white font-medium rounded-lg transition-all text-sm">{t.staff_access || "Staff Access"}</Link>
          <a href="/admin" className="px-6 py-2.5 bg-navy-800 border border-navy-700 text-gray-400 hover:border-gray-400 hover:text-white font-medium rounded-lg transition-all text-sm">{t.administration || "Administration"}</a>
        </div>
      </section>

      <footer id="contact" className="border-t border-navy-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-3"><Image src="/mast.svg" alt="MAA" width={110} height={110} className="opacity-80" /><span>{t.app_name}, {t.tagline}</span></div>
            <div className="flex gap-4"><span>{t.footer_onprem || "100% On-Premise"}</span><span className="text-gray-700">|</span><span>{t.footer_languages || "EN | FR | العربية"}</span></div>
          </div>
          <p className="text-center text-xs text-gray-600 mt-6">&copy; {new Date().getFullYear()} {t.footer_copyright || "Masterly Air Academy. All rights reserved."}</p>
        </div>
      </footer>
    </div>
  );
}
