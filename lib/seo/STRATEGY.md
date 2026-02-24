# Strategia SEO – Sito sportivo multi-country

## 1. Logica decisionale SEO

### Flusso principale

```
Request → [country] attivo?
  NO  → 404 (notFound) → nessun metadata, nessuna indicizzazione
  SÌ  → Tipo pagina?
         ├─ Sport / Competizione / Squadra / Mercato → index,follow
         ├─ Match futuro o recente (< X giorni)      → index,follow
         ├─ Match scaduto (> X giorni)               → noindex,follow
         └─ Filtri / Search / ?param                 → noindex,follow
```

### Regole

| Condizione | robots | canonical | metadata |
|------------|--------|-----------|----------|
| Country non attivo | — | — | — (404) |
| Sport, competizione, squadra, mercato | index,follow | sì | title, description, OG |
| Match futuro/recente | index,follow | sì | title, description, OG |
| Match scaduto (>7 giorni) | noindex,follow | sì | title, description, OG |
| Filtri, search, ?tab=, ?page= | noindex,follow | sì (senza query) | title, description |

### Country non attivi

- **Non** outputtare metadata
- **Non** outputtare hreflang
- **Non** usare noindex (la pagina non esiste → 404)
- Bot e utenti → `notFound()` (HTTP 404)

### Canonical

- Sempre presente per pagine servite
- Formato: `https://site.com/{country}/{path}`
- **Senza** query string (?tab=, ?page=)
- **Senza** trailing slash

---

## 2. Esempio generateMetadata() completo

```ts
// app/[country]/pronostici-quote/calcio/[league]/page.tsx

import type { Metadata } from "next";
import {
  shouldOutputSeoMetadata,
  createIndexableMetadata,
  createNoindexMetadata,
} from "@/lib/seo";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ country: string; league: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
}): Promise<Metadata> {
  const { country, league } = await params;
  const { tab, page } = await searchParams;

  // Country non attivo → nessun metadata (la route restituisce 404)
  if (!shouldOutputSeoMetadata(country)) {
    return {};
  }

  const pathWithoutCountry = `/pronostici-quote/calcio/${league}`;

  // Filtri/parametri → noindex
  const hasFilters = tab != null || page != null;
  if (hasFilters) {
    return createNoindexMetadata({
      title: `${league} - Pronostici e Quote`,
      description: `...`,
      countryCode: country,
      pathWithoutCountry,
    });
  }

  // Competizione → index
  return createIndexableMetadata({
    title: `${league} - Pronostici e Quote`,
    description: `Pronostici e quote per ${league}. Confronta le migliori quote 1X2, over/under e consigli di scommessa.`,
    countryCode: country,
    pathWithoutCountry,
  });
}
```

---

## 3. Gestione robots meta

```ts
// lib/seo/metadata.ts

export const ROBOTS_INDEX_FOLLOW: Metadata["robots"] = {
  index: true,
  follow: true,
};

export const ROBOTS_NOINDEX_FOLLOW: Metadata["robots"] = {
  index: false,
  follow: true,
};

// In generateMetadata:
return {
  robots: hasFilters ? ROBOTS_NOINDEX_FOLLOW : ROBOTS_INDEX_FOLLOW,
  // ...
};
```

**Nota:** Next.js traduce `robots` in `<meta name="robots" content="index, follow">` o `noindex, follow`.

---

## 4. Esempio canonical URL

```ts
// Formato: https://site.com/{country}/{path}
// path = senza country, senza query

buildCanonical("it", "/pronostici-quote/calcio/serie-a");
// → https://site.com/it/pronostici-quote/calcio/serie-a

buildCanonical("it", "/pronostici-quote/calcio/inter-juventus-fixture-123");
// → https://site.com/it/pronostici-quote/calcio/inter-juventus-fixture-123

// Con query in URL: canonical SENZA query
// URL: /it/calcio?tab=pronostici  → canonical: /it/calcio
```

---

## 5. Esempi specifici

### Competizione (index)

```ts
export async function generateMetadata({ params }) {
  const { country, league } = await params;
  if (!shouldOutputSeoMetadata(country)) return {};

  return createIndexableMetadata({
    title: `${league} - Pronostici e Quote Calcio`,
    description: `Quote e pronostici ${league}. Confronta le migliori quote 1X2, over/under e consigli.`,
    countryCode: country,
    pathWithoutCountry: `/pronostici-quote/calcio/${league}`,
  });
}
```

### Match futuro (index)

```ts
export async function generateMetadata({ params }) {
  const { country, slug } = await params;
  if (!shouldOutputSeoMetadata(country)) return {};

  const fixture = await getFixtureDetails(extractFixtureId(slug));
  const matchDate = new Date(fixture.fixture.date);

  return createMatchMetadata({
    title: `${home} vs ${away} - Pronostico e Quote`,
    description: `Pronostico ${home} vs ${away}. Quote 1X2, over/under, analisi e consigli.`,
    countryCode: country,
    pathWithoutCountry: `/pronostici-quote/calcio/${slug}`,
    matchDate,
    openGraph: { title: `${home} vs ${away} | Pronostici` },
  });
}
```

### Match scaduto (noindex)

