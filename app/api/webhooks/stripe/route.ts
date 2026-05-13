import { NextResponse } from "next/server";

/** Stripe webhook — verify signature with STRIPE_WEBHOOK_SECRET in production */
export async function POST() {
  return NextResponse.json({ received: true });
}
