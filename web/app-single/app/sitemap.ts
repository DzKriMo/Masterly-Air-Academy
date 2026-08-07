import type { MetadataRoute } from "next";
import { SITE_URL as BASE_URL } from "@/lib/site-url";

const locales = ["en", "fr", "ar"] as const;

const routes: { path: string; priority: number; changeFreq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "", priority: 1.0, changeFreq: "weekly" },
  { path: "/login", priority: 0.7, changeFreq: "monthly" },
  { path: "/verify-certificate", priority: 0.5, changeFreq: "monthly" },
];

const LAST_MODIFIED = new Date("2026-01-01T00:00:00Z");

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const route of routes) {
      entries.push({
        url: `${BASE_URL}/${locale}${route.path}`,
        lastModified: LAST_MODIFIED,
        changeFrequency: route.changeFreq,
        priority: route.priority,
      });
    }
  }

  return entries;
}
