/**
 * Alias per matching nomi squadre tra API-Football e bookmaker.
 * Formato: canonical (API-Football) -> [varianti usate dai bookmaker]
 */
import { existsSync, readFileSync } from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "data", "teamAliases.json");

export type TeamAliasesConfig = Record<string, string[]>;

export function getTeamAliases(): TeamAliasesConfig {
  try {
    if (existsSync(DATA_PATH)) {
      const raw = readFileSync(DATA_PATH, "utf-8");
      return (JSON.parse(raw) as TeamAliasesConfig) ?? {};
    }
  } catch {
    // fallback vuoto
  }
  return {};
}

/**
 * Verifica se due nomi squadra corrispondono (con alias).
 */
export function matchTeamNames(a: string, b: string): boolean {
  if (!a || !b) return false;
  const aNorm = a.toLowerCase().trim();
  const bNorm = b.toLowerCase().trim();
  if (aNorm === bNorm) return true;
  if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) return true;
  if (aNorm.split(/\s+/)[0] === bNorm.split(/\s+/)[0]) return true;

  const aliases = getTeamAliases();
  const aVariants = new Set<string>([aNorm]);
  const bVariants = new Set<string>([bNorm]);
  for (const [canonical, variants] of Object.entries(aliases)) {
    const all = [canonical.toLowerCase(), ...variants.map((v) => v.toLowerCase())];
    if (all.some((v) => v === aNorm || aNorm.includes(v) || v.includes(aNorm))) all.forEach((x) => aVariants.add(x));
    if (all.some((v) => v === bNorm || bNorm.includes(v) || v.includes(bNorm))) all.forEach((x) => bVariants.add(x));
  }

  for (const va of aVariants) {
    for (const vb of bVariants) {
      if (va === vb || va.includes(vb) || vb.includes(va)) return true;
    }
  }
  return false;
}
