# Architettura cache home page (pool globale)

## Panoramica

Un solo fetch API Football per tutte le leghe → tutti i paesi filtrano dallo stesso pool.

## Flusso

```
┌─────────────────────────────────────────────────────────┐
│  home:fixtures:global                                    │
│  Union leghe (IT ∪ BR ∪ ...) - un solo fetch            │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ IT       │   │ BR       │   │ PT       │
    │ filtra   │   │ filtra   │   │ filtra   │
    │ leghe IT │   │ leghe BR │   │ leghe PT │
    └──────────┘   └──────────┘   └──────────┘
```

## Config (`data/leaguesConfig.json`)

- **byCountry**: leghe per paese (ordine menu)
- **cacheFallback**: quando paese X ha cache vuota, da dove attingere
  ```json
  "cacheFallback": {
    "BR": ["IT"],
    "PT": ["IT", "ES"]
  }
  ```
- **globalLeagueIds** (opzionale): se presente, usato per il fetch. Altrimenti derivato da union di byCountry per mercati attivi.

## Operazioni

### Aggiungere una lega

1. Aggiungi a `leaguesConfig.byCountry.{country}.leagueIds` (o calcio.leagueIds)
2. Se la lega non è in nessun paese attivo, aggiungi a `globalLeagueIds` (o a un paese che la userà)
3. Se usi `homeMenu.json` allSportsConfig, aggiungi anche lì per il paese

### Aggiungere un paese

1. Aggiungi `leaguesConfig.byCountry.{code}` con leagueIds
2. Aggiungi `homeMenu.json` con allSportsConfig.leagueIds e sportKeys
3. (Opzionale) Aggiungi `cacheFallback.{code}` se vuoi fallback da altri paesi
4. Attiva il mercato in `lib/markets/config.ts` (active: true)

### Nessuna operazione mirata

- Il pool globale si aggiorna automaticamente (union dei paesi attivi)
- Il fallback è config-driven, non hardcoded

## Cache keys

| Key | Contenuto | TTL |
|-----|-----------|-----|
| home:fixtures:global | Pool globale partite | 90s |
| home:fixtures:lastGood | Fallback globale (API vuota) | 6h |
| home:data:{country} | Dati per paese (filtrati + quote + predictions) | 90s |
| home:data:lastGood:{country} | Fallback per paese | 6h |

## Invalidate

- `invalidateHomeCache("*")` → invalida tutto (globale + paesi)
- `invalidateHomeCache("BR")` → invalida solo cache BR (globale resta)
