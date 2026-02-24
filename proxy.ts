import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { shouldBlockInactiveSegment } from "./lib/countries/segmentGuard";

export function proxy(request: NextRequest) {
  if (shouldBlockInactiveSegment(request.nextUrl.pathname, [...routing.locales])) {
    return new NextResponse(null, { status: 404 });
  }
  return createMiddleware(routing)(request);
}

export const config = {
  matcher: [
    "/",
    "/((?!api|trpc|_next|_vercel|ad2min3k|.*\\..*).*)",
  ],
};
