"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { formatRole } from "@/lib/portal-access";

interface DashboardStats {
  upcomingLessons: number;
  completedLessons: number;
  flightHours: number;
  examAverage: number;
}

export default function StudentDashboardPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [stats] = useState<DashboardStats>({
    upcomingLessons: 0,
    completedLessons: 0,
    flightHours: 0,
    examAverage: 0,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/student/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="text-gold-500 text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push("/student/login");
  };

  return (
    <div className="min-h-screen bg-navy-900">
      {/* Navigation bar | sticky for iPad */}
      <nav className="sticky top-0 z-50 bg-navy-800/95 backdrop-blur border-b border-navy-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo + branding */}
            <div className="flex items-center gap-3">
              <Image
                src="/mast.svg"
                alt="MAA"
                width={40}
                height={40}
                className="rounded-lg md:w-12 md:h-12"
              />
              <div>
                <h1 className="text-base md:text-lg font-bold text-white leading-tight">
                  Masterly Air Academy
                </h1>
                <p className="text-xs md:text-sm text-gold-500 font-medium">
                  Student Portal
                </p>
              </div>
            </div>

            {/* User info + logout */}
            <div className="flex items-center gap-3 md:gap-5">
              <div className="hidden sm:block text-right">
                <p className="text-sm text-white font-medium truncate max-w-[160px]">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-gray-400">
                  {formatRole(user.role)}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2.5 text-sm font-medium text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/10 active:bg-red-500/20 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content | iPad-optimized grid */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {/* Welcome */}
        <div className="mb-8 md:mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            Welcome back, {user.name?.split(" ")[0] || "Student"}
          </h2>
          <p className="text-gray-400 mt-1 text-base">
            Here&apos;s your training overview
          </p>
        </div>

        {/* Stats cards | 2x2 on iPad, 4-col on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
          <StatCard
            title="Upcoming"
            value={stats.upcomingLessons}
            subtitle="Lessons"
            icon="📅"
            color="border-l-gold-500"
          />
          <StatCard
            title="Completed"
            value={stats.completedLessons}
            subtitle="Lessons"
            icon="✅"
            color="border-l-green-500"
          />
          <StatCard
            title={stats.flightHours.toFixed(1)}
            value=""
            subtitle="Flight Hours"
            icon="✈️"
            color="border-l-blue-500"
          />
          <StatCard
            title={stats.examAverage > 0 ? `${stats.examAverage}%` : "|"}
            value=""
            subtitle="Exam Average"
            icon="📝"
            color="border-l-purple-500"
          />
        </div>

        {/* Quick access tiles | iPad-friendly large touch targets */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 mb-10">
          <QuickTile href="/student/schedule" icon="🗓️" label="My Schedule" />
          <QuickTile href="/student/courses" icon="📚" label="My Courses" />
          <QuickTile href="/student/flights" icon="✈️" label="Flight Log" />
          <QuickTile href="/student/exams" icon="📝" label="Exams" />
          <QuickTile href="/student/progress" icon="📊" label="Progress" />
          <QuickTile href="/student/documents" icon="📄" label="Documents" />
          <QuickTile href="/student/invoices" icon="💰" label="Invoices" />
          <QuickTile href="/student/certificates" icon="🏅" label="Certificates" />
        </div>

        {/* Recent activity placeholder */}
        <div className="bg-navy-800 rounded-2xl p-6 md:p-8 border border-navy-700">
          <h3 className="text-xl font-semibold text-white mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            <ActivityItem
              title="No recent activity"
              subtitle="Your flight lessons, exams, and course progress will appear here."
              time=""
            />
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── Stat Card ─────────────────────────────────── */

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  color: string;
}) {
  return (
    <div
      className={`bg-navy-800 rounded-2xl p-5 md:p-6 border border-navy-700 border-l-4 ${color} hover:border-gold-500/50 transition-colors`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-400 font-medium">{subtitle}</p>
        <span className="text-2xl md:text-3xl">{icon}</span>
      </div>
      <p className="text-3xl md:text-4xl font-bold text-white">
        {value || title}
      </p>
    </div>
  );
}

/* ── Quick Tile | large iPad touch target ──────── */

function QuickTile({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <a
      href={href}
      className="flex flex-col items-center justify-center gap-2 p-5 md:p-6 bg-navy-800 rounded-2xl border border-navy-700 hover:border-gold-500 active:bg-navy-700 transition-all text-center min-h-[100px] md:min-h-[120px] group"
    >
      <span className="text-3xl md:text-4xl group-hover:scale-110 transition-transform">
        {icon}
      </span>
      <span className="text-sm md:text-base font-medium text-gray-300 group-hover:text-gold-500 transition-colors">
        {label}
      </span>
    </a>
  );
}

/* ── Activity Item ─────────────────────────────── */

function ActivityItem({
  title,
  subtitle,
  time,
}: {
  title: string;
  subtitle: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-navy-900/50 border border-navy-700/50">
      <div className="w-2 h-2 mt-2 rounded-full bg-gold-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium">{title}</p>
        <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      {time && <span className="text-xs text-gray-500 shrink-0">{time}</span>}
    </div>
  );
}
