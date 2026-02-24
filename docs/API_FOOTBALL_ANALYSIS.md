# Analisi chiamate API-Football

Analisi completa di tutte le chiamate all'API API-Football (v3.football.api-sports.io) nel codebase.

---

## Riepilogo endpoint e chiamate

| Endpoint API | Funzione | Dove viene chiamata | Trigger | Frequenza | Cache | Note |
|-------------|----------|---------------------|---------|-----------|-------|------|
| `GET /fixtures?id={id}` | `getFixtureDetails` | Match page (metadata + page), debug-como | User request | 2x per match page load | 30s revalidate | **Duplicazione**: metadata e page chiamano separatamente |
| `GET /fixtures?id={id}` | `getFixtureDetailsNoCache` | Match page (fallback FALLBACK_FIXTURES) | User request | 0-2x condizionale | no-store | Solo per partite mancanti in form squadra |
| `GET /fixtures?from=&to=&league=&season=` | `getUpcomingFixtures` | Home, Pronostici-quote, Calcio, Future, Matching-report | User request / Admin | 1x per page, N leghe in loop | 60s revalidate | **N chiamate**: 1 per lega (es. 14 leghe = 14 chiamate) |
| `GET /predictions?fixture={id}` | `getFixturePredictions` | Match page, getPredictionsForFixtures | User request | 1x match page; **Nx lista** (1 per partita) | 60s revalidate | **Alto volume**: 20 partite = 20 chiamate predictions |
| `GET /fixtures?team={id}&last=30` | `fetchTeamFixtures` (via getTeamLastFixtures) | Match page | User request | 2x (home + away) | 60s revalidate | Parte di getTeamLastFixtures |
| `GET /fixtures?team={id}&from=&to=` | `fetchTeamFixtures` (via getTeamLastFixtures) | Match page | User request | 2x (home + away) | 60s revalidate | Parte di getTeamLastFixtures |
| `GET /fixtures?team={id}&league=137&last=10&season=` | `fetchTeamFixtures` (via getTeamLastFixtures) | Match page | User request | 2x (home + away) | 60s revalidate | Coppa Italia esplicita |
| `GET /fixtures?live=all` | `getSerieAFixtures` (lib) | **NON CHIAMATA** | - | 0 | 15s | **Codice morto** |
| `GET /fixtures?league=135&season=2024&next=10` | `getSerieAFixtures` (pronostici-quote) | **NON CHIAMATA** | - | 0 | 60s | **Codice morto** |
| `GET /fixtures?from=&to=&league=&season=` | `getYesterdayFixtures` | **NON CHIAMATA** | - | 0 | 60s | **Codice morto** |
| `GET /fixtures?team=&last=` | `fetchTeamFixturesRaw` | debug-como-fixtures API | Manuale/debug | 1x | no-store | Solo debug route |

---

## Dettaglio per contesto

### 1. Home page (`/[locale]`)
- **getUpcomingFixtures(leagueIds)**: N chiamate (1 per lega, ~14 con "Tutti gli sport")
- **getPredictionsForFixtures(fixtureIds)**: M chiamate (1 per partita, es. 20 partite = 20 chiamate)
- **Totale stimato**: ~14 + 20 = **34 chiamate** per caricamento home
- **Refresh**: ListLiveRefresh ogni 30s se ci sono partite live → **34 chiamate ogni 30s**

### 2. Pagina Pronostici e Quote (`/[locale]/pronostici-quote`)
- Stesso schema della home
- **Totale**: ~34 chiamate per load
- **Refresh**: ogni 30s con partite live

### 3. Pagina Calcio (`/[locale]/pronostici-quote/calcio`)
- **getUpcomingFixtures(leagueIds)**: N chiamate (solo leghe calcio configurate)
- **getPredictionsForFixtures**: M chiamate
- **Totale**: ~N + M

### 4. Pagina singola partita (`/[locale]/pronostici-quote/calcio/[slug]`)
- **generateMetadata**: `getFixtureDetails` → 1 chiamata
- **MatchPage**: 
  - `getFixtureDetails` → 1 chiamata (duplicata!)
  - `getFixturePredictions` → 1 chiamata
  - `getTeamLastFixtures(home)` → 3 chiamate (last, dateRange, coppa)
  - `getTeamLastFixtures(away)` → 3 chiamate
  - `getFixtureDetailsNoCache` → 0-2 (fallback)
- **Totale**: 2 + 1 + 6 + 0-2 = **9-11 chiamate** per match
- **Refresh**: LiveMatchRefresh ogni 30s se partita live → **9-11 chiamate ogni 30s**

