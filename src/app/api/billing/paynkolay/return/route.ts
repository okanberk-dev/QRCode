import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { SITE_URL } from '@/lib/site';
import { getTrustedClientIp } from '@/lib/client-ip';
import { confirmCharge, confirmPayment, getPaynkolayConfig } from '@/lib/payment/paynkolay';
import { fetchTransport } from '@/lib/payment/paynkolay-transport';
import { loadHostedPaymentEnvCheck } from '@/lib/billing/flags';
import { applyPostSettleEffects, settlePaynkolayPayment } from '@/lib/billing/paynkolay-billing';
import { billingLog, safeError } from '@/lib/billing/redact';
import { prismaRenewalStore } from '@/lib/billing/renewal-store-prisma';
import {
  isOwnerLapsed,
  paymentResultPath,
  readReturnGet,
  readReturnPost,
  resultForDecision,
  resultForSettle,
  returnEnvGate,
  type PaymentResultStatus,
  type ReturnInput,
} from '@/lib/billing/return-flow';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * PayNKolay success / fail return (both URLs point here; billing spec §8.6).
 * The bank page form-POSTs the outcome; it is a cross-site request, so no
 * session cookie arrives and nothing in it is trusted: the payment is decided
 * by PaymentList for our own pending row (`decidePayment`, §7.3). The route
 * reads only the payment id, the REFERENCE_CODE tie-breaker and the fields of
 * the log-only hash check; it never logs the URL or the body and never passes
 * them to Sentry. A GET always ends in a 303, so provider parameters never
 * stay in the address bar.
 */

const store = prismaRenewalStore;
const postSettleDeps = { db: prisma, store, now: () => new Date() };

function noStoreRedirect(path: string): NextResponse {
  const res = NextResponse.redirect(new URL(path, SITE_URL), 303);
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
}

/** Answer to PayNKolay's server-to-server post of a merchant-initiated result (no browser involved). */
function okText(): NextResponse {
  return new NextResponse('ok', { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}

async function ownerLapsed(userId: string): Promise<boolean> {
  if (userId.startsWith('del_')) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true, trialEndsAt: true } });
  return isOwnerLapsed(user, new Date());
}

/** Releases the owner_paying lock (D19) of a renewal this payment was paying. */
async function releaseOwnerLock(payment: { id: string; renewalId: string | null }): Promise<void> {
  const renewal = await store.renewalForPayment(payment);
  if (renewal?.state === 'owner_paying' && renewal.ownerPaymentId === payment.id) {
    await store.releaseOwnerPaying(renewal.id, payment.id);
  }
}

