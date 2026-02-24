# Stima traffico, risorse e consumo API

Stima basata sulla configurazione del progetto (Next.js, API-Football, **20 bookmaker diretti** al posto di The Odds API, live polling).

---

## 1. Chiamate API per tipo di pagina

### Home / Lista partite (home, pronostici-quote, calcio)

| Fonte | Chiamate per load | Cache | Note |
|-------|-------------------|-------|------|
| **API-Football** | | | |
| `getUpcomingFixtures` | ~15–20 | 60s | 1 chiamata per lega (DEFAULT_LEAGUE_IDS ~20) |
| `getPredictionsForFixtures` | N | 60s | 1 chiamata per partita (N = numero partite, tipicamente 30–80) |
| **20 bookmaker diretti** | | | |
| `fetchDirectBookmakerQuotes` | 20 | 60s | 1 richiesta HTTP per bookmaker (API dirette) |
| **Totale API-Football** | **~35–100** | | Dipende da leghe e partite |
| **Totale bookmaker** | **20** | | **Gratuite** – solo banda passante (trascurabile) |

### Pagina dettaglio partita

| Fonte | Chiamate per load | Cache |
|-------|-------------------|-------|
| `getFixtureDetails` | 1 | 30s |
| `getFixturePredictions` | 1 | 60s |
| `getTeamLastFixtures` | 2 | 60s |
| `getMultiMarketQuotes` (20 bookmaker) | 20 | 60s |
| **Totale API-Football** | **~4** | |
| **Totale bookmaker** | **20** | |

### Live polling (backend, non per utente)

| Fonte | Frequenza | Chiamate/giorno |
|-------|-----------|-----------------|
| `fixtures?live=all` (Football) | 30s | ~2.880 |
| Basketball / Rugby | 10s / 30s | variabile |
| Budget mensile default | - | 3.000 (LIVE_API_MONTHLY_BUDGET) |

### API interna `/api/live-matches` (frontend)

- **0** chiamate esterne: legge solo dallo store (Redis)
- Polling client: ogni 30s per utente con pagina aperta

---

## 2. Dimensione pagine e banda

Stime indicative per una tipica build Next.js:

| Tipo | Dimensione (KB) | Note |
|------|-----------------|------|
| HTML pagina home | 50–150 | SSR, dipende da partite |
| JS chunks (first load) | 200–400 | Next.js + React |
| CSS | 50–100 | |
| Immagini (loghi squadre/leghe) | 5–20 per img | ~32×32, da API-Sports CDN |
| **Totale per visita home** | **~400–800 KB** | |
| **Totale per visita dettaglio** | **~500–900 KB** | |

---

## 3. Stima per scaglioni di visite mensili

Assunzioni:
- **Mix visite**: 70% home/liste, 30% dettaglio partita
- **Cache**: Next.js ISR 60s → molte visite servite da cache
- **Cache hit rate**: ~80% a regime (stima conservativa)
- **Partite medie**: 50 partite in lista
- **Leghe**: 18

### Formule

```
Visite effettive (che generano API) = Visite × (1 - cache_hit_rate)
API-Football home ≈ 18 (leghe) + 50 (predictions) = 68 per home load
API-Football dettaglio = 4 per dettaglio load
20 bookmaker diretti: 20 richieste HTTP per load (nessun costo API)
```

---

## 4. Tabella per scaglioni (fino a 1.000.000 visite/mese)

| Visite/mese | Visite "cold" (20%) | API-Football (req) | Bookmaker (req) | Banda (GB) | RAM server | Note |
|-------------|---------------------|--------------------|-----------------|------------|------------|------|
| **1.000** | 200 | ~15.000 | ~4.000 | 0,8 | 512 MB | Free tier API-Football insufficiente |
| **10.000** | 2.000 | ~150.000 | ~40.000 | 8 | 1 GB | Serve Pro API-Football |
| **50.000** | 10.000 | ~750.000 | ~200.000 | 40 | 2 GB | |
| **100.000** | 20.000 | ~1.500.000 | ~400.000 | 80 | 2–4 GB | |
| **250.000** | 50.000 | ~3.750.000 | ~1.000.000 | 200 | 4 GB | |
| **500.000** | 100.000 | ~7.500.000 | ~2.000.000 | 400 | 4–8 GB | |
| **1.000.000** | 200.000 | ~15.000.000 | ~4.000.000 | 800 | 8 GB | Ultra/Mega API-Football |

