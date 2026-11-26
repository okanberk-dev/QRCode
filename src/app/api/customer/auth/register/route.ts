// Customer sign-up with e-mail and password (CLAUDE.md §61).
import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validate';
import { getClientIp } from '@/lib/rate-limit';
import { isValidEmail } from '@/lib/validations';
import { isValidBirthday, normalizePhone } from '@/lib/loyalty';
import { moderateText } from '@/lib/loyalty-moderation';
import { hashPassword, isAcceptablePassword, setCustomerCookie, signCustomerSession, toCustomerDto } from '@/lib/customer-auth';
import {
  cleanName,
  createCustomerAccount,
  recordAccountConsents,
  sendCustomerVerifyEmail,
} from '@/lib/customer-account';
import { accountErrorResponse, fail, limited } from '@/lib/customer-route';

export const dynamic = 'force-dynamic';

const Body = z
  .object({
    firstName: z.string().max(80),
    lastName: z.string().max(80),
    email: z.string().trim().max(160),
    phone: z.string().trim().max(30).optional().nullable(),
    password: z.string().max(200),
    birthMonth: z.number().int().min(1).max(12).optional().nullable(),
    birthDay: z.number().int().min(1).max(31).optional().nullable(),
    consentTerms: z.literal(true),
    consentPrivacy: z.literal(true),
    marketingConsent: z.boolean().optional().default(false),
    locale: z.enum(['tr', 'en']).optional().default('tr'),
    website: z.string().max(200).optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = await limited(`customer-register:ip:${ip}`, 5, 10 * 60_000);
  if (rl) return rl;

  const parsed = validateBody<z.infer<typeof Body>>(Body, await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  if (d.website) return NextResponse.json({ ok: true });

  const firstName = cleanName(d.firstName);
  const lastName = cleanName(d.lastName);
  if (!firstName || !lastName) return fail('NAME_REQUIRED');
  if (moderateText(`${firstName} ${lastName}`)) return fail('CONTENT_BLOCKED', 422);
  const email = d.email.toLowerCase();
  if (!isValidEmail(email)) return fail('INVALID_EMAIL');
  if (!isAcceptablePassword(d.password)) return fail('WEAK_PASSWORD');
  const phone = d.phone ? normalizePhone(d.phone) : null;
  if (d.phone && !phone) return fail('INVALID_PHONE');
  const hasBirthday = d.birthMonth != null || d.birthDay != null;
  if (hasBirthday && !isValidBirthday(d.birthMonth, d.birthDay)) return fail('INVALID_BIRTHDAY');

  try {
    const account = await createCustomerAccount({
      email,
      firstName,
      lastName,
      phone,
      birthMonth: hasBirthday ? d.birthMonth ?? null : null,
      birthDay: hasBirthday ? d.birthDay ?? null : null,
      marketingConsent: d.marketingConsent,
      locale: d.locale,
      passwordHash: await hashPassword(d.password),
    });
    after(async () => {
      await recordAccountConsents(account, {
        locale: d.locale,
        source: 'customer_register',
        ip,
        userAgent: req.headers.get('user-agent'),
      });
      await sendCustomerVerifyEmail(account);
    });
    const res = NextResponse.json({ ok: true, account: toCustomerDto(account) }, { status: 201 });
    setCustomerCookie(res, await signCustomerSession(account), req);
    return res;
  } catch (err) {
    return accountErrorResponse(err);
  }
}
