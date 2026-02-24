# Stress Test Teorico e Failure Analysis

Analisi di resilienza, scalabilità e stabilità dell'architettura descritta in `POLLING-INTELLIGENTE-ARCHITETTURA.md`.

---

## HARD CONSTRAINT (NON MODIFICABILE)

> **Il frontend NON deve MAI chiamare direttamente API-Football o bookmaker.**
> Tutte le chiamate esterne avvengono esclusivamente nel poller centralizzato.
> Le route leggono SOLO dallo store.

---

## 1. SCALABILITÀ — Scenario crescita

### 1.1 Parametri simulati

| Parametro | Base | Stress (2x/7d/2x) |
|-----------|------|-------------------|
| Leghe (L) | 18 | 36 |
| Finestra (D) | 7 giorni | 7 giorni (invariato) |
| Fixtures (F) | 50 | 100 |
| Traffico frontend | 1x | 10x |

### 1.2 Impatto su chiamate API-Football/mese

**Fixtures:**
- Base: `(18-5)×4×30 + 5×24×30 = 5.160`
- Stress: `(36-5)×4×30 + 5×24×30 = 3.720 + 3.600 = 7.320`
- *(Assumendo 5 leghe hot invariato; se hot raddoppiano: 10×24×30 = 7.200 → totale ~11.000)*

**Predictions (F1=30, F2=50, F3=20):**
- F1: `30 × 2 × 30 = 1.800`
- F2: `50 × 9.6 × 30 = 14.400`
- F3: `20 × 24 × 30 = 14.400`
- **Totale: ~30.600/mese**

**Totale API-Football stress: ~38.000–42.000/mese** (vs 20.500 base)

| Rischio | Gravità | Note |
|---------|---------|------|
| Superamento quota API-Football Pro (225k/mese) | **Bassa** | 42k < 225k |
| Superamento quota Ultra (2.25M/mese) | **Nessuna** | Ampio margine |
| Rate limit 10 req/min API-Football | **Media** | Con 100 fixtures, predictionsJob può fare 100 req in sequenza; 100ms delay = 10s totali. Se ciclo ogni 15 min, ok. Picco: ~7 req/min. |

### 1.3 Impatto su Redis memory

**Stima dimensione record (ordine di grandezza):**

| Chiave | Dimensione/record | N record | Totale |
|--------|-------------------|----------|--------|
| fixtures:{leagueId}:{range} | ~50 KB (20 fixtures/lega) | 36 × 1 | ~1.8 MB |
| fixture:{id} | ~2 KB | 100 | ~200 KB |
| predictions:{id} | ~200 B | 100 | ~20 KB |
| quoteSummary:{id} | ~500 B | 100 | ~50 KB |
| resolvedTeamMap:{id} | ~300 B | 100 | ~30 KB |
| index:fixture_ids | ~1 KB | 1 | ~1 KB |

**Totale stimato: ~2–3 MB** (trascurabile per Redis).

Con 10x traffico frontend: **nessun impatto** su Redis (le route leggono solo; nessun write da frontend).

### 1.4 Saturazione scheduler

- **fixturesJob**: 36 leghe × 1 fetch sequenziale; ~2–3 s per lega → ~2 min totali. Intervallo 6h → ok.
- **predictionsJob**: 100 fixture da valutare; ~100 GET Redis + ~100 fetch API (solo quelli da refresh). Se 30 da refresh: 30 × (100ms + 500ms API) ≈ 18 s. Ciclo ogni 15 min → ok.
- **quotesJob**: 20 bookmaker × N leghe; 20 × 200ms ≈ 4 s per (sport, league). Con 10 leghe: ~40 s. Ciclo ogni 5 min → ok.

| Collo di bottiglia | Gravità | Mitigazione |
|-------------------|---------|-------------|
| predictionsJob sequenziale | **Media** | Batch parallelo (max 5 concurrent) con `Promise.all` + delay 100ms tra batch |
| quotesJob: 20 fetch sequenziali | **Bassa** | Già parallelizzabile: `Promise.all(bookmakers.map(fetch))` |

### 1.5 Raccomandazioni

1. **Throttling predictions**: max 5–10 fetch API-Football concurrent; queue con delay.
2. **Batching fixtures**: le leghe sono già fetchate una per una; considerare batch di 3–5 leghe in parallelo (rispettando rate limit).
3. **Monitoraggio**: alert se predictionsJob > 10 min o fixturesJob > 5 min.

