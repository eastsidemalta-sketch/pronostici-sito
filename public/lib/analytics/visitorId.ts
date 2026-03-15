/**
 * Visitor Identification - privacy-safe.
 * Cookie "vid" (UUID v4), 30 giorni, SameSite=Lax.
 * Nessun IP, nessun dato personale.
 */

import { randomUUID } from "crypto";

export const VID_COOKIE_NAME = "vid";
const VID_MAX_AGE_DAYS = 30;
const VID_MAX_AGE_SEC = VID_MAX_AGE_DAYS * 24 * 60 * 60;

/** Express Request con cookies */
export interface RequestWithCookies {
  cookies?: Record<string, string>;
  headers?: { cookie?: string };
}

/** Express Response con cookie */
export interface ResponseWithCookie {
  cookie(name: string, value: string, options?: Record<string, unknown>): void;
  setHeader(name: string, value: string | string[]): void;
}

/**
 * Middleware: assicura cookie "vid" (UUID v4).
 * Se non esiste: genera, imposta cookie, 30 giorni, SameSite=Lax.
 */
export function ensureVisitorIdCookie(
  req: RequestWithCookies,
  res: ResponseWithCookie,
  next: () => void
): void {
  const existing = getVidFromRequest(req);
  if (existing) {
    (req as { vid?: string }).vid = existing;
    next();
    return;
  }
  const vid = randomUUID();
  (req as { vid?: string }).vid = vid;
  res.cookie(VID_COOKIE_NAME, vid, {
    maxAge: VID_MAX_AGE_SEC * 1000,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  next();
}

/** Estrae vid da request (cookie o header) */
export function getVidFromRequest(req: RequestWithCookies): string | undefined {
  if (req.cookies?.[VID_COOKIE_NAME]) return req.cookies[VID_COOKIE_NAME];
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(new RegExp(`${VID_COOKIE_NAME}=([^;]+)`));
  return match?.[1]?.trim();
}
