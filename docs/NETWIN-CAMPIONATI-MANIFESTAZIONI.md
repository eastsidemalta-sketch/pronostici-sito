# Netwin: campionati e manifestazioni

Come Netwin organizza le competizioni (campionati) nel feed FULL/DELTA.

## Struttura gerarchica Exalogic

```
Exalogic
└── Manifestazione[]     ← campionato/competizione (es. "ITALIA - I DIVISIONE")
    └── Avvenimento[]   ← partita (squadraCasa vs squadraOspite)
        └── Scommessa[] ← mercato (1X2, O/U, Handicap, ecc.)
            └── Esito[] ← quota (1, X, 2)
```

Il campo **manifestazione** (da `Manifestazione.descr`) identifica il campionato. Esempi:
- `ITALIA - I DIVISIONE` → Serie A
- `ITALIA - II DIVISIONE` → Serie B
- `GERMANIA - BUNDESLIGA`
- `INGHILTERRA - PREMIER LEAGUE`
- `CHAMPIONS LEAGUE - UEFA`

## Come ottenere la lista campionati

### 1. CSV da cache (evento + manifestazione)

Se la cache ha dati (test fa FULL/DELTA):

```bash
curl "https://test.playsignal.io/api/debug-netwin-cache?showMatches=all&format=table" -o netwin-matches.csv
```

Colonne: `#,evento,manifestazione`. La colonna `manifestazione` indica il campionato di ogni partita.

### 2. Esplora feed (lista manifestazioni uniche)

```bash
curl "https://test.playsignal.io/api/debug-netwin-feed?explore=1"
```

Risposta JSON con `explore.manifestazioni`: elenco di tutte le competizioni presenti nel feed.

### 3. Backup FULL sul server

Se esiste `.netwin-cache-backup.json` (creato quando una FULL ha partite):

```bash
scp root@server:/var/www/pronostici-sito-test/data/.netwin-cache-backup.json ./netwin-full-sample.json
```

Il file contiene `{ data: { h2h: [...], spreads: [...], ... }, timestamp }`. Ogni entry in `h2h` può avere `manifestazione` se estratta dalla FULL.

### 4. Mapping leagueId → manifestazione

`data/netwinLeagueMapping.json` mappa i leagueId API Football ai pattern da cercare in manifestazione:

| leagueId | Campionato   | Pattern manifestazione                    |
|----------|--------------|-------------------------------------------|
| 135      | Serie A      | ITALIA, I DIVISIONE, SERIE A             |
| 136      | Serie B      | ITALIA, II DIVISIONE, SERIE B             |
| 78       | Bundesliga   | GERMANIA, BUNDESLIGA                      |
| 39       | Premier      | INGHILTERRA, PREMIER, ENGLAND             |
| 2        | Champions    | CHAMPIONS, UEFA, CHAMPIONS LEAGUE         |
| ...      | ...          | ...                                       |

## Sample minimo struttura Exalogic (XML/JSON)

```json
{
  "Exalogic": [
    {
      "Manifestazione": [
        {
          "descr": "ITALIA - I DIVISIONE",
          "cod": "123",
          "Avvenimento": [
            {
              "descr": "Inter - Milan",
              "squadraCasa": "Inter",
              "squadraOspite": "Milan",
              "Scommessa": [
                {
                  "Lista": 3,
                  "Esito": [
                    { "descr": "1", "quota": 210, "QuotePersonalizzate": 215 },
                    { "descr": "X", "quota": 320, "QuotePersonalizzate": 325 },
                    { "descr": "2", "quota": 350, "QuotePersonalizzate": 355 }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

- `Manifestazione.descr` = nome campionato
- `Avvenimento.squadraCasa` / `squadraOspite` = squadre (o `descr` con "Home - Away")
- Quote in centesimi (210 = 2.10)
