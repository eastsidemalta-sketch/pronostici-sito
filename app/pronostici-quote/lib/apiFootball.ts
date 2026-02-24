export async function getSerieAFixtures() {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY mancante. Controlla .env.local");
  const url = "https://v3.football.api-sports.io/fixtures?league=135&season=2024&next=10";
  const res = await fetch(url, {
    headers: { "x-apisports-key": key },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`API-Football error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.response as any[];
}

/** Pronostici 1X2 per una partita (percentuali home, draw, away) */
export type FixturePredictions = {
  home: number | null;
  draw: number | null;
  away: number | null;
};

/**
 * Ottiene le predizioni per una partita (API-Football predictions).
 * Restituisce la risposta raw per la pagina dettaglio.
 */
export async function getFixturePredictions(fixtureId: string | number) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return null;
  const url = `https://v3.football.api-sports.io/predictions?fixture=${fixtureId}`;
  try {
    const res = await fetch(url, {
      headers: { "x-apisports-key": key },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.response?.[0] || null;
  } catch {
    return null;
  }
}

/**
 * Ottiene le predizioni 1X2 per più partite.
 * Restituisce una mappa fixtureId -> { home, draw, away } percentuali.
 */
export async function getPredictionsForFixtures(
  fixtureIds: number[]
): Promise<Record<number, FixturePredictions>> {
  const result: Record<number, FixturePredictions> = {};
  await Promise.all(
    fixtureIds.map(async (id) => {
      const pred = await getFixturePredictions(id);
      const pct = pred?.predictions?.percent ?? pred?.predictions?.winner?.percent;
      result[id] = {
        home: pct?.home != null ? parseInt(String(pct.home), 10) : null,
        draw: pct?.draw != null ? parseInt(String(pct.draw), 10) : null,
        away: pct?.away != null ? parseInt(String(pct.away), 10) : null,
      };
    })
  );
  return result;
}
  