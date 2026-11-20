import { createHash } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { BillingLocale } from './billing-format';
import { stripDigitRuns } from './renewal-store-prisma';

/**
 * Consent evidence (billing spec §6.1 `consent.ts`, §13.2, §4.4). Every
 * consent row is append-only evidence: the exact NFC text the owner saw
 * (`textRendered`), its SHA-256 (`textHash`, re-verifiable from the text),
 * the text version, the legal document revisions it refers to, how the owner
 * authenticated, the trusted client IP and the user agent (digit runs ≥ 12
 * stripped; IP kept until `ipPurgeAfter` = now + 540 days, §4.4).
 *
 * This release captures the card-save consent (`card_save`, shown on the
 * review page before a 3D Secure payment that saves the card). The
 * auto-renew instruction (`auto_renew_on`) arrives with auto-charging.
 * Texts are versioned: changing a word means a new version id.
 */

export const CARD_SAVE_CONSENT_VERSION = 'cs-2026-12-v1';

const CARD_SAVE_TEXT: Record<BillingLocale, string> = {
  tr:
    'Kartımın, sonraki ödemelerimde kullanılmak üzere ödeme kuruluşu PayNKolay (Nkolay Ödeme Kuruluşu A.Ş.) nezdinde saklanmasını istiyorum. ' +
    "Kart numaram ve güvenlik kodum Buaze'ye iletilmez ve Buaze'de tutulmaz. " +
    'Kartımı Hesabım → Plan ve faturalama sayfasından istediğim zaman silebilirim.',
  en:
    'I want my card to be stored by the payment institution PayNKolay (Nkolay Ödeme Kuruluşu A.Ş.) for my future payments. ' +
    'My card number and security code are not sent to or kept by Buaze. ' +
    'I can delete my card at any time under Account → Plan & billing.',
};

/** The card-save consent text (§13.2), NFC. */
export function cardSaveConsentText(locale: BillingLocale): string {
  return CARD_SAVE_TEXT[locale === 'en' ? 'en' : 'tr'].normalize('NFC');
}

/** sha256 hex of the NFC-normalised text. */
export function consentTextHash(text: string): string {
  return createHash('sha256').update(text.normalize('NFC'), 'utf8').digest('hex');
}

/** The card-save consent the review page shows and the checkout POST verifies. */
export function cardSaveConsent(locale: BillingLocale): { textVersion: string; text: string; textHash: string } {
  const text = cardSaveConsentText(locale);
  return { textVersion: CARD_SAVE_CONSENT_VERSION, text, textHash: consentTextHash(text) };
}

/** Legal documents a billing consent refers to (LegalDocument CMS keys). */
export const BILLING_LEGAL_DOC_KEYS = ['mesafeli-hizmet-sozlesmesi', 'iade-iptal-politikasi'] as const;
const LEGAL_KEYS = BILLING_LEGAL_DOC_KEYS;

/**
 * Published revision labels of the distance service agreement and the
 * refund policy, e.g. `{ "mesafeli-hizmet-sozlesmesi": "v3" }`. A document
 * that is not published in the CMS reads "default" (the code template).
 * Never throws: evidence is better with "unknown" than a failed payment.
 */
export async function currentLegalDocVersions(
  db: Pick<PrismaClient, 'legalDocument'>,
  locale: BillingLocale,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const key of LEGAL_KEYS) out[key] = 'default';
  try {
    const rows = await db.legalDocument.findMany({
      where: { key: { in: [...LEGAL_KEYS] }, locale, isActive: true },
      select: { key: true, version: true },
    });
    for (const row of rows) out[row.key] = `v${row.version}`;
  } catch {
    for (const key of LEGAL_KEYS) out[key] = 'unknown';
  }
  return out;
}

const DAY_MS = 24 * 60 * 60_000;
const CONSENT_IP_RETENTION_MS = 540 * DAY_MS;

export type ConsentWriter = Pick<PrismaClient, 'billingConsent'> | Pick<Prisma.TransactionClient, 'billingConsent'>;

export type ConsentRowInput = Omit<Prisma.BillingConsentUncheckedCreateInput, 'id' | 'createdAt'>;

/**
 * Writes one consent row. For kinds with text, `textRendered` is stored as
 * NFC and `textHash` must equal its hash (computed when omitted; a mismatch
 * throws — the caller verified the owner's hash against the server text).
 * The user agent loses digit runs ≥ 12 (a PAN can never be stored by
 * accident); `ipPurgeAfter` = now + 540 days unless given.
 */
export async function recordConsent(db: ConsentWriter, row: ConsentRowInput, now: Date = new Date()): Promise<{ id: string }> {
  let textRendered = row.textRendered ?? null;
  let textHash = row.textHash ?? null;
  if (textRendered) {
    textRendered = textRendered.normalize('NFC');
    const computed = consentTextHash(textRendered);
    if (textHash && textHash !== computed) throw new Error('consent: text hash mismatch');
    textHash = computed;
  }
  return db.billingConsent.create({
    data: {
      ...row,
      textRendered,
      textHash,
      ipAddress: row.ipAddress ? String(row.ipAddress).slice(0, 45) : null,
      userAgent: stripDigitRuns(row.userAgent ?? null, 255),
      ipPurgeAfter: row.ipPurgeAfter ?? new Date(now.getTime() + CONSENT_IP_RETENTION_MS),
    },
    select: { id: true },
  });
}
