"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/require-admin";
import {
  getRaiAcceptClient,
  isProductionEnvironment,
  RaiAcceptError,
  type RaiAcceptOrderDetails,
} from "@/lib/raiaccept/server";
import { amountToCents } from "@/lib/raiaccept/webhook";
import { handleVerifiedPaid, handleVerifiedTerminal, type Notification } from "@/lib/raiaccept/webhook";
import {
  applyRefundOutcome,
  issueAndVerifyRefund,
  verifyRefundTransaction,
} from "@/lib/raiaccept/refunds";

/**
 * Admin-only RaiAccept ticket payment operations.
 *
 * Every action calls requireAdminUser() first, reads authoritative values
 * from the database through the service role, and never trusts client-supplied
 * provider ids/amounts/statuses. Refunds are confirmed only against the
 * authenticated RaiAccept transaction/order responses (see lib/raiaccept/refunds.ts).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** RaiAccept order ids look like D-001-ORD-3833f9de-... */
const PROVIDER_ORDER_ID_RE = /^[A-Za-z0-9-]{8,128}$/;

function rp(params: string): never {
  redirect(`/admin/ticket-payments?${params}`);
}

function safeAmountCents(raw: FormDataEntryValue | null): number | null {
  const n = Number(String(raw ?? "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  const cents = Math.round(n * 100);
  return cents > 0 ? cents : null;
}

/**
 * Issue a refund against a verified RaiAccept ticket purchase.
 * Flow: admin authz → load attempt/order (authoritative) → verify the
 * purchase at the provider → atomic capacity claim → record the refund row →
 * POST refund → verify the REFUND transaction → settle + persist.
 */
export async function refundTicketPayment(formData: FormData) {
  await requireAdminUser();

  const attemptId = String(formData.get("attempt_id") ?? "").trim();
  const amountCents = safeAmountCents(formData.get("amount"));
  if (!UUID_RE.test(attemptId) || amountCents === null) rp("error=invalid");

  const admin = createAdminClient();

  const { data: attempt } = await admin
    .from("ticket_payment_attempts")
    .select(
      "id, ticket_order_id, provider, provider_order_id, provider_transaction_id, amount_cents, currency, refunded_amount_cents, refund_pending_cents",
    )
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt || attempt.provider !== "raiaccept") rp("error=missing");
  if (!attempt.provider_order_id || !attempt.provider_transaction_id) rp("error=missing_provider_ids");

  const { data: order } = await admin
    .from("ticket_orders")
    .select("id, payment_provider, payment_status, status, amount_cents, currency, merchant_order_reference")
    .eq("id", attempt.ticket_order_id)
    .maybeSingle();
  if (!order || order.payment_provider !== "raiaccept") rp("error=not_raiaccept");
  if (attempt.amount_cents !== order.amount_cents || attempt.currency !== order.currency) rp("error=purchase_unverified");

  // 1. Verify the original payment at the provider (one authoritative path).
  const client = getRaiAcceptClient();
  let raiOrder: RaiAcceptOrderDetails;
  try {
    raiOrder = await client.getOrder(attempt.provider_order_id);
  } catch (err) {
    console.error("[neya] refund: provider order verification failed", {
      orderId: order.id,
      merchantOrderReference: order.merchant_order_reference,
      orderIdentification: attempt.provider_order_id,
      phase: err instanceof RaiAcceptError ? err.phase : "unknown",
      httpStatus: err instanceof RaiAcceptError ? err.httpStatus : null,
    });
    rp("error=provider_unavailable");
  }
  if (typeof raiOrder.isProduction === "boolean" && raiOrder.isProduction !== isProductionEnvironment()) {
    rp("error=env_mismatch");
  }
  // RaiAccept changes the order state after a partial refund. The original
  // purchase remains refundable in both states, but no other provider state
  // is sufficient proof that it was paid.
  if (raiOrder.status !== "PAID" && raiOrder.status !== "PARTIALLY_REFUNDED") rp("error=not_paid");

  let transactions;
  try {
    transactions = await client.getTransactions(attempt.provider_order_id);
  } catch (err) {
    console.error("[neya] refund: provider transactions verification failed", {
      orderId: order.id,
      orderIdentification: attempt.provider_order_id,
      phase: err instanceof RaiAcceptError ? err.phase : "unknown",
    });
    rp("error=provider_unavailable");
  }

  // The purchase transaction must be a verified successful PURCHASE.
  const purchase =
    transactions.find(
      (t) =>
        t.transactionId === attempt.provider_transaction_id &&
        t.transactionType === "PURCHASE" &&
        t.status === "SUCCESS" &&
        t.statusCode === "0000",
    ) ??
    transactions.find(
      (t) =>
        t.transactionType === "PURCHASE" &&
        t.status === "SUCCESS" &&
        t.statusCode === "0000" &&
        amountToCents(t.transactionAmount) === order.amount_cents,
    );
  if (!purchase) rp("error=purchase_unverified");
  if (
    amountToCents(purchase.transactionAmount) !== order.amount_cents ||
    (purchase.transactionCurrency ?? "").toUpperCase() !== (order.currency ?? "").toUpperCase() ||
    amountToCents(raiOrder.invoice?.amount) !== order.amount_cents ||
    (raiOrder.invoice?.currency ?? "").toUpperCase() !== (order.currency ?? "").toUpperCase() ||
    raiOrder.invoice?.merchantOrderReference !== order.merchant_order_reference
  ) {
    rp("error=purchase_unverified");
  }

  // Persist the verified purchase transaction id (may correct an earlier gap).
  if (attempt.provider_transaction_id !== purchase.transactionId && purchase.transactionId) {
    await admin
      .from("ticket_payment_attempts")
      .update({ provider_transaction_id: purchase.transactionId, updated_at: new Date().toISOString() })
      .eq("id", attempt.id);
    attempt.provider_transaction_id = purchase.transactionId;
  }

  // 2. NEYA-side eligibility.
  const isPaidOrder = order.payment_status === "paid";
  const isLatePayment =
    (order.payment_status === "cancelled" || order.payment_status === "failed") && order.status !== "paid";
  if (!isPaidOrder && !isLatePayment) rp("error=not_refundable");

  const remaining =
    attempt.amount_cents - attempt.refunded_amount_cents - attempt.refund_pending_cents;
  if (amountCents > remaining) rp("error=exceeds_remaining");

  // 3. Atomic capacity claim — concurrent refunds can never over-refund.
  const { data: claimed, error: claimError } = await admin.rpc("claim_refund_capacity", {
    p_attempt_id: attempt.id,
    p_amount_cents: amountCents,
  });
  if (claimError || claimed !== true) rp("error=exceeds_remaining");

  // 4. Record the refund request.
  const { data: refundRow, error: refundInsertError } = await admin
    .from("ticket_refunds")
    .insert({
      ticket_order_id: order.id,
      payment_attempt_id: attempt.id,
      provider: "raiaccept",
      provider_order_id: attempt.provider_order_id,
      amount_cents: amountCents,
      currency: attempt.currency,
      status: "requested",
    })
    .select("id")
    .single();
  if (refundInsertError || !refundRow) {
    await admin.rpc("settle_refund_capacity", {
      p_attempt_id: attempt.id,
      p_amount_cents: amountCents,
      p_succeeded: false,
    });
    rp("error=db");
  }

  // 5. Issue + verify + settle.
  const result = await issueAndVerifyRefund(admin, refundRow.id, attempt, amountCents);
  await applyRefundOutcome(admin, refundRow.id, amountCents, attempt, order, result);

  revalidatePath("/admin/ticket-payments");
  rp(`ok=1&result=${encodeURIComponent(result.outcome)}`);
}

/**
 * Re-verify a requested/uncertain refund against RaiAccept and settle it.
 * Used after provider timeouts or pending refunds.
 */
export async function verifyTicketRefund(formData: FormData) {
  await requireAdminUser();

  const refundId = String(formData.get("refund_id") ?? "").trim();
  if (!UUID_RE.test(refundId)) rp("error=invalid");

  const admin = createAdminClient();

  const { data: refund } = await admin
    .from("ticket_refunds")
    .select(
      "id, ticket_order_id, payment_attempt_id, provider, provider_order_id, provider_transaction_id, amount_cents, currency, status",
    )
    .eq("id", refundId)
    .maybeSingle();
  if (!refund || refund.provider !== "raiaccept" || !refund.provider_order_id) rp("error=missing");
  if (refund.status !== "requested" && refund.status !== "uncertain") rp("error=not_refundable");

  const { data: attempt } = await admin
    .from("ticket_payment_attempts")
    .select(
      "id, provider_order_id, provider_transaction_id, amount_cents, currency, refunded_amount_cents, refund_pending_cents",
    )
    .eq("id", refund.payment_attempt_id)
    .maybeSingle();
  if (!attempt) rp("error=missing");

  const { data: order } = await admin
    .from("ticket_orders")
    .select("id, payment_status, status")
    .eq("id", refund.ticket_order_id)
    .maybeSingle();
  if (!order) rp("error=missing");

  const result = await verifyRefundTransaction(admin, refund);
  await applyRefundOutcome(admin, refund.id, refund.amount_cents, attempt, order, result);

  revalidatePath("/admin/ticket-payments");
  rp(`ok=1&result=${encodeURIComponent(result.outcome)}`);
}

/**
 * Manual resolution for RaiAccept orders whose provider_order_id was never
 * persisted (timeout after POST /orders — automatic reconciliation cannot
 * look these up because RaiAccept has no lookup-by-merchant-reference endpoint).
 *
 * The admin supplies the RaiAccept order id (from the Merchant portal /
 * support). The order is fetched through the authenticated API, verified
 * against the NEYA order (reference, amount, currency, environment), and only
 * then finalized through the exact same shared path as the webhook and the
 * reconciliation sweep. A mismatching order is never finalized.
 */
export async function resolveMissingProviderOrder(formData: FormData) {
  await requireAdminUser();

  const orderId = String(formData.get("order_id") ?? "").trim();
  const providerOrderId = String(formData.get("provider_order_id") ?? "").trim();
  if (!UUID_RE.test(orderId)) rp("error=invalid");
  if (!PROVIDER_ORDER_ID_RE.test(providerOrderId)) rp("error=invalid_provider_id");

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("ticket_orders")
    .select(
      "id, ticket_id, user_id, quantity, amount_cents, currency, merchant_order_reference, payment_provider, payment_status, status, inventory_released",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.payment_provider !== "raiaccept") rp("error=not_raiaccept");
  if (order.payment_status !== "pending" && order.payment_status !== "processing") {
    rp("error=not_resolvable");
  }

  const { data: attempt } = await admin
    .from("ticket_payment_attempts")
    .select("id, provider_order_id, provider_transaction_id")
    .eq("ticket_order_id", order.id)
    .eq("provider", "raiaccept")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!attempt) rp("error=missing");

  const client = getRaiAcceptClient();
  let raiOrder: RaiAcceptOrderDetails;
  try {
    raiOrder = await client.getOrder(providerOrderId);
  } catch (err) {
    const httpStatus = err instanceof RaiAcceptError ? err.httpStatus : null;
    if (httpStatus === 404) rp("error=provider_not_found");
    console.error("[neya] resolve: provider order lookup failed", {
      orderId: order.id,
      merchantOrderReference: order.merchant_order_reference,
      orderIdentification: providerOrderId,
      httpStatus,
    });
    rp("error=provider_unavailable");
  }

  if (typeof raiOrder.isProduction === "boolean" && raiOrder.isProduction !== isProductionEnvironment()) {
    rp("error=env_mismatch");
  }

  // Verify identity, reference, amount and currency before anything else.
  const idMatches = raiOrder.orderIdentification === providerOrderId;
  const referenceMatches = raiOrder.invoice?.merchantOrderReference === order.merchant_order_reference;
  const amountMatches = amountToCents(raiOrder.invoice?.amount) === order.amount_cents;
  const currencyMatches =
    (raiOrder.invoice?.currency ?? "").toUpperCase() === (order.currency ?? "").toUpperCase();
  if (!idMatches || !referenceMatches || !amountMatches || !currencyMatches) {
    rp(
      `error=mismatch&detail=${encodeURIComponent(
        `id=${idMatches}, reference=${referenceMatches}, amount=${amountMatches}, currency=${currencyMatches}`,
      )}`,
    );
  }

  // Link the attempt to the provider order so future webhooks/reconciliation
  // match it, before any state transition.
  await admin
    .from("ticket_payment_attempts")
    .update({ provider_order_id: providerOrderId, updated_at: new Date().toISOString() })
    .eq("id", attempt.id);

  const finalStatus = typeof raiOrder.status === "string" ? raiOrder.status : "";

  if (finalStatus === "PAID") {
    let transactions;
    try {
      transactions = await client.getTransactions(providerOrderId);
    } catch (err) {
      console.error("[neya] resolve: transactions lookup failed", {
        orderId: order.id,
        orderIdentification: providerOrderId,
        phase: err instanceof RaiAcceptError ? err.phase : "unknown",
      });
      rp("error=provider_unavailable");
    }
    const purchase = transactions.find(
      (t) =>
        t.transactionType === "PURCHASE" &&
        t.status === "SUCCESS" &&
        t.statusCode === "0000" &&
        amountToCents(t.transactionAmount) === order.amount_cents,
    );
    if (!purchase) rp("error=paid_without_purchase");

    await admin
      .from("ticket_payment_attempts")
      .update({ provider_transaction_id: purchase.transactionId ?? null, updated_at: new Date().toISOString() })
      .eq("id", attempt.id);

    const notification: Notification = {
      transactionId: purchase.transactionId ?? "",
      transactionType: "PURCHASE",
      transactionStatus: "SUCCESS",
      transactionStatusCode: purchase.statusCode ?? null,
      transactionStatusMessage: purchase.statusMessage ?? null,
      transactionAmountCents: amountToCents(purchase.transactionAmount),
      transactionCurrency: (purchase.transactionCurrency ?? "").toUpperCase() || null,
      orderIdentification: providerOrderId,
      merchantOrderReference: order.merchant_order_reference,
    };
    const outcome = await handleVerifiedPaid(admin, null, order, attempt.id, notification, raiOrder);
    revalidatePath("/admin/ticket-payments");
    rp(`ok=1&result=${encodeURIComponent(outcome)}`);
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
      orderIdentification: providerOrderId,
      merchantOrderReference: order.merchant_order_reference,
    };
    const outcome = await handleVerifiedTerminal(admin, null, order, attempt.id, notification, kind);
    revalidatePath("/admin/ticket-payments");
    rp(`ok=1&result=${encodeURIComponent(outcome)}`);
  }

  revalidatePath("/admin/ticket-payments");
  if (finalStatus === "DRAFT" || finalStatus === "CHECKOUT") rp("ok=1&result=in_progress");
  if (finalStatus === "PARTIALLY_REFUNDED" || finalStatus === "FULLY_REFUNDED") rp("ok=1&result=refund_state");
  rp("ok=1&result=unknown_status");
}
