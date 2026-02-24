# Architettura: Polling intelligente per ridurre API-Football

Refactoring del sistema di polling centralizzato con frequenze dinamiche basate su kickoff, TTL e finestre temporali.

---

## REGOLA FONDAMENTALE (HARD CONSTRAINT)

> **Il frontend NON deve MAI chiamare direttamente API-Football o qualsiasi bookmaker.**
> Tutte le chiamate esterne avvengono esclusivamente nel layer di polling centralizzato.
> Le route `/api/upcoming-data` e `/api/fixture/[id]` leggono SOLO dallo store.

---

## 1. Descrizione architettura

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SCHEDULER (3 job separati)                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│  fixturesJob      │ predictionsJob      │ quotesJob                              │
│  ogni 6–12h       │ kickoff-based       │ kickoff-based (più frequente)           │
│  (configurabile)   │ >48h: 12h           │ >48h: 15–60 min                         │
│                   │ 48h–6h: 2–3h        │ 48h–2h: 5–15 min                        │
│                   │ ≤6h: 1h             │ ≤2h: 1–5 min                            │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
            ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
            │ API-Football │   │ API-Football │   │ 20+ bookmaker│
            │ fixtures     │   │ predictions  │   │ (GRATIS)     │
            │ per lega     │   │ 1 per fixture│   │ 1 per bm     │
            └──────────────┘   └──────────────┘   └──────────────┘
                    │                   │                   │
                    └───────────────────┼───────────────────┘
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         STORE (Redis)                                            │
│  Se Redis down: DEGRADED MODE – job non eseguiti, frontend legge dati stale      │
│  fixtures:{leagueId}:{dateRange}  │  fixture:{id}  │  predictions:{id}            │
│  quotes:{id}  │  quoteSummary:{id}  │  teamAliasMap  │  resolvedTeamMap            │
│  Ogni record: fetchedAt, ttlSeconds, nextRefreshAt, source, version               │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  API (solo lettura store – ZERO fetch esterni)                                   │
│  GET /api/upcoming-data  │  GET /api/fixture/[id]  │  GET /api/health             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Schema Redis

*(Per versioning/namespace con prefisso env:version, vedi §6.2.)*

| Chiave | Contenuto | TTL | Note |
|--------|-----------|-----|------|
| `upcoming:fixtures:{leagueId}:{fromDate}:{toDate}` | `{ fixtures[], fetchedAt, nextRefreshAt }` | 12h | Per lega + intervallo date |
| `upcoming:fixture:{fixtureId}` | Dettaglio fixture (per /api/fixture/[id]) | 24h | Derivato da fixtures |
| `upcoming:predictions:{fixtureId}` | `{ home, draw, away, fetchedAt, nextRefreshAt }` | dinamico | TTL = nextRefreshAt - now |
| `upcoming:quotes:{fixtureId}` | Raw quote per bookmaker | 15 min | Per debug/audit |
| `upcoming:quoteSummary:{fixtureId}` | `FixtureQuoteSummary` | 15 min | best1/X/2, oddsBasedPct |
| `upcoming:teamAliasMap` | `{ canonical -> [variants] }` | 24h | Cache teamAliases |
| `upcoming:resolvedTeamMap:{fixtureId}` | `{ homeCanonical, awayCanonical }` | 24h | Mapping risolto per fixture |
| `upcoming:index:fixture_ids` | Set di tutti i fixture_id attivi | 24h | Per iterazione |
| `upcoming:lock:fixtures` | Lock distribuito | 180s | Vedi §8 Production Hardening |
| `upcoming:lock:predictions` | Lock | 300s | |
| `upcoming:lock:quotes` | Lock | 300s | |

### Metadati per record

```ts
interface StoreRecordMeta {
  fetchedAt: string;      // ISO timestamp
  ttlSeconds: number;
  nextRefreshAt: string; // ISO timestamp
  source: "api-football" | "bookmaker";
  version: number;       // per cache invalidation
}
```

---

## 3. Pseudocodice / TypeScript outline

### 3.1 Scheduler

```ts
// lib/upcoming/scheduler.ts
// Lock TTL: vedi §8 Production Hardening (lockTTL >= 2× durata max job)

const FIXTURES_INTERVAL_MS = 6 * 60 * 60 * 1000;
const LOCK_TTL = {
  fixtures: parseInt(process.env.UPCOMING_LOCK_TTL_FIXTURES || "180", 10),   // 180s default
  predictions: parseInt(process.env.UPCOMING_LOCK_TTL_PREDICTIONS || "300", 10), // 300s
  quotes: parseInt(process.env.UPCOMING_LOCK_TTL_QUOTES || "300", 10),       // 300s
};

export async function startUpcomingScheduler() {
  if (!getRedis()) {
    logDegradedMode("Redis unavailable – polling disabled");
    return;
  }

  setInterval(async () => {
    await withLock("upcoming:lock:fixtures", LOCK_TTL.fixtures, runFixturesJob);
  }, FIXTURES_INTERVAL_MS);

  setInterval(async () => {
    await withLock("upcoming:lock:predictions", LOCK_TTL.predictions, runPredictionsJob);
  }, 15 * 60 * 1000);

  setInterval(async () => {
    await withLock("upcoming:lock:quotes", LOCK_TTL.quotes, runQuotesJob);
  }, 5 * 60 * 1000);
}

async function withLock(key: string, ttlSec: number, fn: () => Promise<void>) {
  const redis = getRedis();
  if (!redis) return;
  const lockValue = crypto.randomUUID();
  const acquired = await redis.set(key, lockValue, "NX", "EX", ttlSec);
  if (!acquired) return;
  const extensionIntervalMs = Math.floor(ttlSec / 2) * 1000;
  const refreshInterval = setInterval(async () => {
    try {
      await redis.expire(key, ttlSec);
    } catch {
      clearInterval(refreshInterval);
      // Extension fallita: abort job. In pratica: log + throw; se fn non può essere interrotta,
      // il lock scade da solo e un altro processo può acquisirlo.
    }
  }, extensionIntervalMs);
  try {
    await fn();
  } finally {
    clearInterval(refreshInterval);
    const current = await redis.get(key);
    if (current === lockValue) await redis.del(key); // ownership check
  }
}
```

### 3.2 Fixtures Poller

