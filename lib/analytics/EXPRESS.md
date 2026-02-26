# Market Analytics - Integrazione Express

Moduli Express-compatibili per Market Analytics.

## Setup Express

```ts
import express from "express";
import cookieParser from "cookie-parser";
import {
  ensureVisitorIdCookie,
  trackMarketRequest,
  requireAdminToken,
  getMarketStats,
} from "@/lib/analytics";
import { determineMarket } from "@/lib/markets";

const app = express();
app.use(cookieParser());
app.use(express.json());

// 1. Visitor ID (privacy-safe)
app.use(ensureVisitorIdCookie);

// 2. Determina market
app.use((req, res, next) => {
  req.market = determineMarket({
    cookies: req.cookies,
    headers: req.headers,
  });
  next();
});

// 3. Market tracking (solo su rotte user-facing)
app.use(trackMarketRequest);

// 4. Endpoint analytics (protetto)
app.get("/api/market-stats", requireAdminToken, async (req, res) => {
  const range = parseInt(req.query.range as string) || 30;
  const stats = await getMarketStats(Math.min(90, Math.max(1, range)));
  res.json(stats);
});
```

## Struttura Redis

```
metrics:market:requests:IT:20260226      # INCR, TTL 90d
metrics:market:requests:total:20260226  # INCR, TTL 90d
metrics:market:unique:IT:20260226        # PFADD (HLL), TTL 90d
```

## Protezione

- Header: `X-Admin-Token: <ADMIN_ANALYTICS_TOKEN>`
- Se mancante o non valido → 401 Unauthorized

## Integrazione Next.js

Il progetto usa Next.js. L'endpoint `/api/market-stats` è già implementato in `app/api/market-stats/route.ts`.

Per il tracking:
- `recordMarketHit(market, vid)` può essere chiamato da API routes
- `ensureVisitorIdCookie` va adattato per Next.js middleware (Set-Cookie header)
