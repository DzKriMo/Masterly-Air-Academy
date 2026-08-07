import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const locales = ["en", "fr", "ar"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || /\.\w+$/.test(pathname)) {
    return NextResponse.next();
  }

  const pathLocale = locales.find(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );

  if (pathLocale) {
    const pathWithout = pathname.replace(`/${pathLocale}`, "") || "/";
    const url = new URL(pathWithout, request.url);
    const res = NextResponse.rewrite(url);
    res.cookies.set("locale", pathLocale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  // Unprefixed visit — ensure a locale cookie always exists (sniffed from
  // Accept-Language only when the user has no explicit choice yet).
  if (!request.cookies.has("locale")) {
    const accept = (request.headers.get("accept-language") || "").toLowerCase();
    const detected = accept.includes("fr") ? "fr" : accept.includes("ar") ? "ar" : "en";
    const res = NextResponse.next();
    res.cookies.set("locale", detected, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
