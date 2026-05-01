// Phase 8 — operator alerts on critical mail send failure.
//
// Some mail flows are time-sensitive: a low-rating alert that doesn't
// reach the restaurant owner means a complaint goes unanswered for
// hours. A forgot-password mail that bounces locks the user out. We
// can't retry forever, but we can at least tell ops "this one didn't
// land" so they intervene manually.
//
// Implementation is deliberately minimal: a plain-text mail to
// OPS_EMAIL (or NOTIFICATION_EMAIL fallback) with structured failure
// metadata. No new schema, no retry logic — those belong in V2 if the
// raw count of alerts justifies the effort.
//
// Rate-limited (10 alerts / template / 5 min) so a Resend outage
// doesn't bomb ops with thousands of identical mails.

import { rateLimit } from '@/lib/rate-limit';
import { sendResendEmail } from '@/lib/email-internal';

export interface OpsAlertParams {
  /** Which template failed — 'low-rating-alert', 'forgot-password', etc. */
  template: string;
  /** Original recipient (the user / owner who didn't get the mail). */
  recipient: string;
  /** Free-form failure context: HTTP status, exception message, etc. */
  reason?: string;
  /** Useful identifiers for ops to find the upstream record. */
  metadata?: Record<string, string | number | null | undefined>;
  /** Affected owner's panel locale — Buaze ops için TR/EN body parity. */
  userLocale?: 'tr' | 'en';
}

const OPS_RATE_LIMIT_PER_WINDOW = 10;
const OPS_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

/**
 * Resolve the operator inbox. We prefer an explicit OPS_EMAIL env var
 * — typically a shared distribution list — but fall back to the
 * generic NOTIFICATION_EMAIL so a fresh deploy without OPS_EMAIL still
 * gets the alert somewhere monitored.
 */
function opsRecipient(): string | null {
  const ops = process.env.OPS_EMAIL?.trim();
  if (ops) return ops;
  const fallback = process.env.NOTIFICATION_EMAIL?.trim();
  if (fallback) return fallback;
  return null;
}

/**
 * Send the alert. Errors here are swallowed and logged — the caller
 * already knows the original send failed; we don't want to throw on
 * top of that and crash the request.
 *
 * Imports `sendResendEmail` from `email-internal` (not `email.ts`) so we
 * don't recurse: the public senders in email.ts CALL ops-alert on
 * failure, so going through them again would risk infinite alert loops
 * during a Resend outage.
 */
export async function notifyOpsOfMailFailure(params: OpsAlertParams): Promise<void> {
  const to = opsRecipient();
  if (!to) {
    console.error('[ops-alert] no recipient configured (OPS_EMAIL / NOTIFICATION_EMAIL)', params);
    return;
  }

  // Rate-limit per template so a Resend outage doesn't bomb the inbox.
  // Same template + recipient combo within 5 min → drop subsequent
  // alerts. The first one is enough to know the system is on fire.
  const key = `ops-alert:${params.template}`;
  const limit = await rateLimit(key, OPS_RATE_LIMIT_PER_WINDOW, OPS_RATE_LIMIT_WINDOW_MS);
  if (!limit.allowed) {
    console.warn(`[ops-alert] rate-limited for ${params.template} (retry in ${limit.retryAfterSeconds}s)`);
    return;
  }

  // Locale-aware body — etkilenen owner'ın panel diline göre TR/EN render.
  // Buaze ops ekibi her iki dili de okuyabilir; mail recipient (ops inbox)
  // değil, bağlam (affected user) dili önemli (CLAUDE.md §21.33 + Phase 11.34).
  const isTr = params.userLocale !== 'en'; // default TR (CLAUDE.md §22.9)
  const metaLines = Object.entries(params.metadata ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');

  const subject = isTr
    ? `[OPS] Mail gönderilemedi: ${params.template}`
    : `[OPS] Mail send failed: ${params.template}`;

  const text = isTr
    ? [
        `Kritik bir mail gönderilemedi.`,
        ``,
        `Şablon:    ${params.template}`,
        `Alıcı:     ${params.recipient}`,
        `Sebep:     ${params.reason ?? 'bilinmiyor (uygulama loglarına bakın)'}`,
        ``,
        `Metadata:`,
        metaLines || '  (yok)',
        ``,
        `Zaman:     ${new Date().toISOString()}`,
        ``,
        `Aksiyon: alıcı mailbox'ını / Resend dashboard'unu kontrol edin, sonra`,
        `upstream kayıt hâlâ geçerliyse admin panelinden tekrar tetikleyin.`,
      ].join('\n')
    : [
        `A critical mail failed to send.`,
        ``,
        `Template:   ${params.template}`,
        `Recipient:  ${params.recipient}`,
        `Reason:     ${params.reason ?? 'unknown (see app logs)'}`,
        ``,
        `Metadata:`,
        metaLines || '  (none)',
        ``,
        `When:       ${new Date().toISOString()}`,
        ``,
        `Action: investigate the recipient mailbox / Resend dashboard, then`,
        `re-trigger from the admin panel if the upstream record is still`,
        `actionable.`,
      ].join('\n');

  try {
    const ok = await sendResendEmail({
      to,
      subject,
      html: `<pre style="font-family:monospace;white-space:pre-wrap;">${text.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c))}</pre>`,
      text,
    });
    if (!ok) {
      console.error('[ops-alert] dispatch returned false — both primary mail AND ops alert failed');
    }
  } catch (err) {
    console.error('[ops-alert] dispatch threw:', err);
  }
}
