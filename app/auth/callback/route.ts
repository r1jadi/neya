import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

type CookieJar = { name: string; value: string; options?: Record<string, unknown> };

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") ? next : "/";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL("/login?error=config", url.origin));
  }

  const jar: CookieJar[] = [];

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
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

  const redirectWithJar = (pathname: string) => {
    const res = NextResponse.redirect(new URL(pathname, url.origin));
    jar.forEach(({ name, value, options }) => {
      res.cookies.set(name, value, options as never);
    });
    return res;
  };

  if (!code) {
    return redirectWithJar("/login?error=auth");
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirectWithJar("/login?error=auth");
  }

  let path = safeNext;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, venue_id, account_active, is_admin, onboarding_complete")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role === "venue" || profile?.role === "admin" ? profile.role : "user";
    const isVenue = role === "venue" && profile?.account_active !== false && Boolean(profile?.venue_id);
    const isAdmin = role === "admin" || profile?.is_admin;

    if (isVenue && (path === "/" || path === "/events" || path.startsWith("/onboarding"))) {
      path = "/venue";
    } else if (isAdmin && path === "/") {
      path = safeNext === "/" ? "/admin" : safeNext;
    } else if (!profile?.onboarding_complete && role === "user") {
      path = "/onboarding";
    }
  }

  return redirectWithJar(path);
}
