/**
 * Mapping categorie per provider: nostra categoria → varianti usate dal provider.
 * Formato: { providerKey: { nostraCategoria: string[] } }
 * Usato per matchare Over, Under, 1X2, ecc. tra il nostro sito e i bookmaker.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "data", "categoryMappingByProvider.json");

export type CategoryMapping = Record<string, string[]>;
export type CategoryMappingByProviderConfig = Record<string, CategoryMapping>;

const DEFAULT_CATEGORIES = ["1X2", "Over/Under", "Handicap", "Double Chance", "Gol/No Gol"];

function load(): CategoryMappingByProviderConfig {
  try {
    if (existsSync(DATA_PATH)) {
      const raw = readFileSync(DATA_PATH, "utf-8");
      return (JSON.parse(raw) as CategoryMappingByProviderConfig) ?? {};
    }
  } catch {
    // fallback
  }
  return {};
}

export function getCategoryMappingByProvider(): CategoryMappingByProviderConfig {
  return load();
}

export function saveCategoryMappingByProvider(config: CategoryMappingByProviderConfig): void {
  const dir = path.dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(config, null, 2));
}

export function getDefaultCategories(): string[] {
  return [...DEFAULT_CATEGORIES];
}
