import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/digest/token";
import { getPublicSiteUrl } from "@/lib/env";

/**
 * Public unsubscribe endpoint for the weekly digest.
 *
 * GET /api/unsubscribe?token=...
 *
 * The token is an HMAC-signed, expiring reference to a profile id — no raw
 * user ids or emails in the URL, no login required, and nothing about the
 * profile is returned in responses (invalid and expired tokens render the
 * same generic page, so the endpoint cannot be used to probe accounts).
 */

function htmlPage(title: string, body: string, linkLabel: string, linkHref: string): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title} · NEYA</title>
<style>
  body{margin:0;background:#09090b;color:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center}
  main{max-width:420px;margin:24px;padding:40px 32px;background:#18181b;border:1px solid #3f3f46;border-radius:20px;text-align:center}
  h1{font-size:22px;margin:0 0 12px}
  p{font-size:14px;color:#a1a1aa;line-height:1.55;margin:0 0 24px}
  a{display:inline-block;padding:11px 24px;border-radius:999px;background:#0ea5e9;color:#082f49;text-decoration:none;font-weight:700;font-size:14px}
</style>
</head>
<body>
  <main>
    <p style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#e879f9;margin-bottom:8px">NEYA</p>
    <h1>${title}</h1>
    <p>${body}</p>
    <a href="${linkHref}">${linkLabel}</a>
  </main>
</body>
</html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get("token");
  const site = getPublicSiteUrl();

  const secret = process.env.DIGEST_SIGNING_SECRET;
  if (!secret) {
    return htmlPage(
      "Unsubscribe unavailable",
      "Unsubscribing is temporarily unavailable. Please try again later.",
      "Back to NEYA",
      site,
    );
  }
  if (!token) {
    return htmlPage(
      "Invalid link",
      "This unsubscribe link is missing or malformed. If you keep getting the digest, reply to it and we'll help.",
      "Back to NEYA",
      site,
    );
  }

  const profileId = await verifyUnsubscribeToken(token, secret);
  if (!profileId) {
    return htmlPage(
      "Link expired",
      "This unsubscribe link is invalid or has expired. Request a fresh one by replying to the digest email.",
      "Back to NEYA",
      site,
    );
  }

  try {
    const admin = createAdminClient();
    // Idempotent: opting out twice (or after already opting out) is a no-op.
    await admin.from("profiles").update({ digest_opt_out: true }).eq("id", profileId);
  } catch {
    // The profile may no longer exist — the outcome (no more mail) is the same.
  }

  return htmlPage(
    "You're unsubscribed",
    "You're unsubscribed from the weekly NEYA digest. You won't receive it again — the rest of NEYA keeps working as usual.",
    "Back to NEYA",
    site,
  );
}
