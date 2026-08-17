import "server-only";

import { getRaiAcceptClient, isProductionEnvironment, RaiAcceptError } from "@/lib/raiaccept/server";
import { str, type Notification } from "@/lib/raiaccept/webhook";

/** Verify and settle a reservation notification. Payload data is never trusted on its own. */
export async function processReservationNotification(
  admin: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  eventId: string,
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
  const fields = {
    provider_transaction_id: n.transactionId,
    provider_status_code: n.transactionStatusCode,
    provider_status_message: n.transactionStatusMessage ?? status,
    updated_at: new Date().toISOString(),
  };
  if (status === "PAID") {
    if (n.transactionAmountCents !== reservation.deposit_cents || n.transactionCurrency !== "EUR") return mark(admin, eventId, "mismatch");
    await admin.from("reservations").update({ status: "confirmed", payment_status: "paid", updated_at: new Date().toISOString() }).eq("id", reservation.id).neq("payment_status", "paid");
    await admin.from("reservation_payment_attempts").update({ ...fields, status: "paid" }).eq("id", attempt.id);
    return mark(admin, eventId, "paid");
  }
  if (status === "FAILED" || status === "CANCELED" || status === "ABANDONED") {
    const terminal = status === "FAILED" ? "failed" : "cancelled";
    await admin.from("reservations").update({ payment_status: "failed", updated_at: new Date().toISOString() }).eq("id", reservation.id).neq("payment_status", "paid");
    await admin.from("reservation_payment_attempts").update({ ...fields, status: terminal }).eq("id", attempt.id);
    return mark(admin, eventId, terminal);
  }
  await admin.from("reservation_payment_attempts").update({ ...fields, status: "processing" }).eq("id", attempt.id);
  return mark(admin, eventId, "in_progress");
}

async function mark(admin: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>, eventId: string, result: string) {
  await admin.from("reservation_payment_webhook_events").update({ processed_at: new Date().toISOString(), processing_result: result }).eq("id", eventId);
  return result;
}
