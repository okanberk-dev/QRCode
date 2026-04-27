import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Pencil, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Locale } from '@/lib/translations';
import {
  Badge,
  Eyebrow,
  PageHeader,
  PlatformChip,
  PLATFORMS,
  type PlatformId,
} from '@/components/ui';
import DefaultRedirectPicker from '@/components/dashboard/DefaultRedirectPicker';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Platform bağlantıları — Buaze' : 'Review platforms — Buaze',
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

interface PlatformRow {
  id: PlatformId;
  url: string | null;
  enabled: boolean;
  isDefault: boolean;
  monthlyClicks: number;
}

export default async function PlatformsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const isTr = locale === 'tr';

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login`);
  const payload = await verifyJwt(token);
  if (!payload) redirect(`/${locale}/auth/login`);

  // Read existing per-restaurant platform URLs from the User → Restaurants
  // relation (no schema change). Project them into the platform-row shape
  // expected by the design. URLs not configured at the restaurant level
  // come back null — the UI shows "Henüz bağlanmadı".
  const restaurants = await prisma.restaurant.findMany({
    where: { userId: payload.userId as string },
    select: {
      id: true,
      name: true,
      googleReviewUrl: true,
      yemekSepetiUrl: true,
      getirYemekUrl: true,
      trendyolYemekUrl: true,
      defaultRedirectPlatform: true,
    },
  });

  // Phase 1 — design's "Bu ay" / "This month" metric per platform card.
  // Counts high-rating (≥4) feedbacks recorded in the last 30 days that
  // were tagged with a platform — i.e. redirected to that external review
  // surface. Schema unchanged: Feedback.platform is already populated by
  // the public review flow (see /r/[slug]/page.tsx).
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const platformCounts = restaurants.length
    ? await prisma.feedback.groupBy({
        by: ['platform'],
        where: {
          restaurantId: { in: restaurants.map((r) => r.id) },
          createdAt: { gte: monthAgo },
          rating: { gte: 4 },
          platform: { not: null },
        },
        _count: { _all: true },
      })
    : [];
  const clicksByPlatform = new Map<string, number>(
    platformCounts.map((row) => [row.platform ?? '', row._count._all]),
  );
  const platformClicks = (uiKey: PlatformId): number => {
    // UI uses 'trendyol' but Feedback.platform stores 'trendyol_go' (CLAUDE.md §5).
    if (uiKey === 'trendyol') return clicksByPlatform.get('trendyol_go') ?? 0;
    return clicksByPlatform.get(uiKey) ?? 0;
  };

  // Aggregate the *first* configured URL per platform (multi-restaurant
  // platforms management gets its own per-location page later — Phase 4).
  const firstUrl = (
    key: 'googleReviewUrl' | 'yemekSepetiUrl' | 'getirYemekUrl' | 'trendyolYemekUrl',
  ): string | null => {
    const found = restaurants.find((r) => Boolean(r[key]));
    return (found?.[key] as string | null | undefined) ?? null;
  };

  // Phase 12.6 — Default redirect read from Restaurant.defaultRedirectPlatform
  // (nullable; NULL = Google fallback for back-compat). The picker mutates
  // the *first* restaurant's value — multi-restaurant owners get per-location
  // management on the restaurant detail page (out of scope here).
  const firstRestaurant = restaurants[0] ?? null;
  const storedDefault = firstRestaurant?.defaultRedirectPlatform ?? null;
  // Map stored value (Feedback.platform vocab) → UI key (PlatformId).
  const storedDefaultUiKey: PlatformId | null =
    storedDefault === 'trendyol_go'
      ? 'trendyol'
      : storedDefault === 'google' ||
          storedDefault === 'yemeksepeti' ||
          storedDefault === 'getir'
        ? (storedDefault as PlatformId)
        : null;

  const platforms: PlatformRow[] = [
    {
      id: 'google',
      url: firstUrl('googleReviewUrl'),
      enabled: Boolean(firstUrl('googleReviewUrl')),
      isDefault:
        storedDefaultUiKey === 'google' ||
        // Legacy back-compat: when no explicit default has been picked,
        // Google with a configured URL is the implicit default.
        (storedDefaultUiKey === null && Boolean(firstUrl('googleReviewUrl'))),
      monthlyClicks: platformClicks('google'),
    },
    {
      id: 'yemeksepeti',
      url: firstUrl('yemekSepetiUrl'),
      enabled: Boolean(firstUrl('yemekSepetiUrl')),
      isDefault: storedDefaultUiKey === 'yemeksepeti',
      monthlyClicks: platformClicks('yemeksepeti'),
    },
    {
      id: 'getir',
      url: firstUrl('getirYemekUrl'),
      enabled: Boolean(firstUrl('getirYemekUrl')),
      isDefault: storedDefaultUiKey === 'getir',
      monthlyClicks: platformClicks('getir'),
    },
    {
      id: 'trendyol',
      url: firstUrl('trendyolYemekUrl'),
      enabled: Boolean(firstUrl('trendyolYemekUrl')),
      isDefault: storedDefaultUiKey === 'trendyol',
      monthlyClicks: platformClicks('trendyol'),
    },
  ];

  const enabledPlatformIds = platforms.filter((p) => p.enabled).map((p) => p.id);

  const editLink = firstRestaurant
    ? `/${locale}/dashboard/restaurants/${firstRestaurant.id}`
    : `/${locale}/dashboard/restaurants`;

  return (
    <div className="mx-auto max-w-[1100px] px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow={isTr ? 'PLATFORM BAĞLANTILARI' : 'REVIEW PLATFORMS'}
        title={isTr ? 'Yorum platformları' : 'Review platforms'}
        description={
          isTr
            ? '4–5 yıldızlı yorumlarda müşteriler aşağıdaki platformlardan birine yönlendirilir. QR\'ınız bir platforma sabitlenmediyse, varsayılan platform kullanılır.'
            : "4–5 star ratings redirect customers to one of the platforms below. If a QR isn't pinned, the default platform is used."
        }
      />

      {/* Default redirect picker */}
      <div className="bz-card-soft p-5 sm:p-6 mb-4">
        <div className="flex items-center gap-3 mb-3.5">
          <div
            className="flex items-center justify-center"
            style={{ width: 32, height: 32, borderRadius: 8, background: '#0A0A0A' }}
          >
            <ArrowUpRight size={16} color="#C6F24E" strokeWidth={2} />
          </div>
          <div>
            <div className="bz-h-tight" style={{ fontSize: 15 }}>
              {isTr ? 'Varsayılan yönlendirme' : 'Default redirect'}
            </div>
            <div style={{ fontSize: 12, color: '#737373' }}>
              {isTr
                ? 'Belirli bir platforma sabitlenmemiş QR kodları buraya gönderir'
                : 'QR codes without a pinned platform send here'}
            </div>
          </div>
        </div>
        {firstRestaurant ? (
          <DefaultRedirectPicker
            restaurantId={firstRestaurant.id}
            enabledPlatforms={enabledPlatformIds}
            initialValue={storedDefault}
            locale={locale}
          />
        ) : (
          <span style={{ fontSize: 12, color: '#737373' }}>
            {isTr
              ? 'Henüz platform bağlantısı yok. Aşağıdan en az birini etkinleştir.'
              : 'No platforms connected yet. Enable at least one below.'}
          </span>
        )}
      </div>

      {/* Platform list */}
      <div className="flex flex-col gap-2.5">
        {platforms.map((p) => (
          <div
            key={p.id}
            className="bz-card p-5 flex flex-col md:flex-row md:items-center gap-4"
            style={{ opacity: p.enabled ? 1 : 0.65 }}
          >
            <PlatformChip id={p.id} size={40} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="bz-h-tight" style={{ fontSize: 15 }}>
                  {PLATFORMS[p.id].label}
                </div>
                {p.isDefault && (
                  <Badge kind="lime">{isTr ? 'Varsayılan' : 'Default'}</Badge>
                )}
                {p.enabled && p.url && (
                  <Badge kind="ok">{isTr ? 'Doğrulandı' : 'Verified'}</Badge>
                )}
                {!p.enabled && p.url && (
                  <Badge kind="warn">{isTr ? 'Doğrulanmadı' : 'Unverified'}</Badge>
                )}
              </div>
              {p.url ? (
                <div
                  className="bz-mono mt-1 truncate"
                  style={{ fontSize: 11.5, color: '#737373' }}
                >
                  {p.url}
                </div>
              ) : (
                <div className="mt-1" style={{ fontSize: 12, color: '#A3A3A3' }}>
                  {isTr ? 'Henüz bağlanmadı' : 'Not connected yet'}
                </div>
              )}
            </div>
            <div className="text-left md:text-right" style={{ minWidth: 90 }}>
              <Eyebrow>{isTr ? 'Bu ay tıklanma' : 'This month'}</Eyebrow>
              <div className="bz-h-tight mt-1" style={{ fontSize: 18 }}>
                {p.monthlyClicks}
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                href={editLink}
                className="bz-btn-ghost"
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                <Pencil size={12} strokeWidth={2} />
                {isTr ? 'Düzenle' : 'Edit'}
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Compliance note */}
      <div
        className="mt-4 p-4 rounded-xl flex gap-3 flex-col sm:flex-row"
        style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
      >
        <ShieldCheck
          size={18}
          color="#92400E"
          strokeWidth={2}
          style={{ flexShrink: 0, marginTop: 2 }}
        />
        <div style={{ fontSize: 12.5, color: '#92400E', lineHeight: 1.55 }}>
          <strong>{isTr ? 'Uyumluluk notu' : 'Compliance note'}:</strong>{' '}
          {isTr
            ? 'Buaze hiçbir zaman müşterileri yıldız sayısına göre filtrelemek için pazarlama yapmaz. 1–3 yıldız her zaman dahili olarak işletmeye iletilir; harici platforma yönlendirilmez. Bu yapı Google\'ın yorum politikasıyla uyumludur.'
            : "Buaze never markets star-based filtering. 1–3 star ratings are always captured internally — never redirected externally. This is compliant with Google's review policies."}
        </div>
      </div>
    </div>
  );
}
