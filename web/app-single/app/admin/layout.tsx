"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/use-translation";
import { useUnreadCounts } from "@/lib/use-unread-counts";
import {
  LayoutDashboard, Users, GraduationCap, ShieldCheck, ClipboardCheck,
  BookOpen, DoorOpen, Plane, Monitor, ClipboardList, FileText,
  CreditCard, ScrollText, Megaphone, Bell, BarChart3, File, Settings,
  Menu, Search, ChevronDown, ChevronRight, Award, X, FolderOpen,
  Shield, HelpCircle, Map, Wrench, AlertTriangle, Clock, Calendar, MessageSquare
} from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";

interface NavItem {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  id: string;
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  badgeFn?: () => number;
}

function getStored(id: string): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(`sidebar-${id}`);
  return v === null ? true : v === "true";
}

function setStored(id: string, open: boolean) {
  localStorage.setItem(`sidebar-${id}`, String(open));
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const unread = useUnreadCounts({ includeMessages: true, enabled: isAuthenticated });

  const NOTIFICATION_BADGE = () => unread.notifications;
  const MESSAGES_BADGE = () => unread.messages;
  const APPLICATIONS_BADGE = () => unread.applicationsPending;

  const SECTIONS: NavSection[] = useMemo(() => [
    {
      id: "dashboard",
      title: t("admin.dashboard", "Dashboard"),
      Icon: LayoutDashboard,
      items: [
        { href: "/admin/dashboard", label: t("admin.dashboard", "Dashboard"), Icon: LayoutDashboard },
      ],
    },
    {
      id: "administration",
      title: t("admin.administration", "Administration"),
      Icon: Users,
      badgeFn: APPLICATIONS_BADGE,
      items: [
        { href: "/admin/users", label: t("admin.users", "Users"), Icon: Users },
        { href: "/admin/roles", label: t("admin.roles", "Roles"), Icon: ShieldCheck },
        { href: "/admin/students", label: t("admin.students", "Students"), Icon: GraduationCap },
        { href: "/admin/instructors", label: t("admin.instructors", "Instructors"), Icon: GraduationCap },
        { href: "/admin/applications", label: t("admin.applications", "Applications"), Icon: ClipboardCheck },
        { href: "/admin/certificates", label: t("admin.certificates", "Certificates"), Icon: Award },
        { href: "/admin/admin-profiles", label: t("admin.adminProfiles", "Admin Profiles"), Icon: Users },
        { href: "/admin/medical-certificates", label: t("admin.medicalCertificates", "Medical Certs"), Icon: Award },
      ],
    },
    {
      id: "curriculum",
      title: t("admin.curriculum", "Curriculum"),
      Icon: BookOpen,
      items: [
        { href: "/admin/curriculum", label: t("admin.curriculum", "Curriculum"), Icon: BookOpen },
      ],
    },
    {
      id: "courses-attendance",
      title: t("admin.coursesAttendance", "Courses & Attendance"),
      Icon: GraduationCap,
      items: [
        { href: "/admin/courses-attendance", label: t("admin.coursesAttendance", "Courses & Attendance"), Icon: GraduationCap },
      ],
    },
    {
      id: "assessments",
      title: t("admin.assessments", "Assessments"),
      Icon: ClipboardList,
      items: [
        { href: "/admin/assessments", label: t("admin.assessments", "Assessments"), Icon: ClipboardList },
      ],
    },
    {
      id: "evaluations",
      title: t("admin.evaluations", "Evaluations"),
      Icon: Award,
      items: [
        { href: "/admin/evaluations", label: t("admin.evaluations", "Evaluations"), Icon: Award },
      ],
    },
    {
      id: "facilities",
      title: t("admin.facilities", "Facilities"),
      Icon: DoorOpen,
      items: [
        { href: "/admin/facilities", label: t("admin.facilities", "Facilities"), Icon: DoorOpen },
      ],
    },
    {
      id: "flight-ops",
      title: t("admin.flightOps", "Flight Operations"),
      Icon: Plane,
      items: [
        { href: "/admin/flight-ops", label: t("admin.flightOps", "Flight Operations"), Icon: Plane },
      ],
    },
    {
      id: "flight-resources",
      title: t("admin.flightResources", "Flight Resources"),
      Icon: Wrench,
      items: [
        { href: "/admin/flight-resources", label: t("admin.flightResources", "Flight Resources"), Icon: Wrench },
      ],
    },
    {
      id: "quality-safety",
      title: t("admin.qualitySafety", "Quality & Safety"),
      Icon: Shield,
      items: [
        { href: "/admin/audits", label: t("admin.audits", "Audits"), Icon: ClipboardCheck },
        { href: "/admin/non-conformities", label: t("admin.nonConformities", "NCRs"), Icon: AlertTriangle },
        { href: "/admin/capas", label: t("admin.capas", "CAPAs"), Icon: Shield },
        { href: "/admin/risk-assessments", label: t("admin.riskAssessments", "Risk Assessments"), Icon: AlertTriangle },
        { href: "/admin/safety-events", label: t("admin.safetyEvents", "Safety Events"), Icon: Bell },
        { href: "/admin/quality-documents", label: t("admin.qualityDocuments", "Quality Docs"), Icon: File },
      ],
    },
    {
      id: "finance",
      title: t("admin.finance", "Finance"),
      Icon: CreditCard,
      items: [
        { href: "/admin/invoices", label: t("admin.invoices", "Invoices"), Icon: FileText },
        { href: "/admin/payments", label: t("admin.payments", "Payments"), Icon: CreditCard },
        { href: "/admin/contracts", label: t("admin.contracts", "Contracts"), Icon: ScrollText },
      ],
    },
    {
      id: "communication",
      title: t("admin.communication", "Communication"),
      Icon: Megaphone,
      items: [
        { href: "/admin/communication", label: t("admin.communication", "Communication"), Icon: Megaphone },
        { href: "/admin/notifications", label: t("admin.notifications", "Notifications"), Icon: Bell },
        { href: "/admin/messages", label: t("admin.messages", "Messages"), Icon: MessageSquare },
      ],
      badgeFn: NOTIFICATION_BADGE,
    },
    {
      id: "system",
      title: t("admin.system", "System"),
      Icon: Settings,
      items: [
        { href: "/admin/reports", label: t("admin.reports", "Reports"), Icon: BarChart3 },
        { href: "/admin/documents", label: t("admin.documents", "Documents"), Icon: File },
        { href: "/admin/audit-logs", label: t("admin.auditLogs", "Audit Logs"), Icon: ScrollText },
        { href: "/admin/settings", label: t("admin.settings", "Settings"), Icon: Settings },
      ],
    },
  ], [t]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    SECTIONS.forEach(s => { init[s.id] = getStored(s.id); });
    return init;
  });

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = { ...prev, [id]: !prev[id] };
      setStored(id, next[id]);
      return next;
    });
  };

  const filteredSections = useMemo(() => {
    let sections = SECTIONS;
    if (user && user.role === "training_admin") {
      const ADMIN_KEEP = new Set([
        "/admin/students", "/admin/instructors", "/admin/applications",
        "/admin/certificates", "/admin/medical-certificates",
      ]);
      const SYSTEM_KEEP = new Set(["/admin/reports", "/admin/documents"]);
      const HIDE_SECTIONS = new Set(["quality-safety", "finance"]);
      sections = sections
        .filter(s => !HIDE_SECTIONS.has(s.id))
        .map(s => {
          if (s.id === "administration") return { ...s, items: s.items.filter(i => ADMIN_KEEP.has(i.href)) };
          if (s.id === "system") return { ...s, items: s.items.filter(i => SYSTEM_KEEP.has(i.href)) };
          return s;
        });
    }
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections
      .map(s => ({
        ...s,
        items: s.items.filter(i => i.label.toLowerCase().includes(q)),
      }))
      .filter(s => s.items.length > 0);
  }, [SECTIONS, search, user]);

  const isActive = (href: string) => pathname.startsWith(href);

  useEffect(() => {
    const activeSection = SECTIONS.find(s => s.items.some(i => pathname.startsWith(i.href)));
    if (activeSection) {
      setOpenSections(prev => {
        if (prev[activeSection.id]) return prev;
        const next = { ...prev, [activeSection.id]: true };
        setStored(activeSection.id, true);
        return next;
      });
    }
  }, [pathname, SECTIONS]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.push("/login"); return; }
    if (user && !["system_admin", "admin_responsible", "admin_agent", "admissions_responsible", "training_admin"].includes(user.role)) {
      router.push("/login"); return;
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) return null;

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-navy-900 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={closeSidebar} />
      )}

      <aside className={`w-56 bg-navy-800 border-r border-navy-700 min-h-screen shrink-0 fixed lg:sticky top-0 z-50 transition-transform duration-200 lg:translate-x-0 lg:flex lg:flex-col
        ${sidebarOpen ? "translate-x-0 block" : "-translate-x-full hidden"}
      `}>
        <div className="p-4 border-b border-navy-700 shrink-0">
          <Image src="/logo.png" alt="MAA" width={80} height={80} className="mx-auto" />
          <p className="text-white font-bold text-center mt-2 text-sm">{t("layout.administrationPortal")}</p>
          <p className="text-xs text-gold-500 text-center truncate">{user?.name || user?.email}</p>
        </div>

        <div className="px-3 pt-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("admin.searchNav", "Search...")}
              className="w-full bg-navy-700 border border-navy-600 rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gold-500/50 transition-colors"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-navy-600 scrollbar-track-transparent">
          {filteredSections.map(section => {
            const isOpen = openSections[section.id] ?? true;
            const Icon = section.Icon;
            const sectionBadge = section.badgeFn?.() ?? 0;
            return (
              <div key={section.id} className="mb-1">
                <button
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={isOpen}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                    sectionBadge > 0
                      ? "text-gold-400"
                      : "text-gray-500 hover:text-gray-300 hover:bg-navy-700"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 text-left">{section.title}</span>
                  {sectionBadge > 0 && (
                    <span className="bg-gold-500 text-navy-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight">
                      {sectionBadge > 99 ? "99+" : sectionBadge}
                    </span>
                  )}
                  {isOpen ? (
                    <ChevronDown className="w-3 h-3 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-gray-600" />
                  )}
                </button>
                {isOpen && (
                  <div className="ml-1">
                    {section.items.map(item => {
                      const active = isActive(item.href);
                      const ItemIcon = item.Icon;
                      const showBadge = item.href === "/admin/notifications" && section.badgeFn ? sectionBadge : item.href === "/admin/messages" ? unread.messages : item.href === "/admin/applications" ? unread.applicationsPending : 0;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={closeSidebar}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                            active
                              ? "bg-gold-500/20 text-gold-500 font-medium"
                              : "text-gray-400 hover:text-white hover:bg-navy-700"
                          }`}
                        >
                          <ItemIcon className="w-4 h-4 shrink-0" />
                          <span className="flex-1 truncate">{item.label}</span>
                          {showBadge > 0 && (
                            <span className="bg-gold-500 text-navy-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight">
                              {showBadge > 99 ? "99+" : showBadge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {user?.role !== "training_admin" && (
          <div className="p-2 border-t border-navy-700 shrink-0">
            <a
              href="/django-admin/"
              target="_blank"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-navy-700 transition-colors"
            >
              <Shield className="w-4 h-4 shrink-0" />
              {t("admin.djangoAdmin", "Django Admin")}
            </a>
          </div>
        )}
        <div className="p-4 border-t border-navy-700 shrink-0">
          <button
            onClick={async () => { await logout(); router.push("/login"); }}
            className="w-full py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10"
          >
            {t("common.signOut")}
          </button>
        </div>
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-navy-800/95 backdrop-blur border-b border-navy-700 h-14 flex items-center gap-3" style={{ padding: "env(safe-area-inset-top) 16px 0" }}>
        <button onClick={() => setSidebarOpen(true)} aria-label="Open navigation menu" className="flex items-center justify-center w-[50px] h-[50px] -ml-1 text-gray-400 active:text-white rounded-lg transition-colors">
          <Menu className="w-6 h-6" />
        </button>
        <span className="text-white font-semibold text-sm truncate flex-1">{user?.name || "Admin"}</span>
      </div>

      <div className="flex-1 min-w-0 pt-14 lg:pt-0">
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </div>
  );
}