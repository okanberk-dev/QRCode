'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Copy,
  Download,
  Eye,
  Grid3x3,
  List as ListIcon,
  Loader2,
  MoreHorizontal,
  Plus,
  QrCode,
  Trash2,
} from 'lucide-react';
import {
  AlertBanner,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  PlatformChip,
  PulseMenu,
  PulseMenuDivider,
  PulseMenuItem,
  PulseSelect,
  Tabs,
  type PlatformId,
} from '@/components/ui';
import { CreateQRWizard, type QRGenerationResult } from '@/components/panel/qr/CreateQRWizard';
import { QRCard, type QRCardItem } from '@/components/panel/qr/QRCard';
import { useActiveBusinessSelection } from '@/components/audits/useActiveBusinessSelection';
import { copyToClipboard } from '@/lib/clipboard';
import { dedupeQrRows } from '@/lib/qr-signature';
import { resolveDisplayTimeZone } from '@/lib/timezone';
import { QrGridSkeleton } from './_components/QrGridSkeleton';

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

export interface QrHistoryItem {
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

/** One business's QR list — loaded once, kept while the owner switches. */
interface HistoryState {
  status: 'loading' | 'ok' | 'error';
  rows: QrHistoryItem[];
}

type Scope = 'business' | 'all';

/** A history request that hangs is aborted and shown as an error with retry
 *  instead of leaving the page on skeleton cards. */
const HISTORY_TIMEOUT_MS = 15_000;

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

/** `/qr/history` returns a bare array; tolerate `{ data: [] }` too. */
function parseHistoryRows(data: unknown, restaurantId: string): QrHistoryItem[] | null {
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)
      ? ((data as { data: unknown[] }).data)
      : null;
  if (!list) return null;
  return list
    .filter(
      (row): row is Omit<QrHistoryItem, 'restaurantId'> =>
        !!row && typeof row === 'object' && typeof (row as { id?: unknown }).id === 'string',
    )
    .map((row) => ({ ...row, restaurantId }));
}

/** Same file-name rule as QRCard's "PNG indir", so the list and the card
 *  download the same QR under the same name. */
function safeFileName(name: string): string {
  return (
    name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'qr'
  );
}

interface QrClientProps {
  initialRestaurants?: Restaurant[];
  /** Server-rendered QR list per business (every listed business has an
   *  entry, `[]` when it has none). Undefined → loaded per business here. */
  initialHistories?: Record<string, QrHistoryItem[]>;
}

