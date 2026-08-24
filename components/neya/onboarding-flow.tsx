"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PreferenceChips, type ChipOption } from "@/components/neya/preference-chips";
import { Button } from "@/components/ui/button";
import { completeOnboarding } from "@/actions/auth-account";
import { MUSIC_GENRES } from "@/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NIGHTLIFE_OPTIONS: ChipOption[] = [
  { id: "nightclub", label: "Clubs", icon: "🔥" },
  { id: "lounge", label: "Lounges", icon: "🍸" },
  { id: "bar", label: "Bars", icon: "🍺" },
  { id: "rooftop", label: "Rooftops", icon: "🌅" },
  { id: "live_music", label: "Live music", icon: "🎤" },
  { id: "festival", label: "Festivals", icon: "🎪" },
  { id: "cocktail_bar", label: "Cocktails", icon: "🍹" },
  { id: "restaurant", label: "Dining", icon: "🍽" },
];

// Curated subset of music genres — the full list is overwhelming
const MUSIC_OPTIONS: ChipOption[] = MUSIC_GENRES.filter((g) =>
  [
    "techno",
    "house",
    "tech_house",
    "deep_house",
    "melodic_techno",
    "hip_hop",
    "rap",
    "r_and_b",
    "pop",
    "dance",
    "edm",
    "disco",
    "funk",
    "soul",
    "jazz",
    "live_music",
    "drum_and_bass",
    "reggaeton",
    "latin",
    "balkan",
    "albanian",
    "indie",
    "rock",
    "alternative_rock",
  ].includes(g.id),
).map((g) => ({ id: g.id, label: g.label }));

const STEPS = [
  { id: "intro", label: "Welcome" },
  { id: "interests", label: "Interests" },
  { id: "music", label: "Music" },
  { id: "done", label: "Done" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function OnboardingFlow() {
  const { t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<StepId>("intro");
  const [interests, setInterests] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  function next() {
    const nextStep = STEPS[stepIndex + 1];
    if (nextStep) setStep(nextStep.id);
  }
  function back() {
    const prevStep = STEPS[stepIndex - 1];
    if (prevStep) setStep(prevStep.id);
  }

  function toggleInterest(id: string) {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }
  function toggleGenre(id: string) {
    setGenres((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function finish() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("city_slug", "prishtina");
      interests.forEach((id) => formData.append("category", id));
      genres.forEach((id) => formData.append("genre", id));
      await completeOnboarding(formData);
      router.refresh();
      router.push("/events");
    });
  }

  function skip() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("city_slug", "prishtina");
      await completeOnboarding(formData);
      router.refresh();
      router.push("/events");
    });
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      {step !== "intro" && step !== "done" ? (
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.slice(1, -1).map((s, i) => {
            const isActive = s.id === step;
            const isPast = i < stepIndex - 1;
            return (
              <div
                key={s.id}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  isActive ? "w-8 bg-fuchsia-400" : isPast ? "w-1.5 bg-fuchsia-500/50" : "w-1.5 bg-white/15",
                )}
              />
            );
          })}
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {step === "intro" ? (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center"
          >
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-violet-500/20">
              <span className="text-3xl">🌙</span>
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-white">
              {t.onboarding.introTitle}
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-sm text-white/55">
              {t.onboarding.introBody}
            </p>
            <Button onClick={next} className="mt-8 w-full" size="lg">
              {t.onboarding.letsGo}
            </Button>
            <button onClick={skip} className="mt-3 text-xs text-white/40 hover:text-white/60">
              {t.onboarding.skipForNow}
            </button>
          </motion.div>
        ) : null}

        {step === "interests" ? (
          <motion.div
            key="interests"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h2 className="text-xl font-bold text-white">{t.onboarding.scenes}</h2>
            <p className="mt-1 text-sm text-white/55">{t.onboarding.scenesBody}</p>
            <div className="mt-6">
              <PreferenceChips
                options={NIGHTLIFE_OPTIONS}
                selected={interests}
                onToggle={toggleInterest}
              />
            </div>
            <div className="mt-8 flex gap-2">
              <Button variant="secondary" onClick={back}>
                {t.onboarding.back}
              </Button>
              <Button onClick={next} className="flex-1">
                {t.onboarding.continue}
              </Button>
            </div>
            <button onClick={skip} className="mt-3 w-full text-center text-xs text-white/40 hover:text-white/60">
              {t.onboarding.skip}
            </button>
          </motion.div>
        ) : null}

        {step === "music" ? (
          <motion.div
            key="music"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h2 className="text-xl font-bold text-white">{t.onboarding.music}</h2>
            <p className="mt-1 text-sm text-white/55">{t.onboarding.musicBody}</p>
            <div className="mt-6">
              <PreferenceChips
                options={MUSIC_OPTIONS}
                selected={genres}
                onToggle={toggleGenre}
              />
            </div>
            <div className="mt-8 flex gap-2">
              <Button variant="secondary" onClick={back}>
                {t.onboarding.back}
              </Button>
              <Button onClick={next} className="flex-1">
                {t.onboarding.continue}
              </Button>
            </div>
            <button onClick={skip} className="mt-3 w-full text-center text-xs text-white/40 hover:text-white/60">
              {t.onboarding.skip}
            </button>
          </motion.div>
        ) : null}

        {step === "done" ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-fuchsia-500/20">
              <span className="text-3xl">🌙</span>
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-white">
              {t.onboarding.ready}
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-sm text-white/55">
              {interests.length || genres.length ? t.onboarding.readyBody : t.onboarding.readyBodyNone}
            </p>
            {interests.length || genres.length ? (
              <div className="mx-auto mt-6 flex max-w-sm flex-wrap justify-center gap-2">
                {interests.slice(0, 4).map((id) => {
                  const opt = NIGHTLIFE_OPTIONS.find((o) => o.id === id);
                  return opt ? (
                    <span key={id} className="rounded-full border border-fuchsia-400/40 bg-fuchsia-500/10 px-2.5 py-1 text-xs text-fuchsia-100">
                      {opt.icon} {opt.label}
                    </span>
                  ) : null;
                })}
                {genres.slice(0, 3).map((id) => {
                  const opt = MUSIC_OPTIONS.find((o) => o.id === id);
                  return opt ? (
                    <span key={id} className="rounded-full border border-sky-400/40 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-100">
                      🎧 {opt.label}
                    </span>
                  ) : null;
                })}
              </div>
            ) : null}
            {error ? (
              <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            ) : null}
            <Button onClick={finish} disabled={pending} className="mt-8 w-full" size="lg">
              {pending ? t.onboarding.saving : t.onboarding.explore}
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}