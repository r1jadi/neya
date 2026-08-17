"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { getPublicSiteUrl } from "@/lib/env";
import { logUserActivity } from "@/lib/activity-log";
import { resolveReservationConfig, type ReservationPaymentMethod } from "@/lib/reservations/config";
import { safeInternalPath } from "@/lib/redirect";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRaiAcceptClient, RaiAcceptError, type RaiAcceptOrderPayload } from "@/lib/raiaccept/server";

function loginNext(path: string) {
  return `/login?next=${encodeURIComponent(path)}`;
}

function safeRedirectPath(raw: string | null): string {
  return safeInternalPath(raw, "/events");
}

type VenueReservationRow = {
  id: string;
  name: string;
  reservations_enabled: boolean | null;
  reservation_price_eur: number | null;
  requires_online_payment: boolean | null;
  allows_pay_at_venue: boolean | null;
};

type EventReservationRow = {
  reservation_price_eur: number | null;
  requires_online_payment: boolean | null;
  allows_pay_at_venue: boolean | null;
};

async function loadReservationConfig(venueId: string, eventId: string | null) {
  const supabase = await createClient();
  const { data: venue, error: vErr } = await supabase
    .from("venues")
    .select("id, name, reservations_enabled, reservation_price_eur, requires_online_payment, allows_pay_at_venue")
    .eq("id", venueId)
    .maybeSingle();

  if (vErr || !venue) return null;

  let event: EventReservationRow | null = null;
  if (eventId) {
    const { data: ev } = await supabase
      .from("events")
      .select("reservation_price_eur, requires_online_payment, allows_pay_at_venue")
      .eq("id", eventId)
      .maybeSingle();
    event = ev;
  }

  const config = resolveReservationConfig(venue as VenueReservationRow, event);
  return { supabase, venue: venue as VenueReservationRow, config };
}

