import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getRaiAcceptClient,
  isProductionEnvironment,
  RaiAcceptError,
  type RaiAcceptTransaction,
} from "@/lib/raiaccept/server";
import {
  amountToCents,
  handleVerifiedPaid,
  handleVerifiedTerminal,
  markEvent,
  notificationFromPayload,
  processNotification,
  updateAttempt,
  type Notification,
} from "@/lib/raiaccept/webhook";

/**
 * Reconciliation sweep for unresolved RaiAccept ticket payments.
 *
 * The ONLY authority for RaiAccept payment state is the authenticated
 * GET /orders/{orderIdentification} response (plus, for order-level recovery,
 * the documented Retrieve all transactions endpoint). The sweep NEVER infers
 * payment from age, checkout sessions, redirects, or local state, and it
 * reuses the exact verified completion/release path as the webhook.
 *
 * The sweep is safe to run repeatedly and concurrently: every state change
 * goes through the row-locked idempotent RPCs, and unprocessed webhook events
 * are finalized by the same processor that handles live notifications.
 */

/** Events older than this and still unprocessed are retried by the sweep. */
const EVENT_GRACE_MS = 5 * 60_000;
/** Orders older than this in a non-terminal state are examined by the sweep. */
const ORDER_AGE_MS = 30 * 60_000;
/** A checkout hold is temporary. RaiAccept may leave a closed browser session
 * in CHECKOUT without sending a terminal callback, so it must not lock a
 * customer's inventory indefinitely. */
const CHECKOUT_HOLD_MS = 5 * 60_000;
/** Bounded work per sweep so RaiAccept is never hammered. */
const DEFAULT_MAX_EVENTS = 50;
const DEFAULT_MAX_ORDERS = 50;

export type ReconciliationReport = {
  eventsProcessed: number;
  ordersProcessed: number;
  unresolvedNoProviderId: number;
  outcomes: Record<string, number>;
  errors: number;
};

type Limits = { maxEvents?: number; maxOrders?: number };

export async function reconcileRaiAcceptTicketPayments(
  admin: ReturnType<typeof createAdminClient>,
  limits?: Limits,
): Promise<ReconciliationReport> {
  const report: ReconciliationReport = {
    eventsProcessed: 0,
    ordersProcessed: 0,
    unresolvedNoProviderId: 0,
    outcomes: {},
    errors: 0,
  };
  const tally = (outcome: string) => {
    report.outcomes[outcome] = (report.outcomes[outcome] ?? 0) + 1;
  };

  await reconcileUnprocessedEvents(admin, report, tally, limits?.maxEvents ?? DEFAULT_MAX_EVENTS);
  await reconcileStuckOrders(admin, report, tally, limits?.maxOrders ?? DEFAULT_MAX_ORDERS);

  return report;
}

/**
 * Reconcile one known RaiAccept ticket order immediately. This is used before
 * a user starts another checkout (and when RaiAccept returns them to NEYA),
 * so an ABANDONED provider order cannot wait for the scheduled sweep and keep
 * inventory locked. The provider order is always fetched and verified first.
 */
export async function reconcileRaiAcceptTicketOrder(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string,
): Promise<string> {
  const { data: order, error } = await admin
    .from("ticket_orders")
    .select(
      "id, amount_cents, currency, merchant_order_reference, payment_status, status, inventory_released, created_at",
    )
    .eq("id", orderId)
    .eq("payment_provider", "raiaccept")
    .in("payment_status", ["pending", "processing"])
    .maybeSingle();
  if (error) throw new Error("Could not load ticket payment for reconciliation");
  if (!order) return "not_active";
  return reconcileOneOrder(admin, order);
}

/**
 * A. Retry webhook events that were received but never processed (e.g. the
 *    live handler crashed or the provider API was down). Uses the exact same
 *    verified processing as the live webhook.
 */
async function reconcileUnprocessedEvents(
  admin: ReturnType<typeof createAdminClient>,
  report: ReconciliationReport,
  tally: (outcome: string) => void,
  maxEvents: number,
) {
  const cutoff = new Date(Date.now() - EVENT_GRACE_MS).toISOString();
  const { data: events, error } = await admin
    .from("ticket_payment_webhook_events")
    .select("id, payload")
    .is("processed_at", null)
    .lt("received_at", cutoff)
    .order("received_at", { ascending: true })
    .limit(maxEvents);

  if (error) {
    console.error("[neya] RaiAccept reconciliation: could not load unprocessed events", error.message);
    report.errors += 1;
    return;
  }

  for (const event of events ?? []) {
    report.eventsProcessed += 1;
    try {
      const notification = notificationFromPayload(event.payload);
      if (!notification) {
        // Malformed stored payload — mark processed so it does not loop forever.
        await markEvent(admin, event.id, "invalid_payload", "stored payload is not a valid notification");
        tally("invalid_payload");
        continue;
      }
      const outcome = await processNotification(admin, event.id, notification);
      tally(outcome);
    } catch (err) {
      report.errors += 1;
      console.error("[neya] RaiAccept reconciliation: event processing failed", {
        eventId: event.id,
        error: err instanceof Error ? err.message : "unknown",
      });
      try {
        await markEvent(admin, event.id, "error", "reconciliation processing error");
      } catch {
        // The event stays unprocessed — the next sweep retries it.
      }
    }
  }
}

