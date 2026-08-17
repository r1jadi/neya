import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getRaiAcceptClient, RaiAcceptError, type RaiAcceptTransaction } from "@/lib/raiaccept/server";
import { amountToCents } from "@/lib/raiaccept/webhook";

/**
 * Shared RaiAccept refund logic for ticket payments.
 *
 * Single authoritative refund path used by the admin actions:
 *   1. Capacity is claimed atomically on the payment attempt (claim_refund_capacity).
 *   2. POST /orders/{order}/transactions/{purchaseTx}/refund is issued.
 *   3. The resulting refund transaction is verified with the authenticated
 *      GET /orders/{order}/transactions/{refundTx} — a refund is recorded as
 *      succeeded ONLY when transactionType=REFUND, status=SUCCESS, code=0000
 *      and the amount/currency match. The POST response alone is never trusted.
 *   4. Claims are settled only from the verified outcome.
 *
 * Never log credentials, tokens, card data, or full payloads.
 */

export type RefundOutcome = "succeeded" | "requested" | "failed" | "uncertain";

export type RefundVerificationResult = {
  outcome: RefundOutcome;
  transactionId: string | null;
  code: string | null;
  message: string | null;
};

type AttemptRef = {
  id: string;
  provider_order_id: string;
  provider_transaction_id: string | null;
  amount_cents: number;
  currency: string;
};

type RefundRef = {
  id: string;
  provider_order_id: string;
  provider_transaction_id: string | null;
  amount_cents: number;
  currency: string;
};

/** Map a verified RaiAccept transaction to a refund outcome. */
function classifyRefundTransaction(
  tx: RaiAcceptTransaction | undefined,
  amountCents: number,
  currency: string,
): RefundVerificationResult {
  if (!tx) {
    return { outcome: "uncertain", transactionId: null, code: null, message: "no transaction data returned" };
  }
  const txAmountCents = amountToCents(tx.transactionAmount);
  const txCurrency = typeof tx.transactionCurrency === "string" ? tx.transactionCurrency.toUpperCase() : null;
  const amountMatches = txAmountCents === amountCents;
  const currencyMatches = !txCurrency || txCurrency === currency;

  if (tx.transactionType === "REFUND" && tx.status === "SUCCESS" && tx.statusCode === "0000") {
    if (!amountMatches || !currencyMatches) {
      return {
        outcome: "uncertain",
        transactionId: tx.transactionId ?? null,
        code: tx.statusCode ?? null,
        message: `refund transaction amount/currency mismatch (amount=${amountMatches}, currency=${currencyMatches})`,
      };
    }
    return {
      outcome: "succeeded",
      transactionId: tx.transactionId ?? null,
      code: tx.statusCode ?? null,
      message: tx.statusMessage ?? "Success",
    };
  }
  if (tx.status === "FAILED") {
    return {
      outcome: "failed",
      transactionId: tx.transactionId ?? null,
      code: tx.statusCode ?? null,
      message: tx.statusMessage ?? "Refund failed",
    };
  }
  // DRAFT / PENDING — the refund exists but is not confirmed yet.
  return {
    outcome: "requested",
    transactionId: tx.transactionId ?? null,
    code: tx.statusCode ?? null,
    message: tx.statusMessage ?? "Refund pending confirmation",
  };
}

/**
 * Issue a refund against a verified purchase transaction and verify the
 * resulting refund transaction. The refund row must already exist with status
 * 'requested' and capacity must already be claimed on the attempt.
 */
export async function issueAndVerifyRefund(
  admin: ReturnType<typeof createAdminClient>,
  refundId: string,
  attempt: AttemptRef,
  amountCents: number,
): Promise<RefundVerificationResult> {
  const client = getRaiAcceptClient();
  const orderIdentification = attempt.provider_order_id;
  const purchaseTransactionId = attempt.provider_transaction_id;
  if (!purchaseTransactionId) {
    return {
      outcome: "uncertain",
      transactionId: null,
      code: null,
      message: "no verified purchase transaction id on the payment attempt",
    };
  }

  let refundTransactionId: string | null = null;
  try {
    const res = await client.refundTransaction(orderIdentification, purchaseTransactionId, amountCents, attempt.currency);
    refundTransactionId = res.transactionId;
  } catch (err) {
    if (err instanceof RaiAcceptError) {
      if (err.uncertain) {
        // Timeout / 5xx / network — the refund may or may not exist.
        return { outcome: "uncertain", transactionId: null, code: err.providerCode, message: err.providerMessage };
      }
      // Definitive provider rejection (4xx): the refund was not created.
      return { outcome: "failed", transactionId: null, code: err.providerCode, message: err.providerMessage };
    }
    return { outcome: "uncertain", transactionId: null, code: null, message: "unexpected refund error" };
  }

  // Persist the refund transaction id immediately so it can be re-verified.
  await admin
    .from("ticket_refunds")
    .update({ provider_transaction_id: refundTransactionId, updated_at: new Date().toISOString() })
    .eq("id", refundId);

  // Verify the refund transaction — the authenticated GET is the source of truth.
  try {
    const details = await client.getTransaction(orderIdentification, refundTransactionId);
    return classifyRefundTransaction(details.transaction, amountCents, attempt.currency);
  } catch (err) {
    if (err instanceof RaiAcceptError && !err.uncertain && err.httpStatus === 404) {
      // The refund transaction does not exist — the refund was not created.
      return {
        outcome: "failed",
        transactionId: refundTransactionId,
        code: err.providerCode,
        message: "refund transaction not found (404)",
      };
    }
    return {
      outcome: "uncertain",
      transactionId: refundTransactionId,
      code: err instanceof RaiAcceptError ? err.providerCode : null,
      message: "refund verification failed — re-verify later",
    };
  }
}

