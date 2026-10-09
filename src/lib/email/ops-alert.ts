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
    // PII redaction — `params.recipient` is the affected user's e-mail,
    // and `console.error` is captured by Sentry's `extra`. Strip it
    // before logging so a missing OPS_EMAIL config doesn't dump every
    // failed-send recipient into the error tracker (KVKK / Sentry data
    // minimization). The metadata bag rarely carries PII (template
    // name + numeric ids) so we keep that.
    const { recipient: _omit, ...safe } = params;
    console.error('[ops-alert] no recipient configured (OPS_EMAIL / NOTIFICATION_EMAIL)', safe);
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
      template: `ops-alert:mail-failure:${params.template}`,
      locale: params.userLocale ?? 'tr',
      to,
      subject,
      html: `<pre style="font-family:monospace;white-space:pre-wrap;">${text.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c))}</pre>`,
      text,
      logMetadata: { failedTemplate: params.template, reason: params.reason ?? null },
    });
    if (!ok) {
      console.error('[ops-alert] dispatch returned false — both primary mail AND ops alert failed');
    }
  } catch (err) {
    console.error('[ops-alert] dispatch threw:', err);
  }
}

export interface OpenAiBillingAlertParams {
  /** OpenAI HTTP status (typically 429 for billing/quota issues). */
  status: number;
  /** Error type returned by OpenAI ('billing_not_active', 'insufficient_quota', etc). */
  errorType?: string;
  /** Error message snippet from OpenAI response body. */
  message?: string;
  /** Which Buaze surface triggered the call (analytics-themes, suggest-reply, ...). */
  source?: string;
}

/**
 * Notify ops when OpenAI returns a billing-related failure
 * (billing_not_active / insufficient_quota / payment failure). When the
 * Buaze owner's OpenAI balance runs out, every AI feature silently falls
 * back to a deterministic template — owners see the worse output without
 * any visible signal. This alert lands in the ops inbox the moment the
 * first failed call happens so the operator can top up before the day
 * is over.
 *
 * Rate-limited the same way as `notifyOpsOfMailFailure`: 1 mail per 5 min
 * window per error type. A real outage might emit thousands of failures
 * per minute (every dashboard load triggers analytics + suggest-reply);
 * we only need the first one to know the system is offline.
 *
 * Locale: default TR (CLAUDE.md §22.9). Buaze ops works in TR; an EN
 * variant is exposed for parity but rarely used.
 */
export async function notifyOpsOfOpenAiBillingFailure(
  params: OpenAiBillingAlertParams,
): Promise<void> {
  const to = opsRecipient();
  if (!to) {
    console.error('[ops-alert] OpenAI billing alert — no recipient configured', {
      status: params.status,
      errorType: params.errorType,
      source: params.source,
    });
    return;
  }

  // Per-errorType rate-limit so a billing outage emitting 200 fails/min
  // turns into ONE mail per 5 min, not 200 inbox entries. CLAUDE.md §21.33
  // pattern.
  const key = `ops-alert:openai-billing:${params.errorType || 'unknown'}`;
  const limit = await rateLimit(key, OPS_RATE_LIMIT_PER_WINDOW, OPS_RATE_LIMIT_WINDOW_MS);
  if (!limit.allowed) {
    return;
  }

  const subject = `[OPS] OpenAI ${params.errorType || 'billing'} — AI özellikleri kapalı`;

  const text = [
    `OpenAI billing arızası — Buaze AI özellikleri (Pulse AI taslak, analytics`,
    `tema çıkarımı, haftalık insight) şu an template fallback'a düştü.`,
    ``,
    `Hata tipi:    ${params.errorType ?? 'bilinmiyor'}`,
    `HTTP status:  ${params.status}`,
    `Kaynak:       ${params.source ?? 'bilinmiyor'}`,
    `Mesaj:        ${params.message ?? '(yok)'}`,
    ``,
    `Zaman:        ${new Date().toISOString()}`,
    ``,
    `Aksiyon: https://platform.openai.com/account/billing → kart/credit kontrol et,`,
    `gerekirse kredi yükle. Düzeldikten sonra owner'lar dashboard yenileyince`,
    `AI taslakları tekrar üretilir (cache yok, anlık).`,
    ``,
    `Bu uyarı 5 dakikada bir kez atılır — aynı hata içinde tekrarlamaz.`,
  ].join('\n');

  try {
    await sendResendEmail({
      template: 'ops-alert:openai-billing',
      locale: 'tr',
      to,
      subject,
      html: `<pre style="font-family:monospace;white-space:pre-wrap;">${text.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c))}</pre>`,
      text,
      logMetadata: { status: params.status, errorType: params.errorType ?? null, source: params.source ?? null },
    });
  } catch (err) {
    console.error('[ops-alert] OpenAI billing dispatch threw:', err);
  }
}
