# Test special quote sulla versione test

Guida per visualizzare e sistemare Handicap, Total, BTTS, Double Chance sulla pagina match.

## 1. Deploy sulla versione test

```bash
cd /var/www/pronostici-sito-test
git pull origin main
npm run build
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
cp -r data .next/standalone/
cp .env.local .next/standalone/
pm2 restart pronostici-test
```

## 2. Endpoint di debug (prima di sistemare la UI)

### Verificare quali mercati arrivano da Betboom

```
https://TUO-SITO-TEST/api/debug-quotes-match?homeTeam=Palmeiras&awayTeam=Flamengo&leagueId=71&country=BR
```

Risposta: `summary` indica quanti risultati per ogni mercato (h2h, spreads, totals_25, btts, double_chance).

- Se `summary.h2h > 0` ma gli altri sono 0 → il parsing degli stakes Betboom va adattato
- Se tutti 0 → verificare BETBOOM_API_KEY e che la partita esista nel feed

### Vedere la struttura raw degli stakes Betboom

```
https://TUO-SITO-TEST/api/debug-betboom-feed?categoryIds=161&marketIds=1,2,3,14,20&full=1
```

Controllare `stakesByMarket` e `firstStakeSample` per capire i nomi dei mercati e degli outcome.

## 3. Visualizzare sulla pagina match

1. Vai su **https://TUO-SITO-TEST/pt-BR/**
2. Clicca su una partita (es. Brasileirão)
3. Scorri fino a **"Tutte le quote"**
4. Le tab mostrano solo i mercati con dati: **Quote Principali**, **Scommesse con Handicap**, **Scommesse sul risultato**

Se una tab non appare, quel mercato non ha dati (vedi debug sopra).

## 4. Se i mercati non compaiono

| Problema | Azione |
|----------|--------|
| `stakesByMarket` vuoto per Handicap/Total | Verificare `market_name` negli stakes (es. "Handicap", "Total", "Both teams to score") |
| Nomi outcome diversi | Adattare regex in `directBookmakerFetcher.ts` (extractHandicapFromStakes, extractTotalsFromStakes, ecc.) |
| Nessuna partita matchata | Verificare `matchTeamNames` – i nomi Betboom potrebbero differire da API-Football |

## 5. Home page senza quote/pronostici

Se la home pt-BR non mostra quote e pronostici:
1. Prova `?refresh=1` sull’URL (es. `/pt-BR/?refresh=1`) per bypassare la cache
2. Invalida la cache: `GET /api/debug-br-home?invalidate=1`
3. Se persiste: verificare che `market_ids: [1,2,3,14,20]` non causi risposta vuota da Betboom. In tal caso, provare temporaneamente `market_ids: [1]` in clientProfiles.

## 6. File da modificare per sistemare

- `lib/quotes/providers/directBookmakerFetcher.ts` – funzioni `extract*FromStakes`
- `app/[locale]/pronostici-quote/calcio/[slug]/MatchQuotesTabs.tsx` – layout/ordine tab, etichette PT-BR
