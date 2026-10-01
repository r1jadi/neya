# Brag Plan: NEYA

## What is this app?

NEYA is a mobile-first nightlife discovery app for Prishtina, Kosovo. It answers one question — "What's happening tonight?" — with live crowd counts and vibe scores, a preference-driven recommendations flow, and a shareable three-stop night plan.

## The angle

**The city has a pulse, and NEYA reads it.**

A night out compressed into 21 seconds. The app asks what you want, the city answers, and you walk out the door with a plan. Dark, neon, urgent — cut like the last five minutes before you leave the house. Not a feature tour: the product *doing its one job*.

The honest story here is a **three-tap decision**. Most nightlife apps are directories. NEYA collapses "what is there" into "what should *I* do", then hands you a route you can send to friends. That's the claim the video lands.

## Hook (first 2-3 seconds)

NEYA's actual tagline — **"What's happening tonight?"** — lands big on near-black, set in the product's own display face, with the three blurred neon glows from the real hero (fuchsia top-left, sky right, violet bottom) breathing behind it and a `LIVE` badge with a pinging emerald dot.

The music's first detected beat is at **3.02s** — the track opens with a quiet intro. So the hook lands in near-silence and the beat drops *exactly* as the city's pulse appears. Free drama, no edit trickery.

## Key moments

- **The pulse row counts up.** `HERE NOW` → 184, `TONIGHT` → 27, `VIBE` → 8.4. Real hero stats, real labels, ticking on beats 3.02 / 4.02 / 5.03.
- **"What should I do tonight?"** The real preference flow. Vibe chips from the actual product (`chill · party · live music · date · techno · rooftop`) get pressed one at a time by a simulated cursor, then `Show my night`.
- **"Your night, sorted."** Result cards arriving one by one — each one an authentic NEYA event card: venue eyebrow, title, genre sparkle, `⭐ Vibe 8.7`, `€12` price chip, and a thumbnail.
- **Build My Night → three stops.** `01 / 02 / 03` stacking into a plan with travel hints between them, on a dark map.

## Outro / punchline

**"Plan the night, not just the event."** — real copy from the guides section — then the NEYA wordmark slams in with the tagline underneath.

Share line: `What's happening tonight? · neya.live`

## User flow worth showing

**Entry → key action → result**, pulled from the actual routed components:

1. **Entry** — the tagline and the live city pulse. The app already knows the answer before you ask.
2. **Key action** — "What should I do tonight?" → pick a vibe → budget → distance → `Show my night`.
3. **Result** — "Your night, sorted." → `Build My Night` → a three-stop plan with travel hints, shareable via link.

This is the centrepiece. Scenes 3 and 4 are the working app, not the marketing page. Scene 2's stat row is the *one* landing-page element used as a frame around the flow.

## Tone

- **Preset:** `default`
- **Creative direction:** "neon city pulse — a night out in three taps"
- **Interpretation:** Confident and clean rather than jokey — this is a real product, so the humour budget is spent on the *idea* (a city that answers you) rather than gags. Pacing comes from fast entrances and beat-aligned reveals while every line holds long enough to read; one composed neon glow instead of chaotic flashes.

## Format: landscape — 1920x1080

## Duration: 21.5s

## Visual identity (from the project)

