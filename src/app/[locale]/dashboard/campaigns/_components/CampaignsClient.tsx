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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader, AlertBanner, EmptyState, PulseSelect } from '@/components/ui';
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

import type { SectorKey } from '@/lib/sector-platforms';

interface RestaurantOption {
  id: string;
  name: string;
  campaignsEnabled: boolean;
  sector?: SectorKey;
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

const STATUS_FILTER_KEYS = [
  'all',
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'sending',
  'sent',
  'failed',
] as const;
type StatusFilter = (typeof STATUS_FILTER_KEYS)[number];

interface CampaignsPagination {
  page: number;
  total: number;
  pageSize: number;
}

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
  const [loadingMore, setLoadingMore] = useState(false);
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
  const [pagination, setPagination] = useState<CampaignsPagination>({
    page: 1,
    total: 0,
    pageSize: 20,
  });
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const restaurantId = (event as CustomEvent<{ restaurantId?: string }>).detail?.restaurantId;
      if (restaurantId && restaurants.some((restaurant) => restaurant.id === restaurantId)) {
        setActiveRestaurantId(restaurantId);
      }
    };
    window.addEventListener('buaze:active-restaurant-change', handler);
    return () => window.removeEventListener('buaze:active-restaurant-change', handler);
  }, [restaurants]);

  const selectRestaurant = (restaurantId: string) => {
    setActiveRestaurantId(restaurantId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, restaurantId);
      window.dispatchEvent(
        new CustomEvent('buaze:active-restaurant-change', {
          detail: { restaurantId },
        }),
      );
    }
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.delete('restaurant');
    params.set('restaurantId', restaurantId);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const fetchCampaigns = useCallback(
    async (pageToLoad = 1, append = false) => {
      if (restaurantsLoading) {
        return;
      }
      if (!activeRestaurantId) {
        setCampaigns([]);
        setPagination({ page: 1, total: 0, pageSize: 20 });
        setLoading(false);
        setLoadingMore(false);
        return;
      }
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      try {
        const url = new URL('/api/customer-campaigns', window.location.origin);
        url.searchParams.set('restaurantId', activeRestaurantId);
        url.searchParams.set('page', String(pageToLoad));
        if (statusFilter !== 'all') url.searchParams.set('status', statusFilter);
        const res = await fetch(url.toString(), { credentials: 'include' });
        if (!res.ok) throw new Error('campaigns_fetch_failed');
        const data = await res.json();
        const nextCampaigns = Array.isArray(data?.campaigns) ? data.campaigns : [];
        setCampaigns((current) => (append ? [...current, ...nextCampaigns] : nextCampaigns));
        setPagination({
          page: typeof data?.page === 'number' ? data.page : pageToLoad,
          total: typeof data?.total === 'number' ? data.total : nextCampaigns.length,
          pageSize: typeof data?.pageSize === 'number' ? data.pageSize : 20,
        });
        setError(null);
      } catch (err) {
        setError(isTr ? 'Kampanyalar yüklenemedi.' : 'Failed to load campaigns.');
        console.error('[campaigns] list fetch', err);
      } finally {
        if (append) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [activeRestaurantId, isTr, restaurantsLoading, statusFilter],
  );

  // Fetch campaigns whenever restaurant or filter changes.
  useEffect(() => {
    void fetchCampaigns(1, false);
  }, [fetchCampaigns, refreshTick]);

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
  const hasMoreCampaigns = campaigns.length < pagination.total;
  const loadMore = () => {
    if (loading || loadingMore || !hasMoreCampaigns) return;
    void fetchCampaigns(pagination.page + 1, true);
  };

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
              <PulseSelect
                value={activeRestaurantId ?? ''}
                onChange={selectRestaurant}
                options={restaurants.map((r) => ({
                  value: r.id,
                  label: `${r.name}${!r.campaignsEnabled ? ` (${isTr ? 'Pasif' : 'Disabled'})` : ''}`,
                }))}
                ariaLabel={isTr ? 'İşletme seç' : 'Select business'}
                className="min-w-[200px] max-w-[280px]"
              />
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
                pending_approval: { tr: 'Onayda', en: 'Pending' },
                approved: { tr: 'Onaylandı', en: 'Approved' },
                rejected: { tr: 'Reddedildi', en: 'Rejected' },
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
            <div className="space-y-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12px] text-[#737373]">
                  {isTr
                    ? `${pagination.total.toLocaleString('tr-TR')} kampanyadan ${campaigns.length.toLocaleString('tr-TR')} tanesi gösteriliyor`
                    : `Showing ${campaigns.length.toLocaleString('en-US')} of ${pagination.total.toLocaleString('en-US')} campaigns`}
                </p>
                {pagination.total > pagination.pageSize ? (
                  <span className="bz-mono text-[11px] text-[#A3A3A3]">
                    {isTr ? `Sayfa ${pagination.page}` : `Page ${pagination.page}`}
                  </span>
                ) : null}
              </div>
              <CampaignsList
                campaigns={campaigns}
                isTr={isTr}
                onRowClick={openDetail}
              />
              {hasMoreCampaigns ? (
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="bz-btn-ghost inline-flex min-h-[38px] items-center gap-2 px-4 text-[12.5px] disabled:opacity-60"
                  >
                    {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
                    {isTr ? 'Daha fazla yükle' : 'Load more'}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}

      {composeOpen && activeRestaurantId ? (
        <CampaignComposeModal
          isTr={isTr}
          restaurantId={activeRestaurantId}
          sector={
            restaurants.find((r) => r.id === activeRestaurantId)?.sector ?? null
          }
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
