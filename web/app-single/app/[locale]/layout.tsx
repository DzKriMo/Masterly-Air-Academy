import type { Metadata, Viewport } from "next";
import "../globals.css";
import { Providers } from "@/components/providers";
import { LanguageSwitcher } from "@/components/language-switcher";

export const metadata: Metadata = {
  title: "Masterly Air Academy",
  description: "ATO Management Platform",
  icons: { icon: "/mast.svg", apple: "/mast.svg" },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover",
};

export default function LocaleLayout({ children, params }: { children: React.ReactNode; params: { locale: string } }) {
  const dir = params.locale === "ar" ? "rtl" : "ltr";
  return (
    <html lang={params.locale} dir={dir} className="dark">
      <body className="bg-navy-900 text-white min-h-screen antialiased">
        <Providers>
          <div className="fixed top-4 right-4 z-[9999]"><LanguageSwitcher /></div>
          {children}
        </Providers>
      </body>
    </html>
  );
}
