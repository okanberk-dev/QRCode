import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Plug } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getScopedRestaurantIdsForUserPayload } from '@/lib/panel-access';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { resolveActiveRestaurantId } from '@/lib/active-business';
import { EmptyState, PageHeader } from '@/components/ui';
import type { Locale } from '@/lib/translations';
import {
  getManageablePlatform,
  getManageablePlatformByProvider,
  PLATFORM_LINKS_LABEL,
  type PlatformEnabledField,
  type PlatformUrlField,
} from '@/lib/platform-management';
import { latestChecksForRestaurants } from '@/lib/platform-link-test';
import { isExternalReviewProvider } from '@/lib/restaurant-features';
import type { LatestCheckLite } from '@/lib/platform-link-status';
import PlatformProviderWizard, {
  type ProviderRestaurantInfo,
} from './_components/PlatformProviderWizard';

export const dynamic = 'force-dynamic';

// §42.3 narrow tier. The scroll margins keep keyboard-focused controls clear
// of the sticky topbar and the mobile bottom nav (WCAG 2.4.11 focus not
// obscured) — browsers honour scroll-margin when scrolling focus into view.
const PAGE_WRAPPER =
  'mx-auto w-full max-w-[1280px] space-y-5 px-4 sm:px-7 py-6 lg:py-8 ' +
  '[&_:is(a,button,input,summary)]:scroll-mt-24 ' +
  '[&_:is(a,button,input,summary)]:scroll-mb-[calc(var(--dash-bottom-nav-h,0px)+16px)]';

// Same window as the overview (platforms/page.tsx) so both pages read the
// same status for the same link. The daily cron keeps active links fresh;
// the window only bounds the DISTINCT ON scan.
const CHECK_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

interface PageProps {
  params: Promise<{ locale: string; provider: string }>;
  searchParams?: Promise<{ restaurantId?: string; restaurant?: string }>;
}

type RestaurantProviderRow = {
  id: string;
  name: string;
  category: string;
  address: string | null;
  city: string | null;
  googlePlaceId: string | null;
  externalPlatformsEnabled: boolean;
  defaultRedirectPlatform: string | null;
  redirectMinRating: number | null;
  // Stage 97 — opt-in WhatsApp channel for low-rating customers on the
  // public review surface (CLAUDE.md §19.1). Owner toggles via the
  // wizard mounted on this page when `platform.slug === 'whatsapp'`.
  whatsappReviewEnabled: boolean;
  whatsappReviewMessage: string | null;
} & Record<PlatformUrlField, string | null> &
  Record<PlatformEnabledField, boolean>;

