"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LayoutDashboard, Users, ShieldCheck, ClipboardCheck, FileText, CreditCard, File, ScrollText, GraduationCap, Shield, BookOpen, DoorOpen, Plane, Award, Settings, ClipboardList, BarChart3, Megaphone, Menu, X, Monitor, Bell } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchUnread = () => {
      api.get("/notifications/unread-count/")
        .then((d: any) => setUnreadNotifCount(d.count ?? 0))
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (isLoading) return null;
  if (!isAuthenticated) { router.push("/login"); return null; }
  if (user && !["system_admin","admin_responsible","admin_agent","admissions_responsible"].includes(user.role)) {
    router.push("/login"); return null;
  }

  const closeSidebar = () => setSidebarOpen(false);

  const NAV = [
    { href: "/admin/dashboard", label: t("admin.dashboard", "Dashboard"), Icon: LayoutDashboard },
    { href: "/admin/users", label: t("admin.users", "Users"), Icon: Users },
    { href: "/admin/roles", label: t("admin.roles", "Roles"), Icon: ShieldCheck },
    { href: "/admin/applications", label: t("admin.applications", "Applications"), Icon: ClipboardCheck },
    { href: "/admin/communication", label: t("admin.communication", "Communication"), Icon: Megaphone },
    { href: "/admin/notifications", label: t("admin.notifications", "Notifications"), Icon: Bell, badge: unreadNotifCount },
    { href: "/admin/invoices", label: t("admin.invoices", "Invoices"), Icon: FileText },
    { href: "/admin/payments", label: t("admin.payments", "Payments"), Icon: CreditCard },
    { href: "/admin/documents", label: t("admin.documents", "Documents"), Icon: File },
    { href: "/admin/contracts", label: t("admin.contracts", "Contracts"), Icon: ScrollText },
    { href: "/admin/students", label: t("admin.students", "Students"), Icon: GraduationCap },
    { href: "/admin/reports", label: t("admin.reports", "Reports"), Icon: BarChart3 },
    { href: "/admin/instructors", label: t("admin.instructors", "Instructors"), Icon: GraduationCap },
    { href: "/admin/subjects", label: t("admin.subjects", "Subjects"), Icon: BookOpen },
    { href: "/admin/rooms", label: t("admin.rooms", "Classrooms"), Icon: DoorOpen },
    { href: "/admin/aircraft", label: t("admin.aircraft", "Aircraft"), Icon: Plane },
    { href: "/admin/simulators", label: t("admin.simulators", "Simulators"), Icon: Monitor },
    { href: "/admin/exams", label: t("admin.exams", "Exams"), Icon: ClipboardList },
    { href: "/admin/certificates", label: t("admin.certificates", "Certificates"), Icon: Award },
    { href: "/admin/audit-logs", label: t("admin.auditLogs", "Audit Logs"), Icon: ScrollText },
    { href: "/admin/settings", label: t("admin.settings", "Settings"), Icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-navy-900 flex">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={closeSidebar} />
      )}

      {/* Sidebar — hidden on mobile unless hamburger toggled, always visible lg+ */}
      <aside className={`w-56 bg-navy-800 border-r border-navy-700 min-h-screen shrink-0 fixed lg:sticky top-0 z-50 transition-transform duration-200 lg:translate-x-0 lg:block
        ${sidebarOpen ? "translate-x-0 block" : "-translate-x-full hidden"}
      `}>
        <div className="p-4 border-b border-navy-700">
          <Image src="/logo.png" alt="MAA" width={80} height={80} className="mx-auto"/>
          <p className="text-white font-bold text-center mt-2 text-sm">{t("layout.administrationPortal")}</p>
          <p className="text-xs text-gold-500 text-center truncate">{user?.name||user?.email}</p>
        </div>
        <nav className="p-2">
          {NAV.map(item => (
            <Link key={item.href} href={item.href} onClick={closeSidebar} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm mb-1 transition-colors ${pathname.startsWith(item.href)?"bg-gold-500/20 text-gold-500 font-medium":"text-gray-400 hover:text-white hover:bg-navy-700"}`}>
              <item.Icon className="w-4 h-4 shrink-0"/>
              <span className="flex-1">{item.label}</span>
              {"badge" in item && (item as any).badge > 0 && (
                <span className="bg-gold-500 text-navy-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight">
                  {(item as any).badge > 99 ? "99+" : (item as any).badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="p-2 border-t border-navy-700 mt-auto">
          <a href="/django-admin/" target="_blank" className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-navy-700 transition-colors">
            <Shield className="w-4 h-4 shrink-0"/>{t("admin.djangoAdmin")}
          </a>
        </div>
        <div className="p-4 border-t border-navy-700">
          <button onClick={async()=>{await logout();router.push("/login")}} className="w-full py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">{t("common.signOut")}</button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-navy-800/95 backdrop-blur border-b border-navy-700 h-14 flex items-center px-4 gap-3">
        <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white">
          <Menu className="w-6 h-6" />
        </button>
        <Image src="/logo.png" alt="MAA" width={32} height={32} />
        <span className="text-white font-semibold text-sm truncate flex-1">{user?.name || "Admin"}</span>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 pt-14 lg:pt-0"><ErrorBoundary>{children}</ErrorBoundary></div>
    </div>
  );
}
