import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  notificationFromPayload,
  processNotification,
  type Notification,
  type RaiAcceptWebhookPayload,
} from "@/lib/raiaccept/webhook";

/**
 * RaiAccept notification webhook for ticket payments.
 *
 * The webhook payload is NOT final payment confirmation. Per RaiAccept's
 * official documentation, notifications can be repeated and only provide
 * transaction status information; the merchant must call
 * GET /orders/{orderIdentification} and use the final order status from that
 * authenticated response before processing the order.
 *
 * Receipt is idempotent: notifications are deduplicated in
 * ticket_payment_webhook_events (exact payload hash + provider transaction
 * state). Verified processing is shared with the reconciliation sweep
 * (lib/raiaccept/webhook.ts). Never trust the payload alone, never trust
 * frontend redirects, and never log credentials, tokens, card data, or full
 * payloads.
 */

export async function POST(req: Request) {
  const rawBody = await req.text().catch(() => "");
  if (!rawBody) {
    return NextResponse.json({ error: "empty body" }, { status: 400 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const body = parsed as RaiAcceptWebhookPayload;
  const notification = notificationFromPayload(body);
  if (!notification) {
    return NextResponse.json(
      { error: "missing orderIdentification or transactionId" },
      { status: 400 },
    );
  }

  const payloadHash = createHash("sha256").update(rawBody).digest("hex");

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "server not configured" }, { status: 500 });
  }

  // Record the notification. Unique indexes on (provider, payload_hash) and
  // (provider, transaction_id, type, status, status_code) make receipt
  // idempotent; different states of the same transaction still pass through.
  const { data: inserted, error: insertError } = await admin
    .from("ticket_payment_webhook_events")
    .insert({
      provider: "raiaccept",
      provider_transaction_id: notification.transactionId,
      provider_order_id: notification.orderIdentification,
      transaction_type: notification.transactionType || null,
      status: notification.transactionStatus || null,
      status_code: notification.transactionStatusCode,
      payload_hash: payloadHash,
      payload: body as unknown as Record<string, unknown>,
    })
    .select("id, processed_at")
    .single();

  let eventId: string | null = inserted?.id ?? null;

  if (insertError || !eventId) {
    const existing = await findDuplicateEvent(admin, payloadHash, notification);
    if (!existing) {
      console.error("[neya] RaiAccept webhook event insert failed", insertError);
      return NextResponse.json({ error: "could not record webhook event" }, { status: 500 });
    }
    eventId = existing.id;
    if (existing.processed_at) {
      // Exact duplicate already handled — do not finalize again.
      return NextResponse.json({ received: true, duplicate: true });
    }
  }

  console.log("[neya] RaiAccept webhook received", {
    orderIdentification: notification.orderIdentification,
    transactionId: notification.transactionId,
    status: notification.transactionStatus,
    statusCode: notification.transactionStatusCode,
  });

  const outcome = await processNotification(admin, eventId, notification);
  if (outcome === "retry") {
    // Leave the event unprocessed and tell RaiAccept to retry.
    return NextResponse.json({ error: "temporary processing failure" }, { status: 500 });
  }
  return NextResponse.json({ received: true, result: outcome });
}

/** Locate a previously stored duplicate event (by payload hash, then state). */
async function findDuplicateEvent(
  admin: ReturnType<typeof createAdminClient>,
  payloadHash: string,
  n: Notification,
): Promise<{ id: string; processed_at: string | null } | null> {
  const { data: byHash } = await admin
    .from("ticket_payment_webhook_events")
    .select("id, processed_at")
    .eq("provider", "raiaccept")
    .eq("payload_hash", payloadHash)
    .maybeSingle();
  if (byHash) return byHash;

  let query = admin
    .from("ticket_payment_webhook_events")
    .select("id, processed_at")
    .eq("provider", "raiaccept")
    .eq("provider_transaction_id", n.transactionId)
    .eq("transaction_type", n.transactionType || null)
    .eq("status", n.transactionStatus || null);
  query =
    n.transactionStatusCode == null
      ? query.is("status_code", null)
      : query.eq("status_code", n.transactionStatusCode);
  const { data: byState } = await query.maybeSingle();
  return byState ?? null;
}
