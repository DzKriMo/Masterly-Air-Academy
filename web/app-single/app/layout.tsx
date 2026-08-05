import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/providers";
import { LocaleProvider } from "@/components/locale-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { ErrorBoundary } from "@/components/error-boundary";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://localhost";

const seoByLang: Record<string, { title: string; description: string; keywords: string }> = {
  en: {
    title: "Masterly Air Academy | ATO Approved Flight Training in Algeria",
    description: "Masterly Air Academy is an ATO-approved flight school in Algeria offering PPL, CPL, IR, MEP & MCC pilot training.",
    keywords: "flight school Algeria, pilot training Algeria, aviation academy Algeria, ATO Algeria, PPL license Algeria, CPL license Algeria, private pilot license, commercial pilot license, instrument rating Algeria, multi-engine training, MCC course, Masterly Air Academy, flying school Algeria, pilot career, aviation training, flight training Algeria",
  },
  fr: {
    title: "Masterly Air Academy | ATO Agree Formation au Pilotage en Algerie",
    description: "Masterly Air Academy est un ATO agree en Algerie proposant des formations PPL, CPL, IR, MEP & MCC.",
    keywords: "ecole de pilotage Algerie, formation pilote Algerie, ATO Algerie, licence PPL Algerie, licence CPL Algerie, licence pilote prive, licence pilote professionnel, qualification de vol aux instruments, formation multimoteur, cours MCC, Masterly Air Academy",
  },
  ar: {
    title: "أكاديمية ماسترلي للطيران | تدريب طيارين معتمد في الجزائر",
    description: "أكاديمية ماسترلي للطيران هي منظمة تدريب معتمدة (ATO) في الجزائر تقدم برامج PPL و CPL و IR و MEP و MCC.",
    keywords: "مدرسة طيران الجزائر, تدريب طيارين الجزائر, أكاديمية طيران الجزائر, ATO الجزائر, رخصة طيار خاص الجزائر, رخصة طيار تجاري الجزائر, رخصة طيار, تدريب طيران الجزائر, دورة MCC, أكاديمية ماسترلي للطيران",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value || "en";
  const seo = seoByLang[locale] || seoByLang.en;

  return {
    title: { default: seo.title, template: `%s | Masterly Air Academy` },
    description: seo.description,
    manifest: "/manifest.json",
    icons: { icon: "/logo.png", apple: "/logo.png" },
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Masterly Air Academy" },
    other: { "mobile-web-app-capable": "yes" },
    keywords: seo.keywords.split(", "),
    robots: { index: true, follow: true },
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical: `${BASE_URL}/${locale}`,
      languages: {
        en: `${BASE_URL}/en`,
        fr: `${BASE_URL}/fr`,
        ar: `${BASE_URL}/ar`,
        "x-default": `${BASE_URL}/en`,
      },
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      type: "website",
      url: BASE_URL,
      siteName: "Masterly Air Academy",
      locale: locale === "ar" ? "ar_DZ" : locale === "fr" ? "fr_DZ" : "en_US",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Masterly Air Academy" }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: ["/og-image.png"],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover", themeColor: "#1e40af",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const serverLocale = cookieStore.get("locale")?.value || "en";

  return (
    <html lang="en" className="dark">
      <body className="bg-navy-900 text-white min-h-screen antialiased">
        <LocaleProvider initialLocale={serverLocale}>
          <Providers>
            <div className="fixed bottom-6 right-6 z-[10000] flex items-center gap-3"><NotificationBell /><LanguageSwitcher /></div>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </Providers>
        </LocaleProvider>
        <Script id="register-sw" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');`}
        </Script>
        <Script id="schema-org" type="application/ld+json" strategy="beforeInteractive">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Masterly Air Academy",
            url: BASE_URL,
            logo: `${BASE_URL}/logo.png`,
            description: "Approved Training Organization (ATO) providing professional flight training in Algeria. PPL, CPL, IR, MEP, and MCC programs.",
            address: { "@type": "PostalAddress", addressCountry: "DZ" },
            knowsAbout: ["Aviation Training", "Pilot License", "Flight School", "ATO"],
          })}
        </Script>
      </body>
    </html>
  );
}
