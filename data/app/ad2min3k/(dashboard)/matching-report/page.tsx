"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function ManualAliasForm({
  onApply,
  applying,
}: {
  onApply: (apiFootball: string, bookmakerVariant: string) => void;
  applying: string | null;
}) {
  const [apiFootball, setApiFootball] = useState("");
  const [bookmakerVariant, setBookmakerVariant] = useState("");
  return (
    <div className="flex flex-wrap gap-2">
      <input
        type="text"
        value={apiFootball}
        onChange={(e) => setApiFootball(e.target.value)}
        placeholder="Nome API-Football (es. Inter)"
        className="rounded border px-3 py-2 text-sm min-w-[140px]"
      />
      <span className="self-center text-neutral-400">→</span>
      <input
        type="text"
        value={bookmakerVariant}
        onChange={(e) => setBookmakerVariant(e.target.value)}
        placeholder="Variante bookmaker (es. Inter Milan)"
        className="rounded border px-3 py-2 text-sm min-w-[160px]"
      />
      <button
        type="button"
        onClick={() => {
          if (apiFootball.trim() && bookmakerVariant.trim()) {
            onApply(apiFootball.trim(), bookmakerVariant.trim());
            setApiFootball("");
            setBookmakerVariant("");
          }
        }}
        disabled={!apiFootball.trim() || !bookmakerVariant.trim() || applying != null}
        className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        Applica
      </button>
    </div>
  );
}

