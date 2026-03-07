# Netwin – Tabella chiamate API

Riepilogo di tutte le chiamate all’API Netwin e come verificare cosa sta succedendo.

---

## Endpoint Netwin

| Parametro | Valore | Note |
|-----------|--------|------|
| **URL** | `https://b2b.egamingsolutionsrl.it/WSSportFeed/get_eventi_psqf` | Da `bookmakers.json` (Netwin IT-0002) |
| **Metodo** | GET | |
| **Parametri** | `type`, `system_code`, `isLive`, `codiceSito`, `v_sport`, `v_scommesse` | Vedi `apiRequestConfig` in bookmakers |

---

## Tipi di chiamata

| Tipo | Parametro `type` | Quando viene usata | Frequenza max | Risposta |
|------|------------------|-------------------|---------------|----------|
| **FULL** | `FULL` | Cache vuota o scaduta (>3h) | 1 ogni **3 ore** | Dati completi (tutte le partite e quote) |
| **DELTA** | `delta` | Cache valida, aggiornamento quote | 1 ogni **10 secondi** | Solo quote modificate |

---

## Quando parte una chiamata Netwin

| Trigger | Tipo | Dove |
|---------|------|------|
| Home page (IT) | FULL o DELTA | `getQuotesForFixtures` → `fetchDirectBookmakerQuotes` |
| Pagina partita (IT) | FULL o DELTA | Stesso flusso quote |
| Pronostici-quote (IT) | FULL o DELTA | Stesso flusso quote |
| Matching report (admin) | FULL o DELTA | Stesso flusso quote |
| Debug `/api/debug-netwin-feed` | DELTA (default) | Chiamata manuale |
| Debug `/api/debug-quotes-match?forceFull=1` | FULL | Chiamata manuale |

---

## Logica di scelta FULL vs DELTA

| Condizione | Risultato |
|------------|-----------|
| Nessuna cache in memoria/file | **FULL** |
| Cache più vecchia di 3 ore | **FULL** |
| Cache valida, ultima DELTA < 10 sec fa | Ritorna **cache** (nessuna chiamata) |
| Cache valida, ultima DELTA ≥ 10 sec fa | **DELTA** |

---

## Come verificare cosa sta succedendo

### 1. Stato cache e prossima FULL

```bash
curl -s "https://tuodominio.com/api/debug-netwin-cache"
```

| Campo | Significato |
|-------|-------------|
| `hasCache` | Se c’è una base FULL in cache |
| `lastFullIso` | Data/ora ultima FULL riuscita |
| `nextFullAllowedIso` | Data/ora in cui è consentita la prossima FULL |
| `h2hCount` | Numero partite 1X2 in cache |
| `shouldUseFull` | Se la prossima richiesta sarà FULL |

### 2. Log FULL (successi ed errori)

Sul server:

```bash
node scripts/check-netwin-full-log.mjs --hours 24
```

Oppure nei log PM2:

```bash
pm2 logs pronostici --lines 500 | grep 'Netwin'
pm2 logs pronostici-test --lines 500 | grep 'Netwin'
```

### 3. Forzare FULL o DELTA (debug)

| Endpoint | Effetto |
|----------|---------|
| `GET /api/debug-quotes-match?fixtureId=XXX&forceFull=1` | Forza una FULL (attenzione: limite 1 ogni 3h) |
| `GET /api/debug-quotes-match?fixtureId=XXX&forceDelta=1` | Forza una DELTA |
| `GET /api/debug-netwin-feed?explore=1` | Fetch DELTA + esplora struttura feed (manifestazioni, partite) |

### 4. Campione partite in cache

```bash
curl -s "https://tuodominio.com/api/debug-netwin-cache?showMatches=1"
```

Mostra i nomi squadre usati da Netwin per il matching (utile per `teamAliases.json`).

---

## Errori comuni

| Errore | Causa | Cosa fare |
|--------|-------|-----------|
| `hash_lock` / "richiesta FULL già in corso" | Altra FULL in esecuzione | Attendere qualche minuto |
| `Error isLive` | Parametro/header `isLive` errato | Verificare `isLive=0` in URL e header `X-IsLive: 0` |
| HTTP 401/403 | IP non whitelistato o credenziali errate | Controllare IP server e `system_code` |
| `h2hCount: 0` con DELTA | Cache FULL non ancora popolata | Fare una FULL (o attendere che parta da sola) |
| Nomi squadre non matchano | Netwin usa nomi diversi da API Football | Aggiungere alias in `data/teamAliases.json` |

---

## File rilevanti

| File | Ruolo |
|------|-------|
| `lib/quotes/providers/netwinCache.ts` | Cache FULL, log FULL, merge DELTA |
| `lib/quotes/providers/directBookmakerFetcher.ts` | Chiamate HTTP a Netwin |
| `data/.netwin-cache.json` | Cache su file (generata a runtime) |
| `data/.netwin-cache-backup.json` | Backup FULL con partite (solo quando h2h>0, per prove) |
| `data/.netwin-full.log` | Log tentativi FULL (successi/errori) |
| `scripts/check-netwin-full-log.mjs` | Lettura e analisi del log FULL |
