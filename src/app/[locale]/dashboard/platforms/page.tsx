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
import PlatformEnableToggle from '@/components/dashboard/PlatformEnableToggle';
import { getSectorPlatforms } from '@/lib/sector-platforms';

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
  // Owner's pick of which schema field stores this platform's URL — used by
  // PlatformEnableToggle to know which `*Enabled` flag to PATCH.
  schemaKey: 'google' | 'yemekSepeti' | 'getir' | 'trendyol' | 'tripAdvisor' | 'airbnb';
  url: string | null;
  /** Effective enabled = URL configured AND owner-flag is true */
  enabled: boolean;
  /** Owner-set flag (independent of URL presence) */
  enabledFlag: boolean;
  /** True iff a URL is configured (toggle gating) */
  hasUrl: boolean;
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
      // Restaurant.category drives the sector → platform whitelist below.
      category: true,
      googleReviewUrl: true,
      // Legacy Google data may live only in googlePlaceId (older detail
      // forms persisted there). Read both and fall back so the Google card
      // doesn't appear passive when only the Place ID is set.
      googlePlaceId: true,
      yemekSepetiUrl: true,
      getirYemekUrl: true,
      trendyolYemekUrl: true,
      tripAdvisorUrl: true,
      airbnbUrl: true,
      googleEnabled: true,
      yemekSepetiEnabled: true,
      getirEnabled: true,
      trendyolEnabled: true,
      tripAdvisorEnabled: true,
      airbnbEnabled: true,
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
    key:
      | 'googleReviewUrl'
      | 'googlePlaceId'
      | 'yemekSepetiUrl'
      | 'getirYemekUrl'
      | 'trendyolYemekUrl'
      | 'tripAdvisorUrl'
      | 'airbnbUrl',
  ): string | null => {
    const found = restaurants.find((r) => Boolean(r[key]));
    return (found?.[key] as string | null | undefined) ?? null;
  };

  // Google fallback: the platforms page reads `googleReviewUrl` historically,
  // but the older detail form persisted to `googlePlaceId` only. Fall back so
  // legacy rows surface as "connected" — public review redirect already
  // handles either column.
  const googleUrl = firstUrl('googleReviewUrl') || firstUrl('googlePlaceId');

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
          storedDefault === 'getir' ||
          storedDefault === 'tripadvisor' ||
          storedDefault === 'airbnb'
        ? (storedDefault as PlatformId)
        : null;

  // Owner's per-platform enable flag from the *first* restaurant — same
  // single-restaurant assumption as `firstUrl`. Multi-location ownership
  // gets per-restaurant flags via the detail page (out of scope here).
  const flagOf = (
    key:
      | 'googleEnabled'
      | 'yemekSepetiEnabled'
      | 'getirEnabled'
      | 'trendyolEnabled'
      | 'tripAdvisorEnabled'
      | 'airbnbEnabled',
  ): boolean => {
    if (!firstRestaurant) return true;
    const v = (firstRestaurant as Record<string, unknown>)[key];
    // Treat both `undefined` (column absent on this Prisma client) and `null`
    // (legacy rows backfilled without the boolean default) as the schema
    // default `true`. Without this, a NULL flag silently disables the toggle
    // and the card appears passive.
    return v === undefined || v === null ? true : Boolean(v);
  };

  const platforms: PlatformRow[] = [
    {
      id: 'google',
      schemaKey: 'google',
      url: googleUrl,
      hasUrl: Boolean(googleUrl),
      enabledFlag: flagOf('googleEnabled'),
      enabled: Boolean(googleUrl) && flagOf('googleEnabled'),
      isDefault:
        storedDefaultUiKey === 'google' ||
        // Legacy back-compat: when no explicit default has been picked,
        // Google with a configured URL is the implicit default.
        (storedDefaultUiKey === null && Boolean(googleUrl)),
      monthlyClicks: platformClicks('google'),
    },
    {
      id: 'yemeksepeti',
      schemaKey: 'yemekSepeti',
      url: firstUrl('yemekSepetiUrl'),
      hasUrl: Boolean(firstUrl('yemekSepetiUrl')),
      enabledFlag: flagOf('yemekSepetiEnabled'),
      enabled: Boolean(firstUrl('yemekSepetiUrl')) && flagOf('yemekSepetiEnabled'),
      isDefault: storedDefaultUiKey === 'yemeksepeti',
      monthlyClicks: platformClicks('yemeksepeti'),
    },
    {
      id: 'getir',
      schemaKey: 'getir',
      url: firstUrl('getirYemekUrl'),
      hasUrl: Boolean(firstUrl('getirYemekUrl')),
      enabledFlag: flagOf('getirEnabled'),
      enabled: Boolean(firstUrl('getirYemekUrl')) && flagOf('getirEnabled'),
      isDefault: storedDefaultUiKey === 'getir',
      monthlyClicks: platformClicks('getir'),
    },
    {
      id: 'trendyol',
      schemaKey: 'trendyol',
      url: firstUrl('trendyolYemekUrl'),
      hasUrl: Boolean(firstUrl('trendyolYemekUrl')),
      enabledFlag: flagOf('trendyolEnabled'),
      enabled: Boolean(firstUrl('trendyolYemekUrl')) && flagOf('trendyolEnabled'),
      isDefault: storedDefaultUiKey === 'trendyol',
      monthlyClicks: platformClicks('trendyol'),
    },
    {
      id: 'tripadvisor',
      schemaKey: 'tripAdvisor',
      url: firstUrl('tripAdvisorUrl'),
      hasUrl: Boolean(firstUrl('tripAdvisorUrl')),
      enabledFlag: flagOf('tripAdvisorEnabled'),
      enabled: Boolean(firstUrl('tripAdvisorUrl')) && flagOf('tripAdvisorEnabled'),
      isDefault: storedDefaultUiKey === 'tripadvisor',
      monthlyClicks: platformClicks('tripadvisor'),
    },
    {
      id: 'airbnb',
      schemaKey: 'airbnb',
      url: firstUrl('airbnbUrl'),
      hasUrl: Boolean(firstUrl('airbnbUrl')),
      enabledFlag: flagOf('airbnbEnabled'),
      enabled: Boolean(firstUrl('airbnbUrl')) && flagOf('airbnbEnabled'),
      isDefault: storedDefaultUiKey === 'airbnb',
      monthlyClicks: platformClicks('airbnb'),
    },
  ];

  // Sector → platform whitelist. Hides cards that don't make sense for the
  // owner's vertical (e.g. Airbnb on a restaurant, Yemeksepeti on a clinic).
  // Source of truth: src/lib/sector-platforms.ts.
  const allowedPlatforms = getSectorPlatforms(firstRestaurant?.category);
  const visiblePlatforms = platforms.filter((p) => allowedPlatforms.has(p.id));

  const enabledPlatformIds = visiblePlatforms.filter((p) => p.enabled).map((p) => p.id);

  // Per-card "Düzenle" deep-link. `?focus=<id>` makes the detail page
  // smooth-scroll to and focus the matching platform input on mount —
  // owner doesn't have to scroll/search inside a long form. Falls back
  // to the list page when the owner has no restaurant yet.
  const editLink = (platformId?: PlatformId): string => {
    if (!firstRestaurant) return `/${locale}/dashboard/restaurants`;
    const base = `/${locale}/dashboard/restaurants/${firstRestaurant.id}`;
    return platformId ? `${base}?focus=${platformId}` : base;
  };

  return (
    <div className="mx-auto max-w-[1100px] px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow={isTr ? 'İŞLETME PANELİ' : 'OWNER PANEL'}
        title="platforms"
      />

      {/* Section header — design 1:1: eyebrow + paragraph (no second h1) */}
      <div className="mb-5">
        <Eyebrow>{isTr ? 'PLATFORM BAĞLANTILARI' : 'REVIEW PLATFORMS'}</Eyebrow>
        <p
          className="mt-1.5 max-w-[620px]"
          style={{ fontSize: 13, color: '#525252', lineHeight: 1.55 }}
        >
          {isTr
            ? '4–5 yıldızlı yorumlarda müşteriler aşağıdaki platformlardan birine yönlendirilir. QR\'ınız bir platforma sabitlenmediyse, varsayılan platform kullanılır.'
            : "4–5 star ratings redirect customers to one of the platforms below. If a QR isn't pinned, the default platform is used."}
        </p>
      </div>

      {/* Mobile-only — design's MOwnerPlatforms dark default card (1:1).
          Prominent display of the active default platform; md+ uses the
          unified DefaultRedirectPicker card below. */}
      {(() => {
        const defaultPlatform = visiblePlatforms.find((p) => p.isDefault) ?? null;
        if (!defaultPlatform || !firstRestaurant) return null;
        return (
          <div
            className="md:hidden bz-card p-4 mb-4"
            style={{ background: '#0A0A0A', color: '#fff' }}
          >
            <div className="pulse-eyebrow" style={{ fontSize: 9, color: '#C6F24E' }}>
              {isTr ? 'VARSAYILAN PLATFORM' : 'DEFAULT PLATFORM'}
            </div>
            <div className="flex items-center gap-2.5 mt-2.5">
              <PlatformChip id={defaultPlatform.id} size={36} />
              <div className="flex-1 min-w-0">
                <div className="bz-h-tight" style={{ fontSize: 14 }}>
                  {PLATFORMS[defaultPlatform.id].label}
                </div>
                {defaultPlatform.url ? (
                  <div
                    className="bz-mono truncate"
                    style={{
                      fontSize: 10.5,
                      color: 'rgba(255,255,255,0.55)',
                    }}
                  >
                    {defaultPlatform.url.replace(/^https?:\/\//, '')}
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: 10.5,
                      color: 'rgba(255,255,255,0.55)',
                    }}
                  >
                    {isTr ? 'Bağlanmadı' : 'Not connected'}
                  </div>
                )}
              </div>
              <a
                href="#default-picker"
                style={{
                  background: '#C6F24E',
                  color: '#0A0A0A',
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                {isTr ? 'Değiştir' : 'Change'}
              </a>
            </div>
            <div
              className="mt-3"
              style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}
            >
              {isTr
                ? '4–5 yıldızlı yorumlar bu platforma yönlendirilir.'
                : '4–5 star reviews are redirected to this platform.'}
            </div>
          </div>
        );
      })()}

      {/* Default redirect picker */}
      <div id="default-picker" className="bz-card-soft p-5 sm:p-6 mb-4 scroll-mt-20">
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
        {visiblePlatforms.map((p) => (
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
              {firstRestaurant && (
                <PlatformEnableToggle
                  restaurantId={firstRestaurant.id}
                  platformKey={p.schemaKey}
                  initialEnabled={p.enabledFlag}
                  hasUrl={p.hasUrl}
                  ariaLabel={
                    isTr
                      ? `${PLATFORMS[p.id].label} platformunu aç/kapat`
                      : `Toggle ${PLATFORMS[p.id].label} platform`
                  }
                />
              )}
              <Link
                href={editLink(p.id)}
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
