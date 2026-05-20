import "server-only";

import { sendTransactionalEmail } from "@/lib/email/resend";
import { formatEventWhen } from "@/lib/event-dates";
import { sendTransactionalSms } from "@/lib/sms/send";
import { SITE } from "@/lib/constants";
import { guestlistStatusLabel } from "@/lib/guestlist/labels";
import type { GuestlistRequestStatus } from "@/types/guestlist";

export type GuestlistNotifyContext = {
  requestId: string;
  fullName: string;
  phone: string;
  email: string | null;
  groupSize: number;
  status: GuestlistRequestStatus;
  eventTitle: string;
  eventSlug: string;
  startsAt: string | null;
  venueName: string | null;
};

function eventWhenLine(startsAt: string | null): string {
  if (!startsAt) return "";
  return formatEventWhen(startsAt);
}

function eventUrl(slug: string): string {
  return `${SITE.url}/events/${slug}`;
}

function emailShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#0a0a0a;color:#f4f4f5;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#18181b;border-radius:12px;padding:24px;border:1px solid #3f3f46">
  <p style="margin:0 0 8px;font-size:12px;color:#a1a1aa;text-transform:uppercase;letter-spacing:.08em">${SITE.name}</p>
  <h1 style="margin:0 0 16px;font-size:20px;color:#fff">${title}</h1>
  ${bodyHtml}
  <p style="margin:24px 0 0;font-size:12px;color:#71717a"><a href="${SITE.url}" style="color:#e879f9">${SITE.url}</a></p>
  </div></body></html>`;
}

export async function notifyGuestlistReceived(ctx: GuestlistNotifyContext): Promise<void> {
  const when = eventWhenLine(ctx.startsAt);
  const venue = ctx.venueName ? ` at ${ctx.venueName}` : "";
  const statusLabel = guestlistStatusLabel("pending");

  const smsBody = `${SITE.name}: Guestlist request received for ${ctx.eventTitle}${venue}. Status: ${statusLabel}. Party of ${ctx.groupSize}. We'll notify you when reviewed.`;

  const html = emailShell(
    "Guestlist request received",
    `<p style="color:#d4d4d8;line-height:1.5">Hi ${ctx.fullName},</p>
    <p style="color:#d4d4d8;line-height:1.5">Your guestlist application for <strong>${ctx.eventTitle}</strong>${venue} was received.</p>
    <ul style="color:#a1a1aa;font-size:14px;line-height:1.6">
      <li><strong style="color:#e4e4e7">Status:</strong> ${statusLabel}</li>
      ${when ? `<li><strong style="color:#e4e4e7">When:</strong> ${when}</li>` : ""}
      <li><strong style="color:#e4e4e7">Party size:</strong> ${ctx.groupSize}</li>
    </ul>
    <p style="color:#d4d4d8;line-height:1.5">You'll get another message when the venue approves or declines your request.</p>
    <p><a href="${eventUrl(ctx.eventSlug)}" style="color:#e879f9">View event</a></p>`,
  );

  if (ctx.email) {
    const result = await sendTransactionalEmail(
      ctx.email,
      `${SITE.name} — guestlist request received`,
      html,
    );
    if (!result.ok) console.error("[guestlist] received email failed", result.error);
  }

  const sms = await sendTransactionalSms(ctx.phone, smsBody);
  if (!sms.ok && sms.error !== "SMS not configured") {
    console.error("[guestlist] received sms failed", sms.error);
  }
}

export async function notifyGuestlistStatusChange(ctx: GuestlistNotifyContext): Promise<void> {
  if (ctx.status === "pending") return;

  const when = eventWhenLine(ctx.startsAt);
  const venue = ctx.venueName ? ` at ${ctx.venueName}` : "";
  const statusLabel = guestlistStatusLabel(ctx.status);

  const approved = ctx.status === "approved" || ctx.status === "checked_in";
  const smsBody = approved
    ? `${SITE.name}: You're on the guestlist for ${ctx.eventTitle}${venue}! Show this number at the door. Party of ${ctx.groupSize}.`
    : `${SITE.name}: Your guestlist request for ${ctx.eventTitle} was ${statusLabel.toLowerCase()}.`;

  const title = approved ? "You're on the guestlist" : `Guestlist ${statusLabel.toLowerCase()}`;
  const html = emailShell(
    title,
    `<p style="color:#d4d4d8;line-height:1.5">Hi ${ctx.fullName},</p>
    <p style="color:#d4d4d8;line-height:1.5">Your guestlist request for <strong>${ctx.eventTitle}</strong>${venue} is now <strong style="color:${approved ? "#6ee7b7" : "#fca5a5"}">${statusLabel}</strong>.</p>
    <ul style="color:#a1a1aa;font-size:14px;line-height:1.6">
      ${when ? `<li><strong style="color:#e4e4e7">When:</strong> ${when}</li>` : ""}
      <li><strong style="color:#e4e4e7">Party size:</strong> ${ctx.groupSize}</li>
    </ul>
    ${approved ? `<p style="color:#d4d4d8;line-height:1.5">Show the phone number you registered with at the door.</p>` : ""}
    <p><a href="${eventUrl(ctx.eventSlug)}" style="color:#e879f9">View event</a></p>`,
  );

  if (ctx.email) {
    const result = await sendTransactionalEmail(
      ctx.email,
      `${SITE.name} — guestlist ${statusLabel.toLowerCase()}`,
      html,
    );
    if (!result.ok) console.error("[guestlist] status email failed", result.error);
  }

  const sms = await sendTransactionalSms(ctx.phone, smsBody);
  if (!sms.ok && sms.error !== "SMS not configured") {
    console.error("[guestlist] status sms failed", sms.error);
  }
}
