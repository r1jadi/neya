# NEYA — Cursor / Claude context

NEYA is a **mobile-first web** nightlife and events platform for **Prishtina, Kosovo** first, Balkans later. Not a native app in Phase 1.

## Product north star

Users open NEYA on weekend nights to answer: **“What’s happening tonight?”**  
Tone: FOMO, urgency, premium dark UI, live energy (crowds, atmosphere, scarcity).

## Stack (implemented)

| Layer | Choice |
|--------|--------|
| App | **Next.js 16** (App Router; scaffold used latest `create-next-app`; aligns with Next 15 patterns) |
| UI | Tailwind CSS v4, custom primitives (shadcn-style), **Framer Motion** |
| State / data | **Zustand**, **TanStack Query** |
| Backend | **Supabase** (client + SSR helpers in `lib/supabase/`, SQL in `supabase/migrations/`) |
| Maps | **Mapbox** (`AnimatedMap`; needs `NEXT_PUBLIC_MAPBOX_TOKEN`) |
| Payments | **Stripe** (`lib/stripe/server.ts`, webhook stub `app/api/webhooks/stripe/route.ts`) |
| Email | **Resend** stub (`lib/email/resend.ts`) |
| Analytics | **PostHog** — add provider when keys exist (env vars documented) |

## Repo map

- `app/` — routes: landing, `/events`, `/events/[slug]`, `/venues/[slug]`, `/login`, `sitemap`, `robots`, APIs.
- `components/neya/` — product components: `EventCard`, `VenueCard`, `LiveBadge`, `CrowdIndicator`, `AtmosphereMeter`, `NeonButton`, `GlassCard`, carousels, modals, map, stories.
- `components/ui/` — low-level UI (button, card, badge, dialog, input).
- `features/landing/` — marketing sections composed on `app/page.tsx`.
- `data/mock-data.ts` — Phase 1 placeholders until Supabase wiring.
- `services/` — data access (currently mock; swap for Supabase queries).
- `types/` — shared TypeScript models.
- `store/` — Zustand (minimal `ui-store`).
- `hooks/` — `use-media-query`, `use-supabase-realtime` stub.
- `lib/seo/json-ld.ts` — Organization / Event / Venue structured data helpers.
- `supabase/migrations/` — relational schema + starter RLS.

## Phases (from product brief)

1. **Current:** scaffold, landing, listings, venue/event pages, SEO skeleton, DB schema, auth UI shell.
2. Reservations, guestlists, realtime atmosphere, Mapbox polish.
3. Stripe flows, ticketing, business dashboard, analytics.
4. AI recommendations, premium tier, social graph, scale.

## Conventions

- **Dark-only** theme (`next-themes` forced dark in `AppProviders`).
- **Prishtina** as default city in `lib/constants.ts`.
- Prefer **server components** for data pages; **client** for motion, map, dialogs.
- Images: remote patterns for Unsplash + Cloudinary in `next.config.ts`; add your Supabase storage host when used.

## Env

See `.env.example`. `NEXT_PUBLIC_SITE_URL` should be production URL for metadata and sitemap.

## Middleware note

Next 16 may log deprecation of `middleware` in favor of `proxy`. Session refresh remains in `middleware.ts` via Supabase SSR pattern until migrated.
