import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { routeAccessDenied } from "@/lib/auth/routes";
import type { UserProfile } from "@/types/auth";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const needsGuard =
    pathname.startsWith("/admin") || pathname.startsWith("/venue") || pathname.startsWith("/business");

  if (needsGuard) {
    let profile: UserProfile | null = null;
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, role, venue_id, account_active, is_admin, is_premium, onboarding_complete")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        const role = data.role === "venue" || data.role === "admin" ? data.role : "user";
        profile = {
          id: data.id,
          display_name: data.display_name,
          role,
          venue_id: data.venue_id,
          account_active: data.account_active ?? true,
          is_admin: data.is_admin ?? false,
          is_premium: data.is_premium ?? false,
          onboarding_complete: data.onboarding_complete ?? false,
        };
      }
    }

    const deny = routeAccessDenied(pathname, profile, user?.email ? isAdminEmail(user.email) : false);
    if (deny) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = deny.split("?")[0] ?? deny;
      const query = deny.includes("?") ? deny.slice(deny.indexOf("?") + 1) : "";
      if (query) redirectUrl.search = `?${query}`;
      else redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}
