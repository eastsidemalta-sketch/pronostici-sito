/**
 * Costruzione richiesta GET Netwin (FULL / delta), isolata da `directBookmakerFetcher`
 * per evitare cicli di import / binding ESM sotto tsx (worker PM2).
 */
import type { Bookmaker } from "../bookmaker.types";

function buildUrl(
  endpoint: string,
  apiKey: string,
  apiSecret: string | undefined,
  authType: string,
  queryParams?: Record<string, string>,
  orderedKeys?: string[]
): string {
  let url = endpoint;
  const q = queryParams ?? {};
  let params: URLSearchParams;
  if (orderedKeys?.length) {
    params = new URLSearchParams();
    for (const k of orderedKeys) {
      if (q[k] != null && String(q[k]).trim() !== "") params.set(k, String(q[k]).trim());
    }
    for (const [k, v] of Object.entries(q)) {
      if (!orderedKeys.includes(k) && v != null && String(v).trim() !== "") params.set(k, String(v).trim());
    }
  } else {
    params = new URLSearchParams(q);
  }

  if (authType === "query") {
    params.set("apiKey", apiKey);
    if (apiSecret) params.set("apiSecret", apiSecret);
  }

  const qs = params.toString();
  if (qs) url += (url.includes("?") ? "&" : "?") + qs;

  return url;
}

function buildHeaders(
  apiKey: string,
  apiSecret: string | undefined,
  authType: string
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (authType === "header") {
    headers["X-Api-Key"] = apiKey;
    if (apiSecret) headers["X-Api-Secret"] = apiSecret;
  } else if (authType === "bearer") {
    headers["Authorization"] = `Bearer ${apiKey}`;
  } else if (authType === "x-access-token") {
    headers["x-access-token"] = apiKey;
  }

  return headers;
}

const NETWIN_QUERY_PARAM_ORDER = [
  "isLive",
  "system_code",
  "type",
  "codiceSito",
  "v_sport",
  "v_scommesse",
] as const;

/**
 * Costruisce URL GET e header per il feed Netwin (`bm.apiEndpoint`, es. `get_eventi_psqf`).
 * Stessa logica di `fetchDirectBookmakerQuotes`: `type` FULL o delta, `NETWIN_SYSTEM_CODE_OVERRIDE` su `system_code`.
 */
export function buildNetwinGetRequest(
  bm: Bookmaker,
  kind: "FULL" | "delta"
): { url: string; headers: Record<string, string> } | null {
  const endpoint = bm.apiEndpoint;
  const apiKey = bm.apiKey;
  const mapping = bm.apiMappingConfig;
  if (!endpoint || !mapping || !apiKey?.trim()) return null;

  const authType = bm.apiAuthType ?? "query";
  const reqConfig = bm.apiRequestConfig ?? {};
  if ((reqConfig.method ?? "GET") !== "GET") return null;

  let queryParams = { ...(reqConfig.queryParams as Record<string, string> | undefined) ?? {} };
  const { isLive: _i, is_live: _il, islive: _ii, ...rest } = queryParams;
  queryParams = {
    isLive: "0",
    ...rest,
    type: kind === "FULL" ? "FULL" : "delta",
  };
  const systemCode = process.env.NETWIN_SYSTEM_CODE_OVERRIDE;
  if (systemCode) queryParams = { ...queryParams, system_code: systemCode };

  const url = buildUrl(
    endpoint,
    apiKey,
    bm.apiSecret ?? undefined,
    authType,
    queryParams,
    [...NETWIN_QUERY_PARAM_ORDER]
  );

  const headers = {
    ...buildHeaders(apiKey, bm.apiSecret ?? undefined, authType),
    ...(reqConfig.headers ?? {}),
  };
  headers["X-IsLive"] = "0";
  return { url, headers };
}
