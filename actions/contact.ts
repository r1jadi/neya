"use server";

import { sendTransactionalEmail } from "@/lib/email/resend";
import { rateLimit } from "@/lib/rate-limit";

export type ContactFormResult = { success: true } | { success: false; error: string };

const CONTACT_EMAIL = "neyakosova@gmail.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]!);
}

export async function submitContactForm(formData: FormData): Promise<ContactFormResult> {
  const honeypot = String(formData.get("company") ?? "").trim();
  if (honeypot) return { success: true };

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 320);
  const subject = String(formData.get("subject") ?? "").trim().slice(0, 160);
  const message = String(formData.get("message") ?? "").trim().slice(0, 5000);

  if (name.length < 2 || !EMAIL_RE.test(email) || subject.length < 3 || message.length < 10) {
    return { success: false, error: "Please complete each field with valid details." };
  }

  const rate = await rateLimit(`contact:${email}`, 5, 3600);
  if (!rate.success) return { success: false, error: "Too many messages. Please try again later." };

  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#0a0a0a;color:#f4f4f5;padding:24px">
    <div style="max-width:600px;margin:0 auto;background:#18181b;border:1px solid #3f3f46;border-radius:12px;padding:24px">
      <p style="margin:0 0 8px;font-size:12px;color:#a1a1aa;text-transform:uppercase;letter-spacing:.08em">NEYA contact form</p>
      <h1 style="margin:0 0 20px;font-size:20px;color:#fff">${escapeHtml(subject)}</h1>
      <p style="color:#d4d4d8"><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p style="color:#d4d4d8"><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p style="color:#d4d4d8;white-space:pre-wrap;line-height:1.5">${escapeHtml(message)}</p>
    </div></body></html>`;

  const sent = await sendTransactionalEmail(CONTACT_EMAIL, `NEYA contact: ${subject}`, html, { replyTo: email });
  if (!sent.ok) {
    console.error("[contact] email delivery failed", sent.error);
    return { success: false, error: "We couldn't send your message right now. Please try again later." };
  }

  return { success: true };
}
