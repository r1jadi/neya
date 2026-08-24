"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

const headerTextLink =
  "inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full px-3 text-sm font-semibold text-white/80 transition hover:bg-white/5 hover:text-white";

const mobileNavLink =
  "flex min-h-11 items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition";

const accountMenuLink =
  "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-white/80 transition hover:bg-white/5 hover:text-white";

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
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close the mobile menu and account dropdown when navigating to a new
  // route. Track the last rendered pathname in state: when it changes we
  // close during render instead of in an effect (no cascading renders).
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setOpen(false);
    setAccountOpen(false);
  }
  const { t } = useI18n();
  const authed = Boolean(userEmail);
  const { hydrated, stops } = useMyNight();
  const stopCount = hydrated ? stops.length : 0;

  const links = navLinks.map((l) => ({ href: l.href, label: t.common[l.key] }));
  const ctaHref = authed ? "/events" : "/register";
  const ctaLabel = authed ? t.common.tonight : t.common.getNeya;

  /** Account-related destinations, shared by the desktop dropdown and the mobile panel. */
  const accountLinks: { href: string; label: string }[] = [
    { href: "/dashboard", label: t.common.dashboard },
    ...(showVenuePortal ? [{ href: "/venue", label: t.common.venuePortal }] : []),
    ...(showBusiness && !showVenuePortal ? [{ href: "/business", label: t.common.venueHub }] : []),
    ...(isAdmin ? [{ href: "/admin", label: t.common.admin }] : []),
  ];

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

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px)");
    const closeIfDesktop = () => {
      if (media.matches) setOpen(false);
    };
    media.addEventListener("change", closeIfDesktop);
    return () => media.removeEventListener("change", closeIfDesktop);
  }, []);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Close the account dropdown on outside click or Escape.
  useEffect(() => {
    if (!accountOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAccountOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountOpen]);

  const userInitial = (userEmail ?? "").trim().charAt(0).toUpperCase();

  const desktopAuth = authed ? (
    <div ref={accountRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAccountOpen((v) => !v)}
        aria-expanded={accountOpen}
        aria-haspopup="menu"
        aria-label={t.common.dashboard}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] p-0.5 pr-2 transition hover:border-white/20"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-fuchsia-500 text-xs font-bold text-[#09090b]">
          {userInitial}
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 text-white/50 transition-transform duration-200", accountOpen && "rotate-180")}
        />
      </button>
      <AnimatePresence>
        {accountOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-white/10 bg-[#0c0c10]/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl"
          >
            {accountLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                role="menuitem"
                className={cn(accountMenuLink, isActive(l.href) && "bg-white/5 text-white")}
                onClick={() => setAccountOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="my-1 h-px bg-white/[0.08]" />
            <SignOutButton
              className="flex w-full items-center justify-start rounded-lg border-0 bg-transparent px-3 py-2 text-sm font-medium text-white/80 shadow-none transition hover:bg-white/5 hover:text-white"
              wrapperClassName="block"
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  ) : (
    <>
      <Link href="/login" className={headerTextLink}>
        {t.common.logIn}
      </Link>
      <Link href="/register" className={cn(headerTextLink, "hidden min-[1360px]:inline-flex")}>
        {t.common.register}
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-black/55 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full min-w-0 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2">
          <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-white sm:text-xl">
            {SITE.name}
          </span>
          {(isPremium ?? false) ? (
            <span className="hidden rounded-full border border-fuchsia-500/40 bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-fuchsia-200 2xl:inline-block">
              Plus
            </span>
          ) : null}
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-x-3 px-2 xl:flex 2xl:gap-x-5">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={cn(
                "relative shrink-0 whitespace-nowrap text-[13px] font-medium transition 2xl:text-sm",
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

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <SearchDialog compact />
          <LanguageSwitcher className="hidden sm:inline-flex" />
          <ThemeToggle />
          <div className="hidden items-center gap-1 xl:flex">{desktopAuth}</div>
          <Button size="sm" className="hidden shrink-0 sm:inline-flex" asChild>
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 transition hover:border-white/20 hover:text-white xl:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="site-header-menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="site-header-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10 bg-black/90 xl:hidden"
          >
            <div className="flex max-h-[min(32rem,calc(100dvh-4rem))] flex-col gap-1 overflow-y-auto px-4 py-4">
              <div className="mb-2 flex justify-center sm:hidden">
                <LanguageSwitcher />
              </div>
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={isActive(l.href) ? "page" : undefined}
                  className={cn(
                    mobileNavLink,
                    isActive(l.href) ? "bg-white/5 text-white" : "text-white/80 hover:bg-white/5",
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
                    className={cn(mobileNavLink, "text-white/80 hover:bg-white/5")}
                    onClick={() => setOpen(false)}
                  >
                    {t.common.dashboard}
                  </Link>
                  {showVenuePortal ? (
                    <Link
                      href="/venue"
                      className={cn(mobileNavLink, "text-white/80 hover:bg-white/5")}
                      onClick={() => setOpen(false)}
                    >
                      {t.common.venuePortal}
                    </Link>
                  ) : null}
                  {showBusiness && !showVenuePortal ? (
                    <Link
                      href="/business"
                      className={cn(mobileNavLink, "text-white/80 hover:bg-white/5")}
                      onClick={() => setOpen(false)}
                    >
                      {t.common.venueHub}
                    </Link>
                  ) : null}
                  {isAdmin ? (
                    <Link
                      href="/admin"
                      className={cn(mobileNavLink, "text-white/80 hover:bg-white/5")}
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
                    className={cn(mobileNavLink, "text-white/80 hover:bg-white/5")}
                    onClick={() => setOpen(false)}
                  >
                    {t.common.logIn}
                  </Link>
                  <Link
                    href="/register"
                    className={cn(mobileNavLink, "text-white/80 hover:bg-white/5")}
                    onClick={() => setOpen(false)}
                  >
                    {t.common.register}
                  </Link>
                </>
              )}
              <Link
                href={ctaHref}
                className="mt-2 rounded-lg bg-white px-3 py-2.5 text-center text-sm font-semibold text-black sm:hidden"
                onClick={() => setOpen(false)}
              >
                {ctaLabel}
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
