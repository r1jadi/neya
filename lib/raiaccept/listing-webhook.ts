import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getRaiAcceptClient, isProductionEnvironment } from "@/lib/raiaccept/server";
import { LISTING_FEE_DAYS } from "@/lib/constants";

/**
 * Verified processing for RaiAccept NEYA Places listing-fee notifications.
 *
 * Same discipline as ticket payments: the webhook payload is NOT final
 * payment confirmation. Every notification is verified against the
 * authenticated GET /orders/{orderIdentification} response, then — and only
 * then — the venue's listing_paid_until is extended by LISTING_FEE_DAYS.
 * Idempotency is guaranteed by the merchant-order-reference unique key on
 * venue_listing_payments: a listing is never granted more than once per
 * payment attempt.
 *
 * Never log credentials, tokens, card data, or full payloads.
 */

export type ListingNotification = {
  transactionId: string;
  transactionType: string;
  transactionStatus: string;
  transactionStatusCode: string | null;
  transactionAmountCents: number | null;
  transactionCurrency: string | null;
  orderIdentification: string;
  merchantOrderReference: string;
};

export function listingNotificationFromPayload(payload: unknown): ListingNotification | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return null;
  const body = payload as {
    transaction?: {
      transactionId?: unknown;
      transactionType?: unknown;
      status?: unknown;
      statusCode?: unknown;
      transactionAmount?: unknown;
      transactionCurrency?: unknown;
    };
    order?: {
      orderIdentification?: unknown;
      invoice?: { merchantOrderReference?: unknown };
    };
  };
  const tx = body.transaction ?? {};
  const ord = body.order ?? {};
  const notification: ListingNotification = {
    transactionId: typeof tx.transactionId === "string" ? tx.transactionId.slice(0, 200) : "",
    transactionType: typeof tx.transactionType === "string" ? tx.transactionType.slice(0, 50) : "",
    transactionStatus: typeof tx.status === "string" ? tx.status.slice(0, 50) : "",
    transactionStatusCode: typeof tx.statusCode === "string" ? tx.statusCode.slice(0, 50) : null,
    transactionAmountCents:
      typeof tx.transactionAmount === "number" && Number.isFinite(tx.transactionAmount) && tx.transactionAmount > 0
        ? Math.round(tx.transactionAmount * 100)
        : null,
    transactionCurrency:
      typeof tx.transactionCurrency === "string" ? tx.transactionCurrency.toUpperCase().slice(0, 10) : null,
    orderIdentification:
      typeof ord.orderIdentification === "string" ? ord.orderIdentification.slice(0, 300) : "",
    merchantOrderReference:
      typeof ord.invoice?.merchantOrderReference === "string"
        ? ord.invoice.merchantOrderReference.slice(0, 300)
        : "",
  };
  if (!notification.merchantOrderReference.startsWith("NEYA-LIST-")) return null;
  if (!notification.orderIdentification || !notification.transactionId) return null;
  return notification;
}

/**
 * Verify a listing notification against the provider and, on confirmed
 * payment, grant the listing period. Returns "paid", "ignored", or "retry".
 */
export async function processListingNotification(
  notification: ListingNotification,
): Promise<"paid" | "ignored" | "retry"> {
  const admin = createAdminClient();

  // Locate the NEYA listing payment by its unique merchant reference.
  const { data: attempt, error: lookupError } = await admin
    .from("venue_listing_payments")
    .select("id, venue_id, amount_cents, currency, status, provider_order_id")
    .eq("merchant_order_reference", notification.merchantOrderReference)
    .maybeSingle();
  if (lookupError || !attempt) {
    console.error("[neya] listing payment not found for notification", {
      merchantOrderReference: notification.merchantOrderReference,
    });
    return "ignored";
  }

  // Skip already-settled attempts.
  if (attempt.status === "paid") return "paid";

  // Verify against the provider BEFORE trusting the notification.
  let order;
  try {
    const client = getRaiAcceptClient();
    order = await client.getOrder(notification.orderIdentification);
  } catch (error) {
    console.error("[neya] listing provider verification failed", {
      orderIdentification: notification.orderIdentification,
      error: error instanceof Error ? error.message : "unknown",
    });
    return "retry";
  }

  const raiReference =
    typeof order.invoice?.merchantOrderReference === "string"
      ? order.invoice.merchantOrderReference
      : null;
  if (!raiReference || raiReference !== notification.merchantOrderReference) {
    console.error("[neya] listing notification order reference mismatch", {
      orderIdentification: notification.orderIdentification,
    });
    return "ignored";
  }

  // Cross-check the environment.
  const raiProduction = order.isProduction !== false;
  if (raiProduction !== isProductionEnvironment()) {
    console.error("[neya] listing payment environment mismatch", {
      orderIdentification: notification.orderIdentification,
    });
    return "ignored";
  }

  const orderStatus = String(order.status ?? "").toUpperCase();
  if (orderStatus !== "PAID") {
    // Not paid — nothing to grant. Update the attempt state if we can.
    if (orderStatus === "FAILED" || orderStatus === "CANCELED" || orderStatus === "ABANDONED") {
      await admin
        .from("venue_listing_payments")
        .update({
          status: orderStatus === "FAILED" ? "failed" : "cancelled",
          provider_status_code: orderStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", attempt.id);
    }
    return "ignored";
  }

  // Amount integrity: the paid order must match the listing fee.
  const orderAmountCents = Math.round((order.invoice?.amount ?? 0) * 100);
  if (orderAmountCents !== attempt.amount_cents) {
    console.error("[neya] listing payment amount mismatch", {
      merchantOrderReference: notification.merchantOrderReference,
    });
    return "ignored";
  }

  // Grant the listing period. Idempotent via the unique merchant reference:
  // if a previous notification already settled this attempt, the status check
  // above prevents double-granting.
  const paidUntil = new Date(Date.now() + LISTING_FEE_DAYS * 24 * 3600 * 1000).toISOString();
  const { error: updateError } = await admin
    .from("venue_listing_payments")
    .update({
      status: "paid",
      provider_status_code: notification.transactionStatusCode,
      provider_status_message: "verified paid",
      updated_at: new Date().toISOString(),
    })
    .eq("id", attempt.id)
    .eq("status", "processing"); // only settle a pending/processing attempt
  if (updateError) {
    console.error("[neya] listing payment settle failed", {
      merchantOrderReference: notification.merchantOrderReference,
      error: updateError.message,
    });
    return "retry";
  }

  const { error: venueError } = await admin
    .from("venues")
    .update({ listing_paid_until: paidUntil })
    .eq("id", attempt.venue_id);
  if (venueError) {
    console.error("[neya] listing payment venue update failed", {
      merchantOrderReference: notification.merchantOrderReference,
      error: venueError.message,
    });
    // The attempt is settled; roll back to keep it retryable.
    await admin
      .from("venue_listing_payments")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", attempt.id);
    return "retry";
  }

  console.log("[neya] listing payment confirmed", {
    venueId: attempt.venue_id,
    merchantOrderReference: notification.merchantOrderReference,
  });
  return "paid";
}