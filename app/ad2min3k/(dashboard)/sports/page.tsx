"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  SPORTS,
  type SportsConfig,
  type SportKey,
} from "@/lib/sportsPerCountry";
import { localeToCountryCode, localeToCountry, routing } from "@/i18n/routing";

const COUNTRIES = Object.entries(localeToCountryCode).map(([locale, code]) => ({
  code,
  name: localeToCountry[locale] || code,
}));

const LOCALE_LABELS: Record<string, string> = {
  it: "Italiano",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  en: "English",
  "pt-BR": "Português (BR)",
  "en-NG": "English (Nigeria)",
  "en-KE": "English (Kenya)",
  "en-GH": "English (Ghana)",
};

export default function AdminSportsPage() {
  const [config, setConfig] = useState<SportsConfig>({
    sports: {},
    localePerCountry: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/ad2min3k/sports")
      .then((r) => r.json())
      .then((data) => {
        const c = data.config;
        setConfig({
          sports: c?.sports || {},
          localePerCountry: c?.localePerCountry || {},
        });
      })
      .catch(() =>
        setConfig({ sports: {}, localePerCountry: {} })
      )
      .finally(() => setLoading(false));
  }, []);

  function toggleSport(country: string, sport: SportKey) {
    const list = config.sports[country] || [...SPORTS.map((s) => s.key)];
    const has = list.includes(sport);
    const next = has
      ? list.filter((s) => s !== sport)
      : [...list, sport];
    setConfig({
      ...config,
      sports: { ...config.sports, [country]: next },
    });
  }

  function setAllForCountry(country: string, active: boolean) {
    if (active) {
      setConfig({
        ...config,
        sports: {
          ...config.sports,
          [country]: SPORTS.map((s) => s.key),
        },
      });
    } else {
      setConfig({
        ...config,
        sports: { ...config.sports, [country]: [] },
      });
    }
  }

  function setLocaleForCountry(country: string, locale: string) {
    setConfig({
      ...config,
      localePerCountry: {
        ...config.localePerCountry,
        [country]: locale,
      },
    });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/ad2min3k/sports", {
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
        <h2 className="text-xl font-semibold mb-2">Sport attivi per paese</h2>
        <p className="mb-6 text-sm text-neutral-600">
          Seleziona quali rubriche (sport) sono visibili in ogni paese e quale
          lingua usare. Le modifiche si applicano alla pagina Pronostici e Quote.
          Se uno sport è disattivato, la ricerca match via API viene bloccata per
          quel paese (nessuna chiamata API-Football per partite di calcio).
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-semibold">Paese</th>
                <th className="px-4 py-3 text-left font-semibold">Lingua</th>
                {SPORTS.map((s) => (
                  <th
                    key={s.key}
                    className="px-4 py-3 text-center font-semibold"
                  >
                    {s.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-semibold">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody>
              {COUNTRIES.map(({ code, name }) => {
                const sports = config.sports[code] || SPORTS.map((s) => s.key);
                const locale =
                  config.localePerCountry[code] ||
                  Object.entries(localeToCountryCode).find(([, c]) => c === code)?.[0] ||
                  "it";
                return (
                  <tr key={code} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{name} ({code})</td>
                    <td className="px-4 py-3">
                      <select
                        value={locale}
                        onChange={(e) =>
                          setLocaleForCountry(code, e.target.value)
                        }
                        className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                      >
                        {routing.locales.map((loc) => (
                          <option key={loc} value={loc}>
                            {LOCALE_LABELS[loc] ?? loc}
                          </option>
                        ))}
                      </select>
                    </td>
                    {SPORTS.map((s) => (
                      <td key={s.key} className="px-4 py-3 text-center">
                        <label className="inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={sports.includes(s.key)}
                            onChange={() => toggleSport(code, s.key)}
                            className="rounded border-neutral-300"
                          />
                        </label>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAllForCountry(code, true)}
                          className="text-xs text-emerald-600 hover:underline"
                        >
                          Tutti
                        </button>
                        <button
                          type="button"
                          onClick={() => setAllForCountry(code, false)}
                          className="text-xs text-neutral-500 hover:underline"
                        >
                          Nessuno
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}

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
