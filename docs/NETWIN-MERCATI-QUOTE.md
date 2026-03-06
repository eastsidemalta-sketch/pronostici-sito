# Netwin – Categorie quote supportate e parsing

Riferimento per verificare e sistemare i mercati oltre all'1X2.

---

## 1. **1X2 (h2h)** – Codice Lista 3

**Output:** `{ home, draw, away }`

**Parsing:** Esito con `descr` = "1", "X"/"N", "2" oppure `cod` = 1, 2, 3

**Da verificare:** Ordine 1/X/2 (1=home, 2=draw, 3=away). Se le quote non tornano, potrebbe essere invertito 1↔2.

---

## 2. **Over/Under (totals_25, totals_15)** – Codice Lista 7989

**Output:** `{ over, under }` per linea 2.5 e 1.5

**Parsing `descr`:**
- **Over:** regex `over|sopra|oltre|o\s*(\d+[,.]?\d*)`
- **Under:** regex `under|sotto|meno|u\s*(\d+[,.]?\d*)`
- **Linea 2.5:** regex `2\.?5|2,5`
- **Linea 1.5:** regex `1\.?5|1,5`

**Esempi descr Netwin:** "Over 2.5", "Sopra 2.5", "O 2.5", "Under 2.5", "Sotto 2.5", "U 2.5"

**Da verificare:** Nomi italiani (Sopra/Sotto, O/U) e formato numero (2.5 vs 2,5).

---

## 3. **Handicap (spreads)** – Codice Lista 8

**Output:** `{ home, away, homePoint, awayPoint }` per ogni linea

**Parsing `descr`:**
- **Punto:** regex `([+-]?\d+[,.]?\d*)`
- **Casa vs Ospite:** regex `casa|home|1|squadra\s*1` vs `ospite|away|2|squadra\s*2`
- **Fallback:** se non contiene "ospite/away/2" e point > 0 → casa

**Esempi descr Netwin:** "Cagliari -0.5", "Como +0.5", "Squadra casa -1", "Squadra ospite +1"

**Da verificare:** Chi è "home" e chi "away" nel descr; se il segno è invertito.

---

## 4. **Gol/No Gol – BTTS (btts)** – Codice Lista 18

**Output:** `{ yes, no }`

**Parsing `descr`:**
- **Yes:** regex `s[iì]|yes|sim|ja|^gol$`
- **No:** regex `no|não|nao|nein|no\s*gol`

**Esempi descr Netwin:** "Sì", "Gol", "No", "No gol"

**Da verificare:** "Sì" vs "Si" (accenti); "Gol" vs "Entrambe segnano".

---

## 5. **Doppia chance (double_chance)** – Codice Lista 15, 16, 17

**Output:** `{ homeOrDraw, homeOrAway, drawOrAway }`

**Parsing `descr` (spazi rimossi):**
- **1X:** regex `1x|1 x|home.*draw|draw.*home`
- **12:** regex `12|1 2|home.*away|away.*home`
- **X2:** regex `x2|x 2|draw.*away|away.*draw`

**Esempi descr Netwin:** "1X", "12", "X2", "1 X", "X 2"

**Da verificare:** Ordine degli esiti e mapping 1X/12/X2.

---

## Riepilogo codici Lista

| Codice | Mercato        | Chiave output   |
|--------|----------------|------------------|
| 3      | 1X2            | h2h              |
| 7989   | Over/Under     | totals_25, totals_15 |
| 8      | Handicap       | spreads          |
| 18     | Gol/No Gol     | btts             |
| 15,16,17 | Doppia chance | double_chance    |

---

## Come verificare

1. **debug-quotes-match con raw=1** – mostra `matchRequested` con outcomes per la partita.
2. **Estendere l'endpoint** – aggiungere `totals_25`, `spreads`, `btts`, `double_chance` a `matchRequested` per vedere i valori grezzi.
3. **Confrontare con Netwin** – aprire la stessa partita su netwin.it e confrontare Over 2.5, Handicap, Gol/No Gol, Doppia chance.

---

## File da modificare

- `lib/quotes/providers/directBookmakerFetcher.ts` – `scommesseToStakes`, `extractTotalsFromStakes`, `extractHandicapFromStakes`, `extractBttsFromStakes`, `extractDoubleChanceFromStakes`
- `docs/NETWIN-SPORTS-MARKETS.md` – codici mercati