### Dettaglio calcolo API-Football

- Home load: 18 (leghe) + 50 (predictions) ≈ **68 req**
- Dettaglio load: **4 req**
- Mix 70/30: `0.7 × 68 + 0.3 × 4 ≈ 50 req` per visita cold
- Visite cold × 50 = totale richieste API-Football

### Dettaglio 20 bookmaker diretti

- 20 richieste HTTP per home load, 20 per dettaglio
- **Chiamate gratuite** – nessun costo per richiesta
- **Unico costo possibile**: banda passante (GB in uscita verso i bookmaker)
  - ~20 × 50 KB ≈ 1 MB per load → trascurabile rispetto alla banda verso utenti
- Rate limit: dipendono da ogni bookmaker (verificare ToS)

### Dettaglio banda

- Media ~800 KB/visita (verso utenti)
- 1.000.000 visite × 0,8 MB ≈ **800 GB/mese**

---

## 5. Limiti API e piani consigliati

### API-Football (api-football.com)

| Piano | Limite | Prezzo | Adeguato per |
|-------|--------|--------|--------------|
| Free | 100 req/giorno | $0 | ~3.000 req/mese, quasi inutilizzabile |
| Pro | 7.500 req/giorno | $19/mese | ~225.000 req/mese → fino a ~4.500 visite cold |
| Ultra | 75.000 req/giorno | $29/mese | ~2.250.000 req/mese → fino a ~45.000 visite cold |
| Mega | 150.000 req/giorno | $39/mese | ~4.500.000 req/mese → fino a ~90.000 visite cold |
| Custom | Fino a 1.5M/giorno | Su richiesta | Per 1M+ visite |

### 20 bookmaker diretti

- **Chiamate gratuite** – nessun costo per richiesta
- **Costi**: solo banda passante (GB) – ~1 MB per load, trascurabile
- **Rate limit**: dipendono da ogni bookmaker; verificare ToS

---

## 6. Raccomandazioni per scaglione

### Fino a 10.000 visite/mese
- **API-Football**: Pro ($19)
- **20 bookmaker**: nessun costo API
- **Hosting**: Vercel Pro o simile, 1 GB RAM
- **Banda**: ~8 GB, inclusa nei piani base

### 10.000 – 100.000 visite/mese
- **API-Football**: Ultra ($29)
- **Hosting**: 2–4 GB RAM, CDN per asset statici
- **Banda**: 40–80 GB

### 100.000 – 500.000 visite/mese
- **API-Football**: Mega o Custom
- **Hosting**: 4–8 GB RAM, possibilmente Redis per cache
- **Banda**: 80–400 GB

### 500.000 – 1.000.000 visite/mese
- **API-Football**: Custom (1.5M req/giorno)
- **Hosting**: 8+ GB RAM, Redis, CDN
- **Banda**: 400–800 GB

---

## 7. Ottimizzazioni per ridurre costi

1. **Cache più aggressiva**: aumentare `revalidate` a 120–300s dove possibile
2. **Batch predictions**: API-Football non supporta batch; valutare cache lato server (Redis) per predictions
3. **20 bookmaker**: eseguire le 20 richieste in parallelo (`Promise.all`) per ridurre la latenza
4. **ISR/Static**: pre-renderizzare le pagine più visitate
5. **Edge caching**: Vercel Edge o Cloudflare per ridurre cold start e carico sul server

---

## 8. Riepilogo memoria e banda (1M visite)

| Risorsa | Stima |
|---------|-------|
| **RAM server** | 8 GB (con Redis per live store) |
| **Banda in uscita** (verso utenti) | ~800 GB/mese |
| **Banda outbound** (verso 20 bookmaker) | ~200 GB/mese – unico costo per i bookmaker |
| **API-Football** | ~15M richieste/mese (piano Custom) |
| **20 bookmaker** | ~4M richieste/mese – **gratuite** (solo banda ~200 GB) |
| **Storage** | 1–5 GB (build, cache, log) |

---

*Documento generato in base alla configurazione del codice. I limiti delle API possono cambiare; verificare sempre sui siti ufficiali.*