```ts
// lib/upcoming/fixturesPoller.ts
// Usa fetchWithTimeout + retryWithBackoffJitter per ogni fetch (vedi §8.5)

const FIXTURES_TTL_SEC = 12 * 3600; // 12h
const HOT_LEAGUES = [39, 135, 140, 78, 61]; // Premier, Serie A, La Liga, etc.
const HOT_LEAGUE_INTERVAL_MS = 60 * 60 * 1000; // 1h per leghe hot

export async function runFixturesJob(): Promise<void> {
  const leagueIds = getEnabledLeagueIds();
  const { fromDate, toDate } = getDateRange(); // oggi + 7 giorni

  for (const leagueId of leagueIds) {
    const key = `upcoming:fixtures:${leagueId}:${fromDate}:${toDate}`;
    const cached = await redis.get(key);
    const parsed = cached ? JSON.parse(cached) : null;

    const nextRefresh = parsed?.nextRefreshAt
      ? new Date(parsed.nextRefreshAt).getTime()
      : 0;
    const isHot = HOT_LEAGUES.includes(leagueId);
    const intervalMs = isHot ? HOT_LEAGUE_INTERVAL_MS : FIXTURES_INTERVAL_MS;

    if (parsed && nextRefresh > Date.now()) continue; // skip, ancora fresco

    try {
      const fixtures = await fetchFixturesFromApi(leagueId, fromDate, toDate);
      const payload = {
        fixtures,
        fetchedAt: new Date().toISOString(),
        nextRefreshAt: new Date(Date.now() + intervalMs).toISOString(),
        source: "api-football",
        version: 1,
      };
      await redis.set(key, JSON.stringify(payload), "EX", FIXTURES_TTL_SEC);

      // Aggiorna index e fixture singoli (con fetchedAt per Data Freshness)
      const fetchedAt = new Date().toISOString();
      for (const f of fixtures) {
        await redis.set(`upcoming:fixture:${f.fixture.id}`, JSON.stringify({ ...f, fetchedAt }), "EX", 86400);
        await redis.sadd("upcoming:index:fixture_ids", String(f.fixture.id));
      }
    } catch (err) {
      await backoff("fixtures", leagueId, err);
    }
  }
}
```

### 3.3 Predictions Poller (pool concurrency, try/catch per fixture)

*Nota:* API-Football non espone endpoint batch per predictions (1 req per fixture). Se in futuro fosse disponibile (es. `?fixture=1,2,3`), preferire batch per ridurre chiamate; altrimenti usare pool concurrency limitato come sopra.

```ts
// lib/upcoming/predictionsPoller.ts
// Concurrency e throttling: vedi §8 Production Hardening

const CONCURRENCY = Math.min(parseInt(process.env.UPCOMING_PREDICTIONS_CONCURRENCY || "5", 10), 10);
const MIN_DELAY_MS = parseInt(process.env.UPCOMING_PREDICTIONS_MIN_DELAY_MS || "100", 10);

export async function runPredictionsJob(): Promise<void> {
  if (apiFootballCircuitBreaker.isOpen()) {
    logCircuitBreakerOpen("predictions");
    return; // nextRefreshAt resta invariato; dati stale
  }
  if (!apiFootballCircuitBreaker.canAttempt()) return; // HALF_OPEN: max richieste già fatte
  const fixtureIds = await redis.smembers("upcoming:index:fixture_ids");
  const toRefresh: number[] = []; // ... (stesso logic di prima)

  // Pool concurrency limitato: pLimit o manuale con chunk
  for (const chunk of chunkArray(toRefresh, CONCURRENCY)) {
    await Promise.all(chunk.map(async (id) => {
      try {
        const pred = await retryWithBackoffJitter(
          () => fetchPredictionFromApiWithTimeout(id),
          {
            maxRetries: parseInt(process.env.UPCOMING_MAX_RETRIES || "2", 10),
            baseDelayMs: parseInt(process.env.UPCOMING_RETRY_BASE_DELAY_MS || "1000", 10),
            maxDelayMs: parseInt(process.env.UPCOMING_RETRY_MAX_DELAY_MS || "30000", 10),
            getRetryAfter: (e) => {
              const h = (e as { response?: Response })?.response?.headers?.get("Retry-After");
              return h != null ? parseInt(h, 10) : null;
            },
          }
        );
        // ... salva payload
        apiFootballCircuitBreaker.recordSuccess();
      } catch (err) {
        apiFootballCircuitBreaker.recordFailure();
        logError("predictions", id, err); // NON bloccare batch
      }
    }));
    await sleep(MIN_DELAY_MS);
  }
}
```

### 3.4 Quotes Poller + Matching + Aggregazione

```ts
// lib/upcoming/quotesPoller.ts
// Usa fetchWithTimeout + retryWithBackoffJitter per fetch bookmaker (vedi §8.5)

function getQuotesRefreshIntervalMs(kickoffAt: Date): number {
  const hoursToKickoff = (kickoffAt.getTime() - Date.now()) / (60 * 60 * 1000);

  if (hoursToKickoff > 48) return 30 * 60 * 1000;   // 30 min
  if (hoursToKickoff > 2) return 10 * 60 * 1000;    // 10 min
  return 3 * 60 * 1000;                             // 3 min
}

export async function runQuotesJob(): Promise<void> {
  const fixtures = await getAllUpcomingFixturesFromStore();
  const bySportLeague = groupBySportAndLeague(fixtures);

  for (const [sportKey, leagues] of Object.entries(bySportLeague)) {
    for (const [leagueId, leagueFixtures] of Object.entries(leagues)) {
      const fixturesToRefresh = leagueFixtures.filter((f) =>
        shouldRefreshQuotes(f)
      );
      if (fixturesToRefresh.length === 0) continue;

      // 1 richiesta per bookmaker (20+)
      const bookmakers = getBookmakers().filter((b) => b.apiProvider === "direct");
      const allH2h: DirectQuote[] = [];

      for (const bm of bookmakers) {
        try {
          const quotes = await fetchDirectBookmakerQuotes(bm, Number(leagueId));
          allH2h.push(...quotes);
        } catch (err) {
          await backoff("quotes", bm.id, err);
        }
      }

      // Match quote -> fixture (matchTeam usa algoritmo a priorità, vedi §4)
      for (const fixture of fixturesToRefresh) {
        const homeName = fixture.teams.home.name;
        const awayName = fixture.teams.away.name;
        const matched = matchQuotesToFixture(allH2h, homeName, awayName);
        // Opzionale: dopo match, aggiorna resolvedTeamMap per riuso futuro

        if (matched.length === 0) continue;

        const summary = computeFixtureQuoteSummary(matched);
        const kickoff = new Date(fixture.fixture.date);
        const intervalMs = getQuotesRefreshIntervalMs(kickoff);

        await redis.set(
          `upcoming:quoteSummary:${fixture.fixture.id}`,
          JSON.stringify({
            ...summary,
            fetchedAt: new Date().toISOString(),
            nextRefreshAt: new Date(Date.now() + intervalMs).toISOString(),
            source: "bookmaker",
            version: 1,
          }),
          "EX",
          Math.min(intervalMs / 1000, 900) // max 15 min TTL
        );
      }
    }
  }
}

function matchQuotesToFixture(
  quotes: DirectQuote[],
  fixtureHome: string,
  fixtureAway: string
): DirectQuote[] {
  return quotes
    .filter((q) => {
      const direct = matchTeam(q.homeTeam, fixtureHome) && matchTeam(q.awayTeam, fixtureAway);
      const swapped = matchTeam(q.homeTeam, fixtureAway) && matchTeam(q.awayTeam, fixtureHome);
      return direct || swapped;
    })
    .map((q) => {
      // Se swapped: inverti outcomes per allineare a fixture (home, away)
      const isSwapped = matchTeam(q.homeTeam, fixtureAway) && matchTeam(q.awayTeam, fixtureHome);
      if (isSwapped) {
        return { ...q, outcomes: { home: q.outcomes.away, draw: q.outcomes.draw, away: q.outcomes.home } };
      }
      return q;
    });
}
```