### 5. Pagina Future (`/[locale]/pronostici-quote/calcio/future`)
- **getUpcomingFixtures()**: N chiamate (tutte le leghe)
- **Totale**: ~14 chiamate

### 6. Matching Report (Admin)
- **getUpcomingFixtures()**: N chiamate
- Trigger: richiesta admin a `/api/ad2min3k/matching-report` o pagina report
- **Totale**: ~14 chiamate

### 7. Debug API (`/api/debug-como-fixtures`)
- **getFixtureDetails**: 1 chiamata
- **fetchTeamFixturesRaw**: 2 chiamate (last, dateRange)
- Trigger: chiamata manuale
- **Totale**: 3 chiamate

---

## Top 5 fonti di chiamate API non necessarie / ridondanti

| # | Fonte | Problema | Impatto stimato | Soluzione suggerita |
|---|-------|----------|-----------------|---------------------|
| **1** | **getPredictionsForFixtures** (lista partite) | 1 chiamata API per ogni partita nella lista. Con 20 partite = 20 chiamate predictions. L'API predictions non supporta batch. | **20+ chiamate** per ogni load di home/pronostici-quote/calcio | Cache predictions per fixtureId (Redis/DB) con TTL 5-10 min. Oppure caricare predictions solo on-demand (lazy) quando l'utente espande una partita. |
| **2** | **getFixtureDetails duplicato** (match page) | Chiamato sia in `generateMetadata` che nel componente `MatchPage` per la stessa partita. Next.js non condivide il risultato. | **2 chiamate** invece di 1 per ogni match page | Usare `generateMetadata` per passare i dati al page via React cache() o creare un fetcher condiviso che Next.js deduplica. |
| **3** | **getTeamLastFixtures** (3 chiamate per squadra) | Per ogni squadra: `last=30`, `from-to` (180 giorni), `league=137`. 6 chiamate totali per match. I dati sono parzialmente sovrapposti. | **6 chiamate** per match page | Consolidare in 1-2 chiamate: usare solo `from-to` con range ampio, oppure `last=30` + merge lato server. Coppa Italia potrebbe essere opzionale. |
| **4** | **getUpcomingFixtures** (loop per lega) | 1 chiamata API per ogni lega. Con 14 leghe = 14 chiamate. L'API non supporta multi-league in una singola richiesta. | **14 chiamate** per home/pronostici/future | Cache aggressiva (2-5 min) per fixtures. Considerare batch endpoint se API lo supporta. Pre-fetch in background (ISR). |
| **5** | **ListLiveRefresh / LiveMatchRefresh** | Refresh ogni 30s quando ci sono partite live. Ogni refresh = full re-fetch di tutte le chiamate della pagina. | **34+ chiamate ogni 30s** (home) o **9-11 ogni 30s** (match) | Refresh solo dei dati live (fixtures live, fixture details) invece di full page refresh. Endpoint dedicato per "solo risultati live". |

---

## Funzioni non utilizzate (codice morto)

| Funzione | File | Endpoint |
|----------|------|----------|
| `getSerieAFixtures` | lib/apiFootball.ts | `fixtures?live=all` |
| `getSerieAFixtures` | app/pronostici-quote/lib/apiFootball.ts | `fixtures?league=135&season=2024&next=10` |
| `getYesterdayFixtures` | lib/apiFootball.ts | `fixtures?from=&to=&league=&season=` |

**Raccomandazione**: Rimuovere o commentare se non previsto uso futuro.

---

## Possibilità di cache

| Dato | Cache attuale | TTL suggerito | Note |
|------|---------------|---------------|------|
| Fixture details | 30s revalidate | 30s (live) / 5 min (NS) | Differenziare per status |
| Fixtures (lista) | 60s revalidate | 2-5 min (NS) / 30s (live) | Ridurre chiamate loop |
| Predictions | 60s revalidate | 5-10 min | Cambiano raramente pre-partita |
| Team last fixtures | 60s revalidate | 10-15 min | Form squadra stabile |
| Live fixtures | 15s (getSerieAFixtures) | - | Non usato |

---

## Riepilogo numerico (stima per utente attivo)

- **1 visita home**: ~34 chiamate
- **1 visita match page**: ~10 chiamate  
- **1 ora su home con partite live**: 34 × 120 = **4.080 chiamate**
- **1 ora su match live**: 10 × 120 = **1.200 chiamate**

Con piano API-Football gratuito (100 req/giorno) il limite viene superato rapidamente con pochi utenti.
