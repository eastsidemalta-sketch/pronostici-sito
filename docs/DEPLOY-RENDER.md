# Deploy su Render con PlaySignal.io

Guida per mettere online il sito su Render con dominio Namecheap, email e ambiente di staging.

---

## 1. Struttura su Render

Crea **due Web Service** separati:

| Servizio | Branch Git | URL | Uso |
|----------|------------|-----|-----|
| **Produzione** | `main` | playsignal.io | Sito live |
| **Staging** | `staging` o `develop` | playsignal-staging.onrender.com | Test prima del go-live |

- **Staging**: puoi metterlo in pausa quando non serve (Render → Dashboard → servizio → Suspend).
- **Produzione**: sempre attivo.

---

## 2. Setup su Render

### 2.1 Connessione a GitHub

1. Vai su [Render Dashboard](https://dashboard.render.com)
2. **New** → **Web Service**
3. Connetti il repo GitHub `pronostici-sito`
4. Configura:
   - **Name**: `playsignal` (produzione) o `playsignal-staging` (staging)
   - **Branch**: `main` (prod) o `staging` (staging)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (staging) / Starter (prod se serve più risorse)

### 2.2 Variabili d’ambiente

Imposta le stesse variabili per entrambi i servizi (o diverse per staging se serve):

- `NODE_ENV=production`
- Variabili API (API-Football, The Odds API, ecc.) – usa i valori reali in prod, eventualmente chiavi di test in staging.

---

## 3. Dominio PlaySignal.io (Namecheap)

### 3.1 Produzione (playsignal.io)

1. Su Render: **Settings** del servizio produzione → **Custom Domains** → **Add Custom Domain** → `playsignal.io` e `www.playsignal.io`
2. Render ti darà un CNAME (es. `playsignal-xxx.onrender.com`) o record A.
3. Su Namecheap:
   - **Domain List** → PlaySignal.io → **Manage** → **Advanced DNS**
   - Aggiungi:
     - **CNAME** per `www` → `playsignal-xxx.onrender.com` (o il valore indicato da Render)
     - **A Record** per `@` → IP fornito da Render (se richiesto)
   - Rimuovi eventuali record di default che confliggono.

### 3.2 Staging (opzionale)

- Puoi usare solo l’URL Render: `playsignal-staging.onrender.com`
- Oppure un sottodominio: `staging.playsignal.io` → CNAME verso il servizio staging su Render.

---

## 4. Email con dominio @playsignal.io

Render **non gestisce email**. Per usare `@playsignal.io` serve un servizio esterno.

### Opzioni

| Servizio | Costo | Note |
|----------|-------|------|
| **Namecheap Private Email** | ~€1/mese | Integrato con Namecheap |
| **ImprovMX** | Gratis (fino a 5 indirizzi) | Solo inoltro, niente casella |
| **Zoho Mail** | Gratis (fino a 5 utenti) | Casella completa |
| **Google Workspace** | ~€6/utente/mese | Gmail con dominio custom |

### Setup MX su Namecheap

1. Scegli il provider email.
2. Su Namecheap → **Advanced DNS** → **Mail Settings**:
   - **Custom MX** (se usi provider esterno)
   - Inserisci i record MX forniti dal provider (es. `mx1.improvmx.com`, `mx2.improvmx.com`, ecc.).

---

## 5. File render.yaml (opzionale)

Nella root del progetto c’è un `render.yaml` che definisce entrambi i servizi. Puoi usarlo così:

1. Crea il branch `staging`: `git checkout -b staging && git push -u origin staging`
2. Su Render: **New** → **Blueprint** → collega il repo
3. Render creerà i due servizi in automatico

Se preferisci, puoi creare i servizi manualmente seguendo il paragrafo 2.

---

## 6. Workflow di deploy

### Flusso consigliato

```
1. Sviluppo locale
2. Push su branch `staging`
3. Render fa deploy automatico su staging
4. Test su playsignal-staging.onrender.com
5. Se tutto ok → merge su `main`
6. Render fa deploy automatico su produzione (playsignal.io)
7. Metti in pausa il servizio staging per risparmiare
```

### Comandi Git

```bash
# Lavori su staging
git checkout staging
git add .
git commit -m "Nuova feature"
git push origin staging

# Dopo i test, merge in produzione
git checkout main
git merge staging
git push origin main
```

### Pausa del servizio staging

- Render Dashboard → **playsignal-staging** → **Manual Deploy** → **Suspend**
- Per riattivarlo: **Resume** (il primo avvio può richiedere qualche minuto).

---

## 7. Checklist pre-deploy

- [ ] Variabili d’ambiente configurate (API keys, ecc.)
- [ ] `next.config.js` / `next.config.ts` ok per produzione
- [ ] Build locale: `npm run build` senza errori
- [ ] Dominio playsignal.io puntato correttamente
- [ ] SSL attivo (Render lo gestisce in automatico)
- [ ] Redirect `www` → root (o viceversa) se necessario

---

## 8. Costi indicativi Render

- **Free**: 750 ore/mese, servizio si “addormenta” dopo inattività
- **Starter** (~7$/mese): sempre attivo, più adatto alla produzione
- Suggerimento: Free per staging (da mettere in pausa quando non serve), Starter per produzione.
