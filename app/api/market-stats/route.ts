/**
 * GET /api/market-stats?range=30
 * Protetto da X-Admin-Token (ADMIN_ANALYTICS_TOKEN).
 * Rate limit: 10 req/min per IP.
 */

import { NextRequest, NextResponse } from "next/server";
import { getMarketStats, checkMarketStatsRateLimit } from "@/lib/analytics";

const ADMIN_TOKEN_HEADER = "X-Admin-Token";

function requireAdminToken(request: NextRequest): boolean {
  const token = request.headers.get(ADMIN_TOKEN_HEADER);
  const expected = process.env.ADMIN_ANALYTICS_TOKEN;
  return !!expected && !!token && token === expected;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}

export async function GET(request: NextRequest) {
  if (!requireAdminToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const { allowed } = await checkMarketStatsRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too Many Requests" },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const rangeParam = searchParams.get("range");
  const rangeDays = Math.min(
    90,
    Math.max(1, parseInt(rangeParam ?? "30", 10) || 30)
  );

  const stats = await getMarketStats(rangeDays);
  return NextResponse.json(stats);
}
