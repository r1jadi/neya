import Link from "next/link";
import { SITE } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-black/80 py-14">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">{SITE.name}</p>
          <p className="mt-2 text-sm text-white/55">{SITE.tagline}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Discover</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>
              <Link href="/events" className="hover:text-white">
                Events tonight
              </Link>
            </li>
            <li>
              <Link href="/#venues" className="hover:text-white">
                Venues
              </Link>
            </li>
            <li>
              <Link href="/#map" className="hover:text-white">
                Live map
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Business</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>
              <Link href="/#business" className="hover:text-white">
                Promote your night
              </Link>
            </li>
            <li>
              <span className="text-white/45">Reservations &amp; guestlists</span>
            </li>
            <li>
              <span className="text-white/45">Analytics &amp; payouts</span>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Legal</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>
              <Link href="#" className="hover:text-white">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-white">
                Terms
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-12 max-w-6xl px-4 text-center text-xs text-white/35 sm:px-6">
        © {new Date().getFullYear()} {SITE.name}. Built for Prishtina — scaling across the Balkans.
      </p>
    </footer>
  );
}
