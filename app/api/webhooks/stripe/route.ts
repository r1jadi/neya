import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logSystemActivity } from "@/lib/activity-log";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not set. Add it in Vercel / .env.local after creating a webhook endpoint." },
      { status: 501 },
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });
  }

  const body = await req.text();
  const sig = (await headers()).get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true, skipped: "not_paid" });
    }

    let admin;
    try {
      admin = createAdminClient();
    } catch {
      return NextResponse.json({ error: "Server missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }

    const type = session.metadata?.neya_type;

    if (type === "reservation") {
      const rid = session.metadata?.reservation_id;
      if (rid) {
        const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
        await admin
          .from("reservations")
          .update({
            status: "confirmed",
            stripe_checkout_session: session.id,
            stripe_payment_intent: pi ?? null,
            deposit_cents: session.amount_total ?? undefined,
            updated_at: new Date().toISOString(),
          })
          .eq("id", rid);

        const { data: resRow } = await admin.from("reservations").select("user_id, event_id").eq("id", rid).maybeSingle();
        if (resRow?.user_id) {
          await logSystemActivity(admin, "confirmed_table", "reservation", rid, {
            user_id: resRow.user_id,
            event_id: resRow.event_id,
          });
        }
      }
    }

    if (type === "ticket") {
      const orderId = session.metadata?.ticket_order_id;
      const ticketId = session.metadata?.ticket_id;
      if (orderId) {
        await admin
          .from("ticket_orders")
          .update({
            status: "paid",
            stripe_checkout_session: session.id,
            qr_payload: `neya:${orderId}:${randomUUID()}`,
          })
          .eq("id", orderId);

        if (ticketId) {
          const { data: tix } = await admin.from("tickets").select("quantity_sold").eq("id", ticketId).maybeSingle();
          const nextSold = (tix?.quantity_sold ?? 0) + 1;
          await admin.from("tickets").update({ quantity_sold: nextSold }).eq("id", ticketId);
        }

        const { data: ord } = await admin.from("ticket_orders").select("user_id").eq("id", orderId).maybeSingle();
        if (ord?.user_id) {
          await logSystemActivity(admin, "bought_ticket", "ticket_order", orderId, { ticket_id: ticketId });
        }
      }
    }
  }

  return NextResponse.json({ received: true, type: event.type });
}
