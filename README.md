# NEYA

NEYA is a mobile-first nightlife and event discovery web application focused on Prishtina, Kosovo. It helps visitors discover public events, venues, places, live activity, guides, and ways to plan a night.

## Current functionality

### Public discovery

- Homepage with event discovery, venue listings, activity, stories, highlights, categories, cities, and a Mapbox-backed map when configured.
- Events directory with date windows, search, categories, genres, venues, access type, and price filters.
- Event detail pages with event metadata, venue information, performers, atmosphere, reservations, guestlists, ticket checkout, calendar export, saving, sharing, and My Night actions where applicable.
- Venue directory and venue detail pages with venue information, galleries, music/category data, atmosphere, check-ins, reservations, events, saving, sharing, and directions/map links.
- Places directory with contextual sections such as breakfast, coffee, lunch, work/study, dinner, drinks, and nightlife, using venue categories, `places_types`, and day-part data.
- Discovery map for events and venues with search, event/venue type filters, date/live/weekend filters, category/genre/free filters, map-area search, geolocation, marker previews, and route-related UI.
- Artists directory and artist detail pages, including event lineups and artist following.
- Travel guides with filters, guide details, itinerary/map tools, nearby events, weather, transport information, offline tools, and optional paid guide access.
- City, country, and region discovery routes.
- Search dialog backed by `/api/search`.
- Live Now page and homepage panel backed by `/api/live-now`, showing current events, events starting soon, and venues with available live/open signals.
- “What should I do tonight?” preference flow backed by `/api/recommendations`.
- “Build My Night” planning from recommendations, reusing the existing My Night provider and persistence.

### Accounts and social functionality

- Email signup, login, logout, password reset, password update, and Supabase auth callback handling.
- Onboarding and profile/preferences management.
- User dashboard with reservations, ticket orders, account links, and My Night access.
- Friends page at `/friends` with privacy-limited user discovery, friend requests, accepted friends, and public friend activity.
- Group Night invitation backend based on an existing private My Night plan. The database migration and server actions exist; a complete invitation-management UI is still limited.
- My Night supports up to three venue/event stops, local guest persistence, authenticated persistence, ordering, removal, naming, sharing, map display, and travel hints.

### Booking and commerce

- Table/reservation flows with venue defaults and event-level overrides for price and payment methods.
- Guestlist requests and approval workflows.
- Ticket types, availability, quantity limits, inventory reservation/release, QR payloads, ticket validation, payment attempts, refunds, and payment status handling.
- RaiAccept server-side ticket and reservation payment integration, webhook handling, reconciliation, and idempotency protections.
- Guide purchase flow for paid guides.
- Venue listing payment flow.

### Live and engagement features

- Atmosphere reviews and live atmosphere/pulse displays.
- Public check-ins with public/private/friends visibility options.
- Activity feed records for supported user/system actions.
- Saved events and saved venues.
- Artist follows.
- Stories and venue weekly highlights.
- Product analytics through the existing analytics table, Vercel Analytics, and optional PostHog.
- PWA/service-worker registration and offline UI indicators.

## Admin and business capabilities

### Admin (`/admin`)

Admin access is controlled by the server-side `NEYA_ADMIN_EMAILS` allowlist and the profile/admin permission model. The dashboard includes management for:

- Venues: create, edit, approve, reject, delete, listing/payment-related configuration, images, galleries, opening hours, categories, day parts, places types, social links, reservations, and feature/trending state.
- Events: create, edit, delete, publish/list, feature, premium visibility, submission status, images/posters, venue assignment or custom location, performers, pricing, capacity, reservations, and event sources.
- Ticket types and event ticket configuration.
- Guestlists and guestlist requests.
- Reservation statuses.
- Artists and event/artist assignments.
- Guides, guide days, guide stops, transport, and intercity routes.
- Cities and discovery activation.
- Venue partner accounts, passwords, resets, activation, and deletion.
- Venue highlights.
- Ticket payment operations, refunds, reconciliation, and missing-provider order handling.

### Venue/business portals

- `/business` and related routes support venue/listing and organizer workflows.
- `/venue` and related routes provide venue-owner dashboard, analytics, reservations, guestlists, scanning, and venue management.
- Venue owners can manage supported venue data and event/guestlist operations subject to authentication, ownership, approval, and server-action checks.

## Routes

### Main pages

- `/` — homepage
- `/events` and `/events/[slug]` — event discovery and details
- `/venues` and `/venues/[slug]` — venue discovery and details
- `/places` — contextual venue/place directory
- `/map` — discovery map
- `/live-now` — current live/open/starting-soon discovery
- `/artists` and `/artists/[slug]` — artist directory and profiles
- `/guides`, `/guides/[slug]`, `/guides/[slug]/view` — guide discovery and views
- `/cities/[city]`, `/countries/[country]`, `/regions/[region]` — geographic discovery
- `/my-night`, `/my-night/[token]` — private and shared My Night plans
- `/friends` — authenticated Friends/Social Night page
- `/dashboard`, `/dashboard/preferences` — authenticated account areas
- `/login`, `/register`, `/forgot-password`, `/update-password` — authentication
- `/onboarding` — onboarding/preferences
- `/submit-event` — public event submission
- `/contact`, `/terms`, `/privacy` — informational/legal pages
- `/checkout/success`, `/checkout/failure`, `/checkout/cancel` — checkout result pages

