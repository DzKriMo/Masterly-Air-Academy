"use client";

import { useState, useRef, useEffect } from "react";

const langs = [
  { code: "en", label: "English", short: "EN" },
  { code: "fr", label: "Francais", short: "FR" },
  { code: "ar", label: "العربية", short: "AR" },
];

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function readCookieLocale(): string {
    try {
      const m = document.cookie.match(/(?:^|; )locale=([^;]*)/);
      if (m && (m[1] === "fr" || m[1] === "ar")) return m[1];
    } catch {}
    return "en";
  }

  const [currentLocale, setCurrentLocale] = useState("en");

  useEffect(() => {
    setCurrentLocale(readCookieLocale());
  }, []);

  const active = langs.find(l => l.code === currentLocale) || langs[0];

  const switchTo = (code: string) => {
    document.cookie = `locale=${code};path=/;max-age=${365 * 24 * 60 * 60}`;
    setCurrentLocale(code);
    window.location.reload();
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-navy-700 transition-colors border border-navy-600">
        {active.short}
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-1 bg-navy-800 border border-navy-700 rounded-lg shadow-xl py-1 z-50 min-w-[120px]">
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
