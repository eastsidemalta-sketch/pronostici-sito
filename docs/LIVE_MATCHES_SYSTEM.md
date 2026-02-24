# Live Match Update System

Backend system for polling and storing live match data for Football, Basketball, and Rugby. **Completely independent from frontend traffic.**

## Cost & Safety Controls

- **API usage monitoring**: Tracks hourly, daily, monthly counts (Redis or `data/liveUsage.json`)
- **Thresholds**: 70%, 85%, 95% of monthly budget trigger automatic downgrade
- **Kill switch**: `LIVE_POLLING_DISABLED=1` instantly stops external polling
- **Budget guarantee**: At 95% external polling stops; system cannot exceed budget

## Sport-Specific Polling (LIVE matches only)

Fast polling applies **only** when match status is LIVE and competition has `enable_live = true`.

| Sport     | LIVE statuses              | Base interval | Max live matches | API-Football support |
|-----------|----------------------------|---------------|------------------|----------------------|
| Football  | 1H, HT, 2H, ET, PEN, PEN_LIVE | 30 s          | 25               | Yes                  |
| Basketball| Q1, Q2, Q3, Q4, OT         | 10 s          | 15               | Yes                  |
| Rugby     | 1H, HT, 2H, BT, ET, PT     | 30 s          | 15               | Yes                  |
| Tennis    | LIVE, IN_PLAY              | 15 s          | 15               | **No** – disabled    |
| Ice Hockey| P1, P2, P3, OT            | 15 s          | 15               | Not implemented      |
| Baseball  | LIVE                       | 30 s          | 15               | Not implemented      |

**LIVE-enabled sports**: Football, Basketball, Rugby (via API-Sports / API-Football ecosystem).

**Tennis**: API-Football does not support Tennis. LIVE polling is disabled for Tennis.

## Polling State Machine (tier downgrade)

Usage tiers multiply the base interval. At 95%, polling stops.

| Tier   | Monthly % | Football (30s base) | Behavior                    |
|--------|-----------|---------------------|-----------------------------|
| normal | &lt; 70%   | 30 s                | Full polling                |
| tier70 | 70–85%    | 60 s                | Downgraded                  |
| tier85 | 85–95%    | 90 s                | Heavily downgraded          |
| tier95 | ≥ 95%     | —                   | **Stop** external polling   |

## API-Football / API-Sports Endpoints

| Sport     | Endpoint                                              | Method        | Notes                                      |
|-----------|-------------------------------------------------------|---------------|--------------------------------------------|
| Football  | `https://v3.football.api-sports.io/fixtures?live=all` | GET           | Returns only LIVE fixtures                  |
| Basketball| `https://v1.basketball.api-sports.io/games?date=YYYY-MM-DD` | GET | Fetch by date, filter by LIVE status (Q1–Q4, OT) |
| Rugby     | `https://v1.rugby.api-sports.io/games?date=YYYY-MM-DD` | GET           | Fetch by date, filter by LIVE status (1H, 2H, etc.) |

**Authentication**: All use `x-apisports-key` header (same API key from dashboard).

**Tennis**: Not supported by API-Football. No LIVE endpoint available.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────────────────┐
│  Cron / Script  │────▶│  runLivePollCycle │────▶│  API-Sports (3 calls/cycle)     │
│  (every 2 min)  │     │  + usage check    │     │  • Football fixtures?live=all   │
└─────────────────┘     └────────┬─────────┘     │  • Basketball games?date=...     │
                                 │               │  • Rugby games?date=...         │
                    ┌────────────┼────────────┐   └─────────────────────────────────┘
                    ▼            ▼            ▼
             ┌──────────┐ ┌──────────┐ ┌──────────┐
             │  Usage   │ │  Live    │ │  Logger  │
             │  Store   │ │  Store   │ │          │
             └──────────┘ └────┬─────┘ └──────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │  GET /api/        │
                     │  live-matches     │
                     │  (internal API)   │
                     └──────────────────┘
```

## Polling Logic

- **Frequency**: Sport-specific base interval × tier multiplier (see state machine above)
- **Status filter**: Only fixtures with LIVE status per sport (e.g. 1H, HT, 2H, ET, PEN, PEN_LIVE for football)
- **enable_live**: Only competitions with `enable_live = true` in `lib/live/liveLeaguesConfig.ts` get fast polling
- **Priority**: When live matches exceed max per sport, higher-priority competitions (lower priority number) are selected first

## Storage

- **Redis** (when `REDIS_URL` is set): Uses `ioredis`. Keys: `live:fixture:{id}`, index: `live:fixture_ids`
- **JSON file** (fallback): `data/liveMatches.json` when Redis is not configured

## Running the Poller

### Option 1: Standalone script (system cron)

```bash
# Run once (for cron)
npm run live-poller

# Cron: every 30 seconds for football (requires two entries)
* * * * * cd /path/to/pronostici-sito && npm run live-poller
* * * * * sleep 30 && cd /path/to/pronostici-sito && npm run live-poller
```

### Option 2: Vercel Cron

If deployed on Vercel, `vercel.json` is configured to hit `/api/cron/live-matches` every 2 minutes.

**Protection**: Set `CRON_SECRET` in env. The cron endpoint expects `Authorization: Bearer <CRON_SECRET>`.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `API_FOOTBALL_KEY` | Yes (for polling) | API-Football API key |
| `REDIS_URL` | No | Redis connection URL. If unset, uses JSON file. |
| `CRON_SECRET` | No | Secret for cron endpoint auth |
| `LIVE_POLLING_DISABLED` | No | Set to `1` or `true` to disable external polling (kill switch) |
| `LIVE_API_MONTHLY_BUDGET` | No | Monthly API call budget (default: 3000) |

## Internal API

**GET `/api/live-matches`** – Returns live match state from store. No external API calls.

**Response schema (minimal, stable across polls):**

```json
{
  "matches": [
    {
      "fixture_id": 123456,
      "status": "1H",
      "minute": 23,
      "score": { "home": 1, "away": 0 },
      "last_updated_at": "2026-02-24T17:00:00.000Z"
    }
  ]
}
```

Single fixture (`?id=123`):
```json
{
  "match": {
    "fixture_id": 123456,
    "status": "1H",
    "minute": 23,
    "score": { "home": 1, "away": 0 },
    "last_updated_at": "2026-02-24T17:00:00.000Z"
  }
}
```

No teams, venue, league, events, odds, or statistics.

**`polling_status`** (in response): `"active"` | `"degraded"` | `"paused"` | `"disabled"` – backend polling health.

**GET `/api/live-matches/status`** – Usage stats and tier (for monitoring).

## Logging

All live system logs are prefixed with `[live]` and structured as JSON:
- `poll_start`, `poll_success`, `poll_skip`, `poll_error`
- `threshold_crossed`, `polling_downgrade`, `kill_switch_active`
- `usage_snapshot` (hourly, daily, monthly, budget)

## Data Schema

Stored per fixture:
- `fixture_id` – API-Football fixture ID
- `status` – 1H, HT, 2H, ET, PEN, PEN_LIVE
- `minute` – Elapsed minutes (null if not available)
- `score_home` / `score_away` – Goals
- `last_updated_at` – ISO 8601 timestamp
