import { NextResponse } from "next/server";
import {
  getBookmakerBonusDescription,
  getBookmakerUrl,
} from "@/lib/quotes/bookmakerUrls";
import { getMultiMarketQuotes } from "@/lib/quotes/quotesEngine";
import { matchTeamNames } from "@/lib/teamAliases";

function addBookmakerUrls(
  quotes: Array<{ bookmakerKey?: string; [k: string]: unknown }>,
  country?: string | null
) {
  return quotes.map((q) => ({
    ...q,
    bookmakerUrl: getBookmakerUrl(q.bookmakerKey || "", country || undefined),
    bonusDescription: country
      ? getBookmakerBonusDescription(q.bookmakerKey || "", country)
      : null,
  }));
}

function filterByMatch<T extends { homeTeam?: string; awayTeam?: string }>(
  items: T[],
  home?: string,
  away?: string
): T[] {
  if (!home || !away) return items;
  return items.filter((q) => {
    const qHome = (q.homeTeam || "").trim();
    const qAway = (q.awayTeam || "").trim();
    return matchTeamNames(qHome, home) && matchTeamNames(qAway, away);
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sportKey = searchParams.get("sportKey");
  const homeTeam = searchParams.get("homeTeam");
  const awayTeam = searchParams.get("awayTeam");
  const country = searchParams.get("country");
  const leagueIdParam = searchParams.get("leagueId");

  if (!sportKey) {
    return NextResponse.json({ error: "sportKey mancante" }, { status: 400 });
  }

  const leagueId = leagueIdParam ? parseInt(leagueIdParam, 10) : undefined;

  const ITALIAN_SOCCER_KEYS = ["soccer_italy_serie_a", "soccer_italy_serie_b", "soccer_italy_copa"];
  let multiMarket: Awaited<ReturnType<typeof getMultiMarketQuotes>>;
  let usedSportKey = sportKey;
  try {
    multiMarket = await getMultiMarketQuotes(sportKey, {
      leagueId: leagueId != null && !isNaN(leagueId) ? leagueId : undefined,
    });
    const hasAnyEvents = Object.values(multiMarket).some((arr) => Array.isArray(arr) && arr.length > 0);
    if (!hasAnyEvents && homeTeam && awayTeam && sportKey.startsWith("soccer_italy_")) {
      for (const fallbackKey of ITALIAN_SOCCER_KEYS) {
        if (fallbackKey === sportKey) continue;
        const fallback = await getMultiMarketQuotes(fallbackKey, {});
        const fallbackHasEvents = Object.values(fallback).some((arr) => Array.isArray(arr) && arr.length > 0);
        if (fallbackHasEvents) {
          multiMarket = fallback;
          usedSportKey = fallbackKey;
          break;
        }
      }
    }
  } catch {
    return NextResponse.json(
      { error: "Errore nel recupero delle quote" },
      { status: 500 }
    );
  }

  const filtered: Record<string, unknown[]> = {};
  const debugParam = searchParams.get("debug");
  let debugInfo: Record<string, unknown> | undefined;

  for (const [marketKey, quotes] of Object.entries(multiMarket)) {
    const arr = Array.isArray(quotes) ? quotes : [];
    const matched =
      homeTeam && awayTeam
        ? filterByMatch(arr as Array<{ homeTeam?: string; awayTeam?: string }>, homeTeam, awayTeam)
        : arr;
    filtered[marketKey] = addBookmakerUrls(matched, country);

    if (debugParam === "1" && marketKey === "h2h") {
      const typed = arr as Array<{ homeTeam?: string; awayTeam?: string }>;
      const uniquePairs = Array.from(
        new Map(typed.map((q) => [`${q.homeTeam} vs ${q.awayTeam}`, { home: q.homeTeam, away: q.awayTeam }])).values()
      ).slice(0, 15);
      debugInfo = {
        sportKey: usedSportKey,
        requestedHome: homeTeam ?? null,
        requestedAway: awayTeam ?? null,
        leagueId: leagueId ?? null,
        totalEventsBeforeFilter: typed.length,
        matchedCount: matched.length,
        sampleTeamsFromApi: uniquePairs,
      };
    }
  }

  const response: Record<string, unknown> = {
    quotes: filtered.h2h,
    multiMarket: filtered,
  };
  if (debugInfo) response._debug = debugInfo;

  return NextResponse.json(response);
}