### Business and venue pages

- `/business`, `/business/analytics`, `/business/guestlists`, `/business/reservations`, `/business/scan`
- `/venue`, `/venue/analytics`, `/venue/guestlists`, `/venue/reservations`, `/venue/scan`

### Admin pages

- `/admin`
- `/admin/ticket-payments`

### API routes

- `/api/health`
- `/api/search`
- `/api/live-now`
- `/api/recommendations`
- `/api/social`
- `/api/my-night`
- `/api/my-night/share`
- `/api/auth/reset-password`
- `/api/guides/itinerary`
- `/api/guides/nearby-events`
- `/api/guides/weather`
- `/api/guides/[slug]/export`
- `/api/admin/venue-accounts`
- `/api/checkout` is not present; checkout actions are implemented through server actions and RaiAccept/checkout result routes.
- `/api/webhooks/raiaccept`
- `/api/webhooks/raiaccept-listing`
- `/api/cron/reconcile-tickets`
- `/api/cron/weekly-digest`
- `/api/unsubscribe`

## Technology stack

- Next.js 16.3 with the App Router
- React 19 and TypeScript 5
- Tailwind CSS v4
- Framer Motion
- Radix UI primitives
- Supabase JavaScript and SSR helpers for Auth, Postgres, Storage, and RLS
- Mapbox GL for interactive maps and routes
- TanStack Query and Zustand are installed; the application uses them selectively
- `next-themes` for dark, light, and neobrutal themes
- `lucide-react` for icons
- `fabric` for poster/editor functionality
- RaiAccept payment integration
- Resend email integration (optional, runtime stub when not configured)
- Twilio SMS integration (optional)
- PostHog (optional) and Vercel Analytics
- Vercel Cron for scheduled jobs

## Repository structure

```text
app/                 Next.js pages, layouts, metadata, and API routes
components/          Shared UI, product components, admin, auth, business, My Night, and social UI
features/            Larger composed product areas, including the homepage
services/            Server-side data access and domain services
actions/             Server actions for auth, admin, booking, commerce, My Night, social, and content
lib/                 Shared utilities, Supabase clients, auth, dates, mapping, payments, SEO, and domain logic
types/               Shared TypeScript models
data/                Repository data directory, if populated in a checkout
providers/            Global React providers
hooks/               Reusable client hooks
store/               Zustand state
public/              Static assets and service-worker-related files
supabase/migrations/ Ordered database schema, indexes, RLS, functions, and triggers
```

Temporary `.tmp-*` and `.probe-*` files in the repository are historical QA/audit tooling and generated artifacts, not required application runtime files. They may contain environment-specific probes and should be reviewed separately before removal.

## Requirements

- Node.js compatible with the installed Next.js 16 toolchain
- npm
- A Supabase project for authenticated/data-backed operation
- Mapbox token for interactive maps
- RaiAccept credentials for live payment flows

## Installation and local setup

```bash
npm install
cp .env.example .env.local
```

Populate the required values in `.env.local`. Start the development server with:

```bash
npm run dev
```

Then open `http://localhost:3000`.

The repository currently exposes `dev`, `build`, `start`, and `lint` npm scripts. There is no separate repository-defined `test` script.

## Environment variables

The following names are referenced by application code:

### Core and Supabase

- `NEXT_PUBLIC_SITE_URL` — canonical public URL; defaults to `http://localhost:3000`.
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public Supabase anon key.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only service-role key for admin/server operations. Never expose it to the browser.

### Admin and scheduled jobs

- `NEYA_ADMIN_EMAILS` — comma-separated server-side admin email allowlist.
- `CRON_SECRET` — protects Vercel cron endpoints.
- `DIGEST_SIGNING_SECRET` — signs weekly digest unsubscribe tokens.
- `DIGEST_TOKEN_TTL_DAYS` — optional digest token lifetime; defaults to 90 days.

### Maps and analytics

- `NEXT_PUBLIC_MAPBOX_TOKEN` — Mapbox GL token used by maps and route widgets.
- `NEXT_PUBLIC_POSTHOG_KEY` — optional PostHog project key.
- `NEXT_PUBLIC_POSTHOG_HOST` — optional PostHog host; defaults to `https://app.posthog.com`.

### Payments

- `RAIACCEPT_USERNAME`
- `RAIACCEPT_PASSWORD`
- `RAIACCEPT_AUTH_BASE_URL` — optional override, useful for sandbox/testing.
- `RAIACCEPT_API_BASE_URL` — optional API base URL override.
- `RAIACCEPT_INTEGRATION_NAME` — optional integration metadata; defaults to `NEYA`.
- `RAIACCEPT_INTEGRATION_VERSION` — optional integration metadata; defaults to `1.0.0`.
- `RAIACCEPT_INTEGRATION_VENDOR` — optional integration metadata; defaults to `NEYA`.

