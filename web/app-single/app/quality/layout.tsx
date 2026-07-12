"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { Search, AlertTriangle, ClipboardList, ShieldAlert, Shield, FileText } from "lucide-react";

const NAV = [
  { href: "/quality/audits", label: "Audits", Icon: Search },
  { href: "/quality/ncrs", label: "Non-Conformities", Icon: AlertTriangle },
  { href: "/quality/capas", label: "CAPAs", Icon: ClipboardList },
  { href: "/quality/risks", label: "Risk Assessments", Icon: ShieldAlert },
  { href: "/quality/safety", label: "Safety Events", Icon: Shield },
  { href: "/quality/documents", label: "Documents", Icon: FileText },
];

export default function QualityLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  if (isLoading) return null;
  if (!isAuthenticated) { router.push("/login"); return null; }

  return (
    <div className="min-h-screen bg-navy-900 flex">
      <aside className="w-56 bg-navy-800 border-r border-navy-700 min-h-screen hidden lg:block shrink-0">
        <div className="p-4 border-b border-navy-700">
          <Image src="/mast.svg" alt="MAA" width={80} height={80} className="rounded-lg mx-auto"/>
          <p className="text-white font-bold text-center mt-2 text-sm">Quality & Safety</p>
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
          <button onClick={async()=>{await logout();router.push("/login")}} className="w-full py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10">Logout</button>
        </div>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
