// Wave F (CLAUDE.md §38.B + §38.196) — mail delivery audit log.
//
// recordMailDelivery writes a single row to mail_delivery_logs every
// time Resend acks (success OR failure) a send request. KVKK §13
// forensic recovery + "did this owner get the alert?" post-incident
// queries.
//
// Helper is fire-and-forget. Any DB write failure is swallowed +
// console.error'd — operational telemetry must never block a real mail
// send. Callers don't have to await unless they want strict ordering.
//
// PII discipline: recipient email + template key + metadata Json (small
// non-PII keys like userId / restaurantId / locale / errorName). No
// Subject, no HTML body, no IP. Sender helpers already redact PII
// internally; this table is an outcome audit trail, not a copy of the
// mail itself.

import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';

export type MailDeliveryStatus = 'sent' | 'failed';

export interface MailDeliveryLogParams {
  template: string;
  recipient: string;
  status: MailDeliveryStatus;
  locale?: 'tr' | 'en' | null;
  metadata?: Record<string, string | number | null | undefined>;
}

export async function recordMailDelivery(
  params: MailDeliveryLogParams,
): Promise<void> {
  try {
    await prisma.mailDeliveryLog.create({
      data: {
        template: params.template,
        recipient: params.recipient.slice(0, 320),
        status: params.status,
        locale: params.locale ?? null,
        metadata: params.metadata
          ? (params.metadata as Record<string, string | number | null | undefined> as never)
          : undefined,
      },
    });
  } catch (err) {
    // Telemetry write failure must not break the mail flow. Sentry
    // captures so ops still sees the drift.
    console.error('[mail-delivery-log] write failed', {
      template: params.template,
      errName: err instanceof Error ? err.name : 'unknown',
    });
    Sentry.captureException(err, {
      tags: { module: 'mail-delivery-log' },
      extra: { template: params.template },
    });
  }
}
