"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { LayoutDashboard, CalendarDays, PlaneTakeoff, BookOpen, FileText, Users, MessageSquare, ClipboardCheck, Target, Menu } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const NAV = [
    { href: "/instructor/dashboard", label: t("instructor.dashboard"), Icon: LayoutDashboard },
    { href: "/instructor/schedule", label: t("instructor.calendar"), Icon: CalendarDays },
    { href: "/instructor/flights", label: t("instructor.flightSchedule"), Icon: PlaneTakeoff },
    { href: "/instructor/courses", label: t("instructor.myCourses"), Icon: BookOpen },
    { href: "/instructor/modules", label: t("instructor.moduleContent"), Icon: FileText },
    { href: "/instructor/students", label: t("instructor.myStudents"), Icon: Users },
    { href: "/instructor/messages", label: t("instructor.messages"), Icon: MessageSquare },
    { href: "/instructor/flights/progress-check", label: t("instructor.progressChecks"), Icon: ClipboardCheck },
    { href: "/instructor/flights/skill-test", label: t("instructor.skillTests"), Icon: Target },
  ];

  if (isLoading) return null;
  if (!isAuthenticated) { router.push("/login"); return null; }
  if (user && !user.role?.includes("instructor")) { router.push("/dashboard"); return null; }

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-navy-900 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={closeSidebar} />
      )}

      {/* Sidebar — hidden on mobile unless hamburger toggled, always visible md+ */}
      <aside className={`w-64 bg-navy-800 border-r border-navy-700 min-h-screen shrink-0 fixed md:sticky top-0 z-50 transition-transform duration-200 md:translate-x-0 md:block
        ${sidebarOpen ? "translate-x-0 block" : "-translate-x-full hidden"}
      `}>
        <div className="p-5 border-b border-navy-700 text-center">
          <Image src="/logo.png" alt="MAA" width={100} height={100} className="mx-auto" />
          <p className="text-white font-bold mt-3 text-base">{t("layout.instructorPortal")}</p>
          <p className="text-xs text-gold-500 truncate mt-0.5">{user?.name || user?.email}</p>
        </div>
        <nav className="p-3">
          {NAV.map(item => (
            <a key={item.href} href={item.href} onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm mb-0.5 transition-colors ${
                pathname === item.href
                  ? "bg-gold-500/20 text-gold-500 font-semibold"
                  : "text-gray-400 hover:text-white hover:bg-navy-700"
              }`}>
              <item.Icon className="w-5 h-5 shrink-0" />{item.label}
            </a>
          ))}
        </nav>
        <div className="p-4 border-t border-navy-700 absolute bottom-0 w-full">
          <button onClick={async () => { await logout(); router.push("/login"); }}
            className="w-full py-2.5 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors">
            {t("common.signOut")}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-navy-800/95 backdrop-blur border-b border-navy-700 h-14 flex items-center px-4 gap-3">
        <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white">
          <Menu className="w-6 h-6" />
        </button>
        <Image src="/logo.png" alt="MAA" width={32} height={32} />
        <span className="text-white font-semibold text-sm truncate flex-1">{user?.name || "Instructor"}</span>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 pt-14 md:pt-0">
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </div>
  );
}