async function handle(req: NextRequest, input: ReturnInput): Promise<NextResponse> {
  const ip = getTrustedClientIp(req.headers) ?? 'unknown';
  const ipLimit = await rateLimit(`paynkolay:return:${ip}`, 30, 60 * 1000);

  const payment = input.paymentId
    ? await prisma.billingPayment.findUnique({
        where: { id: input.paymentId },
        select: {
          id: true,
          userId: true,
          kind: true,
          renewalId: true,
          saveCard: true,
          autoRenewConsentId: true,
          providerEnv: true,
          status: true,
          locale: true,
          amountMinor: true,
          createdAt: true,
        },
      })
    : null;
  const locale = payment?.locale === 'en' ? 'en' : 'tr';
  const finish = async (status: PaymentResultStatus | null) =>
    noStoreRedirect(paymentResultPath(locale, status, payment ? await ownerLapsed(payment.userId) : false));

  if (!payment) return finish('failed');
  const cfg = getPaynkolayConfig();
  // D18. A row of the other PayNKolay environment (NULL = created before saved cards = live): nothing else
  // happens. A row the database binding refuses (e.g. a test deployment pointed at the production database):
  // never confirmed, failed or settled here.
  const envCheck = await loadHostedPaymentEnvCheck(payment.providerEnv);
  const gate = returnEnvGate(payment.providerEnv, cfg?.env ?? null, envCheck);
  if (gate === 'other_environment') return finish(null);
  if (gate === 'refused') {
    if (ipLimit.allowed) {
      Sentry.captureMessage('billing: payment environment does not match the database binding; not settled', {
        level: 'error',
        fingerprint: ['billing-env-mismatch'],
        tags: { billing: 'return' },
        extra: { paymentId: payment.id, reason: envCheck.ok ? 'ok' : envCheck.reason },
      });
    }
    if (payment.kind === 'renewal_auto') return okText();
    return finish('pending');
  }

  if (payment.kind === 'renewal_auto') {
    // PayNKolay posting a merchant-initiated (non-3D) result: no browser is involved.
    if (cfg && payment.status === 'pending' && ipLimit.allowed) {
      try {
        const decision = await confirmCharge(cfg, fetchTransport, {
          clientRefCode: payment.id,
          amountMinor: payment.amountMinor,
          createdAt: payment.createdAt,
          kind: payment.kind,
        });
        if (decision.kind === 'succeeded' || decision.kind === 'duplicate') {
          await settlePaynkolayPayment(payment.id, decision);
          await applyPostSettleEffects(payment.id, postSettleDeps);
        }
      } catch (err) {
        Sentry.captureException(safeError(err, 'return_auto'), { tags: { billing: 'return' } });
      }
    }
    return okText();
  }

  if (payment.status === 'succeeded') return finish('success');
  if (payment.status === 'needs_review') return finish('review');
  if (!ipLimit.allowed) return finish('pending');
  const paymentLimit = await rateLimit(`paynkolay:return:pid:${payment.id}`, 10, 10 * 60 * 1000);
  if (!paymentLimit.allowed) return finish('pending');
  if (!cfg) return finish('pending');

  try {
    const decision = await confirmPayment(
      cfg,
      input.hashFields,
      { clientRefCode: payment.id, amountMinor: payment.amountMinor, createdAt: payment.createdAt },
      fetchTransport,
    );
    if (decision.kind === 'succeeded' || decision.kind === 'duplicate') {
      const result = await settlePaynkolayPayment(payment.id, decision);
      if (result !== 'review') await applyPostSettleEffects(payment.id, postSettleDeps);
      return finish(resultForSettle(result));
    }
    if (decision.kind === 'failed') {
      await store.markPaymentFailed(payment.id, decision.reason, new Date());
      await releaseOwnerLock(payment);
    } else if (decision.kind === 'charged_mismatch') {
      // Money may have been taken without 3D / with instalments / another amount: hold it, never grant a period.
      await store.markPaymentNeedsReview(payment.id, `mismatch_${decision.reason}`, 'charged_mismatch');
      await releaseOwnerLock(payment);
      Sentry.captureMessage('billing: PaymentList success does not match the hosted payment', {
        level: 'error',
        fingerprint: [decision.reason === 'not_3d' ? 'billing-non3d-hosted' : 'billing-charged-mismatch'],
        tags: { billing: 'return' },
        extra: { paymentId: payment.id, reason: decision.reason },
      });
    }
    // not_found / indeterminate: stays pending; the renewal engine's reconciliation decides.
    billingLog('warn', 'paynkolay.return.unconfirmed', { paymentId: payment.id, reason: decision.kind });
    return finish(resultForDecision(decision));
  } catch (err) {
    // The POS could not be asked. Not the same as "unpaid": keep it pending.
    billingLog('warn', 'paynkolay.return.unconfirmed', { paymentId: payment.id, reason: 'provider_error' });
    Sentry.captureException(safeError(err, 'return'), { tags: { billing: 'return' } });
    return finish('pending');
  }
}

export async function POST(req: NextRequest) {
  let input: ReturnInput = { paymentId: null, hashFields: {} };
  try {
    const form = await req.formData();
    input = readReturnPost((name) => {
      const value = form.get(name);
      return typeof value === 'string' ? value : null;
    });
  } catch {
    /* empty body → treated as an unknown payment */
  }
  return handle(req, input);
}

export async function GET(req: NextRequest) {
  return handle(req, readReturnGet((name) => req.nextUrl.searchParams.get(name)));
}
