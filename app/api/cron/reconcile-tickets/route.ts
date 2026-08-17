import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronSecretConfigured, isValidCronRequest } from "@/lib/cron-auth";
import { reconcileRaiAcceptTicketPayments } from "@/lib/raiaccept/reconcile";

/**
 * Scheduled entry point for the RaiAccept ticket-payment reconciliation
 * sweep. Configured in vercel.json (daily at 03:30 UTC — Vercel Hobby cron
 * jobs may run at most once per day). Real-time payment confirmation is
 * handled by the RaiAccept webhook; this sweep is the safety net for missed
 * webhooks and orders stuck mid-checkout, and it is idempotent, so a daily
 * run is safe. Vercel invokes cron endpoints with
 * `Authorization: Bearer <CRON_SECRET>` when the CRON_SECRET environment
 * variable is set; the sweep refuses to run without a valid secret, so it
 * is never publicly callable.
 */

export const maxDuration = 60;

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
