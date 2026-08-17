import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Vercel Cron auth. Vercel invokes cron endpoints with
 * `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set; routes must
 * refuse to run without a valid secret so they are never publicly callable.
 */
export function isCronSecretConfigured(): boolean {
  return Boolean(process.env.CRON_SECRET);
}

export function isValidCronRequest(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  if (!token) return false;
  const a = createHash("sha256").update(token).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