---

## 4. Matching quote → fixture (TEAM MATCHING)

Algoritmo a priorità con guardrail. **Substring NON è la regola principale** – è usato solo come last resort con condizioni strette. Meglio nessuna quota che quota sbagliata.

### 4.1 Step 0: Normalizzazione forte

```ts
const STOPWORDS = new Set(["fc", "cf", "ss", "as", "ac", "calcio", "football", "club", "cf"]);

function normalizeForMatch(name: string): string {
  let s = normalizeTeamName(name);           // fix encoding (ñ, á, etc.)
  s = s.toLowerCase().trim();
  s = s.replace(/[^\p{L}\p{N}\s\-]/gu, "");  // rimuovi punteggiatura/simboli
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function tokenize(name: string): string[] {
  const tokens = name.split(/\s+/).filter(Boolean);
  return tokens.filter((t) => !STOPWORDS.has(t) || t.length > 2);
}

function getSignificantTokens(name: string): string[] {
  return tokenize(normalizeForMatch(name)).filter((t) => t.length >= 2);
}
```

### 4.2 Algoritmo matchTeam (priorità + guardrail)

```ts
const AMBIGUOUS_TOKENS = new Set(["inter", "city", "united", "real", "atletico", "athletic"]);

function matchTeam(quoteName: string, fixtureName: string): boolean {
  const qNorm = normalizeForMatch(quoteName);
  const fNorm = normalizeForMatch(fixtureName);

  // Step 1: exact match su canonical (dopo normalize)
  if (qNorm === fNorm) return true;

  // Step 2: exact match su alias set (teamAliases normalizzati)
  const aliases = getTeamAliases(); // canonical -> [variants]
  const qVariants = getAllVariantsForName(quoteName, aliases);
  const fVariants = getAllVariantsForName(fixtureName, aliases);
  for (const qv of qVariants) {
    for (const fv of fVariants) {
      if (normalizeForMatch(qv) === normalizeForMatch(fv)) return true;
    }
  }

  // Step 3: fuzzy similarity (soglia >= 0.88) + controlli
  const similarity = fuzzySimilarity(qNorm, fNorm); // es. Jaro-Winkler, Levenshtein ratio
  if (similarity >= 0.88) {
    const qTokens = getSignificantTokens(quoteName);
    const fTokens = getSignificantTokens(fixtureName);
    const overlap = qTokens.filter((t) => fTokens.includes(t)).length;
    const minLen = Math.min(qTokens.length, fTokens.length);
    if (overlap >= Math.min(2, minLen)) {
      const hasAmbiguous = qTokens.some((t) => AMBIGUOUS_TOKENS.has(t)) && qTokens.length < 2;
      if (!hasAmbiguous) return true;
    }
  }

  // Step 4 (last resort): substring SOLO se condizioni strette
  const qTokens = getSignificantTokens(quoteName);
  const fTokens = getSignificantTokens(fixtureName);
  if (qTokens.length >= 2 && fTokens.length >= 2) {
    const overlap = qTokens.filter((t) => fTokens.includes(t)).length;
    if (overlap >= 2) {
      const hasAmbiguous = qTokens.some((t) => AMBIGUOUS_TOKENS.has(t));
      if (!hasAmbiguous && (qNorm.includes(fNorm) || fNorm.includes(qNorm))) return true;
    }
  }

  return false; // no match – meglio nessuna quota che quota sbagliata
}
```

*Nota Step 3:* Se disponibile, usare contesto (league/country) per ridurre falsi positivi nel fuzzy match.

### 4.3 Gestione inversione home/away (swap)

I bookmaker possono restituire `(away, home)` invece di `(home, away)`. Se il match è swapped, **invertire gli outcomes** per allineare al fixture:

```ts
function matchQuotesToFixture(
  quotes: DirectQuote[],
  fixtureHome: string,
  fixtureAway: string
): DirectQuote[] {
  return quotes
    .filter((q) => {
      const direct = matchTeam(q.homeTeam, fixtureHome) && matchTeam(q.awayTeam, fixtureAway);
      const swapped = matchTeam(q.homeTeam, fixtureAway) && matchTeam(q.awayTeam, fixtureHome);
      return direct || swapped;
    })
    .map((q) => {
      const isSwapped = matchTeam(q.homeTeam, fixtureAway) && matchTeam(q.awayTeam, fixtureHome);
      if (isSwapped) {
        return { ...q, outcomes: { home: q.outcomes.away, draw: q.outcomes.draw, away: q.outcomes.home } };
      }
      return q;
    });
}
```

### 4.4 resolvedTeamMap persistente

Quando si risolve una corrispondenza per la prima volta, **salvarla** e riutilizzarla per ridurre errori e ricalcoli:

```ts
// resolvedTeamMap:{fixtureId} = {
//   homeCanonical: string,
//   awayCanonical: string,
//   homeVariants: string[],  // nomi che matchano home (da bookmaker)
//   awayVariants: string[],
//   resolvedAt: string
// }

async function getOrResolveTeamMap(fixtureId: number, fixture: Fixture): Promise<ResolvedTeamMap> {
  const key = `upcoming:resolvedTeamMap:${fixtureId}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const homeCanonical = normalizeForMatch(fixture.teams.home.name);
  const awayCanonical = normalizeForMatch(fixture.teams.away.name);
  const homeVariants = getAllVariantsForName(fixture.teams.home.name, getTeamAliases());
  const awayVariants = getAllVariantsForName(fixture.teams.away.name, getTeamAliases());

  const resolved = { homeCanonical, awayCanonical, homeVariants, awayVariants, resolvedAt: new Date().toISOString() };
  await redis.set(key, JSON.stringify(resolved), "EX", 86400);
  return resolved;
}

