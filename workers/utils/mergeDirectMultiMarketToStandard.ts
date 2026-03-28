import type {
  DirectMultiMarketResult,
  DirectQuote,
} from '@/lib/quotes/providers/directBookmakerFetcher';
import type { StandardMarkets } from './marketMapper';

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function aggKey(home: string, away: string): string {
  return `${(home || '').toLowerCase().trim()}|${(away || '').toLowerCase().trim()}`;
}

/**
 * Unisce i mercati già normalizzati da `fetchDirectBookmakerQuotes` in un unico `StandardMarkets` per partita.
 */
export function mergeDirectMultiMarketToStandardByMatch(
  result: DirectMultiMarketResult
): Array<{ homeTeam: string; awayTeam: string; markets: StandardMarkets }> {
  type Entry = { homeTeam: string; awayTeam: string; markets: StandardMarkets };
  const map = new Map<string, Entry>();

  function entryFor(q: DirectQuote): Entry {
    const k = aggKey(q.homeTeam, q.awayTeam);
    let e = map.get(k);
    if (!e) {
      e = { homeTeam: q.homeTeam, awayTeam: q.awayTeam, markets: {} };
      map.set(k, e);
    }
    return e;
  }

  for (const q of result.h2h ?? []) {
    const e = entryFor(q);
    const o = q.outcomes;
    const h = num(o.home);
    const d = num(o.draw);
    const a = num(o.away);
    if (h) e.markets.match_winner_1 = h;
    if (d) e.markets.match_winner_x = d;
    if (a) e.markets.match_winner_2 = a;
  }

  for (const q of result.spreads ?? []) {
    const e = entryFor(q);
    const o = q.outcomes;
    if (num(o.home)) e.markets.spread_home = num(o.home);
    if (num(o.away)) e.markets.spread_away = num(o.away);
    if (o.homePoint != null && Number.isFinite(Number(o.homePoint))) {
      e.markets.spread_home_point = Number(o.homePoint);
    }
    if (o.awayPoint != null && Number.isFinite(Number(o.awayPoint))) {
      e.markets.spread_away_point = Number(o.awayPoint);
    }
  }

  for (const q of result.totals_25 ?? []) {
    const e = entryFor(q);
    const o = q.outcomes;
    if (num(o.over)) e.markets.over_2_5 = num(o.over);
    if (num(o.under)) e.markets.under_2_5 = num(o.under);
  }

  for (const q of result.totals_15 ?? []) {
    const e = entryFor(q);
    const o = q.outcomes;
    if (num(o.over)) e.markets.over_1_5 = num(o.over);
    if (num(o.under)) e.markets.under_1_5 = num(o.under);
  }

  for (const q of result.btts ?? []) {
    const e = entryFor(q);
    const o = q.outcomes;
    if (num(o.yes)) e.markets.goal = num(o.yes);
    if (num(o.no)) e.markets.nogoal = num(o.no);
  }

  for (const q of result.double_chance ?? []) {
    const e = entryFor(q);
    const o = q.outcomes;
    if (num(o.homeOrDraw)) e.markets.double_chance_1x = num(o.homeOrDraw);
    if (num(o.homeOrAway)) e.markets.double_chance_12 = num(o.homeOrAway);
    if (num(o.drawOrAway)) e.markets.double_chance_x2 = num(o.drawOrAway);
  }

  return Array.from(map.values()).filter((x) => x.homeTeam && x.awayTeam);
}
