'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, Grid3x3, List as ListIcon, Loader2, Plus, QrCode, Trash2 } from 'lucide-react';
import {
  AlertBanner,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  PlatformChip,
  PulseSelect,
} from '@/components/ui';
import { CreateQRWizard, type QRGenerationResult } from '@/components/panel/qr/CreateQRWizard';
import { QRCard, type QRCardItem } from '@/components/panel/qr/QRCard';
import {
  QR_PLATFORM_LABELS as PLATFORM_LABELS,
  QR_PLATFORM_TO_CHIP as PLATFORM_TO_CHIP,
  downloadQrPng,
  qrDownloadErrorMessage,
  qrPlatformFilterOptions,
} from '@/components/panel/qr/qr-shared';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import { dedupeQrRows } from '@/lib/qr-signature';
import { resolveDisplayTimeZone } from '@/lib/timezone';

interface Restaurant {
  id: string;
  slug: string;
  name: string;
  isActive?: boolean;
  /** Workspace brand colour — wizard offers it as a "Marka" preset. */
  primaryColor?: string | null;
  // Forwarded to <CreateQRWizard> so the platform grid can be filtered to
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
  // Stage 96 — owner-chosen colour pair (NULL when classic default).
  // Used to re-render previews + downloads with the original palette.
  darkColor?: string | null;
  lightColor?: string | null;
  /** Wave A — print/share template id selected at QR creation time. */
  templateId?: string | null;
  createdAt: string;
  restaurantId: string;
}

/** /api/restaurants caps a page at 100 rows. */
const RESTAURANT_PAGE_SIZE = 100;
/** Safety stop: 50 pages = 5,000 businesses. */
const RESTAURANT_MAX_PAGES = 50;

