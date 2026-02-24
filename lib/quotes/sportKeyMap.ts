// lib/quotes/sportKeyMap.ts

export const SPORT_KEY_BY_LEAGUE: Record<string, string> = {
  "Premier League": "soccer_epl",
  "Serie A": "soccer_italy_serie_a",
  "Bundesliga": "soccer_germany_bundesliga",
  "La Liga": "soccer_spain_la_liga",
  "Ligue 1": "soccer_france_ligue_one",
};

export function getSportKeyByLeague(leagueName: string): string | null {
  return SPORT_KEY_BY_LEAGUE[leagueName] || null;
}
