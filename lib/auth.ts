import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "admin_session";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 ore

function getSecret(): string | null {
  return process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || null;
}

export function createSessionToken(): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const exp = Date.now() + SESSION_DURATION_MS;
  const payload = JSON.stringify({ exp });
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(JSON.stringify({ payload, sig })).toString("base64url");
}

export function verifySessionToken(token: string): boolean {
  const secret = getSecret();
  if (!secret) return false;
  try {
    const decoded = JSON.parse(
      Buffer.from(token, "base64url").toString("utf-8")
    );
    const expectedSig = createHmac("sha256", secret)
      .update(decoded.payload)
      .digest("hex");
    if (!timingSafeEqual(Buffer.from(decoded.sig), Buffer.from(expectedSig)))
      return false;
    const { exp } = JSON.parse(decoded.payload);
    return exp > Date.now();
  } catch {
    return false;
  }
}

export function verifyCredentials(email: string, password: string): boolean {
  const expectedEmail = process.env.ADMIN_EMAIL;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedEmail || !expectedPassword) return false;
  const emailMatch =
    email.trim().toLowerCase() === expectedEmail.trim().toLowerCase();
  const a = Buffer.from(password, "utf-8");
  const b = Buffer.from(expectedPassword, "utf-8");
  if (a.length !== b.length) return false;
  return emailMatch && timingSafeEqual(a, b);
}

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return !!token && verifySessionToken(token);
}

export async function setSessionCookie(): Promise<boolean> {
  const token = createSessionToken();
  if (!token) return false;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_MS / 1000,
    path: "/",
  });
  return true;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