export async function createReservation(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const redirectTo = safeRedirectPath(String(formData.get("redirect") ?? "/events"));
  if (!user) redirect(loginNext(redirectTo));

  const venueId = String(formData.get("venue_id") ?? "");
  const eventIdRaw = formData.get("event_id");
  const eventId = eventIdRaw && String(eventIdRaw).length > 0 ? String(eventIdRaw) : null;
  const partySize = Math.min(20, Math.max(1, parseInt(String(formData.get("party_size") ?? "2"), 10) || 2));
  const notes = String(formData.get("notes") ?? "").slice(0, 500);
  const phone = String(formData.get("phone") ?? "").slice(0, 40);
  const paymentMethodRaw = String(formData.get("payment_method") ?? "").trim();

  if (!venueId) redirect(`${redirectTo}?error=missing-venue`);

  const loaded = await loadReservationConfig(venueId, eventId);
  if (!loaded) redirect(`${redirectTo}?error=reservation`);
  const { venue, config } = loaded;

  if (!config.reservationsEnabled) redirect(`${redirectTo}?error=reservations-closed`);

  const fullNotes = [notes, phone ? `Phone: ${phone}` : ""].filter(Boolean).join("\n") || null;

  if (config.isFree) {
    const { data: resv, error } = await supabase
      .from("reservations")
      .insert({
        venue_id: venueId,
        event_id: eventId,
        user_id: user.id,
        status: "confirmed",
        party_size: partySize,
        deposit_cents: 0,
        notes: fullNotes,
        payment_method: "none",
        payment_status: "waived",
        booking_kind: "table",
      })
      .select("id")
      .single();

    if (error || !resv) redirect(`${redirectTo}?error=reservation`);

    if (eventId) {
      await logUserActivity(supabase, user.id, "confirmed_table", "reservation", resv.id, { event_id: eventId });
    }

    revalidatePath("/dashboard");
    revalidatePath(redirectTo);
    redirect(`${redirectTo}?reservation=confirmed`);
  }

  let paymentMethod: ReservationPaymentMethod;
  if (config.availableMethods.length === 1) {
    paymentMethod = config.availableMethods[0]!;
  } else if (paymentMethodRaw === "online" || paymentMethodRaw === "pay_at_venue") {
    paymentMethod = paymentMethodRaw;
  } else {
    redirect(`${redirectTo}?error=payment-method`);
  }

  if (!config.availableMethods.includes(paymentMethod)) {
    redirect(`${redirectTo}?error=payment-method`);
  }

  if (paymentMethod === "pay_at_venue") {
    const { data: resv, error } = await supabase
      .from("reservations")
      .insert({
        venue_id: venueId,
        event_id: eventId,
        user_id: user.id,
        status: "pending_payment",
        party_size: partySize,
        deposit_cents: config.priceCents,
        notes: fullNotes,
        payment_method: "pay_at_venue",
        payment_status: "due_at_venue",
        booking_kind: "table",
      })
      .select("id")
      .single();

    if (error || !resv) redirect(`${redirectTo}?error=reservation`);

    revalidatePath("/dashboard");
    revalidatePath("/business/reservations");
    revalidatePath(redirectTo);
    redirect(`${redirectTo}?reservation=pending`);
  }

  const { data: resv, error } = await supabase
    .from("reservations")
    .insert({
      venue_id: venueId,
      event_id: eventId,
      user_id: user.id,
      status: "pending",
      party_size: partySize,
      deposit_cents: config.priceCents,
      notes: fullNotes,
      payment_method: "online",
      payment_status: "pending",
      booking_kind: "table",
    })
    .select("id")
    .single();

  if (error || !resv) redirect(`${redirectTo}?error=reservation`);

  if (config.priceCents <= 0) {
    await supabase
      .from("reservations")
      .update({
        status: "confirmed",
        payment_status: "waived",
        payment_method: "none",
        updated_at: new Date().toISOString(),
      })
      .eq("id", resv.id);

    revalidatePath("/dashboard");
    redirect(`${redirectTo}?reservation=confirmed`);
  }

  const stripe = getStripe();
  if (!stripe) redirect(`${redirectTo}?error=stripe`);

  const origin = getPublicSiteUrl();
  const priceLabel =
    config.priceEur % 1 === 0 ? `€${config.priceEur.toFixed(0)}` : `€${config.priceEur.toFixed(2)}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: config.priceCents,
          product_data: {
            name: `Table reservation · ${venue.name}`,
            description: `${priceLabel} deposit — ${partySize} guests.`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&type=reservation`,
    cancel_url: `${origin}/checkout/cancel?type=reservation`,
    metadata: {
      neya_type: "reservation",
      reservation_id: resv.id,
    },
  });

  await supabase.from("reservations").update({ stripe_checkout_session: session.id }).eq("id", resv.id);

  if (!session.url) redirect(`${redirectTo}?error=stripe`);
  redirect(session.url);
}

