// Stage A5 §38.97 — owner segment mail send pipeline.
//
// Per-row Promise.allSettled (CLAUDE.md §28.4). 600ms throttle (CLAUDE.md
// §38.12 paterni — Resend free tier 2/sec cap altında %20 margin).
// Audit log helper (writeAdminAuditLog) tek satır summary; per-row PII
// stripped (CLAUDE.md §37.7 — only userId + status, no email/phone).

import { sendResendEmail } from '@/lib/email-internal';
import { renderOwnerSegmentMail } from '@/lib/email/templates/owner-segment-mail';

const RESEND_THROTTLE_MS = 600; // §38.12 paterni

export interface OwnerRecipient {
  id: string;
  email: string;
  name: string | null;
  locale?: 'tr' | 'en';
}

export interface OwnerSegmentSendResult {
  totalCount: number;
  sentCount: number;
  failedCount: number;
  perRow: Array<{ userId: string; ok: boolean; error?: string }>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send owner-segment mail to a batch. Caller (bulk endpoint) gather'ı
 * yapar; helper sequential render + send + sleep loop'u koşar.
 *
 * Return: per-row result + counters. Caller audit log + UI feedback için
 * kullanır.
 */
export async function sendOwnerSegmentMail(args: {
  recipients: OwnerRecipient[];
  subject: string;
  body: string;
  appUrl?: string;
}): Promise<OwnerSegmentSendResult> {
  const { recipients, subject, body, appUrl } = args;
  const perRow: OwnerSegmentSendResult['perRow'] = [];
  let sentCount = 0;
  let failedCount = 0;

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    let ok = false;
    let error: string | undefined;
    try {
      const rendered = renderOwnerSegmentMail(
        { subject, body, ownerName: r.name, appUrl },
        r.locale ?? 'tr',
      );
      ok = await sendResendEmail({
        template: 'owner-segment-mail',
        locale: r.locale ?? 'tr',
        to: r.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        logMetadata: { userId: r.id },
      });
      if (!ok) error = 'sendResendEmail returned false';
    } catch (err) {
      ok = false;
      error = err instanceof Error ? err.message : String(err);
    }

    perRow.push({ userId: r.id, ok, error });
    if (ok) sentCount += 1;
    else failedCount += 1;

    if (i < recipients.length - 1) {
      await sleep(RESEND_THROTTLE_MS);
    }
  }

  return {
    totalCount: recipients.length,
    sentCount,
    failedCount,
    perRow,
  };
}
