/**
 * Debug: fetch Betboom categories per Football (sport_id 1).
 * Usa il risultato per trovare category_id del Brasileirão da mettere in apiLeagueMapping.
 * GET /api/debug-betboom-categories
 */
import { NextResponse } from "next/server";

export async function GET() {
  const endpoint = "https://com-br-partner-feed.sporthub.bet/api/partner_feed/v1/categories/get_by_sport_ids";
  const apiKey = process.env.BETBOOM_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "BETBOOM_API_KEY mancante" }, { status: 500 });
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": apiKey,
        "x-partner": process.env.BETBOOM_PARTNER_ID ?? "id_7557",
      },
      body: JSON.stringify({ locale: "en", sport_ids: [1] }),
      cache: "no-store",
    });
    const data = (await res.json()) as { categories?: Array<{ id: number; name: string; url_slug: string }> };

    if (!res.ok) {
      return NextResponse.json({ ok: false, status: res.status, error: data });
    }

    const categories = data.categories ?? [];
    const brasileirao = categories.find(
      (c) =>
        /brasil|brazil|serie a|série a|campeonato/i.test(c.name) ||
        /brasileir[aã]o/i.test(c.name)
    );

    return NextResponse.json({
      ok: true,
      categories,
      brasileiraoHint: brasileirao
        ? { id: brasileirao.id, name: brasileirao.name, slug: brasileirao.url_slug }
        : "Cerca 'Brasil' o 'Serie A' nella lista categories e usa l'id in apiLeagueMapping.71",
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
