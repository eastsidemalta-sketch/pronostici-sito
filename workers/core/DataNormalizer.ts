import { getUniversalTeamId } from "../utils/teamMatcher";
import type { StandardMarkets } from "../utils/marketMapper";

export interface NormalizedMatch {
  /** Fixture API-Football quando noto; altrimenti chiave deterministica `homeId-awayId` per aggregare sul worker. */
  apiFootballMatchId: string | null;
  homeTeamId: number;
  awayTeamId: number;
  bookmaker: string;
  updatedAt: string;
  markets: StandardMarkets;
}

/**
 * Pipeline: entity resolution (teamMatcher) + oggetto standard per Redis.
 * I mercati devono essere già in StandardMarkets (es. da mapBetboomMarkets / mapNetwinMarkets / mapBookmakerMarkets).
 */
export class DataNormalizer {
  public static process(
    bookmaker: string,
    rawHomeTeam: string,
    rawAwayTeam: string,
    standardizedMarkets: StandardMarkets
  ): NormalizedMatch | null {
    const homeTeamId = getUniversalTeamId(rawHomeTeam);
    const awayTeamId = getUniversalTeamId(rawAwayTeam);

    if (homeTeamId === null || awayTeamId === null) {
      console.warn(
        `[Normalizer] Match dropped. Missing alias for: ${rawHomeTeam} vs ${rawAwayTeam}`
      );
      return null;
    }

    const matchHashId = `${homeTeamId}-${awayTeamId}`;

    return {
      apiFootballMatchId: matchHashId,
      homeTeamId,
      awayTeamId,
      bookmaker,
      updatedAt: new Date().toISOString(),
      markets: standardizedMarkets,
    };
  }
}
