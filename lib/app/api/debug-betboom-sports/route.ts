/**
 * Debug: fetch Betboom sports list.
 * Trova sport_id per Football (calcio).
 * GET /api/debug-betboom-sports
 */
import { NextResponse } from "next/server";

export async function GET() {
  const endpoint = "https://com-br-partner-feed.sporthub.bet/api/partner_feed/v1/sports/get";
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
      body: JSON.stringify({ locale: "en" }),
      cache: "no-store",
    });
    const data = (await res.json()) as { sports?: Array<{ id: number; name: string; url_slug: string }> };

    if (!res.ok) {
      return NextResponse.json({ ok: false, status: res.status, error: data });
    }

    const sports = data.sports ?? [];
    const football = sports.find(
      (s) =>
        /football|soccer|calcio|futebol/i.test(s.name) ||
        /football|soccer|calcio|futebol/i.test(s.url_slug ?? "")
    );

    return NextResponse.json({
      ok: true,
      sports,
      footballHint: football
        ? { id: football.id, name: football.name, slug: football.url_slug }
        : "Cerca 'Football' nella lista e usa sport_id per /api/debug-betboom-categories?sportIds=ID",
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
