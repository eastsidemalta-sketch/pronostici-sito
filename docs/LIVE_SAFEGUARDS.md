# Live Match System – Safeguards Summary

## Implemented Safeguards

### 1. API Usage Monitoring
- **Hourly count**: `live:usage:hourly:YYYY-MM-DD-HH` (Redis) or `data/liveUsage.json`
- **Daily count**: `live:usage:daily:YYYY-MM-DD` (Redis) or derived from hourly
- **Monthly count**: `live:usage:monthly:YYYY-MM` (Redis) or derived from hourly
- **Persistence**: Redis when `REDIS_URL` is set; otherwise JSON file in `data/`

### 2. Automatic Polling Downgrade
| Tier   | Threshold | Football (base 30s) | Action                    |
|--------|-----------|---------------------|---------------------------|
| normal | &lt; 70%   | 30 s                | Default                   |
| tier70 | 70–85%    | 60 s                | Downgrade                 |
| tier85 | 85–95%    | 90 s                | Heavy downgrade           |
| tier95 | ≥ 95%     | —                   | **Stop** external polling |

Downgrade multiplies the sport-specific base interval. Applied by skipping poll cycles until the required interval has elapsed.

### 3. Graceful Frontend Behavior
- Frontend polls `/api/live-matches` every 30 seconds (unchanged)
- Response includes `polling_status`: `active` | `degraded` | `paused` | `disabled`
- Frontend continues to show last known live state; no errors or spinners
- Internal endpoint never calls external APIs; always returns cached data

### 4. Kill Switch
- **Env**: `LIVE_POLLING_DISABLED=1` or `LIVE_POLLING_DISABLED=true`
- **Effect**: Backend skips all external API calls; returns immediately
- **Frontend**: Keeps polling internal endpoint; shows cached or static scores

### 5. Logging & Alerts
- All logs prefixed with `[live]` for easy filtering
- Structured JSON: `{ ts, event, ...data }`
- **Events**: `poll_start`, `poll_success`, `poll_skip`, `poll_error`, `threshold_crossed`, `polling_downgrade`, `kill_switch_active`, `usage_snapshot`
- Warnings emitted when thresholds (70%, 85%, 95%) are crossed

---

## Polling Interval State Machine

```
                    ┌─────────────────────────────────────────┐
                    │           monthly_used / budget          │
                    └─────────────────────────────────────────┘
                                         │
         ┌───────────────────────────────┼───────────────────────────────┐
         │                               │                               │
         ▼                               ▼                               ▼
    ┌─────────┐                    ┌─────────┐                    ┌─────────┐
    │ < 70%   │                    │ 70–85%  │                    │ 85–95%  │
    │ normal  │                    │ tier70  │                    │ tier85  │
    │ 2 / 5m  │                    │ 5 / 10m │                    │ 10/15m  │
    └────┬────┘                    └────┬────┘                    └────┬────┘
         │                              │                              │
         │         usage increases      │         usage increases      │
         └──────────────────────────────┴──────────────────────────────┘
                                         │
                                         ▼
                                  ┌─────────┐
                                  │ ≥ 95%   │
                                  │ tier95  │
                                  │  STOP   │
                                  └─────────┘
```

**Transitions**: Usage increases only when an external API call is made. At 95%, no further calls are made, so usage cannot increase further.

---

## Budget Guarantee

**The system cannot exceed the defined API budget.**

1. **Pre-call check**: Before each external API call, `runLivePollCycle` checks `getUsageTier(monthlyUsed)`. If tier is `tier95`, it returns immediately without calling the API.
2. **95% cap**: Polling stops at 95% of budget (e.g. 2850 of 3000). A 5% buffer prevents reaching the limit.
3. **Increment after call**: Usage is incremented only after a successful API call. Skipped cycles (kill switch, tier95, interval not elapsed) do not increment.
4. **No race**: Usage is read at the start of each cycle. The cron/script runs sequentially; there is no concurrent polling.

---

## Configuration

| Env Variable             | Default | Description                    |
|--------------------------|---------|--------------------------------|
| `LIVE_POLLING_DISABLED`  | —       | `1` or `true` = kill switch    |
| `LIVE_API_MONTHLY_BUDGET`| 3000    | Monthly API call budget        |
