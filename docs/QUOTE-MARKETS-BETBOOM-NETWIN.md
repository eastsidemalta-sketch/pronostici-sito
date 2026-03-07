# Quote multi-mercato: Betboom e Netwin

Riepilogo dei mercati disponibili e come verificarli, per la pagina Match (stile [Oddschecker](https://www.oddschecker.com/it/calcio/italia/serie-a/cagliari-v-como)).

---

## Tab MatchQuotesTabs (già implementati)

| Tab | Mercati | Chiave API |
|-----|---------|------------|
| **Quote principali** | 1X2, Doppia chance, Draw no bet | h2h, double_chance, draw_no_bet |
| **Handicap** | Asian Handicap | spreads |
| **Scommesse sul risultato** | Over/Under 2.5, Over/Under 1.5, Entrambe segnano | totals_25, totals_15, btts |
| **Extra** | 1º tempo 1X2 | h2h_3_way_h1 |

---

## Betboom (BR)

**Paese:** Brasile (BR)  
**API:** Sporthub `matches/get_by_category_ids` (POST)

### Mercati richiesti (market_ids)

| market_id | Mercato | Chiave nostra | Stato |
|-----------|---------|---------------|-------|
| 1 | Winner (1X2) | h2h | ✅ Configurato |
| 2 | Handicap | spreads | ✅ In bodyTemplate |
| 3 | Total (Over/Under) | totals_25, totals_15 | ✅ In bodyTemplate |
| 14 | Both teams to score | btts | ✅ In bodyTemplate |
| 20 | Double Chance | double_chance | ✅ In bodyTemplate |

**Config:** `data/clientProfiles.json` → BR-0001  
- `bodyTemplate.market_ids`: [1, 2, 3, 14, 20]  
- `mapping.stakes1X2.marketName`: "Winner" (Betboom API restituisce "Winner" per 1X2)

### Parsing stakes Betboom

Gli stakes arrivano con `market_id`, `market_name`, `name`, `factor`. Le funzioni `extract*FromStakes` in `directBookmakerFetcher.ts` cercano:

| Mercato | Criterio match |
|---------|----------------|
| 1X2 | market_name "Result" o "Winner" |
| Handicap | market_id 2 o market_name "handicap" |
| Total | market_id 3 o 79120, name "Over X" / "Under X" |
| BTTS | market_id 14, market_name "both" / "btts" / "score" |
| Double Chance | market_id 20, market_name "double chance" |

### Come verificare Betboom

```bash
# Debug feed con tutti i mercati
curl "https://test.playsignal.io/api/debug-betboom-feed?marketIds=1,2,3,14,20&simulate=1"

# Quote per partita specifica (raw = vedi matchRequested per ogni bookmaker)
curl "https://test.playsignal.io/api/debug-quotes-match?homeTeam=Mirassol&awayTeam=Santos&leagueId=71&country=BR&raw=1"
```

Controlla `matchRequested` in `rawByBookmaker.Betboom`: se `spreads`, `totals_25`, `btts`, `double_chance` sono vuoti ma `h2h` c'è, il problema è nel parsing degli stakes (market_name diverso da atteso).

---

## Netwin (IT)

**Paese:** Italia (IT)  
**API:** Exalogic `get_eventi_psqf` (FULL/DELTA)

### Mercati (codici Lista v_scommesse)

| Lista | Mercato | Chiave nostra | Stato |
|-------|---------|---------------|-------|
| 3 | 1X2 | h2h | ✅ |
| 7989 | Over/Under | totals_25, totals_15 | ✅ |
| 8 | Handicap | spreads | ✅ |
| 18 | Gol/No Gol (BTTS) | btts | ✅ |
| 15, 16, 17 | Doppia chance | double_chance | ✅ |

**Config:** `data/bookmakers.json` → netwinit (IT-0002)  
- `apiConfig.markets`: ["h2h", "spreads", "totals_25", "totals_15", "btts", "double_chance"]  
- `v_scommesse` in queryParams include tutti i codici Lista

### Parsing Exalogic/Netwin

`scommesseToStakes` converte le Scommesse in formato stakes, poi `extract*FromStakes` estrae i mercati. I `descr` Netwin possono essere in italiano: "Over 2.5", "Sopra 2.5", "Sì", "No", "1X", "12", "X2".

### Come verificare Netwin

```bash
# Esplora feed (manifestazioni, partite)
curl "https://test.playsignal.io/api/debug-netwin-feed?explore=1"

# Codici Lista presenti nella FULL
curl "https://test.playsignal.io/api/debug-netwin-lista"

# Quote per partita (IT)
curl "https://test.playsignal.io/api/debug-quotes-match?homeTeam=Cagliari&awayTeam=Como&leagueId=135&country=IT&raw=1"
```

Se `matchRequested` ha solo `h2h` ma non spreads/totals/btts/double_chance, controlla `data/.netwin-lista-codes.json`: se 7989, 8, 18, 15-17 sono in `missing`, quei mercati non sono nel feed Netwin.

---

## Pagina Match: dove vengono usate

**Componente:** `app/[locale]/pronostici-quote/calcio/[slug]/MatchQuotesTabs.tsx`

- Chiama `/api/quotes?sportKey=...&homeTeam=...&awayTeam=...&country=...&leagueId=...`
- L'API restituisce `multiMarket` con chiavi: h2h, double_chance, draw_no_bet, spreads, totals_25, totals_15, btts, h2h_3_way_h1
- I tab vengono mostrati solo per i mercati con dati: `cat.markets.some((m) => (multiMarket[m.key] ?? []).length > 0)`

**Brasile (pt-BR):** MatchQuotesTabs con country=BR → quote da Betboom  
**Italia (it):** MatchQuotesTabs con country=IT → quote da Netwin

---

## Checklist per avere tutti i mercati

### Betboom (BR)
- [x] bodyTemplate con market_ids [1,2,3,14,20]
- [ ] Verificare che gli stakes abbiano market_name compatibili (Handicap, Total, Both Teams To Score, Double Chance)
- [ ] Se mancano: aggiungere alias in `extractHandicapFromStakes`, `extractTotalsFromStakes`, ecc. per i nomi PT-BR

### Netwin (IT)
- [x] v_scommesse include 3, 7989, 8, 18, 15-16-17
- [x] scommesseToStakes converte tutti i mercati
- [ ] Verificare con debug-netwin-lista che i codici siano presenti
- [ ] Se totals_25/spreads/btts/dc sono vuoti: controllare i `descr` in scommesseToStakes (regex Over/Under, Handicap, ecc.)

---

## Riferimenti

- [Oddschecker Cagliari-Como](https://www.oddschecker.com/it/calcio/italia/serie-a/cagliari-v-como) – layout target
- [Match Brasil Mirassol-Santos](https://test.playsignal.io/pt-BR/pronostici-quote/calcio/mirassol-santos-fixture-1492156) – Betboom
- `docs/NETWIN-MERCATI-QUOTE.md` – dettaglio parsing Netwin
- `docs/BETBOOM_MARKETS.md` – market_id Betboom
