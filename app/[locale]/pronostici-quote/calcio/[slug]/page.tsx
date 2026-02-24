import type { Metadata } from "next";
import {
  getFixtureDetails,
  getFixtureDetailsNoCache,
  getFixturePredictions,
  getTeamLastFixtures,
} from "@/lib/apiFootball";
import {
  FALLBACK_FIXTURES,
  FORCE_INCLUDE_FIXTURE_IDS,
} from "@/lib/fallbackFixtures";
import { buildMatchAnalysisData } from "@/lib/matchAnalysis";
import { generateMatchAnalysisText } from "@/lib/matchAnalysisText";
import { getTranslations } from "next-intl/server";
import MatchQuotesTabs from "./MatchQuotesTabs";
import MatchQuotePronosticiButtons from "./MatchQuotePronosticiButtons";
import ScrollToHash from "./ScrollToHash";
import LiveMatchScore from "@/lib/components/LiveMatchScore";
import { getSportKeyForLeague } from "@/lib/quotes/leagueToSportKey";
import { getBookmakers } from "@/lib/quotes/bookmakers";
import { getMultiMarketQuotes } from "@/lib/quotes/quotesEngine";
import { getSingleResultFromOdds } from "@/lib/pronostici/oddsToScore";
import {
  parseUnderOverFromApi,
  sanitizeUnderOver,
} from "@/lib/pronostici/parseUnderOver";
import { normalizeTeamName } from "@/lib/textEncoding";
import { Link } from "@/i18n/navigation";
import { localeToCountryCode, localeToIntl } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { getAlternatesWithHreflang } from "@/lib/countries";
import {
  createMatchMetadata,
  getSafeSiteUrl,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

function extractFixtureId(slug: string) {
  const parts = slug.split("-fixture-");
  return parts[1];
}

type MatchResult = "V" | "X" | "P";

type LastFixturesStats = {
  results: MatchResult[];
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  matchesWithGoal: number;
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
  t,
}: {
  teamName: string;
  stats: LastFixturesStats;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const n = stats.matches.length;
  const pct = (v: number) => (n > 0 ? Math.round((v / n) * 100) : 0);
  const avg = (a: number) => (n > 0 ? (a / n).toFixed(2) : "0");
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-[var(--card-border)] bg-slate-50/80 p-3 text-left md:p-5">
      <h3 className="mb-2 text-sm font-bold text-[var(--foreground)] md:mb-3 md:text-lg">{teamName}</h3>
      <p className="mb-2 text-[10px] text-[var(--foreground-muted)] md:mb-3 md:text-sm">
        {t("lastNMatches", { n })}
      </p>

      <div className="mb-3 flex justify-start gap-1.5 md:mb-4 md:gap-2">
        {stats.results.map((r, i) => (
          <span
            key={i}
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold md:h-8 md:w-8 md:text-sm ${
              r === "V"
                ? "bg-green-100 text-green-800"
                : r === "X"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-red-100 text-red-800"
            }`}
            title={
              r === "V"
                ? t("victory")
                : r === "X"
                  ? t("draw")
                  : t("defeats")
            }
          >
            {r}
          </span>
        ))}
      </div>

      <div className="mb-2 grid grid-cols-3 gap-1.5 text-[10px] md:mb-3 md:gap-3 md:text-sm">
        <div className="rounded-lg bg-green-50 p-1.5 text-center md:p-3">
          <div className="font-semibold text-green-700">
            {stats.wins}/{n} ({pct(stats.wins)}%)
          </div>
          <div className="text-xs text-[var(--foreground-muted)]">{t("victory")}</div>
        </div>
        <div className="rounded-lg bg-amber-50 p-1.5 text-center md:p-3">
          <div className="font-semibold text-amber-700">
            {stats.draws}/{n} ({pct(stats.draws)}%)
          </div>
          <div className="text-xs text-[var(--foreground-muted)]">{t("draws")}</div>
        </div>
        <div className="rounded-lg bg-red-50 p-1.5 text-center md:p-3">
          <div className="font-semibold text-red-700">
            {stats.losses}/{n} ({pct(stats.losses)}%)
          </div>
          <div className="text-xs text-[var(--foreground-muted)]">{t("defeats")}</div>
        </div>
      </div>

      <ul className="mb-3 space-y-1.5 md:mb-4 md:space-y-3">
        {stats.matches.map((m, i) => (
          <li
            key={i}
            className="flex min-w-0 flex-col items-start gap-0.5 border-b border-slate-100 py-1.5 text-left last:border-0 md:gap-1 md:py-3"
          >
            <span className="w-full truncate text-center text-[10px] font-medium text-[var(--foreground-muted)] md:text-xs" title={m.competition}>
              {m.competition}
            </span>
            <div className="grid w-full min-w-0 grid-cols-[1.25rem_auto_1fr] items-center justify-items-start gap-x-2 gap-y-1.5 md:grid-cols-[1.5rem_auto_1fr] md:gap-x-4 md:gap-y-2">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold md:h-6 md:w-6 md:text-xs ${
                  m.result === "V"
                    ? "bg-green-100 text-green-800"
                    : m.result === "X"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {m.result}
              </span>
              <span className="whitespace-nowrap text-[10px] text-[var(--foreground-muted)] md:text-sm">{m.date}</span>
              <span className="min-w-0 truncate text-[10px] font-medium md:text-sm" title={m.opponent}>
                {m.wasHome ? (
                  <>
                    {teamName} {m.scoreFor}:{m.scoreAgainst} {m.opponent}
                  </>
                ) : (
                  <>
                    {m.opponent} {m.scoreAgainst}:{m.scoreFor} {teamName}
                  </>
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-2 md:p-4">
        <h4 className="mb-1.5 text-[10px] font-semibold text-[var(--foreground)] md:mb-2 md:text-sm">
          {t("avgStatsTitle", { n })}
        </h4>
        <div className="grid min-w-0 grid-cols-2 gap-1.5 text-[10px] sm:grid-cols-3 md:gap-3 md:text-sm">
          <div className="min-w-0 overflow-hidden rounded-lg bg-slate-50 p-1.5 md:p-3">
            <div className="truncate text-[10px] text-[var(--foreground-muted)] md:text-xs">{t("totalGoals")}</div>
            <div className="font-semibold">{stats.matchesWithGoal}/{n}</div>
          </div>
          <div className="min-w-0 overflow-hidden rounded-lg bg-slate-50 p-1.5 md:p-3">
            <div className="truncate text-[10px] text-[var(--foreground-muted)] md:text-xs">{t("bothTeamsScored")}</div>
            <div className="font-semibold">{pct(stats.bothTeamsScored)}%</div>
          </div>
          <div className="min-w-0 overflow-hidden rounded-lg bg-slate-50 p-1.5 md:p-3">
            <div className="truncate text-[10px] text-[var(--foreground-muted)] md:text-xs">{t("goalsScored")}</div>
            <div className="font-semibold">{avg(stats.goalsScored)}</div>
          </div>
          <div className="min-w-0 overflow-hidden rounded-lg bg-slate-50 p-1.5 md:p-3">
            <div className="truncate text-[10px] text-[var(--foreground-muted)] md:text-xs">{t("goalsConceded")}</div>
            <div className="font-semibold">{avg(stats.goalsConceded)}</div>
          </div>
          <div className="min-w-0 overflow-hidden rounded-lg bg-slate-50 p-1.5 md:p-3">
            <div className="truncate text-[10px] text-[var(--foreground-muted)] md:text-xs">{t("over25")}</div>
            <div className="font-semibold">{pct(stats.over25)}%</div>
          </div>
          <div className="min-w-0 overflow-hidden rounded-lg bg-slate-50 p-1.5 md:p-3">
            <div className="truncate text-[10px] text-[var(--foreground-muted)] md:text-xs">{t("under25")}</div>
            <div className="font-semibold">{100 - pct(stats.over25)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function computeLastFixturesStats(
  fixtures: any[],
  teamId: number,
  teamName: string,
  intlLocale: string
): LastFixturesStats {
  const results: MatchResult[] = [];
  const matches: LastFixturesStats["matches"] = [];
  let wins = 0,
    draws = 0,
    losses = 0;
  let goalsScored = 0,
    goalsConceded = 0,
    matchesWithGoal = 0,
    bothTeamsScored = 0,
    over25 = 0;

  const FINISHED = ["FT", "AET", "FT_PEN", "PEN_LIVE", "AWARDED", "ABD", "AWD"];
  const MAX_MATCHES = 6;

  // Ordina per data (più recenti prima): l'API può restituire per competizione,
  // quindi senza sort le partite di coppa potrebbero essere escluse
  const sorted = [...fixtures].sort(
    (a, b) =>
      new Date(b.fixture?.date || 0).getTime() -
      new Date(a.fixture?.date || 0).getTime()
  );

  const now = new Date();
  const DAY_MS = 24 * 60 * 60 * 1000;

  for (const f of sorted) {
    if (matches.length >= MAX_MATCHES) break;
    const status = f.fixture?.status?.short;
    const matchDate = new Date(f.fixture?.date || 0);
    const isFinished = FINISHED.includes(status);
    const daysFromNow = (matchDate.getTime() - now.getTime()) / DAY_MS;
    // L'API a volte restituisce anno errato (es. 2026 invece di 2025) per partite di coppa:
    // status NS ma data 100-500 giorni nel futuro → trattiamo come partita disputata
    const likelyDateError = status === "NS" && daysFromNow > 100 && daysFromNow < 500;
    const forceInclude = f.fixture?.id && FORCE_INCLUDE_FIXTURE_IDS.includes(f.fixture.id);

    if (!isFinished && !likelyDateError && !forceInclude) continue;

    let gh = f.goals?.home;
    let ga = f.goals?.away;
    if (gh == null || ga == null) {
      gh = gh ?? 0;
      ga = ga ?? 0;
    }
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
    if (scoreFor >= 1) matchesWithGoal++;
    if (gh > 0 && ga > 0) bothTeamsScored++;
    if (gh + ga > 2.5) over25++;

    matches.push({
      date: new Date(f.fixture?.date).toLocaleDateString(intlLocale, {
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
    matchesWithGoal,
    bothTeamsScored,
    over25,
    matches,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const fixtureId = extractFixtureId(slug);
  const fixture = await getFixtureDetails(fixtureId);
  const intlLocale = localeToIntl[locale] ?? "it-IT";

  if (!fixture) {
    return { title: "Partita non trovata" };
  }

  const home = normalizeTeamName(fixture.teams.home.name);
  const away = normalizeTeamName(fixture.teams.away.name);
  const league = fixture.league.name;
  const date = new Date(fixture.fixture.date).toLocaleDateString(intlLocale);
  const title = `${home} vs ${away} (${date})`;
  const description = `Pronostico e quote ${home} vs ${away}. Analisi 1X2, under/over e consigli per ${league}.`;

  const base = createMatchMetadata({
    title,
    description,
    countryCode: locale,
    pathWithoutCountry: `pronostici-quote/calcio/${slug}`,
    matchDate: new Date(fixture.fixture.date),
    openGraph: {
      title: `${title} | Pronostici e Quote`,
      description,
      type: "article",
    },
  });

  return {
    ...base,
    alternates: {
      ...base.alternates,
      ...getAlternatesWithHreflang(
        getSafeSiteUrl(),
        `/${locale}/pronostici-quote/calcio/${slug}`,
        [...routing.locales]
      ),
    },
  };
}

export default async function MatchPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const t = await getTranslations("match");
  const tCalcio = await getTranslations("calcio");
  const tHome = await getTranslations("home");

  try {
    const { locale, slug } = await params;
    const intlLocale = localeToIntl[locale] ?? "it-IT";
    const fixtureId = extractFixtureId(slug);

    if (!fixtureId) {
      throw new Error("Slug non valido");
    }

    const fixture = await getFixtureDetails(fixtureId);

    if (!fixture) {
      throw new Error("Partita non trovata");
    }

    const sportKey = getSportKeyForLeague(fixture.league?.id, fixture.league?.name);
    const homeName = normalizeTeamName(fixture.teams.home.name);
    const awayName = normalizeTeamName(fixture.teams.away.name);
    const homeId = fixture.teams.home.id;
    const awayId = fixture.teams.away.id;

    let [predictions, homeFixtures, awayFixtures, quotesMultiMarket] = await Promise.all([
      getFixturePredictions(fixtureId),
      getTeamLastFixtures(homeId),
      getTeamLastFixtures(awayId),
      sportKey
        ? getMultiMarketQuotes(sportKey, {
            homeTeam: homeName,
            awayTeam: awayName,
            leagueId: fixture.league?.id,
          }).catch(() => ({}))
        : Promise.resolve({}),
    ]);

    for (const { teamName, fixtureId } of FALLBACK_FIXTURES) {
      const isHome = homeName === teamName;
      const isAway = awayName === teamName;
      if (!isHome && !isAway) continue;

      const fixtures = isHome ? homeFixtures : awayFixtures;
      const hasFixture = fixtures.some((f: any) => f.fixture?.id === fixtureId);
      if (hasFixture) continue;

      const fallback = await getFixtureDetailsNoCache(fixtureId);
      if (!fallback) continue;

      if (isHome) homeFixtures = [fallback, ...homeFixtures];
      else awayFixtures = [fallback, ...awayFixtures];
    }

    const mergeAndSort = (arr: any[]) => {
      const byId = new Map<number, any>();
      for (const f of arr) if (f.fixture?.id) byId.set(f.fixture.id, f);
      return Array.from(byId.values()).sort(
        (a, b) =>
          new Date(b.fixture?.date || 0).getTime() -
          new Date(a.fixture?.date || 0).getTime()
      );
    };
    homeFixtures = mergeAndSort(homeFixtures);
    awayFixtures = mergeAndSort(awayFixtures);

    const home = homeName;
    const away = awayName;

    const h2hQuotes = (quotesMultiMarket as { h2h?: Array<{ outcomes?: { home?: number; draw?: number; away?: number } }> })?.h2h ?? [];
    const validH2h = h2hQuotes.filter((q) => (q.outcomes?.home ?? 0) > 0 && (q.outcomes?.draw ?? 0) > 0 && (q.outcomes?.away ?? 0) > 0);
    const bestOdds = validH2h.length > 0
      ? {
          home: Math.max(...validH2h.map((q) => q.outcomes!.home!)),
          draw: Math.max(...validH2h.map((q) => q.outcomes!.draw!)),
          away: Math.max(...validH2h.map((q) => q.outcomes!.away!)),
        }
      : null;
    const apiPercent = predictions?.predictions?.percent ?? predictions?.predictions?.winner?.percent;
    const pct1 = apiPercent?.home != null ? parseInt(String(apiPercent.home), 10) : null;
    const pctX = apiPercent?.draw != null ? parseInt(String(apiPercent.draw), 10) : null;
    const pct2 = apiPercent?.away != null ? parseInt(String(apiPercent.away), 10) : null;
    const prudenteFromApi: "1" | "X" | "2" | "1X" | "X2" | "12" | null =
      pct1 != null && pctX != null && pct2 != null
        ? (() => {
            const sorted = [
              { out: "1" as const, pct: pct1 },
              { out: "X" as const, pct: pctX },
              { out: "2" as const, pct: pct2 },
            ].sort((a, b) => b.pct - a.pct);
            const [first, second] = sorted;
            if (!first || !second) return null;
            const outs = new Set([first.out, second.out]);
            if (outs.has("1") && outs.has("X")) return "1X";
            if (outs.has("X") && outs.has("2")) return "X2";
            if (outs.has("1") && outs.has("2")) return "12";
            return first.out;
          })()
        : null;
    const risultatoUnicoFromOdds = bestOdds ? getSingleResultFromOdds(bestOdds) : null;
    const risultatoUnicoFromApi: "1" | "X" | "2" | null =
      !risultatoUnicoFromOdds && pct1 != null && pctX != null && pct2 != null
        ? (() => {
            const max = Math.max(pct1, pctX, pct2);
            if (pct1 === max) return "1";
            if (pctX === max) return "X";
            return "2";
          })()
        : null;
    const risultatoUnico = risultatoUnicoFromOdds ?? risultatoUnicoFromApi;
    const risultatoUnicoIsFromOdds = !!risultatoUnicoFromOdds;
    const date = new Date(fixture.fixture.date).toLocaleString(intlLocale);
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
      locale: intlLocale,
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
        <ScrollToHash />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <main className="min-h-screen overflow-x-hidden bg-[var(--background)]">
          <div className="mx-auto min-w-0 max-w-6xl overflow-x-hidden px-4 py-4 md:px-6 md:py-6">
            <Link
              href={
                fixture.league?.id
                  ? `/?sport=calcio&league=${fixture.league.id}`
                  : "/?sport=calcio"
              }
              className="inline-block text-base font-medium text-[var(--foreground-muted)] underline hover:text-[var(--foreground)]"
            >
              {tCalcio("backToCalcio")}
            </Link>

            {/* Header partita - Match header prominente */}
            <div className="mt-4 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm md:mt-6 md:p-6">
              {/* Layout mobile: tutto centrato, data in alto, squadre+loghi stessa riga, risultato sotto, live status */}
              <div className="flex flex-col items-center gap-3 text-center sm:hidden">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
                  {new Date(fixture.fixture.date).toLocaleDateString(intlLocale, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="flex w-full items-center justify-center gap-2">
                  <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                    {fixture.teams.home.logo && (
                      <img src={fixture.teams.home.logo} alt="" className="h-8 w-8 shrink-0 object-contain" />
                    )}
                    <span className="truncate text-sm font-bold text-[var(--foreground)]">{home}</span>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-[var(--foreground-muted)]">-</span>
                  <div className="flex min-w-0 flex-1 items-center justify-start gap-2">
                    <span className="truncate text-sm font-bold text-[var(--foreground)]">{away}</span>
                    {fixture.teams.away.logo && (
                      <img src={fixture.teams.away.logo} alt="" className="h-8 w-8 shrink-0 object-contain" />
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <LiveMatchScore
                    fixtureId={fixture.fixture.id}
                    initialScore={{ home: score?.home ?? null, away: score?.away ?? null }}
                    initialStatus={fixture.fixture.status?.short ?? null}
                    initialMinute={fixture.fixture.status?.elapsed ?? null}
                    kickoffTime={fixture.fixture.date}
                    intlLocale={intlLocale}
                    variant="mobile"
                  />
                </div>
              </div>
              {/* Layout desktop */}
              <div className="hidden sm:flex sm:flex-col sm:items-center sm:gap-4 md:flex-row md:justify-between md:gap-6">
                <div className="flex items-center gap-3">
                  {fixture.teams.home.logo && (
                    <img src={fixture.teams.home.logo} alt="" className="h-10 w-10 object-contain md:h-12 md:w-12" />
                  )}
                  <span className="text-base font-bold text-[var(--foreground)] md:text-xl">{home}</span>
                </div>
                <div className="flex flex-col items-center">
                  <LiveMatchScore
                    fixtureId={fixture.fixture.id}
                    initialScore={{ home: score?.home ?? null, away: score?.away ?? null }}
                    initialStatus={fixture.fixture.status?.short ?? null}
                    initialMinute={fixture.fixture.status?.elapsed ?? null}
                    kickoffTime={fixture.fixture.date}
                    intlLocale={intlLocale}
                    variant="desktop"
                  />
                  <div className="mt-2 text-sm text-[var(--foreground-muted)]">
                    {league} • {date}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-base font-bold text-[var(--foreground)] md:text-xl">{away}</span>
                  {fixture.teams.away.logo && (
                    <img src={fixture.teams.away.logo} alt="" className="h-10 w-10 object-contain md:h-12 md:w-12" />
                  )}
                </div>
              </div>
            </div>

            {/* Bottoni Quote / Pronostici - scroll alle sezioni */}
            <MatchQuotePronosticiButtons
              quotesLabel={tHome("quotesTab")}
              predictionsLabel={tHome("predictionsTab")}
            />

            {/* 1. Tutte le quote */}
            {sportKey && (
              <div id="quote" className="mt-4 scroll-mt-24 md:mt-6">
                <MatchQuotesTabs
                  sportKey={sportKey}
                  homeTeam={home}
                  awayTeam={away}
                  country={localeToCountryCode[locale]}
                  leagueId={fixture.league?.id}
                  bookmakerLogos={Object.fromEntries(
                    getBookmakers()
                      .filter((bm) => bm.apiBookmakerKey && bm.logoUrl)
                      .map((bm) => [bm.apiBookmakerKey!.toLowerCase(), bm.logoUrl])
                  )}
                  bookmakerFavicons={Object.fromEntries(
                    getBookmakers()
                      .filter((bm) => bm.apiBookmakerKey && bm.faviconUrl)
                      .map((bm) => [bm.apiBookmakerKey!.toLowerCase(), bm.faviconUrl!])
                  )}
                />
              </div>
            )}

            {!sportKey && (
              <div id="quote" className="mt-4 scroll-mt-24 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-center shadow-sm md:mt-6">
                <p className="text-sm text-[var(--foreground-muted)] md:text-base">Quote non disponibili per questa competizione</p>
              </div>
            )}

            {/* 2. Pronostici */}
            {(predictions || prudenteFromApi || risultatoUnico) && (
            <section
              id="pronostici"
              className="mt-4 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm scroll-mt-24 md:mt-6 md:p-6"
            >
              <h2 className="mb-4 text-lg font-bold text-[var(--foreground)] md:text-xl">{t("predictions")}</h2>

              {/* Tabelle pronostici: Probabilità 1X2, Under/Over, Gol, Entrambe segnano */}
              {predictions?.predictions && (
                <div className="space-y-6">
                  {(predictions.predictions.percent ||
                    predictions.predictions.winner?.percent) && (
                    <div className="border-b border-[var(--card-border)] pb-6">
                      <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)] md:text-base">
                        {t("probability1X2")}
                      </h3>
                      <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <div className="flex min-h-[4rem] flex-col items-center justify-end rounded-xl bg-slate-50 p-3 text-center sm:min-h-0 sm:p-4">
                          <div className="mb-1 line-clamp-2 min-h-[2.5rem] text-[10px] font-medium text-[var(--foreground-muted)] sm:min-h-0 sm:text-sm sm:line-clamp-none">{home}</div>
                          <div className="tabular-nums text-xl font-bold text-[var(--accent)] md:text-2xl">
                            {predictions.predictions.percent?.home ??
                              predictions.predictions.winner?.percent?.home ??
                              "-"}
                          </div>
                        </div>
                        <div className="flex min-h-[4rem] flex-col items-center justify-end rounded-xl bg-slate-50 p-3 text-center sm:min-h-0 sm:p-4">
                          <div className="mb-1 min-h-[2.5rem] text-[10px] font-medium text-[var(--foreground-muted)] sm:min-h-0 sm:text-sm">{t("draw")}</div>
                          <div className="tabular-nums text-xl font-bold text-[var(--accent)] md:text-2xl">
                            {predictions.predictions.percent?.draw ??
                              predictions.predictions.winner?.percent?.draw ??
                              "-"}
                          </div>
                        </div>
                        <div className="flex min-h-[4rem] flex-col items-center justify-end rounded-xl bg-slate-50 p-3 text-center sm:min-h-0 sm:p-4">
                          <div className="mb-1 line-clamp-2 min-h-[2.5rem] text-[10px] font-medium text-[var(--foreground-muted)] sm:min-h-0 sm:text-sm sm:line-clamp-none">{away}</div>
                          <div className="tabular-nums text-xl font-bold text-[var(--accent)] md:text-2xl">
                            {predictions.predictions.percent?.away ??
                              predictions.predictions.winner?.percent?.away ??
                              "-"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Consiglio Pronostico: Prudente (API) e Risultato unico (quote) */}
                  {(prudenteFromApi || risultatoUnico) && (
                    <div className="border-b border-[var(--card-border)] pb-6">
                      <div className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-light)] p-4 md:p-6">
                        <h3 className="mb-3 text-lg font-semibold text-[var(--foreground)]">{t("advice")}</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {prudenteFromApi && (
                            <div className="rounded-xl border border-[var(--card-border)] bg-slate-50/80 p-4">
                              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
                                {t("prudenteLabel")}
                              </div>
                              <div className="mt-2 text-2xl font-bold text-[var(--accent)] md:text-3xl">
                                {prudenteFromApi}
                              </div>
                            </div>
                          )}
                          {risultatoUnico && (
                            <div className="rounded-xl border border-[var(--card-border)] bg-slate-50/80 p-4">
                              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
                                {t("risultatoUnicoLabel")}
                              </div>
                              <div className="mt-2 text-2xl font-bold text-[var(--accent)] md:text-3xl">
                                {risultatoUnico}
                              </div>
                              {risultatoUnicoIsFromOdds && (
                                <div className="mt-1 text-[10px] text-[var(--foreground-muted)] md:text-xs">
                                  {t("risultatoUnicoSource")}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {predictions.predictions.goals && (
                    <div className="border-b border-[var(--card-border)] pb-6">
                      <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)] md:text-base">
                        {t("goalsPerTeam")}
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl bg-slate-50 p-4 text-center">
                          <div className="text-sm font-medium text-[var(--foreground-muted)]">{home}</div>
                          <div className="mt-1 text-lg font-bold text-[var(--accent)] md:text-xl">
                            {predictions.predictions.goals.home ?? "-"}
                          </div>
                          <div className="mt-1 text-xs text-[var(--foreground-muted)]">
                            (soglia prevista)
                          </div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4 text-center">
                          <div className="text-sm font-medium text-[var(--foreground-muted)]">{away}</div>
                          <div className="mt-1 text-lg font-bold text-[var(--accent)] md:text-xl">
                            {predictions.predictions.goals.away ?? "-"}
                          </div>
                          <div className="mt-1 text-xs text-[var(--foreground-muted)]">
                            (soglia prevista)
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {(() => {
                    const apiUnderOver = predictions.predictions.under_over;
                    const parsed = sanitizeUnderOver(
                      parseUnderOverFromApi(apiUnderOver),
                      apiUnderOver
                    );
                    const combinedOverPct = Math.round(
                      (analysisData.goals.home.over_2_5_pct +
                        analysisData.goals.away.over_2_5_pct) /
                        2
                    );
                    const expectedGoals =
                      analysisData.goals.home.avg_scored +
                      analysisData.goals.away.avg_scored;
                    const fallbackOver =
                      combinedOverPct >= 50 && expectedGoals >= 2.4;
                    const displayValue = parsed
                      ? parsed.type === "under"
                        ? `Under ${parsed.threshold}`
                        : `Over ${parsed.threshold}`
                      : fallbackOver
                        ? "Over 2.5"
                        : "Under 2.5";
                    const isFromStats = !parsed;
                    return (
                      <div className="border-b border-[var(--card-border)] pb-6">
                        <div className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-light)] p-4 md:p-6">
                          <h3 className="mb-3 text-lg font-semibold text-[var(--foreground)]">
                            {t("adviceUnderOver")}
                          </h3>
                          <div className="rounded-xl border border-[var(--card-border)] bg-slate-50/80 p-4">
                            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
                              {t("prudenteLabel")}
                            </div>
                            <div className="mt-2 text-2xl font-bold text-[var(--accent)] md:text-3xl">
                              {displayValue}
                            </div>
                            {apiUnderOver &&
                              typeof apiUnderOver === "object" &&
                              (apiUnderOver as any)?.percent && (
                                <div className="mt-2 text-sm text-[var(--foreground-muted)]">
                                  Percentuali:{" "}
                                  {JSON.stringify(
                                    (apiUnderOver as any).percent
                                  )}
                                </div>
                              )}
                            {isFromStats && (
                              <div className="mt-2 text-sm text-[var(--foreground-muted)]">
                                {t("fromStats", {
                                  pct: combinedOverPct,
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {predictions.predictions.both_teams && (
                    <div className="border-b border-[var(--card-border)] pb-6">
                      <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)] md:text-base">
                        {t("bothTeamsScore")}
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl bg-slate-50 p-4 text-center">
                          <div className="text-sm font-medium text-[var(--foreground-muted)]">{t("yes")}</div>
                          {(predictions.predictions.both_teams as any).percent
                            ?.yes && (
                            <div className="mt-1 text-base font-bold text-[var(--accent)] md:text-lg">
                              {
                                (predictions.predictions.both_teams as any)
                                  .percent.yes
                              }
                              %
                            </div>
                          )}
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4 text-center">
                          <div className="text-sm font-medium text-[var(--foreground-muted)]">{t("no")}</div>
                          {(predictions.predictions.both_teams as any).percent
                            ?.no && (
                            <div className="mt-1 text-base font-bold text-[var(--accent)] md:text-lg">
                              {
                                (predictions.predictions.both_teams as any)
                                  .percent.no
                              }
                              %
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Consiglio Pronostico standalone (quando non c'è blocco predictions ma abbiamo prudente/risultato) */}
              {!predictions?.predictions && (prudenteFromApi || risultatoUnico) && (
                <div className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-light)] p-4 md:p-6">
                  <h3 className="mb-3 text-lg font-semibold text-[var(--foreground)]">{t("advice")}</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {prudenteFromApi && (
                      <div className="rounded-xl border border-[var(--card-border)] bg-slate-50/80 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
                          {t("prudenteLabel")}
                        </div>
                        <div className="mt-2 text-2xl font-bold text-[var(--accent)] md:text-3xl">
                          {prudenteFromApi}
                        </div>
                      </div>
                    )}
                    {risultatoUnico && (
                      <div className="rounded-xl border border-[var(--card-border)] bg-slate-50/80 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
                          {t("risultatoUnicoLabel")}
                        </div>
                        <div className="mt-2 text-2xl font-bold text-[var(--accent)] md:text-3xl">
                          {risultatoUnico}
                        </div>
                        {risultatoUnicoIsFromOdds && (
                          <div className="mt-1 text-[10px] text-[var(--foreground-muted)] md:text-xs">
                            {t("risultatoUnicoSource")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

            {/* 3. Come arrivano le squadre a questa sfida */}
            {(homeFixtures.length > 0 || awayFixtures.length > 0) && (
            <section className="mt-4 min-w-0 overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-sm md:mt-6 md:p-6">
              <h2 className="mb-3 text-base font-bold text-[var(--foreground)] md:mb-4 md:text-xl">
                {t("lastMatches")}
              </h2>
              <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:gap-10">
                {homeFixtures.length > 0 && (
                  <div className="min-w-0">
                    <TeamLastFixtures
                      teamName={home}
                      stats={computeLastFixturesStats(
                        homeFixtures,
                        homeId,
                        home,
                        intlLocale
                      )}
                      t={t}
                    />
                  </div>
                )}
                {awayFixtures.length > 0 && (
                  <div className="min-w-0">
                    <TeamLastFixtures
                      teamName={away}
                      stats={computeLastFixturesStats(
                        awayFixtures,
                        awayId,
                        away,
                        intlLocale
                      )}
                      t={t}
                    />
                  </div>
                )}
              </div>
            </section>
          )}

            {/* 4. Analisi Pronostico */}
            {analysisParagraphs.length > 0 && (
              <section
                className="mt-4 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm md:mt-6 md:p-6"
                aria-labelledby="analisi-heading"
              >
                <h2 id="analisi-heading" className="mb-4 text-lg font-bold text-[var(--foreground)] md:text-xl">
                  {t("analysis")}
                </h2>
                <article className="space-y-3">
                  {analysisParagraphs.map((paragraph, i) => (
                    <p key={i} className="text-sm leading-relaxed text-[var(--foreground-muted)] last:mb-0 md:text-base">
                      {paragraph}
                    </p>
                  ))}
                </article>
              </section>
            )}

            {/* 5. Dettagli match */}
            <section className="mt-4 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm md:mt-6 md:p-6">
              <h2 className="mb-4 text-lg font-bold text-[var(--foreground)] md:text-xl">{t("details")}</h2>
            <div className="grid grid-cols-2 gap-3 text-sm text-[var(--foreground-muted)] md:text-base">
              {fixture.fixture.venue?.name && (
                <div>
                  <span className="font-semibold text-[var(--foreground)]">{t("stadium")}:</span>{" "}
                  {fixture.fixture.venue.name}
                </div>
              )}
              {fixture.fixture.referee && (
                <div>
                  <span className="font-semibold text-[var(--foreground)]">{t("referee")}:</span>{" "}
                  {fixture.fixture.referee}
                </div>
              )}
              {fixture.league.round && (
                <div>
                  <span className="font-semibold text-[var(--foreground)]">{t("round")}:</span>{" "}
                  {fixture.league.round}
                </div>
              )}
              {fixture.league.season != null && (
                <div>
                  <span className="font-semibold text-[var(--foreground)]">{t("season")}:</span>{" "}
                  {typeof fixture.league.season === "number"
                    ? `${fixture.league.season}-${fixture.league.season + 1}`
                    : String(fixture.league.season).includes("-")
                      ? fixture.league.season
                      : `${fixture.league.season}-${Number(fixture.league.season) + 1}`}
                </div>
              )}
            </div>
          </section>
          </div>
        </main>
      </>
    );
  } catch (error: unknown) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Errore caricamento partita</h1>
        <pre className="mt-4 overflow-auto rounded-xl border bg-neutral-50 p-4 text-sm">
          {String((error as Error)?.message ?? error)}
        </pre>
      </main>
    );
  }
}
