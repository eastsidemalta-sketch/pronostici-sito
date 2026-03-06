/**
 * Invalida la cache Redis della home page.
 * Utile dopo deploy o quando i dati sembrano bloccati/stale.
 *
 * GET /api/invalidate-cache
 * Header: Authorization: Bearer <CRON_SECRET>
 *
 * Query:
 *   country=ALL  → invalida tutti i paesi (default)
 *   country=IT   → invalida solo IT
 *   country=IT,BR → invalida IT e BR
 */
import { NextResponse } from "next/server";
import { invalidateHomeCache } from "@/lib/homePageCache";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const countryParam = searchParams.get("country") ?? "ALL";

  try {
    if (countryParam === "ALL" || countryParam === "*") {
      await invalidateHomeCache("*");
      return NextResponse.json({
        ok: true,
        invalidated: "all",
        message: "Cache home invalidata per tutti i paesi",
      });
    }
    const countries = countryParam.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
    for (const c of countries) {
      await invalidateHomeCache(c);
    }
    return NextResponse.json({
      ok: true,
      invalidated: countries,
      message: `Cache home invalidata per: ${countries.join(", ")}`,
    });
  } catch (err) {
    console.error("[invalidate-cache] error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
