"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  SPORTS,
  CALCIO_COMPETITIONS,
  type HomeMenuConfig,
  type MenuItem,
  type AllSportsConfig,
} from "@/lib/homeMenu";
import { localeToCountryCode, localeToCountry } from "@/i18n/routing";

const COUNTRIES = Object.entries(localeToCountryCode).map(([locale, code]) => ({
  code,
  name: localeToCountry[locale] || code,
}));

export default function AdminMenusPage() {
  const [config, setConfig] = useState<HomeMenuConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("IT");

  useEffect(() => {
    fetch("/api/ad2min3k/home-menu")
      .then((r) => r.json())
      .then((data) => {
        setConfig(data.config || {});
      })
      .catch(() => setConfig({}))
      .finally(() => setLoading(false));
  }, []);

  function getMenuItems(country: string): MenuItem[] {
    return config[country]?.menuItems ?? [];
  }

  function isSportEnabled(country: string, sportKey: string): boolean {
    const items = getMenuItems(country);
    return items.some((m) => m.key === sportKey);
  }

  function toggleSport(country: string, sportKey: string) {
    const items = [...(config[country]?.menuItems ?? [])];
    const sport = SPORTS.find((s) => s.key === sportKey);
    if (!sport) return;

    const idx = items.findIndex((m) => m.key === sportKey);
    if (idx >= 0) {
      items.splice(idx, 1);
    } else {
      items.push({
        key: sport.key,
        label: sport.label,
        href: sport.href,
        subItems:
          sport.key === "calcio"
            ? CALCIO_COMPETITIONS.map((c) => ({
                id: c.id,
                name: c.name,
                type: c.type,
              }))
            : [],
      });
    }
    setConfig({
      ...config,
      [country]: { ...config[country], menuItems: items },
    });
  }

  function reorderMenuItem(country: string, fromIndex: number, toIndex: number) {
    const items = [...(config[country]?.menuItems ?? [])];
    if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) return;
    const [removed] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, removed);
    setConfig({
      ...config,
      [country]: { ...config[country], menuItems: items },
    });
  }

  function getAllSportsConfig(country: string): AllSportsConfig {
    return (
      config[country]?.allSportsConfig ?? {
        sportKeys: ["calcio"],
        leagueIds: CALCIO_COMPETITIONS.map((c) => c.id),
      }
    );
  }

  function setAllSportsConfig(country: string, upd: Partial<AllSportsConfig>) {
    const current = getAllSportsConfig(country);
    const next: AllSportsConfig = {
      sportKeys: upd.sportKeys ?? current.sportKeys,
      leagueIds: upd.leagueIds ?? current.leagueIds,
    };
    setConfig({
      ...config,
      [country]: {
        ...config[country],
        menuItems: config[country]?.menuItems ?? [],
        allSportsConfig: next,
      },
    });
  }

  function toggleAllSportsSport(country: string, sportKey: string) {
    const current = getAllSportsConfig(country).sportKeys;
    const has = current.includes(sportKey);
    const next = has
      ? current.filter((s) => s !== sportKey)
      : [...current, sportKey];
    setAllSportsConfig(country, { sportKeys: next });
  }

  function toggleAllSportsLeague(country: string, leagueId: number) {
    const current = getAllSportsConfig(country).leagueIds;
    const has = current.includes(leagueId);
    const next = has
      ? current.filter((id) => id !== leagueId)
      : [...current, leagueId];
    next.sort((a, b) => a - b);
    setAllSportsConfig(country, { leagueIds: next });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/ad2min3k/home-menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
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
        <h2 className="mb-2 text-xl font-semibold">Menu e sottomenu per paese</h2>
        <p className="mb-6 text-sm text-neutral-600">
          Configura quali sport e competizioni mostrare nel menu della Home per
          ogni paese. Menu = sport (Calcio, Tennis, ecc.). Sottomenu =
          competizioni (Serie A, Champions, ecc.).
        </p>

        <div className="mb-6 flex gap-2">
          {COUNTRIES.map(({ code, name }) => (
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
              {name} ({code})
            </button>
          ))}
        </div>

        <div className="space-y-6">
          <p className="text-xs font-medium text-neutral-500">
            Sport nel menu (trascina per riordinare):
          </p>
          <div className="space-y-2">
            {getMenuItems(selectedCountry).map((item, index) => {
              const sport = SPORTS.find((s) => s.key === item.key);
              if (!sport) return null;
              return (
                <div
                  key={item.key}
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
                    if (!isNaN(from) && from !== index) reorderMenuItem(selectedCountry, from, index);
                  }}
                  className="flex cursor-grab items-start gap-2 rounded-lg border border-neutral-200 bg-white p-4 active:cursor-grabbing hover:bg-neutral-50"
                >
                  <span className="text-neutral-400" aria-hidden>⋮⋮</span>
                  <div className="min-w-0 flex-1">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked
                        onChange={() => toggleSport(selectedCountry, item.key)}
                        className="rounded border-neutral-300"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="font-semibold">{item.label}</span>
                    </label>
                    {item.key === "calcio" && (
                      <p className="ml-6 mt-1 text-sm text-neutral-500">
                        Le competizioni si configurano nella{" "}
                        <Link href="/ad2min3k/leagues" className="text-emerald-600 hover:underline">
                          pagina Competizioni
                        </Link>
                        .
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs font-medium text-neutral-500">
            Sport non nel menu:
          </p>
          <div className="space-y-2">
            {SPORTS.filter((s) => !isSportEnabled(selectedCountry, s.key)).map((sport) => (
              <div
                key={sport.key}
                className="rounded-lg border border-neutral-200 p-4"
              >
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggleSport(selectedCountry, sport.key)}
                    className="rounded border-neutral-300"
                  />
                  <span className="font-semibold">{sport.label}</span>
                </label>
                {sport.key !== "calcio" && (
                  <p className="ml-6 mt-1 text-sm text-neutral-500">
                    Nessuna competizione configurata per questo sport.
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-lg border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-4">
            <h3 className="mb-3 font-semibold text-emerald-800">
              Tutti gli sport
            </h3>
            <p className="mb-4 text-sm text-neutral-600">
              Configura quali sport e competizioni mostrare quando l&apos;utente
              seleziona &quot;Tutte le competizioni&quot; nella Home.
            </p>
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-neutral-500">
                Sport da includere
              </p>
              <div className="flex flex-wrap gap-2">
                {SPORTS.map((s) => (
                  <label
                    key={s.key}
                    className="flex cursor-pointer items-center gap-1.5 rounded border border-neutral-200 bg-white px-3 py-1.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={getAllSportsConfig(selectedCountry).sportKeys.includes(s.key)}
                      onChange={() => toggleAllSportsSport(selectedCountry, s.key)}
                      className="rounded"
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-neutral-500">
                Competizioni calcio (per le partite)
              </p>
              <div className="flex flex-wrap gap-2">
                {CALCIO_COMPETITIONS.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-1.5 rounded border border-neutral-200 bg-white px-2 py-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={getAllSportsConfig(selectedCountry).leagueIds.includes(c.id)}
                      onChange={() => toggleAllSportsLeague(selectedCountry, c.id)}
                      className="rounded"
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

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
