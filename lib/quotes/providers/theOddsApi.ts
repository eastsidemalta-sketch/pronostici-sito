const BASE_URL = "https://api.the-odds-api.com/v4";

export type TheOddsApiEvent = {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    last_update: string;
    markets: Array<{
      key: string;
      last_update?: string;
      outcomes: Array<{
        name: string;
        price: number;
      }>;
    }>;
  }>;
};

export async function fetchOdds(
  apiKey: string,
  sport: string,
  regions = "eu",
  markets = "h2h"
): Promise<TheOddsApiEvent[]> {
  const url = `${BASE_URL}/sports/${sport}/odds?regions=${regions}&markets=${markets}&apiKey=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 60 } });

  if (!res.ok) {
    throw new Error(`The Odds API error ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

const MARKETS = "h2h,h2h_3_way_h1,totals,double_chance,btts,spreads,draw_no_bet";

export async function fetchOddsFromTheOddsApi({
  apiKey,
  sportKey,
}: {
  apiKey: string;
  sportKey: string;
}) {
  const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?regions=eu&markets=${MARKETS}&oddsFormat=decimal&apiKey=${apiKey}`;

  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    const fallbackUrl = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?regions=eu&markets=h2h&oddsFormat=decimal&apiKey=${apiKey}`;
    const fallback = await fetch(fallbackUrl, { next: { revalidate: 60 } });
    if (!fallback.ok) throw new Error("Errore The Odds API");
    return fallback.json();
  }

  return res.json();
}
