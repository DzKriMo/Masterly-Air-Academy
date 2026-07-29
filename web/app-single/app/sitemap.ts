import type { MetadataRoute } from "next";

const BASE_URL = "https://185.185.80.188.nip.io";
const locales = ["en", "fr", "ar"] as const;

const routes = ["", "/login", "/verify-certificate"];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const route of routes) {
      entries.push({
        url: `${BASE_URL}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: route === "" ? 1.0 : 0.5,
      });
    }
  }

  return entries;
}
