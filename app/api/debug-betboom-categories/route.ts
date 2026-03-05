/**
 * Debug: fetch Betboom categories per sport.
 * GET /api/debug-betboom-categories
 * GET /api/debug-betboom-categories?sportIds=2,3 (usa sport_id da /api/debug-betboom-sports)
 */
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const endpoint = "https://com-br-partner-feed.sporthub.bet/api/partner_feed/v1/categories/get_by_sport_ids";
  const apiKey = process.env.BETBOOM_API_KEY;
  const { searchParams } = new URL(req.url);
  const sportIdsParam = searchParams.get("sportIds");

  if (!apiKey) {
    return NextResponse.json({ error: "BETBOOM_API_KEY mancante" }, { status: 500 });
  }

  const sportIds = sportIdsParam
    ? sportIdsParam.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n))
    : [1];

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": apiKey,
        "x-partner": process.env.BETBOOM_PARTNER_ID ?? "id_7557",
      },
      body: JSON.stringify({ locale: "en", sport_ids: sportIds }),
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
      sportIds,
      categories,
      brasileiraoHint: brasileirao
        ? { id: brasileirao.id, name: brasileirao.name, slug: brasileirao.url_slug }
        : "Cerca 'Brasil' o 'Serie A' nella lista. Se vedi solo esports, chiama /api/debug-betboom-sports per trovare sport_id Football, poi ?sportIds=ID",
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
