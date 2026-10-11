'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Plug,
  QrCode,
  Settings as SettingsIcon,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import CopyUrlButton from '@/components/dashboard/CopyUrlButton';
import {
  AlertBanner,
  BusinessStatusBadge,
  Eyebrow,
  PageHeader,
  StatCard,
} from '@/components/ui';
import { PlatformSummaryLine } from '@/components/dashboard/platforms/PlatformBusinessContext';
import { PLATFORM_LINKS_LABEL } from '@/lib/platform-management';
import {
  parseLatestChecksPayload,
  summarizeReviewPlatformLinks,
  type PlatformLinkSummary,
} from '@/lib/platform-link-status';
import DetailLoading from './loading';

/**
 * Owner restaurant detail page — Pulse redesign (PR after merge of /account hub).
 *
 * The previous detail surface stacked an identity-meta strip + a public
 * preview row + a 2-up Quick Links grid (one full-width Settings tile).
 * It worked but skipped the StatCard primitive, made the metric ranks
 * indistinguishable from Settings descriptions, and let a single primary
 * CTA dominate the layout. Owners told us the page felt heavy without
 * giving them a fast read on "what's happening with this location".
 *
 * Redesign keeps backend contracts (`/api/restaurants/[id]`) untouched
 * and reuses Pulse primitives only — no new dep, no new UI primitive:
 *   - <PageHeader> with status badge + slug + category in the description
 *   - <StatCard> 3-grid for the actual numbers (yorum/qr/menü)
 *   - Public preview as a single-row affordance with copy + "open"
 *   - 2×2 Quick Actions grid: equal-weighted cards, "Ayarlar" gets a
 *     lime accent dot to signal it's the most-used jump
 *   - Clean loading state (null until data arrives — §40.10 clean slate)
 *   - Optional warn banner when the location is temporarily closed
 */

interface RestaurantSummary {
  id: string;
  name: string;
  slug: string;
  category: string;
  isActive: boolean;
  temporarilyClosed: boolean;
  createdAt: string;
  updatedAt: string;
  feedbacks: number;
  menuItems: number;
  qrGenerations: number;
  /** Review-link summary for the "Platform bağlantıları" strip. */
  platformLinks: PlatformLinkSummary;
}

interface RestaurantDetailClientProps {
  initialData?: RestaurantSummary | null;
}

