# Strategia Internal Linking – Sito sportivo multi-country

## 1. Schema di linking gerarchico

```
Home (/it)
    │
    ├── Hub principale (/it/pronostici-quote)
    │       │
    │       ├── Sport (/it/pronostici-quote/[sport])
    │       │       │
    │       │       ├── Future (/it/pronostici-quote/[sport]/future)
    │       │       ├── [competizione] (futuro)
    │       │       └── [match] (futuro)
    │       │
    │       └── (altri sport quando attivi)
    │
    ├── Bonus (/it/bonus)
    └── Siti scommesse (/it/siti-scommesse)
```

**Principi:**
- Link **verso l’alto**: sottosezione → sport → hub → home (breadcrumb)
- Link **verso il basso**: home → hub → sport → sottosezioni (navigazione)
- Link **orizzontali**: sport ↔ sport (solo se entrambi hanno contenuto reale, vedi §7)

---

## 2. Regole di linking per tipo di pagina

### Home (/it)

| Destinazione | Tipo | Quantità |
|--------------|------|----------|
| Hub pronostici-quote | navigazionale | 1 |
| Sport attivi (es. calcio) | navigazionale | 1 per sport |
| Bonus | navigazionale | 1 |
| Siti scommesse | navigazionale | 1 |

**Regole:**
- Solo link verso pagine **indexabili** e **attive**
- Nessun link a sport non ancora pubblicati
- Massimo 1 link per destinazione (evitare duplicati)

---

### Hub principale (/it/pronostici-quote)

| Destinazione | Tipo | Quantità |
|--------------|------|----------|
| Home | navigazionale | 1 |
| Sport attivi | navigazionale | 1 per sport |
| Bonus | navigazionale | 1 |
| Siti scommesse | navigazionale | 1 |

**Regole:**
- Link a tutti gli sport con pagina attiva
- Nessun link a sport con route 404

---

### Pagine sport (/it/pronostici-quote/[sport])

| Destinazione | Tipo | Quantità |
|--------------|------|----------|
| Home | navigazionale | 1 |
| Hub pronostici-quote | navigazionale | 1 |
| Future (se esiste) | navigazionale | 1 |
| Altri sport attivi | navigazionale | 1 per sport |
| Bonus | navigazionale | 1 |

**Regole:**
- Link alla sottosezione "future" solo se la route esiste
- Link contestuali nel contenuto verso match/competizioni (quando presenti)

---

### Future page (/it/pronostici-quote/[sport]/future)

| Destinazione | Tipo | Quantità |
|--------------|------|----------|
| Home | navigazionale | 1 |
| Hub pronostici-quote | navigazionale | 1 |
| Sport padre | navigazionale | 1 |
| Bonus | navigazionale | 1 |

**Regole:**
- Link al padre (sport) per uscita rapida
- Nessun link a match scaduti o pagine noindex

---

## 3. Tipi di link

### Navigazionali

- **Header / menu principale**: home, hub, sport attivi, bonus, siti scommesse
- **Breadcrumb**: home → hub → sport → sottosezione
- **Footer minimale**: home, pronostici-quote, bonus, siti scommesse (4–6 link totali)

**Vantaggi:** distribuiscono link equity in modo prevedibile, aiutano la crawlabilità.

---

### Contestuali

- **Nel contenuto**: link da testo a pagine correlate (es. "Pronostici Serie A" → competizione)
- **CTA**: "Vedi tutte le partite" → sport o future
- **Cross-sport**: da calcio a tennis solo se tennis ha pagina attiva

**Vantaggi:** aumentano rilevanza semantica e tempo sulla pagina.

---

## 4. Errori comuni nei siti sportivi

| Errore | Problema | Soluzione |
|--------|----------|-----------|
| Link a sport non attivi | 404, link equity sprecata | Link solo a route esistenti |
| Link con ?league=, ?tab= | Canonical diversi, rischio duplicati | Solo URL puliti, senza query |
| Footer con 100+ link | Diluizione equity, possibile spam | Footer con 4–6 link principali |
| Nessun link alla home | Home poco linkata | Almeno 1 link da ogni pagina |
| Link a match scaduti | Pagine noindex ricevono link | Escludere match oltre X giorni |
| Link a filtri/search | Pagine noindex | Non linkare varianti con parametri |
| Troppi link per pagina | Over-optimization | Max 50–80 link per pagina, priorità alle pagine chiave |
| Link solo in footer | Crawlability debole | Link anche in header e contenuto |

---

## 5. Esempio pratico: linking per il calcio

### Struttura attuale

