import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plug } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getScopedRestaurantIdsForUserPayload } from '@/lib/panel-access';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { PageHeader, EmptyState } from '@/components/ui';
import type { Locale } from '@/lib/translations';
import { resolveActiveRestaurantId } from '@/lib/active-business';
import { PLATFORM_LINKS_LABEL } from '@/lib/platform-management';
import { latestChecksForRestaurants } from '@/lib/platform-link-test';
import { isExternalReviewProvider } from '@/lib/restaurant-features';
import type { LatestCheckLite } from '@/lib/platform-link-status';
import PlatformsClient, { type PlatformsRestaurant } from './_components/PlatformsClient';

export const dynamic = 'force-dynamic';

// §42.3 narrow tier. The scroll margins keep keyboard-focused controls clear
// of the sticky topbar and the mobile bottom nav (WCAG 2.4.11 focus not
// obscured) — browsers honour scroll-margin when scrolling focus into view.
const PAGE_WRAPPER =
  'mx-auto w-full max-w-[1280px] space-y-5 px-4 sm:px-7 py-6 lg:py-8 ' +
  '[&_:is(a,button,input,summary)]:scroll-mt-24 ' +
  '[&_:is(a,button,input,summary)]:scroll-mb-[calc(var(--dash-bottom-nav-h,0px)+16px)]';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ restaurantId?: string; restaurant?: string }>;
}

// Checks older than this read as "not checked yet". The daily cron keeps
// active links fresh; the window only bounds the DISTINCT ON scan.
const CHECK_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

export default async function OwnerPlatformsPage({ params, searchParams }: PageProps) {
  const { locale: localeParam } = await params;
  const query = await searchParams;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';
  const isTr = locale === 'tr';

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login?next=/${locale}/dashboard/platforms`);
  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/platforms`);
  }
  const role = typeof payload.role === 'string' ? payload.role : 'restaurant_owner';
  if (isAdminRole(role)) {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/platforms`);
  }

  // Team members included — same scope the API layer resolves
  // (getScopedRestaurantIds).
  const scopedIds = await getScopedRestaurantIdsForUserPayload({
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
  });
  const since = new Date(Date.now() - CHECK_WINDOW_MS);
  // Checks are loaded for EVERY scoped business so switching business on the
  // page is instant and never shows another business's numbers. The two reads
  // are independent, so they run at once (was an array $transaction).
  const [restaurantRows, checkRows] = await Promise.all([
    prisma.restaurant.findMany({
      where: { id: { in: scopedIds } },
      select: {
        id: true,
        name: true,
        category: true,
        externalPlatformsEnabled: true,
        defaultRedirectPlatform: true,
        redirectMinRating: true,
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
        instagramUrl: true,
        facebookUrl: true,
        whatsappUrl: true,
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
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    latestChecksForRestaurants(scopedIds, since),
  ]);
  // The shell's business switcher only offers active businesses: a paused
  // business can never be the active scope (the shell puts the URL back to
  // an active one), so "Ayrıntı" / a matrix cell for it silently opened
  // another business. List the same set as the switcher. A workspace whose
  // businesses are all paused still sees them (the shell has no scope then).
  const activeRows = restaurantRows.filter((restaurant) => restaurant.isActive);
  const hiddenPausedCount = activeRows.length > 0 ? restaurantRows.length - activeRows.length : 0;
  const restaurants = (activeRows.length > 0 ? activeRows : restaurantRows).map(
    ({ isActive: _isActive, ...restaurant }) => restaurant,
  );

  const title = isTr ? PLATFORM_LINKS_LABEL.tr : PLATFORM_LINKS_LABEL.en;

  if (restaurants.length === 0) {
    return (
      <div className={PAGE_WRAPPER} data-focus-clearance>
        <PageHeader
          title={title}
          description={
            isTr
              ? 'Her platformdan gelen yorumu tek panelde topla. Önce bir işletme ekle.'
              : 'Collect reviews from every platform in one panel. Add a business first.'
          }
        />
        <div className="bz-card p-10">
          <EmptyState
            icon={<Plug size={22} strokeWidth={1.5} />}
            title={isTr ? 'Henüz işletmen yok' : 'No business yet'}
            body={
              isTr
                ? 'İlk restoranını ekledikten sonra platform bağlantılarını yönetebilirsin.'
                : 'Add your first restaurant to start managing platform links.'
            }
            action={
              <Link href={`/${locale}/dashboard/restaurants`} className="bz-btn-primary">
                {isTr ? 'İşletme ekle' : 'Add business'}
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const externalDisabledIds = new Set(
    restaurants.filter((restaurant) => !restaurant.externalPlatformsEnabled).map((restaurant) => restaurant.id),
  );
  const checksByRestaurant: Record<string, Record<string, LatestCheckLite>> = {};
  for (const check of checkRows) {
    // Admin-gated external providers are shown as "Kapalı" regardless of
    // their last check — mirror GET /integrations/checks and drop them.
    if (externalDisabledIds.has(check.restaurantId) && isExternalReviewProvider(check.provider)) continue;
    (checksByRestaurant[check.restaurantId] ??= {})[check.provider] = {
      ok: check.ok,
      checkedAt: new Date(check.checkedAt).toISOString(),
      error: check.error,
      statusCode: check.statusCode,
    };
  }

  // Server-side pick is query-only (localStorage is not visible here); the
  // client resolves the remembered business after mount and renders a
  // skeleton until then instead of the first business's data.
  const initialRestaurantId =
    resolveActiveRestaurantId({
      restaurants,
      queryRestaurantId: query?.restaurantId ?? query?.restaurant,
      storedRestaurantId: null,
    }) ?? restaurants[0].id;

  return (
    <div className={PAGE_WRAPPER} data-focus-clearance>
      <PlatformsClient
        locale={locale}
        restaurants={restaurants.map<PlatformsRestaurant>((restaurant) => ({ ...restaurant }))}
        checksByRestaurant={checksByRestaurant}
        initialRestaurantId={initialRestaurantId}
        serverNow={Date.now()}
        hiddenPausedCount={hiddenPausedCount}
      />
    </div>
  );
}
