"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { localeToCountry, localeToCountryCode } from "@/i18n/routing";
import type {
  TelegramBannerConfig,
  TelegramBannerCountryConfig,
} from "@/lib/telegramBannerConfig";

const COUNTRY_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(localeToCountryCode).map(([locale, code]) => [
    code,
    localeToCountry[locale] || code,
  ])
);

const DEFAULT_COUNTRY: TelegramBannerCountryConfig = {
  text: "Resta aggiornato! Iscriviti al nostro canale Telegram per pronostici e analisi.",
  buttonText: "Unisciti su Telegram",
  channelUrl: "https://t.me/playsignal",
};

export default function AdminTelegramBannerPage() {
  const [config, setConfig] = useState<TelegramBannerConfig>({});
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("IT");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const countryConfig =
    config.byCountry?.[selectedCountry] ?? DEFAULT_COUNTRY;

  useEffect(() => {
    fetch("/api/ad2min3k/telegram-banner")
      .then((r) => r.json())
      .then((data) => {
        setConfig(data.config || {});
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

  function updateCountry(field: keyof TelegramBannerCountryConfig, value: string) {
    setConfig((c) => ({
      ...c,
      byCountry: {
        ...c.byCountry,
        [selectedCountry]: {
          ...(c.byCountry?.[selectedCountry] ?? DEFAULT_COUNTRY),
          [field]: value,
        },
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/ad2min3k/telegram-banner", {
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
        <h2 className="mb-2 text-xl font-semibold">Banner Telegram</h2>
        <p className="mb-6 text-sm text-neutral-600">
          Configura il banner che invita gli utenti a iscriversi al canale
          Telegram. Il banner appare ogni 5 partite nella lista match della home.
          Configura per ogni paese: testo, bottone e link.
        </p>

        {/* Selezione paese */}
        <div className="mb-6">
          <p className="mb-2 text-xs font-medium uppercase text-neutral-500">
            Paese
          </p>
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
                {COUNTRY_NAMES[code] ?? code}
              </button>
            ))}
          </div>
        </div>

        {/* Form per paese selezionato */}
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Testo del banner
            </label>
            <textarea
              value={countryConfig.text}
              onChange={(e) => updateCountry("text", e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Resta aggiornato! Iscriviti al nostro canale Telegram..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Testo del bottone
            </label>
            <input
              type="text"
              value={countryConfig.buttonText}
              onChange={(e) => updateCountry("buttonText", e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Unisciti su Telegram"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Link al canale Telegram
            </label>
            <input
              type="url"
              value={countryConfig.channelUrl}
              onChange={(e) => updateCountry("channelUrl", e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="https://t.me/playsignal"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Se vuoto, il banner non viene mostrato per questo paese.
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-6">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Salvataggio…" : "Salva"}
          </button>
        </div>
      </div>
    </main>
  );
}
