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
 *   warm=1      → dopo invalidazione, pre-popola la cache (evita vuoto al primo utente)
 */
import { NextResponse } from "next/server";
import { invalidateHomeCache, warmHomePageCache } from "@/lib/homePageCache";
import { getActiveLocales } from "@/lib/markets";
import { localeToCountryCode } from "@/i18n/routing";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const countryParam = searchParams.get("country") ?? "ALL";
  const doWarm = searchParams.get("warm") === "1";

  try {
    if (countryParam === "ALL" || countryParam === "*") {
      await invalidateHomeCache("*");
      const res: Record<string, unknown> = {
        ok: true,
        invalidated: "all",
        message: "Cache home invalidata per tutti i paesi",
      };
      if (doWarm) {
        const countries = getActiveLocales().map((l) => localeToCountryCode[l] ?? "IT");
        await warmHomePageCache(countries);
        res.warmed = countries;
      }
      return NextResponse.json(res);
    }
    const countries = countryParam.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
    for (const c of countries) {
      await invalidateHomeCache(c);
    }
    const res: Record<string, unknown> = {
      ok: true,
      invalidated: countries,
      message: `Cache home invalidata per: ${countries.join(", ")}`,
    };
    if (doWarm) {
      await warmHomePageCache(countries);
      res.warmed = countries;
    }
    return NextResponse.json(res);
  } catch (err) {
    console.error("[invalidate-cache] error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
