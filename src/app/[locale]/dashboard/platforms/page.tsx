import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Plug,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Settings,
  ExternalLink,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { PageHeader, StatCard, EmptyState, Badge } from '@/components/ui';
import type { Locale } from '@/lib/translations';

// §38.45 — Workspace-level Platform Bağlantıları sayfası. Tasarım kaynağı:
// .design-owner-2026/project/page-platforms.jsx (12-card grid + KPI summary).
// Mevcut redirect davranışı kaldırıldı — eski "ilk restoranın settings'ine
// yönlendir" pattern (CLAUDE.md §19.4 per-restaurant) korunur "Yönet" CTA
// olarak. Workspace-level summary owner için multi-restaurant agregat görünüm.
//
// Buaze taxonomy 12-platform (8 yorum + 3 sosyal + 1 mesaj):
// - Yorum: Google / Yemeksepeti / Getir / Trendyol / Tripadvisor / Airbnb / Booking / Yandex
// - Sosyal: Instagram / Facebook
// - Mesaj: WhatsApp
// - Tasarımdaki Yelp/Foursquare/Slack/Webhook taxonomy dışı (CLAUDE.md §34.6
//   Slack silindi; Yelp/Foursquare PROVIDER_DOMAINS'de yok).

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

interface PlatformDef {
  id: string;
  name: string;
  cat: 'review' | 'social' | 'message';
  catLabel: { tr: string; en: string };
  accent: string;
  initials: string;
  // Restaurant model'inde URL field adı
  urlField: keyof RestaurantPlatformRow;
  // Restaurant model'inde enabled flag adı (review platforms only)
  enabledField?: keyof RestaurantPlatformRow;
}

interface RestaurantPlatformRow {
  id: string;
  name: string;
  googleReviewUrl: string | null;
  yemekSepetiUrl: string | null;
  getirYemekUrl: string | null;
  trendyolYemekUrl: string | null;
  tripAdvisorUrl: string | null;
  airbnbUrl: string | null;
  bookingUrl: string | null;
  yandexUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  whatsappUrl: string | null;
  googleEnabled: boolean;
  yemekSepetiEnabled: boolean;
  getirEnabled: boolean;
  trendyolEnabled: boolean;
  tripAdvisorEnabled: boolean;
  airbnbEnabled: boolean;
  bookingEnabled: boolean;
  yandexEnabled: boolean;
}

const PLATFORM_DEFS: PlatformDef[] = [
  // Yorum platformları
  { id: 'google', name: 'Google', cat: 'review', catLabel: { tr: 'Yorum', en: 'Review' }, accent: '#4285F4', initials: 'G', urlField: 'googleReviewUrl', enabledField: 'googleEnabled' },
  { id: 'yemeksepeti', name: 'Yemeksepeti', cat: 'review', catLabel: { tr: 'Yorum', en: 'Review' }, accent: '#FA0050', initials: 'YS', urlField: 'yemekSepetiUrl', enabledField: 'yemekSepetiEnabled' },
  { id: 'getir', name: 'Getir', cat: 'review', catLabel: { tr: 'Yorum', en: 'Review' }, accent: '#5D3EBC', initials: 'G', urlField: 'getirYemekUrl', enabledField: 'getirEnabled' },
  { id: 'trendyol', name: 'Trendyol GO', cat: 'review', catLabel: { tr: 'Yorum', en: 'Review' }, accent: '#F27A1A', initials: 'TY', urlField: 'trendyolYemekUrl', enabledField: 'trendyolEnabled' },
  { id: 'tripadvisor', name: 'Tripadvisor', cat: 'review', catLabel: { tr: 'Yorum', en: 'Review' }, accent: '#34E0A1', initials: 'TA', urlField: 'tripAdvisorUrl', enabledField: 'tripAdvisorEnabled' },
  { id: 'airbnb', name: 'Airbnb', cat: 'review', catLabel: { tr: 'Yorum', en: 'Review' }, accent: '#FF5A5F', initials: 'AB', urlField: 'airbnbUrl', enabledField: 'airbnbEnabled' },
  { id: 'booking', name: 'Booking', cat: 'review', catLabel: { tr: 'Yorum', en: 'Review' }, accent: '#003580', initials: 'BK', urlField: 'bookingUrl', enabledField: 'bookingEnabled' },
  { id: 'yandex', name: 'Yandex', cat: 'review', catLabel: { tr: 'Yorum', en: 'Review' }, accent: '#FFCC00', initials: 'YA', urlField: 'yandexUrl', enabledField: 'yandexEnabled' },
  // Sosyal medya
  { id: 'instagram', name: 'Instagram', cat: 'social', catLabel: { tr: 'Sosyal', en: 'Social' }, accent: '#E1306C', initials: 'IG', urlField: 'instagramUrl' },
  { id: 'facebook', name: 'Facebook', cat: 'social', catLabel: { tr: 'Sosyal', en: 'Social' }, accent: '#1877F2', initials: 'FB', urlField: 'facebookUrl' },
  // Mesaj
  { id: 'whatsapp', name: 'WhatsApp', cat: 'message', catLabel: { tr: 'Mesaj', en: 'Message' }, accent: '#25D366', initials: 'WA', urlField: 'whatsappUrl' },
];

