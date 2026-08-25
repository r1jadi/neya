"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicSiteUrl } from "@/lib/env";
import { getRaiAcceptClient, RaiAcceptError } from "@/lib/raiaccept/server";
import { LISTING_FEE_CENTS, LISTING_FEE_DAYS } from "@/lib/constants";

/** Simple monthly listing fee payment for a venue owner. */
export async function payVenueListing(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/business");

  const venueId = String(formData.get("venue_id") ?? "");
  if (!venueId) redirect("/business?error=listing");

  // Verify the venue exists and is owned by this user.
  const { data: venue, error: venueError } = await supabase
    .from("venues")
    .select("id, name, owner_id, listing_fee_cents, listing_paid_until")
    .eq("id", venueId)
    .maybeSingle();
  if (venueError || !venue || venue.owner_id !== user.id) redirect("/business?error=listing");

  const feeCents =
    typeof venue.listing_fee_cents === "number" && venue.listing_fee_cents > 0
      ? venue.listing_fee_cents
      : LISTING_FEE_CENTS;

  const admin = createAdminClient();

  // Create the payment attempt first so the merchant reference is stable and
  // unique — the provider order references it for reconciliation.
  const merchantOrderReference = `NEYA-LIST-${venueId}-${Date.now().toString(36)}`;
  const { data: attempt, error: attemptError } = await admin
    .from("venue_listing_payments")
    .insert({
      venue_id: venue.id,
      user_id: user.id,
      amount_cents: feeCents,
      currency: "EUR",
      merchant_order_reference: merchantOrderReference,
      status: "pending",
    })
    .select("id")
    .single();
  if (attemptError || !attempt) redirect("/business?error=payment");

  const origin = getPublicSiteUrl();
  const payload = {
    consumer: {
      firstName: user.user_metadata?.first_name ?? undefined,
      lastName: user.user_metadata?.last_name ?? undefined,
      email: user.email ?? undefined,
    },
    invoice: {
      amount: feeCents / 100,
      currency: "EUR",
      description: `NEYA Places listing · ${venue.name}`.slice(0, 200),
      merchantOrderReference,
      items: [
        {
          description: `Monthly NEYA Places listing (${LISTING_FEE_DAYS} days)`,
          numberOfItems: 1,
          price: feeCents / 100,
        },
      ],
    },
    paymentMethodPreference: "CARD" as const,
    urls: {
      successUrl: `${origin}/business?listing_paid=1`,
      cancelUrl: `${origin}/business?listing_cancelled=1`,
      failUrl: `${origin}/business?error=payment`,
      notificationUrl: `${origin}/api/webhooks/raiaccept-listing`,
    },
  };

  const rai = getRaiAcceptClient();
  let paymentRedirectURL: string | null = null;
  try {
    const { orderIdentification } = await rai.createOrder(payload);
    // Persist provider order id and move to processing.
    const { error: persistError } = await admin
      .from("venue_listing_payments")
      .update({
        provider_order_id: orderIdentification,
        status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", attempt.id);
    if (persistError) {
      throw new RaiAcceptError("Failed to persist listing provider order", {
        phase: "create_order",
        uncertain: true,
        orderIdentification,
      });
    }

    const { sessionId, paymentRedirectURL: redirectUrl } = await rai.createCheckout(
      orderIdentification,
      payload,
    );
    const { error: sessionError } = await admin
      .from("venue_listing_payments")
      .update({
        checkout_session_id: sessionId,
        provider_status_code: "checkout_created",
        provider_status_message: "RaiAccept checkout session created",
        updated_at: new Date().toISOString(),
      })
      .eq("id", attempt.id);
    if (sessionError) {
      console.error("[neya] failed to persist listing checkout session", {
        attemptId: attempt.id,
        error: sessionError.message,
      });
    }
    paymentRedirectURL = redirectUrl;
  } catch (err) {
    // Mark failed only when we are sure nothing reached the provider.
    const uncertain = err instanceof RaiAcceptError ? err.uncertain : true;
    if (!uncertain) {
      await admin
        .from("venue_listing_payments")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", attempt.id);
    }
    redirect("/business?error=payment");
  }

  if (!paymentRedirectURL) redirect("/business?error=payment");
  redirect(paymentRedirectURL);
}