export async function createTicketCheckout(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const redirectTo = safeRedirectPath(String(formData.get("redirect") ?? "/events"));
  if (!user) redirect(loginNext(redirectTo));

  const ticketId = String(formData.get("ticket_id") ?? "");
  const quantity = Math.min(20, Math.max(1, Number.parseInt(String(formData.get("quantity") ?? "1"), 10) || 1));
  if (!ticketId) redirect(`${redirectTo}?error=ticket`);

  const { data: ticket, error: tErr } = await supabase
    .from("tickets")
    .select("id, tier_name, status, sales_start, sales_end, event_id, events(title)")
    .eq("id", ticketId)
    .single();

  if (tErr || !ticket) redirect(`${redirectTo}?error=ticket`);
  if (ticket.status !== "available") redirect(`${redirectTo}?error=soldout`);
  const now = Date.now();
  if (
    (ticket.sales_start && new Date(ticket.sales_start).getTime() > now) ||
    (ticket.sales_end && new Date(ticket.sales_end).getTime() <= now)
  ) {
    redirect(`${redirectTo}?error=ticket-unavailable`);
  }

  // Reserve inventory and snapshot the immutable payment fields. The RPC is
  // atomic and rejects duplicate in-flight purchases for the same ticket.
  const { data: orderId, error: oErr } = await supabase.rpc("reserve_ticket_order", {
    p_ticket_id: ticketId,
    p_quantity: quantity,
  });
  if (oErr || !orderId) {
    const inProgress =
      typeof oErr?.message === "string" && oErr.message.toLowerCase().includes("already in progress");
    redirect(`${redirectTo}?error=${inProgress ? "in-progress" : "soldout"}`);
  }

  const { data: order } = await supabase
    .from("ticket_orders")
    .select("id, amount_cents, currency, merchant_order_reference, quantity")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!order || order.amount_cents == null || !order.currency || !order.merchant_order_reference) {
    await releaseTicketReservationFor(orderId);
    redirect(`${redirectTo}?error=ticket`);
  }

  const admin = createAdminClient();

  // Persist the RaiAccept payment attempt before any provider call so the
  // order stays traceable if a later step fails.
  const { data: attempt, error: attemptError } = await admin
    .from("ticket_payment_attempts")
    .insert({
      ticket_order_id: order.id,
      provider: "raiaccept",
      status: "pending",
      amount_cents: order.amount_cents,
      currency: order.currency,
    })
    .select("id")
    .single();
  if (attemptError || !attempt) {
    // Nothing reached RaiAccept yet — releasing the reservation is safe.
    await releaseTicketReservationFor(order.id);
    redirect(`${redirectTo}?error=payment`);
  }

  // Label the order with its provider; the amount snapshot stays immutable.
  await admin.from("ticket_orders").update({ payment_provider: "raiaccept" }).eq("id", order.id);

  const origin = getPublicSiteUrl();
  const orderParam = encodeURIComponent(order.id);
  const payload: RaiAcceptOrderPayload = {
    consumer: await buildRaiAcceptConsumer(user),
    invoice: {
      amount: amountToRaiAccept(order.amount_cents),
      currency: order.currency,
      description: buildRaiAcceptDescription(
        ticket as { tier_name: string; events?: { title?: string | null } | null },
      ),
      merchantOrderReference: order.merchant_order_reference,
      items: [
        {
          description: String(ticket.tier_name ?? "NEYA event ticket").slice(0, 100),
          numberOfItems: order.quantity,
          price: amountToRaiAccept(order.amount_cents / order.quantity),
        },
      ],
    },
    paymentMethodPreference: "CARD",
    urls: {
      successUrl: `${origin}/checkout/success?ticket_order_id=${orderParam}`,
      cancelUrl: `${origin}/checkout/cancel?ticket_order_id=${orderParam}`,
      failUrl: `${origin}/checkout/failure?ticket_order_id=${orderParam}`,
      notificationUrl: `${origin}/api/webhooks/raiaccept`,
    },
  };

  const rai = getRaiAcceptClient();
  let paymentRedirectURL: string | null = null;
  try {
    // Create the RaiAccept order and persist its orderIdentification before
    // opening the checkout session.
    const { orderIdentification } = await rai.createOrder(payload);
    await admin
      .from("ticket_payment_attempts")
      .update({ provider_order_id: orderIdentification, updated_at: new Date().toISOString() })
      .eq("id", attempt.id);
    await admin.from("ticket_orders").update({ payment_status: "processing" }).eq("id", order.id);

    // Create the payment form session with the same order parameters.
    const { sessionId, paymentRedirectURL: redirectUrl } = await rai.createCheckout(
      orderIdentification,
      payload,
    );
    await admin
      .from("ticket_payment_attempts")
      .update({
        checkout_session_id: sessionId,
        status: "processing",
        provider_status_code: "checkout_created",
        provider_status_message: "RaiAccept checkout session created",
        updated_at: new Date().toISOString(),
      })
      .eq("id", attempt.id);
    paymentRedirectURL = redirectUrl;
  } catch (err) {
    await recordRaiAcceptCheckoutFailure(admin, attempt.id, order, err);
    // Release only when we are certain no RaiAccept order was created (auth
    // failure or definitive rejection on order creation). If the provider may
    // hold an order, keep the NEYA order recoverable for reconciliation.
    const phase = err instanceof RaiAcceptError ? err.phase : "unknown";
    const uncertain = err instanceof RaiAcceptError ? err.uncertain : true;
    if (phase === "auth" || (phase === "create_order" && !uncertain)) {
      await releaseTicketReservationFor(order.id);
    }
    redirect(`${redirectTo}?error=payment`);
  }

  if (!paymentRedirectURL) redirect(`${redirectTo}?error=payment`);
  redirect(paymentRedirectURL);
}

