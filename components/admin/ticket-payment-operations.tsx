"use client";

import { useState } from "react";
import {
  refundTicketPayment,
  resolveMissingProviderOrder,
  verifyTicketRefund,
} from "@/actions/admin-ticket-payments";

export type TicketPaymentOperationRow = {
  id: string;
  merchantReference: string;
  ticketLabel: string;
  customer: string;
  provider: string | null;
  paymentStatus: string;
  orderStatus: string;
  attemptId: string | null;
  attemptStatus: string | null;
  providerOrderId: string | null;
  providerTransactionId: string | null;
  amountCents: number;
  refundedCents: number;
  pendingRefundCents: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  latePayment: boolean;
  unresolved: boolean;
  error: string | null;
  history: Array<{ receivedAt: string; processedAt: string | null; result: string | null; error: string | null; transactionId: string | null; transactionType: string | null; status: string | null; statusCode: string | null; environment: string | null }>;
  refunds: Array<{ id: string; transactionId: string | null; amountCents: number; currency: string; status: string; code: string | null; message: string | null; createdAt: string; updatedAt: string }>;
};

type Filters = { provider?: string; paymentStatus?: string; attemptStatus?: string; problem?: string; refundStatus?: string };

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(cents / 100);
}

export function TicketPaymentOperations({ rows, filters }: { rows: TicketPaymentOperationRow[]; filters: Filters }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const filtered = rows.filter((row) => {
    if (filters.provider && row.provider !== filters.provider) return false;
    if (filters.paymentStatus && row.paymentStatus !== filters.paymentStatus) return false;
    if (filters.attemptStatus && row.attemptStatus !== filters.attemptStatus) return false;
    if (filters.refundStatus && !row.refunds.some((refund) => refund.status === filters.refundStatus)) return false;
    if (filters.problem === "attention" && !(row.latePayment || row.unresolved || row.paymentStatus === "failed" || row.refunds.some((r) => r.status === "uncertain"))) return false;
    if (filters.problem === "late" && !row.latePayment) return false;
    if (filters.problem === "reconciliation" && !row.unresolved) return false;
    if (filters.problem === "refundable" && row.amountCents - row.refundedCents - row.pendingRefundCents <= 0) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm">
        <select name="provider" defaultValue={filters.provider ?? ""} className="rounded-lg bg-black/30 px-2 py-1.5"><option value="">All providers</option><option value="raiaccept">RaiAccept</option><option value="stripe">Stripe</option></select>
        <select name="paymentStatus" defaultValue={filters.paymentStatus ?? ""} className="rounded-lg bg-black/30 px-2 py-1.5"><option value="">All payment states</option><option value="pending">Pending</option><option value="processing">Processing</option><option value="paid">Paid</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option><option value="refunded">Refunded</option></select>
        <select name="attemptStatus" defaultValue={filters.attemptStatus ?? ""} className="rounded-lg bg-black/30 px-2 py-1.5"><option value="">All attempt states</option><option value="pending">Pending</option><option value="processing">Processing</option><option value="paid">Paid</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option><option value="refunded">Refunded</option></select>
        <select name="problem" defaultValue={filters.problem ?? ""} className="rounded-lg bg-black/30 px-2 py-1.5"><option value="">All categories</option><option value="attention">Needs attention</option><option value="late">Late payment / refund required</option><option value="reconciliation">Pending reconciliation</option><option value="refundable">Refundable</option></select>
        <select name="refundStatus" defaultValue={filters.refundStatus ?? ""} className="rounded-lg bg-black/30 px-2 py-1.5"><option value="">All refund states</option><option value="requested">Requested</option><option value="uncertain">Uncertain</option><option value="failed">Failed</option><option value="succeeded">Succeeded</option></select>
        <button className="rounded-lg bg-white px-3 py-1.5 font-medium text-black">Filter</button>
      </form>

      <p className="text-sm text-white/55">{filtered.length} ticket payment{filtered.length === 1 ? "" : "s"}. Problem cases are shown first.</p>
      {filtered.map((row) => {
        const remaining = row.amountCents - row.refundedCents - row.pendingRefundCents;
        const canRefund = row.provider === "raiaccept" && !!row.attemptId && !!row.providerOrderId && !!row.providerTransactionId && remaining > 0 && (row.paymentStatus === "paid" || row.latePayment);
        const canResolve = row.provider === "raiaccept" && !!row.attemptId && !row.providerOrderId && (row.paymentStatus === "pending" || row.paymentStatus === "processing");
        return <article key={row.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="font-medium text-white">{row.ticketLabel}</p><p className="mt-1 font-mono text-xs text-white/55">{row.id} · {row.merchantReference}</p><p className="mt-1 text-white/55">{row.customer}</p></div>
            <div className="text-right text-xs text-white/65"><p>{row.provider ?? "unassigned"} · {row.paymentStatus} · attempt {row.attemptStatus ?? "none"}</p><p className="mt-1">{new Date(row.updatedAt).toLocaleString()}</p></div>
          </div>
          {row.latePayment ? <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-300/10 px-3 py-2 text-amber-100">Payment received after ticket cancellation — ticket was NOT issued.{row.refundedCents >= row.amountCents ? " Payment has been fully refunded." : ""}</p> : null}
          {row.unresolved ? <p className="mt-3 rounded-lg border border-sky-400/30 bg-sky-300/10 px-3 py-2 text-sky-100">Pending reconciliation or an unresolved provider outcome.</p> : null}
          {row.error ? <p className="mt-2 text-xs text-red-200">{row.error}</p> : null}
          <div className="mt-3 grid gap-2 text-xs text-white/65 sm:grid-cols-3"><p>Original: <span className="text-white">{money(row.amountCents, row.currency)}</span></p><p>Successfully refunded: <span className="text-white">{money(row.refundedCents, row.currency)}</span></p><p>Remaining: <span className="text-white">{money(remaining, row.currency)}</span></p><p>RaiAccept order: {row.providerOrderId ?? "missing"}</p><p>Purchase transaction: {row.providerTransactionId ?? "missing"}</p><p>Created: {new Date(row.createdAt).toLocaleString()}</p></div>
          <div className="mt-4 flex flex-wrap gap-2">
            {canRefund ? <form action={refundTicketPayment} onSubmit={(event) => { const amount = Number(new FormData(event.currentTarget).get("amount")); if (!Number.isFinite(amount) || !window.confirm(`Refund ${money(Math.round(amount * 100), row.currency)} to the original payment method?`)) event.preventDefault(); }} className="flex items-center gap-2"><input type="hidden" name="attempt_id" value={row.attemptId ?? ""} /><input aria-label="Refund amount" name="amount" type="number" min="0.01" max={(remaining / 100).toFixed(2)} step="0.01" defaultValue={(remaining / 100).toFixed(2)} className="w-24 rounded-lg bg-black/30 px-2 py-1.5" /><button className="rounded-lg bg-amber-300 px-3 py-1.5 font-medium text-black">Refund payment</button></form> : null}
            {canResolve ? <form action={resolveMissingProviderOrder} className="flex items-center gap-2"><input type="hidden" name="order_id" value={row.id} /><input name="provider_order_id" required pattern="[A-Za-z0-9-]{8,128}" placeholder="RaiAccept order ID" className="w-48 rounded-lg bg-black/30 px-2 py-1.5" /><button className="rounded-lg border border-white/20 px-3 py-1.5">Inspect / Resolve</button></form> : null}
            <button type="button" onClick={() => setExpanded(expanded === row.id ? null : row.id)} className="rounded-lg border border-white/20 px-3 py-1.5">{expanded === row.id ? "Hide history" : "View history"}</button>
          </div>
          {expanded === row.id ? <div className="mt-4 space-y-3 border-t border-white/10 pt-3 text-xs"><div><p className="font-medium text-white">Refund history</p>{row.refunds.length ? row.refunds.map((refund) => <div key={refund.id} className="mt-2 rounded-lg bg-black/20 p-2">{refund.status} · {money(refund.amountCents, refund.currency)} · {refund.transactionId ?? "transaction pending"}{refund.code ? ` · ${refund.code}` : ""}{refund.message ? ` · ${refund.message}` : ""}{(refund.status === "requested" || refund.status === "uncertain") ? <form action={verifyTicketRefund} className="mt-2"><input type="hidden" name="refund_id" value={refund.id} /><button className="underline">Verify refund</button></form> : null}</div>) : <p className="mt-1 text-white/55">No refund records.</p>}</div><div><p className="font-medium text-white">Webhook / reconciliation history</p>{row.history.length ? row.history.map((event, index) => <div key={`${event.receivedAt}-${index}`} className="mt-2 rounded-lg bg-black/20 p-2">{event.result ?? "received"} · {event.transactionType ?? "unknown"} {event.status ?? ""} {event.statusCode ?? ""} · {event.transactionId ?? "no transaction"} · received {new Date(event.receivedAt).toLocaleString()}{event.environment ? ` · ${event.environment}` : ""}{event.error ? <p className="mt-1 text-red-200">{event.error}</p> : null}</div>) : <p className="mt-1 text-white/55">No stored webhook events.</p>}</div></div> : null}
        </article>;
      })}
    </div>
  );
}
