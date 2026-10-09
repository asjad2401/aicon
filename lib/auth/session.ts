import { createHmac, timingSafeEqual } from "node:crypto";
import type { SessionUser } from "./roles";

/**
 * Stateless signed session: base64url(JSON payload) + "." + HMAC-SHA256 signature.
 * Used by the proxy (optimistic redirects) and by every staff API (authoritative checks).
 * No "server-only" import: the proxy runs outside the React server environment.
 */

export const SESSION_COOKIE = "priora_session";
export const SESSION_TTL_SECONDS = 12 * 3600; // one hospital shift

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV !== "production") return "dev-only-insecure-session-secret-change-me";
  throw new Error("SESSION_SECRET is not set (min 32 chars)");
}

const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

export function encodeSession(user: SessionUser) {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined | null): SessionUser | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    // Fails closed: a missing secret or bad signature means "not signed in".
    const expected = Buffer.from(sign(payload));
    const given = Buffer.from(sig);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.exp !== "number" || data.exp < Date.now() / 1000) return null;
    return { uid: data.uid, username: data.username, name: data.name, role: data.role, dept: data.dept ?? null };
  } catch {
    return null;
  }
}
