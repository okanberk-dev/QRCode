import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { SITE_URL } from '@/lib/site';
import { confirmPayment, getPaynkolayConfig } from '@/lib/payment/paynkolay';
import { settlePaynkolayPayment } from '@/lib/billing/paynkolay-billing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * PayNKolay success / fail return (both URLs point here). The bank page
 * form-POSTs the outcome; the POST is a cross-site request, so no session
 * cookie arrives and nothing in it is trusted: the payment is decided by the
 * PaymentList query against our own pending row (CLAUDE.md §44).
 */
async function handle(req: NextRequest, params: Record<string, string>) {
  const ip = getClientIp(req.headers);
  const limit = await rateLimit(`paynkolay:return:${ip}`, 30, 60 * 1000);

  const paymentId = (params.CLIENT_REFERENCE_CODE || params.clientRefCode || '').trim();
  const payment = /^[A-Za-z0-9_-]{1,64}$/.test(paymentId)
    ? await prisma.billingPayment.findUnique({
        where: { id: paymentId },
        select: { id: true, amountMinor: true, createdAt: true, status: true, locale: true },
      })
    : null;
  const locale = payment?.locale === 'en' ? 'en' : 'tr';
  const back = (status: string) =>
    NextResponse.redirect(
      new URL(`/${locale}/dashboard/account?section=billing&payment=${status}`, SITE_URL),
      303,
    );

  if (!payment) return back('failed');
  if (payment.status === 'succeeded') return back('success');
  if (!limit.allowed) return back('pending');

  const cfg = getPaynkolayConfig();
  if (!cfg) return back('pending');

  try {
    const check = await confirmPayment(cfg, params, {
      clientRefCode: payment.id,
      amountMinor: payment.amountMinor,
      createdAt: payment.createdAt,
    });
    const result = await settlePaynkolayPayment(payment.id, check);
    if (result === 'failed') {
      console.warn('[paynkolay] payment not confirmed', {
        paymentId: payment.id,
        reason: check.status === 'failed' ? check.reason : 'unknown',
      });
      return back('failed');
    }
    return back('success');
  } catch (err) {
    // The POS could not be asked. Not the same as "unpaid": keep it pending.
    Sentry.captureException(err, { tags: { integration: 'paynkolay', step: 'confirm' } });
    return back('pending');
  }
}

export async function POST(req: NextRequest) {
  const params: Record<string, string> = {};
  try {
    const form = await req.formData();
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') params[key] = value;
    }
  } catch {
    /* empty body → treated as an unknown payment */
  }
  return handle(req, params);
}

export async function GET(req: NextRequest) {
  return handle(req, Object.fromEntries(req.nextUrl.searchParams.entries()));
}
