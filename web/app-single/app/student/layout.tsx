"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LayoutDashboard, ClipboardCheck, Plane, BookOpen, Calendar, Award, MessageSquare, User, File, CreditCard, BarChart, Bell, Clock, Menu, X, Heart } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchUnread = () => {
      api.get("/notifications/unread-count/")
        .then((d: any) => setUnreadNotifCount(d.count ?? 0))
        .catch(() => {});
      api.get("/messages/unread-count/")
        .then((d: any) => setUnreadMsgCount(d.count ?? 0))
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const NAV = [
    { href: "/student/dashboard", label: t("student.dashboard"), Icon: LayoutDashboard },
    { href: "/student/exams", label: t("student.exams"), Icon: ClipboardCheck },
    { href: "/student/flights", label: t("student.flightLog"), Icon: Plane },
    { href: "/student/courses", label: t("student.myCourses"), Icon: BookOpen },
    { href: "/student/schedule", label: t("student.schedule"), Icon: Calendar },
    { href: "/student/documents", label: t("student.documents", "Documents"), Icon: File },
    { href: "/student/payments", label: t("student.payments", "Payments"), Icon: CreditCard },
    { href: "/student/results", label: t("student.results", "Results"), Icon: BarChart },
    { href: "/student/history", label: t("student.history", "History"), Icon: Clock },
    { href: "/student/medical", label: t("student.medical", "Medical"), Icon: Heart },
    { href: "/student/notifications", label: t("student.notifications", "Notifications"), Icon: Bell, badge: unreadNotifCount },
    { href: "/student/certificates", label: t("student.certificates"), Icon: Award },
    { href: "/student/messages", label: t("student.messages"), Icon: MessageSquare, badge: unreadMsgCount },
    { href: "/student/profile", label: t("student.profile"), Icon: User },
  ];

  if (isLoading) return null;
  if (pathname === "/student/login") return <>{children}</>;
  if (!isAuthenticated) { router.push("/student/login"); return null; }
  if (user && !["student","candidate","graduate"].includes(user.role)) { router.push("/login"); return null; }

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-navy-900 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={closeSidebar} />
      )}

      {/* Sidebar — hidden on mobile unless hamburger toggled, always visible md+ */}
      <aside className={`w-64 bg-navy-800 border-r border-navy-700 min-h-screen shrink-0 fixed md:sticky top-0 z-50 flex flex-col transition-transform duration-200 md:translate-x-0 md:block
        ${sidebarOpen ? "translate-x-0 block" : "-translate-x-full hidden"}
      `}>
        <div className="p-5 border-b border-navy-700 text-center">
          <Image src="/logo.png" alt="MAA" width={100} height={100} className="mx-auto" />
          <p className="text-white font-bold mt-3 text-base">{t("layout.studentPortal")}</p>
          <p className="text-xs text-gold-500 truncate mt-0.5">{user?.name || user?.email}</p>
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
          <button onClick={async () => { await logout(); router.push("/student/login"); }}
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
        <span className="text-white font-semibold text-sm truncate flex-1">{user?.name || "Student"}</span>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 pt-14 md:pt-0">
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </div>
  );
}
