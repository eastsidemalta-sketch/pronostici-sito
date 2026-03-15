/** League IDs considered "featured" - poll every 2 minutes */
export const FEATURED_LEAGUE_IDS = new Set([
  2,   // Champions League
  3,   // Europa League
  4,   // Conference League
  39,  // Premier League
  135, // Serie A
  140, // La Liga
  78,  // Bundesliga
  61,  // Ligue 1
]);

export function isFeaturedLeague(leagueId: number | undefined): boolean {
  return leagueId != null && FEATURED_LEAGUE_IDS.has(leagueId);
}
