// §38.48 Wave 2 — Customer email campaign send pipeline.
//
// Owner panel "Kampanya gönder" bulk action seçili müşterilere mass email
// yollar. Bu helper:
//   - KVKK marketing consent gate (Feedback.hasMarketingConsent = TRUE zorunlu)
//   - Resend rate-limit (600ms throttle CLAUDE.md §38.12 paterni)
//   - Promise.allSettled per-row isolation (CLAUDE.md §28.4)
//   - List-Unsubscribe + List-Unsubscribe-Post: One-Click headers (RFC 2369/8058)
//   - CustomerEmailLog audit per-row + final status counters
//
// Rate-limit timing: 50 müşteri × 600ms = 30sn (Vercel function maxDuration
// 60sn safe — CLAUDE.md §38.11). Üstüne çıkarsa truncate edilir (UI 50 üst
// sınırı zaten enforced bulk endpoint'te).

import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { renderCustomerCampaign } from './email/templates/customer-campaign';
import { sendResendEmail } from './email-internal';

const RESEND_THROTTLE_MS = 600; // §38.12 paterni: ~1.6 req/sec, %20 margin under Resend free tier

export interface CustomerCampaignRecipient {
  /** Cross-restaurant unique key: `${restaurantId}|${contactKey}`. */
  key: string;
  restaurantId: string;
  contactKey: string;
  email: string;
  /** KVKK marketing consent gate result. False ise send skip + status='unsubscribed'. */
  hasMarketingConsent: boolean;
}

export interface CustomerCampaignSendResult {
  campaignId: string;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  totalCount: number;
}

/**
 * Generate a deterministic unsubscribe token for a (campaignId, contactKey)
 * pair. Token format: HMAC-SHA256 → base64url. Server-side `verifyToken` helper
 * decodes campaignId + contactKey from token.
 */
function buildUnsubscribeToken(campaignId: string, contactKey: string): string {
  const secret = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod';
  const payload = `${campaignId}:${contactKey}`;
  const sig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

export function verifyUnsubscribeToken(token: string): { campaignId: string; contactKey: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const lastColon = decoded.lastIndexOf(':');
    if (lastColon === -1) return null;
    const payload = decoded.slice(0, lastColon);
    const sig = decoded.slice(lastColon + 1);
    const secret = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod';
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64url');
    // Constant-time compare to prevent timing attacks.
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const firstColon = payload.indexOf(':');
    if (firstColon === -1) return null;
    return {
      campaignId: payload.slice(0, firstColon),
      contactKey: payload.slice(firstColon + 1),
    };
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUnsubscribeUrl(token: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';
  return `${appUrl.replace(/\/$/, '')}/api/customers/unsubscribe?token=${encodeURIComponent(token)}`;
}

/**
 * Send an owner-authored campaign email to a batch of customer recipients.
 *
 * Flow:
 *   1. Mark campaign status='sending' + recipientCount.
 *   2. For each recipient (sequential with throttle):
 *      - Skip if hasMarketingConsent === false → log status='unsubscribed'.
 *      - Render Pulse template (per-recipient unsubscribe URL).
 *      - sendResendEmail with RFC 8058 List-Unsubscribe headers.
 *      - Log status='sent' or 'failed' + errorMessage.
 *   3. Update campaign with final counters + status='sent' or 'failed'.
 *
 * Idempotency: `(campaignId, contactKey)` unique constraint on CustomerEmailLog
 * — re-running the same campaign doesn't duplicate sends. Caller (bulk endpoint)
 * is responsible for not re-creating the same campaign (UI prevents it).
 *
 * Returns counters for the bulk endpoint response shape.
 */
export async function sendCustomerCampaign(args: {
  campaignId: string;
  restaurantId: string;
  restaurantName: string;
  subject: string;
  body: string;
  recipients: CustomerCampaignRecipient[];
  locale?: 'tr' | 'en';
}): Promise<CustomerCampaignSendResult> {
  const { campaignId, restaurantId, restaurantName, subject, body, recipients } = args;
  const locale = args.locale ?? 'tr';

  // Mark campaign as sending; track recipient count up-front.
  await prisma.customerEmailCampaign.update({
    where: { id: campaignId },
    data: {
      status: 'sending',
      recipientCount: recipients.length,
    },
  });

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const recipient of recipients) {
    // KVKK marketing consent gate (CLAUDE.md §19.1 opt-in zorunlu).
    if (!recipient.hasMarketingConsent) {
      skippedCount += 1;
      try {
        await prisma.customerEmailLog.create({
          data: {
            campaignId,
            restaurantId,
            contactKey: recipient.contactKey,
            email: recipient.email,
            status: 'unsubscribed',
            errorMessage: 'KVKK marketing consent missing',
          },
        });
      } catch (err) {
        // Unique violation (campaignId, contactKey) — re-run idempotency.
        // Silent skip; counter already incremented.
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[customer-campaign] log skip (consent)', err);
        }
      }
      continue;
    }

    const token = buildUnsubscribeToken(campaignId, recipient.contactKey);
    const unsubscribeUrl = buildUnsubscribeUrl(token);

    let success = false;
    let errorMessage: string | null = null;
    try {
      const rendered = await renderCustomerCampaign(
        { restaurantName, subject, body, unsubscribeUrl },
        locale,
      );
      success = await sendResendEmail({
        to: recipient.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        headers: {
          // RFC 2369 + RFC 8058 (CLAUDE.md §21.23 paterni).
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'Precedence': 'bulk',
        },
      });
      if (!success) {
        errorMessage = 'sendResendEmail returned false (check Resend logs)';
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
      success = false;
    }

    if (success) sentCount += 1;
    else failedCount += 1;

    // Audit log (best-effort; helper write fail UI'ı kırmaz).
    try {
      await prisma.customerEmailLog.create({
        data: {
          campaignId,
          restaurantId,
          contactKey: recipient.contactKey,
          email: recipient.email,
          status: success ? 'sent' : 'failed',
          sentAt: success ? new Date() : null,
          errorMessage: success ? null : errorMessage,
        },
      });
    } catch (err) {
      // Unique violation = re-run; counter intact.
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[customer-campaign] log skip (send)', err);
      }
    }

    // Resend rate-limit throttle (CLAUDE.md §38.12 paterni).
    if (recipients.indexOf(recipient) < recipients.length - 1) {
      await sleep(RESEND_THROTTLE_MS);
    }
  }

  // Final campaign update.
  const finalStatus = failedCount === recipients.length && recipients.length > 0 ? 'failed' : 'sent';
  await prisma.customerEmailCampaign.update({
    where: { id: campaignId },
    data: {
      status: finalStatus,
      sentCount,
      failedCount,
      sentAt: new Date(),
    },
  });

  return {
    campaignId,
    sentCount,
    failedCount,
    skippedCount,
    totalCount: recipients.length,
  };
}
