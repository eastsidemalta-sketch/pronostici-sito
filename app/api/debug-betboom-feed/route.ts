/**
 * Debug: POST a matches/get_by_category_ids e mostra risposta raw.
 * GET /api/debug-betboom-feed
 * GET /api/debug-betboom-feed?categoryIds=123,456 (testa category_ids)
 */
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const endpoint = "https://com-br-partner-feed.sporthub.bet/api/partner_feed/v1/matches/get_by_category_ids";
  const apiKey = process.env.BETBOOM_API_KEY;
  const { searchParams } = new URL(req.url);
  const categoryIdsParam = searchParams.get("categoryIds");

  if (!apiKey) {
    return NextResponse.json({ error: "BETBOOM_API_KEY mancante" }, { status: 500 });
  }

  const categoryIds = categoryIdsParam
    ? categoryIdsParam.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n))
    : [0];

  const body = {
    locale: "en",
    category_ids: categoryIds,
    market_ids: [1],
    type: "prematch",
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": apiKey,
        "x-partner": process.env.BETBOOM_PARTNER_ID ?? "id_7557",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        status: res.status,
        requestBody: body,
        errorBody: text.slice(0, 1000),
      });
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({
        ok: false,
        error: "Risposta non JSON",
        requestBody: body,
        raw: text.slice(0, 1000),
      });
    }

    const obj = data as Record<string, unknown>;
    const matches = obj.matches;
    const matchesArr = Array.isArray(matches) ? matches : [];
    const firstMatch = matchesArr[0];
    const firstMatchKeys = firstMatch && typeof firstMatch === "object" ? Object.keys(firstMatch as object) : [];
    const firstStake = firstMatch && typeof firstMatch === "object"
      ? (firstMatch as Record<string, unknown>).stakes
      : null;
    const stakesArr = Array.isArray(firstStake) ? firstStake : [];
    const firstStakeSample = stakesArr[0];

    return NextResponse.json({
      ok: true,
      requestBody: body,
      matchesCount: matchesArr.length,
      firstMatchKeys,
      firstMatchSample: firstMatch ? JSON.stringify(firstMatch).slice(0, 1500) : null,
      firstStakeSample: firstStakeSample ? JSON.stringify(firstStakeSample) : null,
      hint: categoryIds[0] === 0
        ? "Chiama /api/debug-betboom-categories per ottenere category_id, poi ?categoryIds=123"
        : undefined,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      requestBody: body,
    });
  }
}
