import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TicketPaymentOperations, type TicketPaymentOperationRow } from "@/components/admin/ticket-payment-operations";
import { getAdminUserOrNull } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = { title: `Ticket payments · Admin · ${SITE.name}` };

type Props = { searchParams: Promise<{ provider?: string; paymentStatus?: string; attemptStatus?: string; problem?: string; refundStatus?: string; error?: string; detail?: string; ok?: string; result?: string }> };
type Attempt = { id: string; ticket_order_id: string; provider: string; provider_order_id: string | null; provider_transaction_id: string | null; status: string; amount_cents: number; currency: string; refunded_amount_cents: number; refund_pending_cents: number; provider_status_message: string | null; created_at: string; updated_at: string };
type Refund = { id: string; ticket_order_id: string; payment_attempt_id: string; provider_transaction_id: string | null; amount_cents: number; currency: string; status: string; provider_status_code: string | null; provider_status_message: string | null; created_at: string; updated_at: string };
type WebhookEvent = { provider_order_id: string | null; received_at: string; processed_at: string | null; processing_result: string | null; processing_error: string | null; provider_transaction_id: string | null; transaction_type: string | null; status: string | null; status_code: string | null; payload: { transaction?: { isProduction?: boolean } } | null };
type TicketRelation = { tier_name: string | null; events: { title: string | null } | { title: string | null }[] | null };
type Order = { id: string; merchant_order_reference: string; payment_provider: string | null; payment_status: string; status: string; amount_cents: number | null; currency: string | null; created_at: string; updated_at: string; profiles: { display_name: string | null } | { display_name: string | null }[] | null; tickets: TicketRelation | TicketRelation[] | null };

export default async function TicketPaymentsPage({ searchParams }: Props) {
  const q = await searchParams;
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user?.email) redirect("/login?next=/admin/ticket-payments");
  if (!await getAdminUserOrNull()) redirect("/admin?error=forbidden");

  const admin = createAdminClient();
  const [{ data: orders, error }, { data: attempts }, { data: refunds }, { data: events }] = await Promise.all([
    admin.from("ticket_orders").select("id, merchant_order_reference, payment_provider, payment_status, status, amount_cents, currency, created_at, updated_at, profiles(display_name), tickets(tier_name, events(title))").order("updated_at", { ascending: false }).limit(250),
    admin.from("ticket_payment_attempts").select("id, ticket_order_id, provider, provider_order_id, provider_transaction_id, status, amount_cents, currency, refunded_amount_cents, refund_pending_cents, provider_status_message, created_at, updated_at").order("created_at", { ascending: false }).limit(500),
    admin.from("ticket_refunds").select("id, ticket_order_id, payment_attempt_id, provider_transaction_id, amount_cents, currency, status, provider_status_code, provider_status_message, created_at, updated_at").order("created_at", { ascending: false }).limit(1000),
    admin.from("ticket_payment_webhook_events").select("provider_order_id, received_at, processed_at, processing_result, processing_error, provider_transaction_id, transaction_type, status, status_code, payload").order("received_at", { ascending: false }).limit(1000),
  ]);
  if (error) throw new Error("Could not load ticket payment operations");

  const byOrder = new Map<string, Attempt>();
  for (const attempt of (attempts ?? []) as Attempt[]) if (!byOrder.has(attempt.ticket_order_id)) byOrder.set(attempt.ticket_order_id, attempt);
  const refundsByOrder = new Map<string, Refund[]>();
  for (const refund of refunds ?? []) refundsByOrder.set(refund.ticket_order_id, [...(refundsByOrder.get(refund.ticket_order_id) ?? []), refund]);
  const eventsByProviderOrder = new Map<string, WebhookEvent[]>();
  for (const event of (events ?? []) as WebhookEvent[]) if (event.provider_order_id) eventsByProviderOrder.set(event.provider_order_id, [...(eventsByProviderOrder.get(event.provider_order_id) ?? []), event]);

  const rows: TicketPaymentOperationRow[] = ((orders ?? []) as Order[]).map((order) => {
    const attempt = byOrder.get(order.id);
    const history = attempt?.provider_order_id ? eventsByProviderOrder.get(attempt.provider_order_id) ?? [] : [];
    const latePayment = history.some((event) => event.processing_result === "late_payment_after_cancel");
    const unresolved = !attempt?.provider_order_id || history.some((event) => !event.processed_at || ["retry", "error", "unknown_status", "in_progress"].includes(event.processing_result ?? ""));
    const ticket = Array.isArray(order.tickets) ? order.tickets[0] : order.tickets;
    const event = ticket && (Array.isArray(ticket.events) ? ticket.events[0] : ticket.events);
    const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
    return { id: order.id, merchantReference: order.merchant_order_reference, ticketLabel: [event?.title, ticket?.tier_name].filter(Boolean).join(" · ") || "Ticket order", customer: profile?.display_name ?? "Customer details unavailable", provider: order.payment_provider, paymentStatus: order.payment_status, orderStatus: order.status, attemptId: attempt?.id ?? null, attemptStatus: attempt?.status ?? null, providerOrderId: attempt?.provider_order_id ?? null, providerTransactionId: attempt?.provider_transaction_id ?? null, amountCents: order.amount_cents ?? attempt?.amount_cents ?? 0, refundedCents: attempt?.refunded_amount_cents ?? 0, pendingRefundCents: attempt?.refund_pending_cents ?? 0, currency: order.currency ?? attempt?.currency ?? "EUR", createdAt: order.created_at, updatedAt: order.updated_at, latePayment, unresolved, error: attempt?.provider_status_message ?? null, history: history.map((item) => ({ receivedAt: item.received_at, processedAt: item.processed_at, result: item.processing_result, error: item.processing_error, transactionId: item.provider_transaction_id, transactionType: item.transaction_type, status: item.status, statusCode: item.status_code, environment: typeof item.payload?.transaction?.isProduction === "boolean" ? (item.payload.transaction.isProduction ? "production" : "sandbox") : null })), refunds: (refundsByOrder.get(order.id) ?? []).map((refund) => ({ id: refund.id, transactionId: refund.provider_transaction_id, amountCents: refund.amount_cents, currency: refund.currency, status: refund.status, code: refund.provider_status_code, message: refund.provider_status_message, createdAt: refund.created_at, updatedAt: refund.updated_at })) };
  }).sort((a, b) => Number(b.latePayment || b.unresolved || b.paymentStatus === "failed") - Number(a.latePayment || a.unresolved || a.paymentStatus === "failed") || b.updatedAt.localeCompare(a.updatedAt));

  return <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-10 text-white sm:px-6"><Link href="/admin" className="text-sm text-sky-300 hover:underline">← Admin CMS</Link><h1 className="mt-5 font-[family-name:var(--font-display)] text-2xl font-bold">Ticket payment operations</h1><p className="mt-1 text-sm text-white/55">RaiAccept payment verification, reconciliation, and refunds. Provider data is verified server-side.</p>{q.error ? <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">Operation could not be completed: {q.detail ? `provider verification mismatch (${q.detail})` : q.error}.</p> : null}{q.ok ? <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">Operation result: {q.result ?? "recorded"}.</p> : null}<div className="mt-7"><TicketPaymentOperations rows={rows} filters={q} /></div></main>;
}
