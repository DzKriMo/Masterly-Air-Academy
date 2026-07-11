import { NextRequest, NextResponse } from "next/server";

const LOCALES = ["en", "fr", "ar"];
const DEFAULT = "en";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip internal paths
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];

  // If URL has locale prefix (e.g. /fr/login)
  if (firstSegment && LOCALES.includes(firstSegment)) {
    const response = NextResponse.next();
    response.cookies.set("locale", firstSegment, { path: "/", maxAge: 365 * 24 * 60 * 60 });
    // Rewrite to strip locale prefix so Next.js serves the actual page
    const newPath = "/" + segments.slice(1).join("/");
    return NextResponse.rewrite(new URL(newPath || "/", request.url));
  }

  // No locale prefix — check cookie
  const cookieLocale = request.cookies.get("locale")?.value;
  if (cookieLocale && LOCALES.includes(cookieLocale) && cookieLocale !== DEFAULT) {
    // Redirect to locale-prefixed URL
    const url = request.nextUrl.clone();
    url.pathname = `/${cookieLocale}${pathname}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|static|favicon|mast|logo|admin|health).*)"],
};
