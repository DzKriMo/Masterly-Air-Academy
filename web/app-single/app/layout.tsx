import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { LocaleProvider } from "@/components/locale-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { ErrorBoundary } from "@/components/error-boundary";

export const metadata: Metadata = {
  title: "Masterly Air Academy",
  description: "ATO Management Platform | Training, Administration & Compliance",
  icons: { icon: "/logo.png", apple: "/logo.png" },
  openGraph: {
    title: "Masterly Air Academy",
    description: "Approved Training Organization — Professional Aviation Training in Algeria",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover",
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
      </body>
    </html>
  );
}
