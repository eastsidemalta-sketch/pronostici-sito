"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CALCIO_COMPETITIONS } from "@/lib/homeMenu";
import { localeToCountry, localeToCountryCode } from "@/i18n/routing";
import {
  getSportsWithCompetitions,
  getCompetitionsForSport,
  type CompetitionItem,
} from "@/lib/sportsCompetitions";
import type { LeaguesConfig } from "@/lib/leaguesConfig";
import { HIDDEN_COMPETITION_IDS } from "@/lib/hiddenCompetitions";

const DEFAULT_CALCIO_IDS = CALCIO_COMPETITIONS.map((c) => c.id);

function filterHiddenFromConfig(config: LeaguesConfig): LeaguesConfig {
  if (!config.byCountry) return config;
  const next: LeaguesConfig["byCountry"] = {};
  for (const [country, cc] of Object.entries(config.byCountry)) {
    if (!cc) continue;
    const leagueIds = Array.isArray(cc.leagueIds)
      ? cc.leagueIds.filter((id) => !HIDDEN_COMPETITION_IDS.has(id))
      : undefined;
    const calcio = cc.calcio as { leagueIds?: number[] } | undefined;
    const calcioIds = calcio?.leagueIds?.filter((id) => !HIDDEN_COMPETITION_IDS.has(id));
    next[country] = {
      ...cc,
      leagueIds: leagueIds?.length ? leagueIds : undefined,
      calcio: calcioIds?.length ? { leagueIds: calcioIds } : undefined,
    };
  }
  return { ...config, byCountry: next };
}

const COUNTRY_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(localeToCountryCode).map(([locale, code]) => [
    code,
    localeToCountry[locale] || code,
  ])
);

function getEnabledIds(
  config: LeaguesConfig,
  country: string,
  sportKey: string
): (number | string)[] {
  const cc = config.byCountry?.[country];
  if (!cc) {
    if (sportKey === "calcio") return config.leagueIds ?? DEFAULT_CALCIO_IDS;
    return [];
  }
  if (sportKey === "calcio") {
    const calcio = cc.calcio as { leagueIds?: number[] } | undefined;
    if (calcio?.leagueIds?.length) return calcio.leagueIds;
    const ids = cc.leagueIds;
    if (Array.isArray(ids) && ids.length) return ids;
    return config.leagueIds ?? DEFAULT_CALCIO_IDS;
  }
  const sportConfig = cc[sportKey] as { competitionIds?: string[] } | undefined;
  return sportConfig?.competitionIds ?? [];
}

function isEnabled(
  config: LeaguesConfig,
  country: string,
  sportKey: string,
  compId: number | string
): boolean {
  const ids = getEnabledIds(config, country, sportKey);
  return ids.includes(compId);
}

function toggleCompetition(
  config: LeaguesConfig,
  country: string,
  sportKey: string,
  compId: number | string
): LeaguesConfig {
  const current = getEnabledIds(config, country, sportKey);
  const ids = current.includes(compId)
    ? current.filter((id) => id !== compId)
    : [...current, compId];
  if (sportKey === "calcio") {
    const numIds = ids as number[];
    return {
      ...config,
      byCountry: {
        ...config.byCountry,
        [country]: {
          ...config.byCountry?.[country],
          leagueIds: numIds,
          calcio: { leagueIds: numIds },
        },
      },
    };
  }
  const strIds = ids as string[];
  return {
    ...config,
    byCountry: {
      ...config.byCountry,
      [country]: {
        ...config.byCountry?.[country],
        [sportKey]: { competitionIds: strIds },
      },
    },
  };
}

function reorderCompetition(
  config: LeaguesConfig,
  country: string,
  sportKey: string,
  fromIndex: number,
  toIndex: number
): LeaguesConfig {
  const ids = [...getEnabledIds(config, country, sportKey)];
  if (fromIndex < 0 || fromIndex >= ids.length || toIndex < 0 || toIndex >= ids.length) return config;
  const [removed] = ids.splice(fromIndex, 1);
  ids.splice(toIndex, 0, removed);
  if (sportKey === "calcio") {
    const numIds = ids as number[];
    return {
      ...config,
      byCountry: {
        ...config.byCountry,
        [country]: {
          ...config.byCountry?.[country],
          leagueIds: numIds,
          calcio: { leagueIds: numIds },
        },
      },
    };
  }
  const strIds = ids as string[];
  return {
    ...config,
    byCountry: {
      ...config.byCountry,
      [country]: {
        ...config.byCountry?.[country],
        [sportKey]: { competitionIds: strIds },
      },
    },
  };
}

function setAllForCountry(
  config: LeaguesConfig,
  country: string,
  sportKey: string,
  active: boolean
): LeaguesConfig {
  const comps = getCompetitionsForSport(sportKey);
  if (sportKey === "calcio") {
    const ids = active ? comps.map((c) => c.id as number) : [];
    return {
      ...config,
      byCountry: {
        ...config.byCountry,
        [country]: {
          ...config.byCountry?.[country],
          leagueIds: ids,
          calcio: { leagueIds: ids },
        },
      },
    };
  }
  const ids = active ? comps.map((c) => c.id as string) : [];
  return {
    ...config,
    byCountry: {
      ...config.byCountry,
      [country]: {
        ...config.byCountry?.[country],
        [sportKey]: { competitionIds: ids },
      },
    },
  };
}

