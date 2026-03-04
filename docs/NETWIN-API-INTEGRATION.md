# Integrazione API Netwin

## Endpoint

```
GET https://b2b.egamingsolutionsrl.it/WSSportFeed/get_eventi_psqf?type=FULL&system_code=PLAYSIGNAL&isLive=0&codiceSito=WINBET
```

**Parametri:** type, system_code, isLive, codiceSito (v_sport, v_scommesse opzionali)

## Parametri richiesti

| Parametro    | Descrizione                    | Esempio |
|-------------|--------------------------------|---------|
| system_code | Codice identificativo sistema | *(da Netwin)* |
| type        | `FULL` (completo) o `DELTA` (incrementale) | `FULL` |
| isLive      | `0` = prematch, `1` = live     | `0` |
| v_sport     | ID sport separati da `-` (calcio = ?) | *(da Netwin)* |
| v_scommesse | ID AAMS scommesse 1X2 separati da `-` | *(da Netwin)* |
| codiceSito  | Codice sito per quote custom   | *(da Netwin)* |

## Quote personalizzate

Nei principali campionati il feed include quote personalizzate per il mercato 1X2. Il sistema le preferisce alle quote standard quando presenti (odds1Personalized, oddsXPersonalized, odds2Personalized nel mapping).

## Limiti

- **Prima chiamata**: sempre `type=FULL`
- **Chiamate successive**: `type=DELTA` ogni 5 secondi
- **FULL periodico**: ogni 2–3 ore

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
