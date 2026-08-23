/**
 * Rate limiting — fixed-window counters, enforced in the database.
 *
 * Primary path: `public.rate_limit_check(p_key, p_limit, p_window_sec)`
 * (see supabase/migrations/20260831000000_rate_limits.sql) performs an
 * atomic increment under a row lock, so counters are shared across all
 * serverless instances via Supabase. Keys are SHA-256 hashed before they
 * touch the database so no raw emails/IPs are stored.
 *
 * Fallback: if the service-role client or the migration is unavailable
 * (local dev without env vars), a per-process in-memory counter is used.
 * It is real enforcement within the instance (single process in dev) but is
 * NOT a shared counter — never treat it as sufficient in production.
 */
import { createHash } from "node:crypto";
import { headers as nextHeaders } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

type MemoryWindow = { windowStart: number; count: number };

const memory = new Map<string, MemoryWindow>();
let warnedAboutDbLimiter = false;

/** Best-effort client IP for per-attacker keys (x-forwarded-for first hop). */
export async function getClientIp(headersLike?: Headers | null): Promise<string> {
  let h: Headers | null = headersLike ?? null;
  if (!h) {
    try {
      h = await nextHeaders();
    } catch {
      return "";
    }
  }
  try {
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first.slice(0, 64);
    }
    return (h.get("x-real-ip") ?? "").slice(0, 64);
  } catch {
    return "";
  }
}

/**
 * Returns { success: true } when the caller is within `limit` requests per
 * `windowSec` for `key`, otherwise { success: false }.
 */
export async function rateLimit(
  key: string,
  limit = 60,
  windowSec = 60,
): Promise<{ success: boolean; limit?: number; windowSec?: number }> {
  // Hash before storage so the table never holds PII (emails, IPs, ids).
  const hashedKey = createHash("sha256").update(key).digest("hex").slice(0, 32);

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("rate_limit_check", {
      p_key: hashedKey,
      p_limit: limit,
      p_window_sec: windowSec,
    });
    if (error) {
      // Configured client but missing/failed RPC (migration not applied).
      if (!warnedAboutDbLimiter) {
        warnedAboutDbLimiter = true;
        console.error(
          "[rate-limit] database limiter unavailable, using per-instance memory fallback — apply migration 20260831000000_rate_limits",
          error.message,
        );
      }
    } else if (typeof data === "boolean") {
      return { success: data, limit, windowSec };
    }
  } catch {
    // Service role not configured (local dev) — fall through to memory.
  }

  return memoryRateLimit(hashedKey, limit, windowSec);
}

/** Per-process fixed-window counter — fallback for dev / unavailable DB. */
function memoryRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): { success: boolean; limit?: number; windowSec?: number } {
  const now = Date.now();

  if (memory.size > 10_000) {
    for (const [k, v] of memory) {
      if (now - v.windowStart > 24 * 3600 * 1000) memory.delete(k);
    }
  }

  const entry = memory.get(key);
  if (!entry || now - entry.windowStart >= windowSec * 1000) {
    memory.set(key, { windowStart: now, count: 1 });
    return { success: true, limit, windowSec };
  }
  if (entry.count >= limit) {
    return { success: false, limit, windowSec };
  }
  entry.count += 1;
  return { success: true, limit, windowSec };
}