---

## 2. SCALABILITÀ — Scenario quote aggressive

### 2.1 Parametri simulati

- Quote refresh **ogni 1 minuto** per match <2h (invece di 3 min)
- 20+ bookmaker
- F3 = 10 partite nel bucket ≤2h

### 2.2 CPU load

- **matchTeam**: fuzzy similarity (Jaro-Winkler/Levenshtein) è O(n×m) per confronto. Con 100 quote × 10 fixture × 2 nomi = 2.000 confronti per ciclo.
- Ciclo quote ogni 1 min → 2.000 confronti/min. **Trascurabile** per CPU moderna.
- **computeFixtureQuoteSummary**: media su 20 bookmaker, O(1) per fixture. Trascurabile.

| Rischio | Gravità |
|---------|---------|
| CPU saturation | **Nessuna** |

### 2.3 Memory growth quoteSummary

- Ogni quoteSummary: ~500 B. 10 fixture × 60 cicli/h × 2h = 1.200 write/h per quelle fixture.
- Redis SET con TTL 60s: key evictata automaticamente. **Nessun growth**.
- Se TTL non impostato correttamente: 10 fixture × 500 B = 5 KB. Trascurabile.

| Rischio | Gravità |
|---------|---------|
| Memory leak quoteSummary | **Bassa** (solo se TTL errato) |

### 2.4 Race condition

- **Scenario**: 2 cicli quotesJob si sovrappongono (lock scade prima della fine del job).
- **Production Hardening**: Lock TTL 300s, extension ogni 150s (vedi POLLING-INTELLIGENTE-ARCHITETTURA.md §8.1).
- Se extension fallisce: abort job; lock scade da solo.

| Rischio | Gravità | Mitigazione |
|---------|---------|-------------|
| Race: 2 quotesJob in parallelo | **Bassa** | TTL 300s + extension; ownership UUID |
| Write concorrenti su quoteSummary:{id} | **Bassa** | Last-write-wins; dati idempotenti. Possibile flicker per 1 ciclo. |

### 2.5 Debouncing / coalescing

- **Problema**: Con refresh 1 min, se 10 partite <2h e 5 leghe, ogni ciclo fa 20 fetch × 5 = 100 fetch. Ogni 1 min = 6.000 fetch/h dai bookmaker.
- **Rate limit bookmaker**: sconosciuto; 100 req/min potrebbe triggerare 429.
- **Coalescing**: raggruppare fetch per bookmaker (1 req per bookmaker per lega, non per fixture). Il design già fa 1 req per bookmaker per (sport, league) → quote condivise per tutte le fixture della lega. **Nessun coalescing aggiuntivo necessario**.
- **Debouncing**: se nextRefreshAt è 1 min, evitare di anticipare il refresh. Il job gira ogni 5 min (check interval); con nextRefreshAt 1 min, solo le fixture con kickoff <2h verranno refreshate. Con 10 fixture, 10 × (1/1 min) = 10 refresh/min per quoteSummary. Il job fetcha 20 bookmaker una volta, poi matcha su 10 fixture. Quindi 20 fetch ogni 1 min (per le leghe con fixture <2h). **20 req/min per bookmaker** → plausibile.

| Raccomandazione | Priorità |
|-----------------|----------|
| Lock TTL ≥ 2× durata max job | Alta |
| Monitoraggio 429 da bookmaker | Media |
| Fallback: ridurre a 2 min se 429 | Bassa |

---

## 3. FAILURE ANALYSIS — API-Football down

### 3.1 Scenario: 429 (rate limit)

**Comportamento attuale:**
- `fetchPredictionFromApi` lancia eccezione.
- `backoff("predictions", id, err)` incrementa contatore, sleep, rilancia.
- Il `for` nel predictionsJob non ha try/catch globale → **un 429 fa fallire l'intero job** (o solo quella iterazione, dipende dall'implementazione).
- Se `backoff` rilancia: il job termina in errore; le altre fixture in `toRefresh` **non vengono processate** fino al prossimo ciclo.

**nextRefreshAt:**
- Se fetch fallisce, **non si scrive** nello store. La prediction precedente resta con vecchio nextRefreshAt.
- Al prossimo ciclo (15 min): `nextRefreshAt <= now` → **stessa fixture ritentata**. Loop di retry ogni 15 min.

