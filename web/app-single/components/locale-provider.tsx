"use client";

import { createContext, useContext, useEffect, useState } from "react";

function getCookie(name: string): string {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "en";
}

function localeFromPath(): string {
  if (typeof window === "undefined") return "en";
  const seg = window.location.pathname.split("/").filter(Boolean)[0];
  if (seg === "fr" || seg === "ar") return seg;
  return "en";
}

const LocaleCtx = createContext("en");

export function useLocale() {
  return useContext(LocaleCtx);
}

export function LocaleProvider({ children, initialLocale }: { children: React.ReactNode; initialLocale?: string }) {
  const [locale, setLocale] = useState(initialLocale || getCookie("locale") || localeFromPath());

  useEffect(() => {
    const fromCookie = getCookie("locale");
    const fromPath = localeFromPath();
    const resolved = fromCookie !== "en" ? fromCookie : fromPath;
    if (resolved !== locale) setLocale(resolved);
    const syncFromCookie = () => {
      const current = getCookie("locale");
      setLocale(prev => prev !== current ? current : prev);
    };
    window.addEventListener("localechange", syncFromCookie);
    return () => window.removeEventListener("localechange", syncFromCookie);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  return <LocaleCtx.Provider value={locale}>{children}</LocaleCtx.Provider>;
}
