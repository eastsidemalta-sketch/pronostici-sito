import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import {
  SPORTS,
  CALCIO_COMPETITIONS,
  type HomeMenuConfig,
  type MenuItem,
  type AllSportsConfig,
} from "./homeMenu";
import { getEnabledLeagueIds } from "./leaguesConfig";
import { getSportsPerCountry } from "./sportsPerCountryData";
import { SUPPORTED_MARKETS } from "./markets";

const DATA_PATH = path.join(process.cwd(), "data", "homeMenu.json");

const compById = Object.fromEntries(CALCIO_COMPETITIONS.map((c) => [c.id, c]));

function defaultMenuItems(country: string): MenuItem[] {
  const orderedIds = getEnabledLeagueIds(country);
  const calcioSubItems = orderedIds
    .filter((id) => compById[id])
    .map((id) => ({ id, name: compById[id].name, type: compById[id].type }));

  return SPORTS.map((s) => ({
    key: s.key,
    label: s.label,
    href: s.href,
    subItems: s.key === "calcio" ? calcioSubItems : [],
  }));
}

/** Sostituisce i subItems calcio con le competizioni abilitate per il paese (ordine da leaguesConfig) */
function applyLeaguesConfigToCalcio(items: MenuItem[], country: string): MenuItem[] {
  const orderedIds = getEnabledLeagueIds(country);
  const calcioSubItems = orderedIds
    .filter((id) => compById[id])
    .map((id) => ({ id, name: compById[id].name, type: compById[id].type }));

  return items.map((m) =>
    m.key === "calcio" ? { ...m, subItems: calcioSubItems } : m
  );
}

const DEFAULT_COUNTRIES = Object.keys(SUPPORTED_MARKETS);

function buildDefaultConfig(): HomeMenuConfig {
  try {
    const result: HomeMenuConfig = {};
    for (const country of DEFAULT_COUNTRIES) {
      result[country] = { menuItems: defaultMenuItems(country) };
    }
    return result;
  } catch {
    const fallbackItems = SPORTS.map((s) => ({
      key: s.key,
      label: s.label,
      href: s.href,
      subItems: [] as MenuItem["subItems"],
    }));
    const fallback: HomeMenuConfig = {};
    for (const country of DEFAULT_COUNTRIES) {
      fallback[country] = { menuItems: fallbackItems };
    }
    return fallback;
  }
}
const DEFAULT = buildDefaultConfig();

export function getHomeMenuConfig(): HomeMenuConfig {
  try {
    if (existsSync(DATA_PATH)) {
      const raw = readFileSync(DATA_PATH, "utf-8");
      const parsed = JSON.parse(raw) as HomeMenuConfig;
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {
    // fallback
  }
  return DEFAULT;
}

export function saveHomeMenuConfig(config: HomeMenuConfig): void {
  const dir = path.dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(config, null, 2));
}

export function getMenuForCountry(country: string): MenuItem[] {
  try {
    const config = getHomeMenuConfig();
    let items = config[country]?.menuItems ?? defaultMenuItems(country);
    items = applyLeaguesConfigToCalcio(items, country);
    const allowedSports = getSportsPerCountry()[country];
    if (allowedSports?.length) {
      const set = new Set<string>(allowedSports);
      items = items.filter((m) => set.has(m.key));
    }
    return items;
  } catch (e) {
    console.error("getMenuForCountry error:", e);
    try {
      return defaultMenuItems(country);
    } catch {
      return SPORTS.map((s) => ({
        key: s.key,
        label: s.label,
        href: s.href,
        subItems: [],
      }));
    }
  }
}

/** Per sport=all: restituisce leagueIds da usare per le partite. Ordine da leaguesConfig (per paese). */
export function getLeagueIdsForAllSports(country: string): number[] {
  const config = getHomeMenuConfig();
  const allConfig = config[country]?.allSportsConfig;
  const orderFromLeagues = getEnabledLeagueIds(country);
  if (allConfig?.leagueIds?.length) {
    const allowedSet = new Set(allConfig.leagueIds);
    const ordered = orderFromLeagues.filter((id) => allowedSet.has(id));
    const extra = allConfig.leagueIds.filter((id) => !orderFromLeagues.includes(id));
    return [...ordered, ...extra];
  }
  const calcioItem = getMenuForCountry(country).find((m) => m.key === "calcio");
  return calcioItem?.subItems?.map((s) => s.id) ?? [];
}

/** Per sport=all: restituisce quali sport mostrare (per filtri). Default: calcio se ha leagues. */
export function getSportKeysForAllSports(country: string): string[] {
  const config = getHomeMenuConfig();
  const allConfig = config[country]?.allSportsConfig;
  if (allConfig?.sportKeys?.length) return allConfig.sportKeys;
  const leagueIds = getLeagueIdsForAllSports(country);
  return leagueIds.length > 0 ? ["calcio"] : [];
}