/** Releases a pending order via the safe server-side RPC. */
async function releaseTicketReservationFor(orderId: string) {
  try {
    await createAdminClient().rpc("release_ticket_order", { p_order_id: orderId });
  } catch {
    // The future webhook/reconciliation remains a safe fallback.
  }
}

/** Records a failed RaiAccept attempt with safe, diagnosable context. */
async function recordRaiAcceptCheckoutFailure(
  admin: ReturnType<typeof createAdminClient>,
  attemptId: string,
  order: { id: string; merchant_order_reference: string },
  err: unknown,
) {
  const phase = err instanceof RaiAcceptError ? err.phase : "unknown";
  const httpStatus = err instanceof RaiAcceptError ? err.httpStatus : null;
  const providerCode = err instanceof RaiAcceptError ? err.providerCode : null;
  const providerMessage = err instanceof RaiAcceptError ? err.providerMessage : null;
  const orderIdentification = err instanceof RaiAcceptError ? err.orderIdentification : null;

  // Never log credentials, tokens, or full provider payloads.
  console.error("[neya] RaiAccept checkout failed", {
    phase,
    httpStatus,
    providerCode,
    orderId: order.id,
    merchantOrderReference: order.merchant_order_reference,
    orderIdentification,
  });

  await admin
    .from("ticket_payment_attempts")
    .update({
      status: "failed",
      provider_status_code: providerCode ?? (httpStatus != null ? String(httpStatus) : phase),
      provider_status_message: providerMessage ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", attemptId);
}

/** Converts amount_cents to the numeric amount expected by RaiAccept (2500 => 25.00). */
function amountToRaiAccept(amountCents: number): number {
  return Number((amountCents / 100).toFixed(2));
}

/** Builds the invoice description from the ticket tier and event title. */
function buildRaiAcceptDescription(ticket: {
  tier_name: string;
  events?: { title?: string | null } | null;
}): string {
  const tier = String(ticket.tier_name ?? "").trim();
  const eventTitle = ticket.events?.title?.trim();
  if (tier && eventTitle) return `${tier} · ${eventTitle} · NEYA event ticket`.slice(0, 200);
  if (tier) return `${tier} · NEYA event ticket`.slice(0, 200);
  return "NEYA event ticket";
}

/** Builds the RaiAccept consumer block from the authenticated user, when available. */
async function buildRaiAcceptConsumer(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): Promise<{ firstName?: string; lastName?: string; email?: string; ipAddress?: string }> {
  const consumer: { firstName?: string; lastName?: string; email?: string; ipAddress?: string } = {};
  if (user.email) consumer.email = user.email.slice(0, 255);
  const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  const nameParts = fullName.split(/\s+/).filter(Boolean).slice(0, 2);
  const cleanName = (value: string) => value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'.-]/g, "").slice(0, 32);
  if (nameParts[0]) consumer.firstName = cleanName(nameParts[0]);
  if (nameParts[1]) consumer.lastName = cleanName(nameParts[1]);
  try {
    const requestHeaders = await headers();
    const forwarded = requestHeaders.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) consumer.ipAddress = first.slice(0, 255);
    } else {
      const realIp = requestHeaders.get("x-real-ip");
      if (realIp) consumer.ipAddress = realIp.slice(0, 255);
    }
  } catch {
    // Headers are unavailable outside a request scope — ipAddress is optional.
  }
  return consumer;
}

/** Releases a pending Stripe order when the buyer returns from checkout without paying.
 *  RaiAccept orders are never released from a frontend redirect (cancelUrl/failUrl are
 *  not proof of payment); they are reconciled server-side by the webhook/reconciliation. */
export async function releaseTicketReservation(orderId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !orderId) return;

  const { data: order } = await supabase
    .from("ticket_orders")
    .select("id, payment_status, payment_provider")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!order || order.payment_status !== "pending") return;
  if (order.payment_provider !== "stripe") return;

  try {
    await createAdminClient().rpc("release_ticket_order", {
      p_order_id: order.id,
    });
  } catch {
    // Stripe's expiry webhook remains a safe fallback when server configuration is incomplete.
  }
}
