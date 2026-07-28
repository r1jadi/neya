import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export type LegalSection = {
  title: string;
  body: ReactNode;
};

export function LegalDocument({ title, updated, intro, sections }: { title: string; updated: string; intro: ReactNode; sections: LegalSection[] }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300">NEYA legal</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold text-white sm:text-5xl">{title}</h1>
        <p className="mt-4 text-sm text-white/45">Last updated: {updated}</p>
        <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-sm leading-relaxed text-white/70 sm:p-7">{intro}</div>
        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold text-white">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-white/65">{section.body}</div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
