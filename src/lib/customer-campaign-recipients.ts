// CLAUDE.md §38.99 — Customer campaign recipient resolver.
//
// Owner panel `/dashboard/campaigns` compose flow için: Feedback-derived
// dedupe pattern üstüne (CLAUDE.md §4.5) marketing consent + KVKK gate ile
// recipient list üretir. Manuel email girişi YOK (CLAUDE.md §38.64 disipline
// — sadece sistemde olan müşteriler).
//
// Pure function (Prisma client'ı arg olarak DEĞİL — modül-level prisma reuse,
// test için mock yapılabilir). Saf fonksiyon değil ama side-effect yok (sadece
// read query). Test için integration veya mock paterni.

import { prisma } from '@/lib/prisma';
import type { CustomerCampaignRecipient } from './email-customer-campaign';

export interface ResolveRecipientsArgs {
  restaurantId: string;
  /**
   * MVP scope (CLAUDE.md §38.99): always true. Helper signature future-proof
   * for opt-in segment scoping later.
   */
  onlyMarketingConsent: true;
}

interface FeedbackRecipientRow {
  email: string | null;
  phone: string | null;
  name: string | null;
  hasMarketingConsent: boolean;
  hasKvkkConsent: boolean;
}

/**
 * Mask email for owner UI sample preview. Defense-in-depth: owner sample
 * görür ama ham email expose etmez. CLAUDE.md §37.7 PII redaction paterni.
 *
 * Examples:
 *   "ahmet@gmail.com" → "a***@gmail.com"
 *   "x@y.co" → "x***@y.co"
 *   "abcd" → "a***" (no @ — graceful fallback)
 */
export function maskEmail(email: string): string {
  if (!email) return '';
  const at = email.indexOf('@');
  if (at < 1) {
    return `${email[0] || ''}***`;
  }
  const local = email.slice(0, at);
  const domain = email.slice(at);
  return `${local[0]}***${domain}`;
}

/**
 * Compute contact_key for Feedback dedupe pattern (CLAUDE.md §4.5):
 *   COALESCE(lower(email), phone)
 *
 * Anonim feedback (email + phone null) → null (caller filters).
 */
export function deriveContactKey(row: { email: string | null; phone: string | null }): string | null {
  if (row.email) return row.email.toLowerCase();
  if (row.phone) return row.phone;
  return null;
}

/**
 * Resolve campaign recipients for a given restaurant.
 *
 * Filter chain:
 *   1. KVKK consent (hasKvkkConsent=true) — CLAUDE.md §13.5 baseline
 *   2. Email present (cannot send without email)
 *   3. Marketing consent (hasMarketingConsent=true) — CLAUDE.md §19.1
 *      opt-in disipline (Article 7)
 *   4. Dedupe by contact_key (lower(email)) — feedback-derived pattern,
 *      most recent feedback name wins
 *
 * Returns recipients in `CustomerCampaignRecipient` shape consumed by
 * `sendCustomerCampaign` pipeline (§38.48 Wave 2). Caller decides whether
 * to enqueue all or slice for batch limits.
 */
export async function resolveSegmentRecipients(
  args: ResolveRecipientsArgs,
): Promise<CustomerCampaignRecipient[]> {
  // §38.99 — Pull all KVKK-consenting feedbacks with marketing consent + email.
  // Latest createdAt wins per contact_key (most recent name/locale).
  const rows = await prisma.feedback.findMany({
    where: {
      restaurantId: args.restaurantId,
      hasKvkkConsent: true,
      hasMarketingConsent: true,
      email: { not: null },
    },
    select: {
      email: true,
      phone: true,
      name: true,
      hasMarketingConsent: true,
      hasKvkkConsent: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return dedupeAndShape(rows, args.restaurantId);
}

/**
 * Pure deduplication helper. Test edilebilir: rows array → recipient list.
 * Most recent row (caller orderBy desc) wins per contact_key.
 *
 * Exported for unit testing.
 */
export function dedupeAndShape(
  rows: FeedbackRecipientRow[],
  restaurantId: string,
): CustomerCampaignRecipient[] {
  const seen = new Map<string, CustomerCampaignRecipient>();
  for (const row of rows) {
    if (!row.hasKvkkConsent) continue; // belt-and-suspenders
    if (!row.hasMarketingConsent) continue;
    if (!row.email) continue;
    const contactKey = deriveContactKey(row);
    if (!contactKey) continue;
    if (seen.has(contactKey)) continue; // first (most recent) wins
    seen.set(contactKey, {
      key: `${restaurantId}|${contactKey}`,
      restaurantId,
      contactKey,
      email: row.email,
      hasMarketingConsent: true,
    });
  }
  return Array.from(seen.values());
}
