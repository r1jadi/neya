import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reconcileRaiAcceptTicketPayments } from "@/lib/raiaccept/reconcile";

/**
 * Scheduled entry point for the RaiAccept ticket-payment reconciliation
 * sweep. Configured in vercel.json (every 15 minutes). Vercel invokes cron
 * endpoints with `Authorization: Bearer <CRON_SECRET>` when the CRON_SECRET
 * environment variable is set; the sweep refuses to run without a valid
 * secret, so it is never publicly callable.
 */

function secretMatches(token: string): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const a = createHash("sha256").update(token).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  if (!token || !secretMatches(token)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "server not configured" }, { status: 500 });
  }

  try {
    const report = await reconcileRaiAcceptTicketPayments(admin);
    console.log("[neya] RaiAccept reconciliation sweep complete", report);
    return NextResponse.json({ ok: true, report });
  } catch (err) {
    console.error(
      "[neya] RaiAccept reconciliation sweep failed",
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.json({ error: "reconciliation failed" }, { status: 500 });
  }
}