| Rischio | Gravità |
|---------|---------|
| 429 su 1 fixture blocca le altre nel batch | **Alta** (se implementazione sequenziale senza try/catch per singola fixture) |
| Loop infinito di retry su 429 | **Media** (stesso nextRefreshAt, stesso retry) |
| Consumo quota senza successo | **Alta** (ogni retry = 1 chiamata) |

### 3.2 Scenario: timeout

- Fetch blocca per N secondi (es. 30s).
- Con 100 fixture da refresh e 100ms delay: 100 × 30s = 3.000s = 50 min per un solo timeout.
- **Saturazione scheduler**: il predictionsJob non termina; il prossimo ciclo (15 min) parte ma il lock è ancora held? No: con timeout 10s (fetchWithTimeout) il fetch non blocca indefinitamente. Lock TTL 300s + extension; se fetch blocca 10s, extension continua. Con timeout 10s: max 10s per singola richiesta → rischio overlap ridotto.

| Rischio | Gravità |
|---------|---------|
| Timeout blocca job | **Alta** |
| Lock expiry durante timeout | **Media** (permette altro job, ma primo job continua) |

### 3.3 Scenario: API down per 2 ore

- **Predictions**: nessun aggiornamento. I dati in store restano **stale** ma validi (ultimo fetch riuscito).
- **Fixtures**: idem; fixtures non si aggiornano (es. rinvii, cancellazioni).
- **Frontend**: continua a servire dati stale. **Nessun impatto diretto** (legge solo dallo store).
- **nextRefreshAt**: le fixture con nextRefreshAt nel passato restano "da refreshare". Quando API torna: il job ritenta e alla fine riesce. **Nessun loop infinito** se l'API torna.

**Problema**: se l'API risponde 429 per 2 ore, ogni 15 min il job ritenta tutte le fixture "scadute". Con 50 fixture: 50 × 8 cicli = 400 chiamate in 2 ore, tutte 429. **Spreco di quota** e possibile ban temporaneo.

### 3.4 Raccomandazioni

| Mitigazione | Descrizione |
|-------------|-------------|
| **Circuit breaker** | Dopo N fallimenti consecutivi (es. 5) su API-Football, apri circuito per T secondi (es. 300). Durante open: skip fetch, mantieni dati stale. |
| **Try/catch per fixture** | In predictionsJob, wrappare ogni `fetchPredictionFromApi` in try/catch; su errore: log, continua con prossima fixture. Non bloccare il batch. |
| **Timeout esplicito** | `fetch` con `AbortController` e timeout 10s. Evita blocchi indefiniti. |
| **Non aggiornare nextRefreshAt su errore** | Se fetch fallisce, **non** scrivere nextRefreshAt. Ma: evitare retry immediato. Usare `backoff` con `nextRetryAt` persistente: su 429, imposta `nextRetryAt = now + 5 min` nello store per quella fixture. |
| **Jitter su retry** | Aggiungere jitter (es. ±30s) a nextRefreshAt per evitare thundering herd quando API torna. |

### 3.5 Riepilogo rischi API-Football

| Rischio | Gravità | Mitigazione |
|---------|---------|-------------|
| 429 blocca batch | Alta | Try/catch per fixture |
| Loop retry su 429 | Media | Circuit breaker + nextRetryAt |
| Timeout blocca job | Alta | AbortController 10s |
| Dati stale 2h | Bassa | Accettabile; circuit breaker limita retry |
| Perdita dati | Nessuna | Store non viene sovrascritto su errore |

---

## 4. FAILURE ANALYSIS — Redis down

### 4.1 Comportamento con Redis non disponibile — DEGRADED MODE

**Production Hardening (vedi POLLING-INTELLIGENTE-ARCHITETTURA.md §8.4):**

- **Nessun fallback file** in cluster multi-istanza (evita race condition e duplicazioni).
- Se Redis non raggiungibile: **NON eseguire job** (evita duplicazioni e incoerenza lock/dedup).
- Polling entra in **DEGRADED MODE**:
  - Log chiaro: `"Redis unavailable – polling disabled"` o `"DEGRADED MODE: Redis down"`.
  - Health endpoint/flag esposto (es. `/api/upcoming-health` → `{ status: "degraded" }`).
  - **Frontend**: chiama solo il backend; nessuna chiamata esterna. Se Redis down, le route restituiscono dati vuoti o 503; il frontend non effettua mai fetch verso API-Football o bookmaker.