// Nel match: se quote.homeTeam è in homeVariants (normalizzato) → match diretto
// Evita ricalcoli e mantiene coerenza tra cicli
```

---

## 5. Stima chiamate/mese vs polling uniforme

### 5.1 Assunzioni esplicite

| Parametro | Simbolo | Valore default | Descrizione |
|-----------|----------|----------------|-------------|
| Leghe coperte | L | 18 | Numero di leghe per cui si fetchano fixtures |
| Finestra temporale (giorni) | D | 7 | from → to (oggi + D giorni) |
| Fixtures medie in finestra | F | 50 | Partite totali (NS + live) |
| Fixtures bucket >48h | F1 | 15 | 30% di F |
| Fixtures bucket 48h–6h | F2 | 25 | 50% di F |
| Fixtures bucket ≤6h | F3 | 10 | 20% di F |
| Frequenza refresh >48h | T1 | 12h | 2 cicli/giorno |
| Frequenza refresh 48h–6h | T2 | 2.5h | 9.6 cicli/giorno |
| Frequenza refresh ≤6h | T3 | 1h | 24 cicli/giorno |

### 5.2 Formule

**Fixtures (per lega):**
- Leghe normali (L - 5): `(L - 5) × (24 / 6) × 30` cicli/mese
- Leghe hot (5): `5 × (24 / 1) × 30` cicli/mese
- `Fixtures_mese = (L - 5) × 4 × 30 + 5 × 24 × 30`

**Predictions (per fixture, per bucket):**
- `Predictions_mese = F1 × (24/T1_h) × 30 + F2 × (24/T2_h) × 30 + F3 × (24/T3_h) × 30`

Dove `T_h` = intervallo in ore (T1=12, T2=2.5, T3=1).

### 5.3 Esempio numerico

Con L=18, F=50, F1=15, F2=25, F3=10:

**Fixtures:**
- `(18 - 5) × 4 × 30 + 5 × 24 × 30 = 1.560 + 3.600 = 5.160/mese`

**Predictions:**
- F1: `15 × 2 × 30 = 900`
- F2: `25 × 9.6 × 30 = 7.200`
- F3: `10 × 24 × 30 = 7.200`
- **Totale: 15.300/mese**

**Totale API-Football: 5.160 + 15.300 ≈ 20.500/mese**

### 5.4 Polling uniforme (riferimento, ogni 5 min)

| Fonte | Chiamate/ciclo | Cicli/giorno | Chiamate/mese |
|-------|----------------|--------------|---------------|
| Fixtures | L = 18 | 288 | 155.520 |
| Predictions | F = 50 | 288 | 432.000 |
| **Totale API-Football** | | | **~587.500** |

### 5.5 Confronto

| Fonte | Uniforme (5 min) | Intelligente | Riduzione |
|-------|------------------|--------------|-----------|
| Fixtures | ~155.000 | ~5.200 | **~97%** |
| Predictions | ~432.000 | ~15.300 | **~96%** |
| **Totale API-Football** | **~587.000** | **~20.500** | **~96%** |

### 5.6 Scalabilità

**Se D o L aumentano, le chiamate scalano:**

- Fixtures: lineare in L
- Predictions: lineare in F (che cresce con D e L)
- Esempio: L=30, F=100 → Fixtures ~8.600, Predictions ~30.600 → Totale ~39.200/mese

---

## 6. Recommended Enhancements

Migliorie consigliate senza modificare l'architettura (3 job + store + frontend store-first).

### 6.1 Status-based polling

- **Fixture FT/finished** → stop refresh predictions e quotes (dati non più rilevanti)
- **Fixture postponed/cancelled** → stop o refresh lento (es. ogni 12h) + flag nello store (`status: "postponed" | "cancelled"`)
- Il poller controlla `fixture.fixture.status.short` prima di decidere se includere la partita nel ciclo

### 6.2 Versioning / namespace Redis keys

Aggiungere prefisso per ambiente e versione:

```
{env}:{version}:upcoming:fixtures:{leagueId}:...
```

Esempi:
- `prod:v1:upcoming:fixtures:135:2025-02-24:2025-03-03`
- `staging:v1:upcoming:predictions:12345`

Permette deploy paralleli e rollback senza conflitti.

---

## 7. Backoff su errori

```ts
async function backoff(job: string, id: string | number, err: unknown) {
  const key = `upcoming:backoff:${job}:${id}`;
  const count = await redis.incr(key);
  await redis.expire(key, 3600); // 1h

  const delayMs = Math.min(1000 * Math.pow(2, count), 60000);
  await sleep(delayMs);
  throw err; // rilancia per retry esterno se necessario
}
```

---

## 8. Production Hardening

### 8.1 Regola Lock TTL

**Regola:** `lockTTL >= 2 × durata massima osservata del job` per evitare overlap tra istanze.

| Job | lockTTL default | extension interval | Env var |
|-----|-----------------|-------------------|---------|
| fixtures | 180s | 90s (ttl/2) | `UPCOMING_LOCK_TTL_FIXTURES` |
| predictions | 300s | 150s (ttl/2) | `UPCOMING_LOCK_TTL_PREDICTIONS` |
| quotes | 300s | 150s (ttl/2) | `UPCOMING_LOCK_TTL_QUOTES` |

- **Ownership UUID:** `lockValue = crypto.randomUUID()`; `del` solo se `get(key) === lockValue` (evita rilascio errato da altro processo).
- **Lock extension:** ogni `ttl/2` secondi chiamare `redis.expire(key, ttlSec)`.
- **Se extension fallisce:** (es. Redis down, EXPIRE errore) → **abort job**: clearInterval, reject/throw; il job deve terminare (es. via `Promise.race` tra `fn()` e una promise che si rejecta su extension failure). Il lock scade da solo per TTL.

### 8.2 Default Config (tabella unica env vars)

| Env var | Default | Unità | Descrizione |
|---------|---------|-------|-------------|
| `UPCOMING_LOCK_TTL_FIXTURES` | 180 | s | Lock TTL fixtures |
| `UPCOMING_LOCK_TTL_PREDICTIONS` | 300 | s | Lock TTL predictions |
| `UPCOMING_LOCK_TTL_QUOTES` | 300 | s | Lock TTL quotes |
| `UPCOMING_FETCH_TIMEOUT_MS` | 10000 | ms | Timeout hard per fetch esterni |
| `UPCOMING_MAX_RETRIES` | 2 | - | Max retry per singola richiesta |
| `UPCOMING_RETRY_BASE_DELAY_MS` | 1000 | ms | Base delay per backoff (2^i × base) |
| `UPCOMING_RETRY_MAX_DELAY_MS` | 30000 | ms | Cap massimo delay (incluso Retry-After) |
| `UPCOMING_PREDICTIONS_CONCURRENCY` | 5 | - | Pool parallelo (max 10) |
| `UPCOMING_PREDICTIONS_MIN_DELAY_MS` | 100 | ms | Delay tra batch (throttling) |
| `UPCOMING_PREDICTIONS_MAX_REQ_PER_MIN` | - | - | Opzionale: limite rate; se superato, attesa |
| `UPCOMING_CIRCUIT_BREAKER_ERROR_THRESHOLD` | 5 | - | N fallimenti consecutivi per OPEN |
| `UPCOMING_CIRCUIT_BREAKER_COOLDOWN_MS` | 120000 | ms | Durata OPEN prima di HALF_OPEN (2 min) |
| `UPCOMING_CIRCUIT_BREAKER_HALF_OPEN_MAX_REQUESTS` | 3 | - | Max richieste di prova in HALF_OPEN |
| `UPCOMING_CIRCUIT_BREAKER_SUCCESS_THRESHOLD` | 2 | - | Successi consecutivi in HALF_OPEN per chiudere |
| `UPCOMING_CIRCUIT_BREAKER_OPEN_GRACE_MS` | 300000 | ms | Quando OPEN: nextRefreshAt += grace (5 min) |
| `FRESH_PREDICTIONS_FRESH_MINUTES` | 30 | min | Soglia fresh per predictions |
| `FRESH_PREDICTIONS_AGING_MINUTES` | 120 | min | Soglia aging per predictions |
| `FRESH_QUOTES_FRESH_MINUTES` | 10 | min | Soglia fresh per quotes |
| `FRESH_QUOTES_AGING_MINUTES` | 30 | min | Soglia aging per quotes |
| `FRESH_FIXTURES_FRESH_MINUTES` | 360 | min | Soglia fresh per fixtures (6h) |
| `FRESH_FIXTURES_AGING_MINUTES` | 1440 | min | Soglia aging per fixtures (24h) |

### 8.3 Timeout, retry, circuit breaker

- **Timeout:** ogni fetch verso API-Football/bookmaker ha timeout hard 10s (configurabile).
- **Retry:** backoff esponenziale + jitter; vedi §8.3.1.
- **Try/catch per singola fixture/leghe:** un errore non blocca il job.
- **Circuit breaker API-Football:** vedi §8.3.2.

#### 8.3.1 Retry / backoff (parametri espliciti)

| Parametro | Default | Descrizione |
|-----------|---------|-------------|
| maxRetries | 2 | Tentativi totali = 1 + maxRetries |
| baseDelayMs | 1000 | Delay attesa i = baseDelayMs × 2^i |
| maxDelayMs | 30000 | Cap su delay (anche per Retry-After) |
| jitter | additivo uniforme [0, 500] ms | `delay += Math.random() * 500` |

**429 Retry-After:** se header presente, usare `min(parseInt(Retry-After), maxDelayMs/1000) × 1000` ms; altrimenti backoff standard.

#### 8.3.2 Circuit breaker (parametri espliciti)

| Parametro | Default | Descrizione |
|-----------|---------|-------------|
| errorThreshold | 5 | N fallimenti consecutivi → OPEN |
| cooldownMs | 120000 | Durata OPEN (2 min) prima di HALF_OPEN |
| halfOpenMaxRequests | 3 | Max richieste di prova in HALF_OPEN |
| successThreshold | 2 | Successi consecutivi in HALF_OPEN → CLOSED |
| openGraceMs | 300000 | Quando OPEN: nextRefreshAt = now + openGraceMs (5 min) |

**nextRefreshAt quando OPEN:** non effettuare fetch; impostare `nextRefreshAt = now + openGraceMs` per le fixture che sarebbero state refreshate, così il prossimo ciclo le salta fino a scadenza.

### 8.4 Degraded mode (Redis down)

- **Nessun fallback file** in cluster multi-istanza.
- Se Redis non raggiungibile: **NON eseguire job** (evita duplicazioni e incoerenza lock/dedup).
- Polling entra in **DEGRADED MODE**: log chiaro, health endpoint/flag.
- Frontend continua a leggere dati già presenti (stale) dal backend; nessuna chiamata esterna.
- **Uscita:** quando Redis torna su, il poller rileva connessione e riprende i job.

### 8.5 Outline pseudocodice TypeScript

#### fetchWithTimeout

```ts
// timeoutMs da UPCOMING_FETCH_TIMEOUT_MS (default 10000)
async function fetchWithTimeout(
  url: string,
  opts: RequestInit,
  timeoutMs = parseInt(process.env.UPCOMING_FETCH_TIMEOUT_MS || "10000", 10)
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}
```

#### retryWithBackoffJitter

```ts
// Parametri: maxRetries (default 2), baseDelayMs (1000), maxDelayMs (30000)
// Jitter: additivo uniforme [0, 500] ms
// 429: getRetryAfter(err) → secondi; delay = min(retryAfter*1000, maxDelayMs)
async function retryWithBackoffJitter<T>(
  fn: () => Promise<T>,
  opts: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    getRetryAfter?: (err: unknown) => number | null; // secondi da header Retry-After
  } = {}
): Promise<T> {
  const { maxRetries = 2, baseDelayMs = 1000, maxDelayMs = 30000, getRetryAfter } = opts;
  let lastErr: unknown;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < maxRetries) {
        const retryAfterSec = getRetryAfter?.(e);
        const delayMs = retryAfterSec != null
          ? Math.min(retryAfterSec * 1000, maxDelayMs)
          : Math.min(baseDelayMs * Math.pow(2, i) + Math.random() * 500, maxDelayMs);
        await sleep(delayMs);
      } else {
        throw e;
      }
    }
  }
  throw lastErr;
}
```

#### circuitBreaker wrapper per API-Football

```ts
// errorThreshold=5, cooldownMs=120000, halfOpenMaxRequests=3, successThreshold=2
// Quando OPEN: non fetch; nextRefreshAt = now + openGraceMs (300000) per fixture da refresh
const circuitBreaker = {
  state: "CLOSED" as "CLOSED" | "OPEN" | "HALF_OPEN",
  failures: 0,
  halfOpenRequests: 0,
  halfOpenSuccesses: 0,
  errorThreshold: 5,
  cooldownMs: 120000,
  halfOpenMaxRequests: 3,
  successThreshold: 2,
  openGraceMs: 300000,
  lastOpenAt: 0,

  isOpen(): boolean {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastOpenAt < this.cooldownMs) return true;
      this.state = "HALF_OPEN";
      this.failures = 0;
      this.halfOpenRequests = 0;
      this.halfOpenSuccesses = 0;
    }
    return false;
  },
  canAttempt(): boolean {
    if (this.state === "HALF_OPEN" && this.halfOpenRequests >= this.halfOpenMaxRequests)
      return false;
    return true;
  },
  recordSuccess() {
    if (this.state === "HALF_OPEN") {
      this.halfOpenRequests++;
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.successThreshold) {
        this.state = "CLOSED";
        this.failures = 0;
      }
    } else {
      this.failures = 0;
    }
  },
  recordFailure() {
    if (this.state === "HALF_OPEN") this.halfOpenRequests++;
    this.failures++;
    if (this.state === "HALF_OPEN") {
      this.state = "OPEN";
      this.lastOpenAt = Date.now();
    } else if (this.failures >= this.errorThreshold) {
      this.state = "OPEN";
      this.lastOpenAt = Date.now();
    }
  },
};
```

#### Lock acquisition con TTL + refresh

Vedi `withLock` in §3.1: `EXPIRE` ogni `ttl/2` secondi durante l'esecuzione del job.

---

## 9. Data Freshness Model

Indicatore di freschezza dati calcolato sui metadata già in Redis (`fetchedAt`). Nessuna chiamata esterna, nessun nuovo job.

### 9.1 Soglie (configurabili via env)

| Categoria | fresh | aging | stale | Env vars |
|-----------|-------|-------|-------|----------|
| Predictions | < 30 min | 30–120 min | > 120 min | `FRESH_PREDICTIONS_FRESH_MINUTES`=30, `FRESH_PREDICTIONS_AGING_MINUTES`=120 |
| Quotes | < 10 min | 10–30 min | > 30 min | `FRESH_QUOTES_FRESH_MINUTES`=10, `FRESH_QUOTES_AGING_MINUTES`=30 |
| Fixtures | < 360 min (6h) | 6–24h | > 24h | `FRESH_FIXTURES_FRESH_MINUTES`=360, `FRESH_FIXTURES_AGING_MINUTES`=1440 |

**Regola:** `minutesOld = (now - fetchedAt) / 60_000`. Se `fetchedAt` non presente, trattare come `stale`.

### 9.2 Output per fixture (`dataFreshness`)

In ogni payload di `/api/upcoming-data` e `/api/fixture/[id]`:

```json
{
  "dataFreshness": {
    "fixtures":    { "status": "fresh|aging|stale", "lastUpdated": "2025-02-24T12:00:00.000Z", "minutesOld": 15 },
    "predictions": { "status": "fresh|aging|stale", "lastUpdated": "2025-02-24T11:55:00.000Z", "minutesOld": 20 },
    "quotes":      { "status": "fresh|aging|stale", "lastUpdated": "2025-02-24T11:58:00.000Z", "minutesOld": 7 },
    "overallStatus": "fresh|aging|stale"
  }
}
```

**overallStatus:**
- `stale` se almeno uno è `stale`
- `aging` se almeno uno è `aging` e nessuno `stale`
- `fresh` solo se tutti `fresh`

### 9.3 Pseudocodice TypeScript

```ts
// lib/upcoming/freshness.ts

