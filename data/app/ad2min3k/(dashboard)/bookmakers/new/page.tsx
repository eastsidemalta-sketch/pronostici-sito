"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminNewBookmakerPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("IT");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/ad2min3k/bookmakers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || "Nuovo sito", country }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Errore nella creazione");
        return;
      }
      router.push(`/ad2min3k/bookmakers/${data.bookmaker.id}`);
      router.refresh();
    } catch {
      setError("Errore di connessione");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/ad2min3k/bookmakers"
          className="text-sm text-neutral-600 hover:text-neutral-900"
        >
          ← Siti di scommesse
        </Link>
      </div>

      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-xl font-semibold">Nuovo sito di scommesse</h2>
        <p className="mb-6 text-sm text-neutral-600">
          L&apos;ID viene generato dal paese dove crei il sito e dove sarà
          visibile (es. IT → IT-0001, BR → BR-0001). Usalo per bonus, API e
          integrazioni.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Nome
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Es. Bet365, PMU"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Paese (mercato dove sarà visibile)
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
              maxLength={2}
              className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="IT"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Paese dove crei il sito e dove apparirà sul sito. Determina
              l&apos;ID: {country || "IT"}-0001, {country || "IT"}-0002…
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-emerald-600 px-6 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {creating ? "Creazione…" : "Crea"}
            </button>
            <Link
              href="/ad2min3k/bookmakers"
              className="rounded-lg border px-6 py-2 font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Annulla
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
