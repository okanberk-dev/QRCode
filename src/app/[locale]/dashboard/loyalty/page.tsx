// Loyalty card page (CLAUDE.md §60, server hydration §40.10).
//
// Server: session, business scope, the active business's program, stats and
// the viewer's access level. The client paints without a skeleton and only
// fetches when the shell switches to a business the server did not hydrate.
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { actorFromUserPayload, getScopedRestaurantIdsForUserPayload } from '@/lib/panel-access';
import { resolveActiveRestaurantId } from '@/lib/active-business';
import { templateForCategory } from '@/lib/loyalty';
import {
  loadLoyaltyProgram,
  loyaltyAccess,
  loyaltyPublicBaseUrl,
  loyaltyStats,
  toProgramDto,
} from '@/lib/loyalty-server';
import LoyaltyClient, { type LoyaltyPageData } from './_components/LoyaltyClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === 'tr' ? 'Sadakat kartı' : 'Loyalty card', robots: { index: false, follow: false } };
}

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ restaurantId?: string; restaurant?: string }>;
}

export default async function LoyaltyPage({ params, searchParams }: PageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';
  const sp = await searchParams;
  const next = `/${locale}/auth/login?next=/${locale}/dashboard/loyalty`;

  const token = (await cookies()).get('user_token')?.value;
  if (!token) redirect(next);
  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') redirect(next);
  if (isAdminRole(typeof payload.role === 'string' ? payload.role : '')) redirect(next);

  const tokenPayload = { userId: payload.userId, role: payload.role, email: payload.email };
  const scopedIds = await getScopedRestaurantIdsForUserPayload(tokenPayload);
  const restaurants = await prisma.restaurant.findMany({
    where: { id: { in: scopedIds }, isActive: true },
    select: { id: true, name: true, category: true },
    orderBy: { createdAt: 'asc' },
  });
  const activeId = resolveActiveRestaurantId({
    restaurants,
    queryRestaurantId: sp.restaurantId ?? sp.restaurant,
    storedRestaurantId: null,
  });

  let initial: LoyaltyPageData | null = null;
  if (activeId) {
    const actor = actorFromUserPayload(tokenPayload);
    const [access, program, flags] = await Promise.all([
      loyaltyAccess(actor, activeId),
      loadLoyaltyProgram(activeId),
      prisma.restaurant.findUnique({ where: { id: activeId }, select: { loyaltyEnabled: true, category: true } }),
    ]);
    if (access.read) {
      initial = {
        restaurantId: activeId,
        program: program ? toProgramDto(program) : null,
        stats: program ? await loyaltyStats(program) : null,
        access,
        moduleEnabled: flags?.loyaltyEnabled ?? true,
        baseUrl: loyaltyPublicBaseUrl(),
        suggestedTemplate: templateForCategory(flags?.category),
      };
    }
  }

  return (
    <LoyaltyClient
      locale={locale}
      restaurants={restaurants}
      initialActiveRestaurantId={activeId}
      initial={initial}
    />
  );
}