async function loadAllRestaurants(): Promise<Restaurant[]> {
  const all: Restaurant[] = [];
  for (let page = 1; page <= RESTAURANT_MAX_PAGES; page += 1) {
    const res = await fetch(
      `/api/restaurants?status=all&limit=${RESTAURANT_PAGE_SIZE}&page=${page}`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list: Restaurant[] = Array.isArray(data) ? data : data?.data || [];
    all.push(...list);
    const totalPages = Number(data?.meta?.totalPages ?? 1);
    if (!Number.isFinite(totalPages) || page >= totalPages || list.length === 0) break;
  }
  return all;
}

async function loadHistory(restaurantId: string): Promise<QrHistoryItem[]> {
  const res = await fetch(`/api/restaurants/${restaurantId}/qr/history`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = (await res.json()) as Array<Omit<QrHistoryItem, 'restaurantId'>>;
  return Array.isArray(rows) ? rows.map((row) => ({ ...row, restaurantId })) : [];
}

function AdminQrContent() {
  const { locale } = useAdminTranslation();
  const isTr = locale !== 'en';
  const searchParams = useSearchParams();
  const preselected = searchParams.get('restaurant') || searchParams.get('restaurantId') || '';

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [items, setItems] = useState<QrHistoryItem[]>([]);
  // Businesses whose QR history could not be loaded — shown, never read as
  // "this business has no QR".
  const [failedHistory, setFailedHistory] = useState<string[]>([]);
  const [historyReloadKey, setHistoryReloadKey] = useState(0);
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

  // 1) Every business the admin can see (paged; the API returns 20 by default).
  useEffect(() => {
    let cancelled = false;
    loadAllRestaurants()
      .then((list) => {
        if (cancelled) return;
        setRestaurants(list);
        if (preselected && list.some((r) => r.id === preselected)) {
          setBranchFilter(preselected);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setRestaurants([]);
        setPageError(isTr ? 'İşletmeler yüklenemedi. Sayfayı yenileyin.' : 'Businesses could not be loaded. Refresh the page.');
      })
      .finally(() => {
        if (!cancelled) setRestaurantsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [preselected, isTr]);

  // 2) QR history per business, at most 6 requests in flight.
  useEffect(() => {
    if (!restaurantsLoaded) return;
    if (restaurants.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const queue = [...restaurants];
    const collected: QrHistoryItem[] = [];
    const failed: string[] = [];
    const workers = Array.from({ length: Math.min(6, queue.length) }, async () => {
      while (!cancelled && queue.length > 0) {
        const r = queue.shift();
        if (!r) break;
        try {
          collected.push(...(await loadHistory(r.id)));
        } catch {
          failed.push(r.id);
        }
      }
    });
    Promise.all(workers).finally(() => {
      if (cancelled) return;
      setItems(dedupeQrRows(collected));
      setFailedHistory(failed);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [restaurantsLoaded, restaurants, historyReloadKey]);

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
      const restName = rest?.name || (isTr ? 'İşletme' : 'Business');
      const label = it.tableNumber
        ? `${restName} · ${isTr ? 'Masa' : 'Table'} ${it.tableNumber}`
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
        // Forward owner-chosen palette so QRCard's download buttons
        // (PNG + Premium PDF) request the API with `dark`/`light` params.
        darkColor: it.darkColor,
        lightColor: it.lightColor,
        // Wave A — surface the selected print/share template on the card
        // (badge + threaded through downloads).
        templateId: it.templateId ?? null,
      };
    });
  }, [filteredItems, restaurantById, isTr]);

  const platformOptions = useMemo(
    () =>
      qrPlatformFilterOptions(
        items.map((it) => it.platform),
        isTr
          ? { all: 'Tüm platformlar', general: 'Varsayılan platform' }
          : { all: 'All platforms', general: 'Default platform' },
      ),
    [items, isTr],
  );

  const handleCreated = (result: QRGenerationResult) => {
    const newItem: QrHistoryItem = {
      id: `local_${Date.now()}`,
      qrUrl: result.qrUrl,
      tableNumber: result.tableNumber,
      platform: result.platform,
      serviceType: null,
      type: 'feedback',
      darkColor: result.darkColor,
      lightColor: result.lightColor,
      templateId: result.templateId,
      createdAt: result.createdAt,
      restaurantId: result.restaurantId,
    };
    setItems((prev) => dedupeQrRows([newItem, ...prev]));
    setTimeout(() => {
      // Swap the local row for the stored one. A failed request keeps the
      // current rows (it used to replace them with an empty list).
      loadHistory(result.restaurantId)
        .then((enriched) => {
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
        setPageError(isTr ? 'QR kaydı silinemedi. Tekrar deneyin.' : 'Could not delete the QR record. Please try again.');
      }
    } catch {
      setItems((prev) => dedupeQrRows([...prev, target]));
      setPageError(isTr ? 'Bağlantı hatası — QR silinemedi.' : 'Network error — the QR was not deleted.');
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }, [pendingDelete, isTr]);

  // Same plain, print-size PNG and file name as the card's "PNG indir".
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const downloadOne = async (item: QrHistoryItem, name: string) => {
    if (downloadingId) return;
    setDownloadingId(item.id);
    setPageError(null);
    try {
      await downloadQrPng(item, name);
    } catch (err) {
      setPageError(qrDownloadErrorMessage(err, isTr));
    } finally {
      setDownloadingId(null);
    }
  };

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(isTr ? 'tr-TR' : 'en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: resolveDisplayTimeZone(),
      }),
    [isTr],
  );

  const t = isTr
    ? {
        eyebrow: 'QR YÖNETİMİ',
        title: 'QR kodları',
        description: 'Tüm işletmelere ait QR kodlarını tek noktadan oluştur ve indir.',
        toggleView: 'Görünümü değiştir',
        list: 'Liste',
        grid: 'Izgara',
        create: 'Yeni QR oluştur',
        createShort: 'Yeni',
        allBusinesses: 'Tüm işletmeler',
        businessFilter: 'İşletme filtresi',
        platformFilter: 'Platform filtresi',
        noBusinessTitle: 'Henüz işletme yok',
        noBusinessBody: 'Sistemde işletme bulunmuyor. Önce işletme ekleyin.',
        noQrTitle: 'Henüz QR oluşturulmadı',
        noQrBody: 'İşletmeler için QR kodu oluşturmaya başlamak üzere yukarıdaki düğmeyi kullanın.',
        noMatchTitle: 'Filtreyle eşleşen QR yok',
        noMatchBody: 'Filtreleri sıfırlayın veya yeni bir QR oluşturun.',
        clear: 'Filtreleri temizle',
        defaultPlatform: 'Varsayılan platform',
        name: 'QR adı',
        business: 'İşletme',
        platform: 'Platform',
        target: 'Masa / etiket',
        date: 'Tarih',
        download: 'PNG indir',
        remove: 'Sil',
        removeAria: "QR'ı sil",
        historyFailed: (n: number) => `${n} işletmenin QR listesi yüklenemedi.`,
        retry: 'Tekrar dene',
        deleteTitle: 'Bu QR kaydını sil',
        deleteBody:
          "QR yalnızca panel listesinden kaldırılır. Daha önce basılan QR'lar çalışmaya devam eder; aynı masa veya platform için yeniden oluşturabilirsiniz.",
        cancel: 'Vazgeç',
      }
    : {
        eyebrow: 'QR MANAGEMENT',
        title: 'QR codes',
        description: 'Create and download the QR codes of every business in one place.',
        toggleView: 'Switch view',
        list: 'List',
        grid: 'Grid',
        create: 'Create QR',
        createShort: 'New',
        allBusinesses: 'All businesses',
        businessFilter: 'Business filter',
        platformFilter: 'Platform filter',
        noBusinessTitle: 'No businesses yet',
        noBusinessBody: 'There are no businesses yet. Add a business first.',
        noQrTitle: 'No QR codes yet',
        noQrBody: 'Use the button above to create a QR code for a business.',
        noMatchTitle: 'No QR matches the filters',
        noMatchBody: 'Reset the filters or create a new QR.',
        clear: 'Clear filters',
        defaultPlatform: 'Default platform',
        name: 'QR name',
        business: 'Business',
        platform: 'Platform',
        target: 'Table / label',
        date: 'Date',
        download: 'Download PNG',
        remove: 'Delete',
        removeAria: 'Delete QR',
        historyFailed: (n: number) => `QR list of ${n} business(es) could not be loaded.`,
        retry: 'Retry',
        deleteTitle: 'Delete this QR record',
        deleteBody:
          'The QR is only removed from the panel list. Printed QR codes keep working; you can create it again for the same table or platform.',
        cancel: 'Cancel',
      };

  const platformCell = (platform: string | null | undefined) =>
    platform && PLATFORM_TO_CHIP[platform] ? (
      <span className="inline-flex items-center gap-1.5">
        <PlatformChip id={PLATFORM_TO_CHIP[platform]} size={14} />
        <span className="text-[12px]">{PLATFORM_LABELS[platform]}</span>
      </span>
    ) : (
      <span className="text-[#737373]">{platform || t.defaultPlatform}</span>
    );

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
        className="bz-btn-ghost inline-flex items-center gap-1.5"
        aria-label={t.toggleView}
      >
        {view === 'grid' ? <ListIcon size={14} /> : <Grid3x3 size={14} />}
        <span className="hidden sm:inline">{view === 'grid' ? t.list : t.grid}</span>
      </button>
      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="bz-btn-primary inline-flex items-center gap-1.5"
        disabled={restaurants.length === 0}
      >
        <Plus size={14} />
        <span className="hidden sm:inline">{t.create}</span>
        <span className="sm:hidden">{t.createShort}</span>
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} actions={headerActions} />

      {pageError && (
        <AlertBanner kind="danger" onDismiss={() => setPageError(null)}>
          {pageError}
        </AlertBanner>
      )}

      {!loading && failedHistory.length > 0 && (
        <AlertBanner kind="warn">
          <span className="flex flex-wrap items-center gap-2">
            {t.historyFailed(failedHistory.length)}
            <button
              type="button"
              onClick={() => setHistoryReloadKey((k) => k + 1)}
              className="bz-btn-ghost bz-btn-sm"
            >
              {t.retry}
            </button>
          </span>
        </AlertBanner>
      )}

      {restaurants.length > 0 && items.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <PulseSelect
            value={branchFilter}
            onChange={setBranchFilter}
            options={[
              { value: 'all', label: t.allBusinesses },
              ...restaurants.map((r) => ({ value: r.id, label: r.name })),
            ]}
            ariaLabel={t.businessFilter}
            className="w-full sm:w-auto sm:min-w-[180px]"
          />
          {platformOptions.length > 2 && (
            <PulseSelect
              value={platformFilter}
              onChange={setPlatformFilter}
              options={platformOptions}
              ariaLabel={t.platformFilter}
              className="w-full sm:w-auto sm:min-w-[180px]"
            />
          )}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#0A0A0A]" />
        </div>
      )}

      {!loading && restaurants.length === 0 && (
        <EmptyState icon={<QrCode size={28} />} title={t.noBusinessTitle} body={t.noBusinessBody} />
      )}

      {!loading && restaurants.length > 0 && items.length === 0 && failedHistory.length === 0 && (
        <EmptyState
          icon={<QrCode size={28} />}
          title={t.noQrTitle}
          body={t.noQrBody}
          action={
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="bz-btn-primary inline-flex items-center gap-1.5"
            >
              <Plus size={14} />
              {t.create}
            </button>
          }
        />
      )}

      {!loading && items.length > 0 && cardItems.length === 0 && (
        <EmptyState
          icon={<QrCode size={28} />}
          title={t.noMatchTitle}
          body={t.noMatchBody}
          action={
            <button
              type="button"
              onClick={() => {
                setBranchFilter('all');
                setPlatformFilter('all');
              }}
              className="bz-btn-ghost"
            >
              {t.clear}
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
                locale={isTr ? 'tr' : 'en'}
                onDelete={raw ? () => requestDelete(raw) : undefined}
              />
            );
          })}
        </div>
      )}

      {/* Phone / tablet: compact cards. */}
      {!loading && cardItems.length > 0 && view === 'list' && (
        <div className="lg:hidden flex flex-col gap-2.5">
          {cardItems.map((c) => {
            const rawItem = filteredItems.find((it) => it.id === c.id)!;
            return (
              <div key={c.id} className="bz-card p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-[#0A0A0A] truncate">{c.name}</div>
                    <div className="mt-1 text-[11px] text-[#525252] truncate">{c.branch || '—'}</div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px]">
                      {platformCell(c.platform)}
                      {c.tableNumber && (
                        <>
                          <span className="text-[#A3A3A3]">·</span>
                          <span className="bz-mono font-semibold">{c.tableNumber}</span>
                        </>
                      )}
                      <span className="text-[#A3A3A3]">·</span>
                      <span className="text-[#737373]">{dateFormatter.format(new Date(c.createdAt))}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => downloadOne(rawItem, c.name)}
                      disabled={downloadingId === rawItem.id}
                      aria-label={t.download}
                      className="bz-btn-icon"
                    >
                      {downloadingId === rawItem.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Download size={14} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDelete(rawItem)}
                      aria-label={t.removeAria}
                      className="bz-btn-icon text-[#DC2626]"
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
                  <th>{t.name}</th>
                  <th>{t.business}</th>
                  <th>{t.platform}</th>
                  <th>{t.target}</th>
                  <th>{t.date}</th>
                  <th aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {cardItems.map((c) => {
                  const rawItem = filteredItems.find((it) => it.id === c.id)!;
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td className="text-[#525252]">{c.branch || '—'}</td>
                      <td>{platformCell(c.platform)}</td>
                      <td className="bz-mono" style={{ fontWeight: 600 }}>
                        {c.tableNumber || '—'}
                      </td>
                      <td className="text-[#737373]">{dateFormatter.format(new Date(c.createdAt))}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => downloadOne(rawItem, c.name)}
                            disabled={downloadingId === rawItem.id}
                            aria-label={t.download}
                            title={t.download}
                            className="bz-btn-icon"
                          >
                            {downloadingId === rawItem.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Download size={14} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDelete(rawItem)}
                            aria-label={t.removeAria}
                            title={t.remove}
                            className="bz-btn-icon text-[#DC2626]"
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
        <CreateQRWizard
          restaurants={restaurants
            .filter((r) => r.isActive !== false)
            .map((r) => ({
              id: r.id,
              name: r.name,
              slug: r.slug,
              primaryColor: r.primaryColor ?? null,
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
          locale={isTr ? 'tr' : 'en'}
          panelBase="/admin"
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        variant="danger"
        title={t.deleteTitle}
        body={t.deleteBody}
        confirmLabel={t.remove}
        cancelLabel={t.cancel}
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
