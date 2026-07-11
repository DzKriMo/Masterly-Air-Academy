"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

const langs = [
  { code: "en", label: "English", short: "EN" },
  { code: "fr", label: "Francais", short: "FR" },
  { code: "ar", label: "العربية", short: "AR" },
];

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const segments = pathname.split("/").filter(Boolean);
  const currentLocale = langs.find(l => l.code === segments[0]) ? segments[0] : "en";
  const active = langs.find(l => l.code === currentLocale) || langs[0];

  const switchTo = (code: string) => {
    document.cookie = `locale=${code};path=/;max-age=${365 * 24 * 60 * 60}`;
    window.location.reload();
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-navy-700 transition-colors border border-navy-600">
        {active.short}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-navy-800 border border-navy-700 rounded-lg shadow-xl py-1 z-50 min-w-[120px]">
          {langs.map(l => (
            <button key={l.code} onClick={() => switchTo(l.code)}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-navy-700 transition-colors ${l.code === currentLocale ? "text-gold-500 font-medium" : "text-gray-400"}`}>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
