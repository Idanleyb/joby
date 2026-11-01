import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies a Resend webhook (Svix format): HMAC-SHA256 over "id.timestamp.body" with the
 * base64 secret after "whsec_"; header "svix-signature" holds one or more "v1,<base64>".
 * Rejects messages older than 5 minutes (replay protection).
 */
export function verifyResendWebhook(
  body: string, headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string, now = Date.now(),
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature || !secret.startsWith("whsec_")) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > 300) return false;
  const key = Buffer.from(secret.slice("whsec_".length), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  return signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const got = Buffer.from(sig, "base64");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}
