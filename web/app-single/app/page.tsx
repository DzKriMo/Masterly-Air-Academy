"use client";

import Image from "next/image";
import Link from "next/link";

const portals = [
  {
    href: "/student/login",
    icon: "🎓",
    title: "Student Portal",
    desc: "Dashboard, courses, flight log, exams, schedule, certificates, invoices.",
    color: "border-gold-500",
    bgHover: "hover:bg-gold-500/5",
  },
  {
    href: "/login",
    icon: "👨‍🏫",
    title: "Instructor Portal",
    desc: "Student management, flight lessons, evaluations, attendance, schedule.",
    color: "border-blue-500",
    bgHover: "hover:bg-blue-500/5",
  },
  {
    href: "/admin",
    icon: "⚙️",
    title: "Administration",
    desc: "User & role management, student files, applications, rooms, reports.",
    color: "border-purple-500",
    bgHover: "hover:bg-purple-500/5",
  },
  {
    href: "/quality/dashboard",
    icon: "🛡️",
    title: "Quality & Safety",
    desc: "Audits, non-conformities, CAPA, risk assessments, safety events.",
    color: "border-green-500",
    bgHover: "hover:bg-green-500/5",
  },
  {
    href: "/finance/dashboard",
    icon: "💰",
    title: "Finance",
    desc: "Invoicing, payment tracking, financial reports, student fee management.",
    color: "border-amber-500",
    bgHover: "hover:bg-amber-500/5",
  },
  {
    href: "/dashboard",
    icon: "📊",
    title: "Director Dashboard",
    desc: "KPIs, training statistics, fleet utilization, compliance overview.",
    color: "border-red-500",
    bgHover: "hover:bg-red-500/5",
  },
];

const stats = [
  { value: "Approved", label: "ATO Status", icon: "✅" },
  { value: "On-Premise", label: "100% Data Control", icon: "🔒" },
  { value: "19", label: "User Roles", icon: "👥" },
  { value: "3", label: "Languages (EN/FR/AR)", icon: "🌍" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-navy-900">
      {/* ── HERO ──────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-navy-700/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28 text-center">
          {/* Logo */}
          <div className="mb-8">
            <Image
              src="/logo.png"
              alt="Masterly Air Academy"
              width={100}
              height={100}
              className="mx-auto rounded-2xl shadow-2xl md:w-32 md:h-32"
              priority
            />
          </div>

          {/* Tagline */}
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 tracking-tight">
            Masterly{" "}
            <span className="text-gold-500">Air Academy</span>
          </h1>
          <p className="text-lg md:text-2xl text-gray-400 max-w-3xl mx-auto mb-4 leading-relaxed">
            Approved Training Organization — Management Platform
          </p>
          <p className="text-base text-gray-500 max-w-2xl mx-auto mb-10">
            A comprehensive, on-premise platform for managing every aspect of
            aviation training: students, instructors, fleet, exams, quality,
            safety, and finance — all in one place.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/student/login"
              className="px-8 py-3.5 bg-gold-500 hover:bg-gold-600 active:bg-gold-700 text-navy-900 font-bold text-lg rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Student Portal
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 border-2 border-gold-500/40 hover:border-gold-500 text-gold-500 font-bold text-lg rounded-xl transition-all hover:bg-gold-500/10"
            >
              Staff Login
            </Link>
            <a
              href="/admin"
              className="px-8 py-3.5 border-2 border-navy-600 hover:border-gray-400 text-gray-400 hover:text-white font-semibold text-lg rounded-xl transition-all"
            >
              Admin Panel
            </a>
          </div>
        </div>
      </section>

      {/* ── PORTAL CARDS ─────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Choose Your Portal
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Six dedicated portals, each tailored to a specific role within the academy.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {portals.map((portal) => (
            <a
              key={portal.href}
              href={portal.href}
              className={`group block bg-navy-800 rounded-2xl border border-navy-700 border-l-4 ${portal.color} p-6 ${portal.bgHover} transition-all hover:border-l-[6px] hover:-translate-y-1 hover:shadow-xl`}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl group-hover:scale-110 transition-transform">
                  {portal.icon}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1.5 group-hover:text-gold-500 transition-colors">
                    {portal.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {portal.desc}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────── */}
      <section className="border-y border-navy-700 bg-navy-800/50">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <span className="text-2xl mb-2 block">{stat.icon}</span>
                <p className="text-2xl md:text-3xl font-bold text-white mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────── */}
      <footer className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="MAA"
              width={36}
              height={36}
              className="rounded-lg"
            />
            <div>
              <p className="text-white font-semibold">Masterly Air Academy</p>
              <p className="text-xs text-gray-500">
                Approved Training Organization — Management Platform
              </p>
            </div>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <span>100% On-Premise</span>
            <span className="hidden sm:inline">·</span>
            <span>LAN Access Only</span>
            <span className="hidden sm:inline">·</span>
            <span>EN · FR · العربية</span>
          </div>
        </div>
        <p className="text-center text-xs text-gray-600 mt-8">
          &copy; {new Date().getFullYear()} Masterly Air Academy. All rights reserved.
          All data stored and processed on-premise within the school&apos;s infrastructure.
        </p>
      </footer>
    </div>
  );
}
