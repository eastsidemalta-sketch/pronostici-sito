/**
 * GET /api/debug-api-calls
 * Report delle chiamate API con colonne: Provider | Tipo | Endpoint | Trigger | Frequenza | Stato / Prossima | Link
 * + Log ultime 7 giorni di tutte le chiamate API
 *
 * ?format=html = pagina HTML con tabella
 * ?hours=168 = log ultimi 7 giorni (default 24)
 *
 * Test: FULL e DELTA Netwin attive. Produzione: NETWIN_DISABLE_FULL=1 → solo cache.
 */
import { NextResponse } from "next/server";
import { getCacheDebugInfo, getNetwinFullLog } from "@/lib/quotes/providers/netwinCache";
import { readApiCallLog } from "@/lib/apiCallLog";

/** Report righe: tutte le chiamate API esterne */
type ReportRow = {
  provider: string;
  tipo: string;
  endpoint: string;
  trigger: string;
  frequenza: string;
  stato: string;
  linkPath: string;
};

function lastCallByProvider(
  allLog: Array<{ provider?: string; type?: string; timestamp?: number; iso?: string }>
): Record<string, { ts: number; iso: string }> {
  const byKey: Record<string, { ts: number; iso: string }> = {};
  for (const e of allLog) {
    const p = (e.provider || "").trim();
    const t = (e.type || "").trim();
    if (!p) continue;
    const key = t ? `${p}:${t}` : p;
    if (!byKey[key] || (e.timestamp ?? 0) > byKey[key].ts) {
      byKey[key] = { ts: e.timestamp ?? 0, iso: e.iso ?? "" };
    }
  }
  return byKey;
}

function formatAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return `${sec}s fa`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min fa`;
  const h = Math.floor(min / 60);
  return `${h}h fa`;
}

function buildReport(
  base: string,
  lastCalls: ReturnType<typeof lastCallByProvider>,
  netwin: Awaited<ReturnType<typeof getCacheDebugInfo>>
): ReportRow[] {
  const netwinDisabled = process.env.NETWIN_DISABLE_FULL === "1" || process.env.NETWIN_DISABLE_FULL === "true";
  let netwinStato: string;
  if (netwinDisabled) {
    netwinStato = netwin.hasCache
      ? `Sospesa (solo cache: ${netwin.h2hCount} partite)`
      : "Sospesa (cache vuota, nessuna chiamata)";
  } else if (netwin.hasCache) {
    const nextAt = netwin.nextFullAllowedIso?.slice(0, 16) ?? "?";
    netwinStato = `${netwin.h2hCount} partite, prossima FULL: ${nextAt}`;
  } else {
    netwinStato = "Cache vuota (prossima richiesta = FULL, immediata)";
  }

  const apiFbLast = lastCalls["API Football:fixtures"];
  const apiFbStato = apiFbLast
    ? `Ultima: ${formatAgo(apiFbLast.ts)} · Prossima: ~60s revalidate`
    : "On-demand (60s revalidate)";

  const betboomLast = lastCalls["Betboom:prematch"];
  const betboomStato = betboomLast ? `Ultima: ${formatAgo(betboomLast.ts)}` : "On-demand";

  return [
    {
      provider: "Netwin",
      tipo: "FULL",
      endpoint: "get_eventi_psqf?type=FULL",
      trigger: "Cache vuota o scaduta (>3h)",
      frequenza: "1 ogni 3 ore",
      stato: netwinStato,
      linkPath: "/api/debug-netwin-cache",
    },
    {
      provider: "Netwin",
      tipo: "DELTA",
      endpoint: "get_eventi_psqf?type=delta",
      trigger: "Cache valida, aggiornamento quote",
      frequenza: "1 ogni 10 sec",
      stato: netwin.hasCache ? "Usa cache se <10s da ultima DELTA" : "-",
      linkPath: "/api/debug-netwin-feed",
    },
    {
      provider: "API Football",
      tipo: "fixtures",
      endpoint: "fixtures?from=&to=&league=&season=",
      trigger: "Home, Pronostici-quote, Calcio",
      frequenza: "N leghe × 60s revalidate",
      stato: apiFbStato,
      linkPath: "/api/debug-api-football",
    },
    {
      provider: "API Football",
      tipo: "predictions",
      endpoint: "predictions?fixture={id}",
      trigger: "Match page, lista partite",
      frequenza: "1 per partita, 60s revalidate",
      stato: "On-demand (non loggato)",
      linkPath: "/api/debug-api-football",
    },
    {
      provider: "Betboom",
      tipo: "POST",
      endpoint: "get_by_category_ids / categories",
      trigger: "Quote BR, fallback Brasileirão",
      frequenza: "Cache 1h categorie",
      stato: betboomStato,
      linkPath: "/api/debug-br-fixtures",
    },
    {
      provider: "Redis",
      tipo: "Cache",
      endpoint: "home:data:{country}",
      trigger: "Home page IT/BR",
      frequenza: "TTL 90s, warm ogni 2 min",
      stato: "-",
      linkPath: "/api/debug-home",
    },
  ];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");
  const hours = Math.min(168, Math.max(1, parseInt(searchParams.get("hours") ?? "24", 10) || 24));

  const url = new URL(request.url);
  const base = `${url.protocol}//${url.host}`;

  // Log unificato (prima del report, per lastCalls)
  const [apiLog, netwinLog, netwinInfo] = await Promise.all([
    Promise.resolve(readApiCallLog(hours)),
    getNetwinFullLog(hours),
    getCacheDebugInfo(),
  ]);
  const allLog = [...netwinLog.map((e) => ({ ...e, source: "netwin-full" })), ...apiLog.map((e) => ({ ...e, source: "api-calls" }))];
  allLog.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));

  const lastCalls = lastCallByProvider(allLog);
  const report = buildReport(base, lastCalls, netwinInfo);

  if (format === "html") {
    const netwinDisabled = process.env.NETWIN_DISABLE_FULL === "1" || process.env.NETWIN_DISABLE_FULL === "true";
    const modeLabel = netwinDisabled ? "PRODUZIONE (Netwin FULL/DELTA sospese, solo cache)" : "TEST (Netwin FULL/DELTA attive)";
    const modeBg = netwinDisabled ? "#fff3cd" : "#d4edda";
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Report Chiamate API</title></head>
<body style="font-family:system-ui;max-width:1100px;margin:2rem auto;padding:0 1rem">
<h1>Report chiamate API</h1>
<p>Sito: <strong>${base}</strong></p>
<p style="background:${modeBg};padding:0.5rem 1rem;border-radius:6px;font-weight:600">${modeLabel}</p>
<table border="1" cellpadding="10" style="border-collapse:collapse;width:100%;font-size:14px">
<thead>
<tr style="background:#f0f0f0">
  <th>Provider</th>
  <th>Tipo</th>
  <th>Endpoint</th>
  <th>Trigger</th>
  <th>Frequenza</th>
  <th>Stato</th>
  <th>Link</th>
</tr>
</thead>
<tbody>
${report
  .map(
    (r) =>
      `<tr>
  <td><strong>${r.provider}</strong></td>
  <td>${r.tipo}</td>
  <td><code style="font-size:12px">${r.endpoint}</code></td>
  <td>${r.trigger}</td>
  <td>${r.frequenza}</td>
  <td>${r.stato}</td>
  <td><a href="${base}${r.linkPath}">Debug</a></td>
</tr>`
  )
  .join("")}
</tbody>
</table>

<h2 style="margin-top:2rem">Log chiamate API (ultimi ${hours}h, retention 7 giorni)</h2>
<table border="1" cellpadding="8" style="border-collapse:collapse;width:100%;font-size:13px">
<thead><tr style="background:#f0f0f0">
<th>Data/Ora</th><th>Provider</th><th>Tipo</th><th>Esito</th><th>Count</th><th>Errore</th>
</tr></thead>
<tbody>
${allLog.slice(0, 100).map((e) => `
<tr>
<td>${(e as { iso?: string }).iso?.slice(0, 19) ?? "-"}</td>
<td>${(e as { provider?: string }).provider ?? "-"}</td>
<td>${(e as { type?: string }).type ?? "-"}</td>
<td>${(e as { success?: boolean }).success ? "OK" : "ERR"}</td>
<td>${(() => {
  const c = (e as { count?: number; h2hCount?: number }).count ?? (e as { h2hCount?: number }).h2hCount ?? "-";
  const ev = (e as { eventsExtracted?: number }).eventsExtracted;
  if (c === 0 && ev != null) return `0 (${ev} eventi)`;
  return String(c);
})()}</td>
<td>${(e as { error?: string }).error ? String((e as { error?: string }).error).slice(0, 80) + "..." : "-"}</td>
</tr>`).join("")}
</tbody>
</table>
${allLog.length === 0 ? "<p><em>Nessuna chiamata registrata. Le chiamate vengono loggate automaticamente (retention 7 giorni).</em></p>" : ""}
<p style="margin-top:1rem"><small>Ore: <a href="${base}/api/debug-api-calls?format=html&hours=24">24</a> | <a href="${base}/api/debug-api-calls?format=html&hours=168">168 (7 giorni)</a></small></p>
<p style="margin-top:2rem"><small>JSON: <a href="${base}/api/debug-api-calls">/api/debug-api-calls</a></small></p>
</body>
</html>`;
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.json({
    ok: true,
    base,
    report,
    log: { hours, entries: allLog.slice(0, 50), total: allLog.length },
  });
}
