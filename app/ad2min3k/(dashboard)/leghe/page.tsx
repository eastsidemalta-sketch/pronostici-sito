"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CALCIO_COMPETITIONS } from "@/lib/homeMenu";

type Bookmaker = {
  id: string;
  siteId?: string;
  name: string;
  apiProvider?: string;
  apiEndpoint?: string | null;
  apiLeagueMapping?: Record<string, string>;
};

export default function LeagueMappingPage() {
  const [bookmakers, setBookmakers] = useState<Bookmaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/ad2min3k/bookmakers")
      .then((r) => r.json())
      .then((data) => {
        const withApi = (data.bookmakers ?? []).filter(
          (b: Bookmaker) =>
            b.apiProvider === "direct" && b.apiEndpoint
        );
        setBookmakers(withApi);
      })
      .catch(() => setBookmakers([]))
      .finally(() => setLoading(false));
  }, []);

  function updateMapping(bmId: string, apiFootballId: string, bookmakerId: string) {
    const bm = bookmakers.find((b) => b.id === bmId);
    if (!bm) return;
    const next = { ...(bm.apiLeagueMapping ?? {}) };
    if (bookmakerId.trim()) {
      next[apiFootballId] = bookmakerId.trim();
    } else {
      delete next[apiFootballId];
    }
    setBookmakers((prev) =>
      prev.map((b) =>
        b.id === bmId ? { ...b, apiLeagueMapping: next } : b
      )
    );
  }

  function removeMapping(bmId: string, apiFootballId: string) {
    updateMapping(bmId, apiFootballId, "");
  }

  async function saveBookmaker(bm: Bookmaker) {
    setSaving((s) => ({ ...s, [bm.id]: true }));
    setError("");
    try {
      const res = await fetch("/api/ad2min3k/bookmakers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...bm,
          apiLeagueMapping: bm.apiLeagueMapping ?? {},
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Errore ${res.status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore salvataggio");
    } finally {
      setSaving((s) => ({ ...s, [bm.id]: false }));
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-neutral-600">Caricamento...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/ad2min3k"
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            ← Dashboard
          </Link>
          <h2 className="mt-1 text-2xl font-semibold">
            Mapping leghe API Football ↔ Bookmaker
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Associa gli ID delle competizioni API Football con gli ID categoria
            dei bookmaker (es. Betboom). Senza mapping si usa il fallback (tutte
            le categorie).
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {bookmakers.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-neutral-600">
            Nessun bookmaker con API diretta configurato. Aggiungi un bookmaker
            con apiProvider &quot;direct&quot; e apiEndpoint.
          </div>
        ) : (
          bookmakers.map((bm) => (
            <div
              key={bm.id}
              className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">
                  {bm.name}
                  {bm.siteId && (
                    <span className="ml-2 text-sm font-normal text-neutral-500">
                      ({bm.siteId})
                    </span>
                  )}
                </h3>
                <button
                  type="button"
                  onClick={() => saveBookmaker(bm)}
                  disabled={saving[bm.id]}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving[bm.id] ? "Salvataggio..." : "Salva"}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50">
                      <th className="px-4 py-2 text-left font-medium">
                        API Football
                      </th>
                      <th className="px-4 py-2 text-left font-medium">
                        ID Bookmaker
                      </th>
                      <th className="w-20 px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {CALCIO_COMPETITIONS.map((comp) => {
                      const bookmakerId =
                        bm.apiLeagueMapping?.[String(comp.id)] ?? "";
                      return (
                        <tr
                          key={comp.id}
                          className="border-b border-neutral-100 hover:bg-neutral-50/50"
                        >
                          <td className="px-4 py-2">
                            <span className="font-medium">{comp.name}</span>
                            <span className="ml-2 text-neutral-500">
                              (ID: {comp.id})
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={bookmakerId}
                              onChange={(e) =>
                                updateMapping(
                                  bm.id,
                                  String(comp.id),
                                  e.target.value
                                )
                              }
                              placeholder="ID categoria bookmaker"
                              className="w-full max-w-[180px] rounded border border-neutral-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-2">
                            {bookmakerId && (
                              <button
                                type="button"
                                onClick={() =>
                                  removeMapping(bm.id, String(comp.id))
                                }
                                className="text-xs text-red-600 hover:underline"
                              >
                                Rimuovi
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 text-xs text-neutral-500">
                Per ottenere gli ID categoria:{" "}
                <code className="rounded bg-neutral-100 px-1">
                  GET /api/debug-betboom-categories
                </code>{" "}
                (sul server, IP whitelist Betboom).
              </p>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