export default async function PlatformProviderPage({ params, searchParams }: PageProps) {
  const { locale: localeParam, provider } = await params;
  const query = await searchParams;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';
  const isTr = locale === 'tr';
  const platform = getManageablePlatform(provider);
  if (!platform) {
    // `trendyol_go` is the provider id used by the DB / API /
    // defaultRedirectPlatform, but the URL slug is `trendyol`. Redirect only
    // when the segment matches a provider id (never another slug) so this
    // can't loop; everything else stays a 404.
    const byProvider = getManageablePlatformByProvider(provider);
    if (byProvider && byProvider.slug !== provider) {
      const redirectParams = new URLSearchParams();
      const restaurantParam = query?.restaurantId ?? query?.restaurant;
      if (restaurantParam) redirectParams.set('restaurantId', restaurantParam);
      const qs = redirectParams.toString();
      redirect(`/${locale}/dashboard/platforms/${byProvider.slug}${qs ? `?${qs}` : ''}`);
    }
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  const next = `/${locale}/dashboard/platforms/${provider}`;
  if (!token) redirect(`/${locale}/auth/login?next=${encodeURIComponent(next)}`);
  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login?next=${encodeURIComponent(next)}`);
  }
  const role = typeof payload.role === 'string' ? payload.role : 'restaurant_owner';
  if (isAdminRole(role)) {
    redirect(`/${locale}/auth/login?next=${encodeURIComponent(next)}`);
  }

  // Team members included — same scope the API layer resolves
  // (getScopedRestaurantIds).
  const scopedIds = await getScopedRestaurantIdsForUserPayload({
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
  });
  const since = new Date(Date.now() - CHECK_WINDOW_MS);
  // One connection, one snapshot (CLAUDE.md §40.1 — pooler connection_limit=1).
  // Checks are loaded on the server for EVERY scoped business — the status
  // pill, the business summary and "Varsayılan platform yap" must never
  // render from an empty check set (a failing link read as "Bağlı" until a
  // client fetch returned), and switching business stays instant.
  const [restaurantRows, checkRows] = await prisma.$transaction([
    prisma.restaurant.findMany({
      where: { id: { in: scopedIds } },
      select: {
        id: true,
        name: true,
        category: true,
        address: true,
        city: true,
        googlePlaceId: true,
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
        // Stage 97 — WhatsApp review opt-in (CLAUDE.md §19.1).
        whatsappReviewEnabled: true,
        whatsappReviewMessage: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    latestChecksForRestaurants(scopedIds, since),
  ]);
  const restaurants = restaurantRows as RestaurantProviderRow[];

  const externalDisabledIds = new Set(
    restaurants.filter((restaurant) => !restaurant.externalPlatformsEnabled).map((restaurant) => restaurant.id),
  );
  const checksByRestaurant: Record<string, Record<string, LatestCheckLite>> = {};
  for (const check of checkRows) {
    // Admin-gated external providers read as "Kapalı" regardless of their
    // last check — mirror the overview and GET /integrations/checks.
    if (externalDisabledIds.has(check.restaurantId) && isExternalReviewProvider(check.provider)) continue;
    (checksByRestaurant[check.restaurantId] ??= {})[check.provider] = {
      ok: check.ok,
      checkedAt: new Date(check.checkedAt).toISOString(),
      error: check.error,
      statusCode: check.statusCode,
    };
  }

  // Query-only on the server; the client resolves the remembered business
  // after mount (skeleton until then when the URL names none).
  const selectedRestaurantId = resolveActiveRestaurantId({
    restaurants,
    queryRestaurantId: query?.restaurantId ?? query?.restaurant,
    storedRestaurantId: null,
  });

  const linksLabel = isTr ? PLATFORM_LINKS_LABEL.tr : PLATFORM_LINKS_LABEL.en;

  if (restaurants.length === 0 || !selectedRestaurantId) {
    return (
      <div className={PAGE_WRAPPER} data-focus-clearance>
        <div>
          <Link
            href={`/${locale}/dashboard/platforms`}
            className="bz-mono mb-3 inline-flex min-h-[44px] items-center sm:min-h-[32px] gap-1 rounded text-[11px] text-[#737373] hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2! focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2"
          >
            <ArrowLeft size={12} aria-hidden="true" />
            {linksLabel}
          </Link>
          <PageHeader
            titleScale="compact"
            eyebrow={linksLabel.toLocaleUpperCase(isTr ? 'tr-TR' : 'en-US')}
            title={platform.name}
            description={
              isTr
                ? 'Platform linkini yönetmek için önce bir işletme ekleyin.'
                : 'Add a business first to manage this platform link.'
            }
          />
        </div>
        <div className="bz-card p-10">
          <EmptyState
            icon={<Plug size={22} strokeWidth={1.5} />}
            title={isTr ? 'Henüz işletmen yok' : 'No business yet'}
            body={
              isTr
                ? 'İlk işletmeni ekledikten sonra platform bağlantılarını yönetebilirsin.'
                : 'Add your first business to start managing platform links.'
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

  return (
    <div className={PAGE_WRAPPER} data-focus-clearance>
      <PlatformProviderWizard
        locale={locale}
        platform={platform}
        restaurants={restaurants.map<ProviderRestaurantInfo>((restaurant) => ({ ...restaurant }))}
        selectedRestaurantId={selectedRestaurantId}
        checksByRestaurant={checksByRestaurant}
        serverNow={Date.now()}
      />
    </div>
  );
}
