import type { Metadata } from "next";
import { createMatchMetadata } from "@/lib/seo";
import {
  getFixtureDetails,
  getFixturePredictions,
  getTeamLastFixtures,
} from "@/lib/apiFootball";
import { buildMatchAnalysisData } from "@/lib/matchAnalysis";
import { generateMatchAnalysisText } from "@/lib/matchAnalysisText";
import Quotes1X2 from "@/lib/components/Quotes1X2";
import LiveMatchScore from "@/lib/components/LiveMatchScore";
import { getSportKeyByLeague } from "@/lib/quotes/sportKeyMap";

/**
 * Estrae fixtureId dallo slug
 * esempio slug:
 * inter-milan-2024-03-21-fixture-123456
 */
function extractFixtureId(slug: string) {
  const parts = slug.split("-fixture-");
  return parts[1];
}

/**
 * Converte l'advice API nel consiglio pronostico: solo 1, X, 2, 1X, X2 o 12.
 * 1 = casa, X = pareggio, 2 = trasferta
 */
function formatAdviceToItalian(advice: string, homeName: string, awayName: string): string {
  const lower = advice.toLowerCase();
  const homeInAdvice = lower.includes(homeName.toLowerCase());
  const awayInAdvice = lower.includes(awayName.toLowerCase());
  const hasDraw = lower.includes("draw") || lower.includes("pareggio");

  if (homeInAdvice && hasDraw && !awayInAdvice) return "1X";
  if (awayInAdvice && hasDraw && !homeInAdvice) return "X2";
  if (homeInAdvice && awayInAdvice && !hasDraw) return "12";
  if (homeInAdvice && !awayInAdvice && !hasDraw) return "1";
  if (awayInAdvice && !homeInAdvice && !hasDraw) return "2";
  if (hasDraw && !homeInAdvice && !awayInAdvice) return "X";
  return advice;
}

/** Risultato singola partita per la squadra: V, X, P */
type MatchResult = "V" | "X" | "P";

/** Statistiche ultime N partite di una squadra */
type LastFixturesStats = {
  results: MatchResult[];
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  bothTeamsScored: number;
  over25: number;
  matches: Array<{
    date: string;
    competition: string;
    opponent: string;
    scoreFor: number;
    scoreAgainst: number;
    result: MatchResult;
    wasHome: boolean;
  }>;
};

