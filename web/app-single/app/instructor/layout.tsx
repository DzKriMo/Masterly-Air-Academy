"use client";
import React, { useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { useUnreadCounts } from "@/lib/use-unread-counts";
import {
  LayoutDashboard, CalendarDays, PlaneTakeoff, BookOpen, FileText,
  Users, MessageSquare, ClipboardCheck, Target, ClipboardList,
  Menu, BarChart3, GitBranch, DoorOpen, Clock,
} from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";

type Role = 'flight_instructor' | 'ground_instructor' | 'chief_flight_instructor' | 'chief_ground_instructor';

const ROLE_LABELS: Record<Role, { label: string; color: string; portal: string }> = {
  flight_instructor: { label: "Flight Instructor", color: "text-blue-400 bg-blue-500/10 border-blue-500/30", portal: "Flight Instructor Portal" },
  ground_instructor: { label: "Ground Instructor", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", portal: "Ground Instructor Portal" },
  chief_flight_instructor: { label: "Chief Flight Instructor", color: "text-gold-500 bg-gold-500/10 border-gold-500/30", portal: "CFI Portal" },
  chief_ground_instructor: { label: "Chief Ground Instructor", color: "text-purple-400 bg-purple-500/10 border-purple-500/30", portal: "CGI Portal" },
};

const ALLOWED_PREFIXES: Record<Role, string[]> = {
  flight_instructor: ["/instructor/dashboard", "/instructor/schedule", "/instructor/flights", "/instructor/students", "/instructor/exams", "/instructor/messages"],
  ground_instructor: ["/instructor/dashboard", "/instructor/schedule", "/instructor/courses", "/instructor/modules", "/instructor/rooms", "/instructor/time-tracking", "/instructor/students", "/instructor/exams", "/instructor/messages"],
  chief_flight_instructor: ["/instructor/cfi-dashboard", "/instructor/schedule", "/instructor/flights", "/instructor/students", "/instructor/exams", "/instructor/messages", "/instructor/instructor-management", "/instructor/flight-programs", "/instructor/student-progress"],
  chief_ground_instructor: ["/instructor/cgi-dashboard", "/instructor/schedule", "/instructor/courses", "/instructor/modules", "/instructor/rooms", "/instructor/time-tracking", "/instructor/students", "/instructor/exams", "/instructor/messages", "/instructor/progression-overview", "/instructor/reports", "/instructor/subject-management"],
};

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const unread = useUnreadCounts({ includeMessages: true, enabled: isAuthenticated });

  const role = user?.role as Role | undefined;
  const roleConfig = role ? ROLE_LABELS[role] : null;
  const isCGI = role === 'chief_ground_instructor';
  const isCFI = role === 'chief_flight_instructor';
  const isFI = role === 'flight_instructor';
  const isGI = role === 'ground_instructor';

  const dashboardHref = isCGI ? "/instructor/cgi-dashboard" : isCFI ? "/instructor/cfi-dashboard" : "/instructor/dashboard";

  // Build nav based on role
  const NAV = useMemo(() => {
    const items: { href: string; label: string; Icon: any; badge?: number }[] = [
      { href: dashboardHref, label: t("instructor.dashboard"), Icon: LayoutDashboard },
    ];

    if (isFI || isCFI) {
      items.push({ href: "/instructor/schedule", label: t("instructor.calendar"), Icon: CalendarDays });
      items.push({ href: "/instructor/flights", label: t("instructor.flightSchedule"), Icon: PlaneTakeoff });
    }
    if (isGI || isCGI) {
      items.push({ href: "/instructor/schedule", label: t("instructor.calendar"), Icon: CalendarDays });
      items.push({ href: "/instructor/courses", label: t("instructor.myCourses"), Icon: BookOpen });
      items.push({ href: "/instructor/modules", label: t("instructor.moduleContent"), Icon: FileText });
      items.push({ href: "/instructor/rooms", label: t("instructor.rooms", "Classrooms"), Icon: DoorOpen });
      items.push({ href: "/instructor/time-tracking", label: t("instructor.timeTracking", "Time Tracking"), Icon: Clock });
    }

    items.push({ href: "/instructor/students", label: t("instructor.myStudents"), Icon: Users });

    if (isFI || isCFI) {
      items.push({ href: "/instructor/exams", label: t("instructor.exams", "Exams"), Icon: ClipboardList });
    }
    if (isGI || isCGI) {
      items.push({ href: "/instructor/exams", label: t("instructor.exams", "Exams"), Icon: ClipboardList });
    }

    items.push({ href: "/instructor/messages", label: t("instructor.messages"), Icon: MessageSquare, badge: unread.messages });

    if (isFI || isCFI) {
      items.push({ href: "/instructor/flights/progress-check", label: t("instructor.progressChecks"), Icon: ClipboardCheck });
      items.push({ href: "/instructor/flights/skill-test", label: t("instructor.skillTests"), Icon: Target });
    }

    // Oversight items for chiefs
    if (isCFI) {
      items.push({ href: "/instructor/instructor-management", label: t("instructor.instructorManagement", "Instructor Mgmt"), Icon: Users });
      items.push({ href: "/instructor/flight-programs", label: t("instructor.flightPrograms", "Flight Programs"), Icon: GitBranch });
      items.push({ href: "/instructor/student-progress", label: t("instructor.studentProgress", "Student Progress"), Icon: BarChart3 });
    }
    if (isCGI) {
      items.push({ href: "/instructor/progression-overview", label: t("instructor.progressionOverview", "Progression"), Icon: BarChart3 });
      items.push({ href: "/instructor/reports", label: t("instructor.reports", "Reports"), Icon: FileText });
      items.push({ href: "/instructor/subject-management", label: t("instructor.subjectManagement", "Subjects"), Icon: BookOpen });
    }

    return items;
  }, [dashboardHref, t, unread.messages, isFI, isCFI, isGI, isCGI]);

  // Route guard: redirect if current path not allowed for role
  if (!isLoading && isAuthenticated && role) {
    const allowed = ALLOWED_PREFIXES[role] || [];
    const isAllowed = allowed.some(prefix => pathname === prefix || pathname.startsWith(prefix + "/"));
    if (!isAllowed && pathname.startsWith("/instructor/")) {
      router.push(dashboardHref);
      return null;
    }
  }

  if (isLoading) return null;
  if (!isAuthenticated) { router.push("/login"); return null; }
  if (user && !user.role?.includes("instructor")) { router.push("/dashboard"); return null; }

  const closeSidebar = () => setSidebarOpen(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-navy-900 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={closeSidebar} />
      )}

      <aside className={`w-64 bg-navy-800 border-r border-navy-700 min-h-screen shrink-0 fixed md:sticky flex flex-col top-0 z-50 transition-transform duration-200 md:translate-x-0 md:block
        ${sidebarOpen ? "translate-x-0 block" : "-translate-x-full hidden"}
      `}>
        <div className="p-5 border-b border-navy-700 text-center">
          <Image src="/logo.png" alt="MAA" width={100} height={100} className="mx-auto" />
          <p className="text-white font-bold mt-3 text-base">{roleConfig?.portal || t("layout.instructorPortal")}</p>
          {roleConfig && (
            <span className={`inline-block mt-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${roleConfig.color}`}>
              {roleConfig.label}
            </span>
          )}
          <p className="text-xs text-gray-500 truncate mt-1.5">{user?.name || user?.email}</p>
        </div>
        <nav className="p-3 flex-1 overflow-y-auto">
          {NAV.map(item => (
            <a key={item.href} href={item.href} onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm mb-0.5 transition-colors ${
                pathname === item.href
                  ? "bg-gold-500/20 text-gold-500 font-semibold"
                  : "text-gray-400 hover:text-white hover:bg-navy-700"
              }`}>
              <item.Icon className="w-5 h-5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {"badge" in item && (item as any).badge > 0 && (
                <span className="bg-gold-500 text-navy-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight">
                  {(item as any).badge > 99 ? "99+" : (item as any).badge}
                </span>
              )}
            </a>
          ))}
        </nav>
        <div className="p-4 border-t border-navy-700 w-full shrink-0">
          <button onClick={async () => { await logout(); router.push("/login"); }}
            className="w-full py-2.5 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors">
            {t("common.signOut")}
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-navy-800/95 backdrop-blur border-b border-navy-700 h-14 flex items-center gap-3" style={{ padding: "env(safe-area-inset-top) 16px 0" }}>
        <button onClick={() => setSidebarOpen(true)} className="flex items-center justify-center w-[50px] h-[50px] -ml-1 text-gray-400 active:text-white rounded-lg transition-colors">
          <Menu className="w-6 h-6" />
        </button>
        <span className="text-white font-semibold text-sm truncate flex-1">{user?.name || "Instructor"}</span>
      </div>

      <div className="flex-1 min-w-0 pt-14 md:pt-0">
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </div>
  );
}
