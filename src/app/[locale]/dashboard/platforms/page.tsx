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
  Settings,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { PageHeader, StatCard, EmptyState, Badge } from '@/components/ui';
import type { Locale } from '@/lib/translations';
import {
  MANAGED_PLATFORM_DEFS,
  MANAGEABLE_PLATFORM_DEFS,
  type PlatformEnabledField,
  type PlatformUrlField,
} from '@/lib/platform-management';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

type RestaurantPlatformRow = {
  id: string;
  name: string;
  externalPlatformsEnabled: boolean;
} & Record<PlatformUrlField, string | null> &
  Record<PlatformEnabledField, boolean>;

export default async function OwnerPlatformsPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
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

  const restaurantIds = restaurants.map((r) => r.id);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [pendingIssuesCount, totalReviewsThisMonth] = await prisma.$transaction([
    prisma.platformLinkCheck.count({
      where: {
        restaurantId: { in: restaurantIds },
        checkedAt: { gte: last24h },
        ok: false,
      },
    }),
    prisma.feedback.count({
      where: {
        restaurantId: { in: restaurantIds },
        createdAt: { gte: monthStart },
      },
    }),
  ]);

  const platformSummaries = MANAGED_PLATFORM_DEFS.map((platform) => {
    let connected = 0;
    let urlSet = 0;
    if (platform.urlField) {
      for (const restaurant of restaurants) {
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
    return { ...platform, connected, urlSet, total: restaurants.length };
  });

  const manageableSummaries = platformSummaries.filter((platform) => !platform.comingSoon && platform.urlField);
  const totalConnected = manageableSummaries.reduce((sum, platform) => sum + platform.connected, 0);
  const totalSlots = restaurants.length * MANAGEABLE_PLATFORM_DEFS.length;
  const activeCategorySet = new Set(
    manageableSummaries.filter((platform) => platform.connected > 0).map((platform) => platform.category),
  );
  const activeCategoryCount = activeCategorySet.size;
  const firstMissing =
    manageableSummaries.find((platform) => platform.urlSet < platform.total) ??
    manageableSummaries.find((platform) => platform.slug === 'google');
  const newConnectionHref = `/${locale}/dashboard/platforms/${firstMissing?.slug ?? 'google'}`;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={isTr ? 'PLATFORM BAĞLANTILARI' : 'PLATFORM LINKS'}
        title={isTr ? 'Platform Bağlantıları' : 'Platform Links'}
        description={
          isTr
            ? 'Yorumları, siparişleri ve mesajları tek panelde topla. Platformları tüm işletmeler için tek ekrandan yönet.'
            : 'Collect reviews, orders, and messages in one panel. Manage every platform across all businesses from one workspace view.'
        }
        actions={
          <div className="flex items-center gap-2">
            <a
              href={`/api/dashboard/platforms/log/export`}
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {platformSummaries.map((platform) => {
          const isConnected = platform.connected > 0;
          const isPartial = platform.urlSet > platform.connected;
          const status = platform.comingSoon
            ? 'coming_soon'
            : isConnected
              ? 'connected'
              : isPartial
                ? 'inactive'
                : 'available';
          const statusBadgeKind: 'ok' | 'warn' | 'ghost' | 'info' =
            status === 'connected'
              ? 'ok'
              : status === 'inactive'
                ? 'warn'
                : status === 'coming_soon'
                  ? 'info'
                  : 'ghost';
          const statusLabel = isTr
            ? status === 'connected'
              ? 'Bağlı'
              : status === 'inactive'
                ? 'Pasif'
                : status === 'coming_soon'
                  ? 'Yakında'
                  : 'Hazır'
            : status === 'connected'
              ? 'Connected'
              : status === 'inactive'
                ? 'Inactive'
                : status === 'coming_soon'
                  ? 'Coming soon'
                  : 'Available';

          return (
            <div key={platform.slug} className="bz-card flex flex-col gap-3.5 p-4">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border text-[13px] font-semibold bz-h-tight"
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
                  <div className="truncate text-[14px] font-semibold tracking-[-0.01em] text-[#0A0A0A]">
                    {platform.name}
                  </div>
                  <div className="bz-mono mt-0.5 text-[10.5px] uppercase tracking-[0.08em] text-[#737373]">
                    {isTr ? platform.categoryLabel.tr : platform.categoryLabel.en}
                  </div>
                </div>
                <Badge kind={statusBadgeKind}>{statusLabel}</Badge>
              </div>

              {platform.comingSoon ? (
                <div className="rounded-[10px] border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-3">
                  <div className="pulse-eyebrow mb-1 text-[9.5px] text-[#737373]">
                    {isTr ? 'BACKEND HAZIR' : 'BACKEND READY'}
                  </div>
                  <p className="text-[11.5px] leading-[1.5] text-[#525252]">
                    {isTr
                      ? 'AutomationRule schema mevcut; arayüz bir sonraki fazda açılacak.'
                      : 'AutomationRule schema is in place; UI opens in the next phase.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-[#EDEDED]">
                  <div className="bg-white p-2.5">
                    <div className="pulse-eyebrow mb-0.5 text-[9.5px] text-[#737373]">
                      {isTr ? 'BAGLI' : 'CONNECTED'}
                    </div>
                    <div className="bz-mono text-[12px] font-semibold tabular-nums text-[#0A0A0A]">
                      {platform.connected}/{platform.total}
                    </div>
                  </div>
                  <div className="border-l border-[#EDEDED] bg-white p-2.5">
                    <div className="pulse-eyebrow mb-0.5 text-[9.5px] text-[#737373]">
                      {isTr ? 'URL VAR' : 'URL SET'}
                    </div>
                    <div className="bz-mono text-[12px] font-semibold tabular-nums text-[#0A0A0A]">
                      {platform.urlSet}/{platform.total}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {platform.comingSoon ? (
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="bz-btn flex-1 cursor-not-allowed opacity-50"
                    title={isTr ? 'Yakında bağlanacak' : 'Coming soon'}
                  >
                    {isTr ? 'Yakında' : 'Coming soon'}
                  </button>
                ) : (
                  <Link
                    href={`/${locale}/dashboard/platforms/${platform.slug}`}
                    className="bz-btn-ghost inline-flex flex-1 items-center justify-center gap-1.5 text-[12px]"
                  >
                    <Settings size={11} strokeWidth={2} />
                    {isTr ? 'Yönet' : 'Manage'}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bz-card-soft flex items-center gap-3 p-4">
        <ExternalLink size={14} strokeWidth={2} className="shrink-0 text-[#737373]" />
        <p className="flex-1 text-[12.5px] text-[#525252]">
          {isTr
            ? 'Her platformun URL düzenleme, aktiflik ve test akışları artık kendi workspace yönetim sayfasında. İşletme ayarları tekil restoran detayları için korunur.'
            : 'Each platform now has its own workspace management page for URL editing, activation, and tests. Business settings remain available for single-restaurant details.'}
        </p>
        <Link href={`/${locale}/dashboard/restaurants`} className="bz-btn-ghost text-[12px]">
          {isTr ? 'İşletme listesi' : 'Business list'}
        </Link>
      </div>
    </div>
  );
}
