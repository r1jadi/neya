import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { exchangeServerAuthCode, type AuthCookieJar } from "@/lib/auth/exchange";

/**
 * POST /api/auth/reset-password
 *
 * Completes the password-reset flow. The recovery link from the Supabase
 * reset email points here (registered in Supabase Auth → Redirect URLs) as
 * /api/auth/reset-password; the PKCE code in its hash is exchanged for the
 * recovery session server-side (so the session is stored in the same
 * @supabase/ssr cookies the rest of the app reads), then the new password is
 * applied with `updateUser`. Returns JSON so the client can report auth
 * errors without losing the page.
 */
export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return Response.json({ ok: false, error: "Auth is not configured." }, { status: 500 });
  }

  const jar: AuthCookieJar[] = [];

  // Exchange the recovery-code in the reset-link hash for a session BEFORE
  // touching the password, so updateUser runs with a real session.
  const user = await exchangeServerAuthCode(request, NextResponse.next(), jar);
  if (!user) {
    const res = NextResponse.json(
      { ok: false, error: "No valid session. Please request a new reset link." },
      { status: 401 },
    );
    jar.forEach(({ name, value, options }) => res.cookies.set(name, value, options as never));
    return res;
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    password = "";
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => jar.push({ name, value, options }));
      },
    },
  });

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const res = NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    jar.forEach(({ name, value, options }) => res.cookies.set(name, value, options as never));
    return res;
  }

  const res = NextResponse.json({ ok: true });
  jar.forEach(({ name, value, options }) => res.cookies.set(name, value, options as never));
  return res;
}