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

async function ensureUserProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
) {
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (profile) return;

  const displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    user.email?.split("@")[0] ||
    "User";

  await supabase.from("profiles").insert({
    id: user.id,
    display_name: displayName.slice(0, 80),
  });
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

  await ensureUserProfile(supabase, user);
  const admin = createAdminClient();

  const { data: guide } = await supabase
    .from("guides")
    .select("id, slug, title, price, currency, published")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (!guide) redirect("/guides?error=not-found");

  const { data: existingPurchase } = await admin
    .from("guide_purchases")
    .select("id, status")
    .eq("guide_id", guide.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingPurchase?.status === "active") redirect(`/guides/${slug}/view`);

  const price = Number(guide.price) || 0;

  if (price <= 0) {
    const { error } = await admin.from("guide_purchases").upsert(
      {
        guide_id: guide.id,
        user_id: user.id,
        status: "active",
        purchase_date: new Date().toISOString(),
        access_until: null,
      },
      { onConflict: "guide_id,user_id" },
    );
    if (error) {
      console.error("[neya] purchaseGuide free upsert", error);
      redirect(`${redirectTo}?error=purchase`);
    }
    revalidatePath(`/guides/${slug}`);
    redirect(`/guides/${slug}/view`);
  }

  const stripe = getStripe();
  if (!stripe) redirect(`${redirectTo}?error=stripe`);

  let purchaseId = existingPurchase?.id;
  if (!purchaseId) {
    const { data: purchase, error: insertErr } = await admin
      .from("guide_purchases")
      .insert({
        guide_id: guide.id,
        user_id: user.id,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertErr || !purchase) {
      console.error("[neya] purchaseGuide insert", insertErr);
      redirect(`${redirectTo}?error=purchase`);
    }
    purchaseId = purchase.id;
  } else if (existingPurchase && existingPurchase.status !== "pending") {
    const { error: resetErr } = await admin
      .from("guide_purchases")
      .update({ status: "pending", stripe_checkout_session: null })
      .eq("id", purchaseId)
      .eq("user_id", user.id);

    if (resetErr) {
      console.error("[neya] purchaseGuide reset pending", resetErr);
      redirect(`${redirectTo}?error=purchase`);
    }
  }

  const siteUrl = getPublicSiteUrl();
  let session;
  try {
    session = await stripe.checkout.sessions.create({
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
        guide_purchase_id: purchaseId,
        user_id: user.id,
      },
      success_url: `${siteUrl}/guides/${slug}/view?purchased=1`,
      cancel_url: `${siteUrl}/guides/${slug}?cancelled=1`,
    });
  } catch (err) {
    console.error("[neya] purchaseGuide stripe session create", err);
    redirect(`${redirectTo}?error=stripe`);
  }

  const { error: sessionUpdateErr } = await admin
    .from("guide_purchases")
    .update({ stripe_checkout_session: session.id })
    .eq("id", purchaseId)
    .eq("user_id", user.id);

  if (sessionUpdateErr) {
    console.error("[neya] purchaseGuide stripe session update", sessionUpdateErr);
    redirect(`${redirectTo}?error=purchase`);
  }

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