export default function AdminLeaguesPage() {
  const [config, setConfig] = useState<LeaguesConfig>({});
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>("calcio");
  const [selectedCountry, setSelectedCountry] = useState<string>("IT");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const sports = getSportsWithCompetitions();
  const allCompetitions = getCompetitionsForSport(selectedSport);
  const competitions = allCompetitions.filter(
    (c) => !HIDDEN_COMPETITION_IDS.has(c.id)
  );

  useEffect(() => {
    fetch("/api/ad2min3k/leagues")
      .then((r) => r.json())
      .then((data) => {
        const raw = data.config || {};
        setConfig(filterHiddenFromConfig(raw));
        setCountries(data.countries || ["IT", "FR", "ES", "DE", "UK", "BR", "NG", "KE", "GH"]);
        if (data.countries?.length && !selectedCountry) {
          setSelectedCountry(data.countries[0]);
        }
      })
      .catch(() => {
        setConfig({});
        setCountries(["IT", "FR", "ES", "DE", "UK", "BR", "NG", "KE", "GH"]);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleToggle(compId: number | string) {
    setConfig((c) => toggleCompetition(c, selectedCountry, selectedSport, compId));
  }

  function handleSetAll(active: boolean) {
    setConfig((c) => setAllForCountry(c, selectedCountry, selectedSport, active));
  }

  function handleReorder(fromIndex: number, toIndex: number) {
    setConfig((c) => reorderCompetition(c, selectedCountry, selectedSport, fromIndex, toIndex));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const cleaned = filterHiddenFromConfig(config);
      const res = await fetch("/api/ad2min3k/leagues", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: cleaned }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Errore nel salvataggio");
        return;
      }
      setError("");
    } catch {
      setError("Errore di connessione");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-neutral-600">Caricamento…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/ad2min3k"
          className="text-sm text-neutral-600 hover:text-neutral-900"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-2 text-xl font-semibold">Competizioni per sport e paese</h2>
        <p className="mb-6 text-sm text-neutral-600">
          Seleziona quali competizioni mostrare per ogni sport e paese. Le
          competizioni abilitate vengono usate per le partite e i filtri.
        </p>

        {/* Tab sport */}
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase text-neutral-500">Sport</p>
          <div className="flex flex-wrap gap-2">
            {sports.map((s) => (
              <button
                key={s.sportKey}
                type="button"
                onClick={() => setSelectedSport(s.sportKey)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  selectedSport === s.sportKey
                    ? "bg-emerald-600 text-white"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab paesi */}
        <div className="mb-6">
          <p className="mb-2 text-xs font-medium uppercase text-neutral-500">Paese</p>
          <div className="flex flex-wrap gap-2">
            {countries.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setSelectedCountry(code)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  selectedCountry === code
                    ? "bg-emerald-600 text-white"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                {COUNTRY_NAMES[code] || code} ({code})
              </button>
            ))}
          </div>
        </div>

        {/* Competizioni per sport+paese */}
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => handleSetAll(true)}
            className="text-sm text-emerald-600 hover:underline"
          >
            Tutte
          </button>
          <button
            type="button"
            onClick={() => handleSetAll(false)}
            className="text-sm text-neutral-500 hover:underline"
          >
            Nessuna
          </button>
        </div>

        <p className="mb-2 text-xs text-neutral-500">
          Competizioni abilitate (trascina per riordinare):
        </p>
        <div className="mb-4 space-y-2">
          {(() => {
            const enabledIds = getEnabledIds(config, selectedCountry, selectedSport);
            const compById = Object.fromEntries(competitions.map((c) => [String(c.id), c]));
            const enabledComps = enabledIds
              .map((id) => compById[String(id)])
              .filter(Boolean) as CompetitionItem[];
            return enabledComps.map((comp, index) => (
              <div
                key={String(comp.id)}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", String(index));
                  e.dataTransfer.effectAllowed = "move";
                  (e.target as HTMLElement).classList.add("opacity-50");
                }}
                onDragEnd={(e) => {
                  (e.target as HTMLElement).classList.remove("opacity-50");
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
                  if (!isNaN(from) && from !== index) handleReorder(from, index);
                }}
                className="flex cursor-grab items-center gap-2 rounded-lg border border-neutral-200 bg-white p-3 active:cursor-grabbing hover:bg-neutral-50"
              >
                <span className="text-neutral-400" aria-hidden>⋮⋮</span>
                <input
                  type="checkbox"
                  checked
                  onChange={() => handleToggle(comp.id)}
                  className="rounded border-neutral-300"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="font-medium">{comp.name}</span>
                <span className="text-xs text-neutral-400">
                  ({comp.type === "league" ? "campionato" : "coppa"})
                </span>
              </div>
            ));
          })()}
        </div>

        <p className="mb-2 text-xs text-neutral-500">
          Competizioni non abilitate:
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {competitions
            .filter((comp) => !isEnabled(config, selectedCountry, selectedSport, comp.id))
            .map((comp: CompetitionItem) => (
              <label
                key={String(comp.id)}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50"
              >
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => handleToggle(comp.id)}
                  className="rounded border-neutral-300"
                />
                <span className="font-medium">{comp.name}</span>
                <span className="text-xs text-neutral-400">
                  ({comp.type === "league" ? "campionato" : "coppa"})
                </span>
              </label>
            ))}
        </div>

        {competitions.length === 0 && (
          <p className="text-sm text-neutral-500">
            Nessuna competizione configurata per questo sport.
          </p>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-6 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Salvataggio…" : "Salva"}
          </button>
        </div>
      </div>
    </main>
  );
}