### Email and SMS

- `RESEND_API_KEY` — optional transactional email key.
- `RESEND_FROM` — optional email sender; defaults to `NEYA <noreply@neya.live>`.
- `TWILIO_ACCOUNT_SID` — optional SMS account ID.
- `TWILIO_AUTH_TOKEN` — optional SMS auth token.
- `TWILIO_FROM_NUMBER` — optional SMS sender number.

## Database and Supabase setup

Run the SQL files in `supabase/migrations/` in filename order. The migrations create and evolve:

- Profiles and authentication-related profile data
- Venues and venue ownership/approval
- Events, optional venue assignment, categories, statuses, tags, performers, posters, and sources
- Tickets, ticket types, inventory functions, orders, payment attempts, webhook records, and refunds
- Reservations, guestlists, check-ins, reviews, atmosphere snapshots, analytics, notifications, subscriptions, and friendships
- Saved events/venues, artists/follows, guides, cities, venue highlights, event sources, and My Night plans
- Group Night invitations
- RLS policies, indexes, triggers, and server-side Postgres functions

The schema uses Supabase Auth users and `public.profiles`. Server actions use authenticated Supabase clients for user-scoped work and service-role clients for trusted administrative or payment operations.

Important setup requirements:

1. Apply every migration in order, including the later migrations for ticket payments, My Night, discovery, rate limits, hardening, and social Group Night invites.
2. Create/configure Supabase Auth providers as needed. Email authentication is used by the implemented login/register/reset flows.
3. Configure Supabase Auth redirect URLs for `/auth/callback` and `/update-password` for local and deployed environments.
4. Configure the public `neya-media` storage bucket through the CMS migration or Supabase setup.
5. Configure RLS and keep the service-role key server-only.
6. Add verified event/venue data and city records before expecting populated public discovery pages.

## Development commands

```bash
npm run dev      # start Next.js development server
npm run build    # production build and route/type validation
npm run start    # serve the production build
npm run lint     # ESLint
```

TypeScript checking can be run directly with the installed compiler:

```bash
npm exec tsc -- --noEmit
```

The repository contains Node-style test files under `lib/` and targeted tests can be run with the project tooling, for example:

```bash
npm exec tsx -- --test lib/social.test.ts
```

`npx vitest run` currently discovers several Node-style test files that do not define Vitest suites; this is an existing test-runner configuration mismatch rather than a complete application test command.

## Scheduled jobs

`vercel.json` configures:

- `/api/cron/reconcile-tickets` — daily at `03:30` UTC; reconciles RaiAccept ticket payments.
- `/api/cron/weekly-digest` — daily at `16:30` UTC; the endpoint itself limits execution to the correct digest window and prevents duplicate processing.

Both endpoints require `CRON_SECRET` and reject unauthenticated calls.

## Deployment

The application is structured for Vercel deployment as a Next.js App Router application:

1. Install dependencies with `npm install`.
2. Configure the environment variables in the Vercel project.
3. Configure Supabase Auth URLs and apply migrations.
4. Configure Mapbox, RaiAccept, email/SMS services, and analytics as required.
5. Deploy the Next.js project; Vercel reads `vercel.json` for scheduled jobs.
6. Ensure cron requests include the configured `CRON_SECRET`.

The repository does not include a deployment script, Dockerfile, or infrastructure-as-code configuration. Deployment is expected to use the hosting provider’s Next.js build and start integration.

## Implementation notes and limitations

- Prishtina and the `Europe/Belgrade` timezone are the default discovery context.
- Public discovery is backed by Supabase data; empty pages generally indicate missing/unapproved data, unavailable configuration, or a query returning no records.
- Interactive maps require `NEXT_PUBLIC_MAPBOX_TOKEN`; map components display fallback states when it is missing.
- Payment flows require valid RaiAccept configuration and external provider availability. Webhooks and reconciliation are server-side and should be tested in a safe provider environment.
- Email and SMS integrations are optional and return configuration errors when their credentials are absent.
- The public event submission flow creates submissions subject to admin review/listing rules.
- Some legacy compatibility fallbacks remain for migrations such as venue day parts and places types.
- Activity feed records exist for supported actions, but not every possible user action automatically creates a social activity record.
- Check-in visibility supports public/private/friends storage, but the current public activity implementation only exposes activity already permitted by its query and RLS rules.
- Group Night invitation schema and server actions exist, but the current Friends UI is not a complete invitation-management interface.
- There is no single configured end-to-end browser test suite. Existing QA probes and targeted Node tests are supplemental and may create or inspect external data when run.
- The root checkout contains historical `.tmp-*` audit artifacts. They are not required to run the application and should not be treated as production source.

## Verification reference

The main repository checks used for this documentation are:

```bash
npm run lint
npm exec tsc -- --noEmit
npm run build
git diff --check
```

The production build compiles the current App Router pages and API routes, including authentication, admin/business portals, events, venues, places, guides, maps, My Night, Live Now, recommendations, and social routes.