type FreshnessStatus = "fresh" | "aging" | "stale";

function getFreshnessThresholds(): Record<string, { fresh: number; aging: number }> {
  return {
    predictions: {
      fresh: parseInt(process.env.FRESH_PREDICTIONS_FRESH_MINUTES || "30", 10),
      aging: parseInt(process.env.FRESH_PREDICTIONS_AGING_MINUTES || "120", 10),
    },
    quotes: {
      fresh: parseInt(process.env.FRESH_QUOTES_FRESH_MINUTES || "10", 10),
      aging: parseInt(process.env.FRESH_QUOTES_AGING_MINUTES || "30", 10),
    },
    fixtures: {
      fresh: parseInt(process.env.FRESH_FIXTURES_FRESH_MINUTES || "360", 10),
      aging: parseInt(process.env.FRESH_FIXTURES_AGING_MINUTES || "1440", 10),
    },
  };
}

function calculateFreshness(minutesOld: number | null, freshMin: number, agingMin: number): FreshnessStatus {
  if (minutesOld == null || minutesOld < 0) return "stale";
  if (minutesOld < freshMin) return "fresh";
  if (minutesOld < agingMin) return "aging";
  return "stale";
}

function computeOverallStatus(statuses: FreshnessStatus[]): FreshnessStatus {
  if (statuses.some((s) => s === "stale")) return "stale";
  if (statuses.some((s) => s === "aging")) return "aging";
  return "fresh";
}

