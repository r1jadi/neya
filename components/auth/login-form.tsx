"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function callbackUrl() {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/auth/callback`;
}

export function LoginForm({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    initialError === "auth"
      ? "Could not complete sign-in. Try again."
      : initialError === "config"
        ? "Server configuration error."
        : null,
  );

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading("password");
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(null);
    if (err) {
      setError(err.message);
      return;
    }
    window.location.href = "/events";
  }

  async function signInWithGoogle() {
    setLoading("google");
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl(),
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (err) {
      setLoading(null);
      setError(err.message);
      return;
    }
    if (data.url) {
      window.location.href = data.url;
    } else {
      setLoading(null);
      setError("No redirect URL returned. Enable the provider in Supabase Auth settings.");
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
      options: { emailRedirectTo: callbackUrl() },
    });
    setLoading(null);
    if (err) {
      setError(err.message);
      return;
    }
    setMessage("Check your email for the magic link.");
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
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" className="w-full" disabled={loading !== null}>
          {loading === "password" ? "Signing in…" : "Continue with password"}
        </Button>
      </form>
      <form onSubmit={sendMagicLink} className="grid gap-2">
        <Button type="submit" variant="secondary" className="w-full" disabled={loading !== null || !email}>
          {loading === "magic" ? "Sending…" : "Email me a magic link"}
        </Button>
      </form>
      <div className="relative py-2 text-center text-xs text-white/40">
        <span className="relative z-10 bg-zinc-950/80 px-2">or</span>
        <span className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
      </div>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={loading !== null}
        onClick={() => void signInWithGoogle()}
      >
        {loading === "google" ? "Redirecting…" : "Continue with Google"}
      </Button>
      <p className="pt-2 text-center text-xs text-white/45">
        Enable Google under Supabase → Authentication → Providers. Redirect URL:{" "}
        <code className="break-all rounded bg-white/10 px-1">{callbackUrl() || "…/auth/callback"}</code>
      </p>
      <p className="text-center text-xs text-white/45">
        <Link href="/" className="text-sky-300 hover:underline">
          ← Home
        </Link>
      </p>
    </div>
  );
}
