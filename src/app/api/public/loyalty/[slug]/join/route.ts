// Customer joins a loyalty program (CLAUDE.md §60, §61). Public, rate
// limited, honeypot. Two ways in: as a guest (first + last name, phone) or
// with the signed-in Buaze customer account (`useAccount`), which fills the
// card from the profile and keeps it in "Kartlarım". A phone already in the
// program never reveals that card: the link is mailed to the address on
// file (if any) and the customer is told to ask at the counter otherwise.
import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validate';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { isCrossSiteRequest } from '@/lib/request-origin';
import { isValidEmail } from '@/lib/validations';
import { prisma } from '@/lib/prisma';
import { recordConsentBatch } from '@/lib/legal/consent';
import { getCustomerFromRequest, type CustomerSessionAccount } from '@/lib/customer-auth';
import { cleanName } from '@/lib/customer-account';
import {
  activeRewards,
  isValidBirthday,
  LOYALTY_LIMITS,
  loyaltyCardPath,
  normalizeKind,
  normalizePhone,
  rewardRuleLine,
} from '@/lib/loyalty';
import {
  createLoyaltyMember,
  LoyaltyError,
  loadPublicLoyaltyProgram,
  loyaltyPublicBaseUrl,
  type PublicLoyaltyProgram,
} from '@/lib/loyalty-server';
import { moderateText } from '@/lib/loyalty-moderation';
import { setCardCookie } from '@/lib/loyalty-device';

export const dynamic = 'force-dynamic';

const Body = z
  .object({
    firstName: z.string().trim().max(LOYALTY_LIMITS.memberNameMax).optional(),
    lastName: z.string().trim().max(LOYALTY_LIMITS.memberNameMax).optional(),
    phone: z.string().trim().max(30).optional().nullable(),
    /** Join with the signed-in customer account (§61). */
    useAccount: z.boolean().optional().default(false),
    /** Where the customer came from: printed QR, NFC sticker or a shared link. */
    source: z.enum(['qr', 'nfc', 'link']).optional().default('qr'),
    email: z.string().trim().max(160).optional().nullable(),
    birthMonth: z.number().int().min(1).max(12).optional().nullable(),
    birthDay: z.number().int().min(1).max(31).optional().nullable(),
    consent: z.literal(true),
    marketingConsent: z.boolean().optional().default(false),
    locale: z.enum(['tr', 'en']).optional().default('tr'),
    // Honeypot: real people never see this field.
    website: z.string().max(200).optional(),
  })
  .strict();

