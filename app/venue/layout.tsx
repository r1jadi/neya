import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import Link from "next/link";

const links = [
  { href: "/venue", label: "Overview" },
  { href: "/venue/guestlists", label: "Guestlists" },
  { href: "/venue/reservations", label: "Reservations" },
  { href: "/venue/analytics", label: "Analytics" },
];

export default function VenueLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <nav className="mx-auto flex w-full max-w-5xl flex-wrap gap-2 border-b border-white/10 px-4 py-3 sm:px-6">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/25 hover:text-white"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      {children}
      <SiteFooter />
    </div>
  );
}
