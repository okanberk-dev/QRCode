import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyUserTokenForLayout } from '@/lib/auth';
import { billingText } from '@/lib/billing/billing-copy';
import type { PublicSavedCard } from '@/lib/billing/card-types';
import { mirrorCards } from '@/lib/billing/card-vault';
import { loadBillingFlags } from '@/lib/billing/flags';
import { prisma } from '@/lib/prisma';
import SavedCardClient, { type SavedCardBlocked } from './SavedCardClient';

export const dynamic = 'force-dynamic';

/**
 * The saved card, outside the dashboard gate (billing spec §4.4, §13.2): the
 * card-save consent promises the owner can delete the card at any time, and
 * the retention mail links here — but the dashboard redirects an owner whose
 * plan has ended to /pricing. Owner session only; removal goes through
 * DELETE /api/billing/cards/[handle] (same guard, verified at PayNKolay).
 * Rendered under the billing root layout: no third-party script.
 */

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = (await params).locale === 'en' ? 'en' : 'tr';
  return { title: { absolute: `${billingText('card.title', locale)} · Buaze` } };
}

export default async function SavedCardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === 'en' ? 'en' : 'tr';
  const loginUrl = `/${locale}/auth/login?redirect=${encodeURIComponent(`/billing/${locale}/card`)}`;

  const token = (await cookies()).get('user_token')?.value;
  if (!token) redirect(loginUrl);
  const payload = await verifyUserTokenForLayout(token);
  if (!payload || typeof payload.userId !== 'string') redirect(loginUrl);
  const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { role: true, isActive: true } });
  if (!user || !user.isActive) redirect(loginUrl);

  // D8: during a support session the card is visible but nothing can be changed.
  const impersonating = typeof payload.impersonating === 'object' && payload.impersonating !== null;
  let blocked: SavedCardBlocked | null = null;
  let cards: PublicSavedCard[] = [];
  if (user.role !== 'restaurant_owner') {
    blocked = 'owner_only';
  } else {
    const flags = await loadBillingFlags();
    if (!flags.cardStorage) blocked = 'unavailable';
    else cards = await mirrorCards(prisma, payload.userId, new Date(), null);
  }

  return <SavedCardClient locale={locale} cards={cards} canManage={!impersonating} blocked={blocked} />;
}