/**
 * Re-verify an existing requested/uncertain refund (manual "Verify refund"
 * action). Without a provider transaction id, a timed-out POST cannot be
 * safely correlated to a matching historical refund of the same amount, so
 * it stays uncertain for Merchant Portal/provider support reconciliation.
 */
export async function verifyRefundTransaction(
  admin: ReturnType<typeof createAdminClient>,
  refund: RefundRef,
): Promise<RefundVerificationResult> {
  const client = getRaiAcceptClient();

  if (refund.provider_transaction_id) {
    try {
      const details = await client.getTransaction(refund.provider_order_id, refund.provider_transaction_id);
      return classifyRefundTransaction(details.transaction, refund.amount_cents, refund.currency);
    } catch (err) {
      if (err instanceof RaiAcceptError && !err.uncertain && err.httpStatus === 404) {
        return {
          outcome: "failed",
          transactionId: refund.provider_transaction_id,
          code: err.providerCode,
          message: "refund transaction not found (404)",
        };
      }
      return {
        outcome: "uncertain",
        transactionId: refund.provider_transaction_id,
        code: err instanceof RaiAcceptError ? err.providerCode : null,
        message: "refund verification failed — re-verify later",
      };
    }
  }

  return {
    outcome: "uncertain",
    transactionId: null,
    code: null,
    message: "refund request has no provider transaction id; reconcile with RaiAccept support",
  };
}

type AttemptSettle = {
  id: string;
  amount_cents: number;
  currency: string;
  refunded_amount_cents: number;
  refund_pending_cents: number;
};

type OrderSettle = {
  id: string;
  payment_status: string;
  status: string;
};

/**
 * Apply a verified refund outcome to the database: settle the capacity claim,
 * update the refund row and the payment attempt, and — only for fully refunded
 * paid orders — mark the ticket order refunded. A late-payment order stays
 * cancelled: it is never marked paid and its ticket is never issued.
 */
export async function applyRefundOutcome(
  admin: ReturnType<typeof createAdminClient>,
  refundId: string,
  amountCents: number,
  attempt: AttemptSettle,
  order: OrderSettle,
  result: RefundVerificationResult,
): Promise<void> {
  const now = new Date().toISOString();

  if (result.outcome === "succeeded") {
    // Move the claim from pending to refunded (row-locked, idempotent).
    await admin.rpc("settle_refund_capacity", {
      p_attempt_id: attempt.id,
      p_amount_cents: amountCents,
      p_succeeded: true,
    });
    await admin
      .from("ticket_refunds")
      .update({
        status: "succeeded",
        provider_transaction_id: result.transactionId,
        provider_status_code: result.code,
        provider_status_message: result.message,
        updated_at: now,
      })
      .eq("id", refundId);

    // Reload the attempt to read the settled totals.
    const { data: settled } = await admin
      .from("ticket_payment_attempts")
      .select("refunded_amount_cents, amount_cents")
      .eq("id", attempt.id)
      .maybeSingle();

    const fullyRefunded = !!settled && settled.refunded_amount_cents >= settled.amount_cents;
    const wasPaidOrder = order.payment_status === "paid";

    await admin
      .from("ticket_payment_attempts")
      .update({
        status: fullyRefunded ? "refunded" : "paid",
        provider_status_code: result.code,
        provider_status_message: result.message ?? (wasPaidOrder ? "Refunded" : "Refunded (late payment after cancel)"),
        updated_at: now,
      })
      .eq("id", attempt.id);

    if (fullyRefunded && wasPaidOrder) {
      // The ticket was issued and is now fully refunded. Never touch a
      // late-payment order (it was never paid/issued in NEYA).
      await admin
        .from("ticket_orders")
        .update({ payment_status: "refunded", status: "refunded" })
        .eq("id", order.id)
        .eq("payment_status", "paid");
    }
    return;
  }

  if (result.outcome === "failed") {
    // Definitive failure — release the capacity claim.
    await admin.rpc("settle_refund_capacity", {
      p_attempt_id: attempt.id,
      p_amount_cents: amountCents,
      p_succeeded: false,
    });
    await admin
      .from("ticket_refunds")
      .update({
        status: "failed",
        provider_transaction_id: result.transactionId,
        provider_status_code: result.code,
        provider_status_message: result.message,
        updated_at: now,
      })
      .eq("id", refundId);
    return;
  }

  if (result.outcome === "requested") {
    // The refund exists at the provider but is not confirmed yet — the claim
    // stays held; the admin can re-verify later.
    await admin
      .from("ticket_refunds")
      .update({
        provider_transaction_id: result.transactionId,
        provider_status_code: result.code,
        provider_status_message: result.message,
        updated_at: now,
      })
      .eq("id", refundId);
    return;
  }

  // Uncertain — the claim stays held and the refund stays visible for
  // verification/reconciliation. Record the safe reason only.
  await admin
    .from("ticket_refunds")
    .update({
      status: "uncertain",
      provider_transaction_id: result.transactionId,
      provider_status_code: result.code,
      provider_status_message: result.message,
      updated_at: now,
    })
    .eq("id", refundId);
}
