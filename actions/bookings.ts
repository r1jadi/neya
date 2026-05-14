"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { getPublicSiteUrl } from "@/lib/env";
import { logUserActivity } from "@/lib/activity-log";

const DEPOSIT_CENTS = 2000;

function loginNext(path: string) {
  return `/login?next=${encodeURIComponent(path)}`;
}

export async function createReservationCheckout(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(loginNext("/events"));

  const venueId = String(formData.get("venue_id") ?? "");
  const eventIdRaw = formData.get("event_id");
  const eventId = eventIdRaw && String(eventIdRaw).length > 0 ? String(eventIdRaw) : null;
  const partySize = Math.min(20, Math.max(1, parseInt(String(formData.get("party_size") ?? "2"), 10) || 2));
  const notes = String(formData.get("notes") ?? "").slice(0, 500);
  const phone = String(formData.get("phone") ?? "").slice(0, 40);
  if (!venueId) redirect("/events?error=missing-venue");

  const fullNotes = [notes, phone ? `Phone: ${phone}` : ""].filter(Boolean).join("\n") || null;

  const { data: resv, error } = await supabase
    .from("reservations")
    .insert({
      venue_id: venueId,
      event_id: eventId,
      user_id: user.id,
      status: "pending",
      party_size: partySize,
      deposit_cents: DEPOSIT_CENTS,
      notes: fullNotes,
    })
    .select("id")
    .single();

  if (error || !resv) redirect("/events?error=reservation");

  const stripe = getStripe();
  if (!stripe) redirect("/events?error=stripe");

  const origin = getPublicSiteUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: DEPOSIT_CENTS,
          product_data: {
            name: "NEYA table deposit",
            description: "Reservation hold — venue confirms details.",
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout/cancel`,
    metadata: {
      neya_type: "reservation",
      reservation_id: resv.id,
    },
  });

  await supabase.from("reservations").update({ stripe_checkout_session: session.id }).eq("id", resv.id);

  if (!session.url) redirect("/events?error=stripe");
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
