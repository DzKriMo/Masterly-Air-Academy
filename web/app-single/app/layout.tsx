import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { LocaleProvider } from "@/components/locale-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationBell } from "@/components/notification-bell";

export const metadata: Metadata = {
  title: "Masterly Air Academy",
  description: "ATO Management Platform | Training, Administration & Compliance",
  icons: { icon: "/mast.svg", apple: "/mast.svg" },
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
            <div className="fixed top-4 right-4 z-[9999] flex items-center gap-2"><NotificationBell /><LanguageSwitcher /></div>
            {children}
          </Providers>
        </LocaleProvider>
      </body>
    </html>
  );
}
