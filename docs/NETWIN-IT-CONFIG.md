# Configurazione Netwin_IT (IT-002)

**Scheda cliente:** `data/clientProfiles.json`

Tutte le specifiche (URL, bonus, API) sono memorizzate nella scheda cliente e applicate con lo script.

## Applicazione

Sul server, dopo il deploy:

```bash
cd /var/www/pronostici-sito
node scripts/apply-netwin-config.mjs
pm2 restart pronostici
```

Lo script legge da `data/clientProfiles.json` e applica a `data/bookmakers.json`.

## Test integrazione API

Per verificare che tutte le API quote funzionino (The Odds API + Direct/Netwin):

```bash
# Da browser o curl sul sito di test
curl "https://tuo-sito-test/api/debug-all-apis"
# Con lega specifica (es. 135 = Serie A)
curl "https://tuo-sito-test/api/debug-all-apis?leagueId=135"
```

Risposta: `ok: true` se tutto ok. `report.direct` mostra per ogni API diretta: `quotesCount`, `sampleTeams`, eventuali errori.

## Modifica configurazione

Modificare `data/clientProfiles.json` → chiave `IT-002`. Poi rieseguire lo script.

## Configurazione manuale (Admin)

In **Admin → Siti di scommesse → Netwin_IT**:

1. **Url di base**: `https://m.netwin.it/redirect.aspx?mid=26&sid=6165&cid=&pid=&affid=3281`
2. **Link bottone quote**: stesso URL
3. **CountryConfig IT** → aggiungi link per ogni use case (scommetti, registrati, bonus, ecc.) con lo stesso URL
4. **Logo**: `/logos/netwin-it.png` (o Carica logo)
5. **Favicon**: `/favicons/netwin-it.png` (o Carica favicon)
