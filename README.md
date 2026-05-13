# NEYA

Nightlife and events discovery for **Prishtina** — clubs, rooftops, live music, guestlists, reservations, and tickets. Mobile-first web (PWA-ready path), B2B monetization later.

## Stack

- [Next.js](https://nextjs.org/) 16 (App Router) + TypeScript  
- Tailwind CSS v4, Framer Motion, TanStack Query, Zustand  
- Supabase (Auth, DB, Storage, Realtime) — see `supabase/migrations/`  
- Mapbox (`NEXT_PUBLIC_MAPBOX_TOKEN`)  
- Stripe, Resend, PostHog — wired via env (stubs where noted in code)

## Local development

```bash
npm install
cp .env.example .env.local
# Fill Supabase URL + anon key at minimum for auth middleware refresh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (metadata, sitemap) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin operations (never expose) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox GL access token |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature |
| `RESEND_API_KEY` | Transactional email |
| `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` | Product analytics |

## Vercel deployment

1. Create a **GitHub** repository and push this project (`git remote add origin …`, `git push -u origin main`).
2. In [Vercel](https://vercel.com/new), **Import** the GitHub repo; framework preset **Next.js**.
3. Add **Environment variables** (Production + Preview) matching `.env.example`.
4. **Domain:** Project → Settings → Domains → add `neya.app` (or your domain) and follow DNS instructions.
5. **Supabase:** Create production project; run SQL from `supabase/migrations/`; enable Auth providers (Email, Google, Apple); configure redirect URLs to `https://<your-domain>/auth/callback` (add route when implementing OAuth callback).
6. **Stripe:** Dashboard → Developers → Webhooks → endpoint `https://<your-domain>/api/webhooks/stripe` → copy signing secret to `STRIPE_WEBHOOK_SECRET`; implement verification in the route handler.
7. **Mapbox:** Account → access token → `NEXT_PUBLIC_MAPBOX_TOKEN`.
8. **Resend:** Verify sending domain; set `RESEND_API_KEY`.
9. **PostHog:** Create project; set `NEXT_PUBLIC_POSTHOG_KEY` and host.
10. **Cloudinary:** Optional; add image URLs or Next image `remotePatterns` for your cloud name.

Redeploy after changing env vars.

## Scripts

- `npm run dev` — development server  
- `npm run build` — production build  
- `npm run start` — serve production build  
- `npm run lint` — ESLint  

## License

Private / all rights reserved unless you add a license.
