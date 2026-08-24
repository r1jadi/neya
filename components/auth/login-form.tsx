"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

function callbackUrl(redirectPath?: string) {
  if (typeof window === "undefined") return "";
  const isInternalPath = redirectPath?.startsWith("/") && !redirectPath.startsWith("//") && !redirectPath.startsWith("/\\");
  const q = isInternalPath && redirectPath ? `?next=${encodeURIComponent(redirectPath)}` : "";
  return `${window.location.origin}/auth/callback${q}`;
}

export function LoginForm({ initialError, redirectTo }: { initialError?: string; redirectTo?: string }) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    initialError === "auth"
      ? t.auth.signInFailed
      : initialError === "config"
        ? t.auth.configError
        : null,
  );

  function friendlyAuthError(message: string): string {
    const m = message.toLowerCase();
    if (m.includes("invalid credentials") || m.includes("invalid login")) {
      return t.auth.invalidCredentials;
    }
    if (m.includes("email not confirmed") || m.includes("not confirmed")) {
      return t.auth.emailNotConfirmed;
    }
    if (m.includes("too many requests") || m.includes("rate limit")) {
      return t.auth.tooManyRequests;
    }
    if (m.includes("user not found")) {
      return t.auth.noAccountFound;
    }
    if (m.includes("network") || m.includes("fetch")) {
      return t.auth.couldntConnect;
    }
    return t.auth.genericError;
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading("password");
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(null);
    if (err) {
      setError(friendlyAuthError(err.message));
      return;
    }
    const dest = redirectTo?.startsWith("/") && !redirectTo.startsWith("//") && !redirectTo.startsWith("/\\") ? redirectTo : "/events";
    window.location.href = dest;
  }

  async function signInWithGoogle() {
    setLoading("google");
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl(redirectTo),
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (err) {
      setLoading(null);
      setError(friendlyAuthError(err.message));
      return;
    }
    if (data.url) {
      window.location.href = data.url;
    } else {
      setLoading(null);
      setError(t.auth.googleUnavailable);
    }
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading("magic");
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl(redirectTo) },
    });
    setLoading(null);
    if (err) {
      setError(friendlyAuthError(err.message));
      return;
    }
    setMessage(t.auth.checkEmail);
  }

  return (
    <div className="grid gap-3">
      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}
      <form onSubmit={signInWithPassword} className="grid gap-3">
        <Input
          type="email"
          placeholder={t.auth.email}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder={t.auth.password}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" className="w-full" disabled={loading !== null}>
          {loading === "password" ? t.auth.signingIn : t.auth.continueWithPassword}
        </Button>
      </form>
      <form onSubmit={sendMagicLink} className="grid gap-2">
        <Button type="submit" variant="secondary" className="w-full" disabled={loading !== null || !email}>
          {loading === "magic" ? t.auth.sending : t.auth.emailMagicLink}
        </Button>
      </form>
      <div className="relative py-2 text-center text-xs text-white/40">
        <span className="relative z-10 bg-zinc-950/80 px-2">{t.auth.or}</span>
        <span className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
      </div>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={loading !== null}
        onClick={() => void signInWithGoogle()}
      >
        {loading === "google" ? t.auth.redirecting : t.auth.continueWithGoogle}
      </Button>
      <p className="text-center text-xs text-white/45">
        <Link href="/" className="text-sky-300 hover:underline">
          ← {t.auth.home}
        </Link>
      </p>
    </div>
  );
}
