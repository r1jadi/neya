"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/constants";

const links = [
  { href: "/events", label: "Tonight" },
  { href: "/#map", label: "Map" },
  { href: "/#business", label: "For venues" },
];

export function SiteHeaderClient({
  userEmail,
  isAdmin,
  showBusiness,
  isPremium,
}: {
  userEmail: string | null;
  isAdmin: boolean;
  showBusiness: boolean;
  isPremium?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const authed = Boolean(userEmail);

  const authedLinks = (
    <>
      <Button variant="ghost" asChild>
        <Link href="/dashboard">Dashboard</Link>
      </Button>
      {showBusiness ? (
        <Button variant="ghost" asChild>
          <Link href="/business">Venue hub</Link>
        </Button>
      ) : null}
      {isAdmin ? (
        <Button variant="ghost" asChild>
          <Link href="/admin">Admin</Link>
        </Button>
      ) : null}
      <Button variant="ghost" asChild>
        <Link href="/login">Account</Link>
      </Button>
    </>
  );

  const guestLinks = (
    <>
      <Button variant="ghost" asChild>
        <Link href="/login">Log in</Link>
      </Button>
      <Button variant="ghost" asChild>
        <Link href="/register">Register</Link>
      </Button>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-black/55 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
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
              className="text-sm font-medium text-white/70 transition hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">{authed ? authedLinks : guestLinks}</div>
        <div className="hidden md:block">
          <Button asChild>
            <Link href={authed ? "/events" : "/register"}>{authed ? "Tonight" : "Get NEYA"}</Link>
          </Button>
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
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
                  className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/5"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
              {authed ? (
                <>
                  <Link
                    href="/dashboard"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/5"
                    onClick={() => setOpen(false)}
                  >
                    Dashboard
                  </Link>
                  {showBusiness ? (
                    <Link
                      href="/business"
                      className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/5"
                      onClick={() => setOpen(false)}
                    >
                      Venue hub
                    </Link>
                  ) : null}
                  {isAdmin ? (
                    <Link
                      href="/admin"
                      className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/5"
                      onClick={() => setOpen(false)}
                    >
                      Admin
                    </Link>
                  ) : null}
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/5"
                    onClick={() => setOpen(false)}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/5"
                    onClick={() => setOpen(false)}
                  >
                    Register
                  </Link>
                </>
              )}
              <Link
                href={authed ? "/events" : "/register"}
                className="mt-2 rounded-lg bg-white px-3 py-2 text-center text-sm font-semibold text-black"
                onClick={() => setOpen(false)}
              >
                {authed ? "Tonight" : "Get NEYA"}
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
