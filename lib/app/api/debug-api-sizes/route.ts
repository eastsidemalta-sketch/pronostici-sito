import { NextResponse } from "next/server";

/** Helper: fetch e misura byte della risposta */
async function fetchAndMeasure(
  url: string,
  options?: RequestInit
): Promise<{ bytes: number; status: number; ok: boolean }> {
  const res = await fetch(url, options);
  const text = await res.text();
  const bytes = new TextEncoder().encode(text).length;
  return { bytes, status: res.status, ok: res.ok };
}

export async function GET() {
  const results: Record<string, { bytes: number; status?: number; ok?: boolean; note?: string; estimated?: boolean }> = {};
  const apiFootballKey = process.env.API_FOOTBALL_KEY;

  // API-Football: fixtures (una lega, 7 giorni)
  if (apiFootballKey) {
    const from = new Date().toISOString().split("T")[0];
    const to = new Date();
    to.setDate(to.getDate() + 7);
    const toStr = to.toISOString().split("T")[0];
    try {
      const r = await fetchAndMeasure(
        `https://v3.football.api-sports.io/fixtures?from=${from}&to=${toStr}&league=135&season=2024`,
        { headers: { "x-apisports-key": apiFootballKey } }
      );
      results["API-Football: fixtures (Serie A, 7gg)"] = { bytes: r.bytes, status: r.status, ok: r.ok };
    } catch (e) {
      results["API-Football: fixtures"] = { bytes: 0, note: String(e) };
    }

    // API-Football: predictions (1 partita)
    try {
      const r = await fetchAndMeasure(
        "https://v3.football.api-sports.io/predictions?fixture=215662",
        { headers: { "x-apisports-key": apiFootballKey } }
      );
      results["API-Football: predictions (1 partita)"] = { bytes: r.bytes, status: r.status, ok: r.ok };
    } catch (e) {
      results["API-Football: predictions"] = { bytes: 0, note: String(e) };
    }

    // API-Football: fixture details (1 partita)
    try {
      const r = await fetchAndMeasure(
        "https://v3.football.api-sports.io/fixtures?id=215662",
        { headers: { "x-apisports-key": apiFootballKey } }
      );
      results["API-Football: fixture details (1 partita)"] = { bytes: r.bytes, status: r.status, ok: r.ok };
    } catch (e) {
      results["API-Football: fixture details"] = { bytes: 0, note: String(e) };
    }
  } else {
    results["API-Football"] = { bytes: 0, note: "API_FOOTBALL_KEY non configurata" };
  }

  const totalBytes = Object.values(results).reduce((s, r) => s + (r.bytes || 0), 0);

  return NextResponse.json({
    note: "Byte delle risposte HTTP (body) per le principali chiamate API. Include API-Football.",
    results,
    totalBytes,
    totalKB: Math.round(totalBytes / 1024 * 10) / 10,
    totalMB: Math.round(totalBytes / 1024 / 1024 * 100) / 100,
  });
}
