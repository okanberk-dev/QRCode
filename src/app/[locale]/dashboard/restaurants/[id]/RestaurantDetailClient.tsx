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
  StatCardSkeleton,
} from '@/components/ui';

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
 *   - Skeleton loading state (StatCardSkeleton + bz-skeleton placeholders)
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
        const res = await fetch(`/api/restaurants/${id}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || (isTr ? 'İşletme yüklenemedi.' : 'Failed to load.'));
        }
        const json = await res.json();
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
      className="bz-mono text-[11px] text-[#737373] hover:text-[#0A0A0A] inline-flex items-center gap-1 mb-3"
    >
      <ArrowLeft size={12} />
      {isTr ? 'İşletmelere dön' : 'Back to businesses'}
    </Link>
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 sm:px-7 py-6 lg:py-8">
        {backLink}
        <div className="space-y-2">
          <div className="bz-skeleton h-3 w-28" />
          <div className="bz-skeleton h-8 w-72" />
          <div className="bz-skeleton h-3 w-48" />
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="mt-4 bz-card p-4">
          <div className="bz-skeleton h-4 w-2/3" />
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bz-card p-5">
            <div className="bz-skeleton h-4 w-24" />
            <div className="bz-skeleton mt-3 h-3 w-40" />
          </div>
          <div className="bz-card p-5">
            <div className="bz-skeleton h-4 w-24" />
            <div className="bz-skeleton mt-3 h-3 w-40" />
          </div>
          <div className="bz-card p-5">
            <div className="bz-skeleton h-4 w-24" />
            <div className="bz-skeleton mt-3 h-3 w-40" />
          </div>
          <div className="bz-card p-5">
            <div className="bz-skeleton h-4 w-24" />
            <div className="bz-skeleton mt-3 h-3 w-40" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[920px] px-5 sm:px-7 py-8">
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
  const publicUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/r/${data.slug}` : `/r/${data.slug}`;
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
        ? 'Genel, marka, entegrasyon, operasyonel, güvenlik'
        : 'General, brand, integrations, operations, security',
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
    <div className="mx-auto max-w-[1100px] px-4 sm:px-7 py-6 lg:py-8">
      {backLink}

      <PageHeader
        eyebrow={isTr ? 'İŞLETME ÖZETİ' : 'BUSINESS OVERVIEW'}
        title={data.name}
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
          <CopyUrlButton url={publicUrl} />
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
