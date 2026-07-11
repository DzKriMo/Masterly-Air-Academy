"use client";

import { useEffect, useState } from "react";

const translations: Record<string, any> = {};

function getCookie(name: string): string {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "en";
}

export function useTranslation() {
  const [locale, setLocale] = useState("en");
  const [t, setT] = useState<Record<string, any>>({});

  useEffect(() => {
    const loc = getCookie("locale") || "en";
    setLocale(loc);
    if (!translations[loc]) {
      translations[loc] = require(`../../shared/locales/${loc}/common.json`);
    }
    setT(translations[loc] || {});
  }, []);

  const switchTo = (code: string) => {
    document.cookie = `locale=${code};path=/;max-age=${365 * 24 * 60 * 60}`;
    setLocale(code);
    if (!translations[code]) {
      translations[code] = require(`../../shared/locales/${code}/common.json`);
    }
    setT(translations[code] || {});
  };

  return { t, locale, switchTo };
}
