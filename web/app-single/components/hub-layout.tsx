"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import type { LucideIcon } from "lucide-react";

export interface HubTab {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: number;
}

function tabFromUrl(url: string | undefined, tabs: HubTab[], fallback: string): string {
  if (!url) return fallback;
  try {
    const q = new URL(url, "http://x").searchParams.get("tab");
    if (q && tabs.some((t) => t.id === q)) return q;
  } catch {}
  return fallback;
}

export function HubLayout({
  title,
  tabs,
  defaultTab,
  actions,
  backHref = "/admin/dashboard",
  backLabel = "Back to Dashboard",
  children,
}: {
  title: string;
  tabs: HubTab[];
  defaultTab: string;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  children: (active: string) => React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState<string>(defaultTab);

  useEffect(() => {
    const apply = () => setActive(tabFromUrl(window.location.href, tabs, defaultTab));
    apply();
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, [tabs, defaultTab]);

  const select = useCallback(
    (id: string) => {
      const sp = new URLSearchParams(window.location.search);
      sp.set("tab", id);
      router.replace(`${pathname}?${sp.toString()}`);
      setActive(id);
    },
    [pathname, router]
  );

  return (
    <div className="min-h-screen bg-navy-900">
      <PageHeader
        title={title}
        backHref={backHref}
        backLabel={backLabel}
        actions={actions}
      />

      <div className="border-b border-navy-700 bg-navy-800/50 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto scrollbar-thin scrollbar-thumb-navy-600">
          <div className="flex gap-1 py-2 min-w-max">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = tab.id === active;
              return (
                <button
                  key={tab.id}
                  onClick={() => select(tab.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-gold-500/20 text-gold-500"
                      : "text-gray-400 hover:text-white hover:bg-navy-700"
                  }`}
                >
                  {TabIcon && <TabIcon className="w-4 h-4 shrink-0" />}
                  <span className="truncate">{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="bg-gold-500 text-navy-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight">
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children(active)}</main>
    </div>
  );
}
