import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/providers";
import { LocaleProvider } from "@/components/locale-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { ErrorBoundary } from "@/components/error-boundary";
import { SITE_URL as BASE_URL } from "@/lib/site-url";

const seoByLang: Record<string, { title: string; description: string; keywords: string }> = {
  en: {
    title: "Masterly Air Academy | ATO Approved Flight Training School in Algeria",
    description: "Masterly Air Academy is Algeria's premier ATO-approved flight school. Earn your pilot license — PPL, CPL, IR, MEP, MCC — with modern aircraft, expert instructors, and EASA-aligned training. Enroll today.",
    keywords: "flight school Algeria, pilot training Algeria, flying school Algiers, ATO Algeria, PPL license Algeria, CPL license Algeria, private pilot license, commercial pilot license, instrument rating, multi engine rating, MCC course, airline pilot training, aviation academy, pilot career Algeria, flight lessons, become a pilot, pilot school near me, best flight school Algeria, helicopter pilot training, ATPL training, aviation school, aeronautical training, flight instructor course, night rating, type rating, cabin crew training, aviation English, DGAC approved, EASA compliant, Algerian civil aviation, pilot license cost Algeria, cheap flight school, professional pilot program, Masterly Air Academy",
  },
  fr: {
    title: "Masterly Air Academy | ATO Agree - Ecole de Pilotage en Algerie",
    description: "Masterly Air Academy est une ecole de pilotage agreee ATO en Algerie. Formations PPL, CPL, IR, MEP, MCC avec une flotte moderne et des instructeurs qualifies. Devenez pilote professionnel en Algerie.",
    keywords: "ecole de pilotage Algerie, formation pilote Algerie, cours de pilotage Alger, ATO Algerie, licence PPL Algerie, licence CPL Algerie, licence pilote prive, licence pilote professionnel, qualification vol aux instruments, qualification multimoteur, cours MCC, devenir pilote Algerie, formation pilote de ligne, ATPL Algerie, meilleure ecole aviation Algerie, ecole aeronautique Algerie, formation instructeur vol, cout formation pilote Algerie, ecole pilotage pas cher, programme pilote professionnel, Masterly Air Academy",
  },
  ar: {
    title: "أكاديمية ماسترلي للطيران | أفضل مدرسة طيران معتمدة ATO في الجزائر",
    description: "أكاديمية ماسترلي للطيران هي منظمة تدريب معتمدة (ATO) في الجزائر تقدم برامج تدريب الطيارين: رخصة طيار خاص PPL، رخصة طيار تجاري CPL، الطيران الآلي IR، الطيران متعدد المحركات MEP، دورة MCC. انضم إلينا لتصبح طيارا محترفا.",
    keywords: "مدرسة طيران الجزائر, تدريب طيارين الجزائر, تعليم الطيران الجزائر, أكاديمية طيران, ATO الجزائر, رخصة طيار خاص, رخصة طيار تجاري, رخصة طيار, تدريب طيران, طيار محترف, CPL الجزائر, PPL الجزائر, IR الجزائر, طيران آلي, متعدد المحركات, دورة MCC, أفضل مدرسة طيران, تكوين طيارين, تكاليف دراسة الطيران, دراسة الطيران في الجزائر, أكاديمية ماسترلي للطيران",
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
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "48x48" },
        { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
        { url: "/favicon-64x64.png", type: "image/png", sizes: "64x64" },
        { url: "/icon-192x192.png", type: "image/png", sizes: "192x192" },
        { url: "/icon-512x512.png", type: "image/png", sizes: "512x512" },
      ],
      apple: [
        { url: "/icon-192x192.png" },
        { url: "/icon-512x512.png" },
      ],
    },
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Masterly Air Academy" },
    other: { "mobile-web-app-capable": "yes" },
    keywords: seo.keywords.split(", "),
    robots: { index: true, follow: true },
    metadataBase: new URL(BASE_URL),
    alternates: {
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
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Masterly Air Academy - ATO Approved Flight Training in Algeria" }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: ["/og-image.png"],
      site: "@masterlyair",
      creator: "@masterlyair",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#1e40af",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const serverLocale = cookieStore.get("locale")?.value || "en";

  return (
    <html lang={serverLocale} className="dark">
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
          {JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              "@id": `${BASE_URL}/#organization`,
              name: "Masterly Air Academy",
              alternateName: "MAA",
              url: BASE_URL,
              logo: `${BASE_URL}/logo.png`,
              image: `${BASE_URL}/og-image.png`,
              description: "Algeria's premier ATO-approved flight training academy offering PPL, CPL, IR, MEP, MCC programs with modern fleet and expert instructors.",
              email: "contact@masterly-air-academy.dz",
              address: {
                "@type": "PostalAddress",
                addressCountry: "DZ",
                addressLocality: "Algiers",
                addressRegion: "Algiers",
              },
              geo: { "@type": "GeoCoordinates", latitude: 36.7538, longitude: 3.0588 },
              openingHoursSpecification: { "@type": "OpeningHoursSpecification", dayOfWeek: ["Sunday","Monday","Tuesday","Wednesday","Thursday"], opens: "08:00", closes: "17:00" },
              sameAs: [
                "https://www.facebook.com/masterlyairacademy",
                "https://www.instagram.com/masterlyairacademy",
              ],
              knowsAbout: [
                "Pilot Training", "Private Pilot License", "Commercial Pilot License",
                "Instrument Rating", "Multi-Engine Rating", "MCC Course",
                "Flight School", "Aviation Training", "ATO Algeria"
              ],
            },
            {
              "@context": "https://schema.org",
              "@type": "EducationalOrganization",
              "@id": `${BASE_URL}/#educational`,
              name: "Masterly Air Academy",
              url: BASE_URL,
              description: "Approved Training Organization (ATO) providing professional flight training in Algeria.",
              address: { "@type": "PostalAddress", addressCountry: "DZ" },
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              inLanguage: "en",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "What pilot licenses can I earn at Masterly Air Academy?",
                  acceptedAnswer: { "@type": "Answer", text: "Masterly Air Academy offers Private Pilot License (PPL), Commercial Pilot License (CPL), Instrument Rating (IR), Multi-Engine Piston Rating (MEP), and Multi-Crew Cooperation (MCC) courses, all under ATO approval." }
                },
                {
                  "@type": "Question",
                  name: "Is Masterly Air Academy an approved ATO in Algeria?",
                  acceptedAnswer: { "@type": "Answer", text: "Yes. Masterly Air Academy is an officially Approved Training Organization (ATO) recognized by Algerian civil aviation authorities." }
                },
                {
                  "@type": "Question",
                  name: "How long does it take to become a commercial pilot in Algeria?",
                  acceptedAnswer: { "@type": "Answer", text: "The full CPL program typically takes 12 to 18 months depending on weather conditions, student availability, and training pace. Contact us for a personalized timeline." }
                },
                {
                  "@type": "Question",
                  name: "What are the requirements to enroll in pilot training?",
                  acceptedAnswer: { "@type": "Answer", text: "Requirements include a minimum age of 17 for PPL and 18 for CPL, a valid Class 1 or Class 2 medical certificate, proficiency in English (ICAO Level 4 minimum), and a high school diploma or equivalent." }
                },
              ]
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              inLanguage: "fr",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "Comment devenir pilote en Algerie?",
                  acceptedAnswer: { "@type": "Answer", text: "Pour devenir pilote en Algerie, inscrivez-vous dans une ecole de pilotage agreee ATO comme Masterly Air Academy. Les programmes commencent par la licence PPL (Private Pilot License) suivie du CPL (Commercial Pilot License), IR (Instrument Rating), et MEP (Multi-Engine Piston)." }
                },
              ]
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              inLanguage: "ar",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "كيف تصبح طيارا في الجزائر؟",
                  acceptedAnswer: { "@type": "Answer", text: "لتصبح طيارا في الجزائر، يجب التسجيل في مدرسة طيران معتمدة ATO مثل أكاديمية ماسترلي للطيران. تبدأ البرامج برخصة طيار خاص PPL ثم رخصة طيار تجاري CPL والطيران الآلي IR والطيران متعدد المحركات MEP ودورة MCC." }
                },
              ]
            },
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
                { "@type": "ListItem", position: 2, name: "Pilot Training Programs", item: `${BASE_URL}/#programs` },
                { "@type": "ListItem", position: 3, name: "Contact", item: `${BASE_URL}/#contact` },
              ]
            },
          ])}
        </Script>
      </body>
    </html>
  );
}
