# Raccomandazioni: quali quote importare per i 20 bookmaker

Guida per configurare i bookmaker diretti e decidere quali mercati/quote importare.

---

## 1. Situazione attuale

Il fetcher diretto (`fetchDirectBookmakerQuotes`) supporta **solo il mercato 1X2 (h2h)**:
- `odds1` (casa)
- `oddsX` (pareggio)
- `odds2` (trasferta)

Le quote vanno mappate in `apiMappingConfig` con i percorsi JSON corretti per ogni API bookmaker.

---

## 2. Priorità consigliata per mercato

| Priorità | Mercato | Chiave | Uso nell'app | Note |
|----------|---------|--------|--------------|------|
| **1 – Obbligatorio** | Esito 1X2 | `h2h` | Home, pronostici, comparazione quote, calcolo odds-based | Supportato ora. Base per tutto. |
| **2 – Alta** | Doppia Chance | `double_chance` | Tab "Quote Principali" | 1X, 12, X2. Molto usato. |
| **3 – Alta** | Over/Under 2.5 | `totals_25` | Tab "Scommesse sul risultato" | Mercato più popolare sui gol. |
| **4 – Media** | Entrambe segnano | `btts` | Tab "Scommesse sul risultato" | Sì/No. Molto richiesto. |
| **5 – Media** | Over/Under 1.5 | `totals_15` | Tab "Scommesse sul risultato" | Alternativa a O/U 2.5. |
| **6 – Media** | Draw No Bet | `draw_no_bet` | Tab "Quote Principali" | 1 e 2 senza pareggio. |
| **7 – Bassa** | Esito 1° tempo | `h2h_3_way_h1` | Tab "Scommesse Extra" | 1X2 primo tempo. |
| **8 – Opzionale** | Handicap | `spreads` | Tab "Handicap" | Più per basket. |

---

## 3. Configurazione consigliata per i 20 bookmaker

### Per i bookmaker diretti (oggi)

1. **Configurare sempre h2h (1X2)**  
   È l’unico mercato supportato dal direct fetcher e serve per:
   - Pronostici sulla home
   - Comparazione quote
   - Calcolo percentuali da odds

2. **Per ogni bookmaker**  
   Verificare che l’API esponga:
   - `homeTeam` / `awayTeam` (o equivalenti)
   - `odds1`, `oddsX`, `odds2` (o percorsi equivalenti)

3. **Campo `apiConfig.markets`**  
   Per i direct bookmaker è usato solo per documentazione.  
   Consigliato: `["h2h"]` (o `["h2h", "double_chance", "totals_25", "btts"]` se intendi estendere in futuro).

---

## 4. Estensione futura per altri mercati

Per supportare `double_chance`, `totals`, `btts`, ecc. con i direct bookmaker servirebbe:

1. **Estendere `apiMappingConfig`** con percorsi aggiuntivi, ad esempio:
   ```ts
   // Esempio per double_chance
   odds1X?: string;   // 1X
   odds12?: string;   // 12
   oddsX2?: string;   // X2
   
   // Esempio per totals
   oddsOver25?: string;
   oddsUnder25?: string;
   
   // Esempio per btts
   oddsBttsYes?: string;
   oddsBttsNo?: string;
   ```

2. **Estendere `fetchDirectBookmakerQuotes`**  
   Per popolare `merged.double_chance`, `merged.totals_25`, `merged.btts`, ecc. oltre a `merged.h2h`.

3. **Configurazione per bookmaker**  
   Ogni bookmaker può avere mercati diversi in base a cosa espone l’API.

---

## 5. Riepilogo pratico

| Cosa fare ora | Dettaglio |
|--------------|-----------|
| **Configurare tutti i 20** | Solo mercato **h2h (1X2)** |
| **Mapping** | `homeTeam`, `awayTeam`, `odds1`, `oddsX`, `odds2` (o percorsi equivalenti) |
| **`apiConfig.markets`** | `["h2h"]` |
| **Mercati aggiuntivi** | Pianificare quando estendere il fetcher per double_chance, totals, btts |

---

## 6. Ordine di implementazione se estendi i mercati

1. **h2h** – già presente
2. **double_chance** – 1X, 12, X2
3. **totals_25** – Over/Under 2.5
4. **btts** – Entrambe segnano
5. **totals_15** – Over/Under 1.5
6. **draw_no_bet**
7. **h2h_3_way_h1** – Esito 1° tempo

---

*Documento per la configurazione dei 20 bookmaker diretti.*
