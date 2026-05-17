"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Radio } from "lucide-react";
import { NeonButton } from "@/components/neya/neon-button";
import { formatEventWhen } from "@/lib/event-dates";
import { PLACEHOLDER_IMAGE } from "@/lib/images";
import { SITE } from "@/lib/constants";
import type { Event } from "@/types";

export interface HeroStats {
  hereNow: number;
  tonightCount: number;
  vibe: number;
}

interface LandingHeroProps {
  stats?: HeroStats;
  spotlight?: Event | null;
}

export function LandingHero({ stats, spotlight }: LandingHeroProps) {
  const hereNow = stats?.hereNow ?? 0;
  const tonight = stats?.tonightCount ?? 0;
  const vibe = stats?.vibe ?? 0;
  const hasSpotlight = Boolean(spotlight);

  return (
    <section className="relative isolate w-full min-w-0 overflow-hidden pt-10 pb-20 sm:pt-16 sm:pb-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-fuchsia-600/25 blur-[120px]" />
        <div className="absolute right-0 top-24 h-[380px] w-[380px] rounded-full bg-sky-500/20 blur-[110px]" />
        <div className="absolute bottom-0 left-1/3 h-[300px] w-[300px] rounded-full bg-violet-600/20 blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.06),transparent_55%)]" />
      </div>
      <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-12 px-4 sm:px-6 xl:flex-row xl:items-center">
        <div className="w-full min-w-0 max-w-2xl flex-1">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70"
          >
            <Radio className="h-3.5 w-3.5 text-emerald-400" />
            Live in Prishtina
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.55 }}
            className="mt-6 font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            {SITE.tagline}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.55 }}
            className="mt-5 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg"
          >
            Clubs, rooftops, live sets, student nights — one pulse for the city. Real venues, real events, no demo filler.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.55 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <NeonButton asChild>
              <Link href="/events">Open tonight&apos;s feed</Link>
            </NeonButton>
            <Link
              href="/#map"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/75 hover:text-white"
            >
              Explore the map
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
          <dl className="mt-10 grid w-full grid-cols-3 gap-4 border-t border-white/10 pt-8 text-center sm:text-left">
            <div>
              <dt className="text-[11px] uppercase tracking-widest text-white/40">Here now</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums text-white">{hereNow.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-widest text-white/40">Tonight</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums text-white">{tonight}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-widest text-white/40">Vibe</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums text-sky-300">{tonight > 0 ? vibe.toFixed(1) : "—"}</dd>
            </div>
          </dl>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="relative flex w-full min-w-0 flex-1 justify-center xl:justify-end"
        >
          <div className="relative aspect-[4/5] w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black shadow-[0_40px_120px_rgba(0,0,0,0.65)]">
            {hasSpotlight && spotlight ? (
              <>
                <Image src={spotlight.image_url} alt="" fill className="object-cover opacity-90" sizes="400px" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 space-y-2 p-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-300">Featured</p>
                  <p className="text-2xl font-bold text-white">
                    {spotlight.venue.name} · {spotlight.title}
                  </p>
                  <p className="text-sm text-white/60">
                    {spotlight.fomo_line || formatEventWhen(spotlight.starts_at)}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <Image src={PLACEHOLDER_IMAGE} alt="" width={120} height={120} className="opacity-40" />
                <p className="mt-6 text-lg font-semibold text-white/80">Events coming soon</p>
                <p className="mt-2 text-sm text-white/50">The city pulse updates as venues go live.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
