import { NextResponse } from "next/server";

/**
 * Debug: mostra la struttura reale della risposta API-Football predictions.
 * GET /api/debug-predictions?fixture=215662
 * Utile per verificare il formato di under_over, goals, ecc.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fixtureId = searchParams.get("fixture") || "215662";
  const key = process.env.API_FOOTBALL_KEY;

  if (!key) {
    return NextResponse.json({ error: "API_FOOTBALL_KEY non configurata" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/predictions?fixture=${fixtureId}`,
      { headers: { "x-apisports-key": key } }
    );
    const data = await res.json();

    const pred = data.response?.[0];
    if (!pred) {
      return NextResponse.json({
        ok: res.ok,
        status: res.status,
        fixtureId,
        note: "Nessuna prediction in response",
        response: data.response,
      });
    }

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      fixtureId,
      /** Struttura predictions.predictions (quello che usiamo) */
      predictions: pred.predictions ?? null,
      /** under_over raw - tipo e valore */
      under_over: pred.predictions?.under_over ?? null,
      under_over_type: typeof pred.predictions?.under_over,
      under_over_stringified: pred.predictions?.under_over != null
        ? JSON.stringify(pred.predictions.under_over)
        : null,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
