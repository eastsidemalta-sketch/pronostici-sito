"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AliasesConfig = Record<string, string[]>;

export default function AdminTeamAliasesPage() {
  const [aliases, setAliases] = useState<AliasesConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/ad2min3k/team-aliases")
      .then((r) => r.json())
      .then((data) => setAliases(data.aliases ?? {}))
      .catch(() => setError("Errore caricamento"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    const cleaned = Object.fromEntries(
      Object.entries(aliases).filter(([k]) => k.trim() !== "")
    );
    try {
      const res = await fetch("/api/ad2min3k/team-aliases", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aliases: cleaned }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Errore salvataggio");
        return;
      }
    } catch {
      setError("Errore di connessione");
    } finally {
      setSaving(false);
    }
  }

  function addEntry() {
    setAliases((prev) => ({ ...prev, "": [""] }));
  }

  function updateKey(oldKey: string, newKey: string) {
    if (oldKey === newKey) return;
    const next = { ...aliases };
    const val = next[oldKey];
    delete next[oldKey];
    next[newKey] = val ?? [];
    setAliases(next);
  }

  function updateVariants(canonical: string, variants: string[]) {
    setAliases((prev) => ({ ...prev, [canonical]: variants }));
  }

  function removeEntry(key: string) {
    const next = { ...aliases };
    delete next[key];
    setAliases(next);
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-neutral-600">Caricamento…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/ad2min3k" className="text-sm text-neutral-600 hover:text-neutral-900">
          ← Dashboard
        </Link>
      </div>

      <h2 className="text-2xl font-semibold mb-2">Alias nomi squadre</h2>
      <p className="text-sm text-neutral-600 mb-6">
        Mappa nomi canonici (API-Football) alle varianti usate dai bookmaker. Usato per il matching automatico delle quote.
      </p>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="space-y-4 mb-6">
        {Object.entries(aliases).map(([canonical, variants]) => (
          <div
            key={canonical}
            className="flex flex-wrap items-start gap-2 rounded-lg border bg-white p-4"
          >
            <input
              type="text"
              value={canonical}
              onChange={(e) => updateKey(canonical, e.target.value)}
              placeholder="Nome canonico (es. Inter)"
              className="min-w-[140px] rounded border px-3 py-2 text-sm"
            />
            <span className="text-neutral-400">→</span>
            <input
              type="text"
              value={(variants ?? []).join(", ")}
              onChange={(e) =>
                updateVariants(
                  canonical,
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                )
              }
              placeholder="Varianti separate da virgola (es. Inter Milan, FC Internazionale)"
              className="min-w-[280px] flex-1 rounded border px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => removeEntry(canonical)}
              className="rounded border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Rimuovi
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={addEntry}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          + Aggiungi squadra
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? "Salvataggio…" : "Salva"}
        </button>
      </div>
    </main>
  );
}
