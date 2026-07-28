import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/providers";
import { LocaleProvider } from "@/components/locale-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { ErrorBoundary } from "@/components/error-boundary";

export const metadata: Metadata = {
  title: "Masterly Air Academy",
  description: "ATO Management Platform | Training, Administration & Compliance",
  manifest: "/manifest.json",
  icons: { icon: "/logo.png", apple: "/logo.png" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Masterly Air Academy" },
  other: { "mobile-web-app-capable": "yes" },
  openGraph: {
    title: "Masterly Air Academy",
    description: "Approved Training Organization — Professional Aviation Training in Algeria",
    type: "website",
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
      </body>
    </html>
  );
}
