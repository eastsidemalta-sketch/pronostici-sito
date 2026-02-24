import type { TheOddsApiEvent } from "./providers/theOddsApi";

/** Quote normalizzata 1X2 */
export type NormalizedOdds1X2 = {
  home: number;
  draw: number;
  away: number;
};

/** Evento con quote normalizzate per bookmaker */
export type NormalizedEvent = {
  id: string;
  sportKey: string;
  commenceTime: string;
  homeTeam: string;
  awayTeam: string;
  bookmakers: Array<{
    key: string;
    title: string;
    lastUpdate: string;
    h2h: NormalizedOdds1X2;
  }>;
};

/**
 * Normalizza gli eventi da The Odds API in formato unificato.
 * Mappa i nomi degli outcomes (home/draw/away) alle quote decimali.
 */
export function normalizeTheOddsApiEvents(
  events: TheOddsApiEvent[]
): NormalizedEvent[] {
  return events.map((event) => {
    const bookmakers = event.bookmakers.map((bm) => {
      const h2hMarket = bm.markets.find((m) => m.key === "h2h");
      const outcomes = h2hMarket?.outcomes ?? [];

      const home = outcomes.find(
        (o) =>
          o.name === event.home_team ||
          o.name.toLowerCase().includes("home") ||
          o.name === "1"
      )?.price;
      const away = outcomes.find(
        (o) =>
          o.name === event.away_team ||
          o.name.toLowerCase().includes("away") ||
          o.name === "2"
      )?.price;
      const draw = outcomes.find(
        (o) =>
          o.name.toLowerCase().includes("draw") ||
          o.name === "Draw" ||
          o.name === "X"
      )?.price;

      return {
        key: bm.key,
        title: bm.title,
        lastUpdate: bm.last_update,
        h2h: {
          home: home ?? 0,
          draw: draw ?? 0,
          away: away ?? 0,
        },
      };
    });

    return {
      id: event.id,
      sportKey: event.sport_key,
      commenceTime: event.commence_time,
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      bookmakers,
    };
  });
}

function extractOutcomes(event: any, outcomes: any[]) {
  const home =
    outcomes.find((o: any) => o.name === event.home_team)?.price ??
    outcomes.find((o: any) => (event.home_team && o.name?.includes(event.home_team)))?.price ??
    outcomes.find((o: any) => o.name?.toLowerCase() === "home")?.price ??
    outcomes.find((o: any) => o.name === "1")?.price;
  const away =
    outcomes.find((o: any) => o.name === event.away_team)?.price ??
    outcomes.find((o: any) => (event.away_team && o.name?.includes(event.away_team)))?.price ??
    outcomes.find((o: any) => o.name?.toLowerCase() === "away")?.price ??
    outcomes.find((o: any) => o.name === "2")?.price;
  const draw =
    outcomes.find((o: any) => o.name === "Draw")?.price ??
    outcomes.find((o: any) => o.name === "X")?.price ??
    outcomes.find((o: any) => o.name?.toLowerCase().includes("draw"))?.price;
  return { home, away, draw };
}

function getQuoteFromBookmaker(event: any, bm: any) {
  const h2h = bm.markets?.find((m: any) => m.key === "h2h");
  const outcomes = h2h?.outcomes ?? [];
  const { home, away, draw } = extractOutcomes(event, outcomes);

  return {
    fixtureId: event.id,
    bookmaker: bm.title || bm.key || "Unknown",
    bookmakerKey: (bm.key || "").toLowerCase(),
    homeTeam: event.home_team,
    awayTeam: event.away_team,
    market: "1X2",
    outcomes: { home, away, draw },
  };
}

/**
 * Normalizza gli eventi da The Odds API in quote 1X2.
 * Restituisce UNA quote per OGNI bookmaker per evento, così le quote migliori
 * per 1, X, 2 possono essere scelte tra tutti i bookmaker.
 */
export function normalizeOdds(raw: any, _bookmakerName: string, _apiBookmakerKey?: string) {
  const results: any[] = [];

  for (const event of raw) {
    if (!event.bookmakers?.length) continue;

    for (const bm of event.bookmakers) {
      const quote = getQuoteFromBookmaker(event, bm);
      results.push(quote);
    }
  }

  return results;
}
