import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Sparkles } from "lucide-react";
import { NightMap, type NightMapStop } from "@/components/my-night/night-map";
import { ReusePlanButton } from "@/components/my-night/reuse-plan-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SITE } from "@/lib/constants";
import { formatEventWhen } from "@/lib/event-dates";
import { getSharedPlanByToken } from "@/services/my-night";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const plan = await getSharedPlanByToken(token);
  if (!plan) return { title: "Plan not found" };
  const names = plan.stops.map((s) => s.title).join(", ");
  return {
    title: `${plan.title} · ${SITE.name}`,
    description: `A night plan on NEYA: ${names}.`,
    openGraph: {
      title: `${plan.title} · ${SITE.name}`,
      description: `A night plan on NEYA: ${names}.`,
    },
  };
}

export default async function SharedNightPage({ params }: Props) {
  const { token } = await params;
  const plan = await getSharedPlanByToken(token);
  if (!plan) notFound();

  const mapStops: NightMapStop[] = plan.stops
    .map((s, i) => ({ index: i, title: s.title, lat: s.lat ?? NaN, lng: s.lng ?? NaN }))
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-300/90">
                Shared night plan
              </p>
              <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold text-white">
                {plan.title}
              </h1>
            </div>
            <ReusePlanButton stops={plan.stops} />
          </div>

          {plan.stops.length ? (
            <ul className="mt-8 space-y-3">
              {plan.stops.map((stop, index) => (
                <li
                  key={stop.refId}
                  className="flex gap-3 rounded-2xl border border-white/[0.08] bg-zinc-950/60 p-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-sky-500 font-[family-name:var(--font-display)] text-sm font-bold text-black">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  {stop.image ? (
                    <Image
                      src={stop.image}
                      alt=""
                      width={72}
                      height={72}
                      className="h-16 w-16 shrink-0 rounded-xl object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1 self-center">
                    {stop.slug && stop.available ? (
                      <a
                        href={stop.kind === "event" ? `/events/${stop.slug}` : `/venues/${stop.slug}`}
                        className="font-semibold text-white hover:underline"
                      >
                        {stop.title}
                      </a>
                    ) : (
                      <p className={cn("font-semibold", stop.available ? "text-white" : "text-white/50")}>
                        {stop.title}
                      </p>
                    )}
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white/50">
                      {stop.time ? (
                        <span className="inline-flex items-center gap-1 text-sky-300/90">
                          <CalendarDays className="h-3 w-3" />
                          {formatEventWhen(stop.time)}
                        </span>
                      ) : null}
                      {stop.subtitle ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {stop.subtitle}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-8 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-white/45">
              This plan is empty.
            </p>
          )}

          {mapStops.length ? (
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-white/45">The route</h2>
              <NightMap stops={mapStops} className="mt-3" />
            </section>
          ) : null}

          <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-white/40">
            <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" />
            Open this plan in NEYA to add it to your own night.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
