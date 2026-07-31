"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { api } from "@/lib/api";
import { LayoutDashboard, Bell, Menu, X } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";

export default function DirectorLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const closeSidebar = () => setSidebarOpen(false);

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

  const NAV = [
    { href: "/director/dashboard", label: t("director.dashboard"), Icon: LayoutDashboard },
    { href: "/director/notifications", label: "Notifications", Icon: Bell, badge: unreadNotifCount },
  ];

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.push("/login"); return; }
    if (user && !["director_general", "system_admin"].includes(user.role)) { router.push("/login"); return; }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => { closeSidebar(); }, [pathname]);

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-navy-900 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={closeSidebar} />
      )}

      {/* Sidebar — hidden on mobile unless hamburger toggled, always visible lg+ */}
      <aside className={`w-56 bg-navy-800 border-r border-navy-700 min-h-screen shrink-0 fixed lg:sticky top-0 z-50 flex flex-col transition-transform duration-200 lg:translate-x-0 lg:block
        ${sidebarOpen ? "translate-x-0 block" : "-translate-x-full hidden"}
      `}>
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-navy-700">
          <p className="text-white font-bold text-sm">{t("layout.directorPortal")}</p>
          <button onClick={closeSidebar} className="text-gray-300 hover:text-white transition-colors" aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 border-b border-navy-700 hidden lg:block">
          <Image src="/logo.png" alt="MAA" width={80} height={80} className="mx-auto"/>
          <p className="text-white font-bold text-center mt-2 text-sm">{t("layout.directorPortal")}</p>
          <p className="text-xs text-gold-500 text-center truncate">{user?.name||user?.email}</p>
        </div>
        <nav className="p-2 flex-1 overflow-y-auto">
          {NAV.map(item => (
            <a key={item.href} href={item.href} onClick={closeSidebar} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm mb-1 transition-colors ${pathname===item.href?"bg-gold-500/20 text-gold-500 font-medium":"text-gray-400 hover:text-white hover:bg-navy-700"}`}>
              <item.Icon className="w-4 h-4 shrink-0"/>
              <span className="flex-1">{item.label}</span>
              {"badge" in item && (item as any).badge > 0 && (
                <span className="bg-gold-500 text-navy-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight">
                  {(item as any).badge > 99 ? "99+" : (item as any).badge}
                </span>
              )}
            </a>
          ))}
        </nav>
        <div className="p-4 border-t border-navy-700">
          <button onClick={async()=>{await logout();router.push("/login")}} className="w-full py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">{t("common.signOut")}</button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-navy-800/95 backdrop-blur border-b border-navy-700 h-14 flex items-center gap-3" style={{ padding: "env(safe-area-inset-top) 16px 0" }}>
        <button onClick={() => setSidebarOpen(true)} className="flex items-center justify-center w-[50px] h-[50px] -ml-1 text-gray-400 active:text-white rounded-lg transition-colors">
          <Menu className="w-6 h-6" />
        </button>
        <span className="text-white font-semibold text-sm truncate flex-1">{user?.name || user?.email || "Director"}</span>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 pt-14 lg:pt-0"><ErrorBoundary>{children}</ErrorBoundary></div>
    </div>
  );
}
