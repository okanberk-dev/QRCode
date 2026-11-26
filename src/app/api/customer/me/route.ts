// Signed-in customer profile (CLAUDE.md §61): read, edit, delete.
import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validateBody } from '@/lib/api/validate';
import { isValidEmail } from '@/lib/validations';
import { isValidBirthday, normalizePhone } from '@/lib/loyalty';
import { moderateText } from '@/lib/loyalty-moderation';
import {
  CUSTOMER_SELECT,
  clearCustomerCookie,
  getCustomerFromRequest,
  toCustomerDto,
  verifyPassword,
} from '@/lib/customer-auth';
import {
  cleanName,
  deleteCustomerAccount,
  listCustomerCards,
  sendCustomerVerifyEmail,
  syncLinkedCards,
} from '@/lib/customer-account';
import { recordConsentBatch } from '@/lib/legal/consent';
import { getClientIp } from '@/lib/rate-limit';
import { accountErrorResponse, fail, limited } from '@/lib/customer-route';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function GET(req: NextRequest) {
  const account = await getCustomerFromRequest(req);
  if (!account) return NextResponse.json({ account: null }, { headers: NO_STORE });
  const cards = await listCustomerCards(account.id);
  return NextResponse.json({ account: toCustomerDto(account), cards }, { headers: NO_STORE });
}

const Patch = z
  .object({
    firstName: z.string().max(80).optional(),
    lastName: z.string().max(80).optional(),
    email: z.string().trim().max(160).optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    birthMonth: z.number().int().min(1).max(12).nullable().optional(),
    birthDay: z.number().int().min(1).max(31).nullable().optional(),
    marketingConsent: z.boolean().optional(),
    locale: z.enum(['tr', 'en']).optional(),
    /** Needed to change the e-mail of an account that has a password. */
    currentPassword: z.string().max(200).optional(),
  })
  .strict();

export async function PATCH(req: NextRequest) {
  const account = await getCustomerFromRequest(req);
  if (!account) return fail('UNAUTHORIZED', 401);
  const rl = await limited(`customer-me:${account.id}`, 20, 10 * 60_000);
  if (rl) return rl;
  const parsed = validateBody<z.infer<typeof Patch>>(Patch, await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;

  const data: Record<string, unknown> = {};
  if (d.firstName !== undefined || d.lastName !== undefined) {
    const firstName = cleanName(d.firstName ?? account.firstName);
    const lastName = cleanName(d.lastName ?? account.lastName);
    if (!firstName || !lastName) return fail('NAME_REQUIRED');
    if (moderateText(`${firstName} ${lastName}`)) return fail('CONTENT_BLOCKED', 422);
    data.firstName = firstName;
    data.lastName = lastName;
  }
  if (d.phone !== undefined) {
    const phone = d.phone ? normalizePhone(d.phone) : null;
    if (d.phone && !phone) return fail('INVALID_PHONE');
    data.phone = phone;
  }
  if (d.birthMonth !== undefined || d.birthDay !== undefined) {
    const m = d.birthMonth ?? null;
    const day = d.birthDay ?? null;
    if ((m == null) !== (day == null)) return fail('INVALID_BIRTHDAY');
    if (m != null && !isValidBirthday(m, day)) return fail('INVALID_BIRTHDAY');
    data.birthMonth = m;
    data.birthDay = day;
  }
  if (d.locale) data.locale = d.locale;
  let emailChanged = false;
  if (d.email !== undefined) {
    const email = d.email.toLowerCase();
    if (!isValidEmail(email)) return fail('INVALID_EMAIL');
    if (email !== account.email) {
      // A stolen cookie must not be enough to take the account over.
      if (account.passwordHash && !(await verifyPassword(d.currentPassword ?? '', account.passwordHash))) {
        return fail('WRONG_PASSWORD', 403);
      }
      data.email = email;
      data.emailVerifiedAt = null;
      emailChanged = true;
    }
  }
  const marketingChanged = d.marketingConsent !== undefined && d.marketingConsent !== account.marketingConsent;
  if (d.marketingConsent !== undefined) data.marketingConsent = d.marketingConsent;

  let updated;
  try {
    updated = await prisma.customerAccount.update({ where: { id: account.id }, data, select: CUSTOMER_SELECT });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') return fail('EMAIL_TAKEN', 409);
    return accountErrorResponse(err);
  }
  const ip = getClientIp(req.headers);
  const ua = req.headers.get('user-agent');
  after(async () => {
    await syncLinkedCards(updated);
    if (marketingChanged) {
      await recordConsentBatch(
        {
          locale: updated.locale === 'en' ? 'en' : 'tr',
          subjectType: 'customer_account',
          subjectId: updated.id,
          source: 'customer_register',
          ipAddress: ip,
          userAgent: ua,
        },
        [{ key: 'ticari-ileti', granted: updated.marketingConsent }],
      );
    }
    if (emailChanged) await sendCustomerVerifyEmail(updated);
  });
  return NextResponse.json({ ok: true, account: toCustomerDto(updated) }, { headers: NO_STORE });
}

const Delete = z
  .object({
    /** Also delete every loyalty card linked to the account. */
    deleteCards: z.boolean().default(false),
    currentPassword: z.string().max(200).optional(),
    confirm: z.literal('SIL').or(z.literal('DELETE')),
  })
  .strict();

export async function DELETE(req: NextRequest) {
  const account = await getCustomerFromRequest(req);
  if (!account) return fail('UNAUTHORIZED', 401);
  const rl = await limited(`customer-delete:${account.id}`, 5, 10 * 60_000);
  if (rl) return rl;
  const parsed = validateBody<z.infer<typeof Delete>>(Delete, await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  if (account.passwordHash && !(await verifyPassword(parsed.data.currentPassword ?? '', account.passwordHash))) {
    return fail('WRONG_PASSWORD', 403);
  }
  const result = await deleteCustomerAccount(account.id, parsed.data.deleteCards);
  const res = NextResponse.json({ ok: true, deletedCards: result.cards }, { headers: NO_STORE });
  clearCustomerCookie(res);
  return res;
}
