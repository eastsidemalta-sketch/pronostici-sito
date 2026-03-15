/**
 * Protezione endpoint analytics.
 * Header richiesto: X-Admin-Token
 * Valore da process.env.ADMIN_ANALYTICS_TOKEN
 */

export const ADMIN_TOKEN_HEADER = "X-Admin-Token";

export interface RequestWithHeaders {
  headers?: { [key: string]: string | string[] | undefined };
  get?(name: string): string | null;
}

export interface ResponseWithStatus {
  status(code: number): ResponseWithStatus;
  json(body: unknown): void;
  end(): void;
}

/**
 * Middleware: richiede X-Admin-Token valido.
 * Se mancante o non valido → 401 Unauthorized.
 */
export function requireAdminToken(
  req: RequestWithHeaders,
  res: ResponseWithStatus,
  next: () => void
): void {
  const token = req.get?.("X-Admin-Token") ?? req.headers?.["x-admin-token"];
  const expected = process.env.ADMIN_ANALYTICS_TOKEN;
  const provided =
    typeof token === "string" ? token : Array.isArray(token) ? token[0] : "";

  if (!expected || !provided || provided !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
