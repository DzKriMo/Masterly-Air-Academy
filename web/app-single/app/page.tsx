"use client";

import Image from "next/image";
import Link from "next/link";

const programs = [
  {
    code: "PPL",
    title: "Private Pilot License",
    desc: "The foundation of your aviation career. Learn basic flight maneuvers, navigation, and aircraft handling under Visual Flight Rules.",
    duration: "6–8 months",
    prerequisites: "Class 2 Medical Certificate",
  },
  {
    code: "CPL",
    title: "Commercial Pilot License",
    desc: "Advanced training for professional pilots. Master complex aircraft operations, instrument flying, and multi-engine handling.",
    duration: "12–18 months",
    prerequisites: "PPL + Class 1 Medical Certificate",
  },
  {
    code: "IR",
    title: "Instrument Rating",
    desc: "Fly solely by reference to instruments. Essential for commercial operations in all weather conditions and controlled airspace.",
    duration: "3–4 months",
    prerequisites: "PPL + 50 hours cross-country",
  },
  {
    code: "MEP",
    title: "Multi-Engine Piston",
    desc: "Transition to multi-engine aircraft. Learn asymmetric flight management, engine-out procedures, and advanced performance calculations.",
    duration: "1–2 months",
    prerequisites: "CPL or in progress",
  },
  {
    code: "MCC",
    title: "Multi-Crew Cooperation",
    desc: "Prepare for airline operations. Develop crew resource management, standard operating procedures, and multi-pilot cockpit discipline.",
    duration: "2–3 weeks",
    prerequisites: "CPL + IR",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-navy-900 text-white">
      {/* ── NAVIGATION ───────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-navy-900/95 backdrop-blur border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <Image src="/mast.svg" alt="MAA" width={110} height={110} className="rounded-xl" />
              <span className="text-white font-bold text-lg tracking-tight">
                Masterly <span className="text-gold-500">Air Academy</span>
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
              <a href="#programs" className="hover:text-white transition-colors">Programs</a>
              <a href="#about" className="hover:text-white transition-colors">About</a>
              <a href="#why-us" className="hover:text-white transition-colors">Why Us</a>
              <Link href="/student/login" className="text-gold-500 hover:text-gold-400 font-medium transition-colors">
                Student Access
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gold-500/[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/[0.03] rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-20 pb-24 md:pt-24 md:pb-32">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Text side */}
            <div className="flex-1 text-center lg:text-left">
              <p className="text-gold-500 font-semibold text-sm tracking-widest uppercase mb-4">
                Approved Training Organization
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                Your Aviation Career<br />
                <span className="text-gold-500">Starts Here</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-400 leading-relaxed mb-10">
                Masterly Air Academy delivers world-class flight training with a modern fleet,
                experienced instructors, and a rigorous curriculum designed to produce
                safe, competent, and professional pilots.
              </p>
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <a
                  href="#programs"
                  className="px-8 py-3.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold rounded-lg transition-colors"
                >
                  Explore Programs
                </a>
                <a
                  href="#contact"
                  className="px-8 py-3.5 border border-gold-500/30 hover:border-gold-500 text-gold-500 font-semibold rounded-lg transition-colors"
                >
                  Contact Us
                </a>
              </div>
            </div>
            {/* Logo side */}
            <div className="flex-shrink-0">
              <Image
                src="/mast.svg"
                alt="Masterly Air Academy"
                width={460}
                height={460}
                className="w-52 h-52 md:w-64 md:h-64 lg:w-72 lg:h-72"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── PROGRAMS ──────────────────────────────────── */}
      <section id="programs" className="bg-navy-800/30 border-y border-navy-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center mb-16">
            <p className="text-gold-500 font-semibold text-sm tracking-widest uppercase mb-3">
              Training Programs
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Choose Your Path
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Structured programs from your first discovery flight to airline-ready certification.
              Every program follows a rigorous, approved syllabus.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((p) => (
              <div
                key={p.code}
                className="group bg-navy-900 border border-navy-700 rounded-xl p-6 hover:border-gold-500/40 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-gold-500 bg-gold-500/10 px-3 py-1 rounded-full tracking-wider">
                    {p.code}
                  </span>
                  <svg className="w-5 h-5 text-navy-700 group-hover:text-gold-500/40 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.125A59.769 59.769 0 0121.485 12a59.768 59.768 0 01-3.27 8.875L6 12Z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-gold-500 transition-colors">
                  {p.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">
                  {p.desc}
                </p>
                <div className="border-t border-navy-700 pt-4 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Duration</span>
                    <span className="text-gray-300">{p.duration}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Prerequisites</span>
                    <span className="text-gray-300">{p.prerequisites}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ─────────────────────────────────────── */}
      <section id="about" className="max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-gold-500 font-semibold text-sm tracking-widest uppercase mb-3">
              About the Academy
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Training Pilots to the Highest Standard
            </h2>
            <div className="space-y-4 text-gray-400 leading-relaxed">
              <p>
                Masterly Air Academy is an Approved Training Organization (ATO) dedicated to
                producing pilots who meet and exceed industry standards. Our structured approach
                combines rigorous theoretical instruction with extensive practical flight training.
              </p>
              <p>
                We operate a modern fleet of single and multi-engine aircraft, supported by
                experienced instructors who bring thousands of hours of real-world flying
                experience to every lesson.
              </p>
              <p>
                From your first trial flight to your airline transport license, every step
                of your journey is tracked, assessed, and supported through our integrated
                training management system.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
              <div className="text-2xl font-bold text-white mb-1">Modern Fleet</div>
              <p className="text-sm text-gray-400">Well-maintained aircraft with glass cockpit avionics for optimal training.</p>
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
              <div className="text-2xl font-bold text-white mb-1">Expert Team</div>
              <p className="text-sm text-gray-400">Instructors with thousands of hours of instructional and operational experience.</p>
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
              <div className="text-2xl font-bold text-white mb-1">Structured Curriculum</div>
              <p className="text-sm text-gray-400">Approved syllabus aligned with international aviation standards and best practices.</p>
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
              <div className="text-2xl font-bold text-white mb-1">Full Support</div>
              <p className="text-sm text-gray-400">Dedicated ground school, briefing facilities, and student progress tracking.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ─────────────────────────────── */}
      <section id="why-us" className="bg-navy-800/30 border-y border-navy-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center mb-16">
            <p className="text-gold-500 font-semibold text-sm tracking-widest uppercase mb-3">
              Why Masterly Air Academy
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Built for Serious Training
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-5 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">ATO Certified</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Fully approved by the civil aviation authority. Our programs meet all regulatory requirements for pilot licensing.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Modern Fleet</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Glass-cockpit aircraft maintained to the highest standards. Regular inspections ensure safety and availability.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-5 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Efficient Training</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Structured progression with clear milestones. Integrated digital tracking keeps you informed of your progress at every stage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PORTAL ACCESS ─────────────────────────────── */}
      <section id="access" className="max-w-7xl mx-auto px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center mb-10">
          <h2 className="text-xl font-bold text-white mb-2">Academy Portal Access</h2>
          <p className="text-sm text-gray-500">Select your portal to continue.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
          <Link
            href="/student/login"
            className="px-6 py-2.5 bg-gold-500/10 border border-gold-500/30 text-gold-500 hover:bg-gold-500 hover:text-navy-900 font-medium rounded-lg transition-all text-sm"
          >
            Student Portal
          </Link>
          <Link
            href="/login"
            className="px-6 py-2.5 bg-navy-800 border border-navy-700 text-gray-400 hover:border-gray-400 hover:text-white font-medium rounded-lg transition-all text-sm"
          >
            Staff Access
          </Link>
          <a
            href="/admin"
            className="px-6 py-2.5 bg-navy-800 border border-navy-700 text-gray-400 hover:border-gray-400 hover:text-white font-medium rounded-lg transition-all text-sm"
          >
            Administration
          </a>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────── */}
      <footer id="contact" className="border-t border-navy-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-3">
              <Image src="/mast.svg" alt="MAA" width={90} height={90} className="opacity-80" />
              <span>Masterly Air Academy, Approved Training Organization</span>
            </div>
            <div className="flex gap-4">
              <span>EN · FR · العربية</span>
            </div>
          </div>
          <p className="text-center text-xs text-gray-600 mt-6">
            &copy; {new Date().getFullYear()} Masterly Air Academy. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
