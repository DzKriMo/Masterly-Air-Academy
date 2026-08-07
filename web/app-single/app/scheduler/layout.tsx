"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { useUnreadCounts } from "@/lib/use-unread-counts";
import {
  LayoutDashboard, CalendarDays, PlaneTakeoff, Users, Menu, Bell, Mail, FolderOpen,
} from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";

export default function SchedulerLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const unread = useUnreadCounts({ includeMessages: true, enabled: isAuthenticated });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const NAV = [
    { href: "/scheduler/dashboard", label: t("scheduler.dashboard"), Icon: LayoutDashboard },
    { href: "/scheduler/availability", label: t("scheduler.availability"), Icon: Users },
    { href: "/scheduler/bookings", label: t("scheduler.bookings"), Icon: CalendarDays },
    { href: "/scheduler/aircraft", label: t("scheduler.aircraft"), Icon: PlaneTakeoff },
    { href: "/scheduler/library", label: t("scheduler.library", "Library"), Icon: FolderOpen },
    { href: "/scheduler/notifications", label: t("scheduler.notifications", "Notifications"), Icon: Bell, badge: unread.notifications },
    { href: "/scheduler/messages", label: t("scheduler.messages", "Messages"), Icon: Mail, badge: unread.messages },
  ];

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.push("/login"); return; }
    if (user && !["scheduler", "system_admin"].includes(user.role)) { router.push("/dashboard"); return; }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) return null;

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-navy-900 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={closeSidebar} />
      )}
      <aside className={`w-64 bg-navy-800 border-r border-navy-700 h-dvh shrink-0 fixed md:sticky flex flex-col top-0 z-50 transition-transform duration-200 md:translate-x-0 md:block ${sidebarOpen ? "translate-x-0 block" : "-translate-x-full hidden"}`}>
        <div className="p-5 border-b border-navy-700 text-center">
          <div className="flex items-center justify-between md:justify-center">
            <Image src="/logo.png" alt="MAA" width={100} height={100} className="md:mx-auto" />
            <button onClick={closeSidebar} aria-label="Close navigation"
              className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-navy-700 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-white font-bold mt-3 text-base">{t("layout.schedulerPortal", "Scheduler Portal")}</p>
          <p className="text-xs text-gray-500 truncate mt-1.5">{user?.name || user?.email}</p>
        </div>
        <nav className="p-3 flex-1 overflow-y-auto">
          {NAV.map(item => (
            <a key={item.href} href={item.href} onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm mb-0.5 transition-colors ${pathname === item.href ? "bg-gold-500/20 text-gold-500 font-semibold" : "text-gray-400 hover:text-white hover:bg-navy-700"}`}>
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
      <div className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-40 flex items-center justify-between bg-navy-800 border-b border-navy-700 px-4 py-3">
          <button onClick={() => setSidebarOpen(true)} aria-label="Open navigation"
            className="p-2 -ml-2 text-gray-400 hover:text-white hover:bg-navy-700 rounded-lg transition-colors">
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-sm font-semibold text-white">{t("layout.schedulerPortal", "Scheduler Portal")}</span>
          <span className="w-8" />
        </div>
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </div>
  );
}
