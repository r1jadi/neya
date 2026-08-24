"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

export function UpdatePasswordForm() {
  const { t } = useI18n();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key, { auth: { detectSessionInUrl: true, persistSession: true } });
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!supabase) {
      setError(t.auth.signInUnavailable);
      return;
    }
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const p1 = String(fd.get("password") ?? "");
    const p2 = String(fd.get("confirm") ?? "");
    if (p1.length < 6) {
      setError(t.auth.minChars);
      return;
    }
    if (p1 !== p2) {
      setError(t.auth.passwordsDoNotMatch);
      return;
    }
    const { error: err } = await supabase.auth.updateUser({ password: p1 });
    setPending(false);
    if (err) {
      setError(err.message);
      return;
    }
    setMessage(t.auth.passwordUpdated);
  }

  if (!supabase) {
    return <p className="text-sm text-red-200">{t.auth.signInUnavailable}</p>;
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
