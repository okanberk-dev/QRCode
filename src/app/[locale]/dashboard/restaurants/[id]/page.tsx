'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  ExternalLink,
  Loader2,
  MessageSquare,
  QrCode,
  Settings as SettingsIcon,
  UtensilsCrossed,
} from 'lucide-react';
import CopyUrlButton from '@/components/dashboard/CopyUrlButton';
import {
  AlertBanner,
  BusinessStatusBadge,
  PageHeader,
} from '@/components/ui';

/**
 * Owner restaurant detail page — Faz 4 cleanup'ından sonra (Faz 5 PR).
 *
 * Önceki 3-tab inline form (General/Platforms/Notifications, ~820 LOC)
 * `/restaurants/[id]/settings` hub'ına taşındı. Bu sayfa artık sadece
 * **özet + Settings'e geçiş**: temel kimlik, kullanım metrikleri (yorum/QR/menü
 * sayısı), public link, ve büyük "Ayarlar" CTA.
 *
 * Plan §8 Faz 4 cleanup item'ı (kullanıcı talebiyle Faz 5'e taşındı, scope
 * koruma için).
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

export default function DashboardRestaurantDetailPage() {
  const params = useParams();
  const locale = params.locale === 'en' ? 'en' : 'tr';
  const id = params.id as string;

  const [data, setData] = useState<RestaurantSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/restaurants/${id}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || (locale === 'tr' ? 'İşletme yüklenemedi.' : 'Failed to load.'));
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
  }, [id, locale]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0A0A0A]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[920px] px-5 sm:px-7 py-8">
        <AlertBanner kind="danger">{error || (locale === 'tr' ? 'İşletme bulunamadı.' : 'Not found.')}</AlertBanner>
        <div className="mt-4">
          <Link
            href={`/${locale}/dashboard/restaurants`}
            className="bz-btn-ghost inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={14} />
            {locale === 'tr' ? 'İşletmelere dön' : 'Back to businesses'}
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
  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/r/${data.slug}` : `/r/${data.slug}`;
  const dateFmt = new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Quick links — settings + sub-features the owner most-likely came for.
  const quickLinks: Array<{
    label: string;
    description: string;
    href: string;
    icon: React.ComponentType<{ size?: number }>;
    primary?: boolean;
  }> = [
    {
      label: locale === 'tr' ? 'Ayarlar' : 'Settings',
      description:
        locale === 'tr'
          ? 'Genel · Marka · Entegrasyonlar · Operasyonel · Güvenlik · Tehlikeli bölge'
          : 'General · Brand · Integrations · Operational · Security · Danger zone',
      href: `/${locale}/dashboard/restaurants/${id}/settings`,
      icon: SettingsIcon,
      primary: true,
    },
    {
      label: locale === 'tr' ? 'Yorumlar' : 'Reviews',
      description: locale === 'tr' ? 'Müşteri yorumları ve yanıtlar' : 'Customer reviews and replies',
      href: `/${locale}/dashboard/feedbacks?restaurantId=${id}`,
      icon: MessageSquare,
    },
    {
      label: locale === 'tr' ? 'QR kodlar' : 'QR codes',
      description: locale === 'tr' ? 'Üretilen QR geçmişi ve yeni kart' : 'Generated QR history and new code',
      href: `/${locale}/dashboard/qr?restaurantId=${id}`,
      icon: QrCode,
    },
    {
      label: locale === 'tr' ? 'Menü' : 'Menu',
      description: locale === 'tr' ? 'Kategoriler ve ürün düzeni' : 'Categories and product layout',
      href: `/${locale}/dashboard/restaurants/${id}/menu`,
      icon: UtensilsCrossed,
    },
  ];

  return (
    <div className="mx-auto max-w-[1100px] px-5 sm:px-7 py-6 lg:py-8">
      <Link
        href={`/${locale}/dashboard/restaurants`}
        className="bz-mono text-[11px] text-[#737373] hover:text-[#0A0A0A] inline-flex items-center gap-1 mb-3"
      >
        <ArrowLeft size={12} />
        {locale === 'tr' ? 'İşletmelere dön' : 'Back to businesses'}
      </Link>

      <PageHeader
        eyebrow={locale === 'tr' ? 'İŞLETME ÖZETİ' : 'BUSINESS OVERVIEW'}
        title={data.name}
        description={
          <span className="inline-flex items-center gap-1.5">
            <span className="bz-mono text-[12px]">/{data.slug}</span>
            <CopyUrlButton url={publicUrl} />
          </span>
        }
        actions={<BusinessStatusBadge status={status} />}
      />

      {/* Identity strip */}
      <div className="bz-card mt-6 p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Meta label={locale === 'tr' ? 'Kategori' : 'Category'} value={data.category} icon={<Building2 size={16} />} />
        <Meta
          label={locale === 'tr' ? 'Toplam yorum' : 'Total reviews'}
          value={String(data.feedbacks)}
          icon={<MessageSquare size={16} />}
        />
        <Meta
          label={locale === 'tr' ? 'QR kodlar' : 'QR codes'}
          value={String(data.qrGenerations)}
          icon={<QrCode size={16} />}
        />
        <Meta
          label={locale === 'tr' ? 'Menü ürünü' : 'Menu items'}
          value={String(data.menuItems)}
          icon={<UtensilsCrossed size={16} />}
        />
      </div>

      {/* Public preview */}
      <div className="mt-4 flex items-center gap-3 px-4 py-3 bz-card-soft" style={{ borderRadius: 12 }}>
        <ExternalLink size={14} className="shrink-0 text-[#737373]" aria-hidden="true" />
        <span className="text-[12.5px] text-[#525252] flex-1 truncate">
          {locale === 'tr' ? 'Müşteri sayfası' : 'Customer page'}:{' '}
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bz-mono text-[#0A0A0A] hover:underline"
          >
            {publicUrl}
          </a>
        </span>
        <span className="text-[11px] text-[#737373] shrink-0">
          {locale === 'tr' ? 'Son güncelleme' : 'Updated'} {dateFmt.format(new Date(data.updatedAt))}
        </span>
      </div>

      {/* Quick links — Settings primary CTA */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {quickLinks.map((q) => {
          const Icon = q.icon;
          return (
            <Link
              key={q.href}
              href={q.href}
              className={
                q.primary
                  ? 'bz-card relative p-5 sm:p-6 group transition-transform hover:-translate-y-0.5 sm:col-span-2'
                  : 'bz-card p-4 sm:p-5 group transition-transform hover:-translate-y-0.5'
              }
              style={
                q.primary
                  ? { background: '#0A0A0A', color: '#FFFFFF', borderColor: '#0A0A0A' }
                  : undefined
              }
            >
              <div className="flex items-start gap-3">
                <div
                  className="shrink-0 flex items-center justify-center"
                  style={{
                    width: q.primary ? 44 : 36,
                    height: q.primary ? 44 : 36,
                    borderRadius: 12,
                    background: q.primary ? '#C6F24E' : '#FAFAFA',
                    color: q.primary ? '#0A0A0A' : '#0A0A0A',
                    border: q.primary ? 'none' : '1px solid #EDEDED',
                  }}
                >
                  <Icon size={q.primary ? 20 : 16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <h3
                      className={`bz-h-tight ${q.primary ? 'text-[18px]' : 'text-[14px]'}`}
                      style={{ color: q.primary ? '#FFFFFF' : '#0A0A0A' }}
                    >
                      {q.label}
                    </h3>
                    <ChevronRight
                      size={q.primary ? 18 : 14}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                  <p
                    className={`mt-1 ${q.primary ? 'text-[13px]' : 'text-[12px]'} leading-[1.55]`}
                    style={{ color: q.primary ? 'rgba(255,255,255,0.72)' : '#525252' }}
                  >
                    {q.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

interface MetaProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

function Meta({ label, value, icon }: MetaProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="shrink-0 flex items-center justify-center"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: '#FAFAFA',
          border: '1px solid #EDEDED',
          color: '#525252',
        }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="bz-mono text-[10.5px] uppercase tracking-wider text-[#737373]">{label}</div>
        <div className="bz-h-tight text-[16px] text-[#0A0A0A] truncate">{value}</div>
      </div>
    </div>
  );
}
