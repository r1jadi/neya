/**
 * Signed unsubscribe tokens (Next.js side). Mirrors
 * supabase/functions/send-weekly-digest/token.ts — the Edge Function signs
 * tokens, this module verifies them. Web Crypto works in both runtimes.
 *
 * Token: base64url("<profileId>.<unixExpiry>") "." base64url(hmacSha256)
 */

export const DEFAULT_TOKEN_TTL_DAYS = 90;

function bytesToB64u(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64uToBytes(value: string): Uint8Array | null {
  const clean = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = clean.length % 4 === 0 ? "" : "=".repeat(4 - (clean.length % 4));
  try {
    const bin = atob(clean + pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function hmacSha256(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function createUnsubscribeToken(
  profileId: string,
  secret: string,
  ttlDays = DEFAULT_TOKEN_TTL_DAYS,
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlDays * 86400;
  const payload = `${profileId}.${exp}`;
  const sig = await hmacSha256(secret, payload);
  return `${bytesToB64u(new TextEncoder().encode(payload))}.${bytesToB64u(sig)}`;
}

/** Returns the profile id when the token is well-formed, unexpired, and signed; otherwise null. */
export async function verifyUnsubscribeToken(token: string, secret: string): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts as [string, string];
  const payloadBytes = b64uToBytes(payloadB64);
  const sigBytes = b64uToBytes(sigB64);
  if (!payloadBytes || !sigBytes || sigBytes.length !== 32) return null;

  const payload = new TextDecoder().decode(payloadBytes);
  const dot = payload.lastIndexOf(".");
  if (dot <= 0 || dot === payload.length - 1) return null;
  const profileId = payload.slice(0, dot);
  const expRaw = payload.slice(dot + 1);
  if (!/^\d+$/.test(expRaw)) return null;
  const exp = parseInt(expRaw, 10);
  if (!Number.isSafeInteger(exp) || exp <= Math.floor(Date.now() / 1000)) return null;

  const expected = await hmacSha256(secret, payload);
  if (!constantTimeEqual(expected, sigBytes)) return null;
  return profileId;
}