export default function QrClient({ initialRestaurants, initialHistories }: QrClientProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const locale = params.locale === 'en' ? 'en' : 'tr';
  const isTr = locale === 'tr';
  const preselected = searchParams.get('restaurantId') || searchParams.get('restaurant') || '';
  const autoOpenWizard = searchParams.get('new') === '1';

  // §40.10 server-hydration — undefined → client fetch (admin session).
  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants ?? []);
  const [restaurantsLoaded, setRestaurantsLoaded] = useState(initialRestaurants !== undefined);
  const skipFirstRestaurantsFetchRef = useRef(initialRestaurants !== undefined);

  const [histories, setHistories] = useState<Record<string, HistoryState>>(() => {
    const out: Record<string, HistoryState> = {};
    for (const [id, rows] of Object.entries(initialHistories ?? {})) {
      out[id] = { status: 'ok', rows };
    }
    return out;
  });
  const inflightRef = useRef(new Map<string, AbortController>());

  const [scope, setScope] = useState<Scope>('business');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showCreate, setShowCreate] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  // Short success note — "QR kodu oluşturuldu" / "Bağlantı kopyalandı".
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<QrHistoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // The page follows the shell's business switcher (?restaurantId + the
  // `buaze:active-restaurant-change` event) — no second business picker here.
  const { activeId, ready: selectionReady } = useActiveBusinessSelection(
    restaurants,
    preselected || null,
  );

  // "Tüm işletmeler" is a local view. Picking a business in the shell
  // switcher (even the one already active) brings the page back to that
  // business, otherwise the switch would look like it did nothing.
  useEffect(() => {
    const back = () => setScope('business');
    window.addEventListener('buaze:active-restaurant-change', back);
    return () => window.removeEventListener('buaze:active-restaurant-change', back);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // 1) Load restaurants once — §40.10 skip if SSR hydrated.
  useEffect(() => {
    if (skipFirstRestaurantsFetchRef.current) {
      skipFirstRestaurantsFetchRef.current = false;
      return;
    }
    let cancelled = false;
    fetch('/api/restaurants')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.data || [];
        setRestaurants(list);
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
  }, []);

  // 2) QR history per business. Each request has its own state, so one slow
  // or failing business never keeps the whole page on skeleton cards, and a
  // business that was already loaded is not fetched again when the owner
  // switches back to it.
  const loadHistory = useCallback((restaurantId: string) => {
    inflightRef.current.get(restaurantId)?.abort();
    const controller = new AbortController();
    inflightRef.current.set(restaurantId, controller);
    const isCurrent = () => inflightRef.current.get(restaurantId) === controller;
    const timer = window.setTimeout(() => controller.abort(), HISTORY_TIMEOUT_MS);
    setHistories((prev) => ({
      ...prev,
      [restaurantId]: { status: 'loading', rows: prev[restaurantId]?.rows ?? [] },
    }));
    fetch(`/api/restaurants/${restaurantId}/qr/history`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows = parseHistoryRows(await res.json(), restaurantId);
        if (!rows) throw new Error('Unexpected response');
        if (isCurrent()) {
          setHistories((prev) => ({
            ...prev,
            [restaurantId]: { status: 'ok', rows: dedupeQrRows(rows) },
          }));
        }
      })
      .catch(() => {
        if (isCurrent()) {
          setHistories((prev) => ({
            ...prev,
            [restaurantId]: { status: 'error', rows: prev[restaurantId]?.rows ?? [] },
          }));
        }
      })
      .finally(() => {
        window.clearTimeout(timer);
        if (isCurrent()) inflightRef.current.delete(restaurantId);
      });
  }, []);

  const multi = restaurants.length > 1;
  const effectiveScope: Scope = multi ? scope : 'business';

  const scopeIds = useMemo(
    () =>
      effectiveScope === 'all' ? restaurants.map((r) => r.id) : activeId ? [activeId] : [],
    [effectiveScope, restaurants, activeId],
  );
  const scopeIdsKey = scopeIds.join(',');

  useEffect(() => {
    if (!restaurantsLoaded || !selectionReady) return;
    for (const id of scopeIdsKey ? scopeIdsKey.split(',') : []) {
      if (!histories[id] && !inflightRef.current.has(id)) loadHistory(id);
    }
  }, [restaurantsLoaded, selectionReady, scopeIdsKey, histories, loadHistory]);

  const pending =
    !restaurantsLoaded ||
    !selectionReady ||
    scopeIds.some((id) => !histories[id] || histories[id].status === 'loading');
  const failedIds = scopeIds.filter((id) => histories[id]?.status === 'error');

  const items = useMemo(
    () => dedupeQrRows(scopeIds.flatMap((id) => histories[id]?.rows ?? [])),
    [scopeIds, histories],
  );

  const restaurantById = useMemo(() => {
    const m = new Map<string, Restaurant>();
    for (const r of restaurants) m.set(r.id, r);
    return m;
  }, [restaurants]);
  const activeRestaurant = activeId ? restaurantById.get(activeId) ?? null : null;

  // Platform options come from the QRs that actually exist. The filter is
  // hidden when it could only offer one choice.
  const platformOptions = useMemo(() => {
    const present = new Set<string>();
    let hasGeneral = false;
    for (const it of items) {
      if (it.platform) present.add(it.platform);
      else hasGeneral = true;
    }
    const known = Object.keys(PLATFORM_LABELS).filter((key) => present.has(key));
    const unknown = [...present].filter((key) => !(key in PLATFORM_LABELS)).sort();
    return [
      { value: 'all', label: isTr ? 'Tüm platformlar' : 'All platforms' },
      ...(hasGeneral
        ? [{ value: 'general', label: isTr ? 'Varsayılan platform' : 'Default platform' }]
        : []),
      ...[...known, ...unknown].map((key) => ({ value: key, label: PLATFORM_LABELS[key] ?? key })),
    ];
  }, [items, isTr]);
  const showPlatformFilter = platformOptions.length > 2;
  // A deleted QR or a business switch can remove the selected platform —
  // fall back to "all" instead of filtering by a choice that is not offered.
  const activePlatform =
    showPlatformFilter && platformOptions.some((o) => o.value === platformFilter)
      ? platformFilter
      : 'all';

  const filteredItems = useMemo(() => {
    if (activePlatform === 'all') return items;
    if (activePlatform === 'general') return items.filter((it) => !it.platform);
    return items.filter((it) => it.platform === activePlatform);
  }, [items, activePlatform]);

  const targetLabel = useCallback(
    (it: QrHistoryItem) =>
      it.tableNumber
        ? `${isTr ? 'Masa' : 'Table'} ${it.tableNumber}`
        : it.platform
          ? PLATFORM_LABELS[it.platform] || it.platform
          : isTr
            ? 'Genel QR'
            : 'General QR',
    [isTr],
  );

  // The card name doubles as the download file name, so it keeps the
  // business name ("Kadıköy Şube · Masa 3"). The list view downloads under
  // the same name.
  const displayName = useCallback(
    (it: QrHistoryItem) =>
      `${restaurantById.get(it.restaurantId)?.name || (isTr ? 'İşletme' : 'Business')} · ${targetLabel(it)}`,
    [restaurantById, targetLabel, isTr],
  );

  const cardItems: QRCardItem[] = useMemo(() => {
    return filteredItems.map((it) => {
      return {
        id: it.id,
        name: displayName(it),
        platform: it.platform,
        createdAt: it.createdAt,
        qrUrl: it.qrUrl,
        restaurantId: it.restaurantId,
        tableNumber: it.tableNumber,
        // Forward owner-chosen palette so QRCard's download buttons
        // (PNG + PDF) request the API with `dark`/`light` params.
        darkColor: it.darkColor,
        lightColor: it.lightColor,
        templateId: it.templateId ?? null,
      };
    });
  }, [filteredItems, displayName]);

  // Wizard target: the active business (the switcher picks it). The
  // all-businesses view keeps the wizard's business picker, as does a paused
  // active business (paused businesses cannot get new QR codes).
  const activeRestaurants = useMemo(
    () => restaurants.filter((r) => r.isActive !== false),
    [restaurants],
  );
  const wizardRestaurants =
    effectiveScope === 'business' && activeRestaurant && activeRestaurant.isActive !== false
      ? [activeRestaurant]
      : activeRestaurants;
  const wizardDefaultId =
    activeId && wizardRestaurants.some((r) => r.id === activeId) ? activeId : undefined;
  const canCreate = restaurantsLoaded && activeRestaurants.length > 0;
  // Every business is paused — new QR codes cannot be created, so say why
  // instead of leaving a disabled button with no reason.
  const allPaused = restaurantsLoaded && restaurants.length > 0 && activeRestaurants.length === 0;
  const pausedText = isTr
    ? multi
      ? 'İşletmelerin duraklatılmış. Yeni QR oluşturmak için bir işletmeyi yeniden etkinleştir.'
      : 'İşletmen duraklatılmış. Yeni QR oluşturmak için işletmeyi yeniden etkinleştir.'
    : multi
      ? 'Your businesses are paused. Reactivate one to create new QR codes.'
      : 'Your business is paused. Reactivate it to create new QR codes.';

  // Auto-open the wizard when sidebar/CTA passes `?new=1`. Strip the flag
  // after consuming so a refresh doesn't re-open the modal.
  useEffect(() => {
    if (!autoOpenWizard) return;
    if (!restaurantsLoaded || !selectionReady) return;
    if (activeRestaurants.length === 0) return;
    setShowCreate(true);
    const next = new URLSearchParams(searchParams.toString());
    next.delete('new');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [
    autoOpenWizard,
    restaurantsLoaded,
    selectionReady,
    activeRestaurants.length,
    pathname,
    router,
    searchParams,
  ]);

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
    setHistories((prev) => ({
      ...prev,
      [result.restaurantId]: {
        status: prev[result.restaurantId]?.status ?? 'ok',
        rows: dedupeQrRows([newItem, ...(prev[result.restaurantId]?.rows ?? [])]),
      },
    }));
    const visible = effectiveScope === 'all' || result.restaurantId === activeId;
    setNotice(
      visible
        ? isTr
          ? 'QR kodu oluşturuldu.'
          : 'QR code created.'
        : isTr
          ? `QR kodu ${result.restaurantName} için oluşturuldu.`
          : `QR code created for ${result.restaurantName}.`,
    );
    // Refresh that business from the API to get the saved id.
    window.setTimeout(() => loadHistory(result.restaurantId), 400);
  };

  const retryFailed = () => {
    for (const id of failedIds) loadHistory(id);
  };

  // Delete confirms via ConfirmDialog, then runs optimistically; on failure
  // the row comes back and a banner explains.
  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setDeleting(true);
    setPageError(null);
    setHistories((prev) => {
      const current = prev[target.restaurantId];
      if (!current) return prev;
      return {
        ...prev,
        [target.restaurantId]: { ...current, rows: current.rows.filter((it) => it.id !== target.id) },
      };
    });
    try {
      const res = await fetch(`/api/restaurants/${target.restaurantId}/qr/history/${target.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      setHistories((prev) => {
        const current = prev[target.restaurantId];
        return {
          ...prev,
          [target.restaurantId]: {
            status: current?.status ?? 'ok',
            rows: dedupeQrRows([...(current?.rows ?? []), target]),
          },
        };
      });
      setPageError(isTr ? 'QR kaydı silinemedi. Tekrar dene.' : 'Could not delete the QR record. Please try again.');
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }, [pendingDelete, isTr]);

  // List view PNG download — same plain, print-size file as the card's
  // "PNG indir" (the list used to request the framed default style).
  const downloadPng = async (item: QrHistoryItem) => {
    if (downloadingId) return;
    setDownloadingId(item.id);
    setPageError(null);
    try {
      const query = new URLSearchParams({ format: 'png', width: '1080', style: 'plain' });
      if (item.tableNumber) query.set('table', item.tableNumber);
      if (item.platform) query.set('platform', item.platform);
      // Stage 96 — keep the saved colour pair.
      if (item.darkColor && item.lightColor) {
        query.set('dark', item.darkColor);
        query.set('light', item.lightColor);
      }
      const res = await fetch(`/api/restaurants/${item.restaurantId}/qr?${query.toString()}`);
      if (!res.ok || !(res.headers.get('content-type') || '').includes('image/png')) {
        throw new Error(`HTTP ${res.status}`);
      }
      const blob = await res.blob();
      if (blob.size < 100) throw new Error('Empty file');
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = `qr-${safeFileName(displayName(item))}.png`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      // Deferred cleanup — revoking at once cancels the download on iOS Safari.
      window.setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(objUrl);
      }, 1000);
    } catch {
      setPageError(isTr ? 'QR indirilemedi. Tekrar dene.' : 'Could not download the QR. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const copyLink = async (item: QrHistoryItem) => {
    const ok = await copyToClipboard(item.qrUrl);
    if (ok) setNotice(isTr ? 'Bağlantı kopyalandı.' : 'Link copied.');
    else setPageError(isTr ? 'Bağlantı kopyalanamadı.' : 'Could not copy the link.');
  };

  const rowActions = (item: QrHistoryItem, label: string) => {
    const busy = downloadingId === item.id;
    return (
      <div className="flex shrink-0 items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => downloadPng(item)}
          disabled={busy}
          aria-label={isTr ? `${label} — PNG indir` : `${label} — download PNG`}
          className="bz-btn-ghost inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 px-3 sm:min-h-[32px] sm:min-w-0 disabled:opacity-60"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          <span className="hidden sm:inline">PNG</span>
        </button>
        <PulseMenu
          trigger={
            <button
              type="button"
              className="bz-btn-icon inline-flex h-11 w-11 items-center justify-center sm:h-8 sm:w-8"
              aria-label={isTr ? `${label} — diğer işlemler` : `${label} — more actions`}
            >
              <MoreHorizontal size={16} strokeWidth={2} />
            </button>
          }
          className="min-w-[210px]"
        >
          <PulseMenuItem icon={<Copy size={14} />} onSelect={() => void copyLink(item)}>
            {isTr ? 'Bağlantıyı kopyala' : 'Copy link'}
          </PulseMenuItem>
          <PulseMenuItem
            icon={<Eye size={14} />}
            onSelect={() => window.open(item.qrUrl, '_blank', 'noopener,noreferrer')}
          >
            {isTr ? 'Müşterinin gördüğü sayfayı aç' : 'Open the customer page'}
          </PulseMenuItem>
          <PulseMenuDivider />
          <PulseMenuItem icon={<Trash2 size={14} />} danger onSelect={() => setPendingDelete(item)}>
            {isTr ? "QR'ı sil" : 'Delete QR'}
          </PulseMenuItem>
        </PulseMenu>
      </div>
    );
  };

  // Fixed display time zone (CLAUDE.md §46) — the same day on the server and
  // in every browser.
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: resolveDisplayTimeZone(),
    });

  const showSkeleton = pending && items.length === 0;
  const loadFailed = !pending && items.length === 0 && failedIds.length > 0;
  const showBranch = effectiveScope === 'all';

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
      <PageHeader
        title={isTr ? 'QR kodları' : 'QR codes'}
        description={
          isTr
            ? 'Müşteri QR kodunu okutup puan verir; yüksek puanda seçtiğin yorum platformu önerilir. Her müşteri yorumunu istediği yerde yazabilir.'
            : 'Customers scan the QR code and give a rating; with a high rating your chosen review platform is suggested. Every customer can post their review wherever they like.'
        }
        actions={
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            disabled={!canCreate}
            title={allPaused ? pausedText : undefined}
            className="bz-btn-primary inline-flex min-h-[44px] items-center justify-center gap-1.5 sm:min-h-[36px] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={14} />
            {isTr ? 'Yeni QR oluştur' : 'Create QR code'}
          </button>
        }
      />

      {pageError && (
        <AlertBanner kind="danger" onDismiss={() => setPageError(null)}>
          {pageError}
        </AlertBanner>
      )}

      {notice && (
        <AlertBanner kind="success" onDismiss={() => setNotice(null)}>
          {notice}
        </AlertBanner>
      )}

      {allPaused && items.length > 0 && (
        <AlertBanner kind="info">
          {pausedText}{' '}
          <Link
            href={`/${locale}/dashboard/restaurants`}
            className="font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
          >
            {isTr ? 'İşletmelere git' : 'Go to businesses'}
          </Link>
        </AlertBanner>
      )}

      {failedIds.length > 0 && items.length > 0 && (
        <AlertBanner kind="warn">
          {isTr
            ? 'Bazı işletmelerin QR kodları yüklenemedi. '
            : "Some businesses' QR codes could not be loaded. "}
          <button
            type="button"
            onClick={retryFailed}
            className="font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
          >
            {isTr ? 'Tekrar dene' : 'Try again'}
          </button>
        </AlertBanner>
      )}

      {/* One toolbar: business scope · platform · count + view. Mobile:
          scope + view on the first row, the platform filter below. */}
      {(multi || items.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {multi && (
            <Tabs
              items={[
                { id: 'business', label: isTr ? 'Bu işletme' : 'This business' },
                { id: 'all', label: isTr ? 'Tüm işletmeler' : 'All businesses', count: restaurants.length },
              ]}
              active={effectiveScope}
              onChange={(id) => setScope(id as Scope)}
              ariaLabel={isTr ? 'Gösterilen işletmeler' : 'Businesses shown'}
              className="order-1 shrink-0 [&_.bz-tab]:min-h-[44px] sm:[&_.bz-tab]:min-h-0"
            />
          )}
          {showPlatformFilter && (
            <PulseSelect
              value={activePlatform}
              onChange={setPlatformFilter}
              ariaLabel={isTr ? 'Platform filtresi' : 'Platform filter'}
              className={
                multi
                  ? 'order-3 w-full sm:order-2 sm:w-[200px]'
                  : 'order-2 min-w-0 flex-1 sm:flex-none sm:w-[200px]'
              }
              options={platformOptions}
            />
          )}
          {items.length > 0 && (
            <span
              className={`order-2 text-[13px] text-[#525252] sm:order-3 sm:ml-auto ${
                multi || showPlatformFilter ? 'hidden sm:inline' : ''
              }`}
            >
              {activePlatform === 'all'
                ? isTr
                  ? `${items.length} QR kodu`
                  : `${items.length} QR ${items.length === 1 ? 'code' : 'codes'}`
                : isTr
                  ? `${filteredItems.length} / ${items.length} QR kodu`
                  : `${filteredItems.length} of ${items.length} QR codes`}
            </span>
          )}
          {items.length > 0 && (
            <div
              role="group"
              aria-label={isTr ? 'Görünüm' : 'View'}
              className="order-2 ml-auto inline-flex gap-0.5 rounded-[10px] bg-[#F2F2F2] p-[3px] sm:order-4 sm:ml-0"
            >
              {(
                [
                  { id: 'grid', icon: <Grid3x3 size={14} />, label: isTr ? 'Kart' : 'Cards' },
                  { id: 'list', icon: <ListIcon size={14} />, label: isTr ? 'Liste' : 'List' },
                ] as const
              ).map((opt) => {
                const selected = view === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={selected}
                    aria-label={opt.label}
                    onClick={() => setView(opt.id)}
                    className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-[7px] px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] sm:min-h-[30px] sm:min-w-0 ${
                      selected
                        ? 'bg-white text-[#0A0A0A] shadow-[0_1px_2px_rgba(10,10,10,0.08),0_0_0_1px_rgba(10,10,10,0.04)]'
                        : 'text-[#525252] hover:text-[#0A0A0A]'
                    }`}
                  >
                    {opt.icon}
                    <span className="hidden sm:inline">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showSkeleton && (
        <div aria-busy="true" aria-label={isTr ? 'QR kodları yükleniyor' : 'Loading QR codes'}>
          <QrGridSkeleton count={6} />
        </div>
      )}

      {/* No business yet */}
      {!pending && restaurants.length === 0 && (
        <EmptyState
          icon={<QrCode size={28} />}
          title={isTr ? 'Henüz işletme eklenmemiş' : 'No business yet'}
          body={
            isTr
              ? 'QR kodu oluşturabilmek için önce bir işletme ekle.'
              : 'Add a business first to create QR codes.'
          }
          action={
            <Link
              href={`/${locale}/dashboard/restaurants/new`}
              className="bz-btn-primary inline-flex min-h-[44px] items-center gap-1.5 sm:min-h-[36px]"
            >
              <Plus size={14} />
              {isTr ? 'İşletme ekle' : 'Add business'}
            </Link>
          }
        />
      )}

      {loadFailed && (
        <ErrorState
          title={isTr ? 'QR kodları yüklenemedi' : 'QR codes could not be loaded'}
          body={
            isTr
              ? 'Bağlantında bir sorun olabilir. Tekrar dene.'
              : 'There may be a connection problem. Please try again.'
          }
          onRetry={retryFailed}
          retryLabel={isTr ? 'Tekrar dene' : 'Try again'}
        />
      )}

      {/* No QR codes yet — "Yeni QR oluştur" sits in the header. */}
      {!pending && !loadFailed && restaurants.length > 0 && items.length === 0 && (
        <EmptyState
          icon={<QrCode size={28} />}
          title={
            effectiveScope === 'business' && activeRestaurant && multi
              ? isTr
                ? `${activeRestaurant.name} için henüz QR kodu yok`
                : `No QR codes for ${activeRestaurant.name} yet`
              : isTr
                ? 'Henüz QR kodu yok'
                : 'No QR codes yet'
          }
          body={
            allPaused
              ? pausedText
              : isTr
                ? 'Yeni QR oluştur ile ilk QR kodunu hazırla ve masaya koy; okutan müşteri puan verir.'
                : 'Use Create QR code to make your first one and put it on the table; customers who scan it give a rating.'
          }
          action={
            allPaused ? (
              <Link
                href={`/${locale}/dashboard/restaurants`}
                className="bz-btn-ghost inline-flex min-h-[44px] items-center sm:min-h-[36px]"
              >
                {isTr ? 'İşletmelere git' : 'Go to businesses'}
              </Link>
            ) : undefined
          }
        />
      )}

      {/* Card view */}
      {cardItems.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {cardItems.map((c) => {
            const raw = filteredItems.find((it) => it.id === c.id);
            return (
              <QRCard
                key={c.id}
                item={c}
                locale={locale}
                onDelete={raw ? () => setPendingDelete(raw) : undefined}
              />
            );
          })}
        </div>
      )}

      {/* List view — §23.6: table on desktop, compact list below lg. */}
      {filteredItems.length > 0 && view === 'list' && (
        <>
          <ul className="bz-card divide-y divide-[#EDEDED] lg:hidden">
            {filteredItems.map((it) => {
              const label = targetLabel(it);
              const branch = restaurantById.get(it.restaurantId)?.name;
              return (
                <li key={it.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[#0A0A0A]">{label}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-[#737373]">
                      {it.platform && PLATFORM_TO_CHIP[it.platform] ? (
                        <span className="inline-flex items-center gap-1">
                          <PlatformChip id={PLATFORM_TO_CHIP[it.platform]} size={12} />
                          {PLATFORM_LABELS[it.platform]}
                        </span>
                      ) : (
                        <span>{isTr ? 'Varsayılan platform' : 'Default platform'}</span>
                      )}
                      {showBranch && branch && <span>· {branch}</span>}
                      <span>· {formatDate(it.createdAt)}</span>
                    </p>
                  </div>
                  {rowActions(it, showBranch && branch ? `${branch} · ${label}` : label)}
                </li>
              );
            })}
          </ul>
          <div className="bz-card hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="bz-table w-full">
                <thead>
                  <tr>
                    {showBranch && <th>{isTr ? 'İşletme' : 'Business'}</th>}
                    <th>{isTr ? 'QR' : 'QR'}</th>
                    <th>{isTr ? 'Yönlendirme' : 'Redirect'}</th>
                    <th>{isTr ? 'Oluşturuldu' : 'Created'}</th>
                    <th>
                      <span className="sr-only">{isTr ? 'İşlemler' : 'Actions'}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((it) => {
                    const label = targetLabel(it);
                    const branch = restaurantById.get(it.restaurantId)?.name;
                    return (
                      <tr key={it.id}>
                        {showBranch && <td style={{ color: '#525252' }}>{branch || '—'}</td>}
                        <td style={{ fontWeight: 600 }}>{label}</td>
                        <td>
                          {it.platform && PLATFORM_TO_CHIP[it.platform] ? (
                            <span className="inline-flex items-center gap-1.5">
                              <PlatformChip id={PLATFORM_TO_CHIP[it.platform]} size={14} />
                              <span className="text-[12px]">{PLATFORM_LABELS[it.platform]}</span>
                            </span>
                          ) : (
                            <span style={{ color: '#737373' }}>
                              {isTr ? 'Varsayılan platform' : 'Default platform'}
                            </span>
                          )}
                        </td>
                        <td style={{ color: '#737373' }}>{formatDate(it.createdAt)}</td>
                        <td>{rowActions(it, showBranch && branch ? `${branch} · ${label}` : label)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showCreate && (
        <CreateQRWizard
          restaurants={wizardRestaurants.map((r) => ({
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
          defaultRestaurantId={wizardDefaultId}
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
            ? 'QR yalnızca panel listenden kaldırılır. Basılmış QR kodları çalışmaya devam eder; aynı masa veya platform için istediğin zaman yeniden oluşturabilirsin.'
            : 'The QR is only removed from your panel list. Printed QR codes keep working; you can re-create one for the same table or platform anytime.'
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