function ManualLeagueForm({
  onApply,
  applying,
  onSuccess,
}: {
  onApply: (bookmakerId: string, leagueId: number, suggestedValue: string) => void;
  applying: string | null;
  onSuccess: () => void;
}) {
  const [bookmakers, setBookmakers] = useState<Array<{ id: string; name: string; displayName?: string }>>([]);
  const [bookmakerId, setBookmakerId] = useState("");
  const [leagueId, setLeagueId] = useState("");
  const [suggestedValue, setSuggestedValue] = useState("");

  useEffect(() => {
    fetch("/api/ad2min3k/bookmakers")
      .then((r) => r.json())
      .then((d) =>
        setBookmakers(
          (d.bookmakers ?? []).filter((b: { apiProvider?: string }) => b.apiProvider === "direct")
        )
      )
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={bookmakerId}
        onChange={(e) => setBookmakerId(e.target.value)}
        className="rounded border px-3 py-2 text-sm min-w-[160px]"
      >
        <option value="">Bookmaker</option>
        {bookmakers.map((b) => (
          <option key={b.id} value={b.id}>
            {b.displayName || b.name}
          </option>
        ))}
      </select>
      <input
        type="number"
        value={leagueId}
        onChange={(e) => setLeagueId(e.target.value)}
        placeholder="League ID (es. 135)"
        className="rounded border px-3 py-2 text-sm w-28"
      />
      <input
        type="text"
        value={suggestedValue}
        onChange={(e) => setSuggestedValue(e.target.value)}
        placeholder="ID bookmaker (es. serie_a)"
        className="rounded border px-3 py-2 text-sm min-w-[120px]"
      />
      <button
        type="button"
        onClick={() => {
          if (bookmakerId && leagueId) {
            onApply(bookmakerId, parseInt(leagueId, 10), suggestedValue.trim());
            setLeagueId("");
            setSuggestedValue("");
            onSuccess();
          }
        }}
        disabled={!bookmakerId || !leagueId || applying != null}
        className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        Applica
      </button>
    </div>
  );
}

type MatchResult = {
  fixtureId: number;
  leagueId?: number;
  leagueName?: string;
  apiHome: string;
  apiAway: string;
  bookmakerKey: string;
  bookmakerName: string;
  bmHome: string;
  bmAway: string;
  odds: { home: number; draw: number; away: number };
  matched: boolean;
};

type TeamSuggestion = {
  apiFootball: string;
  bookmakerVariant: string;
  bookmakerId: string;
  bookmakerName: string;
  fixtureId: number;
  match: "home" | "away";
};

type LeagueSuggestion = {
  leagueId: number;
  leagueName: string;
  bookmakerId: string;
  bookmakerName: string;
  suggestedValue?: string;
  reason: string;
};

type Report = {
  lastRun: string | null;
  summary: {
    totalFixtures: number;
    totalMatches: number;
    totalUnmatched: number;
    byBookmaker: Record<string, { matched: number; unmatched: number; errors?: string[] }>;
  };
  matches: MatchResult[];
  unmatched: MatchResult[];
  teamSuggestions: TeamSuggestion[];
  leagueSuggestions: LeagueSuggestion[];
};

export default function AdminMatchingReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"summary" | "matched" | "unmatched" | "suggestions" | "manual">("summary");

  function loadReport() {
    setLoading(true);
    setError("");
    fetch("/api/ad2min3k/matching-report")
      .then((r) => r.json())
      .then(setReport)
      .catch(() => setError("Errore caricamento"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadReport();
  }, []);

  async function runReport() {
    setRunning(true);
    setError("");
    try {
      const res = await fetch("/api/ad2min3k/matching-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Errore esecuzione");
        return;
      }
      setReport(data);
    } catch {
      setError("Errore di connessione");
    } finally {
      setRunning(false);
    }
  }

  async function applySuggestion(
    type: "team_alias" | "league_mapping",
    payload: Record<string, unknown>
  ) {
    const key =
      type === "team_alias"
        ? `team_alias${payload.apiFootball}|${payload.bookmakerVariant}`
        : `league_mapping${payload.bookmakerId}|${payload.leagueId}`;
    setApplying(key);
    setError("");
    try {
      const res = await fetch("/api/ad2min3k/matching-report/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...payload }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Errore");
        return;
      }
      loadReport();
    } catch {
      setError("Errore");
    } finally {
      setApplying(null);
    }
  }

  if (loading && !report) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-neutral-600">Caricamento…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/ad2min3k" className="text-sm text-neutral-600 hover:text-neutral-900">
          ← Dashboard
        </Link>
      </div>

      <h2 className="text-2xl font-semibold mb-2">Report matching automatico</h2>
      <p className="text-sm text-neutral-600 mb-6">
        Analizza il matching tra partite (API-Football) e quote (bookmaker). Esegui il report, controlla i risultati e applica le correzioni suggerite.
      </p>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-6 flex gap-3">
        <button
          type="button"
          onClick={runReport}
          disabled={running}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {running ? "Esecuzione…" : "Esegui report"}
        </button>
        <button
          type="button"
          onClick={loadReport}
          disabled={loading}
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          Aggiorna
        </button>
      </div>

      {report?.lastRun && (
        <p className="mb-6 text-xs text-neutral-500">
          Ultimo report: {new Date(report.lastRun).toLocaleString("it-IT")}
        </p>
      )}

      <div className="mb-4 flex gap-2 border-b">
        {(["summary", "matched", "unmatched", "suggestions", "manual"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t ? "border-b-2 border-emerald-600 text-emerald-700" : "text-neutral-600"
            }`}
          >
            {t === "summary" && "Riepilogo"}
            {t === "matched" && `Matchati (${report?.matches?.length ?? 0})`}
            {t === "unmatched" && `Non matchati (${report?.unmatched?.length ?? 0})`}
            {t === "suggestions" && `Suggerimenti (${(report?.teamSuggestions?.length ?? 0) + (report?.leagueSuggestions?.length ?? 0)})`}
            {t === "manual" && "Mapping manuale"}
          </button>
        ))}
      </div>

      {tab === "summary" && report && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-white p-4">
              <p className="text-2xl font-bold">{report.summary.totalFixtures}</p>
              <p className="text-sm text-neutral-600">Partite analizzate</p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-2xl font-bold text-green-700">{report.summary.totalMatches}</p>
              <p className="text-sm text-neutral-600">Match riusciti</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-2xl font-bold text-amber-700">{report.summary.totalUnmatched}</p>
              <p className="text-sm text-neutral-600">Non matchati</p>
            </div>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <h3 className="font-semibold mb-3">Per bookmaker</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Bookmaker</th>
                    <th className="text-right py-2">Matchati</th>
                    <th className="text-right py-2">Non matchati</th>
                    <th className="text-left py-2">Errori</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(report.summary.byBookmaker ?? {}).map(([id, s]) => (
                    <tr key={id} className="border-b">
                      <td className="py-2">{id}</td>
                      <td className="text-right text-green-600">{s.matched}</td>
                      <td className="text-right text-amber-600">{s.unmatched}</td>
                      <td className="text-xs text-red-600">{s.errors?.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "matched" && report && (
        <div className="rounded-lg border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-neutral-50">
                <th className="text-left p-3">Partita (API)</th>
                <th className="text-left p-3">Bookmaker</th>
                <th className="text-left p-3">Nomi bookmaker</th>
                <th className="text-right p-3">Quote 1-X-2</th>
              </tr>
            </thead>
            <tbody>
              {report.matches.slice(0, 100).map((m, i) => (
                <tr key={i} className="border-b">
                  <td className="p-3">{m.apiHome} – {m.apiAway}</td>
                  <td className="p-3">{m.bookmakerName}</td>
                  <td className="p-3 text-neutral-600">{m.bmHome} – {m.bmAway}</td>
                  <td className="p-3 text-right">{m.odds.home.toFixed(2)} / {m.odds.draw.toFixed(2)} / {m.odds.away.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.matches.length > 100 && (
            <p className="p-3 text-xs text-neutral-500">Mostrati 100 di {report.matches.length}</p>
          )}
        </div>
      )}

      {tab === "unmatched" && report && (
        <div className="rounded-lg border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-neutral-50">
                <th className="text-left p-3">Partita (API)</th>
                <th className="text-left p-3">Bookmaker</th>
                <th className="text-left p-3">Nomi bookmaker</th>
                <th className="text-left p-3">Lega</th>
              </tr>
            </thead>
            <tbody>
              {report.unmatched.map((m, i) => (
                <tr key={i} className="border-b">
                  <td className="p-3">{m.apiHome} – {m.apiAway}</td>
                  <td className="p-3">{m.bookmakerName}</td>
                  <td className="p-3 text-amber-700">{m.bmHome} – {m.bmAway}</td>
                  <td className="p-3 text-neutral-600">{m.leagueName ?? m.leagueId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "suggestions" && report && (
        <div className="space-y-6">
          {report.teamSuggestions.length > 0 && (
            <div className="rounded-lg border bg-white p-4">
              <h3 className="font-semibold mb-3">Suggerimenti alias squadre</h3>
              <p className="text-sm text-neutral-600 mb-4">
                Aggiungi queste varianti agli alias per migliorare il matching.
              </p>
              <div className="space-y-2">
                {report.teamSuggestions.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded border p-3"
                  >
                    <div>
                      <span className="font-medium">{s.apiFootball}</span>
                      <span className="text-neutral-400 mx-2">→</span>
                      <span className="text-neutral-600">{s.bookmakerVariant}</span>
                      <span className="text-xs text-neutral-400 ml-2">({s.bookmakerName})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        applySuggestion("team_alias", {
                          apiFootball: s.apiFootball,
                          bookmakerVariant: s.bookmakerVariant,
                        })
                      }
                      disabled={applying != null}
                      className="rounded bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {applying === `team_alias${s.apiFootball}|${s.bookmakerVariant}` ? "…" : "Applica"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {report.leagueSuggestions.length > 0 && (
            <div className="rounded-lg border bg-white p-4">
              <h3 className="font-semibold mb-3">Suggerimenti mapping leghe</h3>
              <p className="text-sm text-neutral-600 mb-4">
                Aggiungi il mapping lega per i bookmaker con API diretta.
              </p>
              <div className="space-y-2">
                {report.leagueSuggestions.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded border p-3"
                  >
                    <div>
                      <span className="font-medium">{s.leagueName}</span>
                      <span className="text-neutral-400 mx-2">(ID: {s.leagueId})</span>
                      <span className="text-neutral-400 mx-2">→</span>
                      <span className="text-neutral-600">{s.bookmakerName}</span>
                      {s.suggestedValue && (
                        <span className="text-xs text-neutral-500 ml-2">
                          suggerito: {s.suggestedValue}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        applySuggestion("league_mapping", {
                          bookmakerId: s.bookmakerId,
                          leagueId: s.leagueId,
                          suggestedValue: s.suggestedValue,
                        })
                      }
                      disabled={applying != null}
                      className="rounded bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {applying === `league_mapping${s.bookmakerId}|${s.leagueId}` ? "…" : "Applica"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {report.teamSuggestions.length === 0 && report.leagueSuggestions.length === 0 && (
            <p className="text-neutral-600">Nessun suggerimento automatico.</p>
          )}
        </div>
      )}

      {tab === "manual" && (
        <div className="space-y-6">
          <div className="rounded-lg border bg-white p-6">
            <h3 className="font-semibold mb-3">Aggiungi alias squadra</h3>
            <p className="text-sm text-neutral-600 mb-4">
              Per partite non matchate: aggiungi la variante del bookmaker come alias del nome API-Football.
            </p>
            <ManualAliasForm
              onApply={(apiFootball, bookmakerVariant) =>
                applySuggestion("team_alias", { apiFootball, bookmakerVariant })
              }
              applying={applying}
            />
          </div>
          <div className="rounded-lg border bg-white p-6">
            <h3 className="font-semibold mb-3">Aggiungi mapping lega</h3>
            <p className="text-sm text-neutral-600 mb-4">
              Per bookmaker con API diretta: mappa leagueId (API-Football) all&apos;identificatore usato dal bookmaker.
            </p>
            <ManualLeagueForm
              onApply={(bookmakerId, leagueId, suggestedValue) =>
                applySuggestion("league_mapping", {
                  bookmakerId,
                  leagueId,
                  suggestedValue,
                })
              }
              applying={applying}
              onSuccess={loadReport}
            />
          </div>
          <div className="rounded-lg border bg-neutral-50 p-4">
            <p className="text-sm text-neutral-600">
              Oppure modifica in bulk:{" "}
              <Link href="/ad2min3k/team-aliases" className="text-emerald-600 hover:underline">
                Alias squadre
              </Link>
              {" · "}
              <Link href="/ad2min3k/bookmakers" className="text-emerald-600 hover:underline">
                Bookmaker
              </Link>
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
