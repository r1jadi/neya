import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  listingNotificationFromPayload,
  processListingNotification,
} from "@/lib/raiaccept/listing-webhook";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 512 * 1024;

/**
 * RaiAccept notification webhook for NEYA Places listing-fee payments.
 *
 * The webhook payload is never treated as final. Each notification is
 * verified against the authenticated GET /orders/{orderIdentification}
 * response (see lib/raiaccept/listing-webhook.ts) before the listing period
 * is granted. Duplicate notifications are deduplicated by merchant reference
 * (unique on venue_listing_payments) and by payload hash on the audit table.
 */
export const maxDuration = 60;

export async function POST(req: Request) {
  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  const ip = await getClientIp(req.headers);
  const rl = await rateLimit(`raiaccept-listing-webhook:${ip || "unknown"}`, 600, 3600);
  if (!rl.success) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const rawBody = await req.text().catch(() => "");
  if (!rawBody) return NextResponse.json({ error: "empty body" }, { status: 400 });

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const notification = listingNotificationFromPayload(parsed);
  if (!notification) {
    // Not a listing notification (or missing required fields) — ignore quietly
    // so the provider does not retry forever for unrelated events.
    return NextResponse.json({ received: true, ignored: true });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "server not configured" }, { status: 500 });
  }

  const payloadHash = createHash("sha256").update(rawBody).digest("hex");

  // Write the audit event; dedupe on payload hash.
  const { data: inserted, error: insertError } = await admin
    .from("listing_payment_webhook_events")
    .insert({
      provider: "raiaccept",
      provider_transaction_id: notification.transactionId,
      provider_order_id: notification.orderIdentification,
      merchant_order_reference: notification.merchantOrderReference,
      payload_hash: payloadHash,
      payload: parsed as Record<string, unknown>,
    })
    .select("id, processed_at")
    .single();

  let eventId: string | null = inserted?.id ?? null;

  if (insertError || !eventId) {
    const { data: existing } = await admin
      .from("listing_payment_webhook_events")
      .select("id, processed_at")
      .eq("payload_hash", payloadHash)
      .maybeSingle();
    if (!existing) {
      console.error("[neya] listing webhook event insert failed", insertError);
      return NextResponse.json({ error: "could not record webhook event" }, { status: 500 });
    }
    if (existing.processed_at) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    eventId = existing.id;
  }

  const outcome = await processListingNotification(notification);
  if (outcome === "retry") {
    return NextResponse.json({ error: "temporary processing failure" }, { status: 500 });
  }

  // Mark processed regardless of paid/ignored so duplicates don't reprocess.
  await admin
    .from("listing_payment_webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", eventId);

  return NextResponse.json({ received: true, result: outcome });
}