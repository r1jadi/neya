/** Resend transactional email — set RESEND_API_KEY and RESEND_FROM in env */
export async function sendTransactionalEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "NEYA <noreply@neya.live>";

  if (!key) {
    return { ok: false, error: "RESEND_API_KEY missing" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: body || `Resend HTTP ${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    return { ok: false, error: message };
  }
}
