# Architettura: poller centralizzato per API-Football + 20 bookmaker

Proposta per disaccoppiare le chiamate API dal traffico visitatori, usando un poller centralizzato (come per i live) che popola uno store con fixtures, predictions e quote.

---

## 1. Panoramica

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        POLLER CENTRALIZZATO                              │
│  (cron ogni 5 min, o script standalone)                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  1. API-Football: fixtures (per lega) + predictions (per fixture)       │
│  2. 20 bookmaker: quote h2h (1 per bookmaker, per sport/leghe)           │
│  3. Match quote → fixture tramite team names (homeTeam, awayTeam)        │
│  4. Salva in Redis / JSON                                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         STORE (Redis / file)                            │
│  fixtures, predictions, quotes per fixture_id                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┤
│  API interne: /api/upcoming-data, /api/fixture/[id]                     │
│  Frontend: legge solo dallo store, ZERO chiamate esterne                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Struttura dello store

### Chiavi Redis (o file JSON)

| Chiave | Contenuto | TTL |
|--------|-----------|-----|
| `upcoming:fixtures` | Lista fixture (id, teams, league, date, …) | 10 min |
| `upcoming:predictions` | `{ [fixtureId]: { home, draw, away } }` | 10 min |
| `upcoming:quotes` | `{ [fixtureId]: FixtureQuoteSummary[] }` | 10 min |
| `upcoming:last_poll` | Timestamp ultimo poll | - |

Oppure struttura unificata:

| Chiave | Contenuto |
|--------|-----------|
| `upcoming:data` | `{ fixtures, predictionsMap, quotesMap }` |

### Formato `quotesMap`

```ts
// quotesMap[fixtureId] = FixtureQuoteSummary (come oggi)
{
  [fixtureId]: {
    best1, bestX, best2,
    oddsBasedPct1, oddsBasedPctX, oddsBasedPct2,
    bookmaker1, bookmakerX, bookmaker2,
  }
}
```

Le quote vengono **associate al fixture_id** tramite match sui nomi squadre (`matchTeamNames`).

---

## 3. Flusso del poller

### Ciclo singolo

```
1. Fetch fixtures (API-Football)
   - Per ogni lega: GET fixtures?from=X&to=Y&league=Z
   - ~18 chiamate

2. Fetch predictions (API-Football)
   - Per ogni fixture: GET predictions?fixture=ID
   - ~50 chiamate (N = numero partite)

3. Fetch quote (20 bookmaker)
   - Per ogni (sportKey, leagueId) con fixtures:
   - Per ogni bookmaker direct: fetchDirectBookmakerQuotes(sportKey, leagueId)
   - 20 chiamate HTTP (1 per bookmaker)
   - Ogni risposta contiene tutte le partite di quella lega

4. Match quote → fixture
   - Per ogni fixture: homeName, awayName
   - Filtra quote dove matchTeam(homeTeam, homeName) && matchTeam(awayTeam, awayName)
   - Calcola FixtureQuoteSummary (best1, bestX, best2, oddsBasedPct, bookmaker1/X/2)
   - Salva in quotesMap[fixtureId]

5. Salva in store
   - fixtures, predictionsMap, quotesMap
```

### Frequenza consigliata

| Intervallo | API-Football/mese | Note |
|------------|-------------------|------|
| 5 min | ~450.000 | Bilanciato |
| 10 min | ~225.000 | Più economico |
| 2 min | ~1.1M | Più fresco |

Formula: `(18 + N_fixtures) × (60/interval_min) × 24 × 30`

---

## 4. Associare le quote ai fixture (20 bookmaker)

### Problema

- **Fixtures** (API-Football): `fixture_id`, `teams.home.name`, `teams.away.name`
- **Quote** (bookmaker): `homeTeam`, `awayTeam`, `outcomes: { home, draw, away }`

I bookmaker non espongono `fixture_id`, solo i nomi delle squadre.

### Soluzione: match per team names

Usare la logica già presente in `matchTeamNames` (con `teamAliases`):

