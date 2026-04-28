'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Grid3x3, List as ListIcon, Loader2, MoreHorizontal, Plus, QrCode } from 'lucide-react';
import {
  AlertBanner,
  Badge,
  EmptyState,
  PageHeader,
  PlatformChip,
  type PlatformId,
} from '@/components/ui';
import { CreateQRModal, type QRGenerationResult } from '@/components/panel/qr/CreateQRModal';
import { QRCard, type QRCardItem } from '@/components/panel/qr/QRCard';

interface Restaurant {
  id: string;
  slug: string;
  name: string;
  isActive?: boolean;
}

interface QrHistoryItem {
  id: string;
  qrUrl: string;
  tableNumber: string | null;
  platform: string | null;
  createdAt: string;
  restaurantId: string;
}

const PLATFORM_TO_CHIP: Record<string, PlatformId> = {
  google: 'google',
  yemeksepeti: 'yemeksepeti',
  getir: 'getir',
  trendyol_go: 'trendyol_go',
};

const PLATFORM_LABELS: Record<string, string> = {
  google: 'Google Maps',
  yemeksepeti: 'Yemeksepeti',
  getir: 'Getir Yemek',
  trendyol_go: 'Trendyol GO',
};

function AdminQrContent() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get('restaurant') || searchParams.get('restaurantId') || '';

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [items, setItems] = useState<QrHistoryItem[]>([]);
  const [svgs, setSvgs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showCreate, setShowCreate] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

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
      .catch(() => setRestaurants([]));
    return () => {
      cancelled = true;
    };
  }, [preselected]);

  // 2) Fetch each restaurant's QR history
  useEffect(() => {
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
        flat.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setItems(flat);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurants]);

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
      createdAt: result.createdAt,
      restaurantId: result.restaurantId,
    };
    setItems((prev) => [newItem, ...prev]);
    setSvgs((prev) => ({ ...prev, [newItem.id]: result.svg }));
    setTimeout(() => {
      fetch(`/api/restaurants/${result.restaurantId}/qr/history`)
        .then((res) => (res.ok ? res.json() : []))
        .then((rows: Array<Omit<QrHistoryItem, 'restaurantId'>>) => {
          const enriched = rows.map((row) => ({ ...row, restaurantId: result.restaurantId }));
          setItems((prev) => {
            const otherRestaurants = prev.filter((p) => p.restaurantId !== result.restaurantId);
            const merged = [...otherRestaurants, ...enriched];
            merged.sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            );
            return merged;
          });
        })
        .catch(() => {});
    }, 400);
  };

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
          {cardItems.map((c) => (
            <QRCard key={c.id} item={c} svg={svgs[c.id]} locale="tr" />
          ))}
        </div>
      )}

      {!loading && cardItems.length > 0 && view === 'list' && (
        <div className="bz-card overflow-hidden">
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
                            className="bz-btn-icon"
                          >
                            <MoreHorizontal size={14} />
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
            .map((r) => ({ id: r.id, name: r.name, slug: r.slug }))}
          defaultRestaurantId={preselected || undefined}
          locale="tr"
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
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
