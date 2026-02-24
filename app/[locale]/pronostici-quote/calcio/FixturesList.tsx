"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import LeagueFilter from "./LeagueFilter";
import { localeToIntl } from "@/i18n/routing";
import { normalizeTeamName, buildMatchSlug } from "@/lib/textEncoding";
import { useLiveMatches } from "@/lib/hooks/useLiveMatches";
import { STATUS_LABELS } from "@/lib/live/types";
import LiveLastUpdatedBadge from "@/lib/components/LiveLastUpdatedBadge";

interface FixturesListProps {
  leagues: any[];
  totalMatches: number;
  locale: string;
}

export default function FixturesList({
  leagues,
  totalMatches,
  locale,
}: FixturesListProps) {
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const liveMap = useLiveMatches();
  const intlLocale = localeToIntl[locale] ?? "it-IT";

  const leagueMap = new Map<number, { league: any; matches: any[] }>();
  leagues.forEach((g: any) => {
    const existing = leagueMap.get(g.league.id);
    if (existing) {
      existing.matches.push(...g.matches);
    } else {
      leagueMap.set(g.league.id, { league: g.league, matches: [...g.matches] });
    }
  });
  const uniqueLeagues = Array.from(leagueMap.values());

  const filteredLeagues =
    selectedLeagueId === null
      ? leagues
      : leagues.filter((group: any) => group.league.id === selectedLeagueId);

  return (
    <div className="space-y-6">
      <div className="mb-4 text-sm text-gray-600">
        {totalMatches} {totalMatches !== 1 ? "partite" : "partita"} in{" "}
        {uniqueLeagues.length} campionat{uniqueLeagues.length !== 1 ? "i" : "o"}
      </div>

      <LeagueFilter
        leagues={uniqueLeagues}
        onLeagueSelect={setSelectedLeagueId}
        selectedLeagueId={selectedLeagueId}
      />

      {filteredLeagues.map((group: any) => (
        <div key={`${group.league.id}-${group.date}`} className="space-y-3">
          <div className="flex items-center gap-3 border-b-2 border-gray-200 pb-2">
            {group.league.logo && (
              <img
                src={group.league.logo}
                alt={`Logo ${group.league.name}`}
                className="h-8 w-8 object-contain"
              />
            )}
            <div>
              <h2 className="text-lg font-bold">{group.league.name}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {group.league.flag && (
                  <img
                    src={group.league.flag}
                    alt={`Bandiera ${group.league.country}`}
                    className="h-3 w-4 object-contain"
                  />
                )}
                <span>{group.league.country}</span>
                {group.date && (
                  <span className="font-medium text-gray-800">
                    •{" "}
                    {new Date(group.date).toLocaleDateString(intlLocale, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                )}
                {group.league.round && (
                  <span className="text-gray-400">• {group.league.round}</span>
                )}
              </div>
            </div>
            <span className="ml-auto text-sm text-gray-500">
              {group.matches.length} partit{group.matches.length !== 1 ? "e" : "a"}
            </span>
          </div>

          <div className="space-y-3 pl-2">
            {group.matches.map((match: any) => {
              const slug = buildMatchSlug(
                match.teams.home.name,
                match.teams.away.name,
                match.fixture.id
              );
              const live = liveMap[match.fixture.id];
              const statusShort = live?.status ?? match.fixture.status.short;
              const isNotStarted = statusShort === "NS";

              return (
                <Link
                  key={match.fixture.id}
                  href={`/pronostici-quote/calcio/${slug}`}
                  className="block rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:border-[var(--foreground)]/30 hover:shadow-md"
                >
                  <div className="grid grid-cols-3 items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-medium">
                          {normalizeTeamName(match.teams.home.name)}
                        </span>
                        {match.teams.home.logo && (
                          <img
                            src={match.teams.home.logo}
                            alt={`Logo ${match.teams.home.name}`}
                            className="h-8 w-8 object-contain"
                          />
                        )}
                      </div>
                    </div>

                    <div className="text-center">
                      {isNotStarted ? (
                        <>
                          <div className="mb-1 text-lg font-semibold text-gray-700">
                            {new Date(match.fixture.date).toLocaleTimeString(
                              intlLocale,
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(match.fixture.date).toLocaleDateString(
                              intlLocale,
                              { day: "numeric", month: "short" }
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="mb-1 text-3xl font-bold">
                            {live
                              ? `${live.score.home} - ${live.score.away}`
                              : `${match.goals?.home ?? 0} - ${match.goals?.away ?? 0}`}
                          </div>
                          <div className="text-sm text-gray-600">
                            {STATUS_LABELS[statusShort] ?? match.fixture.status.long ?? statusShort}
                          </div>
                          {(live?.minute ?? match.fixture.status.elapsed) != null && (
                            <div className="mt-1 text-xs text-gray-500">
                              {live?.minute ?? match.fixture.status.elapsed}&apos;
                            </div>
                          )}
                          {live?.last_updated_at && (
                            <div className="mt-1">
                              <LiveLastUpdatedBadge lastUpdatedAt={live.last_updated_at} />
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        {match.teams.away.logo && (
                          <img
                            src={match.teams.away.logo}
                            alt={`Logo ${match.teams.away.name}`}
                            className="h-8 w-8 object-contain"
                          />
                        )}
                        <span className="font-medium">
                          {normalizeTeamName(match.teams.away.name)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {match.events && match.events.length > 0 && (
                    <div className="mt-4 border-t pt-4">
                      <div className="mb-2 text-xs font-semibold text-gray-500">
                        Eventi:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {match.events.slice(0, 5).map((event: any, idx: number) => (
                          <span
                            key={idx}
                            className="rounded bg-gray-100 px-2 py-1 text-xs"
                          >
                            {event.time.elapsed}&apos;{" "}
                            {event.type === "Goal"
                              ? "⚽"
                              : event.type === "Card"
                                ? "🟨"
                                : ""}{" "}
                            {event.player?.name || event.detail}
                          </span>
                        ))}
                        {match.events.length > 5 && (
                          <span className="text-xs text-gray-400">
                            +{match.events.length - 5} altri
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