export default async function OwnerPlatformsPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';
  const isTr = locale === 'tr';

  // Auth — same pattern as dashboard/page.tsx.
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

  const userId = payload.userId as string;

  // Workspace-scoped restaurants — owner panel scope, IDOR korumalı.
  const restaurants = (await prisma.restaurant.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      googleReviewUrl: true,
      yemekSepetiUrl: true,
      getirYemekUrl: true,
      trendyolYemekUrl: true,
      tripAdvisorUrl: true,
      airbnbUrl: true,
      bookingUrl: true,
      yandexUrl: true,
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
    },
    orderBy: { createdAt: 'asc' },
  })) as RestaurantPlatformRow[];

  if (restaurants.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow={isTr ? 'PLATFORM BAĞLANTILARI' : 'PLATFORM LINKS'}
          title={isTr ? 'Entegrasyonlar' : 'Integrations'}
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

  // Per-platform aggregate: bağlı (URL set + enabled), toplam restoran sayısı.
  const platformSummaries = PLATFORM_DEFS.map((p) => {
    let connected = 0;
    let urlSet = 0;
    for (const r of restaurants) {
      const url = r[p.urlField] as string | null;
      const hasUrl = typeof url === 'string' && url.trim().length > 0;
      const isEnabled = p.enabledField ? Boolean(r[p.enabledField]) : true;
      if (hasUrl) {
        urlSet += 1;
        if (isEnabled) connected += 1;
      }
    }
    return { ...p, connected, urlSet, total: restaurants.length };
  });

  // KPI metrikleri
  const totalConnected = platformSummaries.reduce((sum, p) => sum + p.connected, 0);
  const totalSlots = restaurants.length * PLATFORM_DEFS.length;
  const totalUrlSet = platformSummaries.reduce((sum, p) => sum + p.urlSet, 0);
  const reviewPlatformsConnected = platformSummaries
    .filter((p) => p.cat === 'review')
    .reduce((sum, p) => sum + p.connected, 0);
  const socialPlatformsConnected = platformSummaries
    .filter((p) => p.cat === 'social' || p.cat === 'message')
    .reduce((sum, p) => sum + p.connected, 0);
  // "Pasif" = URL set ama enabled=false
  const inactiveCount = totalUrlSet - totalConnected;

  // Hızlı erişim: "Yönet" CTA için ilk restoranın settings'i
  const firstRestaurantId = restaurants[0]!.id;
  const manageHref = `/${locale}/dashboard/restaurants/${firstRestaurantId}/settings?section=integrations`;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={isTr ? 'PLATFORM BAĞLANTILARI' : 'PLATFORM LINKS'}
        title={isTr ? 'Entegrasyonlar' : 'Integrations'}
        description={
          isTr
            ? 'Her platformdan gelen yorumu, siparişi ve mesajı tek panelde topla. Buaze 11+ servisle birebir konuşur.'
            : 'Collect reviews, orders, and messages from every platform in one panel. Buaze speaks to 11+ services natively.'
        }
        actions={
          <Link
            href={manageHref}
            className="bz-btn-primary inline-flex items-center gap-1.5 text-[12.5px]"
          >
            <Plus size={13} strokeWidth={2} />
            {isTr ? 'Yeni bağlantı ekle' : 'Add new link'}
          </Link>
        }
      />

      {/* KPI 4-card */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label={isTr ? 'Bağlı' : 'Connected'}
          value={`${totalConnected}/${totalSlots}`}
          icon={<CheckCircle2 size={14} className="text-[#16A34A]" />}
        />
        <StatCard
          label={isTr ? 'Pasif' : 'Inactive'}
          value={inactiveCount.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          icon={<AlertTriangle size={14} className="text-[#D97706]" />}
          delta={
            inactiveCount > 0
              ? isTr
                ? 'URL var, kapalı'
                : 'URL set, off'
              : null
          }
          deltaKind="neutral"
        />
        <StatCard
          label={isTr ? 'Yorum platformları' : 'Review platforms'}
          value={reviewPlatformsConnected.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          icon={<Activity size={14} />}
        />
        <StatCard
          label={isTr ? 'Sosyal & mesaj' : 'Social & messaging'}
          value={socialPlatformsConnected.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          icon={<Plug size={14} />}
        />
      </div>

      {/* Filter chips — basit kategori filter (UI-only, tüm platformları render eder; cat label'ı görünür) */}
      <div
        className="bz-card flex flex-wrap items-center gap-1.5 p-3"
        role="group"
        aria-label={isTr ? 'Platform kategorileri' : 'Platform categories'}
      >
        {[
          { id: 'all', tr: 'Tümü', en: 'All', count: PLATFORM_DEFS.length },
          {
            id: 'review',
            tr: 'Yorum',
            en: 'Review',
            count: PLATFORM_DEFS.filter((p) => p.cat === 'review').length,
          },
          {
            id: 'social',
            tr: 'Sosyal',
            en: 'Social',
            count: PLATFORM_DEFS.filter((p) => p.cat === 'social').length,
          },
          {
            id: 'message',
            tr: 'Mesaj',
            en: 'Messaging',
            count: PLATFORM_DEFS.filter((p) => p.cat === 'message').length,
          },
        ].map((c, i) => (
          <span
            key={c.id}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium ${
              i === 0
                ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                : 'border-[#EDEDED] bg-white text-[#525252]'
            }`}
          >
            {isTr ? c.tr : c.en}
            <span
              className={`bz-mono tabular-nums text-[10.5px] rounded-full px-1.5 py-0.5 ${
                i === 0 ? 'bg-white/15 text-white' : 'bg-[#F5F5F5] text-[#737373]'
              }`}
            >
              {c.count}
            </span>
          </span>
        ))}
        <span className="bz-mono ml-auto text-[11px] text-[#737373]">
          {isTr ? `${PLATFORM_DEFS.length} servis` : `${PLATFORM_DEFS.length} services`}
        </span>
      </div>

      {/* Platform card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {platformSummaries.map((p) => {
          const isConnected = p.connected > 0;
          const isPartial = p.urlSet > p.connected;
          const fullStatus = isConnected ? 'connected' : isPartial ? 'inactive' : 'available';
          const statusBadgeKind: 'ok' | 'warn' | 'ghost' =
            fullStatus === 'connected' ? 'ok' : fullStatus === 'inactive' ? 'warn' : 'ghost';
          const statusLabel = isTr
            ? fullStatus === 'connected'
              ? 'Bağlı'
              : fullStatus === 'inactive'
                ? 'Pasif'
                : 'Hazır'
            : fullStatus === 'connected'
              ? 'Connected'
              : fullStatus === 'inactive'
                ? 'Inactive'
                : 'Available';
          return (
            <div
              key={p.id}
              className="bz-card p-4 flex flex-col gap-3.5"
            >
              <div className="flex items-start gap-3">
                {/* Platform logo */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border text-[13px] font-semibold bz-h-tight"
                  style={{
                    backgroundColor: `${p.accent}14`,
                    color: p.accent,
                    borderColor: `${p.accent}30`,
                  }}
                  aria-hidden
                >
                  {p.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-[#0A0A0A] tracking-[-0.01em] truncate">
                    {p.name}
                  </div>
                  <div className="bz-mono text-[10.5px] text-[#737373] uppercase tracking-[0.08em] mt-0.5">
                    {isTr ? p.catLabel.tr : p.catLabel.en}
                  </div>
                </div>
                <Badge kind={statusBadgeKind}>{statusLabel}</Badge>
              </div>

              {/* Aggregate row */}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-[#EDEDED]">
                <div className="bg-white p-2.5">
                  <div className="pulse-eyebrow text-[9.5px] text-[#737373] mb-0.5">
                    {isTr ? 'BAĞLI' : 'CONNECTED'}
                  </div>
                  <div className="bz-mono tabular-nums text-[12px] font-semibold text-[#0A0A0A]">
                    {p.connected}/{p.total}
                  </div>
                </div>
                <div className="bg-white p-2.5 border-l border-[#EDEDED]">
                  <div className="pulse-eyebrow text-[9.5px] text-[#737373] mb-0.5">
                    {isTr ? 'URL VAR' : 'URL SET'}
                  </div>
                  <div className="bz-mono tabular-nums text-[12px] font-semibold text-[#0A0A0A]">
                    {p.urlSet}/{p.total}
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex gap-2">
                <Link
                  href={manageHref}
                  className="bz-btn-ghost flex-1 inline-flex items-center justify-center gap-1.5 text-[12px]"
                >
                  <Settings size={11} strokeWidth={2} />
                  {isTr ? 'Yönet' : 'Manage'}
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Workspace info */}
      <div className="bz-card-soft p-4 flex items-center gap-3">
        <ExternalLink size={14} strokeWidth={2} className="text-[#737373] shrink-0" />
        <p className="text-[12.5px] text-[#525252] flex-1">
          {isTr
            ? 'Her platformun detayları + URL düzenleme + test her bir restoranın "Ayarlar > Platform Bağlantıları" sekmesinde.'
            : 'Per-platform details, URL editing, and tests live under each restaurant\'s "Settings > Platform Links" tab.'}
        </p>
        <Link
          href={`/${locale}/dashboard/restaurants`}
          className="bz-btn-ghost text-[12px]"
        >
          {isTr ? 'İşletme listesi' : 'Business list'}
        </Link>
      </div>
    </div>
  );
}
