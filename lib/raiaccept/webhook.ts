import "server-only";

import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRaiAcceptClient, isProductionEnvironment, RaiAcceptError } from "@/lib/raiaccept/server";

/**
 * Shared verified processing for RaiAccept ticket-payment notifications.
 *
 * Used by BOTH the webhook route (app/api/webhooks/raiaccept/route.ts) and the
 * reconciliation sweep (lib/raiaccept/reconcile.ts) so there is exactly one
 * verification and fulfillment path.
 *
 * Core rule: the webhook payload is NOT final payment confirmation. Every
 * notification is verified against the authenticated
 * GET /orders/{orderIdentification} response, and a ticket is finalized only
 * through the row-locked, idempotent complete_ticket_order RPC. Terminal
 * failure/cancellation releases inventory only through release_ticket_order.
 *
 * Never log credentials, tokens, card data, or full payloads.
 */

export type RaiAcceptWebhookPayload = {
  transaction?: {
    transactionId?: string;
    transactionAmount?: number;
    transactionCurrency?: string;
    transactionType?: string;
    isProduction?: boolean;
    status?: string;
    statusCode?: string;
    statusMessage?: string;
  };
  order?: {
    orderIdentification?: string;
    invoice?: {
      merchantOrderReference?: string;
    };
  };
};

export type Notification = {
  transactionId: string;
  transactionType: string;
  transactionStatus: string;
  transactionStatusCode: string | null;
  transactionStatusMessage: string | null;
  transactionAmountCents: number | null;
  transactionCurrency: string | null;
  orderIdentification: string;
  merchantOrderReference: string;
};