```ts
// Stesso createMatchMetadata() – la logica è interna:

// matchDate < (oggi - 7 giorni) → createNoindexMetadata()
// matchDate >= (oggi - 7 giorni) → createIndexableMetadata()

// Esempio: partita del 1 gennaio, oggi 15 gennaio → noindex
// Esempio: partita del 10 gennaio, oggi 15 gennaio → index
```

---

## 6. Errori SEO comuni in Next.js

### 1. Canonical con query string

```ts
// ❌ Errato
canonical: `${base}${pathname}${searchParams}`

// ✅ Corretto
canonical: buildCanonical(country, pathWithoutCountry) // senza ?tab=
```

### 2. Metadata per route 404

```ts
// ❌ Errato: outputtare metadata in notFound()
// La pagina 404 non deve avere metadata custom per country inesistenti

// ✅ Corretto: return {} o notFound() prima di qualsiasi metadata
if (!shouldOutputSeoMetadata(country)) return {};
```

### 3. alternate.languages senza hreflang corrispondente

```ts
// ❌ Errato: alternates.languages con URL che non esistono (country non attivi)
// Google: "alternate without hreflang return"

// ✅ Corretto: outputtare languages SOLO per country attivi
// Per ora: non outputtare hreflang
```

### 4. Duplicati da trailing slash

```ts
// ❌ /it/calcio e /it/calcio/ possono essere visti come duplicati

// ✅ Canonical senza trailing slash, redirect 308 da /path/ a /path
```

### 5. title/description vuoti o generici

```ts
// ❌ title: "Pronostici" (troppo generico)
// ❌ description: "" (manca)

// ✅ title: "Serie A - Pronostici e Quote | Sito"
// ✅ description: 150-160 caratteri, univoca per pagina
```

### 6. force-dynamic senza considerare cache

```ts
// ❌ export const dynamic = "force-dynamic" su tutte le pagine
// Peggiora LCP e Core Web Vitals

// ✅ Usare revalidate o static dove possibile
// Dynamic solo per dati che cambiano spesso (match live)
```

### 7. Redirect 301 per pagine temporanee

```ts
// ❌ 301 da / a /it (permanente) se il default può cambiare

// ✅ 302 (temporaneo) per ora
redirect(path, 302);
```

### 8. noindex su pagine importanti

```ts
// ❌ noindex su competizioni, squadre, match futuri

// ✅ noindex solo su: match scaduti, filtri, search
```

---

## 7. Sitemap XML SEO-safe

### Elenco sitemap e contenuto

| Sitemap | URL | Contenuto |
|---------|-----|-----------|
| **Index** | `/sitemap.xml` | Elenco delle 4 sitemap |
| **Core** | `/sitemap-it-core.xml` | Home, pronostici-quote, bonus, siti-scommesse |
| **Competizioni** | `/sitemap-it-competizioni.xml` | pronostici-quote/calcio, pronostici-quote/calcio/future |
| **Squadre** | `/sitemap-it-squadre.xml` | Vuota (placeholder per futuro) |
| **Mercati** | `/sitemap-it-mercati.xml` | Vuota (placeholder per futuro) |

**Esclusi:** country non attivi, match, filtri (?league=, ?tab=), search.

### Struttura route handlers

```
app/
├── sitemap.xml/
│   └── route.ts          → GET → sitemap index XML
├── sitemap-it-core.xml/
│   └── route.ts          → GET → core URLs
├── sitemap-it-competizioni.xml/
│   └── route.ts          → GET → competizioni URLs
├── sitemap-it-squadre.xml/
│   └── route.ts          → GET → squadre URLs (vuoto)
└── sitemap-it-mercati.xml/
    └── route.ts          → GET → mercati URLs (vuoto)
```

### Esempio sitemap XML (TypeScript)

```ts
// app/sitemap-it-core.xml/route.ts

import { NextResponse } from "next/server";
import { getCoreUrls, isSitemapAllowed, toSitemapXml } from "@/lib/seo/sitemap";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSitemapAllowed()) {
    return new NextResponse(null, { status: 404 });
  }
  const xml = toSitemapXml(getCoreUrls());
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
```

**Output XML (sitemap-it-core.xml):**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://pronostici-quote.it/it</loc>
    <lastmod>2025-02-20</lastmod>
    <changefreq>daily</changefreq>
    <priority>1</priority>
  </url>
  <url>
    <loc>https://pronostici-quote.it/it/pronostici-quote</loc>
    <lastmod>2025-02-20</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <!-- bonus, siti-scommesse -->
</urlset>
```

### Collegamento a robots.txt

```ts
// app/robots.ts

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pronostici-quote.it";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/"],
    },
    sitemap: `${SITE_URL.replace(/\/$/, "")}/sitemap.xml`,
  };
}
```

`robots.txt` punta a `/sitemap.xml` (index). L'index elenca le 4 sitemap.

### Errori SEO comuni con sitemap

| Errore | Soluzione |
|--------|-----------|
| Includere URL con query (?league=, ?tab=) | Solo canonical puliti, no query |
| Includere country non attivi (/fr, /br) | Solo /it |
| Includere match scaduti | Escludere match per ora; in futuro filtrare con `isMatchExpiredForSeo` |
| Includere pagine noindex (filtri, search) | Solo pagine indexabili |
| Sitemap con trailing slash | `buildCanonical` già normalizza |
| hreflang in sitemap | Non richiesto; evitare per semplicità |
| URL futuri o non ancora attivi | Solo pagine esistenti e indicizzabili |
