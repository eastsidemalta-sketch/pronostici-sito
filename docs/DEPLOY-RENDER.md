# Deploy su Render

Guida per mettere online il sito su [Render.com](https://render.com).

---

## Prerequisiti

- Account [Render](https://render.com) (gratuito)
- Repository GitHub con il codice
- Chiavi API: API-Football, The Odds API

---

## 1. Connetti il repository

1. Vai su [dashboard.render.com](https://dashboard.render.com)
2. **New** → **Web Service**
3. Connetti GitHub e seleziona il repo `pronostici-sito`
4. Render rileverà `render.yaml` (Blueprint) e configurerà il servizio

---

## 2. Configura le variabili d'ambiente

Nella pagina del servizio → **Environment** → aggiungi:

| Variabile | Obbligatorio | Descrizione |
|-----------|--------------|-------------|
| `NEXT_PUBLIC_SITE_URL` | Sì | URL finale, es. `https://pronostici-sito.onrender.com` |
| `API_FOOTBALL_KEY` | Sì | Chiave da [api-football.com](https://www.api-football.com/) |
| `THE_ODDS_API_KEY` | Sì | Chiave da [the-odds-api.com](https://the-odds-api.com/) |
| `ADMIN_EMAIL` | Sì | Email per accesso admin |
| `ADMIN_PASSWORD` | Sì | Password admin |
| `ADMIN_SECRET` | Sì | Secret per sessione admin |
| `CRON_SECRET` | Consigliato | Generato da Render; usato per proteggere il cron |
| `REDIS_URL` | No | Opzionale; senza Redis usa fallback file |

**Nota:** Dopo il primo deploy, copia l’URL assegnato (es. `https://pronostici-sito-xxxx.onrender.com`) e aggiorna `NEXT_PUBLIC_SITE_URL`.

---

## 3. Redis (opzionale ma consigliato)

Senza Redis il sito usa file locale per live matches. **Attenzione:** su Render il filesystem è effimero: i dati in file si perdono ad ogni deploy/restart. Per i live matches in produzione è consigliato Redis.

Per abilitare Redis:

1. **New** → **Redis**
2. Scegli piano Free (25 MB)
3. Dopo la creazione, copia **Internal Connection String**
4. Incollalo in `REDIS_URL` nel Web Service

---

## 4. Cron per live matches

Il polling live va chiamato ogni 2 minuti. Opzioni:

### A) Cron-job.org (gratuito)

1. Vai su [cron-job.org](https://cron-job.org)
2. Crea un job:
   - **URL:** `https://pronostici-sito-xxxx.onrender.com/api/cron/live-matches`
   - **Schedule:** ogni 2 minuti
   - **Request headers:** `Authorization: Bearer <CRON_SECRET>`

### B) Render Cron Jobs (a pagamento)

Con piano a pagamento puoi usare i Cron Jobs nativi di Render.

---

## 5. Build e avvio

- **Build:** `npm ci && npm run build`
- **Start:** `npm run start`

Render esegue il build ad ogni push su `main` (o sul branch configurato).

---

## 6. Note importanti

### Free tier

- Il servizio va in **sleep** dopo ~15 min di inattività
- Il primo accesso dopo lo sleep può richiedere 30–60 secondi
- Per evitare il sleep: piano a pagamento o servizio esterno che fa ping periodici

### Cold start

Per ridurre i cold start puoi usare [UptimeRobot](https://uptimerobot.com) per fare ping ogni 5 minuti (gratuito).

### Domini custom

In **Settings** → **Custom Domain** puoi collegare un dominio tuo (es. `playsignal.io`).

---

## Checklist finale

- [ ] Repo connesso a Render
- [ ] Variabili d’ambiente impostate
- [ ] `NEXT_PUBLIC_SITE_URL` aggiornato con l’URL Render
- [ ] Cron configurato per `/api/cron/live-matches`
- [ ] (Opzionale) Redis creato e `REDIS_URL` impostato
