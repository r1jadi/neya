# Hyperframes Composition Brief: NEYA

## Objective

Create a short launch-style brag video for **NEYA** — a mobile-first nightlife discovery app for Prishtina, Kosovo.

## Output

- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 21.5 seconds

## Source Material

- Project root: repository root
- Primary files read: `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `features/landing/hero.tsx`, `features/landing/sections.tsx`, `components/neya/home-event-card.tsx`, `components/neya/live-badge.tsx`, `components/neya/neon-button.tsx`, `components/neya/fomo-ticker.tsx`, `components/neya/tonight-recommendations.tsx`, `components/my-night/my-night-planner.tsx`, `lib/recommendations.ts`, `lib/constants.ts`, `README.md`, `package.json`
- Product name: **NEYA**
- Tagline / strongest claim: **"What's happening tonight?"**
- Key UI or visual moment to recreate: the hero — LIVE pill + tagline + the three-stat pulse row (`HERE NOW` / `TONIGHT` / `VIBE`); then the "What should I do tonight?" preference flow; then the event result cards; then the three-stop My Night plan.
- Copy that must appear verbatim (all of it is real NEYA copy):
  - `What's happening tonight?`
  - `LIVE` (LiveBadge) and `PRISHTINA`
  - `HERE NOW` / `TONIGHT` / `VIBE`
  - `FIND YOUR MOVE` · `What should I do tonight?`
  - `A few quick answers, then we'll line up the best options in the city.`
  - `chill` · `party` · `live music` · `date` · `techno` · `rooftop` (the real `VIBES` array)
  - `Show my night` (real CTA) · `Finding your night…` (real loading state)
  - `TONIGHT FOR YOU` · `Your night, sorted.`
  - `Build My Night` (real CTA)
  - `Plan the night, not just the event.`
  - `Event` / `Place` kind labels, `⭐ Vibe 8.7`, `€12` price chip, `128 here` crowd chip

## Creative Direction

- Tone preset: `default`
- Creative direction: "neon city pulse — a night out in three taps"
- Interpretation: Confident and clean, not jokey. Pacing comes from fast entrances and beat-aligned reveals while each line holds long enough to read. One composed neon glow, no chaotic flashing.
- Angle: The city has a pulse and NEYA reads it. A night out compressed into 21 seconds — the app asks what you want, the city answers, and you walk out the door with a plan. Not a feature tour: the product doing its one job.
- Hook: `What's happening tonight?` lands big on near-black, with fuchsia/sky/violet glows breathing behind it and a LIVE badge with a pinging emerald dot. The track has no beats before 3.02s, so the hook lands over a quiet intro and the beat drops exactly as the city's pulse appears.
- Outro / punchline: `Plan the night, not just the event.` → NEYA wordmark slam.
- Avoid: generic SaaS language, abstract filler visuals, unrelated visual redesign.

## Visual Identity

