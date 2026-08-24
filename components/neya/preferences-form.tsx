"use client";

import { useState, useTransition } from "react";
import { PreferenceChips, type ChipOption } from "@/components/neya/preference-chips";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { updatePreferences } from "@/actions/user-preferences";

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

const MUSIC_OPTIONS: ChipOption[] = [
  { id: "techno", label: "Techno" },
  { id: "house", label: "House" },
  { id: "tech_house", label: "Tech House" },
  { id: "deep_house", label: "Deep House" },
  { id: "melodic_techno", label: "Melodic Techno" },
  { id: "hip_hop", label: "Hip Hop" },
  { id: "rap", label: "Rap" },
  { id: "r_and_b", label: "R&B" },
  { id: "pop", label: "Pop" },
  { id: "dance", label: "Dance" },
  { id: "edm", label: "EDM" },
  { id: "disco", label: "Disco" },
  { id: "funk", label: "Funk" },
  { id: "soul", label: "Soul" },
  { id: "jazz", label: "Jazz" },
  { id: "live_music", label: "Live Music" },
  { id: "drum_and_bass", label: "Drum & Bass" },
  { id: "reggaeton", label: "Reggaeton" },
  { id: "latin", label: "Latin" },
  { id: "balkan", label: "Balkan" },
  { id: "albanian", label: "Albanian" },
  { id: "indie", label: "Indie" },
  { id: "rock", label: "Rock" },
  { id: "alternative_rock", label: "Alternative Rock" },
];

const CITIES: ChipOption[] = [
  { id: "prishtina", label: "Prishtina" },
  { id: "prizren", label: "Prizren" },
  { id: "ferizaj", label: "Ferizaj" },
  { id: "gjilan", label: "Gjilan" },
  { id: "peja", label: "Peja" },
  { id: "mitrovica", label: "Mitrovica" },
];

interface PreferencesFormProps {
  initialInterests: string[];
  initialGenres: string[];
  initialCity: string;
  initialAge: number | null;
}

export function PreferencesForm({
  initialInterests,
  initialGenres,
  initialCity,
  initialAge,
}: PreferencesFormProps) {
  const [interests, setInterests] = useState(initialInterests);
  const [genres, setGenres] = useState(initialGenres);
  const [city, setCity] = useState(initialCity);
  const [, startTransition] = useTransition();

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

  function handleSubmit(formData: FormData) {
    interests.forEach((id) => formData.append("category", id));
    genres.forEach((id) => formData.append("genre", id));
    startTransition(async () => {
      await updatePreferences(formData);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-8">
      <input type="hidden" name="city_slug" value={city} />

      {/* Nightlife interests */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-widest text-white/45">
          Nightlife
        </h3>
        <p className="mt-1 text-xs text-white/40">
          The scenes you chase — we&apos;ll match venues and events.
        </p>
        <div className="mt-3">
          <PreferenceChips
            options={NIGHTLIFE_OPTIONS}
            selected={interests}
            onToggle={toggleInterest}
          />
        </div>
      </section>

      {/* Music genres */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-widest text-white/45">
          Music
        </h3>
        <p className="mt-1 text-xs text-white/40">
          Genres you actually listen to.
        </p>
        <div className="mt-3">
          <PreferenceChips
            options={MUSIC_OPTIONS}
            selected={genres}
            onToggle={toggleGenre}
          />
        </div>
      </section>

      {/* City */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-widest text-white/45">
          City
        </h3>
        <p className="mt-1 text-xs text-white/40">
          Where you usually go out.
        </p>
        <div className="mt-3">
          <PreferenceChips
            options={CITIES}
            selected={[city]}
            onToggle={(id) => setCity(id)}
          />
        </div>
      </section>

      {/* Age */}
      <section>
        <label htmlFor="age" className="text-sm font-semibold uppercase tracking-widest text-white/45">
          Age <span className="text-white/30">(optional)</span>
        </label>
        <p className="mt-1 text-xs text-white/40">
          Helps us show age-appropriate events.
        </p>
        <Input
          id="age"
          name="age"
          type="number"
          min={16}
          max={99}
          defaultValue={initialAge ?? ""}
          placeholder="21"
          className="mt-2 max-w-[120px]"
        />
      </section>

      <SubmitButton className="w-full" pendingText="Saving…">
        Save preferences
      </SubmitButton>
    </form>
  );
}
