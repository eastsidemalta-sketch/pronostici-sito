# Debug: perché Betboom non trova i match

Guida per capire perché l’integrazione Betboom non restituisce partite.

---

## Flusso attuale

1. **Match page** (es. Brasileirão) → `getMultiMarketQuotes(sportKey, { leagueId: 71 })`
2. **Betboom** ha `apiLeagueMapping: { "71": "0" }` → invia `category_ids: [0]` all’API
3. **API Betboom** `get_by_category_ids` con `category_ids: [0]` → risposta (vuota o con dati)
4. **directBookmakerFetcher** estrae `matches`, `teams.home_team.name`, `stakes` (Winner, outcome 1/X/2)

---

## Passi di debug

### 1. Verificare la risposta raw con `category_ids: [0]` (config attuale)

```
GET /api/debug-betboom-feed
```

- `matchesCount: 0` → `category_ids: [0]` non è valido, Betboom non ha quella categoria
- `matchesCount > 0` → l’API risponde, il problema è nel parsing (eventsPath, stakes, ecc.)

---

### 2. Provare `category_ids` vuoto (tutte le categorie)

```
GET /api/debug-betboom-feed?categoryIds=all
```

- `matchesCount > 0` → Betboom ha partite, ma non per la categoria 0
- **Soluzione**: rimuovere `apiLeagueMapping` per la 71 così da usare `category_ids: []` e ottenere tutte le partite

---

### 3. Elencare le categorie football disponibili

```
GET /api/debug-betboom-categories
GET /api/debug-betboom-categories?sportIds=2
```

- Controllare se esiste una categoria per Brasileirão / Campeonato Brasileiro
- Se sì: usare il suo `id` in `apiLeagueMapping["71"]`
- Se no: Betboom non espone Brasileirão; usare `categoryIds=all` per avere almeno altre partite

---

### 4. Testare con una categoria specifica

Se dalle categorie trovi un `id` valido (es. 123):

```
GET /api/debug-betboom-feed?categoryIds=123
```

---

### 5. Simulare il flusso completo

```
GET /api/debug-betboom-feed?simulate=1
```

Mostra:
- Risposta raw dell’API
- Output di `getMultiMarketQuotes` (quante quote 1X2 vengono estratte)

Se `matchesCount > 0` ma `simulatePipeline.h2hCount === 0` → problema nel parsing (path, stakes, outcome_id).

---

## Possibili cause

| Sintomo | Causa probabile | Azione |
|--------|----------------|--------|
| `matchesCount: 0` con `categoryIds=0` | Categoria 0 non esiste | Provare `?categoryIds=all` |
| `matchesCount > 0` con `categoryIds=all` | Mapping 71→0 sbagliato | Rimuovere `apiLeagueMapping["71"]` |
| `winnerStakesCount: 0` | Struttura `stakes` diversa | Verificare `firstStakeSample` e adattare il mapping |
| `firstMatchTeams: { home: "(non trovato)" }` | Path `teams` diverso | Verificare `firstMatchKeys` e aggiornare `homeTeam`/`awayTeam` nel mapping |
| HTTP 401/403 | API key o partner errato | Controllare `BETBOOM_API_KEY` e `x-partner` |

---

## Modifiche suggerite

### Se `categoryIds=all` restituisce partite

In `data/clientProfiles.json`, rimuovere il mapping per la 71:

```json
"apiLeagueMapping": {}
```

oppure rimuovere la chiave `"71"` se ci sono altri mapping.

### Se esiste una categoria Brasileirão

Aggiornare il mapping con l’`id` corretto:

```json
"apiLeagueMapping": {
  "71": "123"
}
```

(sostituire `123` con l’id reale dalla risposta di `/api/debug-betboom-categories`).
