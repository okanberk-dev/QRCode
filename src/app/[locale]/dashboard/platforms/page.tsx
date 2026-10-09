import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  Layers,
  MessageSquare,
  Plug,
  Plus,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getScopedRestaurantIdsForUserPayload } from '@/lib/panel-access';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { PageHeader, StatCard, EmptyState } from '@/components/ui';
import type { Locale } from '@/lib/translations';
import { resolveActiveRestaurantId } from '@/lib/active-business';
import {
  MANAGED_PLATFORM_DEFS,
  MANAGEABLE_PLATFORM_DEFS,
  type PlatformEnabledField,
  type PlatformUrlField,
} from '@/lib/platform-management';
import PlatformsClient, {
  type PlatformSummaryRow,
  type RestaurantInfo,
} from './_components/PlatformsClient';
import { latestChecksForRestaurants } from '@/lib/platform-link-test';
import { isExternalReviewProvider } from '@/lib/restaurant-features';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ restaurantId?: string; restaurant?: string }>;
}

type RestaurantPlatformRow = {
  id: string;
  name: string;
  category: string;
  address: string | null;
  city: string | null;
  googlePlaceId: string | null;
  externalPlatformsEnabled: boolean;
  defaultRedirectPlatform: string | null;
  reservationUrl: string | null;
  website: string | null;
  otherPlatformUrl: string | null;
  otherPlatformLabel: string | null;
  otherPlatformEnabled: boolean;
} & Record<PlatformUrlField, string | null> &
  Record<PlatformEnabledField, boolean>;

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
  // (getScopedRestaurantIds). `userId: payload.userId` hid every
  // restaurant from invited team members.
  const scopedIds = await getScopedRestaurantIdsForUserPayload({
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
  });
  const restaurants = (await prisma.restaurant.findMany({
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
      reservationUrl: true,
      website: true,
      otherPlatformUrl: true,
      otherPlatformLabel: true,
      otherPlatformEnabled: true,
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
    },
    orderBy: { createdAt: 'asc' },
  })) as RestaurantPlatformRow[];

  if (restaurants.length === 0) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-5">
        <PageHeader
          eyebrow={isTr ? 'PLATFORM BAĞLANTILARI' : 'PLATFORM LINKS'}
          title={isTr ? 'Platform Bağlantıları' : 'Platform Links'}
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

  const selectedRestaurantId = resolveActiveRestaurantId({
    restaurants,
    queryRestaurantId: query?.restaurantId ?? query?.restaurant,
    storedRestaurantId: null,
  });
  const selectedRestaurants = selectedRestaurantId
    ? restaurants.filter((restaurant) => restaurant.id === selectedRestaurantId)
    : restaurants;
  const restaurantIds = selectedRestaurants.map((r) => r.id);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // "Bekleyen sorun" = son 24 saatte EN SON testi başarısız olan bağlantı
  // sayısı (restoran × provider). Admin `externalPlatformsEnabled` kapalı
  // işletmelerde external provider satırları sayılmaz — owner o platformları
  // panelde göremediği için düzeltemeyeceği bir sayaç görmemeli.
  const externalDisabledIds = new Set(
    selectedRestaurants.filter((r) => !r.externalPlatformsEnabled).map((r) => r.id),
  );
  const [latestChecks, totalReviewsThisMonth] = await prisma.$transaction([
    latestChecksForRestaurants(restaurantIds, last24h),
    prisma.feedback.count({
      where: {
        restaurantId: { in: restaurantIds },
        createdAt: { gte: monthStart },
      },
    }),
  ]);
  const pendingIssuesCount = latestChecks.filter((check) => {
    if (check.ok) return false;
    if (externalDisabledIds.has(check.restaurantId) && isExternalReviewProvider(check.provider)) return false;
    return true;
  }).length;

  const platformSummaries = MANAGED_PLATFORM_DEFS.map((platform) => {
    let connected = 0;
    let urlSet = 0;
    if (platform.urlField) {
      for (const restaurant of selectedRestaurants) {
        const url = restaurant[platform.urlField];
        const hasUrl = typeof url === 'string' && url.trim().length > 0;
        const isEnabled = platform.enabledField ? Boolean(restaurant[platform.enabledField]) : true;
        const externalAvailable = !platform.externalReview || restaurant.externalPlatformsEnabled;
        if (hasUrl) {
          urlSet += 1;
          if (isEnabled && externalAvailable) connected += 1;
        }
      }
    }
    return { ...platform, connected, urlSet, total: selectedRestaurants.length };
  });

  const manageableSummaries = platformSummaries.filter((platform) => !platform.comingSoon && platform.urlField);
  const totalConnected = manageableSummaries.reduce((sum, platform) => sum + platform.connected, 0);
  const totalSlots = selectedRestaurants.length * MANAGEABLE_PLATFORM_DEFS.length;
  const activeCategorySet = new Set(
    manageableSummaries.filter((platform) => platform.connected > 0).map((platform) => platform.category),
  );
  const activeCategoryCount = activeCategorySet.size;
  const newConnectionHref = `/${locale}/dashboard/platforms/google${
    selectedRestaurantId ? `?restaurantId=${encodeURIComponent(selectedRestaurantId)}` : ''
  }`;

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-5">
      <PageHeader
        eyebrow={isTr ? 'PLATFORM BAĞLANTILARI' : 'PLATFORM LINKS'}
        title={isTr ? 'Platform Bağlantıları' : 'Platform Links'}
        description={
          isTr
            ? 'Yorum, sosyal medya ve mesaj bağlantılarını seçili işletme için tek akışta yönet.'
            : 'Manage review, social, and messaging links for the selected business in one flow.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/dashboard/platforms/log/export?locale=${locale}${
                selectedRestaurantId ? `&restaurantId=${encodeURIComponent(selectedRestaurantId)}` : ''
              }`}
              download
              className="bz-btn inline-flex items-center gap-1.5 text-[12.5px]"
              title={isTr ? 'Son test sonuçlarını CSV olarak indir' : 'Download recent test results as CSV'}
            >
              <Download size={13} strokeWidth={2} />
              {isTr ? "Bağlantı log'u" : 'Connection log'}
            </a>
            <Link
              href={newConnectionHref}
              className="bz-btn-primary inline-flex items-center gap-1.5 text-[12.5px]"
            >
              <Plus size={13} strokeWidth={2} />
              {isTr ? 'Yeni bağlantı' : 'New connection'}
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard
          label={isTr ? 'Bağlı kanal' : 'Connected'}
          value={`${totalConnected}/${totalSlots}`}
          icon={<CheckCircle2 size={14} className="text-[#16A34A]" />}
          delta={
            isTr
              ? `${MANAGEABLE_PLATFORM_DEFS.length} aktif platform`
              : `${MANAGEABLE_PLATFORM_DEFS.length} active platforms`
          }
          deltaKind="neutral"
        />
        <StatCard
          label={isTr ? 'Bekleyen sorun' : 'Pending issue'}
          value={pendingIssuesCount.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          icon={
            <AlertTriangle
              size={14}
              className={pendingIssuesCount > 0 ? 'text-[#DC2626]' : 'text-[#737373]'}
            />
          }
          delta={
            pendingIssuesCount > 0
              ? isTr
                ? 'son 24 saat'
                : 'last 24 hours'
              : isTr
                ? 'tüm bağlantılar sağlıklı'
                : 'all healthy'
          }
          deltaKind={pendingIssuesCount > 0 ? 'down' : 'neutral'}
        />
        <StatCard
          label={isTr ? 'Toplam yorum' : 'Total reviews'}
          value={totalReviewsThisMonth.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          icon={<MessageSquare size={14} />}
          delta={isTr ? 'bu ay' : 'this month'}
          deltaKind="neutral"
        />
        <StatCard
          label={isTr ? 'Aktif kategori' : 'Active category'}
          value={`${activeCategoryCount}/3`}
          icon={<Layers size={14} />}
          delta={isTr ? 'yorum · sosyal · mesaj' : 'review · social · message'}
          deltaKind="neutral"
        />
      </div>

      <div
        className="bz-card flex flex-wrap items-center gap-1.5 p-3"
        role="group"
        aria-label={isTr ? 'Platform kategorileri' : 'Platform categories'}
      >
        {[
          { id: 'all', tr: 'Tümü', en: 'All', count: MANAGED_PLATFORM_DEFS.length },
          {
            id: 'review',
            tr: 'Yorum',
            en: 'Review',
            count: MANAGED_PLATFORM_DEFS.filter((platform) => platform.category === 'review').length,
          },
          {
            id: 'social',
            tr: 'Sosyal',
            en: 'Social',
            count: MANAGED_PLATFORM_DEFS.filter((platform) => platform.category === 'social').length,
          },
          {
            id: 'message',
            tr: 'Mesaj',
            en: 'Messaging',
            count: MANAGED_PLATFORM_DEFS.filter((platform) => platform.category === 'message').length,
          },
          {
            id: 'api',
            tr: 'API',
            en: 'API',
            count: MANAGED_PLATFORM_DEFS.filter((platform) => platform.category === 'api').length,
          },
        ].map((category, index) => (
          <span
            key={category.id}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium ${
              index === 0
                ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                : 'border-[#EDEDED] bg-white text-[#525252]'
            }`}
          >
            {isTr ? category.tr : category.en}
            <span
              className={`bz-mono rounded-full px-1.5 py-0.5 text-[10.5px] tabular-nums ${
                index === 0 ? 'bg-white/15 text-white' : 'bg-[#F5F5F5] text-[#737373]'
              }`}
            >
              {category.count}
            </span>
          </span>
        ))}
        <span className="bz-mono ml-auto text-[11px] text-[#737373]">
          {isTr
            ? `${MANAGED_PLATFORM_DEFS.length} servis`
            : `${MANAGED_PLATFORM_DEFS.length} services`}
        </span>
      </div>

      {/* Platform card grid + restaurant selector + sector filter
          (CLAUDE.md §38.137 Stage 56). Server tarafı KPI + kategori chip'leri
          intact; client island sadece logo render + filtreleme yapar. */}
      <PlatformsClient
        locale={locale}
        restaurants={restaurants.map<RestaurantInfo>((r) => ({ ...r }))}
        platformSummaries={platformSummaries as PlatformSummaryRow[]}
        selectedRestaurantId={selectedRestaurantId}
      />

      <div className="bz-card-soft flex items-center gap-3 p-4">
        <ExternalLink size={14} strokeWidth={2} className="shrink-0 text-[#737373]" />
        <p className="flex-1 text-[12.5px] text-[#525252]">
          {isTr
            ? 'Platform bağlantıları için tek kanonik yer burasıdır. Diğer işletmelere geçmek için sol üstteki işletme seçiciyi kullanın.'
            : 'This is the single canonical place for platform links. Use the top-left business selector to switch businesses.'}
        </p>
        <Link href={`/${locale}/dashboard/restaurants`} className="bz-btn-ghost text-[12px]">
          {isTr ? 'İşletme listesi' : 'Business list'}
        </Link>
      </div>
    </div>
  );
}
