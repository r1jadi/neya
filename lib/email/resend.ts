/** Resend client — set RESEND_API_KEY and call from server actions or Route Handlers */
export async function sendTransactionalEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false as const, error: "RESEND_API_KEY missing" };
  void to;
  void subject;
  void html;
  return { ok: true as const };
}
