import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { paymentMethodCore } from '@/lib/billing/card-api';
import { loadCardVaultDeps } from '@/lib/billing/card-vault';
import { loadBillingFlags } from '@/lib/billing/flags';
import { BILLING_NO_STORE, requireBillingOwner } from '@/lib/billing/owner-guard';
import { prismaRenewalStore } from '@/lib/billing/renewal-store-prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/billing/payment-method[?refresh=1] — the owner's saved card and
 * renewal state (billing spec §8.1). Owner only; an impersonating admin may
 * read (canManage: false). Never returns a token, TranId or customer key.
 */
export async function GET(req: NextRequest) {
  const flags = await loadBillingFlags();
  const guard = await requireBillingOwner(req, { mutate: false, needFlag: null, flags });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status, headers: BILLING_NO_STORE });

  const vault = flags.cardStorage ? await loadCardVaultDeps() : null;
  const res = await paymentMethodCore(
    { db: prisma, flags, vault, store: prismaRenewalStore, now: () => new Date(), rateLimit },
    { userId: guard.userId, canManage: guard.canManage },
    { refresh: req.nextUrl.searchParams.get('refresh') === '1' },
  );
  return NextResponse.json(res.body, { status: res.status, headers: BILLING_NO_STORE });
}
