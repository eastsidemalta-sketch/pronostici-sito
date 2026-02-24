/** Mappa league ID (API Football) -> sport_key (The Odds API) */
export const LEAGUE_ID_TO_SPORT_KEY: Record<number, string> = {
  2: "soccer_uefa_champs_league",
  3: "soccer_uefa_europa_league",
  4: "soccer_uefa_europa_conference_league",
  39: "soccer_epl",
  135: "soccer_italy_serie_a",
  136: "soccer_italy_serie_b",
  140: "soccer_spain_la_liga",
  78: "soccer_germany_bundesliga",
  61: "soccer_france_ligue_one",
  137: "soccer_italy_copa",
  142: "soccer_england_fa_cup",
  143: "soccer_spain_copa_del_rey",
  148: "soccer_germany_dfb_pokal",
  66: "soccer_france_coupe_de_france",
};

/** Mappa league name -> sport_key (fallback) */
export const LEAGUE_NAME_TO_SPORT_KEY: Record<string, string> = {
  "Champions League": "soccer_uefa_champs_league",
  "Europa League": "soccer_uefa_europa_league",
  "Conference League": "soccer_uefa_europa_conference_league",
  "Premier League": "soccer_epl",
  "Serie A": "soccer_italy_serie_a",
  "Serie B": "soccer_italy_serie_b",
  "La Liga": "soccer_spain_la_liga",
  "Bundesliga": "soccer_germany_bundesliga",
  "Ligue 1": "soccer_france_ligue_one",
  "Coppa Italia": "soccer_italy_copa",
  "FA Cup": "soccer_england_fa_cup",
  "Copa del Rey": "soccer_spain_copa_del_rey",
  "DFB-Pokal": "soccer_germany_dfb_pokal",
  "Coupe de France": "soccer_france_coupe_de_france",
};

export function getSportKeyForLeague(leagueId?: number, leagueName?: string): string | null {
  if (leagueId && LEAGUE_ID_TO_SPORT_KEY[leagueId]) {
    return LEAGUE_ID_TO_SPORT_KEY[leagueId];
  }
  if (leagueName && LEAGUE_NAME_TO_SPORT_KEY[leagueName]) {
    return LEAGUE_NAME_TO_SPORT_KEY[leagueName];
  }
  return null;
}