export default function RestaurantDetailClient({ initialData }: RestaurantDetailClientProps) {
  const params = useParams();
  const locale = params.locale === 'en' ? 'en' : 'tr';
  const isTr = locale === 'tr';
  const id = params.id as string;

  // §40.10 server-hydration — initialData undefined ise client'ta fetch yapılır,
  // doluysa çift skeleton flash önlenir (loading.tsx → mount → data hazır).
  const [data, setData] = useState<RestaurantSummary | null>(initialData ?? null);
  const [loading, setLoading] = useState(initialData === undefined);
  const skipFirstFetchRef = useRef(initialData !== undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (skipFirstFetchRef.current) {
      skipFirstFetchRef.current = false;
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        // Link checks are advisory — a failed read only means "not checked yet".
        const [res, checksRes] = await Promise.all([
          fetch(`/api/restaurants/${id}`),
          fetch(`/api/restaurants/${id}/integrations/checks`).catch(() => null),
        ]);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || (isTr ? 'İşletme yüklenemedi.' : 'Failed to load.'));
        }
        const json = await res.json();
        const checks = parseLatestChecksPayload(
          checksRes && checksRes.ok ? await checksRes.json().catch(() => null) : null,
        );
        if (cancelled) return;
        setData({
          id: json.id,
          name: json.name,
          slug: json.slug,
          category: json.category ?? 'Restoran',
          isActive: json.isActive ?? true,
          temporarilyClosed: json.temporarilyClosed ?? false,
          createdAt: json.createdAt,
          updatedAt: json.updatedAt,
          feedbacks: json._count?.feedbacks ?? 0,
          menuItems: json._count?.menuItems ?? 0,
          qrGenerations: json._count?.qrGenerations ?? 0,
          platformLinks: summarizeReviewPlatformLinks(
            { ...json, category: json.category ?? null },
            checks,
          ),
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, isTr]);

  const backLink = (
    <Link
      href={`/${locale}/dashboard/restaurants`}
      className="bz-mono text-[11px] text-[#737373] hover:text-[#0A0A0A] inline-flex min-h-[44px] items-center gap-1 mb-3 sm:min-h-[32px]"
    >
      <ArrowLeft size={12} />
      {isTr ? 'İşletmelere dön' : 'Back to businesses'}
    </Link>
  );

  // Client-fetch path (impersonation / team member): render the segment
  // skeleton instead of a blank page while the request is in flight.
  if (loading) return <DetailLoading />;

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 sm:px-7 py-6 lg:py-8">
        <AlertBanner kind="danger">{error || (isTr ? 'İşletme bulunamadı.' : 'Not found.')}</AlertBanner>
        <div className="mt-4">
          <Link
            href={`/${locale}/dashboard/restaurants`}
            className="bz-btn-ghost inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={14} />
            {isTr ? 'İşletmelere dön' : 'Back to businesses'}
          </Link>
        </div>
      </div>
    );
  }

  const status = data.temporarilyClosed
    ? 'temporarily_closed'
    : data.isActive
      ? 'active'
      : 'disabled';
  // Same origin on server and client (a `window` check printed `/r/slug` in
  // the SSR HTML and an absolute URL after hydration → mismatch). Mirrors the
  // settings page: env app URL, falling back to the production host when the
  // env is missing or points at localhost.
  const envAppUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/+$/, '');
  const publicBase =
    envAppUrl && !/localhost|127\.0\.0\.1/i.test(envAppUrl) ? envAppUrl : 'https://www.buaze.com';
  const publicUrl = `${publicBase}/r/${data.slug}`;
  const dateFmt = new Intl.DateTimeFormat(isTr ? 'tr-TR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const numberFmt = new Intl.NumberFormat(isTr ? 'tr-TR' : 'en-US');

  // Quick actions — Pulse 2×2 grid. "Ayarlar" gets a lime accent dot to
  // signal it's the most-frequented jump from this page; the other three
  // are equal weight so the layout doesn't feel lopsided.
  const quickActions: Array<{
    id: string;
    label: string;
    description: string;
    href: string;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
    accent?: boolean;
    count?: number;
  }> = [
    {
      id: 'settings',
      label: isTr ? 'Ayarlar' : 'Settings',
      description: isTr
        ? 'Genel, platform bağlantıları, marka, operasyon, güvenlik'
        : 'General, platform links, brand, operations, security',
      href: `/${locale}/dashboard/restaurants/${id}/settings`,
      icon: SettingsIcon,
      accent: true,
    },
    {
      id: 'feedbacks',
      label: isTr ? 'Yorumlar' : 'Reviews',
      description: isTr
        ? 'Müşteri yorumlarını oku, yanıtla, etiketle'
        : 'Read, reply and tag customer reviews',
      href: `/${locale}/dashboard/feedbacks?restaurantId=${id}`,
      icon: MessageSquare,
      count: data.feedbacks,
    },
    {
      id: 'qr',
      label: isTr ? 'QR kodlar' : 'QR codes',
      description: isTr
        ? 'Üretilen QR geçmişi ve yeni kart'
        : 'Generated QR history and new code',
      href: `/${locale}/dashboard/qr?restaurantId=${id}`,
      icon: QrCode,
      count: data.qrGenerations,
    },
    {
      id: 'menu',
      label: isTr ? 'Menü' : 'Menu',
      description: isTr
        ? 'Kategoriler, ürünler, tema ve QR'
        : 'Categories, items, theme and QR',
      href: `/${locale}/dashboard/restaurants/${id}/menu`,
      icon: UtensilsCrossed,
      count: data.menuItems,
    },
  ];

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-7 py-6 lg:py-8">
      {backLink}

      <PageHeader
        eyebrow={isTr ? 'İŞLETME ÖZETİ' : 'BUSINESS OVERVIEW'}
        // Long names wrap instead of clipping at 375px.
        title={<span className="break-words [overflow-wrap:anywhere]">{data.name}</span>}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[#525252]">
            <span className="bz-mono text-[12px] text-[#0A0A0A]">/{data.slug}</span>
            <span aria-hidden="true" className="text-[#A3A3A3]">·</span>
            <span className="text-[12.5px] capitalize">{data.category}</span>
            <span aria-hidden="true" className="text-[#A3A3A3]">·</span>
            <span className="inline-flex items-center gap-1 text-[12px] text-[#737373]">
              <Calendar size={11} strokeWidth={2} />
              {isTr ? 'Eklenme' : 'Added'} {dateFmt.format(new Date(data.createdAt))}
            </span>
          </span>
        }
        actions={<BusinessStatusBadge status={status} />}
      />

      {/* Temporarily-closed soft warning. Active/disabled is already in the
          status badge; this is only the "right now I'm temp-closing" flag. */}
      {data.temporarilyClosed && (
        <div className="mt-5">
          <AlertBanner kind="warn" icon={<AlertTriangle size={14} strokeWidth={2} />}>
            {isTr
              ? 'Geçici olarak kapalı olarak işaretlenmiş. Müşteri sayfası kapalı görünür. Ayarlar → Operasyonel\'den geri açabilirsin.'
              : 'Marked as temporarily closed. The customer page shows closed. Reopen from Settings → Operations.'}
          </AlertBanner>
        </div>
      )}

      {/* Stat grid — pure metrics. */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label={isTr ? 'Toplam yorum' : 'Total reviews'}
          value={numberFmt.format(data.feedbacks)}
          icon={<MessageSquare size={16} />}
        />
        <StatCard
          label={isTr ? 'QR kodlar' : 'QR codes'}
          value={numberFmt.format(data.qrGenerations)}
          icon={<QrCode size={16} />}
        />
        <StatCard
          label={isTr ? 'Menü ürünü' : 'Menu items'}
          value={numberFmt.format(data.menuItems)}
          icon={<UtensilsCrossed size={16} />}
        />
      </div>

      {/* Public preview — single-row affordance. */}
      <div
        className="mt-4 bz-card-soft flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-4"
        style={{ borderRadius: 12 }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className="shrink-0 inline-flex items-center justify-center rounded-lg bg-white"
            style={{ width: 28, height: 28, border: '1px solid #EDEDED', color: '#0A0A0A' }}
            aria-hidden="true"
          >
            <Sparkles size={13} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <Eyebrow>{isTr ? 'MÜŞTERİ SAYFASI' : 'CUSTOMER PAGE'}</Eyebrow>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bz-mono text-[12.5px] text-[#0A0A0A] hover:underline truncate block max-w-full"
              title={publicUrl}
            >
              {publicUrl}
            </a>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 sm:ml-auto">
          <span className="text-[11px] text-[#737373] whitespace-nowrap">
            {isTr ? 'Son güncelleme' : 'Updated'} {dateFmt.format(new Date(data.updatedAt))}
          </span>
          <CopyUrlButton url={publicUrl} locale={locale} />
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bz-btn-icon"
            aria-label={isTr ? 'Yeni sekmede aç' : 'Open in new tab'}
            title={isTr ? 'Yeni sekmede aç' : 'Open in new tab'}
          >
            <ExternalLink size={14} strokeWidth={2} />
          </a>
        </div>
      </div>

      {/* Platform links strip — status at a glance, one tap to the editor
          for THIS business (the overview opens on it via ?restaurantId). */}
      <Link
        href={`/${locale}/dashboard/platforms?restaurantId=${encodeURIComponent(data.id)}`}
        className="bz-card mt-3 flex min-h-[56px] items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2"
      >
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#EDEDED] bg-[#FAFAFA] text-[#0A0A0A]"
        >
          <Plug size={14} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1 text-[12.5px] text-[#525252]">
          <PlatformSummaryLine
            summary={data.platformLinks}
            locale={locale}
            lead={
              <span className="bz-h-tight text-[14px] text-[#0A0A0A]">
                {isTr ? PLATFORM_LINKS_LABEL.tr : PLATFORM_LINKS_LABEL.en}
              </span>
            }
          />
        </span>
        <ChevronRight size={14} strokeWidth={2} aria-hidden="true" className="shrink-0 text-[#737373]" />
      </Link>

      {/* Quick actions — 2×2 equal-weight grid. */}
      <div className="mt-6">
        <Eyebrow>{isTr ? 'HIZLI AKSİYONLAR' : 'QUICK ACTIONS'}</Eyebrow>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.id}
                href={q.href}
                className="bz-card relative flex items-start gap-3 p-4 sm:p-5 group transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                {q.accent && (
                  <span
                    aria-hidden="true"
                    className="absolute top-3 right-3 w-2 h-2 rounded-full"
                    style={{ background: '#C6F24E' }}
                  />
                )}
                <div
                  className="shrink-0 flex items-center justify-center"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: '#FAFAFA',
                    border: '1px solid #EDEDED',
                    color: '#0A0A0A',
                  }}
                >
                  <Icon size={16} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="bz-h-tight text-[14px] text-[#0A0A0A]">{q.label}</h3>
                    <span className="inline-flex items-center gap-1 text-[#A3A3A3] group-hover:text-[#0A0A0A] transition-colors">
                      {typeof q.count === 'number' && (
                        <span className="bz-mono text-[12px] text-[#525252]">
                          {numberFmt.format(q.count)}
                        </span>
                      )}
                      <ArrowUpRight
                        size={14}
                        strokeWidth={2}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                      {typeof q.count !== 'number' && (
                        <ChevronRight
                          size={14}
                          strokeWidth={2}
                          className="group-hover:opacity-0 transition-opacity"
                        />
                      )}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] leading-[1.55] text-[#525252]">
                    {q.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
