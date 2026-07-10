"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { getPortalLabel, usesFilamentAdmin } from "@/lib/portal-access";

interface QuickLink {
  href: string;
  label: string;
  external?: boolean;
}

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
    // Admin users should use Django Admin, not this dashboard
    if (!isLoading && user && usesFilamentAdmin(user.role)) {
      window.location.href = "/admin";
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center text-white">
        <div className="text-gold-500 text-lg animate-pulse">Loading...</div>
      </div>
    );
  }

  const roleLabel = getPortalLabel(user.role);
  const links = getQuickLinks(user.role);

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
              src="/mast.svg"
              alt="MAA"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <div>
              <h1 className="text-lg font-bold text-white">
                Masterly Air Academy
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
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-white mb-6">
          Welcome, {user.name?.split(" ")[0] || "User"}
        </h2>

        {/* Stats cards | role appropriate */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {getRoleCards(user.role).map((card, i) => (
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
          <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
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

function getRoleCards(role: string): { title: string; value: string; icon: string }[] {
  switch (true) {
    case role.startsWith("flight_instructor") || role.startsWith("chief_flight"):
      return [
        { title: "Today's Flights", value: "|", icon: "✈️" },
        { title: "My Students", value: "|", icon: "🎓" },
        { title: "Hours This Month", value: "|", icon: "⏱️" },
        { title: "Pending Reports", value: "|", icon: "📝" },
      ];
    case role.startsWith("ground_instructor") || role.startsWith("chief_ground"):
      return [
        { title: "Today's Courses", value: "|", icon: "📚" },
        { title: "My Students", value: "|", icon: "🎓" },
        { title: "Attendance", value: "|", icon: "✓" },
        { title: "Pending Evaluations", value: "|", icon: "📝" },
      ];
    case role === "quality_manager" || role === "safety_manager" || role === "compliance_monitoring_manager":
      return [
        { title: "Open NCRs", value: "|", icon: "⚠️" },
        { title: "Audits Planned", value: "|", icon: "🔍" },
        { title: "CAPA Due", value: "|", icon: "📋" },
        { title: "Safety Events", value: "|", icon: "🛡️" },
      ];
    case role === "finance_responsible" || role === "accounting_agent":
      return [
        { title: "Outstanding", value: "|", icon: "💰" },
        { title: "Paid This Month", value: "|", icon: "✅" },
        { title: "Overdue", value: "|", icon: "⚠️" },
        { title: "Revenue MTD", value: "|", icon: "📈" },
      ];
    case role === "director_general" || role === "head_of_training":
      return [
        { title: "Active Students", value: "|", icon: "🎓" },
        { title: "Flight Hours MTD", value: "|", icon: "✈️" },
        { title: "Revenue MTD", value: "|", icon: "💰" },
        { title: "Compliance", value: "|", icon: "🛡️" },
      ];
    case role === "scheduler":
      return [
        { title: "Today's Bookings", value: "|", icon: "📅" },
        { title: "Aircraft Available", value: "|", icon: "✈️" },
        { title: "Conflicts", value: "|", icon: "⚠️" },
        { title: "Pending Requests", value: "|", icon: "📋" },
      ];
    default:
      return [
        { title: "Overview", value: "|", icon: "📊" },
        { title: "Tasks", value: "|", icon: "📋" },
        { title: "Messages", value: "|", icon: "💬" },
        { title: "Activity", value: "|", icon: "🔔" },
      ];
  }
}

/* ── Role-based quick links ────────────────────── */

function getQuickLinks(role: string): QuickLink[] {
  switch (true) {
    case role.startsWith("flight_instructor"):
      return [
        { href: "/instructor/schedule", label: "My Schedule" },
        { href: "/instructor/students", label: "My Students" },
        { href: "/instructor/flights", label: "Flight Reports" },
      ];
    case role === "chief_flight_instructor":
      return [
        { href: "/instructor/schedule", label: "Schedule" },
        { href: "/instructor/students", label: "Students" },
        { href: "/instructor/aircraft", label: "Aircraft" },
        { href: "/instructor/reports", label: "Reports" },
      ];
    case role.startsWith("ground_instructor"):
      return [
        { href: "/instructor/schedule", label: "My Courses" },
        { href: "/instructor/students", label: "Students" },
        { href: "/instructor/attendance", label: "Attendance" },
      ];
    case role === "chief_ground_instructor":
      return [
        { href: "/instructor/schedule", label: "Schedule" },
        { href: "/instructor/students", label: "Students" },
        { href: "/instructor/subjects", label: "Subjects & Modules" },
      ];
    case role === "quality_manager" || role === "safety_manager" || role === "compliance_monitoring_manager":
      return [
        { href: "/quality/dashboard", label: "Quality Dashboard" },
        { href: "/quality/audits", label: "Audits" },
        { href: "/quality/ncrs", label: "Non-Conformities" },
        { href: "/quality/safety", label: "Safety Events" },
      ];
    case role === "finance_responsible" || role === "accounting_agent":
      return [
        { href: "/finance/dashboard", label: "Finance Dashboard" },
        { href: "/finance/invoices", label: "Invoices" },
        { href: "/finance/payments", label: "Payments" },
        { href: "/finance/reports", label: "Reports" },
      ];
    case role === "director_general" || role === "head_of_training":
      return [
        { href: "/dashboard", label: "KPI Dashboard" },
        { href: "/reports/students", label: "Student Reports" },
        { href: "/reports/financial", label: "Financial Reports" },
        { href: "/reports/operations", label: "Operations Reports" },
      ];
    case role === "scheduler":
      return [
        { href: "/instructor/schedule", label: "Calendar" },
        { href: "/instructor/aircraft", label: "Aircraft Status" },
        { href: "/instructor/bookings", label: "Bookings" },
      ];
    default:
      return [];
  }
}
