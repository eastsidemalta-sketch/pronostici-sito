# Flusso Deploy – cosa viene preservato e cosa no

## Riepilogo

| Dato | Preservato? | Come |
|------|-------------|-----|
| **Cache Netwin** (.netwin-cache.json) | ✅ Sì | Sync standalone→data + backup prima di rm .next |
| **Bookmakers** (config admin) | ✅ Sì | Sync standalone→data, commit, pull |
| **LeaguesConfig, HomeMenu, Countries** | ✅ Sì | Come bookmakers |
| **teamAliasesByProvider** | ❌ No (voluto) | Viene dal repo, non dalla sync |
| **.env.local** | ✅ Sì | Copiato da progetto o prod |

## Ordine operazioni (deploy-test-prod.sh)

1. **Sync** – Copia `.next/standalone/data/*` → `data/` (escluso teamAliasesByProvider)
2. **Git add/commit** – Salva modifiche admin nel repo
3. **Git pull** – Aggiorna codice
4. **Backup cache** – Salva `.netwin-cache.json` in `/tmp` se esiste e non è vuoto
5. **rm .next** – Elimina build precedente
6. **Build** – `npm ci` + `npm run build`
7. **Copy** – public, static, chunks, data → standalone
8. **remove/add Netwin** – Rimuove IT-002, aggiunge IT-0002 se manca
9. **Restore cache** – Se standalone non ha cache valida, ripristina dal backup
10. **PM2 restart** – Riavvio app
11. **Warm cache** – Chiamata debug-home per pre-popolare

## Se perdi quote dopo il deploy

1. **Cache vuota** – La FULL Netwin non è ancora partita. Attendi o forza:  
   `GET /api/debug-quotes-match?homeTeam=Inter&awayTeam=Juventus&forceFull=1`
2. **hash_lock** – Test e prod usano lo stesso system_code: una FULL blocca l’altra. **Soluzione attuale:** produzione ha `NETWIN_DISABLE_FULL=1` (nessuna chiamata Netwin, solo cache; solo test fa FULL/DELTA). Alternativa: chiedi a Netwin un system_code separato per test.
3. **Bookmakers corrotti** – Controlla `data/bookmakers.json` e `.next/standalone/data/bookmakers.json` dopo il deploy.

## Link utili

- **Report chiamate API (test):** https://test.playsignal.io/api/debug-api-calls?format=html&hours=168
