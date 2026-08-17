import { NextResponse } from "next/server";
import { isCronSecretConfigured, isValidCronRequest } from "@/lib/cron-auth";
import { runWeeklyDigest } from "@/lib/digest/run";

/**
 * Weekly "This Weekend" digest — scheduled entry point.
 *
 * Configured in vercel.json (daily at 16:30 UTC → ~17:30/18:30 Prishtina
 * local time all year; Hobby's ±59-minute drift is tolerated). The endpoint
 * itself verifies (1) it is Thursday in Prishtina and (2) the week has not
 * already been processed — the database is the source of truth, so even a
 * misconfigured daily schedule can never send duplicates.
 */
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!isCronSecretConfigured()) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (!isValidCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const report = await runWeeklyDigest();
    console.log("[digest] weekly digest run", report);
    return NextResponse.json({ ok: true, ...report });
  } catch (err) {
    console.error("[digest] weekly digest failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "weekly digest failed" }, { status: 500 });
  }
}
