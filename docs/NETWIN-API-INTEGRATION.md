# Integrazione API Netwin

## Endpoint

```
GET https://domain/WSSport/get_eventi_psqf?type=full&system_code=...&isLive=0&codiceSito=...
```

**Parametri:** type, system_code, isLive, codiceSito, v_sport, v_scommesse

Vedi [NETWIN-SPORTS-MARKETS.md](./NETWIN-SPORTS-MARKETS.md) per la struttura di sport e mercati.

## Parametri richiesti

| Parametro    | Descrizione                    | Esempio |
|-------------|--------------------------------|---------|
| system_code | Codice identificativo sistema | *(da Netwin)* |
| type        | `full` (completo) o `delta` (incrementale) | `full` |
| isLive      | `0` = prematch, `1` = live     | `0` |
| v_sport     | ID sport separati da `-` (calcio = ?) | *(da Netwin)* |
| v_scommesse | ID AAMS scommesse 1X2 separati da `-` | *(da Netwin)* |
| codiceSito  | Codice sito per quote custom   | *(da Netwin)* |

## Quote personalizzate

Nei principali campionati il feed include quote personalizzate per il mercato 1X2. Il sistema le preferisce alle quote standard quando presenti (odds1Personalized, oddsXPersonalized, odds2Personalized nel mapping).

## Usage Limits

| Modalità | Endpoint | Descrizione |
|----------|----------|-------------|
| **FULL** | `?type=full&…` | Dati completi. Prima chiamata obbligatoria. Consentito ogni 2–3 ore. |
| **DELTA** | `?type=delta&…` | Solo modifiche. Consentito ogni 5 secondi dopo la prima chiamata. |

- **First call**: sempre `type=full` (stabilisce connessione)
- **DELTA calls**: `type=delta`, max 1 ogni 5 secondi
- **FULL call**: ogni 2–3 ore per aggiornamento completo

## Implementazione (IT-0002)

- **Cache in-memory** (`lib/quotes/providers/netwinCache.ts`): dati FULL con TTL 2.5 ore
- **Strategia**:
  - Prima chiamata / cache scaduta → `type=full` (stabilisce connessione)
  - Chiamate successive → `type=delta`, max 1 ogni 5 secondi (rate limit)
  - Se DELTA non consentita (troppo recente) → ritorna cache senza chiamata API
- **Merge DELTA**: gli aggiornamenti DELTA vengono mergati sulla base FULL per (homeTeam, awayTeam)
- **Refresh FULL**: avviene automaticamente alla prima richiesta dopo 2.5h (cron o utente)

## Configurazione necessaria (da Netwin)

1. **Dominio** dell’endpoint (es. `api.netwin.it`)
2. **system_code**
3. **codiceSito**
4. **v_sport** – ID calcio
5. **v_scommesse** – ID AAMS per 1X2
6. **Whitelist IP** – IP del server whitelistato ✓

## Esempio risposta JSON

Per definire il mapping (homeTeam, awayTeam, odds1, oddsX, odds2) serve un **esempio di risposta JSON** dell’endpoint. Inviare un sample per configurare `apiMappingConfig`.

## Prossimi passi

1. Ottenere da Netwin: dominio, system_code, codiceSito, v_sport, v_scommesse
2. IP server whitelistato ✓
3. Ottenere un esempio di risposta JSON
4. Configurare il bookmaker in `data/bookmakers.json` con `apiProvider: "direct"` e il mapping
