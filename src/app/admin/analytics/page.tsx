import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isAdminRole, verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader, PLATFORMS, type PlatformId } from '@/components/ui';
import { AnalyticsKpiGrid } from '@/components/dashboard/analytics/AnalyticsKpiGrid';
import { AnalyticsLiveIndicator } from '@/components/dashboard/analytics/AnalyticsLiveIndicator';
import { MainTrendChart } from '@/components/dashboard/analytics/MainTrendChart';
import { ChannelDistributionMini } from '@/components/dashboard/analytics/ChannelDistributionMini';
import { SentimentDonut } from '@/components/dashboard/analytics/SentimentDonut';
import { TopMentionsPolarity } from '@/components/dashboard/analytics/TopMentionsPolarity';
import { HeatmapDayHour } from '@/components/dashboard/analytics/HeatmapDayHour';
import { AiInsightsCard } from '@/components/dashboard/analytics/AiInsightsCard';
import AdminAnalyticsExtras from '@/components/admin/AdminAnalyticsExtras';
import { buildPanelAnalyticsData } from '@/lib/panel-analytics-data';
import { hasPermission } from '@/lib/rbac';
import { adminLandingPath } from '@/lib/admin-landing';

export const dynamic = 'force-dynamic';

const PLATFORM_OPTIONS: PlatformId[] = [
  'google',
  'yemeksepeti',
  'getir',
  'trendyol_go',
  'tripadvisor',
];

const RANGE_OPTIONS = ['7d', '30d', '90d', '1y'] as const;

function getStringClaim(payload: Awaited<ReturnType<typeof verifyJwt>>, key: string) {
  const value = payload?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function withParam(current: Record<string, string | undefined>, key: string, value: string | null) {
  const params = new URLSearchParams();
  for (const [paramKey, paramValue] of Object.entries(current)) {
    if (paramValue) params.set(paramKey, paramValue);
  }
  if (value && value !== 'all' && value !== '30d') params.set(key, value);
  else params.delete(key);
  const qs = params.toString();
  return qs ? `/admin/analytics?${qs}` : '/admin/analytics';
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; platform?: string }>;
}) {
  const cookieStore = await cookies();
  const adminLocale = cookieStore.get('ADMIN_LOCALE')?.value === 'en' ? 'en' : 'tr';
  const isTr = adminLocale === 'tr';
  const token = cookieStore.get('admin_token')?.value;
  if (!token) redirect('/admin');

  const payload = await verifyJwt(token);
  const role = getStringClaim(payload, 'role');
  if (!payload || !isAdminRole(role)) redirect('/admin');

  const sp = await searchParams;
  const rangeKey = sp.range && RANGE_OPTIONS.includes(sp.range as (typeof RANGE_OPTIONS)[number])
    ? sp.range
    : '30d';
  const platformFilter = sp.platform && sp.platform !== 'all' ? sp.platform : null;
  const currentParams = { range: sp.range, platform: sp.platform };

  const adminId = getStringClaim(payload, 'id') || 'env-admin';
  // Staff has no business scope: without `analytics:read` it must not see
  // every tenant's numbers (the sidebar hid the link, the page did not check).
  if (role === 'staff' && !(await hasPermission(adminId, 'analytics', 'read'))) {
    redirect(await adminLandingPath(adminId, role, '/admin/analytics'));
  }
  const tokenRestaurantId = getStringClaim(payload, 'restaurantId');
  // Only a manager's scope reads this row; skip the round-trip otherwise.
  const adminUser = role === 'manager' && adminId !== 'env-admin'
    ? await prisma.adminUser.findUnique({
        where: { id: adminId },
        select: { restaurantId: true },
      })
    : null;
  const managerRestaurantId = role === 'manager'
    ? adminUser?.restaurantId || tokenRestaurantId
    : null;

  const restaurants = await prisma.restaurant.findMany({
    where: role === 'manager'
      ? managerRestaurantId
        ? { id: managerRestaurantId }
        : { id: '__none__' }
      : {},
    select: { id: true, name: true, targetRating: true },
    orderBy: { createdAt: 'asc' },
  });

  const data = await buildPanelAnalyticsData({
    restaurants,
    rangeKey,
    platformFilter,
    locale: adminLocale,
  });

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-7 lg:py-8 space-y-3.5">
      <AnalyticsLiveIndicator isTr={isTr} />

      <PageHeader
        titleScale="compact"
        eyebrow={isTr ? 'ADMIN ANALİTİK' : 'ADMIN ANALYTICS'}
        title={isTr ? 'Analitik' : 'Analytics'}
        description={
          isTr
            ? role === 'manager'
              ? 'Yetkili olduğun işletmenin yorum ve kanal metrikleri.'
              : 'Tüm işletmelerin yorum ve kanal metrikleri.'
            : role === 'manager'
              ? 'Review and channel metrics for your assigned business.'
              : 'Review and channel metrics across all businesses.'
        }
      />

      {/* Range + platform filters live in their own toolbar row (owner
          analytics parity). As PageHeader `actions` the non-shrinking chip
          row squeezed the title to "An/ali/tik" at tablet widths. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1 rounded-full border border-pn-line bg-white p-1">
          {RANGE_OPTIONS.map((range) => (
            <Link
              key={range}
              href={withParam(currentParams, 'range', range)}
              className={`rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-colors ${
                rangeKey === range
                  ? 'bg-pn-ink text-white'
                  : 'text-[#525252] hover:bg-pn-canvas'
              }`}
            >
              {range.toUpperCase()}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={withParam(currentParams, 'platform', null)}
            className={`rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${
              !platformFilter
                ? 'border-pn-ink bg-pn-ink text-white'
                : 'border-pn-line text-[#525252] hover:bg-pn-canvas'
            }`}
          >
            {isTr ? 'Tümü' : 'All'}
          </Link>
          {PLATFORM_OPTIONS.map((platform) => (
            <Link
              key={platform}
              href={withParam(currentParams, 'platform', platform)}
              className={`rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                platformFilter === platform
                  ? 'border-pn-ink bg-white text-pn-ink'
                  : 'border-pn-line text-[#525252] hover:bg-pn-canvas'
              }`}
            >
              {PLATFORMS[platform].label}
            </Link>
          ))}
        </div>
      </div>

      <AnalyticsKpiGrid kpis={data.kpis} isTr={isTr} />
      <MainTrendChart points={data.platformTrendPoints} isTr={isTr} />

      <div className="grid gap-3.5 lg:grid-cols-[1.4fr_1fr_1fr]">
        <ChannelDistributionMini channels={data.channels} isTr={isTr} />
        <SentimentDonut
          pos={data.sentiment.pos}
          neu={data.sentiment.neu}
          neg={data.sentiment.neg}
          totalSample={data.sentiment.total}
          isTr={isTr}
        />
        <TopMentionsPolarity themes={data.themes} isTr={isTr} />
      </div>

      <section className="bz-card p-5 sm:p-6">
        <HeatmapDayHour cells={data.heatmapCells} isTr={isTr} />
      </section>

      <AiInsightsCard
        trend={data.insight.trend}
        win={data.insight.win}
        risk={data.insight.risk}
        isTr={isTr}
        eyebrowLabel={isTr ? 'ADMIN İÇGÖRÜLER' : 'ADMIN INSIGHTS'}
      />

      <AdminAnalyticsExtras isTr={isTr} />
    </div>
  );
}
