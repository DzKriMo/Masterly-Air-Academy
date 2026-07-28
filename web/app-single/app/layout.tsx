import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/providers";
import { LocaleProvider } from "@/components/locale-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { ErrorBoundary } from "@/components/error-boundary";

const BASE_URL = "https://185.185.80.188.nip.io";

export const metadata: Metadata = {
  title: { default: "Masterly Air Academy", template: "%s | Masterly Air Academy" },
  description: "Approved Training Organization (ATO) in Algeria — Private Pilot License, Commercial Pilot License, Instrument Rating, and professional aviation training programs.",
  manifest: "/manifest.json",
  icons: { icon: "/logo.png", apple: "/logo.png" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Masterly Air Academy" },
  other: { "mobile-web-app-capable": "yes" },
  keywords: ["flight school", "pilot training", "aviation academy", "PPL", "CPL", "Algeria", "ATO", "Masterly Air Academy", "private pilot license", "commercial pilot license"],
  robots: { index: true, follow: true },
  metadataBase: new URL(BASE_URL),
  alternates: { canonical: BASE_URL },
  openGraph: {
    title: "Masterly Air Academy",
    description: "Approved Training Organization — Professional Aviation Training in Algeria. PPL, CPL, IR, MEP & MCC programs.",
    type: "website",
    url: BASE_URL,
    siteName: "Masterly Air Academy",
    locale: "en_US",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Masterly Air Academy" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Masterly Air Academy",
    description: "Approved Training Organization — Professional Aviation Training in Algeria",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover", themeColor: "#1e40af",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-navy-900 text-white min-h-screen antialiased">
        <LocaleProvider>
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