function attachFreshnessToFixture(
  payload: { fixture: unknown; predictions?: unknown; quotes?: unknown },
  storeRecords: {
    fixture?: { fetchedAt?: string };
    predictions?: { fetchedAt?: string };
    quotes?: { fetchedAt?: string };
  }
) {
  const th = getFreshnessThresholds();
  const now = Date.now();
  const toMinutes = (iso?: string) =>
    iso ? Math.floor((now - new Date(iso).getTime()) / 60_000) : null;

  const f = calcFreshness(toMinutes(storeRecords.fixture?.fetchedAt), th.fixtures);
  const p = calcFreshness(toMinutes(storeRecords.predictions?.fetchedAt), th.predictions);
  const q = calcFreshness(toMinutes(storeRecords.quotes?.fetchedAt), th.quotes);

  const dataFreshness = {
    fixtures: { status: f.status, lastUpdated: storeRecords.fixture?.fetchedAt ?? null, minutesOld: f.minutesOld },
    predictions: { status: p.status, lastUpdated: storeRecords.predictions?.fetchedAt ?? null, minutesOld: p.minutesOld },
    quotes: { status: q.status, lastUpdated: storeRecords.quotes?.fetchedAt ?? null, minutesOld: q.minutesOld },
    overallStatus: computeOverallStatus([f.status, p.status, q.status]),
  };
  return { ...payload, dataFreshness };
}

function calcFreshness(minutesOld: number | null, th: { fresh: number; aging: number }) {
  return { status: calculateFreshness(minutesOld, th.fresh, th.aging), minutesOld };
}
```

### 9.4 Esempio JSON response `/api/fixture/[id]`

```json
{
  "fixture": {
    "fixture": { "id": 12345, "date": "2025-02-24T20:00:00+00:00" },
    "teams": { "home": { "name": "..." }, "away": { "name": "..." } }
  },
  "predictions": { "home": "45%", "draw": "28%", "away": "27%", "fetchedAt": "2025-02-24T11:55:00.000Z" },
  "quotes": { "best1": 2.1, "bestX": 3.3, "best2": 3.5, "fetchedAt": "2025-02-24T11:58:00.000Z" },
  "dataFreshness": {
    "fixtures":    { "status": "fresh",   "lastUpdated": "2025-02-24T10:00:00.000Z", "minutesOld": 180 },
    "predictions": { "status": "fresh",   "lastUpdated": "2025-02-24T11:55:00.000Z", "minutesOld": 20 },
    "quotes":      { "status": "fresh",   "lastUpdated": "2025-02-24T11:58:00.000Z", "minutesOld": 7 },
    "overallStatus": "fresh"
  }
}
```

*Nota:* Per `fixtures`, `lastUpdated` deriva da `fetchedAt` del record. Salvare `fetchedAt` in `upcoming:fixture:{id}` alla scrittura (fixturesJob) oppure usare il `fetchedAt` del record parent `upcoming:fixtures:{leagueId}:{range}` quando si legge dalla lista.

---

## 10. API route (solo lettura store)

```ts
// app/api/upcoming-data/route.ts
export async function GET() {
  const fixtures = await getFixturesFromStore();
  const predictionsMap = await getPredictionsMapFromStore();
  const quotesMap = await getQuotesMapFromStore();
  const fixturesWithFreshness = fixtures.map((f) =>
    attachFreshnessToFixture(
      { fixture: f, predictions: predictionsMap[f.fixture.id], quotes: quotesMap[f.fixture.id] },
      {
        fixture: f,
        predictions: predictionsMap[f.fixture.id],
        quotes: quotesMap[f.fixture.id],
      }
    )
  );
  return NextResponse.json({ fixtures: fixturesWithFreshness, predictionsMap, quotesMap });
  // NO fetch, NO fallback a provider esterni
}