async function mailCard(args: {
  program: PublicLoyaltyProgram;
  to: string;
  name: string | null;
  token: string;
  locale: 'tr' | 'en';
  resend: boolean;
}) {
  const [{ renderLoyaltyCardMail }, { sendResendEmail }] = await Promise.all([
    import('@/lib/email/templates/loyalty-card'),
    import('@/lib/email-internal'),
  ]);
  const kind = normalizeKind(args.program.kind);
  const rendered = renderLoyaltyCardMail(
    {
      businessName: args.program.restaurant.name,
      programName: args.program.name,
      customerName: args.name?.split(/\s+/)[0] ?? null,
      cardUrl: `${loyaltyPublicBaseUrl()}${loyaltyCardPath(args.program.slug, args.token)}`,
      rewardLines: activeRewards(args.program.rewards).map((r) => rewardRuleLine(kind, r, args.locale)),
      resend: args.resend,
    },
    args.locale,
  );
  await sendResendEmail({
    to: args.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    template: 'loyalty-card',
    locale: args.locale,
    logMetadata: { programId: args.program.id, resend: args.resend ? 1 : 0 },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (isCrossSiteRequest(req.headers)) return NextResponse.json({ error: 'forbidden', code: 'FORBIDDEN' }, { status: 403 });
  const ip = getClientIp(req.headers);
  // Café Wi-Fi and mobile carriers put many customers behind one IP: the IP
  // limit only stops floods; the per-phone and per-program limits below stop
  // probing and spam.
  const ipLimit = await rateLimit(`loyalty-join:ip:${ip}`, 30, 10 * 60_000);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: 'rate_limit', code: 'RATE_LIMIT' },
      { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof Body>>(Body, body);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  if (d.website) return NextResponse.json({ status: 'created', cardPath: null }, { status: 201 });

  const program = await loadPublicLoyaltyProgram(slug);
  if (!program) return NextResponse.json({ error: 'not_found', code: 'NOT_FOUND' }, { status: 404 });

  let account: CustomerSessionAccount | null = null;
  if (d.useAccount) {
    account = await getCustomerFromRequest(req);
    if (!account) return NextResponse.json({ error: 'SIGNED_OUT', code: 'SIGNED_OUT' }, { status: 401 });
    // The account already has a card here: open it.
    const own = await prisma.loyaltyMember.findFirst({
      where: { programId: program.id, customerAccountId: account.id },
      select: { cardToken: true },
    });
    if (own) return NextResponse.json({ status: 'own', cardPath: loyaltyCardPath(program.slug, own.cardToken) });
  }

  const firstName = cleanName(d.firstName ?? account?.firstName);
  const lastName = cleanName(d.lastName ?? account?.lastName);
  if (!firstName || !lastName) {
    return NextResponse.json({ error: 'NAME_REQUIRED', code: 'NAME_REQUIRED' }, { status: 400 });
  }
  const phone = normalizePhone(d.phone ?? account?.phone ?? '');
  if (!phone) return NextResponse.json({ error: 'INVALID_PHONE', code: 'INVALID_PHONE' }, { status: 400 });
  const [phoneLimit, programLimit] = await Promise.all([
    rateLimit(`loyalty-join:phone:${program.id}:${phone}`, 5, 60 * 60_000),
    rateLimit(`loyalty-join:program:${program.id}`, 400, 60 * 60_000),
  ]);
  if (!phoneLimit.allowed || !programLimit.allowed) {
    return NextResponse.json({ error: 'rate_limit', code: 'RATE_LIMIT' }, { status: 429 });
  }
  const email = account ? account.email : d.email ? d.email.toLowerCase() : null;
  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: 'INVALID_EMAIL', code: 'INVALID_EMAIL' }, { status: 400 });
  }
  const birthMonth = account && d.birthMonth == null ? account.birthMonth : d.birthMonth ?? null;
  const birthDay = account && d.birthDay == null ? account.birthDay : d.birthDay ?? null;
  const hasBirthday = birthMonth != null || birthDay != null;
  if (hasBirthday && !isValidBirthday(birthMonth, birthDay)) {
    return NextResponse.json({ error: 'INVALID_BIRTHDAY', code: 'INVALID_BIRTHDAY' }, { status: 400 });
  }
  if (moderateText(`${firstName} ${lastName}`)) {
    return NextResponse.json({ error: 'content_blocked', code: 'CONTENT_BLOCKED' }, { status: 422 });
  }

  try {
    const member = await createLoyaltyMember(program, {
      firstName,
      lastName,
      phone,
      email,
      birthMonth: hasBirthday ? birthMonth : null,
      birthDay: hasBirthday ? birthDay : null,
      marketingConsent: d.marketingConsent,
      joinedVia: d.source === 'nfc' ? 'nfc' : account ? 'account' : 'qr',
      customerAccountId: account?.id ?? null,
    });
    // A phone given here fills an empty account phone.
    if (account && !account.phone) {
      const acc = account;
      after(() =>
        prisma.customerAccount.update({ where: { id: acc.id }, data: { phone } }).then(() => undefined, () => undefined),
      );
    }
    after(async () => {
      await recordConsentBatch(
        {
          locale: d.locale,
          subjectType: 'loyalty_member',
          subjectId: member.id,
          source: 'loyalty_join',
          ipAddress: ip,
          userAgent: req.headers.get('user-agent'),
        },
        [
          { key: 'sadakat-uyelik-kosullari', granted: true },
          { key: 'sadakat-aydinlatma', granted: true },
          { key: 'ticari-ileti', granted: d.marketingConsent },
        ],
      );
      // Account holders find the card in "Kartlarım"; guests get the link by mail.
      if (email && !account) {
        await mailCard({ program, to: email, name: firstName, token: member.cardToken, locale: d.locale, resend: false });
      }
    });
    const created = NextResponse.json(
      { status: 'created', cardPath: loyaltyCardPath(program.slug, member.cardToken) },
      { status: 201 },
    );
    setCardCookie(created, program.slug, member.cardToken, req);
    return created;
  } catch (err) {
    if (err instanceof LoyaltyError && err.code === 'ACCOUNT_HAS_CARD' && account) {
      const own = await prisma.loyaltyMember.findFirst({
        where: { programId: program.id, customerAccountId: account.id },
        select: { cardToken: true },
      });
      if (own) return NextResponse.json({ status: 'own', cardPath: loyaltyCardPath(program.slug, own.cardToken) });
    }
    if (err instanceof LoyaltyError && err.code === 'PHONE_EXISTS') {
      const existing = await prisma.loyaltyMember.findUnique({
        where: { programId_phone: { programId: program.id, phone } },
        select: { id: true, email: true, name: true, cardToken: true, customerAccountId: true },
      });
      // Same verified e-mail as the signed-in account: it is their own old card.
      if (
        account &&
        existing &&
        !existing.customerAccountId &&
        account.emailVerifiedAt &&
        existing.email?.toLowerCase() === account.email
      ) {
        const linked = await prisma.loyaltyMember
          .updateMany({ where: { id: existing.id, customerAccountId: null }, data: { customerAccountId: account.id } })
          .catch(() => ({ count: 0 }));
        if (linked.count > 0) {
          return NextResponse.json({ status: 'own', cardPath: loyaltyCardPath(program.slug, existing.cardToken) });
        }
      }
      let emailSent = false;
      if (existing?.email) {
        // One reminder per card per 10 minutes, so the form cannot spam an inbox.
        const resendLimit = await rateLimit(`loyalty-resend:${existing.id}`, 1, 10 * 60_000);
        if (resendLimit.allowed) {
          emailSent = true;
          const target = existing;
          after(() =>
            mailCard({ program, to: target.email!, name: target.name, token: target.cardToken, locale: d.locale, resend: true }),
          );
        }
      }
      return NextResponse.json({ status: 'exists', emailSent });
    }
    console.error('[loyalty-join] failed', { programId: program.id, error: err instanceof Error ? err.name : 'unknown' });
    return NextResponse.json({ error: 'internal', code: 'INTERNAL' }, { status: 500 });
  }
}
