# Netwin API – Sport e Mercati (v_sport, v_scommesse)

## Endpoint

```
https://b2b.egamingsolutionsrl.it/WSSportFeed/get_eventi_psqf?type=full|delta&system_code=PLAYSIGNAL&isLive=0&codiceSito=WINBET&v_sport=...&v_scommesse=...
```

## v_sport – Sport

| ID | Sport |
|----|-------|
| 1 | Calcio |
| 2 | Tennis |
| 3 | *(altro)* |
| 5 | Basket |
| 12 | Rugby |

Formato: ID separati da `-` (es. `1-2-3-12`)

---

## v_scommesse – Mercati per sport

### Calcio (v_sport=1)

| Codice | Mercato |
|--------|---------|
| 3 | Quote 1X2 |
| 4 | Risultato Primo Tempo / Secondo Tempo |
| 15, 16, 17 | Doppia chance |
| 15529 | Risultato Secondo tempo |
| 15529 | Risultato Primo Tempo |
| 17875 | Rimborso in caso di partità |
| 23052 (1) | Vincente entrambi i tempi |
| 23052 (2) | Vincente entrambi i tempi |
| 7989 | Over |
| 7989 | Under |
| 8 | Handicap |
| 7 | Risultato Esatto |
| 5 | Totale gol esatto (Somma gol finale) |
| 18 | Gol/No Gol |
| 22286 (1) | Risultato esatto Primo tempo |
| 23140 (1) | Entrambi le squadre segnano in entrambi i tempi |
| 23140 (2) | Entrambi le squadre segnano in entrambi i tempi |
| 22296 (1) | Totale Gol Esatto - Primo tempo (Somma Goal PT) |
| 22296 (2) | Totale Gol Esatto - Secondo tempo (Somma Goal ST) |
| 22284 (1) | Entrambi le squadre segnano primo tempo |
| 22284 (2) | Entrambi le squadre segnano secondo tempo |
| 570 | Totale gol Squadra casa (Somma Goal Casa) |
| 571 | Totale gol Squadra Ospite (Somma Goal Ospite) |
| 19 | Pari/Dispari |
| 420 | Vincente a 0 Squadra Casa |
| 421 | Vincente a 0 Squadra Ospite |
| 561 | Combinazione Goal/No Goal |
| 12562 | U/O + Goal/No Goal |
| 9942 | U/O Tempo |
| 9943 | U/O x Squadra |
| 27905 | U/O Squadra X Tempo Y |
| 16474 | *(non descritto)* |

### Basket (v_sport=5)

| Codice | Mercato |
|--------|---------|
| 110 | Vincente match |
| 7842 (1) | Primo tempo 1X2 |
| 7842 (2) | Secondo tempo 1X2 |
| 14863 | Over / Under (U/O inc. TS) |
| 26 | Handicap |
| 28 | 1X2 Basket |
| 9056 | 1X2 (3 Punti) |
| 8291 | 1X2 (senza scarto) |
| 30 | Margine Vittoria 7 Esiti |
| 31 | Margine Vittoria 12 Esiti |
| 191 | Pari/Dispari |
| 2832 | Parziale/Finale |
| 22580 | *(non descritto)* |

### Tennis (v_sport=2)

| Codice | Mercato |
|--------|---------|
| 20540 | Vincente Match Singolo |
| 51 | Set Betting a 3 |
| 52 | Set Betting a 5 |
| 982 | U/O Set nell'incontro |
| 983 | U/O Giochi nel match |
| 1127 | T/T Handicap Giochi |
| 4156 | Totale Set 2/3 |
| 6321 | Giocatore 1 Vin. almeno un set |
| 6322 | Giocatore 2 Vin. almeno un set |
| 6513 | U/O Giochi nel set |
| 6 | Qualificazione turno (stessa quota di vincente match) |

### Rugby (v_sport=12)

| Codice | Mercato |
|--------|---------|
| 3 | Risultato Finale |
| 19 | Numero Gol Pari/Dispari |

---

## Configurazione attuale (IT-0002)

`data/bookmakers.json`:

```json
"v_sport": "1-2-3-12",
"v_scommesse": "3-4-7989-15-16-17-15529-17875-23052-8-7-5-18-22286-23140-22296-22284-570-571-19-420-421-561-12562-9942-9943-27905-16474-110-7842-14863-26-28-9056-8291-30-31-191-2832-22580-20540-6-51-52-982-983-1127-4156-6321-6322-6513"
```

Il fetcher estrae **tutti i mercati** configurati in v_scommesse:
- **1X2** (codice 3, non 1) → `h2h`
- **Double Chance** (15, 16, 17) → `double_chance`
- **Handicap** (8) → `spreads`
- **Over/Under** (7989) → `totals_25`, `totals_15`
- **Gol/No Gol** (18) → `btts`

Le Scommesse vengono convertite in stakes sintetici (`scommesseToStakes`) e poi elaborate da `extract*FromStakes` (come per Betboom).
