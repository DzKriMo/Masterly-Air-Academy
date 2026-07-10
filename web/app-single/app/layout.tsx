import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Masterly Air Academy",
  description: "ATO Management Platform — Training, Administration & Compliance",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-navy-900 text-white min-h-screen antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
