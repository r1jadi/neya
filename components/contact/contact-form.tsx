"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { submitContactForm } from "@/actions/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

export function ContactForm() {
  const { t } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSent(false);
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    startTransition(async () => {
      const result = await submitContactForm(new FormData(form));
      if (result.success) {
        formRef.current?.reset();
        setSent(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-white/80">
          {t.contactPage.name}
          <Input name="name" required minLength={2} maxLength={120} autoComplete="name" placeholder={t.contactPage.yourName} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-white/80">
          {t.contactPage.email}
          <Input name="email" type="email" required maxLength={320} autoComplete="email" placeholder="you@example.com" />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium text-white/80">
        {t.contactPage.subject}
        <Input name="subject" required minLength={3} maxLength={160} placeholder={t.contactPage.howCanWeHelp} />
      </label>
      <label className="grid gap-2 text-sm font-medium text-white/80">
        {t.contactPage.message}
        <textarea name="message" required minLength={10} maxLength={5000} rows={6} placeholder={t.contactPage.tellUsMore} className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white shadow-inner placeholder:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" />
      </label>
      <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="contact-company">Company</label>
        <input id="contact-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>
      <p className="text-xs text-white/40">{t.contactPage.privacyNote}</p>
      {error ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}
      {sent ? <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100"><CheckCircle2 className="h-4 w-4" />{t.contactPage.thanksSent}</p> : null}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? <><Loader2 className="animate-spin" />{t.contactPage.sending}</> : t.contactPage.sendMessage}
      </Button>
    </form>
  );
}
