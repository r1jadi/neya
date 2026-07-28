import type { Metadata } from "next";
import { AtSign, ExternalLink, Mail } from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Contact us · ${SITE.name}`,
  description: "Get in touch with the NEYA team.",
};

const contactLinks = [
  { label: "neyakosova@gmail.com", href: "mailto:neyakosova@gmail.com", icon: Mail },
  { label: "@neya.xk", href: "https://instagram.com/neya.xk", icon: AtSign },
  { label: "NEYA on LinkedIn", href: "https://linkedin.com/company/neyalive", icon: ExternalLink },
];

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300">Contact</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold text-white sm:text-5xl">Let&apos;s talk.</h1>
          <p className="mt-4 text-base leading-relaxed text-white/60">Questions, partnerships, or feedback — the NEYA team would love to hear from you.</p>
        </div>
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-7">
            <h2 className="text-xl font-semibold text-white">Send a message</h2>
            <p className="mt-2 text-sm text-white/55">We&apos;ll get back to you as soon as we can.</p>
            <div className="mt-6"><ContactForm /></div>
          </section>
          <aside className="h-fit rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-7">
            <h2 className="text-xl font-semibold text-white">Contact information</h2>
            <ul className="mt-5 space-y-4">
              {contactLinks.map(({ label, href, icon: Icon }) => (
                <li key={href}>
                  <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} className="flex items-center gap-3 text-sm text-sky-300 hover:text-sky-200 hover:underline">
                    <Icon className="h-4 w-4" />{label}
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
