"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { localeToCountry, localeToCountryCode } from "@/i18n/routing";
import type { BonusOrderConfig } from "@/lib/bonusOrderConfig";

const COUNTRY_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(localeToCountryCode).map(([locale, code]) => [
    code,
    localeToCountry[locale] || code,
  ])
);

function applyOrder(
  bookmakers: { id: string; name: string }[],
  order: string[] | undefined
): { id: string; name: string }[] {
  if (!order?.length) return bookmakers;
  const byId = new Map(bookmakers.map((b) => [b.id, b]));
  const result: { id: string; name: string }[] = [];
  for (const id of order) {
    const b = byId.get(id);
    if (b) result.push(b);
  }
  for (const b of bookmakers) {
    if (!order.includes(b.id)) result.push(b);
  }
  return result;
}

export default function AdminBonusPage() {
  const [config, setConfig] = useState<BonusOrderConfig>({});
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("IT");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [bookmakersByCountry, setBookmakersByCountry] = useState<
    Record<string, { id: string; name: string }[]>
  >({});

  const bookmakersWithBonus = bookmakersByCountry[selectedCountry] || [];
  const order = config.byCountry?.[selectedCountry];
  const orderedList = applyOrder(bookmakersWithBonus, order);

  useEffect(() => {
    fetch("/api/ad2min3k/bonus")
      .then((r) => r.json())
      .then((data) => {
        setConfig(data.config || {});
        setCountries(data.countries || ["IT", "FR", "ES", "DE", "UK", "BR", "NG", "KE", "GH"]);
        setBookmakersByCountry(data.bookmakersByCountry || {});
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

  function moveItem(fromIndex: number, toIndex: number) {
    const ids = orderedList.map((b) => b.id);
    const [removed] = ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, removed);
    setConfig((c) => ({
      ...c,
      byCountry: {
        ...c.byCountry,
        [selectedCountry]: ids,
      },
    }));
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.setData("application/json", JSON.stringify({ id }));
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(id);
  }

  function handleDragLeave() {
    setDragOverId(null);
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    setDraggedId(null);
    setDragOverId(null);
    const fromIndex = orderedList.findIndex((b) => b.id === draggedId);
    const toIndex = orderedList.findIndex((b) => b.id === targetId);
    if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
      moveItem(fromIndex, toIndex);
    }
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDragOverId(null);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/ad2min3k/bonus", {
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
        <h2 className="mb-2 text-xl font-semibold">Ordine bonus per paese</h2>
        <p className="mb-6 text-sm text-neutral-600">
          Trascina i bonus per definire l&apos;ordine di visualizzazione nella pagina Bonus.
          L&apos;ordine è specifico per ogni paese.
        </p>

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

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase text-neutral-500">
            Trascina per riordinare ({orderedList.length} bonus)
          </p>
          {orderedList.length === 0 ? (
            <p className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
              Nessun bonus configurato per questo paese. Aggiungi una descrizione bonus
              nella scheda del bookmaker (Admin → Bookmaker → paese).
            </p>
          ) : (
            <ul className="space-y-2">
              {orderedList.map((bm) => (
                <li
                  key={bm.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, bm.id)}
                  onDragOver={(e) => handleDragOver(e, bm.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, bm.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex cursor-grab items-center gap-3 rounded-lg border p-3 transition active:cursor-grabbing ${
                    draggedId === bm.id
                      ? "opacity-50"
                      : dragOverId === bm.id
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-neutral-200 bg-white hover:bg-neutral-50"
                  }`}
                >
                  <span
                    className="text-neutral-400"
                    aria-hidden
                  >
                    ⋮⋮
                  </span>
                  <span className="font-medium">{bm.name}</span>
                  <span className="text-xs text-neutral-400">({bm.id})</span>
                </li>
              ))}
            </ul>
          )}
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
