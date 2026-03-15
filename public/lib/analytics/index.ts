/**
 * Market Analytics - moduli Express-compatibili.
 *
 * Uso:
 *   import { ensureVisitorIdCookie, trackMarketRequest, requireAdminToken } from "@/lib/analytics";
 *   import { determineMarket } from "@/lib/markets";
 *
 *   app.use(ensureVisitorIdCookie);
 *   app.use((req, res, next) => {
 *     req.market = determineMarket({ cookies: req.cookies, headers: req.headers });
 *     next();
 *   });
 *   app.use(trackMarketRequest);
 *   app.get("/api/market-stats", requireAdminToken, marketStatsHandler);
 */

export {
  ensureVisitorIdCookie,
  getVidFromRequest,
  VID_COOKIE_NAME,
} from "./visitorId";
export type { RequestWithCookies, ResponseWithCookie } from "./visitorId";

export {
  trackMarketRequest,
  recordMarketHit,
} from "./marketTracking";
export type { TrackableRequest } from "./marketTracking";

export {
  requireAdminToken,
  ADMIN_TOKEN_HEADER,
} from "./adminAuth";
export type { RequestWithHeaders, ResponseWithStatus } from "./adminAuth";

export {
  getMarketStats,
  recommendationEngine,
} from "./marketStats";
export type {
  MarketStatsResponse,
  MarketStatsEntry,
  DailyMarketData,
} from "./marketStats";

export {
  checkMarketStatsRateLimit,
  rateLimitMarketStats,
} from "./rateLimit";

export {
  getAnalyticsRedis,
  KEY_REQUESTS,
  KEY_REQUESTS_TOTAL,
  KEY_UNIQUE,
  ANALYTICS_TTL_DAYS,
} from "./redis";
