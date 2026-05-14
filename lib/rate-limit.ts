/**
 * Rate limiting — swap for @upstash/ratelimit + Vercel KV in production.
 * Edge-safe interface; current implementation is a no-op pass-through.
 */
export async function rateLimit(
  key: string,
  limit = 60,
  windowSec = 60,
): Promise<{ success: boolean; limit?: number; windowSec?: number }> {
  void key;
  void limit;
  void windowSec;
  return { success: true, limit, windowSec };
}
