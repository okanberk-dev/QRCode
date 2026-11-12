'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
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
import { AlertBanner, BusinessStatusBadge, PageHeader } from '@/components/ui';
import { PlatformSummaryLine } from '@/components/dashboard/platforms/PlatformBusinessContext';
import { PLATFORM_LINKS_LABEL } from '@/lib/platform-management';
import {
  parseLatestChecksPayload,
  summarizeReviewPlatformLinks,
  type PlatformLinkSummary,
} from '@/lib/platform-link-status';
import DetailLoading from './loading';

/**
 * Owner restaurant detail page.
 *
 *   - <PageHeader>: name, slug · category · added date, status badge and the
 *     one primary action (Ayarlar).
 *   - Three link cards (Yorumlar / QR kodlar / Menü), each with its count —
 *     the numbers and the shortcuts used to be two separate grids showing
 *     the same three counts.
 *   - Customer page row (copy + open) and the platform-links strip.
 *   - Optional warn banner when the location is temporarily closed.
 * Backend contract (`/api/restaurants/[id]`) unchanged.
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

  const settingsHref = `/${locale}/dashboard/restaurants/${id}/settings`;

  // One card per area of this business: the count and the way in.
  const sections: Array<{
    id: string;
    label: string;
    description: string;
    href: string;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
    count: number;
  }> = [
    {
      id: 'feedbacks',
      label: isTr ? 'Yorumlar' : 'Reviews',
      description: isTr ? 'Toplam yorum · oku ve yanıtla' : 'Total reviews · read and reply',
      href: `/${locale}/dashboard/feedbacks?restaurantId=${id}`,
      icon: MessageSquare,
      count: data.feedbacks,
    },
    {
      id: 'qr',
      label: isTr ? 'QR kodlar' : 'QR codes',
      description: isTr ? 'Üretilen QR · geçmiş ve yeni' : 'QR codes made · history and new',
      href: `/${locale}/dashboard/qr?restaurantId=${id}`,
      icon: QrCode,
      count: data.qrGenerations,
    },
    {
      id: 'menu',
      label: isTr ? 'Menü' : 'Menu',
      description: isTr ? 'Menüdeki ürün · kategoriler ve tema' : 'Menu items · categories and theme',
      href: `/${locale}/dashboard/restaurants/${id}/menu`,
      icon: UtensilsCrossed,
      count: data.menuItems,
    },
  ];

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-7 py-6 lg:py-8">
      {backLink}

      <PageHeader
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
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <BusinessStatusBadge status={status} />
            <Link
              href={settingsHref}
              className="bz-btn-primary inline-flex min-h-[44px] items-center gap-1.5 sm:min-h-[36px]"
            >
              <SettingsIcon size={14} strokeWidth={2} aria-hidden="true" />
              {isTr ? 'Ayarlar' : 'Settings'}
            </Link>
          </div>
        }
      />

      {/* Temporarily-closed soft warning. Active/disabled is already in the
          status badge; this is only the "right now I'm temp-closing" flag. */}
      {data.temporarilyClosed && (
        <div className="mb-3">
          <AlertBanner kind="warn" icon={<AlertTriangle size={14} strokeWidth={2} />}>
            {isTr
              ? 'Geçici olarak kapalı olarak işaretlenmiş. Müşteri sayfası kapalı görünür. Ayarlar → Operasyonel\'den geri açabilirsin.'
              : 'Marked as temporarily closed. The customer page shows closed. Reopen from Settings → Operations.'}
          </AlertBanner>
        </div>
      )}

      {/* Areas of this business — count + the way in, one card each. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.id}
              href={section.href}
              className="bz-card group flex min-h-[64px] items-center gap-3 p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2 sm:p-5"
            >
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#EDEDED] bg-[#FAFAFA] text-[#0A0A0A]"
              >
                <Icon size={16} strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-[#0A0A0A]">{section.label}</span>
                <span className="mt-0.5 block truncate text-[12px] text-[#525252]">{section.description}</span>
              </span>
              <span className="bz-h-tight shrink-0 text-[22px] leading-none tabular-nums text-[#0A0A0A]">
                {numberFmt.format(section.count)}
              </span>
              <ChevronRight
                size={14}
                strokeWidth={2}
                aria-hidden="true"
                className="shrink-0 text-[#A3A3A3] transition-colors group-hover:text-[#0A0A0A]"
              />
            </Link>
          );
        })}
      </div>

      {/* Public preview — single-row affordance. */}
      <div className="mt-3 bz-card-soft flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-4">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className="shrink-0 inline-flex items-center justify-center rounded-lg bg-white"
            style={{ width: 28, height: 28, border: '1px solid #EDEDED', color: '#0A0A0A' }}
            aria-hidden="true"
          >
            <Sparkles size={13} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <span className="block text-[12px] font-medium text-[#525252]">
              {isTr ? 'Müşteri sayfası' : 'Customer page'}
            </span>
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
          <CopyUrlButton url={publicUrl} locale={locale} className="h-11 w-11 sm:h-8 sm:w-8" />
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bz-btn-icon h-11 w-11 sm:h-8 sm:w-8"
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
        className="bz-card mt-3 flex min-h-[56px] items-center gap-3 p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2"
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
    </div>
  );
}
