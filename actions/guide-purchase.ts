"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { getPublicSiteUrl } from "@/lib/env";

function loginNext(path: string) {
  return `/login?next=${encodeURIComponent(path)}`;
}

export async function purchaseGuide(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const slug = String(formData.get("slug") ?? "").trim();
  const redirectTo = `/guides/${slug}`;
  if (!user) redirect(loginNext(redirectTo));
  if (!slug) redirect("/guides?error=missing");

  const { data: guide } = await supabase
    .from("guides")
    .select("id, slug, title, price, currency, published")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (!guide) redirect("/guides?error=not-found");

  const existing = await supabase
    .from("guide_purchases")
    .select("id, status")
    .eq("guide_id", guide.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (existing.data) redirect(`/guides/${slug}/view`);

  const price = Number(guide.price) || 0;

  if (price <= 0) {
    const { error } = await supabase.from("guide_purchases").upsert(
      {
        guide_id: guide.id,
        user_id: user.id,
        status: "active",
        purchase_date: new Date().toISOString(),
        access_until: null,
      },
      { onConflict: "guide_id,user_id" },
    );
    if (error) redirect(`${redirectTo}?error=purchase`);
    revalidatePath(`/guides/${slug}`);
    redirect(`/guides/${slug}/view`);
  }

  const stripe = getStripe();
  if (!stripe) redirect(`${redirectTo}?error=stripe`);

  const { data: purchase, error: insertErr } = await supabase
    .from("guide_purchases")
    .insert({
      guide_id: guide.id,
      user_id: user.id,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertErr || !purchase) redirect(`${redirectTo}?error=purchase`);

  const siteUrl = getPublicSiteUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency: (guide.currency ?? "EUR").toLowerCase(),
          unit_amount: Math.round(price * 100),
          product_data: {
            name: guide.title,
            description: `NEYA Travel Guide — ${guide.title}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      neya_type: "guide",
      guide_id: guide.id,
      guide_purchase_id: purchase.id,
      user_id: user.id,
    },
    success_url: `${siteUrl}/guides/${slug}/view?purchased=1`,
    cancel_url: `${siteUrl}/guides/${slug}?cancelled=1`,
  });

  await supabase
    .from("guide_purchases")
    .update({ stripe_checkout_session: session.id })
    .eq("id", purchase.id);

  if (!session.url) redirect(`${redirectTo}?error=stripe`);
  redirect(session.url);
}

export async function activateGuidePurchase(purchaseId: string, userId: string) {
  const admin = createAdminClient();
  const accessUntil = new Date();
  accessUntil.setFullYear(accessUntil.getFullYear() + 1);

  await admin
    .from("guide_purchases")
    .update({
      status: "active",
      purchase_date: new Date().toISOString(),
      access_until: accessUntil.toISOString(),
    })
    .eq("id", purchaseId)
    .eq("user_id", userId);
}
