import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronSecretConfigured, isValidCronRequest } from "@/lib/cron-auth";
import { reconcileRaiAcceptTicketPayments } from "@/lib/raiaccept/reconcile";

/**
 * Scheduled entry point for the RaiAccept ticket-payment reconciliation
 * sweep. Configured in vercel.json (every 15 minutes). Vercel invokes cron
 * endpoints with `Authorization: Bearer <CRON_SECRET>` when the CRON_SECRET
 * environment variable is set; the sweep refuses to run without a valid
 * secret, so it is never publicly callable.
 */

export async function GET(req: Request) {
  if (!isCronSecretConfigured()) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (!isValidCronRequest(req)) {
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
