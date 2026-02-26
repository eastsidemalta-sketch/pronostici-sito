"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

function ManualLeagueFormBookmaker({
  bookmakerId,
  onApply,
  applying,
  onSuccess,
}: {
  bookmakerId: string;
  onApply: (bookmakerId: string, leagueId: number, suggestedValue: string) => void;
  applying: string | null;
  onSuccess: () => void;
}) {
  const [leagueId, setLeagueId] = useState("");
  const [suggestedValue, setSuggestedValue] = useState("");

  return (
    <div className="flex flex-wrap gap-2">
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
          if (leagueId) {
            onApply(bookmakerId, parseInt(leagueId, 10), suggestedValue.trim());
            setLeagueId("");
            setSuggestedValue("");
            onSuccess();
          }
        }}
        disabled={!leagueId || applying != null}
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
  lastRun: string;
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

export default function BookmakerMatchingReportPage() {
  const params = useParams();
  const id = params.id as string;
  const [report, setReport] = useState<Report | null>(null);
  const [bookmaker, setBookmaker] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"summary" | "matched" | "unmatched" | "suggestions" | "manual">("summary");
  const [isDirectBookmaker, setIsDirectBookmaker] = useState(false);

  useEffect(() => {
    fetch("/api/ad2min3k/bookmakers")
      .then((r) => r.json())
      .then((d) => {
        const bm = d.bookmakers?.find((b: { id: string }) => b.id === id);
        setBookmaker(bm ? { name: bm.displayName || bm.name } : null);
        setIsDirectBookmaker(bm?.apiProvider === "direct");
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/ad2min3k/matching-report?bookmakerId=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.lastRun || d.matches?.length || d.unmatched?.length) {
          setReport(d);
        }
      })
      .catch(() => {});
  }, [id]);

  async function runReport() {
    setRunning(true);
    setError("");
    try {
      const res = await fetch("/api/ad2min3k/matching-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run", bookmakerId: id }),
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
      runReport();
    } catch {
      setError("Errore");
    } finally {
      setApplying(null);
    }
  }

  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/ad2min3k/bookmakers/${id}`}
          className="text-sm text-neutral-600 hover:text-neutral-900"
        >
          ← {bookmaker?.name ?? id}
        </Link>
      </div>

      <h2 className="text-2xl font-semibold mb-2">
        Report matching — {bookmaker?.name ?? id}
      </h2>
      <p className="text-sm text-neutral-600 mb-6">
        Analizza il matching tra partite (API-Football) e quote di questo bookmaker.
      </p>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-6">
        <button
          type="button"
          onClick={runReport}
          disabled={running}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {running ? "Esecuzione…" : "Esegui report"}
        </button>
      </div>

      {report?.lastRun && (
        <p className="mb-6 text-xs text-neutral-500">
          Report: {new Date(report.lastRun).toLocaleString("it-IT")}
        </p>
      )}

      {!report && !running && (
        <p className="text-neutral-600">Clicca &quot;Esegui report&quot; per analizzare.</p>
      )}

      {report && (
        <>
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
                {t === "matched" && `Matchati (${report.matches?.length ?? 0})`}
                {t === "unmatched" && `Non matchati (${report.unmatched?.length ?? 0})`}
                {t === "suggestions" &&
                  `Suggerimenti (${(report.teamSuggestions?.length ?? 0) + (report.leagueSuggestions?.length ?? 0)})`}
                {t === "manual" && "Mapping manuale"}
              </button>
            ))}
          </div>

          {tab === "summary" && (
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
                  <p className="text-2xl font-bold text-amber-700">
                    {report.summary.totalUnmatched}
                  </p>
                  <p className="text-sm text-neutral-600">Non matchati</p>
                </div>
              </div>
            </div>
          )}

          {tab === "matched" && (
            <div className="rounded-lg border bg-white overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-neutral-50">
                    <th className="text-left p-3">Partita (API)</th>
                    <th className="text-left p-3">Nomi bookmaker</th>
                    <th className="text-right p-3">Quote 1-X-2</th>
                  </tr>
                </thead>
                <tbody>
                  {report.matches.map((m, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-3">
                        {m.apiHome} – {m.apiAway}
                      </td>
                      <td className="p-3 text-neutral-600">
                        {m.bmHome} – {m.bmAway}
                      </td>
                      <td className="p-3 text-right">
                        {m.odds.home.toFixed(2)} / {m.odds.draw.toFixed(2)} /{" "}
                        {m.odds.away.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "unmatched" && (
            <div className="rounded-lg border bg-white overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-neutral-50">
                    <th className="text-left p-3">Partita (API)</th>
                    <th className="text-left p-3">Nomi bookmaker</th>
                    <th className="text-left p-3">Lega</th>
                  </tr>
                </thead>
                <tbody>
                  {report.unmatched.map((m, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-3">
                        {m.apiHome} – {m.apiAway}
                      </td>
                      <td className="p-3 text-amber-700">
                        {m.bmHome} – {m.bmAway}
                      </td>
                      <td className="p-3 text-neutral-600">{m.leagueName ?? m.leagueId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "suggestions" && (
            <div className="space-y-6">
              {report.teamSuggestions.length > 0 && (
                <div className="rounded-lg border bg-white p-4">
                  <h3 className="font-semibold mb-3">Suggerimenti alias squadre</h3>
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
                          {applying === `team_alias${s.apiFootball}|${s.bookmakerVariant}`
                            ? "…"
                            : "Applica"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {report.leagueSuggestions.length > 0 && (
                <div className="rounded-lg border bg-white p-4">
                  <h3 className="font-semibold mb-3">Suggerimenti mapping leghe</h3>
                  <div className="space-y-2">
                    {report.leagueSuggestions.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded border p-3"
                      >
                        <div>
                          <span className="font-medium">{s.leagueName}</span>
                          <span className="text-neutral-400 mx-2">(ID: {s.leagueId})</span>
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
                          {applying === `league_mapping${s.bookmakerId}|${s.leagueId}`
                            ? "…"
                            : "Applica"}
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
              {isDirectBookmaker && (
                <div className="rounded-lg border bg-white p-6">
                  <h3 className="font-semibold mb-3">Aggiungi mapping lega</h3>
                  <p className="text-sm text-neutral-600 mb-4">
                    Mappa leagueId (API-Football) all&apos;identificatore usato dal bookmaker.
                  </p>
                  <ManualLeagueFormBookmaker
                    bookmakerId={id}
                    onApply={(bookmakerId, leagueId, suggestedValue) =>
                      applySuggestion("league_mapping", {
                        bookmakerId,
                        leagueId,
                        suggestedValue,
                      })
                    }
                    applying={applying}
                    onSuccess={runReport}
                  />
                </div>
              )}
              <div className="rounded-lg border bg-neutral-50 p-4">
                <p className="text-sm text-neutral-600">
                  Modifica in bulk:{" "}
                  <Link href="/ad2min3k/team-aliases" className="text-emerald-600 hover:underline">
                    Alias squadre
                  </Link>
                  {" · "}
                  <Link href={`/ad2min3k/bookmakers/${id}`} className="text-emerald-600 hover:underline">
                    Modifica bookmaker
                  </Link>
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
