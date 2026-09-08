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

/**
 * Stage 31b §38.108 — ETK m.7(2) "ticari iletinin ticari amaçlı olduğu
 * kolaylıkla anlaşılabilir şekilde" yorumlamasına saygı gösteren subject
 * prefix guard. TR locale + subject zaten "Reklam:" / "Promosyon:" /
 * "Kampanya:" / "Fırsat:" prefix'lerinden biriyle başlamıyorsa otomatik
 * "Reklam: " prefix'i eklenir.
 *
 * EN locale dokunulmaz — ETK Türk hukuku, CAN-SPAM Act header bandı
 * ("[ADV]" / "ADVERTISEMENT:") zorunlu değil; ek prefix UX'i bozar.
 *
 * Stage 31c PR3 mail template render pipeline'ı bu helper'ı çağırır.
 * Helper export'lu — admin/dev/mail-preview owner panel preview hint
 * için reuse edilebilir.
 */
const TR_COMMERCIAL_PREFIX_REGEX = /^(reklam|promosyon|kampanya|f[ıi]rsat)[:\s]/i;

export function ensureCommercialPrefix(subject: string, locale: 'tr' | 'en'): string {
  const trimmed = subject.trim();
  if (locale !== 'tr') return trimmed;
  if (!trimmed) return 'Reklam:';
  if (TR_COMMERCIAL_PREFIX_REGEX.test(trimmed)) return trimmed;
  return `Reklam: ${trimmed}`;
}

// Stage 30 §38.106 — recipient cap (Vercel function timeout safety).
// 100 recipient × 600ms = 60s + Resend latency ~10s = 70s; admin approve
// endpoint maxDuration=60s; cap'i daha düşük tut (50) — Vercel function
// timeout'a düşmeden tüm batch tamamlanır. Üzerine çıkan caller hata
// alır (admin queue'da retry edebilir veya owner kampanyayı küçük
// segment'lere böler).
//
// Real-world data: KOBİ restoran tipik marketing-consent'li audience
// ≤200; gerçek kullanım'da nadiren cap'a takılır. Cap'a çarpan owner
// için "kampanyayı 2 partiye böl" guidance UI'da gelecek scope.
const MAX_RECIPIENTS_PER_CAMPAIGN = 50;

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com';
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
  const { campaignId, restaurantId, restaurantName, body } = args;
  const locale = args.locale ?? 'tr';

  // Stage 31c §38.109 — ETK m.7(2) "Reklam:" subject prefix runtime guard.
  // TR locale + subject zaten prefix'le başlamıyorsa "Reklam: " auto-prepend.
  // EN dokunulmaz (CAN-SPAM Act header bandı UX gereksiz). Helper send
  // pipeline single source of truth; UI compose preview hint paralel
  // gösterir (CampaignComposeModal §38.109).
  const subject = ensureCommercialPrefix(args.subject, locale);

  // Stage 30 §38.106 — recipient cap. Vercel function timeout safety
  // + Resend rate-limit margin. Kullanıcı `recipients.length > MAX` ise
  // hard truncate yapmıyoruz (silent slice owner için yanıltıcı); caller
  // tarafına "campaign_too_large" semantik throw eder.
  if (args.recipients.length > MAX_RECIPIENTS_PER_CAMPAIGN) {
    throw new Error(
      `Campaign recipient count exceeds limit (${args.recipients.length} > ${MAX_RECIPIENTS_PER_CAMPAIGN}). ` +
        `Owner should split into smaller segments or reach out to Buaze for higher-tier plan.`,
    );
  }
  const recipients = args.recipients;

  // Stage 31c §38.109 — restaurant.notificationEmail (sender identity, ETK
  // m.5) + iysId placeholder (Stage 31b §38.108). Tek query, defansif select
  // (CLAUDE.md §14.1 paterni). Restaurant doluysa notificationEmail; yoksa
  // helper içinde 'hello@buaze.com' fallback. iysId şu an Restaurant
  // schema'sında değil; CustomerEmailCampaign.iysId field'ı placeholder
  // olarak null kalır (operatör credentials gelene kadar).
  const restaurantMeta = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { notificationEmail: true },
  });
  const senderEmail = restaurantMeta?.notificationEmail ?? null;
  const sentAt = new Date();

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
      // Stage 31c §38.109 — render pipeline'a senderEmail + iysId + sentAt
      // params. iysId şu an campaign-level alınmıyor (per-campaign placeholder
      // null; operatör İYS API entegrasyonu gelince populate edilir);
      // template footer'da `formatIysIdForFooter(null) === '—'` render eder.
      const rendered = await renderCustomerCampaign(
        {
          restaurantName,
          subject,
          body,
          unsubscribeUrl,
          senderEmail,
          iysId: null,
          sentAt,
        },
        locale,
      );
      success = await sendResendEmail({
        template: 'customer-campaign',
        locale,
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
        logMetadata: { campaignId, restaurantId },
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
