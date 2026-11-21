import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt, isAdminRole, type PanelActor } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTeamMemberRole } from '@/lib/panel-access';
import { getPanelRestaurants, getPanelUser } from '../_lib/panel-data';
import type { Locale } from '@/lib/translations';
import { latestChecksForRestaurants } from '@/lib/platform-link-test';
import { isExternalReviewProvider } from '@/lib/restaurant-features';
import { summarizeReviewPlatformLinks, type LatestCheckLite } from '@/lib/platform-link-status';
import RestaurantsClient from './_components/RestaurantsClient';

export const dynamic = 'force-dynamic';

// Same window as the platforms page so both show the same link status.
const CHECK_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function DashboardRestaurantsPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';
  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login?next=/${locale}/dashboard/restaurants`);

  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/restaurants`);
  }
  const tokenRole = typeof payload.role === 'string' ? payload.role : 'restaurant_owner';
  if (isAdminRole(tokenRole)) {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/restaurants`);
  }

  // Request-memoised (React cache) — on a hard load the layout already read
  // this user, so no second query.
  const user = await getPanelUser(payload.userId);

  if (!user) redirect(`/${locale}/auth/login?next=/${locale}/dashboard/restaurants`);

  // §22 franchise scope — owner kendi sahip olduğu tüm aktif restoranları,
  // team_member (franchise area manager) `TeamMember.locations` subset'ini
  // görür. Sayfa SCOPE-BLIND'dır: sidebar workspace switcher seçimi (?restaurantId=)
  // bu listede filter uygulamaz — switcher sadece dashboard/feedbacks/analytics
  // gibi context-scoped sayfaları daraltır. Kullanıcı buraya gelince
  // sahibi/yönettiği TÜM lokasyonları aynı anda görür ve hangisine geçeceğini
  // (yönetmek istediğini) seçer.
  const role = user.role || 'restaurant_owner';
  const actor: PanelActor = {
    id: user.id,
    role,
    restaurantId: null,
    username: null,
    email: user.email,
    plan: user.plan,
    source: 'user',
  };
  // The ids of the businesses in scope (getScopedRestaurantIds). Taken from
  // the request-memoised business list the layout already loaded; they only
  // feed `IN (...)` filters below, where an id without a row matches nothing.
  const ids = (await getPanelRestaurants(actor.id, actor.role, actor.email)).map((r) => r.id);
  const teamRole = await getTeamMemberRole(actor);
  const viewerMode = teamRole === 'viewer';
  const now = Date.now();
  const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000);
  // One connection, one snapshot (CLAUDE.md §40.1). Feedback stats, the
  // review-platform link summary and the business rows feed the franchise
  // table (§49): reviews / rating (30 days), waiting low ratings, platform
  // health and the newest review per business.
  const [restaurants, stats30, lowUnreadRows, lastRows, checkRows] =
    ids.length > 0
      ? await prisma.$transaction([
          prisma.restaurant.findMany({
            // No isActive filter: a paused business used to vanish from this
            // list, leaving the owner no visible way to reactivate it.
            where: { id: { in: ids } },
            select: {
              id: true,
              slug: true,
              name: true,
              category: true,
              notificationEmail: true,
              primaryColor: true,
              isActive: true,
              suspendedByAdmin: true,
              createdAt: true,
              externalPlatformsEnabled: true,
              defaultRedirectPlatform: true,
              googleReviewUrl: true,
              yemekSepetiUrl: true,
              getirYemekUrl: true,
              trendyolYemekUrl: true,
              tripAdvisorUrl: true,
              airbnbUrl: true,
              bookingUrl: true,
              yandexUrl: true,
              yelpUrl: true,
              foursquareUrl: true,
              googleEnabled: true,
              yemekSepetiEnabled: true,
              getirEnabled: true,
              trendyolEnabled: true,
              tripAdvisorEnabled: true,
              airbnbEnabled: true,
              bookingEnabled: true,
              yandexEnabled: true,
              yelpEnabled: true,
              foursquareEnabled: true,
              _count: { select: { feedbacks: true } },
            },
            orderBy: { createdAt: 'asc' },
          }),
          prisma.feedback.groupBy({
            by: ['restaurantId'],
            where: { restaurantId: { in: ids }, createdAt: { gte: since30 } },
            _count: { _all: true },
            _avg: { rating: true },
            orderBy: { restaurantId: 'asc' },
          }),
          // Same definition as the notification bell (rating ≤ 3, unread).
          prisma.feedback.groupBy({
            by: ['restaurantId'],
            where: { restaurantId: { in: ids }, rating: { lte: 3 }, isRead: false },
            _count: { _all: true },
            orderBy: { restaurantId: 'asc' },
          }),
          prisma.feedback.groupBy({
            by: ['restaurantId'],
            where: { restaurantId: { in: ids } },
            _max: { createdAt: true },
            orderBy: { restaurantId: 'asc' },
          }),
          latestChecksForRestaurants(ids, new Date(now - CHECK_WINDOW_MS)),
        ])
      : [[], [], [], [], []];

  const statsById = new Map(stats30.map((row) => [row.restaurantId, row]));
  const lowUnreadById = new Map(lowUnreadRows.map((row) => [row.restaurantId, row]));
  const lastById = new Map(lastRows.map((row) => [row.restaurantId, row]));
  const checksById: Record<string, Record<string, LatestCheckLite>> = {};
  const externalOff = new Set(restaurants.filter((r) => !r.externalPlatformsEnabled).map((r) => r.id));
  for (const check of checkRows) {
    // Admin-gated external providers read as "Kapalı" (platforms page parity).
    if (externalOff.has(check.restaurantId) && isExternalReviewProvider(check.provider)) continue;
    (checksById[check.restaurantId] ??= {})[check.provider] = {
      ok: check.ok,
      checkedAt: new Date(check.checkedAt).toISOString(),
      error: check.error,
      statusCode: check.statusCode,
    };
  }

  return (
    <RestaurantsClient
      locale={locale}
      initialRestaurants={restaurants.map((restaurant) => {
        const stats = statsById.get(restaurant.id);
        const avg = stats?._avg?.rating;
        const lowUnread = lowUnreadById.get(restaurant.id)?._count;
        const last = lastById.get(restaurant.id)?._max?.createdAt;
        return {
          id: restaurant.id,
          slug: restaurant.slug,
          name: restaurant.name,
          category: restaurant.category,
          notificationEmail: restaurant.notificationEmail,
          primaryColor: restaurant.primaryColor,
          isActive: restaurant.isActive,
          suspendedByAdmin: restaurant.suspendedByAdmin,
          createdAt: restaurant.createdAt.toISOString(),
          _count: restaurant._count,
          reviews30d: typeof stats?._count === 'object' ? stats._count._all ?? 0 : 0,
          avgRating30d: typeof avg === 'number' ? Math.round(avg * 10) / 10 : null,
          lowUnread: typeof lowUnread === 'object' ? lowUnread._all ?? 0 : 0,
          lastFeedbackAt: last ? last.toISOString() : null,
          platforms: summarizeReviewPlatformLinks(restaurant, checksById[restaurant.id]),
        };
      })}
      serverNow={now}
      initialNotificationEmail={user.email}
      role={role}
      viewerMode={viewerMode}
    />
  );
}