- **Metriche/log da emettere**: `upcoming_degraded_mode_started`, `upcoming_redis_down`, `upcoming_health_check_failed`.
- **Uscita**: quando Redis torna su, il poller rileva connessione e riprende i job; `upcoming_degraded_mode_ended` log.

### 4.2 Rischio duplicazione richieste

- **Fixtures**: 2 istanze × 18 leghe = 36 chiamate invece di 18. Raddoppio.
- **Predictions**: 2 istanze × 50 fixture = 100 chiamate invece di 50. Raddoppio.
- **Quotes**: 2 istanze × 20 bookmaker = 40 fetch invece di 20. Raddoppio (gratis ma rate limit).

### 4.3 Retry strategy

- **Redis reconnect**: ioredis supporta retry automatico. Se Redis è down temporaneamente, le operazioni falliscono fino a reconnect.
- **Retry nel job**: se `redis.set` fallisce, non ritentare subito (evitare tight loop). Usare backoff: 1s, 2s, 4s, max 3 retry. Poi fallire il job e attendere prossimo ciclo.

### 4.4 Raccomandazioni (Production Hardening)

| Mitigazione | Descrizione |
|-------------|-------------|
| **NO fallback file** | In cluster multi-istanza: nessun fallback file. Evita race e duplicazioni. |
| **DEGRADED MODE** | Se Redis down: non eseguire job. Log + health endpoint. Frontend legge dati stale (se disponibili) o errore. |
| **Health check** | Endpoint `/api/upcoming-health` che verifica Redis. Se down: `{ status: "degraded" }`. |
| **Metriche** | `upcoming_degraded_mode_started`, `upcoming_redis_down`, `upcoming_degraded_mode_ended`. |

### 4.5 Riepilogo rischi Redis

| Rischio | Gravità | Mitigazione |
|---------|---------|-------------|
| Job non eseguibili senza Redis | Media | DEGRADED MODE; dati stale; nessuna duplicazione |
| Dati stale per utenti | Bassa | Accettabile; frontend serve ultimo snapshot da store |

---

## 5. CONCURRENCY TEST — 2 istanze backend

### 5.1 Overlap job

- **fixturesJob**: intervallo 6h. Durata ~2 min. Probabilità overlap: bassa.
- **predictionsJob**: intervallo 15 min. Durata 10–30 s. Overlap possibile se job 1 dura >15 min (es. 100 fixture × 500ms = 50s) e job 2 parte.
- **quotesJob**: intervallo 5 min. Durata 40–60 s. Overlap **probabile** se durata >5 min.

### 5.2 Redlock sufficiente?

**Production Hardening**: `redis.set(key, uuid, "NX", "EX", ttl)` con TTL per job:
- fixtures: 180s, predictions: 300s, quotes: 300s (vedi POLLING-INTELLIGENTE-ARCHITETTURA.md §8.1).
- Lock extension: `EXPIRE` ogni `ttl/2` secondi durante l'esecuzione.

- **NX**: set only if not exists. Prima istanza acquisisce.
- **EX ttl**: TTL ≥ 2× durata max job. Con extension, il lock non scade durante il job.
- **Verifica ownership**: `del` solo se `get key == uuid`.

**Redlock (algoritmo completo)**: richiede N/2+1 nodi Redis per consensus. Con Redis singolo, il simple lock è sufficiente per 2 istanze **se** TTL > durata max job e lock extension attiva.

| Rischio | Gravità |
|---------|---------|
| Lock expiry prima della fine job | **Mitigato** (TTL 300s + extension) |
| 2 run parallele | **Bassa** (con TTL corretto) |

### 5.3 Rischio deadlock

- **Deadlock** richiede risorse circolari. Qui: ogni job prende 1 lock, esegue, rilascia. Nessuna attesa su altro lock. **Nessun deadlock**.
- **Lock non rilasciato**: se il processo crasha dopo `set` e prima di `del`, il lock scade con TTL. **Nessun deadlock permanente**.

### 5.4 Rischio starvation

- **Starvation**: una istanza acquisisce sempre il lock, l'altra mai.
- Con 2 istanze e lock random: ogni istanza ha ~50% probabilità. Su molti cicli, la distribuzione è equa. **Starvation improbabile**.
- Se un'istanza è sempre più veloce (es. stessa macchina, meno latency Redis): potrebbe acquisire più spesso. Non critico: i dati sono gli stessi; una sola istanza che lavora è sufficiente.

