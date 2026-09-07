import "server-only";

import { getRaiAcceptClient, isProductionEnvironment, RaiAcceptError } from "@/lib/raiaccept/server";
import { str, type Notification } from "@/lib/raiaccept/webhook";

/**
 * Verify and settle a reservation notification. Payload data is never trusted on its own:
 * the authenticated GET /orders/{orderIdentification} response is the source of truth,
 * mirroring the ticket-payment verification path in lib/raiaccept/webhook.ts:
 *
 *   1. The NEYA reservation is located by its immutable merchant reference and must be
 *      a RaiAccept reservation.
 *   2. The payment attempt must match the notification's provider order id.
 *   3. The provider order is fetched and its environment (sandbox/production) must match
 *      the configured RaiAccept environment.
 *   4. A reservation is confirmed as paid ONLY when the verified order is PAID with a
 *      successful PURCHASE notification (status SUCCESS, code 0000) and the verified
 *      invoice amount, currency and merchant reference all match the reservation.
 *      Terminal failure/cancellation marks the reservation failed; anything else stays
 *      in progress. An already-paid reservation is never touched, so a late duplicate
 *      notification can never re-run settlement, and a refunded/failed reservation can
 *      never be re-confirmed.
 */
export async function processReservationNotification(
  admin: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  eventId: string | null,
  n: Notification,
): Promise<string> {
  const { data: reservation, error } = await admin
    .from("reservations")
    .select("id, deposit_cents, payment_status, payment_provider, merchant_order_reference")
    .eq("merchant_order_reference", n.merchantOrderReference)
    .maybeSingle();
  if (error) return "retry";
  if (!reservation || reservation.payment_provider !== "raiaccept") return mark(admin, eventId, "not_found");

  const { data: attempt } = await admin
    .from("reservation_payment_attempts")
    .select("id, provider_order_id")
    .eq("reservation_id", reservation.id)
    .eq("provider", "raiaccept")
    .eq("provider_order_id", n.orderIdentification)
    .maybeSingle();
  if (!attempt) return mark(admin, eventId, "mismatch");

  let order;
  try {
    order = await getRaiAcceptClient().getOrder(n.orderIdentification);
  } catch (error) {
    const knownMissing = error instanceof RaiAcceptError && !error.uncertain && error.httpStatus === 404;
    return knownMissing ? mark(admin, eventId, "not_found") : "retry";
  }
  if (typeof order.isProduction === "boolean" && order.isProduction !== isProductionEnvironment()) {
    return mark(admin, eventId, "mismatch");
  }

  const status = str(order.status, 50);

  if (status === "PAID") {
    // The verified final state must be a successful PURCHASE — the same rule the
    // ticket path applies before fulfillment.
    if (n.transactionType !== "PURCHASE") {
      return mark(admin, eventId, "mismatch", `order is PAID but transactionType is ${n.transactionType || "unknown"}`);
    }
    if (n.transactionStatus !== "SUCCESS" || n.transactionStatusCode !== "0000") {
      return mark(admin, eventId, "mismatch", "order is PAID but notification is not SUCCESS/0000");
    }

    // Verify amount, currency and merchant reference against the authenticated
    // invoice (RaiAccept sends decimal amounts; NEYA stores integer cents).
    const raiAmountCents =
      typeof order.invoice?.amount === "number" && Number.isFinite(order.invoice.amount) && order.invoice.amount > 0
        ? Math.round(order.invoice.amount * 100)
        : null;
    const raiCurrency = str(order.invoice?.currency, 10).toUpperCase() || null;
    const raiReference = str(order.invoice?.merchantOrderReference, 300) || null;

    const amountsMatch =
      raiAmountCents === reservation.deposit_cents &&
      (n.transactionAmountCents == null || n.transactionAmountCents === reservation.deposit_cents);
    const currenciesMatch =
      raiCurrency === "EUR" && (n.transactionCurrency == null || n.transactionCurrency === "EUR");
    const referenceMatches = raiReference === reservation.merchant_order_reference;

    if (!amountsMatch || !currenciesMatch || !referenceMatches) {
      return mark(
        admin,
        eventId,
        "mismatch",
        `verification failed (amount=${amountsMatch}, currency=${currenciesMatch}, reference=${referenceMatches})`,
      );
    }

    // Idempotent settlement: a paid reservation is never updated again, so a late
    // duplicate SUCCESS notification cannot re-run confirmation (or resurrect a
    // reservation that was later cancelled, failed, or refunded).
    if (reservation.payment_status === "paid") {
      await admin
        .from("reservation_payment_attempts")
        .update({ ...fieldsFrom(n, status), status: "paid" })
        .eq("id", attempt.id);
      return mark(admin, eventId, "paid", "reservation already paid");
    }

    // Late payment after a terminal failure/cancellation: a real customer payment
    // must never be silently discarded, but a failed reservation must never be
    // re-confirmed either. Record the contradiction for the ops/refund task.
    if (reservation.payment_status === "failed") {
      await admin
        .from("reservation_payment_attempts")
        .update({ ...fieldsFrom(n, status), status: "paid" })
        .eq("id", attempt.id);
      return mark(admin, eventId, "late_payment_after_cancel", `verified PAID but reservation is ${reservation.payment_status}`);
    }

    await admin
      .from("reservations")
      .update({ status: "confirmed", payment_status: "paid", updated_at: new Date().toISOString() })
      .eq("id", reservation.id)
      .neq("payment_status", "paid");
    await admin
      .from("reservation_payment_attempts")
      .update({ ...fieldsFrom(n, status), status: "paid" })
      .eq("id", attempt.id);
    return mark(admin, eventId, "paid", "verified PURCHASE finalized");
  }

  if (status === "FAILED" || status === "CANCELED" || status === "ABANDONED") {
    // Never downgrade a paid reservation — a cancelled/failed notification for an
    // already-paid reservation is a contradiction and is only recorded.
    if (reservation.payment_status === "paid") {
      return mark(admin, eventId, "mismatch", `${status} notification for an already-paid reservation`);
    }
    const terminal = status === "FAILED" ? "failed" : "cancelled";
    await admin
      .from("reservations")
      .update({ payment_status: "failed", updated_at: new Date().toISOString() })
      .eq("id", reservation.id)
      .neq("payment_status", "paid");
    await admin
      .from("reservation_payment_attempts")
      .update({ ...fieldsFrom(n, status), status: terminal })
      .eq("id", attempt.id);
    return mark(admin, eventId, terminal, `verified ${terminal.toUpperCase()} purchase`);
  }

  if (status === "PARTIALLY_REFUNDED" || status === "FULLY_REFUNDED") {
    // Refunds are handled by the admin workflow — record, never settle.
    await admin
      .from("reservation_payment_attempts")
      .update({ ...fieldsFrom(n, status) })
      .eq("id", attempt.id);
    return mark(admin, eventId, "refund_state", `RaiAccept order is ${status}`);
  }

  await admin
    .from("reservation_payment_attempts")
    .update({ ...fieldsFrom(n, status), status: "processing" })
    .eq("id", attempt.id);
  return mark(admin, eventId, "in_progress", `RaiAccept order is ${status || "unknown"}`);
}

/** Provider-truth fields to persist on the attempt (payload values are informational). */
function fieldsFrom(n: Notification, orderStatus: string) {
  return {
    provider_transaction_id: n.transactionId,
    provider_status_code: n.transactionStatusCode,
    provider_status_message: n.transactionStatusMessage ?? orderStatus,
    updated_at: new Date().toISOString(),
  };
}

async function mark(
  admin: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  eventId: string | null,
  result: string,
  detail?: string,
) {
  if (!eventId) return result;
  await admin
    .from("reservation_payment_webhook_events")
    .update({
      processed_at: new Date().toISOString(),
      processing_result: result,
      processing_error: detail ?? null,
    })
    .eq("id", eventId);
  return result;
}
