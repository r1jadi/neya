import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GuideItineraryView } from "@/components/neya/guides/guide-itinerary-view";
import { OfflineGuideTools } from "@/components/neya/guides/offline-guide-tools";
import { GuideSmartWidgets } from "@/components/neya/guides/guide-smart-widgets";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SITE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGuideBySlug, userHasGuideAccess } from "@/services/guides";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ purchased?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuideBySlug(slug);
  if (!guide) return { title: `Guide · ${SITE.name}` };
  return { title: `${guide.title} — Full itinerary · ${SITE.name}` };
}

export default async function GuideViewPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const q = await searchParams;
  const supabase = await createClient();
  const guide = await getGuideBySlug(slug, supabase);

  if (!guide) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/guides/${slug}/view`);

  const hasAccess = await userHasGuideAccess(guide.id, user.id, supabase);
  const isFree = guide.price <= 0;

  if (!hasAccess && !isFree) {
    redirect(`/guides/${slug}?error=access`);
  }

  if (isFree && !hasAccess) {
    const admin = createAdminClient();
    await admin.from("guide_purchases").upsert(
      {
        guide_id: guide.id,
        user_id: user.id,
        status: "active",
        purchase_date: new Date().toISOString(),
      },
      { onConflict: "guide_id,user_id" },
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="flex-1 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-8">
          {q.purchased ? (
            <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              Guide unlocked. Your itinerary is ready below.
            </p>
          ) : null}

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300/90">Your guide</p>
              <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold text-white">
                {guide.title}
              </h1>
            </div>
            <Link href={`/guides/${slug}`} className="text-sm text-sky-300 hover:underline">
              ← Guide overview
            </Link>
          </div>

          <GuideSmartWidgets guide={guide} />
          <OfflineGuideTools guide={guide} />
          <GuideItineraryView guide={guide} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
