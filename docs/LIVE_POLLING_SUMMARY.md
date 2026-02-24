# LIVE Polling Summary

## LIVE-Enabled Sports

| Sport     | Status | Polling interval | API endpoint |
|-----------|--------|------------------|--------------|
| Football  | Enabled | 30 s | `https://v3.football.api-sports.io/fixtures?live=all` |
| Basketball| Enabled | 10 s | `https://v1.basketball.api-sports.io/games?date=YYYY-MM-DD` |
| Rugby     | Enabled | 30 s | `https://v1.rugby.api-sports.io/games?date=YYYY-MM-DD` |
| Tennis    | **Disabled** | — | API-Football does not support Tennis |

## API-Football Limitations

- **Tennis**: Not supported. No Tennis product in the API-Football / API-Sports ecosystem. LIVE polling is disabled for Tennis.
- **Basketball / Rugby**: No `live=all` parameter. We fetch games by date (`date=YYYY-MM-DD`) and filter by LIVE status in the response.
- **League IDs**: Basketball and Rugby use API-Sports league IDs. Verify via `GET /leagues` for each sport. Current config: NBA (12), EuroLeague (117), LBA (120); Six Nations (11), Top 14 (16), Premiership (4), URC (1).

## Confirmation

- **Only** Football, Basketball, and Rugby trigger LIVE polling.
- Tennis, Ice Hockey, Baseball, and all other sports do **not** trigger LIVE polling.
- All use the same API key (`API_FOOTBALL_KEY` / API-Sports dashboard).
- Cost safeguards (tiers, downgrade, kill switch) apply to all sports.
- Frontend polling logic is unchanged.