### 5.5 Raccomandazioni

| Mitigazione | Descrizione |
|-------------|-------------|
| **Lock TTL ≥ 2× durata max job** | fixtures 180s, predictions 300s, quotes 300s (vedi Default Config §8.2 arch). |
| **Estensione lock** | Ogni `ttl/2` secondi: fixtures 90s, predictions 150s, quotes 150s. Se EXPIRE fallisce: abort job. |
| **Lock per job type** | 3 lock separati (già previsto). Ok. |
| **Verifica lock ownership** | UUID nel lock; `del` solo se `get key === lockValue`. |

---

## 6. Riepilogo rischi e raccomandazioni

### 6.1 Rischi per gravità

| Gravità | Rischio |
|---------|---------|
| **Alta** | 429 blocca intero batch predictions; timeout blocca job; lock TTL < job duration; Redis down senza fallback |
| **Media** | Loop retry su 429; race 2 quotesJob; duplicazione con Redis down + 2 istanze |
| **Bassa** | Memory leak se TTL errato; dati stale 2h; starvation |

### 6.2 Raccomandazioni prioritarie (Production Hardening)

1. **Circuit breaker** per API-Football (obbligatorio)
2. **Try/catch per singola fixture** in predictionsJob (obbligatorio)
3. **Timeout 10s** su fetch API-Football (obbligatorio)
4. **Lock TTL** 300s quotes/predictions, 180s fixtures (obbligatorio)
5. **DEGRADED MODE** quando Redis down: no run job, no fallback file (obbligatorio)
6. **Lock extension** per job lunghi (consigliato)
7. **Jitter su nextRefreshAt** dopo errore (consigliato)

### 6.3 Production Hardening — Sezione dedicata

| Argomento | Dettaglio |
|-----------|-----------|
| **Default Config** | Tabella unica §8.2 arch: tutti gli env vars e default |
| Lock TTL | fixtures 180s, predictions 300s, quotes 300s; extension ttl/2; ownership UUID; abort se extension fallisce |
| Concurrency | predictionsJob: pool 5–10, minDelayMs 100 |
| Timeout/retry | 10s timeout; baseDelayMs 1000, maxDelayMs 30000; jitter additivo [0,500]ms; 429: min(Retry-After, maxDelayMs) |
| Circuit breaker | errorThreshold 5, cooldownMs 120000, halfOpenMaxRequests 3, successThreshold 2; OPEN: nextRefreshAt += openGraceMs 300000 |
| Degraded mode | Redis down → no job; health endpoint; log/metriche |

---

## 7. Monitoring & Observability

Vedi POLLING-INTELLIGENTE-ARCHITETTURA.md §11 per dettagli completi.

### 7.1 Metriche minime

- **Job**: `job_runs_total`, `job_success_total`, `job_failure_total`, `job_duration_ms`, `job_skipped_due_to_degraded_mode_total`, `job_skipped_due_to_lock_total`
- **API-Football**: `api_football_requests_total`, `api_football_429_total`, `api_football_timeout_total`, `circuit_breaker_state`, `circuit_breaker_open_total`
- **Redis**: `redis_connection_errors_total`, `degraded_mode_active`

### 7.2 Operational Alerts (soglie consigliate)

| Alert | Soglia | Gravità |
|-------|--------|---------|
| Circuit breaker OPEN ripetuto | > 3 volte in 10 minuti | Alta |
| Redis disconnesso | > 60s | Alta |
| Job failure consecutivi | 3 fallimenti consecutivi per stesso job | Media |
| API-Football 429 | > 5/min | Media |
| Job duration critica | `job_duration_ms` > 80% lock TTL | Media |

### 7.3 Health endpoint

`GET /api/health` — read-only, nessuna chiamata esterna. Restituisce `status`, `redis`, `circuitBreaker`, `jobs`, `freshnessSummary`, `degradedMode`, `uptimeSeconds`.

### 7.4 Data Freshness Indicator

Vedi POLLING-INTELLIGENTE-ARCHITETTURA.md §9. Soglie configurabili (fresh/aging/stale); `dataFreshness` in `/api/upcoming-data` e `/api/fixture/[id]`; `freshnessSummary` in `/api/health`. Solo lettura store, nessuna chiamata esterna.

---

*Analisi tecnica. Nessuna modifica alla hard constraint. Nessuna proposta di chiamate esterne dal frontend.*
