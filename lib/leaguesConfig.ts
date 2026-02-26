import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { CALCIO_COMPETITIONS } from "./homeMenu";
import { getActiveMarketCodes } from "./markets";
import { getCompetitionsForSport } from "./sportsCompetitions";
import { isHiddenCompetition } from "./hiddenCompetitions";

const DATA_PATH = path.join(process.cwd(), "data", "leaguesConfig.json");

const DEFAULT_LEAGUE_IDS = CALCIO_COMPETITIONS.map((c) => c.id);

/** Config per uno sport in un paese */
export type SportConfigInCountry = {
  leagueIds?: number[];
  competitionIds?: string[];
};

/** Config per paese: leagueIds (legacy), oppure per-sport */
export type LeaguesConfigForCountry = Record<
  string,
  number[] | { leagueIds?: number[]; competitionIds?: string[] } | undefined
>;

/** Config globale: per paese + fallback per retrocompatibilità */
export type LeaguesConfig = {
  byCountry?: Record<string, LeaguesConfigForCountry>;
  leagueIds?: number[];
};

function getRawConfig(): LeaguesConfig {
  try {
    if (existsSync(DATA_PATH)) {
      const raw = readFileSync(DATA_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {
    // fallback
  }
  return { leagueIds: DEFAULT_LEAGUE_IDS };
}

export function getLeaguesConfig(): LeaguesConfig {
  return getRawConfig();
}

export function saveLeaguesConfig(config: LeaguesConfig): void {
  const dir = path.dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(config, null, 2));
}

function filterHidden<T extends number | string>(ids: T[]): T[] {
  return ids.filter((id) => !isHiddenCompetition(id));
}

/** Restituisce gli ID competizioni calcio abilitate per un paese (retrocompatibilità) */
export function getEnabledLeagueIds(country?: string): number[] {
  const config = getRawConfig();
  let ids: number[];
  if (!country) ids = config.leagueIds ?? DEFAULT_LEAGUE_IDS;
  else {
    const cc = config.byCountry?.[country];
    if (!cc) ids = config.leagueIds ?? DEFAULT_LEAGUE_IDS;
    else {
      const raw = cc.leagueIds;
      if (Array.isArray(raw) && raw.length) ids = raw;
      else {
        const calcio = cc.calcio as { leagueIds?: number[] } | undefined;
        ids = calcio?.leagueIds?.length ? calcio.leagueIds : config.leagueIds ?? DEFAULT_LEAGUE_IDS;
      }
    }
  }
  return filterHidden(ids);
}

/** Restituisce gli ID competizioni abilitate per sport+paese. Calcio: number[], altri: string[] */
export function getEnabledCompetitionIds(
  country: string,
  sportKey: string
): number[] | string[] {
  const config = getRawConfig();
  const cc = config.byCountry?.[country];
  let ids: number[] | string[];
  if (!cc) {
    ids = sportKey === "calcio" ? (config.leagueIds ?? DEFAULT_LEAGUE_IDS) : [];
  } else if (sportKey === "calcio") {
    const calcio = cc.calcio as { leagueIds?: number[] } | undefined;
    if (calcio?.leagueIds?.length) ids = calcio.leagueIds;
    else if (Array.isArray(cc.leagueIds) && cc.leagueIds.length) ids = cc.leagueIds;
    else ids = config.leagueIds ?? DEFAULT_LEAGUE_IDS;
  } else {
    const sportConfig = cc[sportKey] as { competitionIds?: string[] } | undefined;
    ids = sportConfig?.competitionIds ?? [];
  }
  return filterHidden(ids as (number | string)[]) as number[] | string[];
}

/** Lista paesi supportati (da markets config) */
export function getSupportedCountries(): string[] {
  return getActiveMarketCodes();
}
