import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";

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

  switch (event.type) {
    case "checkout.session.completed":
    case "payment_intent.succeeded":
    default:
      break;
  }

  return NextResponse.json({ received: true, type: event.type });
}
