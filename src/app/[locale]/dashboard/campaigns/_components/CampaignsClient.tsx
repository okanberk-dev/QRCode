'use client';

// CLAUDE.md §38.99 — Owner panel campaign management (placeholder rewrite).
//
// Müşteri segmentlerine pazarlama onaylı (KVKK §19.1 + §38.48 Wave 2 gate)
// e-posta kampanyaları gönderme. MVP scope (CLAUDE.md §38.99 kullanıcı kararı):
//   - Recipient: SADECE "Tüm pazarlama onaylı müşteriler"
//     (segment / manuel ekleme YOK — CLAUDE.md §38.64 disipline)
//   - 5 endpoint: /api/customer-campaigns/* (list / detail / send / logs / preview)
//   - Admin master flag: Restaurant.campaignsEnabled (CLAUDE.md §38.98)
//   - Audit log: owner.campaigns.{create,send,delete}

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader, AlertBanner, EmptyState } from '@/components/ui';
import { Sparkles, Plus, RefreshCw, Loader2 } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { CampaignsKpiGrid } from './CampaignsKpiGrid';
import { CampaignsList } from './CampaignsList';
import { CampaignComposeModal } from './CampaignComposeModal';
import { CampaignDetailDrawer } from './CampaignDetailDrawer';
import { CampaignsEmptyState } from './CampaignsEmptyState';
import {
  shouldShowCampaignRestaurantsEmptyState,
} from '@/lib/campaigns-initial-state';
import { ACTIVE_BUSINESS_STORAGE_KEY, resolveActiveRestaurantId } from '@/lib/active-business';

interface RestaurantOption {
  id: string;
  name: string;
  campaignsEnabled: boolean;
}

export interface CampaignListItem {
  id: string;
  restaurantId: string;
  restaurantName: string | null;
  subject: string;
  status: 'draft' | 'sending' | 'sent' | 'failed' | string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  deliveryRate: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

const STATUS_FILTER_KEYS = ['all', 'draft', 'sending', 'sent', 'failed'] as const;
type StatusFilter = (typeof STATUS_FILTER_KEYS)[number];

interface ClientProps {
  locale: Locale;
  initialRestaurants: RestaurantOption[];
  initialActiveRestaurantId: string | null;
}

export function CampaignsClient({ locale, initialRestaurants, initialActiveRestaurantId }: ClientProps) {
  const isTr = locale === 'tr';

  const router = useRouter();
  const searchParams = useSearchParams();
  const detailId = searchParams?.get('detail') ?? null;

  const [loading, setLoading] = useState(false);
  const [restaurantsLoading] = useState(false);
  const [restaurants] = useState<RestaurantOption[]>(initialRestaurants);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(
    () => {
      const stored =
        typeof window !== 'undefined'
          ? window.localStorage.getItem(ACTIVE_BUSINESS_STORAGE_KEY)
          : null;
      return resolveActiveRestaurantId({
        restaurants: initialRestaurants,
        queryRestaurantId: initialActiveRestaurantId,
        storedRestaurantId: stored,
      });
    },
  );
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [composeOpen, setComposeOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = searchParams?.get('restaurantId') ?? searchParams?.get('restaurant');
    if (fromUrl && restaurants.some((restaurant) => restaurant.id === fromUrl)) {
      setActiveRestaurantId(fromUrl);
    }
  }, [searchParams, restaurants]);

