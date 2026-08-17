import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { PublicEventSubmissionForm } from "@/components/neya/public-event-submission-form";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = { title: `Submit an event · ${SITE.name}`, description: "Send a confirmed event to NEYA for review and discovery." };
export default function SubmitEventPage() { return <div className="flex min-h-screen flex-col bg-[var(--background)]"><SiteHeader /><main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300/90">For organizers & the city</p><h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-white">Put an event on NEYA</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">Send the official details and we&apos;ll review them before the event appears in discovery. Publishing never creates tickets, reservations, or guestlists automatically.</p><PublicEventSubmissionForm /></main><SiteFooter /></div>; }
