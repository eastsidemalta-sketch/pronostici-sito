import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { shouldBlockInactiveSegment } from "./lib/countries/segmentGuard";

/**
 * Middleware next-intl: forza prefisso locale su tutti gli URL.
 * - Italia: /it/...
 * - Brasile: /pt-BR/...
 * - Nuovi paesi: stesso schema (es. /fr/..., /es/...)
 *
 * Richieste senza locale (es. /pronostici-quote/calcio/foo) vengono
 * redirectate a /locale/pronostici-quote/calcio/foo (locale da cookie o Accept-Language).
 */
export default function middleware(request: NextRequest) {
  if (shouldBlockInactiveSegment(request.nextUrl.pathname)) {
    return new NextResponse(null, { status: 404 });
  }
  return createMiddleware(routing)(request);
}

export const config = {
  matcher: [
    "/",
    "/((?!api|trpc|_next|_vercel|ad2min3k|share-preview|.*\\..*).*)",
  ],
};
