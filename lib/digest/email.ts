/**
 * Digest email template — 600px, inline styles only (email-client safe),
 * matching NEYA's dark/sky/fuchsia identity without relying on web fonts
 * or external CSS.
 */

import type { DigestVenueRowWithMeta, RankedEvent } from "./logic.ts";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]!,
  );
}

export interface DigestEmailData {
  siteUrl: string;
  subject: string;
  preview: string;
  events: RankedEvent[];
  /** eventId → CTA computed by the caller */
  ctas: Record<string, { label: string; url: string }>;
  eventImages: Record<string, string | null>;
  trendingVenue: DigestVenueRowWithMeta | null;
  unsubscribeUrl: string;
}

function eventCard(e: RankedEvent, data: DigestEmailData): string {
  const ev = e.event;
  const venue = e.venue;
  const image = data.eventImages[ev.id] ?? null;
  const cta = data.ctas[ev.id] ?? { label: "View event", url: `${data.siteUrl}/events/${ev.slug}` };
  const dayTime = formatDayTime(ev.starts_at);
  const genre = ev.genre ? capitalize(ev.genre.replace(/_/g, " ")) : null;
  const price = formatPrice(ev);
  const venueLine = venue?.name ? escapeHtml(venue.name) : "Venue TBA";

  const imageHtml = image
    ? `<a href="${data.siteUrl}/events/${ev.slug}" style="display:block"><img src="${escapeHtml(image)}" alt="" width="548" style="display:block;width:100%;height:180px;object-fit:cover;border-radius:14px 14px 0 0" /></a>`
    : `<div style="height:64px;background:linear-gradient(135deg,#0e7490,#a21caf);border-radius:14px 14px 0 0"></div>`;

  return `
  <tr>
    <td style="padding:10px 16px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#18181b;border:1px solid #3f3f46;border-radius:16px;overflow:hidden">
        <tr>${imageHtml}</tr>
        <tr>
          <td style="padding:16px 18px 18px">
            <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#a1a1aa">${venueLine}</p>
            <h3 style="margin:6px 0 0;font-size:18px;line-height:1.3;color:#ffffff;font-family:system-ui,sans-serif">
              <a href="${data.siteUrl}/events/${ev.slug}" style="color:#ffffff;text-decoration:none">${escapeHtml(ev.title)}</a>
            </h3>
            <p style="margin:8px 0 0;font-size:13px;color:#7dd3fc">${escapeHtml(dayTime)}${genre ? ` &nbsp;·&nbsp; ${escapeHtml(genre)}` : ""}${price ? ` &nbsp;·&nbsp; ${escapeHtml(price)}` : ""}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px">
              <tr>
                <td style="background:#0ea5e9;border-radius:10px">
                  <a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:10px 22px;font-size:13px;font-weight:700;color:#082f49;text-decoration:none;font-family:system-ui,sans-serif">${escapeHtml(cta.label)}</a>
                </td>
                <td style="padding-left:12px;font-size:13px">
                  <a href="${data.siteUrl}/events/${ev.slug}" style="color:#38bdf8;text-decoration:underline;font-family:system-ui,sans-serif">View event →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function trendingBlock(venue: DigestVenueRowWithMeta, siteUrl: string): string {
  const image = venue.image_url
    ? `<img src="${escapeHtml(venue.image_url)}" alt="" width="120" style="display:block;width:120px;height:120px;object-fit:cover;border-radius:12px" />`
    : `<div style="width:120px;height:120px;border-radius:12px;background:linear-gradient(135deg,#1e3a8a,#701a75);display:flex;align-items:center;justify-content:center;color:#a5b4fc;font-size:28px;font-weight:800;font-family:system-ui,sans-serif">${escapeHtml((venue.name ?? "V")[0]?.toUpperCase() ?? "V")}</div>`;
  const url = `${siteUrl}/venues/${venue.slug ?? ""}`;
  return `
  <tr>
    <td style="padding:26px 16px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#18181b;border:1px solid #3f3f46;border-radius:16px">
        <tr>
          <td style="padding:16px 18px">
            <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#e879f9">Trending this week</p>
            <h3 style="margin:6px 0 0;font-size:17px;color:#ffffff;font-family:system-ui,sans-serif">${escapeHtml(venue.name ?? "Venue")}</h3>
            <p style="margin:6px 0 0;font-size:13px;color:#a1a1aa;font-family:system-ui,sans-serif">A venue worth checking out this weekend.</p>
            <p style="margin:10px 0 0">
              <a href="${url}" style="display:inline-block;padding:9px 20px;font-size:13px;font-weight:700;color:#fdf4ff;text-decoration:none;background:#a21caf;border-radius:10px;font-family:system-ui,sans-serif">Explore venue</a>
            </p>
          </td>
          <td style="padding:16px 18px 16px 0;width:120px">${image}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

export function buildDigestEmail(data: DigestEmailData): string {
  const eventRows = data.events.map((e) => eventCard(e, data)).join("");
  const trendingRows = data.trendingVenue ? trendingBlock(data.trendingVenue, data.siteUrl) : "";
  const year = new Date().getUTCFullYear();

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="x-apple-disable-message-reformatting" />
<title>${escapeHtml(data.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#09090b;color:#f4f4f5;font-family:system-ui,-apple-system,sans-serif">
  <span style="display:none !important;visibility:hidden;mso-hide:all;font-size:1px;color:#09090b;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${escapeHtml(data.preview)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090b">
    <tr>
      <td align="center" style="padding:28px 12px 40px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">
          <tr>
            <td align="center" style="padding-bottom:6px">
              <p style="margin:0;font-size:26px;font-weight:800;letter-spacing:.02em;color:#ffffff;font-family:system-ui,sans-serif">NEYA</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:4px">
              <h1 style="margin:0;font-size:24px;line-height:1.25;color:#ffffff;font-family:system-ui,sans-serif">This weekend in Prishtina</h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:18px">
              <p style="margin:0;font-size:14px;color:#a1a1aa;font-family:system-ui,sans-serif">Here's what's happening this weekend — curated so you don't have to look.</p>
            </td>
          </tr>
          <tr>
            <td style="font-family:system-ui,sans-serif">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${eventRows}
                ${trendingRows}
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:30px 16px 0">
              <a href="${data.siteUrl}/events" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#082f49;text-decoration:none;background:#e879f9;border-radius:999px;font-family:system-ui,sans-serif">See everything this weekend</a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 16px 8px">
              <p style="margin:0;font-size:12px;color:#71717a;font-family:system-ui,sans-serif">You're getting this because you have a NEYA account.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 16px 8px">
              <p style="margin:0;font-size:12px;font-family:system-ui,sans-serif">
                <a href="${data.unsubscribeUrl}" style="color:#71717a;text-decoration:underline">Unsubscribe from the weekly digest</a>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 16px 8px">
              <p style="margin:0;font-size:12px;color:#3f3f46;font-family:system-ui,sans-serif">NEYA · Prishtina, Kosovo · © ${year}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* --- shared formatting helpers --- */

function formatDayTime(startsAt: string): string {
  const d = new Date(startsAt);
  const day = d.toLocaleDateString("en-GB", { timeZone: "Europe/Belgrade", weekday: "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("en-GB", { timeZone: "Europe/Belgrade", hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day} · ${time}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatPrice(ev: { ticket_from_eur?: number | string | null }): string | null {
  const raw = ev.ticket_from_eur;
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n % 1 === 0 ? `€${n.toFixed(0)}` : `€${n.toFixed(2)}`;
}
