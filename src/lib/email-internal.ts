// Internal Resend HTTP layer. Split out from email.ts in Phase 8 so
// ops-alert.ts can dispatch failure notifications without importing
// email.ts (which transitively imports the template renderers — most
// of which we don't need for the bare alert mail).
//
// Public surface (sendMail / sendFeedbackNotification / etc.) lives in
// email.ts and re-uses this module.

import { safeParseJson } from '@/lib/safe-json';
import { recordMailDelivery } from '@/lib/email/delivery-log';

function defaultReplyTo(): string | undefined {
  const env = process.env.RESEND_REPLY_TO?.trim()
    || process.env.NOTIFICATION_EMAIL?.trim();
  if (env) return env;
  return undefined;
}

export interface ResendAttachment {
  /** Görünür dosya adı (örn. "buaze-roi-projeksiyon.pdf"). */
  filename: string;
  /** Base64 string (Resend bunu binary'e çevirir) — Buffer'dan
   *  `buf.toString('base64')` ile üretilir. */
  content: string;
  /** Opsiyonel content-type override; default Resend MIME tahmin eder. */
  contentType?: string;
}

export async function sendResendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  headers,
  attachments,
  template,
  locale,
  logMetadata,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Extra RFC-style headers passed straight to Resend. Used for marketing
   *  mail compliance (List-Unsubscribe, List-Unsubscribe-Post one-click). */
  headers?: Record<string, string>;
  /** Email attachment listesi — base64 string olarak iletilir. PDF report
   *  gibi binary dosyalar için. Resend tek mail başına ~40MB toplam attach
   *  size izin veriyor; pratikte tek PDF için sınır değil. */
  attachments?: ResendAttachment[];
  /** Wave F (CLAUDE.md §38.196) — template key for delivery audit log.
   *  Optional only for the legacy sendMail wrapper; public senders should
   *  always pass it (forensic queries need to filter by template). */
  template?: string;
  /** Owner panel locale used for the rendered copy (TR/EN). Stored as
   *  audit context, never used at send time. */
  locale?: 'tr' | 'en' | null;
  /** Free-form forensic context — userId, restaurantId, errorName, etc.
   *  PII bodies forbidden (subject + html + text already stripped). */
  logMetadata?: Record<string, string | number | null | undefined>;
}): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY?.trim();

  // Wave F (CLAUDE.md §38.196) — audit log writer. Fire-and-forget;
  // wraps every exit path so success + failure both land in the table.
  // Recipient is normalised to a string for the log row (multi-recipient
  // sends use the joined form for forensic clarity).
  const recipientForLog = Array.isArray(to) ? to.join(',') : to;
  const logTemplate = template ?? 'unknown';
  const logDelivery = (status: 'sent' | 'failed', extra?: Record<string, string | number | null | undefined>) => {
    recordMailDelivery({
      template: logTemplate,
      recipient: recipientForLog,
      status,
      locale: locale ?? null,
      metadata: { ...(logMetadata ?? {}), ...(extra ?? {}) },
    }).catch(() => {
      // helper already swallows; defence-in-depth
    });
  };

  if (!resendKey) {
    console.error('[Buaze Email] RESEND_API_KEY missing — cannot send email.');
    logDelivery('failed', { reason: 'resend_api_key_missing' });
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
    if (attachments && attachments.length > 0) {
      payload.attachments = attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        ...(a.contentType ? { content_type: a.contentType } : {}),
      }));
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
      logDelivery('failed', { reason: 'resend_http_error', httpStatus: response.status });
      return false;
    }

    // safeParseJson tags malformed Resend responses to Sentry — useful
    // when Resend changes payload shape or returns HTML on 2xx (rare but
    // happens during incidents). Görev G + CLAUDE.md §38.8.
    const parsed = safeParseJson<{ id?: string }>(responseText, {
      source: 'resend-mail',
    });
    if (!parsed) {
      console.error('[Buaze Email] Resend non-JSON 2xx body:', responseText);
      logDelivery('failed', { reason: 'resend_non_json_body' });
      return false;
    }
    if (typeof parsed.id !== 'string' || !parsed.id) {
      console.error('[Buaze Email] Resend 2xx without id:', responseText);
      logDelivery('failed', { reason: 'resend_missing_id' });
      return false;
    }
    logDelivery('sent', { resendId: parsed.id });
    return true;
  } catch (error) {
    console.error('[Buaze Email] Network exception:', error);
    logDelivery('failed', {
      reason: 'network_exception',
      errName: error instanceof Error ? error.name : 'unknown',
    });
    return false;
  }
}
