import { getBookmakers } from '@/lib/quotes/bookmakersData';
import {
  buildNetwinGetRequest,
  extractEventsFromDirectFeed,
  parseBookmakerFeedResponse,
} from '@/lib/quotes/providers/directBookmakerFetcher';
import { canDoDelta, isNetwinBookmaker, recordDeltaCall } from '@/lib/quotes/providers/netwinCache';
import { BasePoller } from '../core/BasePoller';
import { redis } from '../config/redisClient';
import { DataNormalizer } from '../core/DataNormalizer';
import { mapBookmakerMarkets } from '../utils/marketMapper';

/** Allineato a `bookmakers.json` (`id` / `apiBookmakerKey`) — stessa stringa per mapper, normalizer e campo Redis hash. */
const NETWIN_BOOKMAKER_KEY = 'netwinit' as const;

/** Stessi campi usati in `extractTeamsFromAvvenimento` / `mapNetwinMarkets` (evento flat o nodo Exalogic). */
function netwinSideNames(event: unknown): { home: string; away: string } {
  if (!event || typeof event !== 'object') return { home: '', away: '' };
  const o = event as Record<string, unknown>;
  return {
    home: String(o.homeTeam ?? o.squadraCasa ?? o.squadra1 ?? '').trim(),
    away: String(o.awayTeam ?? o.squadraOspite ?? o.squadra2 ?? '').trim(),
  };
}

function resolveNetwinBookmaker() {
  return getBookmakers().find((b) => isNetwinBookmaker(b.siteId, b.id));
}

export class NetwinDeltaPoller extends BasePoller {
  constructor(intervalMs: number = 30_000) {
    super(`${NETWIN_BOOKMAKER_KEY}-delta`, intervalMs);
  }

  protected async fetchAndProcess(): Promise<void> {
    const netwinDisabled =
      process.env.NETWIN_DISABLE_FULL === '1' ||
      process.env.NETWIN_DISABLE_FULL === 'true';
    if (netwinDisabled) {
      console.warn(
        '[NetwinDeltaPoller] NETWIN_DISABLE_FULL attivo: nessuna chiamata delta (come fetchDirectBookmakerQuotes).'
      );
      return;
    }

    const bm = resolveNetwinBookmaker();
    if (!bm?.apiMappingConfig) {
      console.error(
        '[NetwinDeltaPoller] Bookmaker Netwin (siteId IT-0002) non trovato o senza apiMappingConfig in data/bookmakers.json.'
      );
      return;
    }

    const init = buildNetwinGetRequest(bm, 'delta');
    if (!init) {
      console.error(
        '[NetwinDeltaPoller] Impossibile costruire la richiesta: verifica apiEndpoint, apiKey e apiRequestConfig GET su Netwin.'
      );
      return;
    }

    if (!(await canDoDelta())) {
      console.log('[NetwinDeltaPoller] Limite DELTA Netwin (10s): ciclo saltato.');
      return;
    }

    try {
      const response = await fetch(init.url, {
        method: 'GET',
        headers: init.headers,
        cache: 'no-store',
      });

      const text = await response.text();

      if (!response.ok) {
        console.error(
          `[NetwinDeltaPoller] HTTP ${response.status}:`,
          text.slice(0, 500).replace(/\s+/g, ' ').trim()
        );
        throw new Error(`Netwin delta HTTP ${response.status}`);
      }

      if (
        text.includes('hash_lock') ||
        /richiesta\s+FULL/i.test(text) ||
        /FULL\s+.*\s+in\s+corso/i.test(text)
      ) {
        console.warn('[NetwinDeltaPoller] Risposta hash_lock / FULL in corso: delta non applicata.');
        return;
      }

      const data = parseBookmakerFeedResponse(text);
      const events = extractEventsFromDirectFeed(data, bm.apiMappingConfig);

      const redisPipeline = redis.pipeline();

      for (const event of events) {
        const standardMarkets = mapBookmakerMarkets(NETWIN_BOOKMAKER_KEY, event);

        const { home: rawHomeTeam, away: rawAwayTeam } = netwinSideNames(event);

        const normalizedData = DataNormalizer.process(
          NETWIN_BOOKMAKER_KEY,
          rawHomeTeam,
          rawAwayTeam,
          standardMarkets
        );

        if (normalizedData) {
          const redisKey = `match:odds:${normalizedData.apiFootballMatchId}`;

          redisPipeline.hset(redisKey, NETWIN_BOOKMAKER_KEY, JSON.stringify(normalizedData));
          redisPipeline.expire(redisKey, 1800);
        }
      }

      await redisPipeline.exec();
      await recordDeltaCall();
    } catch (error) {
      console.error(`[NetwinDeltaPoller] Delta fetch failed:`, error);
      throw error;
    }
  }
}
