// Internal Resend HTTP layer. Split out from email.ts in Phase 8 so
// ops-alert.ts can dispatch failure notifications without importing
// email.ts (which transitively imports the template renderers — most
// of which we don't need for the bare alert mail).
//
// Public surface (sendMail / sendFeedbackNotification / etc.) lives in
// email.ts and re-uses this module.

function defaultReplyTo(): string | undefined {
  const env = process.env.RESEND_REPLY_TO?.trim()
    || process.env.NOTIFICATION_EMAIL?.trim();
  if (env) return env;
  return undefined;
}

export async function sendResendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  headers,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Extra RFC-style headers passed straight to Resend. Used for marketing
   *  mail compliance (List-Unsubscribe, List-Unsubscribe-Post one-click). */
  headers?: Record<string, string>;
}): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY?.trim();

  if (!resendKey) {
    console.error('[Buaze Email] RESEND_API_KEY missing — cannot send email.');
    return false;
  }

  try {
    const payload: Record<string, unknown> = {
      from: process.env.RESEND_FROM_EMAIL?.trim() || 'Buaze <noreply@buaze.com>',
      to,
      subject,
      html,
      text,
    };
    // Reply-To: explicit caller value > env default. Always set when
    // possible — Gmail flags pure noreply senders as suspicious in marketing
    // contexts and a real reply path is required for some bulk-sender rules.
    const effectiveReplyTo = replyTo ?? defaultReplyTo();
    if (effectiveReplyTo) payload.reply_to = effectiveReplyTo;
    if (headers && Object.keys(headers).length > 0) {
      payload.headers = headers;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`[Buaze Email] Resend HTTP ${response.status}:`, responseText);
      return false;
    }

    let parsed: { id?: string } | null = null;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      console.error('[Buaze Email] Resend non-JSON 2xx body:', responseText);
      return false;
    }
    if (!parsed || typeof parsed.id !== 'string' || !parsed.id) {
      console.error('[Buaze Email] Resend 2xx without id:', responseText);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[Buaze Email] Network exception:', error);
    return false;
  }
}