  const selectRestaurant = (restaurantId: string) => {
    setActiveRestaurantId(restaurantId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, restaurantId);
    }
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.delete('restaurant');
    params.set('restaurantId', restaurantId);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Fetch campaigns whenever restaurant or filter changes.
  useEffect(() => {
    if (restaurantsLoading) {
      return;
    }
    if (!activeRestaurantId) {
      setCampaigns([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const url = new URL('/api/customer-campaigns', window.location.origin);
        url.searchParams.set('restaurantId', activeRestaurantId);
        if (statusFilter !== 'all') url.searchParams.set('status', statusFilter);
        const res = await fetch(url.toString(), { credentials: 'include' });
        if (!res.ok) throw new Error('campaigns_fetch_failed');
        const data = await res.json();
        if (!cancelled) {
          setCampaigns(Array.isArray(data?.campaigns) ? data.campaigns : []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(isTr ? 'Kampanyalar yüklenemedi.' : 'Failed to load campaigns.');
          console.error('[campaigns] list fetch', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeRestaurantId, statusFilter, refreshTick, isTr, restaurantsLoading]);

  const activeRestaurant = useMemo(
    () => restaurants.find((r) => r.id === activeRestaurantId) ?? null,
    [restaurants, activeRestaurantId],
  );

  const isDisabled = activeRestaurant ? !activeRestaurant.campaignsEnabled : false;
  const pageLoading = restaurantsLoading || loading;
  const showNoRestaurantsState = shouldShowCampaignRestaurantsEmptyState({
    restaurantsLoaded: !restaurantsLoading,
    restaurantCount: restaurants.length,
    campaignsLoading: loading,
  });

  // KPI compute (client-side from full list — pagination caller responsibility)
  const kpi = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const sentThisMonth = campaigns.filter(
      (c) => c.status === 'sent' && c.sentAt && new Date(c.sentAt) >= monthStart,
    ).length;
    const totalSent = campaigns.filter((c) => c.status === 'sent');
    const avgDeliveryRate =
      totalSent.length > 0
        ? Math.round(
            (totalSent.reduce((acc, c) => acc + c.deliveryRate, 0) / totalSent.length) * 10,
          ) / 10
        : 0;
    const skippedTotal = totalSent.reduce(
      (acc, c) => acc + Math.max(c.recipientCount - c.sentCount - c.failedCount, 0),
      0,
    );
    const recipientTotal = totalSent.reduce((acc, c) => acc + c.recipientCount, 0);
    const skipRate =
      recipientTotal > 0 ? Math.round((skippedTotal / recipientTotal) * 1000) / 10 : 0;
    return {
      total: campaigns.length,
      sentThisMonth,
      avgDeliveryRate,
      skipRate,
    };
  }, [campaigns]);

  const refresh = () => setRefreshTick((t) => t + 1);

  const openDetail = (campaignId: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('detail', campaignId);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const closeDetail = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.delete('detail');
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : '', { scroll: false });
  };

  // Stage 31a §38.107 — Stage 30 CampaignsLocked early-return revert. Feature
  // sidebar/page'de görünür kalır (Stage 29 davranışı). campaignsEnabled=false
  // durumunda "Yeni kampanya" butonu disabled + AlertBanner info ("admin onayıyla
  // aktif edilir"). Backend gate intact (POST 403 Stage 30 §38.106).
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-5">
      <PageHeader
        eyebrow={isTr ? 'CRM / KAMPANYALAR' : 'CRM / CAMPAIGNS'}
        title={isTr ? 'Kampanyalar' : 'Campaigns'}
        description={
          isTr
            ? 'Pazarlama onayı veren müşterilere e-posta kampanyaları gönder. Sadece sistemde olan müşteriler hedef alınır.'
            : 'Send email campaigns to marketing-consented customers. Only customers in your system are targeted.'
        }
        titleScale="compact"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={refresh}
              className="bz-btn-ghost flex items-center gap-1.5 px-3 min-h-[36px] text-[12px] sm:text-[13px]"
              aria-label={isTr ? 'Yenile' : 'Refresh'}
              disabled={pageLoading}
            >
              <RefreshCw size={14} className={pageLoading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{isTr ? 'Yenile' : 'Refresh'}</span>
            </button>
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              disabled={isDisabled || !activeRestaurantId || restaurantsLoading}
              className="bz-btn-primary flex items-center gap-1.5 px-3.5 min-h-[40px] text-[12.5px] sm:text-[13.5px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={15} strokeWidth={2.4} />
              <span>{isTr ? 'Yeni kampanya' : 'New campaign'}</span>
            </button>
          </div>
        }
      />

      {error ? (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      ) : null}

      {showNoRestaurantsState ? (
        <EmptyState
          icon={<Sparkles size={32} className="text-[#A8D62E]" strokeWidth={2} />}
          title={isTr ? 'Henüz işletme yok' : 'No businesses yet'}
          body={
            isTr
              ? 'Kampanya göndermek için önce bir işletme oluşturmanız gerekiyor.'
              : 'Create a business first to send campaigns.'
          }
        />
      ) : (
        <>
          {/* Restaurant selector (multi-restaurant owner) */}
          {restaurants.length > 1 ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="pulse-eyebrow text-[10.5px] text-[#737373]">
                {isTr ? 'İŞLETME' : 'BUSINESS'}
              </span>
              <select
                value={activeRestaurantId ?? ''}
                onChange={(e) => selectRestaurant(e.target.value)}
                className="bz-input min-h-[36px] !py-1.5 !px-3 text-[12.5px] max-w-[260px]"
              >
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {!r.campaignsEnabled ? `(${isTr ? 'Pasif' : 'Disabled'})` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {isDisabled ? (
            <AlertBanner kind="info">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <span className="text-[12.5px] leading-[1.55]">
                  {isTr
                    ? 'Kampanya gönderim özelliği bu işletme için henüz aktif değil. Buaze ekibine ulaşarak aktivasyon talep edebilirsiniz.'
                    : 'The campaign feature is not yet active for this business. Contact the Buaze team to request activation.'}
                </span>
                <a
                  href={`mailto:support@buaze.com?subject=${encodeURIComponent(
                    isTr
                      ? 'Kampanya özelliği için erişim talebi'
                      : 'Campaign feature access request',
                  )}`}
                  className="bz-btn-ghost flex shrink-0 items-center gap-1.5 self-start whitespace-nowrap px-3 py-1.5 text-[12px] sm:self-auto"
                >
                  {isTr ? 'Ekibe ulaş' : 'Contact team'}
                </a>
              </div>
            </AlertBanner>
          ) : null}

          <CampaignsKpiGrid kpi={kpi} isTr={isTr} loading={pageLoading} />

          {/* Filter chip strip */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_FILTER_KEYS.map((key) => {
              const isActive = statusFilter === key;
              const labels: Record<StatusFilter, { tr: string; en: string }> = {
                all: { tr: 'Tümü', en: 'All' },
                draft: { tr: 'Taslak', en: 'Draft' },
                sending: { tr: 'Gönderiliyor', en: 'Sending' },
                sent: { tr: 'Gönderildi', en: 'Sent' },
                failed: { tr: 'Başarısız', en: 'Failed' },
              };
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`bz-motion-spring inline-flex items-center px-3 py-1.5 rounded-full text-[12px] font-medium border ${
                    isActive
                      ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                      : 'bg-white text-[#525252] border-[#EDEDED] hover:bg-[#FAFAFA]'
                  }`}
                  aria-pressed={isActive}
                >
                  {labels[key][isTr ? 'tr' : 'en']}
                </button>
              );
            })}
          </div>

          {pageLoading ? (
            <div className="bz-card p-12 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-[#A3A3A3]" />
            </div>
          ) : campaigns.length === 0 ? (
            <CampaignsEmptyState
              isTr={isTr}
              disabled={isDisabled}
              onCreate={() => setComposeOpen(true)}
            />
          ) : (
            <CampaignsList
              campaigns={campaigns}
              isTr={isTr}
              onRowClick={openDetail}
            />
          )}
        </>
      )}

      {composeOpen && activeRestaurantId ? (
        <CampaignComposeModal
          isTr={isTr}
          restaurantId={activeRestaurantId}
          onClose={() => setComposeOpen(false)}
          onCreated={(campaignId) => {
            setComposeOpen(false);
            refresh();
            openDetail(campaignId);
          }}
        />
      ) : null}

      {detailId ? (
        <CampaignDetailDrawer
          campaignId={detailId}
          isTr={isTr}
          onClose={closeDetail}
          onChanged={refresh}
        />
      ) : null}
    </div>
  );
}
