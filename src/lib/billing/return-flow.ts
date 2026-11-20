import type { PaymentDecision } from '@/lib/payment/paynkolay';
import type { SettleResult } from './paynkolay-billing';

/**
 * Pure helpers of the PayNKolay return route (billing spec §8.6, §14.5).
 * The route never copies the provider body or the query string into a
 * variable that reaches a log or Sentry: it reads only the payment id
 * (`clientRefCode`), the REFERENCE_CODE tie-breaker and the fields of the
 * log-only return hash check.
 */

/** Our payment ids are cuids; anything else is not a payment of ours. */
export const CLIENT_REF_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** Fields of the log-only `hashDataV2` check (verifyPaynkolayReturnHash). */
const HASH_FIELDS = [
  'MERCHANT_NO',
  'REFERENCE_CODE',
  'AUTH_CODE',
  'RESPONSE_CODE',
  'USE_3D',
  'RND',
  'INSTALLMENT',
  'AUTHORIZATION_AMOUNT',
  'CURRENCY_CODE',
  'hashDataV2',
  'hashDatav2',
] as const;

export interface ReturnInput {
  paymentId: string | null;
  /** Allow-listed subset of the POST body for the hash check; REFERENCE_CODE is only a tie-breaker. */
  hashFields: Record<string, string>;
}

function cleanId(value: string | null | undefined): string | null {
  const id = (value ?? '').trim();
  return CLIENT_REF_RE.test(id) ? id : null;
}

/** POST body → only the payment id and the hash-check fields (each ≤ 256 chars). */
export function readReturnPost(get: (name: string) => string | null): ReturnInput {
  const hashFields: Record<string, string> = {};
  for (const name of HASH_FIELDS) {
    const value = get(name);
    if (typeof value === 'string') hashFields[name] = value.slice(0, 256);
  }
  return { paymentId: cleanId(get('CLIENT_REFERENCE_CODE') || get('clientRefCode')), hashFields };
}

/** GET query → only the payment id. No other parameter is ever read. */
export function readReturnGet(get: (name: string) => string | null): ReturnInput {
  return { paymentId: cleanId(get('clientRefCode') || get('CLIENT_REFERENCE_CODE')), hashFields: {} };
}

export type ReturnEnvGate = 'proceed' | 'other_environment' | 'refused';

/**
 * D18 gate of the return route (pure; `check` is `hostedPaymentEnvCheck` of
 * the payment against the database binding).
 *  - `other_environment`: the row belongs to the other PayNKolay environment
 *    than this deployment → the generic result page, nothing else;
 *  - `refused`: this deployment's environment matches the row, but the
 *    database refuses it (a test deployment pointed at the production
 *    database, or a database bound to the other environment) → answer
 *    pending, alert, never confirm, fail or settle;
 *  - `proceed`: normal handling.
 */
export function returnEnvGate(paymentEnv: string | null, cfgEnv: string | null, check: { ok: boolean }): ReturnEnvGate {
  if (cfgEnv && (paymentEnv ?? 'live') !== cfgEnv) return 'other_environment';
  return check.ok ? 'proceed' : 'refused';
}

export type PaymentResultStatus = 'success' | 'failed' | 'pending' | 'review';

/** What the owner is told after a settle attempt. */
export function resultForSettle(result: SettleResult): PaymentResultStatus {
  switch (result) {
    case 'succeeded':
    case 'late_success':
    case 'already':
      return 'success';
    case 'duplicate_period':
    case 'refund_pending':
    case 'review':
      return 'review';
  }
}

/** What the owner is told for a PaymentList decision that does not settle. */
export function resultForDecision(decision: PaymentDecision): PaymentResultStatus {
  switch (decision.kind) {
    case 'succeeded':
    case 'duplicate':
      return 'success';
    case 'failed':
      return 'failed';
    case 'charged_mismatch':
      return 'review';
    case 'not_found':
    case 'indeterminate':
      return 'pending';
  }
}

/**
 * Where the browser lands after a payment. A lapsed owner (expired paid
 * period or trial) would be bounced from the dashboard to /pricing by the
 * dashboard layout and lose the result, so they go to /pricing directly and
 * the result travels with them (`plan=expired&payment=<status>`).
 * `status` null = the generic page without a payment result.
 */
export function paymentResultPath(locale: 'tr' | 'en', status: PaymentResultStatus | null, lapsed: boolean): string {
  const payment = status ? `payment=${status}` : '';
  if (lapsed) return `/${locale}/pricing?plan=expired${payment ? `&${payment}` : ''}`;
  return `/${locale}/dashboard/account?section=billing${payment ? `&${payment}` : ''}`;
}

/** Mirrors the dashboard layout gate: an expired paid period or an expired trial. */
export function isOwnerLapsed(user: { plan: string; trialEndsAt: Date | null } | null, now: Date): boolean {
  if (!user) return false;
  if (user.plan === 'expired') return true;
  return user.plan === 'trial' && !!user.trialEndsAt && user.trialEndsAt.getTime() < now.getTime();
}
