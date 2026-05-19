"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { getPublicSiteUrl } from "@/lib/env";
import { logUserActivity } from "@/lib/activity-log";
import { resolveReservationConfig, type ReservationPaymentMethod } from "@/lib/reservations/config";

function loginNext(path: string) {
  return `/login?next=${encodeURIComponent(path)}`;
}

function safeRedirectPath(raw: string | null): string {
  const path = String(raw ?? "/events").trim();
  return path.startsWith("/") ? path : "/events";
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

export async function applyGuestlist(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(loginNext("/events"));

  const guestlistId = String(formData.get("guestlist_id") ?? "");
  const contact = String(formData.get("contact") ?? "").slice(0, 280);
  const redirectTo = String(formData.get("redirect") ?? "/events").trim();
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/events";
  if (!guestlistId || !contact) redirect("/events?error=guestlist-fields");

  const { data: glRow } = await supabase.from("guestlists").select("event_id").eq("id", guestlistId).maybeSingle();

  const { error } = await supabase.from("guestlist_entries").insert({
    guestlist_id: guestlistId,
    user_id: user.id,
    status: "pending",
    contact,
  });

  if (error?.code === "23505") redirect(`${safeRedirect}?guestlist=duplicate`);
  if (error) redirect("/events?error=guestlist");

  if (glRow?.event_id) {
    await logUserActivity(supabase, user.id, "joined_guestlist", "event", glRow.event_id, { guestlist_id: guestlistId });
  }

  revalidatePath("/");
  revalidatePath(safeRedirect);
  redirect(`${safeRedirect}?guestlist=applied`);
}

export async function createTicketCheckout(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(loginNext("/events"));

  const ticketId = String(formData.get("ticket_id") ?? "");
  if (!ticketId) redirect("/events?error=ticket");

  const { data: ticket, error: tErr } = await supabase
    .from("tickets")
    .select("id, price_cents, currency, quantity_total, quantity_sold, event_id")
    .eq("id", ticketId)
    .single();

  if (tErr || !ticket) redirect("/events?error=ticket");
  const cap = ticket.quantity_total;
  const sold = ticket.quantity_sold ?? 0;
  if (cap != null && sold >= cap) redirect("/events?error=soldout");

  const { data: order, error: oErr } = await supabase
    .from("ticket_orders")
    .insert({
      ticket_id: ticketId,
      user_id: user.id,
      status: "pending",
    })
    .select("id")
    .single();

  if (oErr || !order) redirect("/events?error=order");

  const stripe = getStripe();
  if (!stripe) redirect("/events?error=stripe");

  const origin = getPublicSiteUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency: (ticket.currency ?? "eur").toLowerCase(),
          unit_amount: ticket.price_cents,
          product_data: {
            name: "NEYA event ticket",
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout/cancel`,
    metadata: {
      neya_type: "ticket",
      ticket_order_id: order.id,
      ticket_id: ticketId,
    },
  });

  await supabase.from("ticket_orders").update({ stripe_checkout_session: session.id }).eq("id", order.id);

  if (!session.url) redirect("/events?error=stripe");
  redirect(session.url);
}
