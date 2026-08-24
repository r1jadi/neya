import Link from "next/link";
import { SITE } from "@/lib/constants";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function SiteFooter() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <footer className="w-full border-t border-white/[0.06] bg-black/80 py-14">
      <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">{SITE.name}</p>
          <p className="mt-2 text-sm text-white/55">{t.footer.tagline}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">{t.footer.discover}</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>
              <Link href="/events" className="hover:text-white">
                {t.footer.eventsTonight}
              </Link>
            </li>
            <li>
              <Link href="/#venues" className="hover:text-white">
                {t.footer.venues}
              </Link>
            </li>
            <li>
              <Link href="/#map" className="hover:text-white">
                {t.footer.liveMap}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">{t.footer.business}</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>
              <Link href="/#business" className="hover:text-white">
                {t.footer.promoteYourNight}
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white">
                {t.footer.contactUs}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">{t.footer.legal}</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>
              <Link href="/privacy" className="hover:text-white">
                {t.footer.privacy}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-white">
                {t.footer.terms}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-12 w-full min-w-0 max-w-6xl px-4 text-center text-xs text-white/35 sm:px-6">
        © {new Date().getFullYear()} {SITE.name}. {t.footer.builtFor}
      </p>
    </footer>
  );
}