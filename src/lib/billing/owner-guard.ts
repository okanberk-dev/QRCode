import type { NextRequest } from 'next/server';
import { getPanelActorFromRequest, type PanelActor } from '@/lib/auth';
import { SITE_URL } from '@/lib/site';
import { loadBillingFlags, type BillingFlags } from './flags';

/**
 * Who may use the saved-card APIs (billing spec §6.2 owner guard, D8, D9).
 *  - only the workspace owner's own session (`source: 'user'`, role
 *    `restaurant_owner`); team members and admins get 403 `owner_only`;
 *  - during admin impersonation (`realAdminId`) reads work but nothing can be
 *    changed (`impersonation_blocked`): consent must be the owner's own act;
 *  - a mutation must come from our own origin (CSRF): `Origin` equals the
 *    site origin (or the request origin in development), else a generic 403;
 *  - a feature flag, when asked for, also needs the environment binding.
 */

export type OwnerGuardError = 'unauthorized' | 'owner_only' | 'impersonation_blocked' | 'unavailable';

export type OwnerGuard =
  | { ok: true; userId: string; actor: PanelActor; canManage: boolean }
  | { ok: false; status: 401 | 403 | 503; error: OwnerGuardError };

export interface OwnerGuardInput {
  actor: PanelActor | null;
  mutate: boolean;
  /** Origin header of the request (null when absent). */
  origin: string | null;
  /** Origins accepted for mutations. */
  allowedOrigins: string[];
  /** The asked feature flag (with the binding) holds, or no flag was asked for. */
  flagOk: boolean;
}

/** Pure decision (tested). */
export function evaluateOwnerGuard(input: OwnerGuardInput): OwnerGuard {
  const { actor } = input;
  if (!actor) return { ok: false, status: 401, error: 'unauthorized' };
  if (actor.source !== 'user' || actor.role !== 'restaurant_owner') return { ok: false, status: 403, error: 'owner_only' };
  if (input.mutate && actor.realAdminId) return { ok: false, status: 403, error: 'impersonation_blocked' };
  if (input.mutate && (!input.origin || !input.allowedOrigins.includes(input.origin))) {
    return { ok: false, status: 403, error: 'owner_only' };
  }
  if (!input.flagOk) return { ok: false, status: 503, error: 'unavailable' };
  return { ok: true, userId: actor.id, actor, canManage: !actor.realAdminId };
}

/** Origins a billing mutation may come from: the site origin, plus the request's own origin in development. */
export function allowedBillingOrigins(requestOrigin: string | null): string[] {
  const out = [new URL(SITE_URL).origin];
  if (process.env.NODE_ENV === 'development' && requestOrigin) out.push(requestOrigin);
  return out;
}

/**
 * CSRF check of a native form POST (the review page → checkout route). The
 * `Origin` must be one of `allowed`. `Origin: null` is accepted only together
 * with `Sec-Fetch-Site: same-origin`: a browser sends `null` for a same-origin
 * form post when a referrer policy such as `no-referrer` is in force (Fetch
 * standard), and `Sec-Fetch-*` is a forbidden header page script cannot set,
 * so a cross-site or opaque-origin (sandboxed) form still fails. A missing
 * Origin always fails.
 */
export function billingFormOriginOk(origin: string | null, secFetchSite: string | null, allowed: string[]): boolean {
  if (!origin) return false;
  if (allowed.includes(origin)) return true;
  return origin === 'null' && secFetchSite === 'same-origin';
}

/**
 * The admin-entered card label of `/api/billing/summary` (brand + last4) is
 * card data: only the workspace owner gets it (D9, §11.5). Team members read
 * the summary without it.
 */
export function summaryPaymentMethod(
  sub: { paymentBrand: string | null; paymentLast4: string | null } | null,
  viewerIsOwner: boolean,
): { brand: string; last4: string } | null {
  if (!viewerIsOwner || !sub?.paymentBrand || !sub.paymentLast4) return null;
  return { brand: sub.paymentBrand, last4: sub.paymentLast4 };
}

export async function requireBillingOwner(
  req: NextRequest,
  opts: { mutate: boolean; needFlag: 'cardStorage' | 'autoCharge' | null; flags?: BillingFlags },
): Promise<OwnerGuard> {
  const actor = await getPanelActorFromRequest(req);
  let flagOk = true;
  if (opts.needFlag) {
    const flags = opts.flags ?? (await loadBillingFlags());
    flagOk = flags.binding.ok && flags[opts.needFlag];
  }
  return evaluateOwnerGuard({
    actor,
    mutate: opts.mutate,
    origin: req.headers.get('origin'),
    allowedOrigins: allowedBillingOrigins(req.nextUrl.origin),
    flagOk,
  });
}

/** Every `/api/billing/*` JSON response: private, never cached. */
export const BILLING_NO_STORE = { 'Cache-Control': 'private, no-store' } as const;
