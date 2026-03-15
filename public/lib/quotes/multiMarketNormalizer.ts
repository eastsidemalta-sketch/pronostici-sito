/**
 * Estrae quote da tutti i mercati The Odds API.
 * Ogni market ha outcomes diversi - normalizziamo in formato { col1, col2, ... }.
 */

type Outcome = { name: string; price: number; point?: number };

function extract1X2(event: any, outcomes: Outcome[]) {
  const home =
    outcomes.find((o) => o.name === event.home_team)?.price ??
    outcomes.find((o) => o.name?.toLowerCase().includes("home"))?.price ??
    outcomes.find((o) => o.name === "1")?.price;
  const away =
    outcomes.find((o) => o.name === event.away_team)?.price ??
    outcomes.find((o) => o.name?.toLowerCase().includes("away"))?.price ??
    outcomes.find((o) => o.name === "2")?.price;
  const draw =
    outcomes.find((o) => o.name === "Draw")?.price ??
    outcomes.find((o) => o.name === "X")?.price ??
    outcomes.find((o) => o.name?.toLowerCase().includes("draw"))?.price;
  return { home: home ?? 0, draw: draw ?? 0, away: away ?? 0 };
}

function extractTotals(outcomes: Outcome[], point: number) {
  const byPoint = outcomes.filter(
    (o) => o.point === point || o.name?.includes(String(point))
  );
  const over =
    byPoint.find((o) => o.name?.toLowerCase().includes("over"))?.price ??
    outcomes.find(
      (o) =>
        o.name?.toLowerCase().includes("over") &&
        (o.point === point || o.name?.includes(String(point)))
    )?.price;
  const under =
    byPoint.find((o) => o.name?.toLowerCase().includes("under"))?.price ??
    outcomes.find(
      (o) =>
        o.name?.toLowerCase().includes("under") &&
        (o.point === point || o.name?.includes(String(point)))
    )?.price;
  return { over: over ?? 0, under: under ?? 0 };
}

function extractDoubleChance(outcomes: Outcome[], homeTeam: string, awayTeam: string) {
  const homeOrDraw =
    outcomes.find((o) =>
      o.name?.toLowerCase().includes("home") && o.name?.toLowerCase().includes("draw")
    )?.price ??
    outcomes.find((o) => o.name === "Home or Draw" || o.name === "1X")?.price;
  const homeOrAway =
    outcomes.find((o) =>
      o.name?.toLowerCase().includes("home") && o.name?.toLowerCase().includes("away")
    )?.price ??
    outcomes.find((o) => o.name === "Home or Away" || o.name === "12")?.price;
  const drawOrAway =
    outcomes.find((o) =>
      o.name?.toLowerCase().includes("draw") && o.name?.toLowerCase().includes("away")
    )?.price ??
    outcomes.find((o) => o.name === "Draw or Away" || o.name === "X2")?.price;
  return {
    homeOrDraw: homeOrDraw ?? 0,
    homeOrAway: homeOrAway ?? 0,
    drawOrAway: drawOrAway ?? 0,
  };
}

function extractBtts(outcomes: Outcome[]) {
  const yes = outcomes.find((o) => o.name?.toLowerCase() === "yes")?.price;
  const no = outcomes.find((o) => o.name?.toLowerCase() === "no")?.price;
  return { yes: yes ?? 0, no: no ?? 0 };
}

function extractSpreads(event: any, outcomes: Outcome[]) {
  const homeOut = outcomes.find((o) => o.name === event.home_team) ?? outcomes.find((o) => o.name?.toLowerCase().includes("home"));
  const awayOut = outcomes.find((o) => o.name === event.away_team) ?? outcomes.find((o) => o.name?.toLowerCase().includes("away"));
  return {
    home: homeOut?.price ?? 0,
    homePoint: homeOut?.point ?? 0,
    away: awayOut?.price ?? 0,
    awayPoint: awayOut?.point ?? 0,
  };
}

