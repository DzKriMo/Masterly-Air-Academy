"use client";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { LayoutDashboard, ClipboardCheck, Plane, BookOpen, Calendar, Award, MessageSquare, User } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();

  const NAV = [
    { href: "/student/dashboard", label: t("student.dashboard"), Icon: LayoutDashboard },
    { href: "/student/exams", label: t("student.exams"), Icon: ClipboardCheck },
    { href: "/student/flights", label: t("student.flightLog"), Icon: Plane },
    { href: "/student/courses", label: t("student.myCourses"), Icon: BookOpen },
    { href: "/student/schedule", label: t("student.schedule"), Icon: Calendar },
    { href: "/student/certificates", label: t("student.certificates"), Icon: Award },
    { href: "/student/messages", label: t("student.messages"), Icon: MessageSquare },
    { href: "/student/profile", label: t("student.profile"), Icon: User },
  ];

  if (isLoading) return null;
  // Don't guard the login page itself
  if (pathname === "/student/login") return <>{children}</>;
  if (!isAuthenticated) { router.push("/student/login"); return null; }
  if (user && !["student","candidate","graduate"].includes(user.role)) { router.push("/login"); return null; }

  return (
    <div className="min-h-screen bg-navy-900 flex">
      <aside className="w-56 bg-navy-800 border-r border-navy-700 min-h-screen hidden lg:block shrink-0">
        <div className="p-4 border-b border-navy-700">
          <Image src="/logo.png" alt="MAA" width={80} height={80} className="mx-auto"/>
          <p className="text-white font-bold text-center mt-2 text-sm">{t("layout.studentPortal")}</p>
          <p className="text-xs text-gold-500 text-center truncate">{user?.name||user?.email}</p>
        </div>
        <nav className="p-2">
          {NAV.map(item => (
            <a key={item.href} href={item.href} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm mb-1 transition-colors ${pathname===item.href?"bg-gold-500/20 text-gold-500 font-medium":"text-gray-400 hover:text-white hover:bg-navy-700"}`}>
              <item.Icon className="w-4 h-4 shrink-0"/>{item.label}
            </a>
          ))}
        </nav>
        <div className="p-4 border-t border-navy-700">
          <button onClick={async()=>{await logout();router.push("/student/login")}} className="w-full py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">{t("common.signOut")}</button>
        </div>
      </aside>
      <div className="flex-1 min-w-0"><ErrorBoundary>{children}</ErrorBoundary></div>
    </div>
  );
}
