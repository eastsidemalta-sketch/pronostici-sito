# Netwin: nessun match con le quote – Diagnostica e soluzioni

## Flusso del matching

1. **API Football** fornisce le partite con nomi squadra (es. "Inter Milan", "Juventus FC")
2. **Netwin** restituisce quote con nomi squadra dal feed (es. "Inter", "Juventus", "FC Internazionale")
3. **matchTeamNames** confronta i nomi usando:
   - `teamAliases.json` (alias generici)
   - `teamAliasesByProvider.json` (mapping per provider, attualmente vuoto per `netwinit`)
   - Regole di fallback: uguaglianza, `includes`, primo token

## Cause possibili (in ordine di probabilità)

### 1. Cache Netwin vuota o scaduta

La cache FULL va fatta **al massimo ogni 3 ore**. Se non è mai riuscita o è scaduta, le quote Netwin sono vuote.

**Verifica:**
```
GET /api/debug-netwin-cache?showMatches=1
```

- `hasCache: false` → cache vuota, serve una FULL
- `h2hCount: 0` → nessuna partita in cache
- `matchSample` → campione di partite con i nomi usati da Netwin

**FULL OK ma count 0:**
- HTTP 200 e parse OK, ma 0 partite estratte. Possibili cause:
  1. **0 eventi** – struttura risposta diversa (root/Manifestazione non trovati). Controlla `data/.netwin-full-debug.json` (creato automaticamente) e i log PM2: `[Netwin] FULL 0 eventi. root=...`
  2. **Eventi presenti ma 0 partite** – nessun mercato 1X2 (Lista 3) trovato, o squadre/quote mancanti. Verifica `data/.netwin-lista-codes.json` per i codici Lista nel feed.
- Il report `/api/debug-api-calls` mostra ora `0 (X eventi)` quando disponibile: X=0 → problema parsing; X>0 → problema estrazione quote/squadre.

**Possibili errori FULL:**
- `hash_lock` / "FULL già in corso" → un’altra richiesta FULL è attiva
- `isLive can be 0 or 1` → parametro `isLive` non valido
- HTTP 4xx/5xx → problema di autenticazione o endpoint

### 2. Nomi squadra diversi

Netwin può usare nomi diversi da API Football:
- "FC Internazionale" vs "Inter Milan"
- "SSC Napoli" vs "Napoli"
- "Torino FC" vs "Torino"

**Verifica:**
```
GET /api/debug-home-quotes?country=IT
```

Controlla:
- `netwinRawCount` → quante partite ha Netwin
- `netwinSample` → esempi di coppie home/away da Netwin
- `matchTest` → confronto tra prima partita API Football e quote Netwin:
  - `firstFixtureHome`, `firstFixtureAway` (API Football)
  - `sampleNetwinHome`, `sampleNetwinAway` (Netwin)
  - `netwinMatchCount` → 0 se il matching fallisce

### 3. Leghe non allineate

`codiceSito=WINBET` può limitare le competizioni nel feed. Se Netwin non espone Serie A o le stesse leghe di API Football, non ci saranno match.

**Verifica:**
```
GET /api/debug-netwin-feed?explore=1
```

Controlla `explore.manifestazioni` per vedere quali competizioni sono presenti (es. "ITALIA - I DIVISIONE").

### 4. teamAliasesByProvider vuoto

`data/teamAliasesByProvider.json` ha `netwinit: {}`. Se Netwin usa nomi molto diversi, serve un mapping esplicito.

**Esempio:**
```json
{
  "netwinit": {
    "Inter Milan": "FC Internazionale",
    "Juventus FC": "Juventus",
    "SSC Napoli": "Napoli"
  }
}
```

Formato: `apiFootballName` → `nome usato da Netwin` (o array di varianti).

---

## Passi di diagnostica

### 1. Controllare la cache
```
https://tuo-dominio/api/debug-netwin-cache?showMatches=1
```

### 2. Controllare il flusso home
```
https://tuo-dominio/api/debug-home-quotes?country=IT
```

### 3. Controllare quote grezze per una partita specifica
```
https://tuo-dominio/api/debug-quotes-match?homeTeam=Inter%20Milan&awayTeam=Juventus%20FC&leagueId=135&country=IT&raw=1
```

Con `raw=1` vedi le quote grezze di ogni bookmaker prima del filtro per partita. Se Netwin ha `h2hCount > 0` ma non compare nelle quote filtrate, il problema è il matching dei nomi.

### 4. Forzare FULL (se la cache è vuota)
```
?forceFull=1
```
Esempio: `/api/debug-quotes-match?homeTeam=...&awayTeam=...&raw=1&forceFull=1`

Attenzione: la FULL è limitata a 1 ogni 3 ore. Se fallisce con `hash_lock`, attendere e riprovare.

---

## Soluzioni

### Se la cache è vuota
- Verificare che `CRON_SECRET` sia impostato (warm cache al deploy)
- Controllare i log: `[Netwin] FULL risposta: HTTP ...`, `[Netwin] FULL OK: N partite`
- File `.netwin-full.log` in `data/` per l’ultimo tentativo FULL

### Se i nomi non matchano
1. Aggiungere alias in `data/teamAliases.json` (formato: `canonical` → `[varianti]`)
2. Oppure in `data/teamAliasesByProvider.json` per Netwin:
   ```json
   {
     "netwinit": {
       "Inter Milan": ["FC Internazionale", "Internazionale", "Inter"],
       "SSC Napoli": "Napoli"
     }
   }
   ```
3. Usare la pagina **Team Aliases by Provider** in admin (`/ad2min3k/team-aliases-by-provider`) per generare suggerimenti dal matching report

### Se le leghe non coincidono
- Contattare Netwin per verificare quali competizioni sono incluse con `codiceSito=WINBET`
- Eventualmente richiedere un `codiceSito` diverso con più leghe

---

## Riferimenti

- `lib/teamAliases.ts` – logica di matching
- `lib/teamAliasesByProvider.ts` – mapping per provider
- `lib/quotes/providers/netwinCache.ts` – cache e limiti FULL
- `app/api/debug-home-quotes/route.ts` – debug quote home
- `app/api/debug-quotes-match/route.ts` – debug quote per partita
