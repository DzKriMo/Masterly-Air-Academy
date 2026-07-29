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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
