"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type AdminTab =
  | "overview"
  | "venues"
  | "events"
  | "tickets"
  | "guestlists"
  | "reservations"
  | "premium"
  | "venue-accounts"
  | "guides";

const TABS: { id: AdminTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "venues", label: "Venues" },
  { id: "events", label: "Events" },
  { id: "tickets", label: "Tickets" },
  { id: "guestlists", label: "Guestlists" },
  { id: "reservations", label: "Reservations" },
  { id: "premium", label: "Premium" },
  { id: "venue-accounts", label: "Venue accounts" },
  { id: "guides", label: "Guides" },
];

export function AdminTabNav({ activeTab }: { activeTab: AdminTab }) {
  return (
    <nav className="mb-8 flex flex-wrap gap-2">
      {TABS.map((t) => (
        <Link
          key={t.id}
          href={`/admin?tab=${t.id}`}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition",
            activeTab === t.id ? "bg-white text-black" : "border border-white/15 text-white/70 hover:text-white",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
