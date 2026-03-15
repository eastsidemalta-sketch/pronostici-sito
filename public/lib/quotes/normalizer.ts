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