```ts
// Per ogni fixture
const homeName = fixture.teams.home.name;  // "Inter"
const awayName = fixture.teams.away.name;  // "Milan"

// Per ogni quote da tutti i 20 bookmaker (già merge in h2h[])
const matched = h2h.filter(q =>
  matchTeamNames(q.homeTeam, homeName) && matchTeamNames(q.awayTeam, awayName)
);

// matched = quote di tutti i bookmaker per questa partita
// Poi computeOddsBasedPercentages(matched) → FixtureQuoteSummary
```

### Flusso

1. Poller chiama `getMultiMarketQuotes(sportKey, { leagueId })` per ogni (sport, lega) con fixtures.
2. Per i bookmaker direct: `fetchDirectBookmakerQuotes` restituisce `{ homeTeam, awayTeam, outcomes }[]`.
3. Per ogni fixture della lega: filtra le quote per `(homeTeam, awayTeam)`.
4. Aggrega le quote di tutti i bookmaker e calcola `FixtureQuoteSummary` (come in `fixturesQuotes.ts`).

---

## 5. Nuove API interne

### `GET /api/upcoming-data`

Legge dallo store e restituisce:

```json
{
  "fixtures": [...],
  "predictionsMap": { "123": { "home": 45, "draw": 28, "away": 27 }, ... },
  "quotesMap": { "123": { "best1": 2.1, "oddsBasedPct1": 45, ... }, ... },
  "last_poll_at": "2025-02-24T12:00:00Z"
}
```

### `GET /api/fixture/[id]` (per dettaglio)

Per la pagina dettaglio: fixture + predictions + quote per quella partita. Se serve anche dati extra (form, h2h, ecc.) si può:
- mantenere fetch on-demand per quella parte (solo dettaglio), oppure
- estendere il poller per includere anche form/h2h per le partite più viste.

---

## 6. Modifiche al frontend

### Home / liste partite

**Prima**: `getUpcomingFixtures` + `getPredictionsForFixtures` + `getQuotesForFixtures` nel render.

**Dopo**: `fetch('/api/upcoming-data')` o passaggio dati da server che legge dallo store.

```ts
// app/[locale]/page.tsx
const data = await fetch(process.env.NEXT_PUBLIC_APP_URL + '/api/upcoming-data').then(r => r.json());
// oppure: server component che legge direttamente dallo store
const { fixtures, predictionsMap, quotesMap } = await getUpcomingDataFromStore();
```

### Pagina dettaglio

**Prima**: `getFixtureDetails` + `getFixturePredictions` + `getMultiMarketQuotes` nel render.

**Dopo**: `fetch('/api/fixture/[id]')` che legge fixture + predictions + quote dallo store.

Per form, h2h, injuries: si può mantenere fetch on-demand (solo dettaglio), oppure includerli nel poller se vuoi ridurre ulteriormente le chiamate.

---

## 7. Store: riuso di Redis

Si può riusare lo stesso Redis del live:

- Prefisso `live:*` → dati live (come ora)
- Prefisso `upcoming:*` → fixtures, predictions, quotes

Fallback su file JSON (come `liveMatches.json`) se Redis non è configurato.

---

## 8. Script poller

Nuovo script `scripts/upcoming-poller.ts`:

```ts
// 1. Fetch fixtures (getUpcomingFixtures)
// 2. Fetch predictions (getPredictionsForFixtures)
// 3. Fetch quotes (getQuotesForFixtures - che internamente usa getMultiMarketQuotes per sport/leghe)
// 4. Match quote → fixture
// 5. Salva in store
```

Esecuzione via cron: `*/5 * * * *` (ogni 5 minuti).

---

## 9. Riepilogo

| Componente | Ruolo |
|------------|-------|
| **Poller** | Fetch fixtures, predictions, quote da 20 bookmaker; match quote → fixture; salva in store |
| **Store** | Redis/JSON con fixtures, predictionsMap, quotesMap |
| **API** | `/api/upcoming-data`, `/api/fixture/[id]` leggono solo dallo store |
| **Frontend** | Legge da API interne, nessuna chiamata API-Football o bookmaker |

**Chiamate API**: dipendono solo dall’intervallo del poller, non dai visitatori.

**20 bookmaker**: chiamate **gratuite** – l'unico costo è la banda passante (GB in uscita, trascurabile).

**Associazione quote**: match `(homeTeam, awayTeam)` → `fixture_id` tramite `matchTeamNames` e `teamAliases`.
