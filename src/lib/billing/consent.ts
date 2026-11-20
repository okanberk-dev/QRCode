import { createHash } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { BillingLocale } from './billing-format';
import { nextWindowSlot, RENEWAL_POLICY } from './renewal-policy';
import { stripDigitRuns } from './renewal-store-prisma';

/**
 * Consent evidence (billing spec §6.1 `consent.ts`, §13.2, §4.4). Every
 * consent row is append-only evidence: the exact NFC text the owner saw
 * (`textRendered`), its SHA-256 (`textHash`, re-verifiable from the text),
 * the text version, the legal document revisions it refers to, how the owner
 * authenticated, the trusted client IP and the user agent (digit runs ≥ 12
 * stripped; IP kept until `ipPurgeAfter` = now + 540 days, §4.4).
 *
 * Two texts: the card-save consent (`card_save`, shown on the review page
 * before a 3D Secure payment that saves the card) and the auto-renew
 * instruction (`auto_renew_on`, given in the panel after step-up, §8.3).
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

// ── Auto-renew instruction (§13.3) ─────────────────────────────────────────

export const AUTO_RENEW_CONSENT_VERSION = 'ar-2026-12-v1';

export interface AutoRenewTerms {
  version: string;
  locale: BillingLocale;
  planId: string;
  planName: string;
  amountMinor: number;
  cycle: 'monthly';
  /** ISO instant; the first charge is never before it (D4). */
  firstChargeDate: string;
  last4: string | null;
  noticeHours: 72;
  retryGapHours: 48;
  graceHours: 120;
  maxAttempts: 3;
  /** Published revisions of the legal documents the text refers to. */
  legalDocVersions: Record<string, string>;
}

const TRY_FORMAT: Record<BillingLocale, Intl.NumberFormat> = {
  tr: new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 }),
  en: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 }),
};
const DATE_FORMAT: Record<BillingLocale, Intl.DateTimeFormat> = {
  tr: new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric' }),
  en: new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric' }),
};

/**
 * The exact instruction text (§13.3), rendered from the terms: amount, plan,
 * first charge date (Europe/Istanbul), card, the 72 h notice, the retry and
 * grace rules, one-click off, the in-flight refund rule and the legal
 * document revisions. NFC. The same text is shown in the panel modal, stored
 * verbatim with its hash, and repeated in the `on` mail.
 */
export function autoRenewConsentText(terms: AutoRenewTerms): string {
  const tr = terms.locale !== 'en';
  const loc: BillingLocale = tr ? 'tr' : 'en';
  const amount = TRY_FORMAT[loc].format(terms.amountMinor / 100);
  const date = DATE_FORMAT[loc].format(new Date(terms.firstChargeDate));
  const last4 = terms.last4 ?? '????';
  const mesafeli = terms.legalDocVersions['mesafeli-hizmet-sozlesmesi'] ?? 'default';
  const iade = terms.legalDocVersions['iade-iptal-politikasi'] ?? 'default';
  const lines = tr
    ? [
        'Otomatik yenileme talimatı',
        `${terms.planName} paketimin, ${date} tarihinden başlayarak her ay ${amount} (KDV dahil) tutarında, PayNKolay'de kayıtlı kartımdan (${last4} ile biten kart; kartımı Hesabım'dan değiştirirsem yeni kartımdan) otomatik olarak yenilenmesini istiyorum. Bu talimatla her ay ${amount} ödeme yükümlülüğü altına girdiğimi kabul ediyorum.`,
        '• Çekim her dönemin bitiminde ya da sonrasında yapılır, hiçbir zaman öncesinde yapılmaz.',
        '• Her çekimden en az 3 gün (72 saat) önce çekim tarihini, tutarı ve kartı bildiren bir e-posta alırım; bu e-posta bana ulaşmadan çekim yapılmaz.',
        '• Fiyat artarsa yeni onayım alınmadan çekim yapılmaz.',
        "• Çekim başarısız olursa en fazla 2 kez daha, 2'şer gün arayla ve bildirim e-postasında yazan tarihlerde yeniden denenir; dönem bitiminden sonraki 5 gün boyunca hizmeti kullanmaya devam ederim.",
        '• Otomatik yenilemeyi Hesabım → Plan ve faturalama sayfasından ya da e-postalardaki bağlantıdan istediğim an tek tıkla kapatabilirim. Dönem bitmeden kapatırsam o dönem için hiçbir çekim yapılmaz ve hizmet ödediğim dönemin sonuna kadar sürer. Kapattığım anda işlenmekte olan bir çekim gerçekleşirse iade edilir.',
        `• Bu talimat Mesafeli Hizmet Sözleşmesi'nin (${mesafeli}) ve İade ve İptal Politikası'nın (${iade}) parçasıdır.`,
      ]
    : [
        'Auto-renew instruction',
        `I want my ${terms.planName} plan to renew automatically every month for ${amount} (VAT included), starting on ${date}, from my card stored by PayNKolay (the card ending ${last4}; if I replace it under Account, my new card). With this instruction I accept the obligation to pay ${amount} every month.`,
        '• A charge is made at or after the end of each period, never before.',
        '• At least 3 days (72 hours) before every charge I receive an email stating the charge date, the amount and the card; no charge is made before that email has reached me.',
        '• If the price goes up, nothing is charged without my new consent.',
        '• If a charge fails it is retried at most twice more, two days apart, on the dates given in the notice email, and I keep using the service for 5 days after the period end.',
        '• I can turn auto-renew off with one click anytime under Account → Plan & billing or through the link in the emails. If I turn it off before the period ends, nothing is charged for that period and the service continues until the end of the period I paid for. If a charge is being processed at the moment I turn it off and it goes through, it is refunded.',
        `• This instruction is part of the Distance Service Agreement (${mesafeli}) and the Refund and Cancellation Policy (${iade}).`,
      ];
  return lines.join('\n').normalize('NFC');
}

export interface AutoRenewOffer {
  textVersion: string;
  text: string;
  textHash: string;
  terms: AutoRenewTerms;
  cardHandle: string;
}

const HOUR_MS = 60 * 60_000;

/**
 * The server's offer for the panel enable path (§8.3 step 4). The first
 * charge is the first window slot at or after max(E, now + 72 h): never
 * before the period end (D4) and never sooner than the 72 h notice the text
 * promises (D5) — so the date shown can always be honoured.
 */
export function buildAutoRenewOffer(
  input: {
    plan: { id: string; name: string };
    amountMinor: number;
    renewsAt: Date;
    card: { handle: string; last4: string | null };
    legalDocVersions: Record<string, string>;
  },
  locale: BillingLocale,
  now: Date,
): AutoRenewOffer {
  const first = nextWindowSlot(new Date(Math.max(input.renewsAt.getTime(), now.getTime() + RENEWAL_POLICY.minNoticeHours * HOUR_MS)));
  const terms: AutoRenewTerms = {
    version: AUTO_RENEW_CONSENT_VERSION,
    locale: locale === 'en' ? 'en' : 'tr',
    planId: input.plan.id,
    planName: input.plan.name,
    amountMinor: input.amountMinor,
    cycle: 'monthly',
    firstChargeDate: first.toISOString(),
    last4: input.card.last4,
    noticeHours: 72,
    retryGapHours: 48,
    graceHours: 120,
    maxAttempts: 3,
    legalDocVersions: { ...input.legalDocVersions },
  };
  const text = autoRenewConsentText(terms);
  return { textVersion: AUTO_RENEW_CONSENT_VERSION, text, textHash: consentTextHash(text), terms, cardHandle: input.card.handle };
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
