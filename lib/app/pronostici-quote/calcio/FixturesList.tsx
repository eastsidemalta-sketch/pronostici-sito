'use client';

import { useState } from 'react';
import Link from 'next/link';
import LeagueFilter from './LeagueFilter';
import { buildMatchSlug } from '@/lib/textEncoding';
import { useLiveMatches } from '@/lib/hooks/useLiveMatches';
import { STATUS_LABELS } from '@/lib/live/types';

interface FixturesListProps {
  leagues: any[];
  totalMatches: number;
}

export default function FixturesList({ leagues, totalMatches }: FixturesListProps) {
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const liveMap = useLiveMatches();

  // Per il filtro: leghe uniche con matches aggregate
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

  const filteredLeagues = selectedLeagueId === null
    ? leagues
    : leagues.filter((group: any) => group.league.id === selectedLeagueId);

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600 mb-4">
        Trovate {totalMatches} partita{totalMatches !== 1 ? 'e' : ''} in {uniqueLeagues.length} campionato{uniqueLeagues.length !== 1 ? 'i' : ''}
      </div>

      <LeagueFilter
        leagues={uniqueLeagues}
        onLeagueSelect={setSelectedLeagueId}
        selectedLeagueId={selectedLeagueId}
      />

      {filteredLeagues.map((group: any) => (
        <div key={`${group.league.id}-${group.date}`} className="space-y-3">
          {/* Header: Campionato e Data (stile Oddschecker) */}
          <div className="flex items-center gap-3 pb-2 border-b-2 border-gray-200">
            {group.league.logo && (
              <img
                src={group.league.logo}
                alt={`Logo ${group.league.name}`}
                className="w-8 h-8 object-contain"
              />
            )}
            <div>
              <h2 className="font-bold text-lg">{group.league.name}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {group.league.flag && (
                  <img
                    src={group.league.flag}
                    alt={`Bandiera ${group.league.country}`}
                    className="w-4 h-3 object-contain"
                  />
                )}
                <span>{group.league.country}</span>
                {group.date && (
                  <span className="font-medium text-gray-800">
                    • {new Date(group.date).toLocaleDateString('it-IT', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                )}
                {group.league.round && (
                  <span className="text-gray-400">• {group.league.round}</span>
                )}
              </div>
            </div>
            <span className="ml-auto text-sm text-gray-500">
              {group.matches.length} partita{group.matches.length !== 1 ? 'e' : ''}
            </span>
          </div>

          {/* Partite del campionato */}
          <div className="space-y-3 pl-2">
            {group.matches.map((match: any) => {
              const slug = buildMatchSlug(
                match.teams.home.name,
                match.teams.away.name,
                match.fixture.id
              );
              const live = liveMap[match.fixture.id];
              const statusShort = live?.status ?? match.fixture.status.short;
              const isNotStarted = statusShort === 'NS';

              return (
              <Link 
                key={match.fixture.id} 
                href={`/pronostici-quote/calcio/${slug}`}
                className="block rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow hover:border-[var(--foreground)]/30"
              >
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-medium">{match.teams.home.name}</span>
                      {match.teams.home.logo && (
                        <img
                          src={match.teams.home.logo}
                          alt={`Logo ${match.teams.home.name}`}
                          className="w-8 h-8 object-contain"
                        />
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    {isNotStarted ? (
                      <>
                        <div className="text-lg font-semibold mb-1 text-gray-700">
                          {new Date(match.fixture.date).toLocaleTimeString('it-IT', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(match.fixture.date).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-3xl font-bold mb-1">
                          {live
                            ? `${live.score.home} - ${live.score.away}`
                            : `${match.goals?.home ?? 0} - ${match.goals?.away ?? 0}`}
                        </div>
                        <div className="text-sm text-gray-600">
                          {STATUS_LABELS[statusShort] ?? match.fixture.status.long ?? statusShort}
                        </div>
                        {(live?.minute ?? match.fixture.status.elapsed) != null && (
                          <div className="text-xs text-gray-500 mt-1">
                            {live?.minute ?? match.fixture.status.elapsed}'
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
                          className="w-8 h-8 object-contain"
                        />
                      )}
                      <span className="font-medium">{match.teams.away.name}</span>
                    </div>
                  </div>
                </div>

                {/* Eventi (Goal, Card, etc.) */}
                {match.events && match.events.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-xs font-semibold text-gray-500 mb-2">Eventi:</div>
                    <div className="flex flex-wrap gap-2">
                      {match.events.slice(0, 5).map((event: any, idx: number) => (
                        <span 
                          key={idx}
                          className="text-xs px-2 py-1 rounded bg-gray-100"
                        >
                          {event.time.elapsed}' {event.type === 'Goal' ? '⚽' : event.type === 'Card' ? '🟨' : ''} {event.player?.name || event.detail}
                        </span>
                      ))}
                      {match.events.length > 5 && (
                        <span className="text-xs text-gray-400">+{match.events.length - 5} altri</span>
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