// app/api/fixture/[id]/route.ts
export async function GET(req, { params }) {
  const fixture = await getFixtureFromStore(params.id);
  const predictions = await getPredictionsFromStore(params.id);
  const quotes = await getQuotesFromStore(params.id);
  const withFreshness = attachFreshnessToFixture(
    { fixture, predictions, quotes },
    { fixture, predictions, quotes }
  );
  return NextResponse.json(withFreshness);
  // NO fetch esterni
}
```

---

## 11. Monitoring & Observability

### 11.1 Metriche minime obbligatorie

Metriche interne (in-memory o via logger strutturato). Nessuna chiamata esterna.

#### Per ogni Job (fixturesJob, predictionsJob, quotesJob)

| Metrica | Tipo | Descrizione |
|---------|------|-------------|
| `job_runs_total` | counter | Totale esecuzioni avviate |
| `job_success_total` | counter | Esecuzioni completate con successo |
| `job_failure_total` | counter | Esecuzioni fallite |
| `job_duration_ms` | gauge | Ultima durata (ms); opzionale media rolling |
| `job_last_success_timestamp` | gauge | Unix ms ultimo successo |
| `job_last_failure_timestamp` | gauge | Unix ms ultimo fallimento |
| `job_skipped_due_to_degraded_mode_total` | counter | Skip perché Redis down |
| `job_skipped_due_to_lock_total` | counter | Skip perché lock già acquisito |

#### API-Football

| Metrica | Tipo | Descrizione |
|---------|------|-------------|
| `api_football_requests_total` | counter | Totale richieste |
| `api_football_success_total` | counter | Risposte 2xx |
| `api_football_429_total` | counter | Rate limit |
| `api_football_timeout_total` | counter | Timeout fetch |
| `api_football_error_total` | counter | Altri errori |
| `api_football_avg_latency_ms` | gauge | Latency media (rolling) |
| `circuit_breaker_state` | gauge | 0=CLOSED, 1=OPEN, 2=HALF_OPEN |
| `circuit_breaker_open_total` | counter | Volte che il circuito è passato a OPEN |

#### Bookmaker

| Metrica | Tipo | Descrizione |
|---------|------|-------------|
| `bookmaker_requests_total` | counter | Totale richieste |
| `bookmaker_error_total` | counter | Errori |
| `bookmaker_avg_latency_ms` | gauge | Latency media (rolling) |

#### Redis

| Metrica | Tipo | Descrizione |
|---------|------|-------------|
| `redis_connection_errors_total` | counter | Errori connessione |
| `redis_last_disconnect_timestamp` | gauge | Unix ms ultima disconnessione |
| `degraded_mode_active` | gauge | 0=no, 1=sì |

### 11.2 Logging strutturato (JSON)

Standard log JSON con campi minimi. Nessun `console.log` non strutturato.

```json
{
  "timestamp": "2025-02-24T12:00:00.000Z",
  "level": "info",
  "service": "poller",
  "job": "fixtures|predictions|quotes",
  "event": "job_start|job_end|job_error|breaker_open|redis_down|lock_acquired|lock_lost",
  "durationMs": 1234,
  "errorCode": "ETIMEDOUT",
  "errorMessage": "...",
  "stack": "...",
  "fixtureId": 12345,
  "leagueId": 135,
  "breakerState": "OPEN",
  "degradedMode": false
}
```

**Regole:**
- Errori sempre con `stack` (se disponibile).
- Log transizione stato breaker (`breaker_open`, `breaker_half_open`, `breaker_closed`).
- Log entrata/uscita DEGRADED MODE (`degraded_mode_entered`, `degraded_mode_exited`).

### 11.3 Health endpoint (read-only, NO chiamate esterne)

`GET /api/health` — legge solo stato interno + Redis se disponibile.

```json
{
  "status": "ok|degraded|error",
  "redis": {
    "connected": true,
    "lastErrorTimestamp": 1708776000000
  },
  "circuitBreaker": {
    "state": "CLOSED|OPEN|HALF_OPEN",
    "openCount": 2,
    "lastStateChange": "2025-02-24T11:55:00.000Z"
  },
  "jobs": {
    "fixtures": { "lastSuccess": "...", "lastDurationMs": 45000, "running": false },
    "predictions": { "lastSuccess": "...", "lastDurationMs": 12000, "running": false },
    "quotes": { "lastSuccess": "...", "lastDurationMs": 35000, "running": false }
  },
  "freshnessSummary": {
    "fixtures": { "avgMinutesOld": 120, "staleCount": 2 },
    "predictions": { "avgMinutesOld": 25, "staleCount": 0 },
    "quotes": { "avgMinutesOld": 8, "staleCount": 1 }
  },
  "degradedMode": false,
  "uptimeSeconds": 86400
}
```

- `status`: `ok` se Redis connected e nessun errore critico; `degraded` se Redis down; `error` se stato incoerente.
- L'endpoint **non** effettua fetch verso API-Football o bookmaker.

### 11.4 Operational Alerts (documentazione)

Soglie consigliate per alerting (solo documentazione; nessuna implementazione email/Slack):

| Alert | Soglia | Gravità |
|-------|--------|---------|
| Circuit breaker OPEN ripetuto | > 3 volte in 10 minuti | Alta |
| Redis disconnesso | > 60s | Alta |
| Job failure consecutivi | 3 fallimenti consecutivi per stesso job | Media |
| API-Football 429 | > 5/min (o soglia X configurabile) | Media |
| Job duration critica | `job_duration_ms` > 80% lock TTL | Media |
| Degraded mode attivo | `degraded_mode_active` = 1 | Info |

### 11.5 Pseudocodice TypeScript

#### metricsRegistry (in-memory)

```ts
// lib/upcoming/metrics.ts
const metrics = {
  jobs: {} as Record<string, {
    runs: number; success: number; failure: number;
    lastDurationMs: number; lastSuccessTs: number; lastFailureTs: number;
    skippedDegraded: number; skippedLock: number; running: boolean;
  }>,
  apiFootball: { requests: 0, success: 0, _429: 0, timeout: 0, error: 0, latencySum: 0, latencyCount: 0 },
  bookmaker: { requests: 0, error: 0, latencySum: 0, latencyCount: 0 },
  redis: { connectionErrors: 0, lastDisconnectTs: 0 },
  circuitBreaker: { openCount: 0, state: 0, lastStateChangeTs: 0 }, // 0=CLOSED, 1=OPEN, 2=HALF_OPEN
  degradedMode: false,
  startTime: Date.now(),
};

