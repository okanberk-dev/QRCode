import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CheckCircle2, MousePointerClick, Plug } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { EmptyState, PageHeader, StatCard } from '@/components/ui';
import type { Locale } from '@/lib/translations';
import {
  getManageablePlatform,
  type PlatformEnabledField,
  type PlatformUrlField,
} from '@/lib/platform-management';
import {
  PlatformProviderManager,
  type PlatformLatestCheck,
  type PlatformManagerConfig,
  type PlatformManagerRow,
} from '@/components/dashboard/platforms/PlatformProviderManager';
import {
  PlatformLowFeedbackPanel,
  type PlatformLowFeedbackItem,
} from '@/components/dashboard/platforms/PlatformLowFeedbackPanel';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string; provider: string }>;
}

type RestaurantPlatformRow = {
  id: string;
  name: string;
  externalPlatformsEnabled: boolean;
} & Record<PlatformUrlField, string | null> &
  Record<PlatformEnabledField, boolean>;

export default async function PlatformProviderPage({ params }: PageProps) {
  const { locale: localeParam, provider: providerSlug } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';
  const isTr = locale === 'tr';
  const platform = getManageablePlatform(providerSlug);
  if (!platform) redirect(`/${locale}/dashboard/platforms`);

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/platforms/${platform.slug}`);
  }
  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/platforms/${platform.slug}`);
  }
  const role = typeof payload.role === 'string' ? payload.role : 'restaurant_owner';
  if (isAdminRole(role)) {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/platforms/${platform.slug}`);
  }

  const restaurants = (await prisma.restaurant.findMany({
    where: { userId: payload.userId },
    select: {
      id: true,
      name: true,
      externalPlatformsEnabled: true,
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
    },
    orderBy: { createdAt: 'asc' },
  })) as RestaurantPlatformRow[];

  if (restaurants.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow={isTr ? 'PLATFORM YÖNETİMİ' : 'PLATFORM MANAGEMENT'}
          title={platform.name}
          description={
            isTr
              ? 'Bu platformu yönetmek için önce bir işletme ekle.'
              : 'Add a business before managing this platform.'
          }
          actions={
            <Link href={`/${locale}/dashboard/platforms`} className="bz-btn inline-flex items-center gap-1.5">
              <ArrowLeft size={13} />
              {isTr ? 'Platformlar' : 'Platforms'}
            </Link>
          }
        />
        <div className="bz-card p-10">
          <EmptyState
            icon={<Plug size={22} strokeWidth={1.5} />}
            title={isTr ? 'Henüz işletmen yok' : 'No business yet'}
            body={
              isTr
                ? 'İlk restoranını ekledikten sonra platform bağlantılarını buradan yönetebilirsin.'
                : 'Add your first restaurant to manage platform links here.'
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

  const restaurantIds = restaurants.map((restaurant) => restaurant.id);
  const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const lowFeedbackWhere = {
    restaurantId: { in: restaurantIds },
    platform: platform.provider,
    rating: { lte: 3 },
  } as const;

  const [latestChecks, redirectGroups, lowFeedbackCount, lowFeedbackRows] =
    await prisma.$transaction([
      prisma.platformLinkCheck.findMany({
        where: {
          restaurantId: { in: restaurantIds },
          provider: platform.provider,
        },
        orderBy: { checkedAt: 'desc' },
        take: Math.max(200, restaurantIds.length * 4),
        select: {
          restaurantId: true,
          ok: true,
          statusCode: true,
          latencyMs: true,
          error: true,
          checkedAt: true,
        },
      }),
      prisma.platformRedirectEvent.groupBy({
        by: ['restaurantId'],
        where: {
          restaurantId: { in: restaurantIds },
          provider: platform.provider,
          createdAt: { gte: last30d },
        },
        _count: { _all: true },
      }),
      prisma.feedback.count({
        where: lowFeedbackWhere,
      }),
      prisma.feedback.findMany({
        where: lowFeedbackWhere,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          rating: true,
          name: true,
          comment: true,
          branch: true,
          tableNumber: true,
          hasKvkkConsent: true,
          createdAt: true,
          restaurant: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

  const latestByRestaurant = new Map<string, PlatformLatestCheck>();
  for (const check of latestChecks) {
    if (latestByRestaurant.has(check.restaurantId)) continue;
    latestByRestaurant.set(check.restaurantId, {
      ok: check.ok,
      statusCode: check.statusCode,
      latencyMs: check.latencyMs,
      error: check.error,
      checkedAt: check.checkedAt.toISOString(),
    });
  }

  const redirectsByRestaurant = new Map(
    redirectGroups.map((group) => [group.restaurantId, group._count._all]),
  );

  const rows: PlatformManagerRow[] = restaurants.map((restaurant) => ({
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    url: restaurant[platform.urlField] ?? '',
    enabled: platform.enabledField ? Boolean(restaurant[platform.enabledField]) : true,
    externalPlatformsEnabled: restaurant.externalPlatformsEnabled,
    redirects30d: redirectsByRestaurant.get(restaurant.id) ?? 0,
    latestCheck: latestByRestaurant.get(restaurant.id) ?? null,
  }));

  const lowFeedbackItems: PlatformLowFeedbackItem[] = lowFeedbackRows.map((row) => ({
    id: row.id,
    rating: row.rating,
    name: row.hasKvkkConsent ? row.name : null,
    comment: row.comment,
    branch: row.branch,
    tableNumber: row.tableNumber,
    createdAt: row.createdAt.toISOString(),
    restaurantId: row.restaurant?.id ?? null,
    restaurantName: row.restaurant?.name ?? null,
  }));

  const connectedCount = rows.filter(
    (row) =>
      row.url.trim().length > 0 &&
      row.enabled &&
      (!platform.externalReview || row.externalPlatformsEnabled),
  ).length;
  const missingCount = rows.filter((row) => row.url.trim().length === 0).length;
  const issueCount = rows.filter((row) => row.latestCheck?.ok === false).length;
  const redirects30d = rows.reduce((sum, row) => sum + row.redirects30d, 0);

  const platformConfig: PlatformManagerConfig = {
    slug: platform.slug,
    provider: platform.provider,
    name: platform.name,
    category: platform.category,
    categoryLabel: platform.categoryLabel,
    accent: platform.accent,
    initials: platform.initials,
    placeholder: platform.placeholder,
    urlField: platform.urlField,
    enabledField: platform.enabledField,
    externalReview: platform.externalReview,
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={isTr ? 'PLATFORM YÖNETİMİ' : 'PLATFORM MANAGEMENT'}
        title={platform.name}
        description={
          isTr
            ? 'Bu platformun bağlantılarını tüm işletmeler için tek ekrandan yönet, kaydet ve test et.'
            : 'Manage, save, and test this platform across every business from one workspace screen.'
        }
        actions={
          <Link href={`/${locale}/dashboard/platforms`} className="bz-btn inline-flex items-center gap-1.5">
            <ArrowLeft size={13} />
            {isTr ? 'Platformlar' : 'Platforms'}
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard
          label={isTr ? 'Bağlı işletme' : 'Connected businesses'}
          value={`${connectedCount}/${rows.length}`}
          icon={<CheckCircle2 size={14} className="text-[#16A34A]" />}
          delta={isTr ? platform.categoryLabel.tr : platform.categoryLabel.en}
          deltaKind="neutral"
        />
        <StatCard
          label={isTr ? 'Eksik URL' : 'Missing URL'}
          value={missingCount.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          icon={<Plug size={14} />}
          delta={isTr ? 'tamamlanacak işletme' : 'businesses to complete'}
          deltaKind="neutral"
        />
        <StatCard
          label={isTr ? 'Test sorunu' : 'Test issues'}
          value={issueCount.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          icon={
            <AlertTriangle
              size={14}
              className={issueCount > 0 ? 'text-[#DC2626]' : 'text-[#737373]'}
            />
          }
          delta={isTr ? 'son kayıtlı test' : 'latest saved test'}
          deltaKind={issueCount > 0 ? 'down' : 'neutral'}
        />
        <StatCard
          label={isTr ? '30G yönlendirme' : '30D redirects'}
          value={redirects30d.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          icon={<MousePointerClick size={14} />}
          delta={isTr ? 'son 30 gün' : 'last 30 days'}
          deltaKind="neutral"
        />
      </div>

      <div className="bz-card-soft flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border text-[13px] font-semibold bz-h-tight"
          style={{
            backgroundColor: `${platform.accent}14`,
            color: platform.accent,
            borderColor: `${platform.accent}30`,
          }}
          aria-hidden
        >
          {platform.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="pulse-eyebrow text-[10px] text-[#737373]">
            {isTr ? 'WORKSPACE KAPSAMI' : 'WORKSPACE SCOPE'}
          </div>
          <p className="mt-1 text-[12.5px] leading-5 text-[#525252]">
            {isTr
              ? 'Kaydetme işlemi yalnız bu platformun URL ve aktiflik alanlarını günceller. Test sonucu PlatformLinkCheck kaydı olarak saklanır.'
              : 'Save updates only this platform URL and activation fields. Tests are stored as PlatformLinkCheck records.'}
          </p>
        </div>
      </div>

      <PlatformProviderManager platform={platformConfig} rows={rows} locale={locale} />

      <PlatformLowFeedbackPanel
        providerSlug={platform.slug}
        platformName={platform.name}
        locale={locale}
        total={lowFeedbackCount}
        initialItems={lowFeedbackItems}
      />
    </div>
  );
}
