import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  const s = process.env.ID_HASH_SALT || process.env.SUPABASE_SECRET_KEY;
  if (!s) throw new Error("ID_HASH_SALT is not set");
  return s;
}

/** Salted hash of an Israeli ID number (PRD 5.3: only the hash is stored). */
export function hashIdNumber(id: string) {
  const salt = process.env.ID_HASH_SALT;
  if (!salt) return null; // without a salt we store nothing rather than a weak hash
  return createHash("sha256").update(`${salt}:${id}`).digest("hex");
}

/** Signs a payload so the browser can carry it between steps without being able to change it. */
export function sign<T>(payload: T, ttlSeconds = 3600): string {
  const body = Buffer.from(JSON.stringify({ p: payload, exp: Date.now() + ttlSeconds * 1000 })).toString("base64url");
  const mac = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function verify<T>(token: string): T | null {
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const { p, exp } = JSON.parse(Buffer.from(body, "base64url").toString()) as { p: T; exp: number };
  return Date.now() > exp ? null : p;
}