- Background: `#030306`
- Text: `#f4f4f8`
- Accent: `#38bdf8` (sky) + `#f472b6` (fuchsia); emerald `#34d399` for LIVE; ambient violet `rgba(124,58,237,0.18)`
- Display font: **Outfit** (400/700/900 — pre-bundled)
- Body font: **Inter** (Geist is not pre-bundled; Inter is the closest bundled grotesque)
- Label/mono font: **JetBrains Mono** (pre-bundled, uppercase + wide tracking matching NEYA's `tracking-[0.2em]` eyebrow style)
- Visual references from the project: the neon CTA pill gradient (sky-400 → cyan-300 → fuchsia-400, `0 0 32px rgba(56,189,248,0.45)` glow), the LIVE badge with pinging dot, the `rounded-2xl` card with `border-white/[0.08]` + `bg-zinc-950/60`, the uppercase wide-tracked venue eyebrow, the fuchsia gradient panel border on the recommendations block.
- Brand asset available: `public/neyalogo.png`
- **Font override note:** the hyperframes-creative typography reference lists Outfit among banned monoculture families. Overridden deliberately — Outfit is this project's real brand face and the brag workflow instructs carrying the project's display font into the composition.

## Storyboard

Use `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. **HOOK** — 3.0s — `LIVE` badge + `PRISHTINA`; `What's happening tonight?` types in; glow layer breathes.
2. **THE PULSE** — 3.5s — the three-stat row counts up: 184 / 27 / 8.4.
3. **THE ASK** — 5.5s — `FIND YOUR MOVE` + `What should I do tonight?` + subline; six vibe chips arrive; cursor presses `rooftop`; `Show my night` pulses.
4. **SORTED** — 5.0s — `TONIGHT FOR YOU` + `Your night, sorted.`; three event cards land one by one; `Build My Night` pressed.
5. **OUTRO** — 4.5s — three numbered stops stack into a plan with travel hints; `Plan the night, not just the event.`; NEYA wordmark on the bell hit; music fades out.

## Audio

- Audio role: energetic but composed bed carrying the whole video, plus a small number of motion-matched accents
- Audio arc: quiet neon hook → beat drops at 3.02s with the pulse row → building bed through the decision → resolves on the logo, then fades
- Music: `assets/music/happy-beats-business-moves-vol-1-by-ende-dot-app.mp3` (120.19 BPM, 2:44). Volume ~0.34. No fade-in — the track's own quiet intro is the fade. Fade out across the final 0.8s to 21.5s.
- Music cue guidance: bundled preset present — `assets/music/happy-beats-business-moves-vol-1-by-ende-dot-app.music-cues.json` (rich schema: `beats` + `strongCues`).
  - Beat grid begins at **3.02s** and runs ~0.50s per beat (3.02, 3.52, 4.02, 4.53, 5.03, 5.53, 6.03, 6.52, 7.02, …).
  - Strong-cue locks (3): `16.02` (Build My Night press), `17.02` (plan reveal), `20.02` (logo slam).
  - Beat-grid windows: `3.02/4.02/5.03` for the three stat ticks; `13.51/14.52/15.52` for the three result cards (~1.0s apart, well past the read floor); `17.52/18.52/19.52` for the three plan stops.
  - Restraint: no cue sync inside the hook — the quiet intro stays quiet.
- Audio-reactive treatment: **subtle** — pre-extracted band data drives the hero glow's intensity and the ambient orb drift, plus a few percent of scale on the neon pill. No waveform/equalizer/particle visuals, no strobing.
- Audio-coupled moments:
  - Scene 1 hook — typed headline (per-character keys) + a soft entrance accent under the LIVE badge
  - Scene 2 pulse — three stat ticks, one per beat; accent the first and last only
  - Scene 3 ask — one crisp click per simulated press (`rooftop` chip, then `Show my night`); very soft accents on the first and last chip arrival
  - Scene 4 sorted — card-landing accents on the first and last card; one warm impact on the `Build My Night` press, beat-locked to 16.02
  - Scene 5 outro — soft accents as each stop lands; `impactBell_heavy_000` on the logo slam at 20.02
- SFX selection guidance: warm/soft palette, biased to low high-frequency risk. Planned picks — `keyboard/keypress-0NN.wav` (deterministic rotation by character index; no `Math.random`), `ui/click2.ogg`, `interface/click_003.ogg`, `ui/rollover2.ogg` (stat ticks), `casino/card-slide-1.ogg` (card landings), `impact/impactSoft_medium_001.ogg` (major reveal), `impact/impactSoft_medium_004.ogg` (scene transition), `impact/impactBell_heavy_000.ogg` (logo payoff, medium risk — used once).
- SFX analysis guidance: `.agents/skills/brag/assets/sfx/sfx-analysis.md` (+ `.json`). Prefer low/medium HF risk; reserve high-risk bright files for tiny isolated accents.
- Exact SFX choice: Hyperframes owns filenames, timestamps, density, and volume. Planned picks above are guidance.
- Audio files: music is already copied to `brag-output/composition/assets/music/`. Selected SFX copied into `brag-output/composition/assets/sfx/`.

## Hyperframes Instructions

Loaded skills: `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, `hyperframes-cli`. This is the `/brag` workflow — do **not** enter the `hyperframes` entry-point intent interview and do not route into the generic promo / launch-video workflow. Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:

- Show at least one real UI, copy, or visual element from the source project. (This brief recreates five.)
- Keep all text readable in the final render.
- Keep the video within 15-25 seconds — target 21.5s.
- Include the planned music/SFX layer; audio was not disabled.
- Treat `/brag` audio notes as guidance, not a fixed cue sheet. Choose exact SFX after the visual animation exists.
- Treat music cue metadata as optional timing hints, ignoring cues that hurt readability, scene pacing, or the product story.
- Major reveals within ±0.15s of a strong cue; smaller entrances within ±0.10s of a beat. Only 3 strong-cue locks.
- Honor the music fade-out over the final 0.8s; let the logo bell ring over it.
- Run audio-reactive extraction via the `hyperframes-creative` audio-reactive workflow and wire at least one visual element to the band data. If extraction is unavailable, document it and skip — do not block the render.
- **Continuous motion:** the composition must keep at least one element animating (finite repeats only — no `repeat: -1`) across the whole 21.5s so `check`'s `sweep_static` audit sees geometry change at every sample. The ambient glow layer covers this.
- Use local assets for audio and runtime/media dependencies.
- Run `hyperframes check` before render — brag's single gate.
- Keep creation and rendering local. Remote or publishing workflows require a separate explicit user request.

## Environment note

This machine has **no system-wide FFmpeg**. Hyperframes must be invoked through the project wrapper `scripts/hyperframes.sh`, which puts the project-local portable build (`.tools/ffmpeg/`) on PATH. Invoke as `bash scripts/hyperframes.sh <args>` from the composition directory.
