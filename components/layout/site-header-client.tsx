"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { useMyNight } from "@/components/my-night/my-night-provider";
import { SearchDialog } from "@/components/neya/search-dialog";
import { LanguageSwitcher } from "@/components/neya/language-switcher";
import { ThemeToggle } from "@/components/neya/theme-toggle";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/events", key: "discover" },
  { href: "/my-night", key: "myNight" },
  { href: "/artists", key: "artists" },
  { href: "/guides", key: "guides" },
  { href: "/map", key: "map" },
  { href: "/#business", key: "forVenues" },
  { href: "/submit-event", key: "submitEvent" },
] as const;

export function SiteHeaderClient({
  userEmail,
  isAdmin,
  showBusiness,
  showVenuePortal,
  isPremium,
}: {
  userEmail: string | null;
  isAdmin: boolean;
  showBusiness: boolean;
  showVenuePortal?: boolean;
  isPremium?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useI18n();
  const authed = Boolean(userEmail);
  const { hydrated, stops } = useMyNight();
  const stopCount = hydrated ? stops.length : 0;

  const links = navLinks.map((l) => ({ href: l.href, label: t.common[l.key] }));

  /**
   * Route-based active matching: a nav item is active only when the current
   * pathname is exactly its route or a nested child of it (e.g. /events/xyz
   * activates the /events item). Anchor links (/#map, /#business) are in-page
   * jumps, not routes, so they never match a pathname — the home page keeps
   * no nav item active.
   */
  function isActive(href: string) {
    if (href.startsWith("/#")) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const authedLinks = (
    <>
      <Button variant="ghost" asChild>
        <Link href="/dashboard">{t.common.dashboard}</Link>
      </Button>
      {showVenuePortal ? (
        <Button variant="ghost" asChild>
          <Link href="/venue">{t.common.venuePortal}</Link>
        </Button>
      ) : null}
      {showBusiness && !showVenuePortal ? (
        <Button variant="ghost" asChild>
          <Link href="/business">{t.common.venueHub}</Link>
        </Button>
      ) : null}
      {isAdmin ? (
        <Button variant="ghost" asChild>
          <Link href="/admin">{t.common.admin}</Link>
        </Button>
      ) : null}
      <SignOutButton />
    </>
  );

  const guestLinks = (
    <>
      <Button variant="ghost" asChild>
        <Link href="/login">{t.common.logIn}</Link>
      </Button>
      <Button variant="ghost" asChild>
        <Link href="/register">{t.common.register}</Link>
      </Button>
    </>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-black/55 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full min-w-0 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-white">
            {SITE.name}
          </span>
          {(isPremium ?? false) ? (
            <span className="rounded-full border border-fuchsia-500/40 bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-fuchsia-200">
              Plus
            </span>
          ) : null}
          <span className="hidden rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/50 sm:inline">
            Prishtina
          </span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={cn(
                "relative text-sm font-medium transition",
                isActive(l.href)
                  ? "text-white underline decoration-sky-400/70 decoration-2 underline-offset-8"
                  : "text-white/70 hover:text-white",
              )}
            >
              {l.label}
              {l.href === "/my-night" && stopCount > 0 ? (
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 to-sky-500 px-1 text-[10px] font-bold text-[#09090b]">
                  {stopCount}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <SearchDialog />
          <LanguageSwitcher />
          <ThemeToggle />
          {authed ? authedLinks : guestLinks}
        </div>
        <div className="hidden md:block">
          <Button asChild>
            <Link href={authed ? "/events" : "/register"}>{authed ? t.common.tonight : t.common.getNeya}</Link>
          </Button>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <SearchDialog />
          <LanguageSwitcher />
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10 bg-black/90 md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-4">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={isActive(l.href) ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition",
                    isActive(l.href)
                      ? "bg-white/5 text-white"
                      : "text-white/80 hover:bg-white/5",
                  )}
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                  {l.href === "/my-night" && stopCount > 0 ? (
                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 to-sky-500 px-1 text-[10px] font-bold text-[#09090b]">
                      {stopCount}
                    </span>
                  ) : null}
                </Link>
              ))}
              {authed ? (
                <>
                  <Link
                    href="/dashboard"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/5"
                    onClick={() => setOpen(false)}
                  >
                    {t.common.dashboard}
                  </Link>
                  {showVenuePortal ? (
                    <Link
                      href="/venue"
                      className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/5"
                      onClick={() => setOpen(false)}
                    >
                      {t.common.venuePortal}
                    </Link>
                  ) : null}
                  {showBusiness && !showVenuePortal ? (
                    <Link
                      href="/business"
                      className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/5"
                      onClick={() => setOpen(false)}
                    >
                      {t.common.venueHub}
                    </Link>
                  ) : null}
                  {isAdmin ? (
                    <Link
                      href="/admin"
                      className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/5"
                      onClick={() => setOpen(false)}
                    >
                      {t.common.admin}
                    </Link>
                  ) : null}
                  <SignOutButton navStyle />
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/5"
                    onClick={() => setOpen(false)}
                  >
                    {t.common.logIn}
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/5"
                    onClick={() => setOpen(false)}
                  >
                    {t.common.register}
                  </Link>
                </>
              )}
              <Link
                href={authed ? "/events" : "/register"}
                className="mt-2 rounded-lg bg-white px-3 py-2 text-center text-sm font-semibold text-black"
                onClick={() => setOpen(false)}
              >
                {authed ? t.common.tonight : t.common.getNeya}
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
