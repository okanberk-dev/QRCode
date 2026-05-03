'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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

function AdminQrContent() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get('restaurant') || searchParams.get('restaurantId') || '';

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [items, setItems] = useState<QrHistoryItem[]>([]);
  const [svgs, setSvgs] = useState<Record<string, string>>({});
  // See `src/app/[locale]/dashboard/qr/page.tsx` — same flash-prevention
  // gate. `loading` only flips false once both fetches have a chance to
  // settle.
  const [restaurantsLoaded, setRestaurantsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showCreate, setShowCreate] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<QrHistoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  // 1) Load restaurants (admin scope returns all from /api/restaurants when authed)
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

  // 2) Fetch each restaurant's QR history
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

  // 3) Lazy-fetch SVGs (max 8 in flight)
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
      const restName = rest?.name || 'İşletme';
      const label = it.tableNumber
        ? `${restName} · Masa ${it.tableNumber}`
        : it.platform
          ? `${restName} · ${PLATFORM_LABELS[it.platform] || it.platform}`
          : restName;
      return {
        id: it.id,
        name: label,
        // Admin always sees branch (tüm işletmeler kapsam)
        branch: restName,
        platform: it.platform,
        createdAt: it.createdAt,
        qrUrl: it.qrUrl,
        restaurantId: it.restaurantId,
        tableNumber: it.tableNumber,
      };
    });
  }, [filteredItems, restaurantById]);

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

  const requestDelete = useCallback((item: QrHistoryItem) => {
    setPendingDelete(item);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setDeleting(true);
    setPageError(null);
    setItems((prev) => prev.filter((it) => it.id !== target.id));

    try {
      const res = await fetch(
        `/api/restaurants/${target.restaurantId}/qr/history/${target.id}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        setItems((prev) => dedupeQrRows([...prev, target]));
        const body = await res.json().catch(() => ({}));
        setPageError(`QR silinemedi${body?.error ? ` — ${body.error}` : ''}.`);
      } else {
        setSvgs((prev) => {
          if (!(target.id in prev)) return prev;
          const next = { ...prev };
          delete next[target.id];
          return next;
        });
      }
    } catch {
      setItems((prev) => dedupeQrRows([...prev, target]));
      setPageError('Ağ hatası — QR silinemedi.');
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }, [pendingDelete]);

  const downloadOne = async (item: QrHistoryItem, format: 'svg' | 'png' = 'png') => {
    const params = new URLSearchParams({ format });
    if (item.tableNumber) params.set('table', item.tableNumber);
    if (item.platform) params.set('platform', item.platform);
    const res = await fetch(`/api/restaurants/${item.restaurantId}/qr?${params.toString()}`);
    if (!res.ok) {
      setPageError('QR indirme başarısız oldu.');
      return;
    }
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
        aria-label="Görünümü değiştir"
      >
        {view === 'grid' ? <ListIcon size={14} /> : <Grid3x3 size={14} />}
        <span className="hidden sm:inline">{view === 'grid' ? 'Liste' : 'Izgara'}</span>
      </button>
      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="bz-btn-primary inline-flex items-center gap-1.5"
        disabled={restaurants.length === 0}
      >
        <Plus size={14} />
        <span className="hidden sm:inline">Yeni QR oluştur</span>
        <span className="sm:hidden">Yeni</span>
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
      <PageHeader
        eyebrow="QR YÖNETİMİ"
        title="QR kodları"
        description="Tüm işletmelere ait QR kodlarını tek noktadan oluştur, düzenle, indir."
        actions={headerActions}
      />

      {pageError && (
        <AlertBanner kind="danger" onDismiss={() => setPageError(null)}>
          {pageError}
        </AlertBanner>
      )}

      {restaurants.length > 0 && items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <select
            className="bz-input"
            style={{ width: 'auto', paddingRight: 32 }}
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            aria-label="İşletme filtresi"
          >
            <option value="all">Tüm işletmeler</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <select
            className="bz-input"
            style={{ width: 'auto', paddingRight: 32 }}
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            aria-label="Platform filtresi"
          >
            <option value="all">Tüm platformlar</option>
            <option value="general">Genel (sabitsiz)</option>
            <option value="google">Google</option>
            <option value="yemeksepeti">Yemeksepeti</option>
            <option value="getir">Getir</option>
            <option value="trendyol_go">Trendyol GO</option>
          </select>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#0A0A0A]" />
        </div>
      )}

      {!loading && restaurants.length === 0 && (
        <EmptyState
          icon={<QrCode size={28} />}
          title="Henüz işletme yok"
          body="Sistemde aktif bir işletme bulunmuyor. Önce işletme ekleyin."
        />
      )}

      {!loading && restaurants.length > 0 && items.length === 0 && (
        <EmptyState
          icon={<QrCode size={28} />}
          title="Henüz QR oluşturulmadı"
          body="İşletmeler için QR kodu oluşturmaya başlamak üzere yukarıdaki butonu kullan."
          action={
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="bz-btn-primary inline-flex items-center gap-1.5"
            >
              <Plus size={14} />
              Yeni QR oluştur
            </button>
          }
        />
      )}

      {!loading && items.length > 0 && cardItems.length === 0 && (
        <EmptyState
          icon={<QrCode size={28} />}
          title="Filtreyle eşleşen QR yok"
          body="Filtreleri sıfırla veya yeni bir QR oluştur."
          action={
            <button
              type="button"
              onClick={() => {
                setBranchFilter('all');
                setPlatformFilter('all');
              }}
              className="bz-btn-ghost"
            >
              Filtreleri temizle
            </button>
          }
        />
      )}

      {!loading && cardItems.length > 0 && view === 'grid' && (
        <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {cardItems.map((c) => {
            const raw = filteredItems.find((it) => it.id === c.id);
            return (
              <QRCard
                key={c.id}
                item={c}
                svg={svgs[c.id]}
                locale="tr"
                onDelete={raw ? () => requestDelete(raw) : undefined}
              />
            );
          })}
        </div>
      )}

      {/* PR5 — Mobile card fallback (lg:hidden). Tablodaki tüm bilgi
          kompakt kart formatında; primary action (PNG indir + Sil) sağda. */}
      {!loading && cardItems.length > 0 && view === 'list' && (
        <div className="lg:hidden flex flex-col gap-2.5">
          {cardItems.map((c) => {
            const rawItem = filteredItems.find((it) => it.id === c.id)!;
            const created = new Date(c.createdAt);
            return (
              <div key={c.id} className="bz-card p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-[#0A0A0A] truncate">{c.name}</span>
                      <Badge kind="ok">Aktif</Badge>
                    </div>
                    <div className="mt-1 text-[11px] text-[#525252] truncate">
                      {c.branch || '—'}
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px]">
                      {c.platform && PLATFORM_TO_CHIP[c.platform] ? (
                        <span className="inline-flex items-center gap-1.5">
                          <PlatformChip id={PLATFORM_TO_CHIP[c.platform]} size={14} />
                          <span>{PLATFORM_LABELS[c.platform]}</span>
                        </span>
                      ) : (
                        <span className="text-[#737373]">Genel</span>
                      )}
                      {c.tableNumber && (
                        <>
                          <span className="text-[#A3A3A3]">·</span>
                          <span className="bz-mono font-semibold">{c.tableNumber}</span>
                        </>
                      )}
                      <span className="text-[#A3A3A3]">·</span>
                      <span className="text-[#737373]">
                        {created.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => downloadOne(rawItem, 'png')}
                      aria-label="PNG indir"
                      className="bz-btn-icon"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDelete(rawItem)}
                      aria-label="QR'ı sil"
                      className="bz-btn-icon"
                      style={{ color: '#DC2626' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && cardItems.length > 0 && view === 'list' && (
        <div className="bz-card overflow-hidden hidden lg:block">
          <div className="overflow-x-auto">
            <table className="bz-table w-full">
              <thead>
                <tr>
                  <th>QR adı</th>
                  <th>İşletme</th>
                  <th>Platform</th>
                  <th>Hedef</th>
                  <th>Tarih</th>
                  <th>Durum</th>
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
                      <td style={{ color: '#525252' }}>{c.branch || '—'}</td>
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
                          <span style={{ color: '#737373' }}>Genel</span>
                        )}
                      </td>
                      <td className="bz-mono" style={{ fontWeight: 600 }}>
                        {c.tableNumber || '—'}
                      </td>
                      <td style={{ color: '#737373' }}>
                        {created.toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td>
                        <Badge kind="ok">Aktif</Badge>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => downloadOne(rawItem, 'png')}
                            aria-label="PNG indir"
                            title="PNG indir"
                            className="bz-btn-icon"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDelete(rawItem)}
                            aria-label="QR'ı sil"
                            title="Sil"
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
          locale="tr"
          panelBase="/admin"
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        variant="danger"
        title="Bu QR kaydını sil"
        body="QR sadece panel listenizden kaldırılır. Daha önce basılan QR sticker'ları çalışmaya devam eder; aynı masa veya platform için yeni bir QR oluşturmak isterseniz tekrar üretebilirsiniz."
        confirmLabel="Sil"
        cancelLabel="Vazgeç"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
      />
    </div>
  );
}

export default function AdminQrPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#0A0A0A]" />
        </div>
      }
    >
      <AdminQrContent />
    </Suspense>
  );
}
