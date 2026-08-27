import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

/** Parsed Supabase auth exchange may set cookies; keep them on the response. */
export type AuthCookieJar = { name: string; value: string; options?: Record<string, unknown> };

/**
 * Exchange the Supabase auth code for a session on the server and attach the
 * session cookies to the response, returning the user (or null on failure).
 *
 * Used by /auth/callback for sign-up/magic-link codes, and by the password
 * reset route so the recovery session established by the email link is
 * stored server-side in the same cookies the rest of the app reads — the
 * required precondition for `updateUser({ password })` to succeed.
 */
export async function exchangeServerAuthCode(
  request: NextRequest,
  response: NextResponse,
  jar: AuthCookieJar[] = [],
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          jar.push({ name, value, options });
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(
    request.nextUrl.searchParams.get("code") ?? "",
  );
  if (error) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}