function extractDrawNoBet(event: any, outcomes: Outcome[]) {
  const home = outcomes.find((o) => o.name === event.home_team)?.price ?? outcomes.find((o) => o.name?.toLowerCase().includes("home"))?.price;
  const away = outcomes.find((o) => o.name === event.away_team)?.price ?? outcomes.find((o) => o.name?.toLowerCase().includes("away"))?.price;
  return { home: home ?? 0, away: away ?? 0 };
}

export type QuoteRecord = {
  fixtureId: string;
  bookmaker: string;
  bookmakerKey: string;
  homeTeam: string;
  awayTeam: string;
  outcomes: Record<string, number>;
};

export function normalizeMultiMarket(raw: any[]): Record<string, QuoteRecord[]> {
  const result: Record<string, QuoteRecord[]> = {
    h2h: [],
    h2h_3_way_h1: [],
    totals_25: [],
    totals_15: [],
    double_chance: [],
    btts: [],
    spreads: [],
    draw_no_bet: [],
  };

  for (const event of raw) {
    if (!event.bookmakers?.length) continue;

    for (const bm of event.bookmakers) {
      const markets = bm.markets ?? [];
      const bookmakerName = bm.title || bm.key || "Unknown";
      const bookmakerKey = (bm.key || "").toLowerCase();

      const base = {
        fixtureId: event.id,
        bookmaker: bookmakerName,
        bookmakerKey,
        homeTeam: event.home_team,
        awayTeam: event.away_team,
      };

      const h2hMarket = markets.find((m: any) => m.key === "h2h");
      if (h2hMarket?.outcomes?.length) {
        const { home, draw, away } = extract1X2(event, h2hMarket.outcomes);
        if (home || draw || away) {
          result.h2h.push({
            ...base,
            outcomes: { home, draw, away },
          });
        }
      }

      const h1Market = markets.find((m: any) => m.key === "h2h_3_way_h1");
      if (h1Market?.outcomes?.length) {
        const { home, draw, away } = extract1X2(event, h1Market.outcomes);
        if (home || draw || away) {
          result.h2h_3_way_h1.push({
            ...base,
            outcomes: { home, draw, away },
          });
        }
      }

      const totalsMarket = markets.find((m: any) => m.key === "totals");
      if (totalsMarket?.outcomes?.length) {
        const o25 = extractTotals(totalsMarket.outcomes, 2.5);
        if (o25.over || o25.under) {
          result.totals_25.push({
            ...base,
            outcomes: { over: o25.over, under: o25.under },
          });
        }
        const o15 = extractTotals(totalsMarket.outcomes, 1.5);
        if (o15.over || o15.under) {
          result.totals_15.push({
            ...base,
            outcomes: { over: o15.over, under: o15.under },
          });
        }
      }

      const dcMarket = markets.find((m: any) => m.key === "double_chance");
      if (dcMarket?.outcomes?.length) {
        const dc = extractDoubleChance(
          dcMarket.outcomes,
          event.home_team,
          event.away_team
        );
        if (dc.homeOrDraw || dc.homeOrAway || dc.drawOrAway) {
          result.double_chance.push({
            ...base,
            outcomes: dc,
          });
        }
      }

      const bttsMarket = markets.find((m: any) => m.key === "btts");
      if (bttsMarket?.outcomes?.length) {
        const btts = extractBtts(bttsMarket.outcomes);
        if (btts.yes || btts.no) {
          result.btts.push({
            ...base,
            outcomes: btts,
          });
        }
      }

      const spreadsMarket = markets.find((m: any) => m.key === "spreads");
      if (spreadsMarket?.outcomes?.length) {
        const sp = extractSpreads(event, spreadsMarket.outcomes);
        if (sp.home || sp.away) {
          result.spreads.push({
            ...base,
            outcomes: {
              home: sp.home,
              homePoint: sp.homePoint,
              away: sp.away,
              awayPoint: sp.awayPoint,
            },
          });
        }
      }

      const dnbMarket = markets.find((m: any) => m.key === "draw_no_bet");
      if (dnbMarket?.outcomes?.length) {
        const dnb = extractDrawNoBet(event, dnbMarket.outcomes);
        if (dnb.home || dnb.away) {
          result.draw_no_bet.push({
            ...base,
            outcomes: dnb,
          });
        }
      }
    }
  }

  return result;
}
