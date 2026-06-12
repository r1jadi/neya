import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Clock, Star } from "lucide-react";
import { purchaseGuide } from "@/actions/guide-purchase";
import { GuideMap } from "@/components/neya/guides/guide-map";
import { GuideSmartWidgets, GuideSeasonBanner } from "@/components/neya/guides/guide-smart-widgets";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SITE } from "@/lib/constants";
import { formatDuration, formatPrice } from "@/lib/guides/constants";
import { createClient } from "@/lib/supabase/server";
import { getGuideBySlug, userHasGuideAccess } from "@/services/guides";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cancelled?: string; error?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuideBySlug(slug);
  if (!guide) return { title: `Guide · ${SITE.name}` };
  return {
    title: `${guide.title} · NEYA Guides`,
    description: guide.description ?? undefined,
    openGraph: {
      title: guide.title,
      description: guide.description ?? undefined,
      images: guide.cover_image ? [{ url: guide.cover_image }] : undefined,
    },
  };
}

export default async function GuideDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const q = await searchParams;
  const supabase = await createClient();
  const guide = await getGuideBySlug(slug, supabase);

  if (!guide) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const hasAccess = user ? await userHasGuideAccess(guide.id, user.id, supabase) : false;

  const previewStops = guide.preview_stops ?? [];
  const locationLabel =
    guide.location_type === "city" || guide.location_type === "region"
      ? guide.location_name ?? guide.location_type
      : guide.location_type.charAt(0).toUpperCase() + guide.location_type.slice(1);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="flex-1">
        <div className="relative aspect-[21/9] max-h-[420px] w-full overflow-hidden">
          <Image src={guide.cover_image} alt="" fill className="object-cover" priority sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
            <div className="mx-auto max-w-6xl">
              {guide.featured ? (
                <Badge variant="neon" className="mb-3">
                  <Star className="mr-1 h-3 w-3" />
                  Featured
                </Badge>
              ) : null}
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-white sm:text-5xl">
                {guide.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-white/70">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-sky-400" />
                  {locationLabel}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {formatDuration(guide)}
                </span>
                <span className="text-lg font-bold text-white">{formatPrice(guide.price, guide.currency)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6">
          {q.cancelled ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              Purchase cancelled.
            </p>
          ) : null}
          {q.error === "stripe" ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              Payment unavailable. Try again later.
            </p>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {guide.description ? (
                <p className="text-base leading-relaxed text-white/70">{guide.description}</p>
              ) : null}
              <GuideSeasonBanner guide={guide} />
              <GuideSmartWidgets guide={guide} />

              <section>
                <h2 className="text-lg font-semibold text-white">Destinations preview</h2>
                <p className="mt-1 text-sm text-white/45">
                  {hasAccess
                    ? "You have full access — view your complete itinerary."
                    : "Purchase to unlock the full itinerary, transport details, and offline access."}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {previewStops.map((stop) => (
                    <div
                      key={stop.id}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <p className="font-medium text-white">{stop.name}</p>
                      <p className="text-xs capitalize text-white/45">{stop.category.replace(/_/g, " ")}</p>
                    </div>
                  ))}
                  {(guide.stop_count ?? 0) > previewStops.length ? (
                    <div className="flex items-center justify-center rounded-xl border border-dashed border-white/15 p-4 text-sm text-white/45">
                      +{(guide.stop_count ?? 0) - previewStops.length} more stops
                    </div>
                  ) : null}
                </div>
              </section>

              {previewStops.length > 0 ? (
                <section>
                  <h2 className="text-lg font-semibold text-white">Map preview</h2>
                  <div className="mt-4">
                    <GuideMap stops={previewStops} showTransport={hasAccess} />
                  </div>
                </section>
              ) : null}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <p className="text-2xl font-bold text-white">{formatPrice(guide.price, guide.currency)}</p>
                <p className="mt-1 text-sm text-white/45">{formatDuration(guide)} · {guide.difficulty}</p>
                {hasAccess ? (
                  <Button className="mt-4 w-full" asChild>
                    <Link href={`/guides/${slug}/view`}>Open full guide</Link>
                  </Button>
                ) : (
                  <form action={purchaseGuide} className="mt-4">
                    <input type="hidden" name="slug" value={slug} />
                    <Button type="submit" className="w-full">
                      {guide.price <= 0 ? "Get free guide" : "Purchase guide"}
                    </Button>
                  </form>
                )}
                {!user ? (
                  <p className="mt-3 text-center text-xs text-white/45">
                    <Link href={`/login?next=/guides/${slug}`} className="text-sky-300 hover:underline">
                      Log in
                    </Link>{" "}
                    to save your purchase
                  </p>
                ) : null}
              </div>
              {guide.categories.length ? (
                <div className="flex flex-wrap gap-2">
                  {guide.categories.map((c) => (
                    <Badge key={c} variant="secondary" className="capitalize">
                      {c.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