/**
 * B. Examine RaiAccept ticket orders stuck in a non-terminal state.
 *    Orders whose provider order id is missing are NEVER released (a provider
 *    order may exist that we cannot look up — there is no documented
 *    lookup-by-merchant-reference endpoint); they are counted and left
 *    visible for operations.
 */
async function reconcileStuckOrders(
  admin: ReturnType<typeof createAdminClient>,
  report: ReconciliationReport,
  tally: (outcome: string) => void,
  maxOrders: number,
) {
  const cutoff = new Date(Date.now() - ORDER_AGE_MS).toISOString();
  const { data: orders, error } = await admin
    .from("ticket_orders")
    .select(
      "id, amount_cents, currency, merchant_order_reference, payment_status, status, inventory_released, created_at",
    )
    .eq("payment_provider", "raiaccept")
    .in("payment_status", ["pending", "processing"])
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(maxOrders);

  if (error) {
    console.error("[neya] RaiAccept reconciliation: could not load stuck orders", error.message);
    report.errors += 1;
    return;
  }

  for (const order of orders ?? []) {
    report.ordersProcessed += 1;
    try {
      const outcome = await reconcileOneOrder(admin, order);
      if (outcome === "__no_provider_id__") {
        report.unresolvedNoProviderId += 1;
        continue;
      }
      tally(outcome);
    } catch (err) {
      report.errors += 1;
      console.error("[neya] RaiAccept reconciliation: order processing failed", {
        orderId: order.id,
        merchantOrderReference: order.merchant_order_reference,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }
}

type StuckOrder = {
  id: string;
  amount_cents: number | null;
  currency: string | null;
  merchant_order_reference: string;
  payment_status: string;
  status: string;
  inventory_released: boolean;
  created_at: string;
};

async function reconcileOneOrder(
  admin: ReturnType<typeof createAdminClient>,
  order: StuckOrder,
): Promise<string> {
  // Latest RaiAccept attempt for this order.
  const { data: attempt } = await admin
    .from("ticket_payment_attempts")
    .select("id, status, provider_order_id, provider_transaction_id, checkout_session_id")
    .eq("ticket_order_id", order.id)
    .eq("provider", "raiaccept")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!attempt || !attempt.provider_order_id) {
    // The provider order id was never persisted (e.g. a timeout after
    // POST /orders). There is no documented RaiAccept endpoint to look up an
    // order by merchantOrderReference, so we cannot prove whether the order
    // exists. Never release — keep the order visible for operations.
    console.error("[neya] RaiAccept reconciliation: unresolved order without provider order id", {
      orderId: order.id,
      merchantOrderReference: order.merchant_order_reference,
      attemptStatus: attempt?.status ?? "none",
    });
    return "__no_provider_id__";
  }

  const client = getRaiAcceptClient();
  let raiOrder;
  let transactions: RaiAcceptTransaction[] = [];
  try {
    raiOrder = await client.getOrder(attempt.provider_order_id);
    if (raiOrder.status === "PAID") {
      transactions = await client.getTransactions(attempt.provider_order_id);
    }
  } catch (err) {
    const phase = err instanceof RaiAcceptError ? err.phase : "unknown";
    const httpStatus = err instanceof RaiAcceptError ? err.httpStatus : null;
    console.error("[neya] RaiAccept reconciliation: provider lookup failed", {
      orderId: order.id,
      merchantOrderReference: order.merchant_order_reference,
      orderIdentification: attempt.provider_order_id,
      phase,
      httpStatus,
    });
    if (httpStatus === 404 && !attempt.checkout_session_id) {
      // Provider says the order does not exist AND no payment form was ever
      // generated (no checkout session), so the customer could not have paid.
      // This proves the order was never charged — releasing is safe.
      await releaseNeverCreatedOrder(admin, order, attempt.id, attempt.provider_order_id);
      return "provider_not_found_released";
    }
    // Transient (5xx/timeout) or config (401/403) or a 404 WITH a checkout
    // session (contradictory — a payment form was issued) — leave unresolved.
    return "provider_lookup_unresolved";
  }

  // Environment check — never reconcile across sandbox/production.
  if (typeof raiOrder.isProduction === "boolean" && raiOrder.isProduction !== isProductionEnvironment()) {
    console.error("[neya] RaiAccept reconciliation: environment mismatch", {
      orderId: order.id,
      merchantOrderReference: order.merchant_order_reference,
      orderIdentification: attempt.provider_order_id,
      isProduction: raiOrder.isProduction,
    });
    return "environment_mismatch";
  }

  const finalStatus = typeof raiOrder.status === "string" ? raiOrder.status : "";

  if (finalStatus === "PAID") {
    // Mirror the webhook's PURCHASE/SUCCESS/0000 verification using the
    // documented transactions endpoint.
    const purchase = transactions.find(
      (t) => t.transactionType === "PURCHASE" && t.status === "SUCCESS",
    );
    if (!purchase) {
      console.error("[neya] RaiAccept reconciliation: PAID without verified PURCHASE transaction", {
        orderId: order.id,
        merchantOrderReference: order.merchant_order_reference,
        orderIdentification: attempt.provider_order_id,
      });
      return "paid_without_purchase_tx";
    }
    const notification: Notification = {
      transactionId: purchase.transactionId ?? attempt.provider_transaction_id ?? "",
      transactionType: "PURCHASE",
      transactionStatus: "SUCCESS",
      transactionStatusCode: purchase.statusCode ?? null,
      transactionStatusMessage: purchase.statusMessage ?? null,
      transactionAmountCents: amountToCents(purchase.transactionAmount),
      transactionCurrency:
        typeof purchase.transactionCurrency === "string" ? purchase.transactionCurrency.toUpperCase() : null,
      orderIdentification: attempt.provider_order_id,
      merchantOrderReference: order.merchant_order_reference,
    };
    return handleVerifiedPaid(admin, null, order, attempt.id, notification, raiOrder);
  }

  if (finalStatus === "FAILED" || finalStatus === "CANCELED" || finalStatus === "ABANDONED") {
    const kind = finalStatus === "FAILED" ? "failed" : "cancelled";
    const notification: Notification = {
      transactionId: attempt.provider_transaction_id ?? "",
      transactionType: "",
      transactionStatus: "",
      transactionStatusCode: null,
      transactionStatusMessage: null,
      transactionAmountCents: null,
      transactionCurrency: null,
      orderIdentification: attempt.provider_order_id,
      merchantOrderReference: order.merchant_order_reference,
    };
    return handleVerifiedTerminal(admin, null, order, attempt.id, notification, kind);
  }

  if (finalStatus === "PARTIALLY_REFUNDED" || finalStatus === "FULLY_REFUNDED") {
    await updateAttempt(admin, attempt.id, {
      provider_status_code: null,
      provider_status_message: `reconciliation: RaiAccept order is ${finalStatus}`,
    });
    return "refund_state";
  }

  if (finalStatus === "DRAFT" || finalStatus === "CHECKOUT") {
    // A freshly-created payment form can still be paid. Once the bounded hold
    // expires, release it through the same idempotent RPC used for verified
    // terminal provider states. A late payment is still detected by the
    // verified PAID flow and remains visible for reconciliation/refund.
    if (finalStatus === "CHECKOUT" && Date.now() - new Date(order.created_at).getTime() >= CHECKOUT_HOLD_MS) {
      await releaseExpiredCheckout(admin, order, attempt.id, attempt.provider_order_id);
      return "checkout_hold_expired";
    }
    return "in_progress";
  }

  await updateAttempt(admin, attempt.id, {
    provider_status_code: null,
    provider_status_message: `reconciliation: unmapped RaiAccept order status ${finalStatus}`,
  });
  return "unknown_status";
}

async function releaseExpiredCheckout(
  admin: ReturnType<typeof createAdminClient>,
  order: { id: string },
  attemptId: string,
  orderIdentification: string,
) {
  const { error: releaseError } = await admin.rpc("release_ticket_order", { p_order_id: order.id });
  if (releaseError) {
    throw new Error(`Could not release expired RaiAccept checkout ${orderIdentification}`);
  }
  await admin
    .from("ticket_payment_attempts")
    .update({
      status: "cancelled",
      provider_status_message: "NEYA checkout hold expired while RaiAccept remained CHECKOUT; inventory released",
      updated_at: new Date().toISOString(),
    })
    .eq("id", attemptId)
    .in("status", ["pending", "processing"]);
}

/**
 * Provider returned 404 for the order id and no checkout session was ever
 * created (no payment form was issued, so no charge could have occurred).
 * Release the reservation through the safe idempotent RPC. A concurrent
 * verified PAID always wins (the RPC row-locks the order and refuses paid
 * orders; the attempt update only applies to non-terminal attempts).
 */
async function releaseNeverCreatedOrder(
  admin: ReturnType<typeof createAdminClient>,
  order: { id: string },
  attemptId: string,
  orderIdentification: string,
) {
  const { error: releaseError } = await admin.rpc("release_ticket_order", { p_order_id: order.id });
  if (releaseError) {
    console.error("[neya] RaiAccept reconciliation: release failed for provider-not-found order", {
      orderId: order.id,
      orderIdentification,
      error: releaseError.message,
    });
    return;
  }
  const { data: after } = await admin
    .from("ticket_orders")
    .select("payment_status")
    .eq("id", order.id)
    .maybeSingle();
  if (after?.payment_status === "paid") {
    console.error("[neya] RaiAccept reconciliation: order paid while releasing provider-not-found order", {
      orderId: order.id,
      orderIdentification,
    });
    return;
  }
  await admin
    .from("ticket_payment_attempts")
    .update({
      status: "cancelled",
      provider_status_message: "reconciliation: provider order not found (404), no checkout session was created",
      updated_at: new Date().toISOString(),
    })
    .eq("id", attemptId)
    .in("status", ["pending", "processing"]);
}
