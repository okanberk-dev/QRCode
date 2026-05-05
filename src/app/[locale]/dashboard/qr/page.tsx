'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Download, Grid3x3, List as ListIcon, Loader2, Plus, QrCode, Trash2 } from 'lucide-react';
import {
  AlertBanner,
  Badge,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  PlatformChip,
  type PlatformId,
} from '@/components/ui';
import { CreateQRModal, type QRGenerationResult } from '@/components/panel/qr/CreateQRModal';
import { QRCard, type QRCardItem } from '@/components/panel/qr/QRCard';
import { dedupeQrRows } from '@/lib/qr-signature';

interface Restaurant {
  id: string;
  slug: string;
  name: string;
  isActive?: boolean;
  // Forwarded to <CreateQRModal> so the platform grid can be filtered to
  // (sector ∩ configured URLs) instead of the legacy hardcoded 4.
  category?: string | null;
  googlePlaceId?: string | null;
  yemekSepetiUrl?: string | null;
  getirYemekUrl?: string | null;
  trendyolYemekUrl?: string | null;
  tripAdvisorUrl?: string | null;
  airbnbUrl?: string | null;
  bookingUrl?: string | null;
  yandexUrl?: string | null;
  externalPlatformsEnabled?: boolean;
}

interface QrHistoryItem {
  id: string;
  qrUrl: string;
  tableNumber: string | null;
  platform: string | null;
  serviceType?: string | null;
  type?: string | null;
  createdAt: string;
  restaurantId: string;
}

const PLATFORM_TO_CHIP: Record<string, PlatformId> = {
  google: 'google',
  yemeksepeti: 'yemeksepeti',
  getir: 'getir',
  trendyol_go: 'trendyol_go',
  tripadvisor: 'tripadvisor',
  airbnb: 'airbnb',
  booking: 'booking',
  yandex: 'yandex',
};

const PLATFORM_LABELS: Record<string, string> = {
  google: 'Google Maps',
  yemeksepeti: 'Yemeksepeti',
  getir: 'Getir Yemek',
  trendyol_go: 'Trendyol GO',
  tripadvisor: 'Tripadvisor',
  airbnb: 'Airbnb',
  booking: 'Booking',
  yandex: 'Yandex',
};

