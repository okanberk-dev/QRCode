/**
 * Buaze customer account operations (CLAUDE.md §61): create, cards, linking
 * a card, profile sync to linked cards, deletion, account e-mails.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/loyalty';
import { joinName } from '@/lib/loyalty-portal';
import { loyaltyPublicBaseUrl } from '@/lib/loyalty-server';
import { recordConsentBatch } from '@/lib/legal/consent';
import {
  CUSTOMER_SELECT,
  customerLogRef,
  signResetToken,
  signVerifyToken,
  type CustomerSessionAccount,
} from '@/lib/customer-auth';

export const NAME_MAX = 40;

export class CustomerAccountError extends Error {
  code: string;
  status: number;
  constructor(code: string, status = 400) {
    super(code);
    this.name = 'CustomerAccountError';
    this.code = code;
    this.status = status;
  }
}

export function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  return v || null;
}

export interface NewAccountInput {
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  birthMonth: number | null;
  birthDay: number | null;
  marketingConsent: boolean;
  locale: 'tr' | 'en';
  passwordHash?: string | null;
  googleUid?: string | null;
  emailVerified?: boolean;
}

export async function createCustomerAccount(input: NewAccountInput): Promise<CustomerSessionAccount> {
  try {
    return await prisma.customerAccount.create({
      data: {
        email: input.email.toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        birthMonth: input.birthMonth,
        birthDay: input.birthDay,
        marketingConsent: input.marketingConsent,
        locale: input.locale,
        passwordHash: input.passwordHash ?? null,
        googleUid: input.googleUid ?? null,
        emailVerifiedAt: input.emailVerified ? new Date() : null,
        lastLoginAt: new Date(),
      },
      select: CUSTOMER_SELECT,
    });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') throw new CustomerAccountError('EMAIL_TAKEN', 409);
    throw err;
  }
}

/** Consents given at sign-up: account terms + privacy notice (+ marketing). */
export async function recordAccountConsents(
  account: { id: string; marketingConsent: boolean },
  meta: { locale: 'tr' | 'en'; source: 'customer_register' | 'customer_google'; ip: string | null; userAgent: string | null },
): Promise<void> {
  await recordConsentBatch(
    {
      locale: meta.locale,
      subjectType: 'customer_account',
      subjectId: account.id,
      source: meta.source,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    },
    [
      { key: 'musteri-hesabi-kosullari', granted: true },
      { key: 'musteri-hesabi-aydinlatma', granted: true },
      { key: 'ticari-ileti', granted: account.marketingConsent },
    ],
  );
}

// ─── cards ────────────────────────────────────────────────────────────────