/** RaiAccept amounts are decimal (25.00); NEYA stores integer cents (2500). */
export function amountToCents(amount: unknown): number | null {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

export function str(value: unknown, maxLength = 500): string {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

/** Normalize a stored webhook payload (jsonb) into the fields the processor needs. */
export function notificationFromPayload(payload: unknown): Notification | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return null;
  const body = payload as RaiAcceptWebhookPayload;
  const tx = body.transaction ?? {};
  const ord = body.order ?? {};
  const notification: Notification = {
    transactionId: str(tx.transactionId, 200),
    transactionType: str(tx.transactionType, 50),
    transactionStatus: str(tx.status, 50),
    transactionStatusCode: str(tx.statusCode, 50) || null,
    transactionStatusMessage: str(tx.statusMessage) || null,
    transactionAmountCents: amountToCents(tx.transactionAmount),
    transactionCurrency: str(tx.transactionCurrency, 10).toUpperCase() || null,
    orderIdentification: str(ord.orderIdentification, 300),
    merchantOrderReference: str(ord.invoice?.merchantOrderReference, 300),
  };
  if (!notification.orderIdentification || !notification.transactionId) return null;
  return notification;
}

/**
 * Verify the notification against the authenticated RaiAccept order and apply
 * the final state to the NEYA ticket order.
 *
 * Returns the processing_result string ("paid", "failed", "cancelled",
 * "in_progress", "mismatch", "not_found", "refund_state", "unknown_status",
 * "late_payment_after_cancel") or "retry" — "retry" means the provider API or
 * database was temporarily unavailable and the event must stay unprocessed.
 */
export async function processNotification(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string | null,
  n: Notification,
): Promise<string> {
  // 1. Locate the NEYA ticket order via the immutable merchant reference.
  const { data: order, error: orderError } = await admin
    .from("ticket_orders")
    .select(
      "id, amount_cents, currency, merchant_order_reference, payment_provider, payment_status, status, inventory_released",
    )
    .eq("merchant_order_reference", n.merchantOrderReference)
    .maybeSingle();

  if (orderError) {
    console.error("[neya] RaiAccept webhook order lookup failed", {
      orderIdentification: n.orderIdentification,
      transactionId: n.transactionId,
      error: orderError.message,
    });
    return "retry";
  }
  if (!order) {
    await markEvent(admin, eventId, "not_found", "no NEYA ticket order for merchantOrderReference");
    return "not_found";
  }
  if (order.payment_provider !== "raiaccept") {
    await markEvent(admin, eventId, "mismatch", "NEYA ticket order is not a RaiAccept order");
    return "mismatch";
  }

  // 2. Locate the matching RaiAccept payment attempt.
  const attempt = await findAttempt(admin, n);
  if (!attempt) {
    await markEvent(admin, eventId, "mismatch", "no RaiAccept payment attempt matches the notification");
    return "mismatch";
  }
  if (attempt.provider_order_id && attempt.provider_order_id !== n.orderIdentification) {
    await markEvent(
      admin,
      eventId,
      "mismatch",
      "attempt provider_order_id does not match notification orderIdentification",
    );
    return "mismatch";
  }

  // 3. Retrieve the final RaiAccept order — the source of truth.
  let raiOrder;
  try {
    raiOrder = await getRaiAcceptClient().getOrder(n.orderIdentification);
  } catch (err) {
    const phase = err instanceof RaiAcceptError ? err.phase : "unknown";
    const httpStatus = err instanceof RaiAcceptError ? err.httpStatus : null;
    const uncertain = err instanceof RaiAcceptError ? err.uncertain : true;
    console.error("[neya] RaiAccept order verification failed", {
      orderIdentification: n.orderIdentification,
      transactionId: n.transactionId,
      phase,
      httpStatus,
    });
    if (!uncertain && httpStatus === 404) {
      // The RaiAccept order does not exist — definitive, record, no retry.
      await markEvent(admin, eventId, "not_found", "RaiAccept order not found (404)");
      return "not_found";
    }
    // Other 4xx (401/403/400) are config/request problems, not "order not
    // found" — retry so the event stays visible to reconciliation.
    // Transient failures (network / 5xx) also retry.
    await admin
      .from("ticket_payment_webhook_events")
      .update({ processing_error: `getOrder failed (${phase}${httpStatus ? ` ${httpStatus}` : ""})` })
      .eq("id", eventId ?? "");
    return "retry";
  }

  // 4. Environment check — never let a sandbox notification finalize a
  //    production order (or vice versa).
  if (typeof raiOrder.isProduction === "boolean" && raiOrder.isProduction !== isProductionEnvironment()) {
    await markEvent(admin, eventId, "mismatch", "isProduction does not match the configured RaiAccept environment");
    return "mismatch";
  }

  const finalStatus = str(raiOrder.status, 50);

  // 5. Verified successful PURCHASE.
  if (finalStatus === "PAID") {
    return handleVerifiedPaid(admin, eventId, order, attempt.id, n, raiOrder);
  }

  // 6. Verified terminal failure / cancellation.
  if (finalStatus === "FAILED") {
    return handleVerifiedTerminal(admin, eventId, order, attempt.id, n, "failed");
  }
  if (finalStatus === "CANCELED" || finalStatus === "ABANDONED") {
    return handleVerifiedTerminal(admin, eventId, order, attempt.id, n, "cancelled");
  }

  // 7. Refunded states — do not fulfill; refunds are handled by the admin
  //    refund workflow. Note: provider_transaction_id on the attempt must
  //    stay the PURCHASE transaction id (a REFUND webhook carries the refund
  //    transaction id, which must not replace it).
  if (finalStatus === "PARTIALLY_REFUNDED" || finalStatus === "FULLY_REFUNDED") {
    await updateAttempt(admin, attempt.id, {
      provider_status_code: n.transactionStatusCode,
      provider_status_message: n.transactionStatusMessage ?? finalStatus,
    });
    await markEvent(admin, eventId, "refund_state", `RaiAccept order is ${finalStatus}`);
    return "refund_state";
  }

  // 8. In-progress / unknown states — keep the order recoverable: no release,
  //    no QR, no paid.
  if (finalStatus === "DRAFT" || finalStatus === "CHECKOUT") {
    await updateAttempt(admin, attempt.id, {
      status: "processing",
      provider_transaction_id: n.transactionId || undefined,
      provider_status_code: n.transactionStatusCode,
      provider_status_message: n.transactionStatusMessage ?? finalStatus,
    });
    await markEvent(admin, eventId, "in_progress", `RaiAccept order is ${finalStatus}`);
    return "in_progress";
  }

  await updateAttempt(admin, attempt.id, {
    provider_transaction_id: n.transactionId || undefined,
    provider_status_code: n.transactionStatusCode,
    provider_status_message: n.transactionStatusMessage,
  });
  await markEvent(admin, eventId, "unknown_status", `unmapped RaiAccept order status ${finalStatus}`);
  return "unknown_status";
}

/** Find the RaiAccept attempt for this notification (by order id, then tx id). */
export async function findAttempt(
  admin: ReturnType<typeof createAdminClient>,
  n: Notification,
): Promise<{ id: string; provider_order_id: string | null } | null> {
  const { data: byOrder } = await admin
    .from("ticket_payment_attempts")
    .select("id, provider_order_id")
    .eq("provider", "raiaccept")
    .eq("provider_order_id", n.orderIdentification)
    .maybeSingle();
  if (byOrder) return byOrder;

  const { data: byTx } = await admin
    .from("ticket_payment_attempts")
    .select("id, provider_order_id")
    .eq("provider", "raiaccept")
    .eq("provider_transaction_id", n.transactionId)
    .maybeSingle();
  return byTx ?? null;
}

/**
 * Verified successful PURCHASE: validates amount/currency/reference/provider
 * order id and finalizes through the trusted complete_ticket_order RPC.
 * eventId may be null when invoked by the reconciliation sweep (no webhook
 * event row); markEvent then only records the decision in logs.
 */
export async function handleVerifiedPaid(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string | null,
  order: {
    id: string;
    amount_cents: number | null;
    currency: string | null;
    merchant_order_reference: string;
    payment_status: string;
    status: string;
    inventory_released: boolean;
  },
  attemptId: string,
  n: Notification,
  raiOrder: {
    orderIdentification?: string;
    status?: string;
    isProduction?: boolean;
    invoice?: { amount?: number; currency?: string; merchantOrderReference?: string };
  },
): Promise<string> {
  // The verified final state must be a successful PURCHASE.
  if (n.transactionType !== "PURCHASE") {
    await markEvent(admin, eventId, "mismatch", `order is PAID but transactionType is ${n.transactionType || "unknown"}`);
    return "mismatch";
  }
  if (n.transactionStatus !== "SUCCESS" || n.transactionStatusCode !== "0000") {
    await markEvent(admin, eventId, "mismatch", "order is PAID but notification is not SUCCESS/0000");
    return "mismatch";
  }

  // Verify amount, currency, reference, and provider order id. RaiAccept sends
  // decimal amounts; NEYA stores integer cents — compare in cents only.
  const raiAmountCents = amountToCents(raiOrder.invoice?.amount);
  const raiCurrency = str(raiOrder.invoice?.currency, 10).toUpperCase() || null;
  const raiReference = str(raiOrder.invoice?.merchantOrderReference, 300) || null;

  const amountsMatch =
    raiAmountCents === order.amount_cents &&
    (n.transactionAmountCents == null || n.transactionAmountCents === order.amount_cents);
  const currenciesMatch =
    raiCurrency === order.currency &&
    (n.transactionCurrency == null || n.transactionCurrency === order.currency);
  const referenceMatches = raiReference === order.merchant_order_reference;
  const orderIdMatches = raiOrder.orderIdentification === n.orderIdentification;

  if (!amountsMatch || !currenciesMatch || !referenceMatches || !orderIdMatches) {
    await markEvent(
      admin,
      eventId,
      "mismatch",
      `verification failed (amount=${amountsMatch}, currency=${currenciesMatch}, reference=${referenceMatches}, orderId=${orderIdMatches})`,
    );
    return "mismatch";
  }

  // Idempotent success: the order is already paid — nothing to redo.
  if (order.payment_status === "paid") {
    await updateAttempt(admin, attemptId, {
      status: "paid",
      provider_transaction_id: n.transactionId || undefined,
      provider_status_code: n.transactionStatusCode,
      provider_status_message: n.transactionStatusMessage ?? "Paid",
    });
    await markEvent(admin, eventId, "paid", "order already paid");
    return "paid";
  }

  // The order was already fully refunded — a late duplicate SUCCESS
  // notification must never re-issue the ticket or re-run fulfillment.
  if (order.payment_status === "refunded") {
    await updateAttempt(admin, attemptId, {
      provider_status_code: n.transactionStatusCode,
      provider_status_message: n.transactionStatusMessage ?? "Paid",
    });
    await markEvent(admin, eventId, "already_refunded", "verified PAID but NEYA order is already refunded");
    return "already_refunded";
  }

  // Late payment after a verified terminal state / release: a real customer
  // payment must never be silently discarded, but a released order must never
  // get a ticket either. Record the contradiction for the ops/refund task.
  if (
    order.payment_status === "cancelled" ||
    order.payment_status === "failed" ||
    order.status !== "pending" ||
    order.inventory_released
  ) {
    await updateAttempt(admin, attemptId, {
      provider_transaction_id: n.transactionId || undefined,
      provider_status_code: n.transactionStatusCode,
      provider_status_message: n.transactionStatusMessage ?? "Paid",
    });
    await markEvent(
      admin,
      eventId,
      "late_payment_after_cancel",
      `verified PAID but NEYA order is ${order.payment_status}/${order.status}`,
    );
    console.error("[neya] RaiAccept late payment for cancelled ticket order", {
      orderId: order.id,
      merchantOrderReference: order.merchant_order_reference,
      orderIdentification: n.orderIdentification,
      transactionId: n.transactionId,
    });
    return "late_payment_after_cancel";
  }

  // All validations passed — finalize transactionally via the trusted RPC
  // (row-locked, idempotent: already-paid orders are left untouched, so the
  // QR is generated exactly once and inventory is converted exactly once).
  const qrPayload = `neya:${order.id}:${randomUUID()}`;
  const { data: completed, error: completeError } = await admin.rpc("complete_ticket_order", {
    p_order_id: order.id,
    p_provider: "raiaccept",
    p_provider_reference: n.orderIdentification,
    p_qr_payload: qrPayload,
  });
  if (completeError || completed !== true) {
    console.error("[neya] RaiAccept ticket completion failed", {
      orderId: order.id,
      merchantOrderReference: order.merchant_order_reference,
      orderIdentification: n.orderIdentification,
      transactionId: n.transactionId,
      error: completeError?.message ?? "complete_ticket_order returned false",
    });
    await admin
      .from("ticket_payment_webhook_events")
      .update({ processing_error: "complete_ticket_order failed" })
      .eq("id", eventId ?? "");
    return "retry";
  }

  await updateAttempt(admin, attemptId, {
    status: "paid",
    provider_transaction_id: n.transactionId || undefined,
    provider_status_code: n.transactionStatusCode,
    provider_status_message: n.transactionStatusMessage ?? "Paid",
  });
  await markEvent(admin, eventId, "paid", "verified PURCHASE finalized");
  return "paid";
}

/**
 * Verified terminal failure/cancellation: release inventory through the safe,
 * idempotent RPC and mark the attempt. A concurrent verified PAID always wins
 * (the release RPC row-locks the order; the attempt update only applies to
 * non-terminal attempts).
 */
export async function handleVerifiedTerminal(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string | null,
  order: {
    id: string;
    payment_status: string;
  },
  attemptId: string,
  n: Notification,
  kind: "failed" | "cancelled",
): Promise<string> {
  if (order.payment_status === "paid") {
    await markEvent(admin, eventId, "mismatch", `${kind} notification for an already-paid NEYA order`);
    return "mismatch";
  }

  const { error: releaseError } = await admin.rpc("release_ticket_order", { p_order_id: order.id });
  if (releaseError) {
    console.error("[neya] RaiAccept ticket release failed", {
      orderId: order.id,
      orderIdentification: n.orderIdentification,
      transactionId: n.transactionId,
      error: releaseError.message,
    });
    return "retry";
  }

  // Re-check under the release lock: a concurrent verified PAID must win.
  const { data: after } = await admin
    .from("ticket_orders")
    .select("payment_status")
    .eq("id", order.id)
    .maybeSingle();
  if (after?.payment_status === "paid") {
    await markEvent(
      admin,
      eventId,
      "late_payment_after_cancel",
      `order became paid while processing ${kind} notification`,
    );
    return "late_payment_after_cancel";
  }

  // Relabel the released order (release_ticket_order sets 'cancelled') when
  // the provider verdict is FAILED; never touch a paid order.
  if (kind === "failed") {
    await admin
      .from("ticket_orders")
      .update({ payment_status: "failed" })
      .eq("id", order.id)
      .eq("payment_status", "cancelled");
  }

  await admin
    .from("ticket_payment_attempts")
    .update({
      status: kind,
      provider_transaction_id: n.transactionId || undefined,
      provider_status_code: n.transactionStatusCode,
      provider_status_message: n.transactionStatusMessage ?? kind.toUpperCase(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", attemptId)
    .in("status", ["pending", "processing"]);

  await markEvent(admin, eventId, kind, `verified ${kind.toUpperCase()} purchase`);
  return kind;
}

export async function updateAttempt(
  admin: ReturnType<typeof createAdminClient>,
  attemptId: string,
  fields: {
    status?: "pending" | "processing" | "paid" | "failed" | "cancelled" | "refunded";
    provider_transaction_id?: string | null;
    provider_status_code?: string | null;
    provider_status_message?: string | null;
  },
) {
  await admin
    .from("ticket_payment_attempts")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", attemptId);
}

export async function markEvent(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string | null,
  result: string,
  detail?: string,
) {
  if (!eventId) return;
  await admin
    .from("ticket_payment_webhook_events")
    .update({
      processed_at: new Date().toISOString(),
      processing_result: result,
      processing_error: detail ?? null,
    })
    .eq("id", eventId);
}
