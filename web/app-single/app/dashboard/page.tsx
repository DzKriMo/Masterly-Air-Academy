"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { getPortalLabel, usesDjangoAdmin } from "@/lib/portal-access";

interface QuickLink {
  href: string;
  label: string;
  external?: boolean;
}

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center text-white">
        <div className="text-gold-500 text-lg animate-pulse">{t("dashboard.loading")}</div>
      </div>
    );
  }

  const roleLabel = getPortalLabel(user.role);
  const links = getQuickLinks(user.role, t);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="bg-navy-800 border-b border-navy-700">
        <div className="flex items-center justify-between max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="MAA"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <div>
              <h1 className="text-lg font-bold text-white">
                {t("dashboard.masterlyAirAcademy")}
              </h1>
              <p className="text-xs text-gray-400">{roleLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user.name || user.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
            >
              {t("common.signOut")}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-white mb-6">
          {t("dashboard.welcome")} {user.name?.split(" ")[0] || "User"}
        </h2>

        {/* Stats cards | role appropriate */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {getRoleCards(user.role, t).map((card, i) => (
            <div
              key={i}
              className="bg-navy-800 rounded-xl p-6 border border-navy-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{card.title}</p>
                  <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
                </div>
                <span className="text-3xl">{card.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="bg-navy-800 rounded-xl p-6 border border-navy-700">
          <h3 className="text-lg font-semibold text-white mb-4">{t("dashboard.quickLinks")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {links.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  className="block px-4 py-3 bg-navy-900 rounded-lg border border-navy-600 hover:border-gold-500 text-gray-300 hover:text-gold-500 transition-colors"
                >
                  {link.label}
                </a>
              ) : (
                <button
                  key={link.href}
                  onClick={() => router.push(link.href)}
                  className="block px-4 py-3 bg-navy-900 rounded-lg border border-navy-600 hover:border-gold-500 text-gray-300 hover:text-gold-500 transition-colors text-left"
                >
                  {link.label}
                </button>
              )
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── Role-based cards ──────────────────────────── */

function getRoleCards(role: string, t: (key: string) => string): { title: string; value: string; icon: string }[] {
  switch (true) {
    case role.startsWith("flight_instructor") || role.startsWith("chief_flight"):
      return [
        { title: t("dashboard.todaysFlights"), value: "|", icon: "✈️" },
        { title: t("dashboard.myStudents"), value: "|", icon: "🎓" },
        { title: t("dashboard.hoursThisMonth"), value: "|", icon: "⏱️" },
        { title: t("dashboard.pendingReports"), value: "|", icon: "📝" },
      ];
    case role.startsWith("ground_instructor") || role.startsWith("chief_ground"):
      return [
        { title: t("dashboard.todaysCourses"), value: "|", icon: "📚" },
        { title: t("dashboard.myStudents"), value: "|", icon: "🎓" },
        { title: t("instructor.attendance"), value: "|", icon: "✓" },
        { title: t("dashboard.pendingEvaluations"), value: "|", icon: "📝" },
      ];
    case role === "quality_manager" || role === "safety_manager" || role === "compliance_monitoring_manager":
      return [
        { title: t("dashboard.openNCRs"), value: "|", icon: "⚠️" },
        { title: t("dashboard.auditsPlanned"), value: "|", icon: "🔍" },
        { title: t("dashboard.capaDue"), value: "|", icon: "📋" },
        { title: t("quality.safetyEvents"), value: "|", icon: "🛡️" },
      ];
    case role === "finance_responsible" || role === "accounting_agent":
      return [
        { title: t("finance.outstanding"), value: "|", icon: "💰" },
        { title: t("dashboard.paidThisMonth"), value: "|", icon: "✅" },
        { title: t("finance.overdue"), value: "|", icon: "⚠️" },
        { title: t("dashboard.revenueMTD"), value: "|", icon: "📈" },
      ];
    case role === "director_general" || role === "head_of_training":
      return [
        { title: t("dashboard.activeStudents"), value: "|", icon: "🎓" },
        { title: t("dashboard.flightHoursMTD"), value: "|", icon: "✈️" },
        { title: t("dashboard.revenueMTD"), value: "|", icon: "💰" },
        { title: t("dashboard.compliance"), value: "|", icon: "🛡️" },
      ];
    case role === "scheduler":
      return [
        { title: t("dashboard.todaysBookings"), value: "|", icon: "📅" },
        { title: t("dashboard.aircraftAvailable"), value: "|", icon: "✈️" },
        { title: t("dashboard.conflicts"), value: "|", icon: "⚠️" },
        { title: t("dashboard.pendingRequests"), value: "|", icon: "📋" },
      ];
    default:
      return [
        { title: t("dashboard.overview"), value: "|", icon: "📊" },
        { title: t("dashboard.tasks"), value: "|", icon: "📋" },
        { title: t("student.messages"), value: "|", icon: "💬" },
        { title: t("dashboard.activity"), value: "|", icon: "🔔" },
      ];
  }
}

/* ── Role-based quick links ────────────────────── */

function getQuickLinks(role: string, t: (key: string) => string): QuickLink[] {
  switch (true) {
    case role.startsWith("flight_instructor"):
      return [
        { href: "/instructor/schedule", label: t("dashboard.mySchedule") },
        { href: "/instructor/students", label: t("dashboard.myStudents") },
        { href: "/instructor/flights", label: t("dashboard.flightReports") },
      ];
    case role === "chief_flight_instructor":
      return [
        { href: "/instructor/schedule", label: t("dashboard.schedule") },
        { href: "/instructor/students", label: t("dashboard.students") },
        { href: "/instructor/aircraft", label: t("dashboard.aircraft") },
        { href: "/instructor/reports", label: t("dashboard.reports") },
      ];
    case role.startsWith("ground_instructor"):
      return [
        { href: "/instructor/schedule", label: t("instructor.myCourses") },
        { href: "/instructor/students", label: t("dashboard.students") },
        { href: "/instructor/attendance", label: t("instructor.attendance") },
      ];
    case role === "chief_ground_instructor":
      return [
        { href: "/instructor/schedule", label: t("dashboard.schedule") },
        { href: "/instructor/students", label: t("dashboard.students") },
        { href: "/instructor/subjects", label: t("dashboard.subjectsModules") },
      ];
    case role === "quality_manager" || role === "safety_manager" || role === "compliance_monitoring_manager":
      return [
        { href: "/quality/dashboard", label: t("dashboard.qualityDashboard") },
        { href: "/quality/audits", label: t("quality.audits") },
        { href: "/quality/ncrs", label: t("quality.nonConformities") },
        { href: "/quality/safety", label: t("quality.safetyEvents") },
      ];
    case role === "finance_responsible" || role === "accounting_agent":
      return [
        { href: "/finance/dashboard", label: t("dashboard.financeDashboard") },
        { href: "/finance/invoices", label: t("finance.invoices") },
        { href: "/finance/payments", label: t("finance.payments") },
        { href: "/finance/reports", label: t("finance.reports") },
      ];
    case role === "director_general" || role === "head_of_training":
      return [
        { href: "/dashboard", label: t("dashboard.kpiDashboard") },
        { href: "/reports/students", label: t("dashboard.studentReports") },
        { href: "/reports/financial", label: t("dashboard.financialReports") },
        { href: "/reports/operations", label: t("dashboard.operationsReports") },
      ];
    case role === "scheduler":
      return [
        { href: "/instructor/schedule", label: t("dashboard.schedule") },
        { href: "/instructor/aircraft", label: t("dashboard.aircraftStatus") },
        { href: "/instructor/bookings", label: t("dashboard.bookings") },
      ];
    default:
      return [];
  }
}
