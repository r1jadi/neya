"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

export function UpdatePasswordForm() {
  const { t } = useI18n();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const p1 = String(fd.get("password") ?? "");
    const p2 = String(fd.get("confirm") ?? "");
    if (p1.length < 6) {
      setError(t.auth.minChars);
      setPending(false);
      return;
    }
    if (p1 !== p2) {
      setError(t.auth.passwordsDoNotMatch);
      setPending(false);
      return;
    }

    // Completing the reset must run on the server: the recovery session comes
    // from exchanging the code in the email link (Supabase PKCE), and the
    // password update needs that session. Doing the exchange + updateUser
    // client-side breaks session handling and fails with an auth error.
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: p1 }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      setPending(false);
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? t.auth.genericError);
        return;
      }
      setMessage(t.auth.passwordUpdated);
    } catch {
      setPending(false);
      setError(t.auth.genericError);
    }
  }

  return (
    <>
      {message ? (
        <p className="text-sm text-emerald-200/90">
          {message}{" "}
          <Link href="/events" className="text-sky-300 underline">
            {t.auth.openEvents}
          </Link>
        </p>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-3">
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <Input name="password" type="password" placeholder={t.auth.newPassword} required minLength={6} autoComplete="new-password" />
          <Input name="confirm" type="password" placeholder={t.auth.confirmPassword} required minLength={6} autoComplete="new-password" />
          <Button type="submit" disabled={pending}>
            {pending ? t.auth.updating : t.auth.updatePassword}
          </Button>
        </form>
      )}
    </>
  );
}