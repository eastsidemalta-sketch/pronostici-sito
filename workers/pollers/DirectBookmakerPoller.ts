import { getBookmakers } from '@/lib/quotes/bookmakersData';
import type { FetchDirectOptions } from '@/lib/quotes/providers/directBookmakerFetcher';
import { fetchDirectBookmakerQuotes } from '@/lib/quotes/providers/directBookmakerFetcher';
import { isNetwinBookmaker } from '@/lib/quotes/providers/netwinCache';
import { BasePoller } from '../core/BasePoller';
import { redis } from '../config/redisClient';
import { DataNormalizer } from '../core/DataNormalizer';
import { mergeDirectMultiMarketToStandardByMatch } from '../utils/mergeDirectMultiMarketToStandard';

/**
 * Poll su `fetchDirectBookmakerQuotes` (stessa pipeline del sito: Betboom POST, Betwinner GET, ecc.).
 * Non usare per Netwin IT-0002: lì serve `NetwinDeltaPoller` (DELTA + rate limit condiviso).
 */
export class DirectBookmakerPoller extends BasePoller {
  constructor(
    private readonly bookmakerId: string,
    intervalMs: number,
    private readonly fetchOptions?: FetchDirectOptions
  ) {
    super(bookmakerId, intervalMs);
  }

  protected async fetchAndProcess(): Promise<void> {
    const bm = getBookmakers().find((b) => b.id === this.bookmakerId);
    if (!bm?.apiEndpoint || !bm.apiMappingConfig) {
      console.warn(
        `[DirectBookmakerPoller:${this.bookmakerId}] bookmaker assente o senza apiEndpoint/apiMappingConfig, skip.`
      );
      return;
    }
    if (isNetwinBookmaker(bm.siteId, bm.id)) {
      console.warn(
        `[DirectBookmakerPoller:${this.bookmakerId}] Netwin va gestito con NetwinDeltaPoller, skip.`
      );
      return;
    }
    if (!bm.apiKey?.trim()) {
      console.warn(`[DirectBookmakerPoller:${this.bookmakerId}] apiKey vuota, skip.`);
      return;
    }
    if (bm.isActive === false) {
      console.warn(`[DirectBookmakerPoller:${this.bookmakerId}] isActive=false, skip.`);
      return;
    }

    try {
      const result = await fetchDirectBookmakerQuotes(
        bm,
        undefined,
        this.fetchOptions
      );
      const rows = mergeDirectMultiMarketToStandardByMatch(result);
      if (rows.length === 0) return;

      const redisPipeline = redis.pipeline();
      for (const row of rows) {
        const normalizedData = DataNormalizer.process(
          this.bookmakerId,
          row.homeTeam,
          row.awayTeam,
          row.markets
        );
        if (normalizedData) {
          const redisKey = `match:odds:${normalizedData.apiFootballMatchId}`;
          redisPipeline.hset(
            redisKey,
            this.bookmakerId,
            JSON.stringify(normalizedData)
          );
          redisPipeline.expire(redisKey, 1800);
        }
      }
      await redisPipeline.exec();
    } catch (error) {
      console.error(`[DirectBookmakerPoller:${this.bookmakerId}] Fetch failed:`, error);
      throw error;
    }
  }
}
