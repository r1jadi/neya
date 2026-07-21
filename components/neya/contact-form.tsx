"use client";

import { useTransition, useState } from "react";
import { submitContactMessage } from "@/actions/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail } from "lucide-react";

export function ContactForm() {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ success?: boolean; error?: string } | null>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await submitContactMessage(formData);
      setStatus(res);
    });
  }

  return (
    <div className="rounded-3xl border border-white/5 bg-zinc-950/50 p-8 shadow-2xl">
      {status?.success ? (
        <div className="flex flex-col items-center justify-center space-y-4 py-12 text-center">
          <div className="rounded-full bg-emerald-500/20 p-4 text-emerald-400">
            <Mail className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-semibold text-white">Message sent</h3>
          <p className="text-white/60">We&apos;ll get back to you as soon as possible.</p>
        </div>
      ) : (
        <form action={handleSubmit} className="space-y-6">
          {status?.error && (
            <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400 border border-red-500/20">
              {status.error}
            </p>
          )}
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="name" className="text-xs font-semibold uppercase tracking-widest text-white/40">Name</label>
              <Input id="name" name="name" required placeholder="Your name" className="h-12 bg-white/5 border-white/10" />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-widest text-white/40">Email</label>
              <Input id="email" name="email" type="email" required placeholder="your@email.com" className="h-12 bg-white/5 border-white/10" />
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="subject" className="text-xs font-semibold uppercase tracking-widest text-white/40">Subject</label>
            <Input id="subject" name="subject" placeholder="How can we help?" className="h-12 bg-white/5 border-white/10" />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="message" className="text-xs font-semibold uppercase tracking-widest text-white/40">Message</label>
            <textarea
              id="message"
              name="message"
              required
              rows={5}
              placeholder="Your message here..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
          
          <Button type="submit" disabled={isPending} className="h-12 w-full text-base">
            {isPending ? "Sending..." : "Send Message"}
          </Button>
        </form>
      )}
    </div>
  );
}
