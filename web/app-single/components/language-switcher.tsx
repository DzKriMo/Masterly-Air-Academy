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

  const current = pathname.split("/")[1] || "en";
  const active = langs.find(l => l.code === current) || langs[0];

  const switchTo = (code: string) => {
    const segments = pathname.split("/").filter(Boolean);
    if (["en", "fr", "ar"].includes(segments[0])) segments[0] = code; else segments.unshift(code);
    router.push("/" + segments.join("/"));
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-navy-700 transition-colors">
        {active.short}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-navy-800 border border-navy-700 rounded-lg shadow-xl py-1 z-50">
          {langs.map(l => (
            <button key={l.code} onClick={() => switchTo(l.code)}
              className={`block w-full text-left px-4 py-2 text-xs hover:bg-navy-700 transition-colors ${l.code === current ? "text-gold-500 font-medium" : "text-gray-400"}`}>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
