// Customer sign-in / sign-up with Google (Firebase ID token, CLAUDE.md §61).
// Known Google account or a verified e-mail that already has an account →
// signed in. New customer → 409 SIGNUP_REQUIRED with Google's name and
// e-mail, the page shows the consent form and calls again with consents.
import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validateBody } from '@/lib/api/validate';
import { getClientIp } from '@/lib/rate-limit';
import { verifyFirebaseIdToken } from '@/lib/firebase-admin';
import { isValidBirthday, normalizePhone } from '@/lib/loyalty';
import { splitName } from '@/lib/loyalty-portal';
import { moderateText } from '@/lib/loyalty-moderation';
import { CUSTOMER_SELECT, setCustomerCookie, signCustomerSession, toCustomerDto } from '@/lib/customer-auth';
import { cleanName, createCustomerAccount, recordAccountConsents } from '@/lib/customer-account';
import { accountErrorResponse, fail, limited } from '@/lib/customer-route';

export const dynamic = 'force-dynamic';

const Body = z
  .object({
    idToken: z.string().min(20).max(5000),
    consentTerms: z.boolean().optional(),
    consentPrivacy: z.boolean().optional(),
    marketingConsent: z.boolean().optional().default(false),
    firstName: z.string().max(80).optional(),
    lastName: z.string().max(80).optional(),
    phone: z.string().trim().max(30).optional().nullable(),
    birthMonth: z.number().int().min(1).max(12).optional().nullable(),
    birthDay: z.number().int().min(1).max(31).optional().nullable(),
    locale: z.enum(['tr', 'en']).optional().default('tr'),
  })
  .strict();

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = await limited(`customer-google:ip:${ip}`, 20, 10 * 60_000);
  if (rl) return rl;
  const parsed = validateBody<z.infer<typeof Body>>(Body, await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;

  const claims = await verifyFirebaseIdToken(d.idToken);
  if (!claims) return fail('GOOGLE_TOKEN_INVALID', 401);
  const email = claims.email?.toLowerCase() ?? null;
  if (!email || claims.email_verified !== true) return fail('GOOGLE_EMAIL_UNVERIFIED', 400);

  let account = await prisma.customerAccount.findUnique({ where: { googleUid: claims.sub }, select: CUSTOMER_SELECT });
  if (!account) {
    const byEmail = await prisma.customerAccount.findUnique({ where: { email }, select: CUSTOMER_SELECT });
    if (byEmail) {
      // Google verified this address: link it to the existing account.
      account = await prisma.customerAccount.update({
        where: { id: byEmail.id },
        data: { googleUid: claims.sub, emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date() },
        select: CUSTOMER_SELECT,
      });
    }
  }

  if (!account) {
    const fromGoogle = splitName(claims.name ?? '');
    if (d.consentTerms !== true || d.consentPrivacy !== true) {
      return NextResponse.json(
        {
          error: 'SIGNUP_REQUIRED',
          code: 'SIGNUP_REQUIRED',
          profile: { email, firstName: fromGoogle.firstName ?? '', lastName: fromGoogle.lastName ?? '' },
        },
        { status: 409 },
      );
    }
    const firstName = cleanName(d.firstName ?? fromGoogle.firstName);
    const lastName = cleanName(d.lastName ?? fromGoogle.lastName);
    if (!firstName || !lastName) return fail('NAME_REQUIRED');
    if (moderateText(`${firstName} ${lastName}`)) return fail('CONTENT_BLOCKED', 422);
    const phone = d.phone ? normalizePhone(d.phone) : null;
    if (d.phone && !phone) return fail('INVALID_PHONE');
    const hasBirthday = d.birthMonth != null || d.birthDay != null;
    if (hasBirthday && !isValidBirthday(d.birthMonth, d.birthDay)) return fail('INVALID_BIRTHDAY');
    try {
      const created = await createCustomerAccount({
        email,
        firstName,
        lastName,
        phone,
        birthMonth: hasBirthday ? d.birthMonth ?? null : null,
        birthDay: hasBirthday ? d.birthDay ?? null : null,
        marketingConsent: d.marketingConsent,
        locale: d.locale,
        googleUid: claims.sub,
        emailVerified: true,
      });
      after(() =>
        recordAccountConsents(created, { locale: d.locale, source: 'customer_google', ip, userAgent: req.headers.get('user-agent') }),
      );
      const res = NextResponse.json({ ok: true, created: true, account: toCustomerDto(created) }, { status: 201 });
      setCustomerCookie(res, await signCustomerSession(created), req);
      return res;
    } catch (err) {
      return accountErrorResponse(err);
    }
  }

  await prisma.customerAccount.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } });
  const res = NextResponse.json({ ok: true, created: false, account: toCustomerDto(account) });
  setCustomerCookie(res, await signCustomerSession(account), req);
  return res;
}