- **Background:** `#030306` (NEYA's default dark `--background`)
- **Accent:** `#38bdf8` (sky `--primary`) + `#f472b6` (fuchsia `--accent`); emerald `#34d399` for `LIVE`; ambient violet glow `rgba(124,58,237,0.18)` (`--bg-glow`)
- **Text:** `#f4f4f8` (`--foreground`), dimmed to 40–60% white for eyebrows/labels
- **Display font:** **Outfit** — NEYA's real `--font-display`, and it is in the renderer's pre-bundled set at 400/700/900, so it renders offline and deterministically
- **Body font:** Geist → **Inter** (Geist is not pre-bundled; Inter is the closest bundled grotesque)
- **Label/mono:** **JetBrains Mono** (bundled, uppercase + wide tracking, matching NEYA's `tracking-[0.2em]` eyebrow style)
- **Strongest visual element:** the neon CTA pill (`linear-gradient` sky-400 → cyan-300 → fuchsia-400, `shadow: 0 0 32px rgba(56,189,248,0.45)`) — NEYA's signature button, which doubles as the video's accent motif
- **Brand asset available:** `public/neyalogo.png`

**Font note:** the hyperframes-creative typography reference lists Outfit among "banned monoculture" families. I'm overriding that deliberately: Outfit is this project's *actual* brand face, and the brag workflow explicitly instructs carrying the project's display font through to the composition. Fidelity to the product beats a generic anti-default rule here. Body/label fonts use bundled non-banned picks.

**Data note:** `data/` is empty in this checkout and the app serves live Supabase rows, so no real event, venue, or user data exists to leak. All event titles, venue names, prices, and counts in the video are **plausible fictional stand-ins** in Prishtina nightlife style. No real names, emails, or identifiers appear anywhere in the composition.

## Share copy (draft)

What's happening tonight? NEYA reads the pulse of Prishtina and hands you a plan — three taps, one night out.

## Audio direction

- **Role:** Energetic but composed bed carrying the whole video, with a small number of motion-matched accents. The track's quiet intro is used as a free dramatic device for the hook.
- **Music:** `happy-beats-business-moves-vol-1-by-ende-dot-app.mp3` — 120.19 BPM, 2:44, the most energetic of the five bundled tracks. Volume ~0.34; no fade-in (the track's own quiet intro is the fade); fade out across the final 0.8s.
- **Music treatment:** Start at 0s. Bed sits under everything. The first real beat (3.02s) is treated as the video's ignition point.
- **Music cue guidance:** Preset available — `assets/music/cues/happy-beats-business-moves-vol-1-by-ende-dot-app.music-cues.md`. Tempo 120.19 BPM, beat grid from 3.02s at ~0.50s spacing.
  - **Strong-cue locks (3):** `16.02` for the `Build My Night` press, `17.02` for the plan reveal, `20.02` for the logo slam.
  - **Beat-grid windows:** 3.02–5.53 for the three stat ticks (one per beat); 13.51–16.02 for the three result cards (one per beat, ~1.0s apart so each holds well past the readability floor); 17.52–19.52 for the three plan stops.
  - **Restraint note:** no cue sync inside the hook — the quiet intro must stay quiet.
- **Audio-reactive treatment:** subtle; let the hero glow and the plan card's neon edge breathe with music RMS/bass. No waveform bars, no equalizer, no text scaling.
- **SFX posture:** moderate — roughly 6–8 cues across 21.5s, motion-matched, nothing aggressive.
- **Audio-coupled moments:** the stat count-up (one tick per beat); the preference chips being pressed (a soft UI click each); `Show my night` press (a single crisp click); result cards landing one by one (soft card/place accents, accenting the first and last rather than all three); the plan stops stacking; the final logo (one resonant bell hit).
- **Restraint rule:** audio must never out-run the copy. No stacked cues on the same beat, no cue during the hook, and nothing percussive under the two headline lines.

## Storyboard

### Scene 1 — HOOK — 3.0s

Near-black `#030306`. Three blurred neon orbs (fuchsia, sky, violet) drift in behind the type. A `LIVE` badge with a pinging emerald dot and `PRISHTINA` fade up first. Then the headline **"What's happening tonight?"** types in character by character in Outfit 900, and a thin sky underline sweeps under it. Slight vignette. Nothing else on screen.
Sequential/interaction: yes — headline types in character by character; `LIVE` badge pings continuously.
Audio intent: quiet, anticipatory space. The music's intro carries it with no percussion.
Audio-coupled idea: randomize `keyboard/keypress-*.wav` across the typed characters, thinned out so it reads as texture, not typing class.
Music: energetic track, quiet intro section only.
Transition mood: hard cut on the first beat → Scene 2.

### Scene 2 — THE PULSE — 3.5s

The hero's real stat row, built as a three-column row on a hairline divider: `HERE NOW` / `TONIGHT` / `VIBE`. The three numbers count up from zero — **184**, **27**, and **8.4** in sky `#38bdf8`. Each lands on its own beat (3.02 / 4.02 / 5.03). Behind them, a soft radial city-glow pulses gently with the bass.
Sequential/interaction: yes — three stats tick up one after another, each arriving on a beat.
Audio intent: the city waking up. First real beat of the track lands here.
Audio-coupled idea: one soft tick per stat (`casino/chips-stack-*` family reads as a counter incrementing) — accent the first and last, keep the middle quiet.
Music: full bed enters at full level.
Transition mood: clean wipe → Scene 3.

### Scene 3 — THE ASK — 5.5s

A dark panel with a sky→fuchsia gradient border fade. Eyebrow `FIND YOUR MOVE` in JetBrains Mono, then the headline **"What should I do tonight?"** and the real subline *"A few quick answers, then we'll line up the best options in the city."* Below, the true vibe chips — `chill` · `party` · `live music` · `date` · `techno` · `rooftop` — arrive in sequence, then a simulated cursor presses **rooftop**, which fills with the fuchsia selected state. A `Show my night` neon pill pulses once.
Sequential/interaction: yes — six chips arrive one by one; cursor presses `rooftop`; then `Show my night`.
Audio intent: quickening. This is the decision happening in real time.
Audio-coupled idea: one crisp `interface/click_*` on the chip press and one on the CTA. Chips themselves arrive with very soft `interface/drop_*` accents on the first and last only.
Music: full bed.
Transition mood: hard cut → Scene 4.

### Scene 4 — SORTED — 5.0s

Headline **"Your night, sorted."** with eyebrow `TONIGHT FOR YOU`, landing on a strong beat. Then three authentic NEYA event cards arrive one by one, each holding ~1.0s: venue eyebrow in uppercase wide tracking, title in Outfit, `⭐ Vibe 8.7`, an `Event` label, a price chip, and a thumbnail block. One card carries a `LIVE` badge with `128 here`. A `Build My Night` pill sits ready at the end.
Sequential/interaction: yes — three result cards land one at a time, ~1.0s apart (comfortably past the read floor).
Audio intent: the payoff. Compression and release.
Audio-coupled idea: soft card-landing accents on the first and last card only; a single bell-family hit as `Build My Night` is pressed.
Music: full bed, riding the strong cue at 16.02.
Transition mood: dramatic wipe → Scene 5.

### Scene 5 — OUTRO — 4.5s

The plan assembles: three numbered stops `01` `02` `03` stack into a vertical route with hairline connectors and a small travel hint between each (`6 min cab`), over a dark map grid with three glowing pins. Then the copy **"Plan the night, not just the event."** and the NEYA wordmark slams in on the strong beat at 20.02, tagline `What's happening tonight?` underneath, with the music fading out over the last 0.8s.
Sequential/interaction: yes — stops and pins arrive in sequence, connectors drawing between them.
Audio intent: arrival. Confident, resolved, done.
Audio-coupled idea: one `impact/impactBell_heavy_000` on the logo slam; restrained soft accents as each stop lands.
Music: full bed → fade out over final 0.8s.
Transition mood: hold to end.

**Music mood for this video:** upbeat
**Audio summary:** A quiet neon hook that ignites exactly as the beat drops, then a steadily building bed carrying the three-tap decision from "what's happening" through "your night, sorted" to a resolved, shareable plan.