function TeamLastFixtures({
  teamName,
  stats,
}: {
  teamName: string;
  stats: LastFixturesStats;
}) {
  const n = stats.matches.length;
  const pct = (v: number) => (n > 0 ? Math.round((v / n) * 100) : 0);
  const avg = (a: number) => (n > 0 ? (a / n).toFixed(2) : "0");
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
      <h3 className="font-semibold text-lg mb-3">{teamName}</h3>
      <p className="text-sm text-neutral-600 mb-4">Ultime {n} partite</p>

      {/* V X P badges */}
      <div className="flex gap-2 mb-4">
        {stats.results.map((r, i) => (
          <span
            key={i}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              r === "V"
                ? "bg-green-100 text-green-800"
                : r === "X"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-red-100 text-red-800"
            }`}
            title={r === "V" ? "Vittoria" : r === "X" ? "Pareggio" : "Sconfitta"}
          >
            {r}
          </span>
        ))}
      </div>

      {/* Sommario V/X/P */}
      <div className="grid grid-cols-3 gap-2 text-sm mb-4">
        <div className="text-center p-2 rounded-lg bg-green-50">
          <div className="font-semibold text-green-700">
            {stats.wins}/{n} ({pct(stats.wins)}%)
          </div>
          <div className="text-xs text-neutral-600">Vittorie</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-amber-50">
          <div className="font-semibold text-amber-700">
            {stats.draws}/{n} ({pct(stats.draws)}%)
          </div>
          <div className="text-xs text-neutral-600">Pareggi</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-red-50">
          <div className="font-semibold text-red-700">
            {stats.losses}/{n} ({pct(stats.losses)}%)
          </div>
          <div className="text-xs text-neutral-600">Sconfitte</div>
        </div>
      </div>

      {/* Media statistiche */}
      <div className="text-xs text-neutral-600 space-y-1 mb-4 pb-4 border-b">
        <div>
          Totale gol: {stats.goalsScored + stats.goalsConceded} • Entrambe a
          segno: {pct(stats.bothTeamsScored)}%
        </div>
        <div>
          Gol segnati: {avg(stats.goalsScored)} • Gol subiti:{" "}
          {avg(stats.goalsConceded)}
        </div>
        <div>
          Over 2,5: {pct(stats.over25)}% • Under 2,5: {100 - pct(stats.over25)}%
        </div>
      </div>

      {/* Lista partite */}
      <ul className="space-y-2">
        {stats.matches.map((m, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-2 text-sm py-2 border-b border-neutral-100 last:border-0"
          >
            <span
              className={`shrink-0 w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${
                m.result === "V"
                  ? "bg-green-100 text-green-800"
                  : m.result === "X"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-800"
              }`}
            >
              {m.result}
            </span>
            <span className="text-neutral-500 shrink-0 w-16">{m.date}</span>
            <span className="text-neutral-600 truncate" title={m.competition}>
              {m.competition}
            </span>
            <span className="font-medium truncate min-w-0" title={m.opponent}>
              {m.wasHome ? (
                <>
                  {teamName} {m.scoreFor} : {m.scoreAgainst} {m.opponent}
                </>
              ) : (
                <>
                  {m.opponent} {m.scoreAgainst} : {m.scoreFor} {teamName}
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function computeLastFixturesStats(
  fixtures: any[],
  teamId: number,
  teamName: string
): LastFixturesStats {
  const results: MatchResult[] = [];
  const matches: LastFixturesStats["matches"] = [];
  let wins = 0,
    draws = 0,
    losses = 0;
  let goalsScored = 0,
    goalsConceded = 0,
    bothTeamsScored = 0,
    over25 = 0;

  const FINISHED = ["FT", "AET", "FT_PEN", "PEN_LIVE", "AWARDED", "ABD", "AWD"];
  for (const f of fixtures) {
    const status = f.fixture?.status?.short;
    if (!FINISHED.includes(status)) continue;
    const gh = f.goals?.home;
    const ga = f.goals?.away;
    if (gh == null || ga == null) continue;
    const homeId = f.teams?.home?.id;

    const wasHome = homeId === teamId;
    const scoreFor = wasHome ? gh : ga;
    const scoreAgainst = wasHome ? ga : gh;
    const opponent = wasHome ? f.teams?.away?.name : f.teams?.home?.name;

    let result: MatchResult = "X";
    if (scoreFor > scoreAgainst) {
      result = "V";
      wins++;
    } else if (scoreFor < scoreAgainst) {
      result = "P";
      losses++;
    } else {
      draws++;
    }

    results.push(result);
    goalsScored += scoreFor;
    goalsConceded += scoreAgainst;
    if (gh > 0 && ga > 0) bothTeamsScored++;
    if (gh + ga > 2.5) over25++;

    matches.push({
      date: new Date(f.fixture?.date).toLocaleDateString("it-IT", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      competition: f.league?.name ?? "-",
      opponent: opponent ?? "-",
      scoreFor,
      scoreAgainst,
      result,
      wasHome,
    });
  }

  return {
    results,
    wins,
    draws,
    losses,
    goalsScored,
    goalsConceded,
    bothTeamsScored,
    over25,
    matches,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const fixtureId = extractFixtureId(slug);
  const fixture = await getFixtureDetails(fixtureId);

  if (!fixture) {
    return { title: "Partita non trovata" };
  }

  const home = fixture.teams.home.name;
  const away = fixture.teams.away.name;
  const league = fixture.league.name;
  const date = new Date(fixture.fixture.date).toLocaleDateString("it-IT");
  const title = `${home} vs ${away} (${date})`;
  const description = `Pronostico e quote ${home} vs ${away}. Analisi 1X2, under/over e consigli per ${league}.`;

  return createMatchMetadata({
    title,
    description,
    countryCode: "it",
    pathWithoutCountry: `pronostici-quote/calcio/${slug}`,
    matchDate: new Date(fixture.fixture.date),
    openGraph: {
      title: `${title} | Pronostici e Quote`,
      description,
      type: "article",
    },
  });
}

/**
 * Pagina match
 */
export default async function MatchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  try {
    const { slug } = await params;
    const fixtureId = extractFixtureId(slug);

    if (!fixtureId) {
      throw new Error("Slug non valido");
    }

    const fixture = await getFixtureDetails(fixtureId);

    if (!fixture) {
      throw new Error("Partita non trovata");
    }

    const sportKey = getSportKeyByLeague(fixture.league.name);

    const homeId = fixture.teams.home.id;
    const awayId = fixture.teams.away.id;

    // Ottieni predizioni e ultime 6 partite in parallelo
    const [predictions, homeFixtures, awayFixtures] = await Promise.all([
      getFixturePredictions(fixtureId),
      getTeamLastFixtures(homeId),
      getTeamLastFixtures(awayId),
    ]);

    const home = fixture.teams.home.name;
    const away = fixture.teams.away.name;
    const date = new Date(fixture.fixture.date).toLocaleString("it-IT");
    const league = fixture.league.name;
    const score = fixture.goals;

    const analysisData = buildMatchAnalysisData({
      fixture,
      predictions: predictions ?? undefined,
      homeFixtures,
      awayFixtures,
      h2hFixtures: [],
      injuries: null,
      odds: null,
    });
    const analysisParagraphs = generateMatchAnalysisText(analysisData);

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "SportsEvent",
      name: `${home} vs ${away}`,
      startDate: fixture.fixture.date,
      description: `Partita di calcio ${home} vs ${away} - ${league}`,
      homeTeam: {
        "@type": "SportsTeam",
        name: home,
      },
      awayTeam: {
        "@type": "SportsTeam",
        name: away,
      },
      ...(score?.home != null &&
        score?.away != null && {
          homeTeamScore: score.home,
          awayTeamScore: score.away,
        }),
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <main className="mx-auto max-w-6xl px-4 py-10">
        <a
          className="text-sm underline text-neutral-700 hover:text-neutral-900"
          href="/pronostici-quote/calcio"
        >
          ← Torna al calcio
        </a>

        <div className="mt-6">
          <h1 className="text-3xl font-semibold tracking-tight">
            {home} vs {away}
          </h1>
          <p className="mt-2 text-neutral-600">
            {league} • {date}
          </p>
        </div>

        {/* Risultato attuale - con live updates via polling */}
        <div className="mt-6 rounded-xl border bg-white p-6">
          <div className="text-center">
            <LiveMatchScore
              fixtureId={fixture.fixture.id}
              initialScore={{ home: score?.home ?? null, away: score?.away ?? null }}
              initialStatus={fixture.fixture.status?.short ?? null}
              initialMinute={fixture.fixture.status?.elapsed ?? null}
              kickoffTime={fixture.fixture.date}
              intlLocale="it-IT"
              variant="desktop"
            />
          </div>
        </div>

        {/* Analisi Pronostico - testo statico SEO-friendly, separato dalle statistiche */}
        {analysisParagraphs.length > 0 && (
          <section className="mt-8 rounded-2xl border bg-white p-6" aria-labelledby="analisi-heading">
            <h2 id="analisi-heading" className="text-xl font-semibold mb-4">
              Analisi Pronostico
            </h2>
            <article>
              {analysisParagraphs.map((paragraph, i) => (
                <p key={i} className="text-gray-700 leading-relaxed mb-4 last:mb-0">
                  {paragraph}
                </p>
              ))}
            </article>
          </section>
        )}

        {sportKey && (
          <Quotes1X2
            sportKey={sportKey}
            homeTeam={home}
            awayTeam={away}
            country="IT"
          />
        )}

        {!sportKey && (
          <p className="mt-6 text-gray-500">
            Quote non disponibili per questa competizione
          </p>
        )}

        {/* Predizioni - Struttura API: winner, win_or_draw, under_over, goals, advice, percent */}
        {predictions && (
          <section className="mt-8 rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-semibold mb-4">Pronostici</h2>
            
            {predictions.predictions && (
              <div className="space-y-6">
                {/* Percentuali 1X2 - percent a livello root */}
                {(predictions.predictions.percent || predictions.predictions.winner?.percent) && (
                  <div className="border-b pb-6">
                    <h3 className="font-semibold mb-3">Probabilità Esito (1X2)</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 rounded-lg bg-gray-50">
                        <div className="font-medium">{home}</div>
                        <div className="text-2xl font-bold text-[var(--foreground)] mt-1">
                          {predictions.predictions.percent?.home ?? predictions.predictions.winner?.percent?.home ?? '-'}
                        </div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-gray-50">
                        <div className="font-medium">Pareggio</div>
                        <div className="text-2xl font-bold text-[var(--foreground)] mt-1">
                          {predictions.predictions.percent?.draw ?? predictions.predictions.winner?.percent?.draw ?? '-'}
                        </div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-gray-50">
                        <div className="font-medium">{away}</div>
                        <div className="text-2xl font-bold text-[var(--foreground)] mt-1">
                          {predictions.predictions.percent?.away ?? predictions.predictions.winner?.percent?.away ?? '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Under/Over Gol - sempre visibile: da API o da statistiche ultime partite */}
                {(() => {
                  const apiUnderOver = predictions.predictions.under_over;
                  const combinedOverPct = Math.round(
                    (analysisData.goals.home.over_2_5_pct + analysisData.goals.away.over_2_5_pct) / 2
                  );
                  const expectedGoals = analysisData.goals.home.avg_scored + analysisData.goals.away.avg_scored;
                  const fallbackOver = combinedOverPct >= 50 && expectedGoals >= 2.4;
                  const displayValue = apiUnderOver
                    ? String(apiUnderOver).startsWith("-")
                      ? `Under ${String(apiUnderOver).replace("-", "")}`
                      : `Over ${apiUnderOver}`
                    : fallbackOver
                      ? "Over 2.5"
                      : "Under 2.5";
                  const isFromStats = !apiUnderOver;
                  return (
                    <div className="border-b pb-6">
                      <h3 className="font-semibold mb-3">Under/Over Gol</h3>
                      <div className="p-4 rounded-lg bg-gray-50">
                        <div className="text-lg font-medium">{displayValue}</div>
                        {apiUnderOver && (apiUnderOver as any)?.percent && (
                          <div className="mt-2 text-sm text-gray-600">
                            Percentuali: {JSON.stringify((apiUnderOver as any).percent)}
                          </div>
                        )}
                        {isFromStats && (
                          <div className="mt-2 text-sm text-gray-600">
                            Da statistiche ultime partite (Over 2,5: {combinedOverPct}%)
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Goals Home/Away */}
                {predictions.predictions.goals && (
                  <div className="border-b pb-6">
                    <h3 className="font-semibold mb-3">Gol Previsti per Squadra</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-lg bg-gray-50">
                        <div className="font-medium">{home}</div>
                        <div className="text-xl font-bold text-[var(--foreground)] mt-1">
                          {predictions.predictions.goals.home ?? '-'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">(soglia prevista)</div>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-gray-50">
                        <div className="font-medium">{away}</div>
                        <div className="text-xl font-bold text-[var(--foreground)] mt-1">
                          {predictions.predictions.goals.away ?? '-'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">(soglia prevista)</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Both Teams Score - struttura alternativa */}
                {predictions.predictions.both_teams && (
                  <div className="border-b pb-6">
                    <h3 className="font-semibold mb-3">Entrambe Segnano</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 rounded-lg bg-gray-50">
                        <div className="font-medium">Sì</div>
                        {(predictions.predictions.both_teams as any).percent?.yes && (
                          <div className="text-lg font-bold text-[var(--foreground)] mt-1">
                            {(predictions.predictions.both_teams as any).percent.yes}%
                          </div>
                        )}
                      </div>
                      <div className="text-center p-3 rounded-lg bg-gray-50">
                        <div className="font-medium">No</div>
                        {(predictions.predictions.both_teams as any).percent?.no && (
                          <div className="text-lg font-bold text-[var(--foreground)] mt-1">
                            {(predictions.predictions.both_teams as any).percent.no}%
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Advice - Combo raccomandata (tradotto in italiano con 1X/X2/12) */}
            {predictions.predictions?.advice && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold mb-2">Consiglio Pronostico</h3>
                <p className="text-gray-700 leading-relaxed p-4 rounded-lg bg-amber-50 border border-amber-100">
                  {formatAdviceToItalian(
                    predictions.predictions.advice,
                    home,
                    away
                  )}
                </p>
              </div>
            )}
          </section>
        )}

        {/* Ultime 6 partite - come SportyTrader */}
        {(homeFixtures.length > 0 || awayFixtures.length > 0) && (
          <section className="mt-8 rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-semibold mb-6">
              Come arrivano le squadre a questa sfida
            </h2>
            <div className="grid gap-10 md:grid-cols-2">
              {/* Squadra casa */}
              {homeFixtures.length > 0 && (
                <TeamLastFixtures
                  teamName={home}
                  stats={computeLastFixturesStats(homeFixtures, homeId, home)}
                />
              )}
              {/* Squadra trasferta */}
              {awayFixtures.length > 0 && (
                <TeamLastFixtures
                  teamName={away}
                  stats={computeLastFixturesStats(awayFixtures, awayId, away)}
                />
              )}
            </div>
          </section>
        )}

        {/* Dettagli partita */}
        <section className="mt-8 rounded-2xl border bg-white p-6">
          <h2 className="text-xl font-semibold mb-4">Dettagli Partita</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {fixture.fixture.venue && fixture.fixture.venue.name && (
              <div>
                <span className="font-medium">Stadio:</span> {fixture.fixture.venue.name}
              </div>
            )}
            {fixture.fixture.referee && (
              <div>
                <span className="font-medium">Arbitro:</span> {fixture.fixture.referee}
              </div>
            )}
            {fixture.league.round && (
              <div>
                <span className="font-medium">Giornata:</span> {fixture.league.round}
              </div>
            )}
            {fixture.league.season != null && (
              <div>
                <span className="font-medium">Stagione:</span>{" "}
                {typeof fixture.league.season === "number"
                  ? `${fixture.league.season}-${fixture.league.season + 1}`
                  : String(fixture.league.season).includes("-")
                    ? fixture.league.season
                    : `${fixture.league.season}-${Number(fixture.league.season) + 1}`}
              </div>
            )}
          </div>
        </section>
      </main>
      </>
    );
  } catch (error: any) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Errore caricamento partita</h1>
        <pre className="mt-4 rounded-xl border bg-neutral-50 p-4 text-sm overflow-auto">
          {String(error?.message ?? error)}
        </pre>
      </main>
    );
  }
}
