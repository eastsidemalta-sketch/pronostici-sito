/**
 * GET /api/debug-api-calls
 * Report delle chiamate API con colonne: Provider | Tipo | Endpoint | Trigger | Frequenza | Stato | Link
 * + Log ultime 7 giorni di tutte le chiamate API
 *
 * ?format=html = pagina HTML con tabella
 * ?hours=168 = log ultimi 7 giorni (default 24)
 */
import { NextResponse } from "next/server";
import { getCacheDebugInfo } from "@/lib/quotes/providers/netwinCache";
import { readApiCallLog, readNetwinFullLog } from "@/lib/apiCallLog";

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

function buildReport(base: string): ReportRow[] {
  const netwin = getCacheDebugInfo();
  const netwinStato = netwin.hasCache
    ? `${netwin.h2hCount} partite, prossima FULL: ${netwin.nextFullAllowedIso?.slice(0, 16) ?? "?"}`
    : "Cache vuota (prossima richiesta = FULL)";

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
      tipo: "GET",
      endpoint: "fixtures?from=&to=&league=&season=",
      trigger: "Home, Pronostici-quote, Calcio",
      frequenza: "N leghe × 60s revalidate",
      stato: "-",
      linkPath: "/api/debug-api-football",
    },
    {
      provider: "API Football",
      tipo: "GET",
      endpoint: "predictions?fixture={id}",
      trigger: "Match page, lista partite",
      frequenza: "1 per partita, 60s revalidate",
      stato: "-",
      linkPath: "/api/debug-api-football",
    },
    {
      provider: "Betboom",
      tipo: "POST",
      endpoint: "get_by_category_ids / categories",
      trigger: "Quote BR, fallback Brasileirão",
      frequenza: "Cache 1h categorie",
      stato: "-",
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

  const report = buildReport(base);

  // Log unificato: api-calls + netwin-full (ultimi N giorni)
  const apiLog = readApiCallLog(hours);
  const netwinLog = readNetwinFullLog(hours);
  const allLog = [...netwinLog.map((e) => ({ ...e, source: "netwin-full" })), ...apiLog.map((e) => ({ ...e, source: "api-calls" }))];
  allLog.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));

  if (format === "html") {
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Report Chiamate API</title></head>
<body style="font-family:system-ui;max-width:1100px;margin:2rem auto;padding:0 1rem">
<h1>Report chiamate API</h1>
<p>Sito: <strong>${base}</strong></p>
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
<td>${(e as { count?: number; h2hCount?: number }).count ?? (e as { h2hCount?: number }).h2hCount ?? "-"}</td>
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
