// Customer joins a loyalty program (CLAUDE.md §60). Public, rate limited,
// honeypot. A phone already in the program never reveals that card: the
// link is mailed to the address on file (if any) and the customer is told
// to ask at the counter otherwise.
import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validate';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { isValidEmail } from '@/lib/validations';
import { prisma } from '@/lib/prisma';
import { recordConsentBatch } from '@/lib/legal/consent';
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

export const dynamic = 'force-dynamic';

const Body = z
  .object({
    name: z.string().trim().min(1).max(LOYALTY_LIMITS.memberNameMax),
    phone: z.string().trim().min(7).max(30),
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
  const ip = getClientIp(req.headers);
  const ipLimit = await rateLimit(`loyalty-join:ip:${ip}`, 8, 10 * 60_000);
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

  const phone = normalizePhone(d.phone);
  if (!phone) return NextResponse.json({ error: 'INVALID_PHONE', code: 'INVALID_PHONE' }, { status: 400 });
  const email = d.email ? d.email.toLowerCase() : null;
  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: 'INVALID_EMAIL', code: 'INVALID_EMAIL' }, { status: 400 });
  }
  const hasBirthday = d.birthMonth != null || d.birthDay != null;
  if (hasBirthday && !isValidBirthday(d.birthMonth, d.birthDay)) {
    return NextResponse.json({ error: 'INVALID_BIRTHDAY', code: 'INVALID_BIRTHDAY' }, { status: 400 });
  }
  if (moderateText(d.name)) {
    return NextResponse.json({ error: 'content_blocked', code: 'CONTENT_BLOCKED' }, { status: 422 });
  }

  try {
    const member = await createLoyaltyMember(program, {
      name: d.name,
      phone,
      email,
      birthMonth: hasBirthday ? d.birthMonth ?? null : null,
      birthDay: hasBirthday ? d.birthDay ?? null : null,
      marketingConsent: d.marketingConsent,
      joinedVia: 'qr',
    });
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
          { key: 'kvkk-aydinlatma', granted: true },
          { key: 'ticari-ileti', granted: d.marketingConsent },
        ],
      );
      if (email) await mailCard({ program, to: email, name: d.name, token: member.cardToken, locale: d.locale, resend: false });
    });
    return NextResponse.json(
      { status: 'created', cardPath: loyaltyCardPath(program.slug, member.cardToken) },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof LoyaltyError && err.code === 'PHONE_EXISTS') {
      const existing = await prisma.loyaltyMember.findUnique({
        where: { programId_phone: { programId: program.id, phone } },
        select: { id: true, email: true, name: true, cardToken: true },
      });
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
