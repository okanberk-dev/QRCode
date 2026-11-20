import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { deleteCardCore } from '@/lib/billing/card-api';
import { loadCardVaultDeps } from '@/lib/billing/card-vault';
import { loadBillingFlags } from '@/lib/billing/flags';
import { BILLING_NO_STORE, requireBillingOwner } from '@/lib/billing/owner-guard';
import { prismaRenewalStore } from '@/lib/billing/renewal-store-prisma';
import { CARD_HANDLE_RE } from '@/lib/billing/vault-crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * DELETE /api/billing/cards/{handle} — removes a saved card at PayNKolay
 * (billing spec §8.2). Owner only, never during impersonation, same-origin.
 * The handle is resolved only inside this owner's own PayNKolay card list, so
 * another owner's handle is a plain 404 and no provider delete is sent.
 * Deletion is verified by a re-list (502 delete_unconfirmed otherwise).
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ handle: string }> }) {
  const { handle } = await ctx.params;
  const flags = await loadBillingFlags();
  const guard = await requireBillingOwner(req, { mutate: true, needFlag: 'cardStorage', flags });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status, headers: BILLING_NO_STORE });
  if (!CARD_HANDLE_RE.test(handle)) return NextResponse.json({ error: 'invalid_handle' }, { status: 400, headers: BILLING_NO_STORE });

  const vault = await loadCardVaultDeps();
  const res = await deleteCardCore(
    { db: prisma, flags, vault, store: prismaRenewalStore, now: () => new Date(), rateLimit },
    { userId: guard.userId, canManage: guard.canManage },
    handle,
  );
  return NextResponse.json(res.body, { status: res.status, headers: BILLING_NO_STORE });
}