function ensureJob(name: string) {
  if (!metrics.jobs[name]) metrics.jobs[name] = { runs: 0, success: 0, failure: 0, lastDurationMs: 0, lastSuccessTs: 0, lastFailureTs: 0, skippedDegraded: 0, skippedLock: 0, running: false };
  return metrics.jobs[name];
}
export function getMetrics() { return JSON.parse(JSON.stringify(metrics)); }
```

#### logEvent()

```ts
// lib/upcoming/logger.ts
function logEvent(ev: {
  level: "info" | "warn" | "error";
  job?: "fixtures" | "predictions" | "quotes";
  event: string;
  durationMs?: number;
  errorCode?: string;
  errorMessage?: string;
  stack?: string;
  fixtureId?: number;
  leagueId?: number;
  breakerState?: string;
  degradedMode?: boolean;
}) {
  const out = {
    timestamp: new Date().toISOString(),
    level: ev.level,
    service: "poller",
    ...ev,
  };
  process.stdout.write(JSON.stringify(out) + "\n");
}
```

#### healthController()

```ts
// app/api/health/route.ts — NO chiamate esterne, solo stato interno + Redis ping + lettura store
export async function GET() {
  const m = getMetrics();
  const redis = getRedis();
  const redisConnected = redis ? await redis.ping().then(() => true).catch(() => false) : false;
  const status = m.degradedMode ? "degraded" : !redisConnected ? "degraded" : "ok";

  const freshnessSummary = redis ? await computeFreshnessSummary(redis) : null;

  return NextResponse.json({
    status,
    redis: { connected: redisConnected, lastErrorTimestamp: m.redis.lastDisconnectTs || undefined },
    circuitBreaker: { state: ["CLOSED","OPEN","HALF_OPEN"][m.circuitBreaker.state], openCount: m.circuitBreaker.openCount, lastStateChange: m.circuitBreaker.lastStateChangeTs ? new Date(m.circuitBreaker.lastStateChangeTs).toISOString() : null },
    jobs: Object.fromEntries(Object.entries(m.jobs).map(([k,v]) => [k, { lastSuccess: v.lastSuccessTs ? new Date(v.lastSuccessTs).toISOString() : null, lastDurationMs: v.lastDurationMs, running: v.running }])),
    freshnessSummary,
    degradedMode: m.degradedMode,
    uptimeSeconds: Math.floor((Date.now() - m.startTime) / 1000),
  });
}

async function computeFreshnessSummary(redis: Redis): Promise<{
  fixtures: { avgMinutesOld: number; staleCount: number };
  predictions: { avgMinutesOld: number; staleCount: number };
  quotes: { avgMinutesOld: number; staleCount: number };
}> {
  const th = getFreshnessThresholds();
  const now = Date.now();
  const fixtureIds = await redis.smembers("upcoming:index:fixture_ids");

  let fixturesSum = 0, fixturesCount = 0, fixturesStale = 0;
  let predictionsSum = 0, predictionsCount = 0, predictionsStale = 0;
  let quotesSum = 0, quotesCount = 0, quotesStale = 0;

  for (const id of fixtureIds) {
    const [pred, quote] = await Promise.all([
      redis.get(`upcoming:predictions:${id}`),
      redis.get(`upcoming:quoteSummary:${id}`),
    ]);
    const predData = pred ? JSON.parse(pred) : null;
    const quoteData = quote ? JSON.parse(quote) : null;
    const predMinutes = predData?.fetchedAt ? (now - new Date(predData.fetchedAt).getTime()) / 60_000 : null;
    const quoteMinutes = quoteData?.fetchedAt ? (now - new Date(quoteData.fetchedAt).getTime()) / 60_000 : null;
    if (predMinutes != null) { predictionsSum += predMinutes; predictionsCount++; if (predMinutes > th.predictions.aging) predictionsStale++; }
    if (quoteMinutes != null) { quotesSum += quoteMinutes; quotesCount++; if (quoteMinutes > th.quotes.aging) quotesStale++; }
  }
  // fixtures: iterare su upcoming:fixtures:{leagueId}:* e estrarre fetchedAt
  const fixtureKeys = await redis.keys("upcoming:fixtures:*");
  for (const k of fixtureKeys) {
    const raw = await redis.get(k);
    const data = raw ? JSON.parse(raw) : null;
    const minutes = data?.fetchedAt ? (now - new Date(data.fetchedAt).getTime()) / 60_000 : null;
    if (minutes != null) { fixturesSum += minutes; fixturesCount++; if (minutes > th.fixtures.aging) fixturesStale++; }
  }

  return {
    fixtures: { avgMinutesOld: fixturesCount ? fixturesSum / fixturesCount : 0, staleCount: fixturesStale },
    predictions: { avgMinutesOld: predictionsCount ? predictionsSum / predictionsCount : 0, staleCount: predictionsStale },
    quotes: { avgMinutesOld: quotesCount ? quotesSum / quotesCount : 0, staleCount: quotesStale },
  };
}
```

#### Integrazione in predictionsJob

```ts
// In runPredictionsJob:
const jobM = ensureJob("predictions");
jobM.runs++;
jobM.running = true;
const t0 = Date.now();
try {
  if (apiFootballCircuitBreaker.isOpen()) {
    logEvent({ level: "info", job: "predictions", event: "breaker_open" });
    return;
  }
  // ... fetch loop: prima di ogni fetch
  metrics.apiFootball.requests++;
  const reqStart = Date.now();
  // dopo fetch successo:
  metrics.apiFootball.success++;
  metrics.apiFootball.latencySum += Date.now() - reqStart;
  metrics.apiFootball.latencyCount++;
  // su 429: metrics.apiFootball._429++; su timeout: metrics.apiFootball.timeout++; su altro: metrics.apiFootball.error++;
  jobM.success++;
  jobM.lastSuccessTs = Date.now();
} catch (e) {
  jobM.failure++;
  jobM.lastFailureTs = Date.now();
  metrics.apiFootball.error++;
  logEvent({ level: "error", job: "predictions", event: "job_error", errorMessage: String(e), stack: (e as Error).stack });
} finally {
  jobM.lastDurationMs = Date.now() - t0;
  jobM.running = false;
}
```

#### Integrazione in circuitBreaker

```ts
// In recordFailure quando state → OPEN:
metrics.circuitBreaker.openCount++;
metrics.circuitBreaker.state = 1;
metrics.circuitBreaker.lastStateChangeTs = Date.now();
logEvent({ level: "warn", event: "breaker_open", breakerState: "OPEN" });
// In recordSuccess quando state → CLOSED:
metrics.circuitBreaker.state = 0;
metrics.circuitBreaker.lastStateChangeTs = Date.now();
logEvent({ level: "info", event: "breaker_closed", breakerState: "CLOSED" });
```

#### Integrazione in withLock()

```ts
// All'inizio di withLock(key, ttlSec, fn):
const redis = getRedis();
const jobName = key.includes("fixtures") ? "fixtures" : key.includes("predictions") ? "predictions" : "quotes";

// Se Redis null (degraded mode):
if (!redis) {
  ensureJob(jobName).skippedDegraded++;
  metrics.degradedMode = true;
  metrics.redis.lastDisconnectTs = Date.now();
  logEvent({ level: "warn", job: jobName, event: "degraded_mode_entered", degradedMode: true });
  return;
}

// Se lock non acquisito (altro processo ha il lock):
if (!acquired) {
  ensureJob(jobName).skippedLock++;
  logEvent({ level: "info", job: jobName, event: "lock_skipped" });
  return;
}

logEvent({ level: "info", job: jobName, event: "lock_acquired" });
// ... esecuzione fn ...
// dopo fn completato con successo: se metrics.degradedMode era true, impostare false e logEvent("degraded_mode_exited")
```

---

*Documento di design per il refactoring del polling centralizzato.*