- `/it` – home
- `/it/pronostici-quote` – hub
- `/it/pronostici-quote/calcio` – calcio
- `/it/pronostici-quote/calcio/future` – partite future

### Mappa dei link

```
Home
  → /it/pronostici-quote
  → /it/pronostici-quote/calcio
  → /it/bonus
  → /it/siti-scommesse

Hub (/it/pronostici-quote)
  → /it
  → /it/pronostici-quote/calcio
  → /it/bonus
  → /it/siti-scommesse

Calcio (/it/pronostici-quote/calcio)
  → /it
  → /it/pronostici-quote
  → /it/pronostici-quote/calcio/future
  → /it/bonus

Future (/it/pronostici-quote/calcio/future)
  → /it
  → /it/pronostici-quote
  → /it/pronostici-quote/calcio
  → /it/bonus
```

### Chi riceve almeno 1 link

| Pagina | Link da |
|--------|---------|
| Home | hub, calcio, future, bonus, siti scommesse |
| Hub | home, calcio, future |
| Calcio | home, hub, future |
| Future | home, hub, calcio |
| Bonus | home, hub, calcio, future |
| Siti scommesse | home, hub |

### Checklist per il calcio

- [ ] Nessun link a /fr, /es, /br (country non attivi)
- [ ] Nessun link con ?league= o ?tab=
- [ ] Nessun link a match scaduti (noindex)
- [ ] Footer con max 4–6 link
- [ ] Ogni pagina indexabile riceve almeno 1 link interno

---

## 6. Scalabilità futura

Quando si aggiungono **competizioni**, **squadre** o **match**:

1. **Competizioni**: link da sport → competizione, da competizione → sport e hub
2. **Squadre**: link da competizione → squadra, da match → squadra
3. **Match**: link da competizione/sport → match (solo se non scaduto), da match → competizione e sport

**Regola:** ogni nuova pagina indexabile deve ricevere almeno 1 link da una pagina già indicizzata e linkare almeno 1 pagina padre (breadcrumb).

---

## 7. Regola linking orizzontale tra sport

### Condizione obbligatoria

Un link tra sport (es. calcio ↔ tennis) è consentito **solo se**:

1. Entrambe le pagine sport hanno **contenuto reale** (non placeholder)
2. Entrambe sono **indicizzabili** (index,follow)
3. Entrambe sono **presenti in sitemap**

### Check logico

```
isSportLinkable(sportKey) =
  sportKey ∈ getActiveSportKeysForLinking()
  dove getActiveSportKeysForLinking() = sport keys estratti da sitemap competizioni
```

### Pseudo-codice

```
// Prima di mostrare link verso sport B dalla pagina sport A:
function canLinkToSport(sportKey: string): boolean {
  return getActiveSportKeysForLinking().includes(sportKey);
}

// Filtrare sport per menu/navigazione:
activeSports = SPORTS.filter(s => canLinkToSport(s.key));
```

### Non linkare mai

- Sport non ancora popolati (route 404)
- Sport non in sitemap
- Placeholder o pagine "coming soon"

---

## 8. Footer: regola e link consigliati

### Lista finale link footer (4–6 totali)

| # | Destinazione | Path | Condizione |
|---|--------------|------|------------|
| 1 | Home | `/it` | Sempre |
| 2 | Hub principale | `/it/pronostici-quote` | Sempre |
| 3 | Calcio | `/it/pronostici-quote/calcio` | Se `isSportLinkable("calcio")` |
| 4 | Bonus | `/it/bonus` | Sempre |
| 5 | Siti scommesse | `/it/siti-scommesse` | Opzionale (1 commerciale basta) |

**Oggi (solo calcio attivo):** Home, Hub, Calcio, Bonus → **4 link**.  
**Con 2 sport:** Home, Hub, Calcio, Tennis, Bonus → **5 link**.  
**Max:** 6 link (Home + Hub + 3 sport + 1 commerciale).

### Regola logica includere/escludere

```
INCLUDI:
  - Home (sempre)
  - Hub pronostici-quote (sempre)
  - Sport dove isSportLinkable(sportKey) === true (max 3)
  - 1 pagina commerciale: bonus O siti-scommesse (priorità bonus)

ESCLUDI:
  - Sottosezioni (es. /calcio/future)
  - Sport non in getActiveSportKeysForLinking()
  - Pagine future/placeholder
  - Duplicati header (footer ≠ copia header)
```

### Pseudo-codice

```
footerLinks = [Home, Hub]
footerLinks.push(...getActiveSportKeysForLinking().slice(0, 3).map(k => Sport(k)))
footerLinks.push(Bonus)  // o SitiScommesse se si preferisce
return footerLinks.slice(0, 6)
```