export async function listCustomerCards(accountId: string) {
  const rows = await prisma.loyaltyMember.findMany({
    where: { customerAccountId: accountId },
    orderBy: [{ lastVisitAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    select: {
      id: true,
      cardToken: true,
      code: true,
      balance: true,
      visits: true,
      lastVisitAt: true,
      program: {
        select: {
          slug: true,
          name: true,
          kind: true,
          accentColor: true,
          isActive: true,
          portal: true,
          rewards: {
            where: { isActive: true },
            orderBy: { cost: 'asc' },
            select: { id: true, title: true, cost: true },
          },
          restaurant: { select: { name: true, isActive: true, loyaltyEnabled: true } },
        },
      },
    },
    take: 100,
  });
  return rows.map((r) => ({
    id: r.id,
    cardPath: `/l/${r.program.slug}/k/${r.cardToken}`,
    portalPath: `/l/${r.program.slug}`,
    code: r.code,
    balance: r.balance,
    visits: r.visits,
    lastVisitAt: r.lastVisitAt?.toISOString() ?? null,
    available: r.program.isActive && r.program.restaurant.isActive && r.program.restaurant.loyaltyEnabled,
    program: {
      name: r.program.name,
      kind: r.program.kind === 'points' ? ('points' as const) : ('stamps' as const),
      accentColor: r.program.accentColor,
      rewards: r.program.rewards,
    },
    businessName: r.program.restaurant.name,
  }));
}
export type CustomerCard = Awaited<ReturnType<typeof listCustomerCards>>[number];

/**
 * Adds a card to the account. The card token is the proof: only whoever
 * holds the card link can claim it. A card already in another account, or
 * a second card of the same programme, is refused.
 */
export async function linkCardByToken(accountId: string, token: string): Promise<{ slug: string }> {
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) throw new CustomerAccountError('CARD_NOT_FOUND', 404);
  const card = await prisma.loyaltyMember.findUnique({
    where: { cardToken: token },
    select: { id: true, programId: true, customerAccountId: true, program: { select: { slug: true } } },
  });
  if (!card) throw new CustomerAccountError('CARD_NOT_FOUND', 404);
  if (card.customerAccountId === accountId) return { slug: card.program.slug };
  if (card.customerAccountId) throw new CustomerAccountError('CARD_IN_OTHER_ACCOUNT', 409);
  const res = await prisma.loyaltyMember
    .updateMany({ where: { id: card.id, customerAccountId: null }, data: { customerAccountId: accountId } })
    .catch((err: unknown) => {
      if ((err as { code?: string }).code === 'P2002') throw new CustomerAccountError('ACCOUNT_HAS_CARD', 409);
      throw err;
    });
  if (res.count === 0) throw new CustomerAccountError('CARD_IN_OTHER_ACCOUNT', 409);
  return { slug: card.program.slug };
}

/**
 * Profile changes flow to the cards linked to the account (the customer
 * expects the business to see the new name / e-mail). A phone already used
 * by another card of the same programme is left as it was on that card.
 */
export async function syncLinkedCards(account: CustomerSessionAccount): Promise<void> {
  await prisma.loyaltyMember.updateMany({
    where: { customerAccountId: account.id },
    data: {
      firstName: account.firstName,
      lastName: account.lastName,
      name: joinName(account.firstName, account.lastName),
      email: account.email,
      birthMonth: account.birthMonth,
      birthDay: account.birthDay,
    },
  });
  const phone = normalizePhone(account.phone ?? '');
  if (!phone) return;
  const cards = await prisma.loyaltyMember.findMany({
    where: { customerAccountId: account.id, NOT: { phone } },
    select: { id: true },
  });
  for (const c of cards) {
    await prisma.loyaltyMember.update({ where: { id: c.id }, data: { phone } }).catch(() => undefined);
  }
}

/** Deletes the account; with `deleteCards` also every linked card (KVKK). */
export async function deleteCustomerAccount(accountId: string, deleteCards: boolean): Promise<{ cards: number }> {
  return prisma.$transaction(async (tx) => {
    let cards = 0;
    if (deleteCards) {
      const res = await tx.loyaltyMember.deleteMany({ where: { customerAccountId: accountId } });
      cards = res.count;
    }
    await tx.customerAccount.delete({ where: { id: accountId } });
    return { cards };
  });
}

// ─── e-mails ──────────────────────────────────────────────────────────────

export async function sendCustomerVerifyEmail(account: Pick<CustomerSessionAccount, 'id' | 'email' | 'firstName' | 'locale'>) {
  const [{ renderCustomerVerifyMail }, { sendResendEmail }] = await Promise.all([
    import('@/lib/email/templates/customer-account'),
    import('@/lib/email-internal'),
  ]);
  const token = await signVerifyToken(account);
  const locale = account.locale === 'en' ? 'en' : 'tr';
  const url = `${loyaltyPublicBaseUrl()}/api/customer/auth/verify?token=${encodeURIComponent(token)}`;
  const r = renderCustomerVerifyMail({ firstName: account.firstName, url }, locale);
  await sendResendEmail({
    to: account.email,
    subject: r.subject,
    html: r.html,
    text: r.text,
    template: 'customer-verify',
    locale,
    logMetadata: { account: customerLogRef(account.id) },
  });
}

export async function sendCustomerResetEmail(account: Pick<CustomerSessionAccount, 'id' | 'email' | 'firstName' | 'locale' | 'tokenVersion'>) {
  const [{ renderCustomerResetMail }, { sendResendEmail }] = await Promise.all([
    import('@/lib/email/templates/customer-account'),
    import('@/lib/email-internal'),
  ]);
  const token = await signResetToken(account);
  const locale = account.locale === 'en' ? 'en' : 'tr';
  const url = `${loyaltyPublicBaseUrl()}/hesap/sifre?token=${encodeURIComponent(token)}`;
  const r = renderCustomerResetMail({ firstName: account.firstName, url }, locale);
  await sendResendEmail({
    to: account.email,
    subject: r.subject,
    html: r.html,
    text: r.text,
    template: 'customer-reset',
    locale,
    logMetadata: { account: customerLogRef(account.id) },
  });
}

/** Safe "next" path after sign-in: only our own customer / loyalty pages. */
export function safeNextPath(value: unknown): string {
  if (typeof value !== 'string') return '/hesap';
  return /^\/(hesap(\/[a-z-]*)?|l\/[a-z0-9-]{1,80}(\/k\/[A-Za-z0-9_-]{24,64})?)(\?[A-Za-z0-9=&_.-]*)?$/.test(value) ? value : '/hesap';
}

export const ACCOUNT_UPDATE_SELECT = CUSTOMER_SELECT satisfies Prisma.CustomerAccountSelect;
