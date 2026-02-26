"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Badge18Config, FooterDisclaimerConfig } from "@/lib/footerDisclaimerConfig";
import { localeToCountry } from "@/i18n/routing";
import { allUrlSegments } from "@/i18n/routing";
import RichTextEditor from "@/app/ad2min3k/components/RichTextEditor";

const LOCALES = allUrlSegments.map((locale) => ({
  locale,
  name: localeToCountry[locale] ?? locale,
}));

const SIZE_OPTIONS = [
  { value: "sm", label: "Piccolo (h-5)" },
  { value: "md", label: "Medio (h-7)" },
  { value: "lg", label: "Grande (h-9)" },
] as const;

export default function AdminFooterDisclaimerPage() {
  const [config, setConfig] = useState<FooterDisclaimerConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedLocale, setSelectedLocale] = useState<string>("it");
  const [activeTab, setActiveTab] = useState<"texts" | "badge">("texts");

  useEffect(() => {
    fetch("/api/ad2min3k/footer-disclaimer")
      .then((r) => r.json())
      .then((data) => {
        setConfig(data.config || {});
      })
      .catch(() => setConfig({}))
      .finally(() => setLoading(false));
  }, []);

  function getLines(locale: string): string[] {
    const val = config[locale];
    return Array.isArray(val) ? val : [];
  }

  function setLines(locale: string, lines: string[]) {
    setConfig((prev) => ({
      ...prev,
      [locale]: lines,
    }));
  }

  function addLine(locale: string) {
    setLines(locale, [...getLines(locale), ""]);
  }

  function updateLine(locale: string, index: number, value: string) {
    const lines = [...getLines(locale)];
    lines[index] = value;
    setLines(locale, lines);
  }

  function removeLine(locale: string, index: number) {
    const lines = getLines(locale).filter((_, i) => i !== index);
    setLines(locale, lines);
  }

  function getBadge(): Badge18Config {
    return config.badge ?? { text: "18+", color: "#1e7b45", size: "md" };
  }

  function setBadge(updates: Partial<Badge18Config>) {
    setConfig((prev) => ({
      ...prev,
      badge: {
        ...(prev.badge ?? { text: "18+", color: "#1e7b45", size: "md" }),
        ...updates,
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/ad2min3k/footer-disclaimer", {
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

  const lines = getLines(selectedLocale);
  const badge = getBadge();

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
        <h2 className="mb-2 text-xl font-semibold">Disclaimer footer</h2>
        <p className="mb-6 text-sm text-neutral-600">
          Testi del disclaimer e logo 18+ nel footer. Modifica i testi per paese
          o personalizza il cerchio con il +18.
        </p>

        <div className="mb-6 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("texts")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "texts"
                ? "bg-emerald-600 text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            Testi disclaimer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("badge")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "badge"
                ? "bg-emerald-600 text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            Logo 18+
          </button>
        </div>

        {activeTab === "badge" && (
          <div className="mb-6 space-y-4 rounded-lg border border-neutral-200 p-4">
            <h3 className="font-medium text-neutral-800">Cerchio 18+</h3>
            <p className="text-xs text-neutral-500">
              Personalizza il logo che appare prima del disclaimer nel footer.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Testo
                </label>
                <input
                  type="text"
                  value={badge.text ?? "18+"}
                  onChange={(e) => setBadge({ text: e.target.value })}
                  placeholder="18+"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Colore (es. #1e7b45)
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={badge.color ?? "#1e7b45"}
                    onChange={(e) => setBadge({ color: e.target.value })}
                    className="h-10 w-10 cursor-pointer rounded border border-neutral-300"
                  />
                  <input
                    type="text"
                    value={badge.color ?? "#1e7b45"}
                    onChange={(e) => setBadge({ color: e.target.value })}
                    placeholder="#1e7b45"
                    className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Dimensione
                </label>
                <select
                  value={badge.size ?? "md"}
                  onChange={(e) =>
                    setBadge({ size: e.target.value as Badge18Config["size"] })
                  }
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {SIZE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <span>Anteprima:</span>
              <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{
                  backgroundColor: badge.color ?? "#1e7b45",
                  ...(badge.size === "sm" && { height: "1.25rem", width: "1.25rem", fontSize: "9px" }),
                  ...(badge.size === "lg" && { height: "2.25rem", width: "2.25rem", fontSize: "13px" }),
                }}
              >
                {badge.text || "18+"}
              </span>
            </div>
          </div>
        )}

        {activeTab === "texts" && (
        <>
        <div className="mb-6 flex flex-wrap gap-2">
          {LOCALES.map(({ locale, name }) => (
            <button
              key={locale}
              type="button"
              onClick={() => setSelectedLocale(locale)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                selectedLocale === locale
                  ? "bg-emerald-600 text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              {name} ({locale})
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-neutral-800">
              Righe del disclaimer ({selectedLocale})
            </h3>
            <button
              type="button"
              onClick={() => addLine(selectedLocale)}
              className="rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
            >
              + Aggiungi riga
            </button>
          </div>
          {lines.map((line, index) => (
            <div key={index} className="flex gap-2">
              <span className="flex h-10 w-8 shrink-0 items-center text-xs text-neutral-500">
                {index + 1}
              </span>
              <div className="flex-1">
                <RichTextEditor
                  label={`Riga ${index + 1}${index === 0 ? " (con logo 18+ prima)" : ""}`}
                  value={line}
                  onChange={(v) => updateLine(selectedLocale, index, v)}
                  rows={2}
                  placeholder={`Riga ${index + 1}`}
                  preview={false}
                />
              </div>
              <button
                type="button"
                onClick={() => removeLine(selectedLocale, index)}
                className="rounded-lg px-2 text-neutral-500 hover:bg-red-50 hover:text-red-600"
                aria-label="Rimuovi riga"
              >
                ×
              </button>
            </div>
          ))}
          {lines.length === 0 && (
            <p className="text-sm text-neutral-500">
              Nessuna riga. Clicca &quot;Aggiungi riga&quot; per iniziare.
            </p>
          )}
        </div>
        </>
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
