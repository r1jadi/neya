import "server-only";

/** Optional SMS — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER */
export async function sendTransactionalSms(
  to: string,
  body: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    console.info("[sms] skipped (Twilio not configured)", { to: to.slice(0, 6) + "…" });
    return { ok: false, error: "SMS not configured" };
  }

  const normalized = to.replace(/\D/g, "");
  if (normalized.length < 8) {
    return { ok: false, error: "Invalid phone for SMS" };
  }

  const e164 = normalized.startsWith("383") ? `+${normalized}` : `+${normalized}`;

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const params = new URLSearchParams({ To: e164, From: from, Body: body });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: text || `Twilio HTTP ${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "SMS send failed";
    return { ok: false, error: message };
  }
}