export default function DashboardQrPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale === 'en' ? 'en' : 'tr';
  const isTr = locale === 'tr';
  const preselected = searchParams.get('restaurant') || searchParams.get('restaurantId') || '';

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [items, setItems] = useState<QrHistoryItem[]>([]);
  const [svgs, setSvgs] = useState<Record<string, string>>({});
  // `loading` stays true until BOTH the restaurants fetch and the
  // per-restaurant history fetches resolve. The `restaurantsLoaded`
  // gate prevents the second effect from prematurely flipping
  // loading=false on the very first render (when restaurants is still
  // the initial empty array) — that drift was producing a brief
  // "Henüz işletme eklenmemiş" / "Henüz QR oluşturulmadı" flash before
  // the real data landed.
  const [restaurantsLoaded, setRestaurantsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showCreate, setShowCreate] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<QrHistoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Modal kapanışında "QR oluşturuldu / yeniden oluşturuldu" görünür
  // feedback. Backend `rememberFeedbackQr` aynı tuple varsa update yapar
  // (CLAUDE.md §34.5 distinct count) — kullanıcı için "yeni" gibi görünür.
  const [createNotice, setCreateNotice] = useState<string | null>(null);

  // Filters
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  // 1) Load restaurants
  useEffect(() => {
    let cancelled = false;
    fetch('/api/restaurants')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.data || [];
        setRestaurants(list);
        if (preselected && list.some((r: Restaurant) => r.id === preselected)) {
          setBranchFilter(preselected);
        }
      })
      .catch(() => {
        if (!cancelled) setRestaurants([]);
      })
      .finally(() => {
        if (!cancelled) setRestaurantsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [preselected]);

  // 2) After restaurants load, fetch each restaurant's QR history in parallel
  useEffect(() => {
    if (!restaurantsLoaded) return;
    if (restaurants.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all(
      restaurants.map((r) =>
        fetch(`/api/restaurants/${r.id}/qr/history`)
          .then((res) => (res.ok ? res.json() : []))
          .then((rows: Array<Omit<QrHistoryItem, 'restaurantId'>>) =>
            rows.map((row) => ({ ...row, restaurantId: r.id })),
          )
          .catch(() => [] as QrHistoryItem[]),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        const flat: QrHistoryItem[] = ([] as QrHistoryItem[]).concat(...results);
        setItems(dedupeQrRows(flat));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantsLoaded, restaurants]);

  // 3) Lazy-fetch SVG for each item not yet cached
  useEffect(() => {
    if (items.length === 0) return;
    const toFetch = items.filter((item) => !svgs[item.id]);
    if (toFetch.length === 0) return;

    let cancelled = false;
    const fetchOne = async (item: QrHistoryItem) => {
      const params = new URLSearchParams({ format: 'svg' });
      if (item.tableNumber) params.set('table', item.tableNumber);
      if (item.platform) params.set('platform', item.platform);
      const res = await fetch(
        `/api/restaurants/${item.restaurantId}/qr?${params.toString()}`,
      );
      if (!res.ok) return null;
      return await res.text();
    };

    // Fan-out with a soft cap (max 8 in flight at a time)
    const queue = [...toFetch];
    const workers = Array.from({ length: Math.min(8, queue.length) }, async () => {
      while (!cancelled && queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        const svg = await fetchOne(item).catch(() => null);
        if (cancelled || !svg) continue;
        setSvgs((prev) => ({ ...prev, [item.id]: svg }));
      }
    });
    Promise.all(workers).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [items, svgs]);

  const restaurantById = useMemo(() => {
    const m = new Map<string, Restaurant>();
    for (const r of restaurants) m.set(r.id, r);
    return m;
  }, [restaurants]);

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (branchFilter !== 'all' && it.restaurantId !== branchFilter) return false;
      if (platformFilter === 'general' && it.platform) return false;
      if (platformFilter !== 'all' && platformFilter !== 'general') {
        if (it.platform !== platformFilter) return false;
      }
      return true;
    });
  }, [items, branchFilter, platformFilter]);

  const cardItems: QRCardItem[] = useMemo(() => {
    return filteredItems.map((it) => {
      const rest = restaurantById.get(it.restaurantId);
      const restName = rest?.name || (isTr ? 'İşletme' : 'Location');
      const label = it.tableNumber
        ? `${restName} · ${isTr ? 'Masa' : 'Table'} ${it.tableNumber}`
        : it.platform
          ? `${restName} · ${PLATFORM_LABELS[it.platform] || it.platform}`
          : restName;
      return {
        id: it.id,
        name: label,
        branch: restaurants.length > 1 ? restName : undefined,
        platform: it.platform,
        createdAt: it.createdAt,
        qrUrl: it.qrUrl,
        restaurantId: it.restaurantId,
        tableNumber: it.tableNumber,
      };
    });
  }, [filteredItems, restaurantById, restaurants.length, isTr]);

  const handleCreated = (result: QRGenerationResult) => {
    const newItem: QrHistoryItem = {
      id: `local_${Date.now()}`,
      qrUrl: result.qrUrl,
      tableNumber: result.tableNumber,
      platform: result.platform,
      serviceType: null,
      type: 'feedback',
      createdAt: result.createdAt,
      restaurantId: result.restaurantId,
    };
    setItems((prev) => dedupeQrRows([newItem, ...prev]));
    setSvgs((prev) => ({ ...prev, [newItem.id]: result.svg }));
    // Görünür feedback — modal kapandı + kullanıcı listede yeni satırı görür.
    // 3 saniye sonra otomatik kaybolur.
    setCreateNotice(isTr ? 'QR kodu oluşturuldu.' : 'QR code created.');
    setTimeout(() => setCreateNotice(null), 3000);
    // Refresh from API to get the canonical id
    setTimeout(() => {
      fetch(`/api/restaurants/${result.restaurantId}/qr/history`)
        .then((res) => (res.ok ? res.json() : []))
        .then((rows: Array<Omit<QrHistoryItem, 'restaurantId'>>) => {
          const enriched = rows.map((row) => ({ ...row, restaurantId: result.restaurantId }));
          setItems((prev) => {
            const otherRestaurants = prev.filter((p) => p.restaurantId !== result.restaurantId);
            const merged = [...otherRestaurants, ...enriched];
            return dedupeQrRows(merged);
          });
        })
        .catch(() => {});
    }, 400);
  };

  // Delete confirms via ConfirmDialog (`pendingDelete` state) then runs
  // optimistically — the row vanishes from the grid the moment the
  // dialog confirms. On API failure we restore it and surface a banner.
  const requestDelete = useCallback((item: QrHistoryItem) => {
    setPendingDelete(item);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setDeleting(true);
    setPageError(null);

    // Optimistic removal — grid updates immediately. We keep the
    // SVG cache entry around so a rollback re-renders without a
    // re-fetch flash.
    setItems((prev) => prev.filter((it) => it.id !== target.id));

    try {
      const res = await fetch(
        `/api/restaurants/${target.restaurantId}/qr/history/${target.id}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        // Rollback — re-insert by createdAt order.
        setItems((prev) => dedupeQrRows([...prev, target]));
        const body = await res.json().catch(() => ({}));
        setPageError(
          isTr
            ? `QR silinemedi${body?.error ? ` — ${body.error}` : ''}.`
            : `Failed to delete QR${body?.error ? ` — ${body.error}` : ''}.`,
        );
      } else {
        // Drop the cached SVG too so a future re-creation of the same
        // (table, platform) pair doesn't render a stale preview.
        setSvgs((prev) => {
          if (!(target.id in prev)) return prev;
          const next = { ...prev };
          delete next[target.id];
          return next;
        });
      }
    } catch {
      setItems((prev) => dedupeQrRows([...prev, target]));
      setPageError(isTr ? 'Ağ hatası — QR silinemedi.' : 'Network error — could not delete QR.');
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }, [pendingDelete, isTr]);

  const downloadOne = async (item: QrHistoryItem, format: 'svg' | 'png' = 'png') => {
    const params = new URLSearchParams({ format });
    if (item.tableNumber) params.set('table', item.tableNumber);
    if (item.platform) params.set('platform', item.platform);
    const res = await fetch(`/api/restaurants/${item.restaurantId}/qr?${params.toString()}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    const rest = restaurantById.get(item.restaurantId);
    const slug = rest?.slug || 'qr';
    a.download = `qr-${slug}${item.tableNumber ? `-table-${item.tableNumber}` : ''}.${format}`;
    a.click();
    URL.revokeObjectURL(objUrl);
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
        className="bz-btn-ghost inline-flex items-center gap-1.5"
        aria-label={isTr ? 'Görünümü değiştir' : 'Toggle view'}
      >
        {view === 'grid' ? <ListIcon size={14} /> : <Grid3x3 size={14} />}
        <span className="hidden sm:inline">
          {view === 'grid' ? (isTr ? 'Liste' : 'List') : isTr ? 'Izgara' : 'Grid'}
        </span>
      </button>
      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="bz-btn-primary inline-flex items-center gap-1.5"
        disabled={restaurants.length === 0}
      >
        <Plus size={14} />
        <span className="hidden sm:inline">{isTr ? 'Yeni QR oluştur' : 'Create QR'}</span>
        <span className="sm:hidden">{isTr ? 'Yeni' : 'New'}</span>
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
      <PageHeader
        eyebrow={isTr ? 'QR KODLARI' : 'QR CODES'}
        title={isTr ? 'QR kodları' : 'QR codes'}
        description={
          isTr
            ? '4–5 yıldız veren müşteri seçtiğin platforma yönlendirilir; düşük puan dahili formda kalır.'
            : 'Customers giving 4–5 stars route to the platform you choose; lower ratings stay in the private form.'
        }
        actions={headerActions}
      />

      {pageError && (
        <AlertBanner kind="danger" onDismiss={() => setPageError(null)}>
          {pageError}
        </AlertBanner>
      )}

      {createNotice && (
        <AlertBanner kind="success" onDismiss={() => setCreateNotice(null)}>
          {createNotice}
        </AlertBanner>
      )}

      {/* Filter strip */}
      {restaurants.length > 0 && items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {restaurants.length > 1 && (
            <select
              className="bz-input"
              style={{ width: 'auto', paddingRight: 32 }}
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              aria-label={isTr ? 'Şube filtresi' : 'Branch filter'}
            >
              <option value="all">{isTr ? 'Tüm şubeler' : 'All branches'}</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
          <select
            className="bz-input"
            style={{ width: 'auto', paddingRight: 32 }}
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            aria-label={isTr ? 'Platform filtresi' : 'Platform filter'}
          >
            <option value="all">{isTr ? 'Tüm platformlar' : 'All platforms'}</option>
            <option value="general">{isTr ? 'Genel (sabitsiz)' : 'General (no pin)'}</option>
            <option value="google">Google</option>
            <option value="yemeksepeti">Yemeksepeti</option>
            <option value="getir">Getir</option>
            <option value="trendyol_go">Trendyol GO</option>
          </select>
        </div>
      )}

      {/* Mobile-only aggregate stats (mobile-screens-2.jsx MOwnerQR line 112-123 1:1)
          Toplam · Bu hafta · Toplam taranma — yatay 3-col stat strip */}
      {!loading && items.length > 0 && (
        <div className="md:hidden bz-card grid grid-cols-3 gap-2.5 p-3.5">
          {(() => {
            const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const thisWeek = items.filter(
              (it) => new Date(it.createdAt).getTime() >= oneWeekAgo,
            ).length;
            // Total scans proxy: aggregate count per qr (we don't track real
            // scans yet — show items.length as total).
            return [
              { l: isTr ? 'Toplam' : 'Total', v: items.length.toString() },
              { l: isTr ? 'Bu hafta' : 'This week', v: thisWeek.toString() },
              { l: isTr ? 'Aktif' : 'Active', v: items.length.toString() },
            ];
          })().map((s, i) => (
            <div
              key={s.l}
              className={i ? 'border-l border-[#EDEDED] pl-3' : ''}
            >
              <div className="pulse-eyebrow text-[#737373]" style={{ fontSize: 9 }}>
                {s.l}
              </div>
              <div className="bz-h-tight mt-1" style={{ fontSize: 18 }}>
                {s.v}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#0A0A0A]" />
        </div>
      )}

      {/* Empty state — no restaurants */}
      {!loading && restaurants.length === 0 && (
        <EmptyState
          icon={<QrCode size={28} />}
          title={isTr ? 'Henüz işletme eklenmemiş' : 'No locations yet'}
          body={
            isTr
              ? 'QR kodu oluşturabilmek için önce bir işletme ekleyin.'
              : 'Add a location first to start generating QR codes.'
          }
        />
      )}

      {/* Empty state — no QRs yet */}
      {!loading && restaurants.length > 0 && items.length === 0 && (
        <EmptyState
          icon={<QrCode size={28} />}
          title={isTr ? 'Henüz QR oluşturulmadı' : 'No QR codes yet'}
          body={
            isTr
              ? 'İlk QR\'ını oluştur — masaya yapıştır, müşterileri yorum kanalına yönlendir.'
              : 'Create your first QR — stick it on the table and route customers to feedback.'
          }
          action={
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="bz-btn-primary inline-flex items-center gap-1.5"
            >
              <Plus size={14} />
              {isTr ? 'Yeni QR oluştur' : 'Create QR'}
            </button>
          }
        />
      )}

      {/* Empty state — filtered out */}
      {!loading && items.length > 0 && cardItems.length === 0 && (
        <EmptyState
          icon={<QrCode size={28} />}
          title={isTr ? 'Filtreyle eşleşen QR yok' : 'No QRs match the filter'}
          body={
            isTr
              ? 'Filtreleri sıfırla veya yeni bir QR oluştur.'
              : 'Reset the filters or create a new QR.'
          }
          action={
            <button
              type="button"
              onClick={() => {
                setBranchFilter('all');
                setPlatformFilter('all');
              }}
              className="bz-btn-ghost"
            >
              {isTr ? 'Filtreleri temizle' : 'Reset filters'}
            </button>
          }
        />
      )}

      {/* Grid view */}
      {!loading && cardItems.length > 0 && view === 'grid' && (
        <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {cardItems.map((c) => {
            const raw = filteredItems.find((it) => it.id === c.id);
            return (
              <QRCard
                key={c.id}
                item={c}
                svg={svgs[c.id]}
                locale={locale}
                onDelete={raw ? () => requestDelete(raw) : undefined}
              />
            );
          })}
        </div>
      )}

      {/* List view */}
      {!loading && cardItems.length > 0 && view === 'list' && (
        <div className="bz-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="bz-table w-full">
              <thead>
                <tr>
                  <th>{isTr ? 'QR adı' : 'Name'}</th>
                  {restaurants.length > 1 && <th>{isTr ? 'Şube' : 'Branch'}</th>}
                  <th>{isTr ? 'Platform' : 'Platform'}</th>
                  <th>{isTr ? 'Hedef' : 'Target'}</th>
                  <th>{isTr ? 'Tarih' : 'Date'}</th>
                  <th>{isTr ? 'Durum' : 'Status'}</th>
                  <th aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {cardItems.map((c) => {
                  const rawItem = filteredItems.find((it) => it.id === c.id)!;
                  const created = new Date(c.createdAt);
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      {restaurants.length > 1 && (
                        <td style={{ color: '#525252' }}>{c.branch || '—'}</td>
                      )}
                      <td>
                        {c.platform && PLATFORM_TO_CHIP[c.platform] ? (
                          <span className="inline-flex items-center gap-1.5">
                            <PlatformChip
                              id={PLATFORM_TO_CHIP[c.platform]}
                              size={14}
                            />
                            <span className="text-[12px]">
                              {PLATFORM_LABELS[c.platform]}
                            </span>
                          </span>
                        ) : (
                          <span style={{ color: '#737373' }}>
                            {isTr ? 'Genel' : 'General'}
                          </span>
                        )}
                      </td>
                      <td className="bz-mono" style={{ fontWeight: 600 }}>
                        {c.tableNumber || '—'}
                      </td>
                      <td style={{ color: '#737373' }}>
                        {created.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td>
                        <Badge kind="ok">{isTr ? 'Aktif' : 'Active'}</Badge>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => downloadOne(rawItem, 'png')}
                            aria-label={isTr ? 'PNG indir' : 'Download PNG'}
                            title={isTr ? 'PNG indir' : 'Download PNG'}
                            className="bz-btn-icon"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDelete(rawItem)}
                            aria-label={isTr ? 'QR\'ı sil' : 'Delete QR'}
                            title={isTr ? 'Sil' : 'Delete'}
                            className="bz-btn-icon"
                            style={{ color: '#DC2626' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateQRModal
          restaurants={restaurants
            .filter((r) => r.isActive !== false)
            .map((r) => ({
              id: r.id,
              name: r.name,
              slug: r.slug,
              category: r.category ?? null,
              googlePlaceId: r.googlePlaceId ?? null,
              yemekSepetiUrl: r.yemekSepetiUrl ?? null,
              getirYemekUrl: r.getirYemekUrl ?? null,
              trendyolYemekUrl: r.trendyolYemekUrl ?? null,
              tripAdvisorUrl: r.tripAdvisorUrl ?? null,
              airbnbUrl: r.airbnbUrl ?? null,
              bookingUrl: r.bookingUrl ?? null,
              yandexUrl: r.yandexUrl ?? null,
              externalPlatformsEnabled: r.externalPlatformsEnabled ?? true,
            }))}
          defaultRestaurantId={preselected || undefined}
          locale={locale}
          panelBase={`/${locale}/dashboard`}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        variant="danger"
        title={isTr ? 'Bu QR kaydını sil' : 'Delete this QR record'}
        body={
          isTr
            ? 'QR sadece panel listenizden kaldırılır. Daha önce basılan QR sticker\'ları çalışmaya devam eder; aynı masa veya platform için yeni bir QR oluşturmak isterseniz tekrar üretebilirsiniz.'
            : "The QR is only removed from your panel list. Previously printed stickers keep working; you can re-create one for the same table or platform anytime."
        }
        confirmLabel={isTr ? 'Sil' : 'Delete'}
        cancelLabel={isTr ? 'Vazgeç' : 'Cancel'}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
      />
    </div>
  );
}
