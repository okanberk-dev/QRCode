'use client';

// Denetim Merkezi — owner liste sayfası (spec §3.1).
//
// İki sekme: "Denetimlerim" ve "Hazır şablonlar"; sekmeler, arama ve hazır
// şablon süzgeçleri tek araç çubuğundadır. İstatistik kutusu, "Aktif işletme"
// kartı YOK: işletme seçimi kabuktaki tek anahtardır. Veri sunucudan gelir (ilk
// boyamada iskelet yok); başka işletmeye geçince yalnız liste alanı iskelet
// gösterir ve hiçbir zaman bir işletmenin satırları başka işletmenin başlığı
// altında çizilmez (`byBusiness` önbelleği etkin işletme id'sine göre anahtarlıdır).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  ClipboardCheck,
  Copy as CopyIcon,
  Link2,
  MoreHorizontal,
  Pause,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  AlertBanner,
  Badge,
  EmptyState,
  PageHeader,
  PulseMenu,
  PulseMenuDivider,
  PulseMenuItem,
  Tabs,
  useConfirmDialog,
} from '@/components/ui';
import { SkCardGrid } from '@/components/ui/skeletons/PageSkeleton';
import { getTranslations, type Locale } from '@/lib/translations';
import { useDebouncedUrlInput, useUrlFilter } from '@/hooks/useUrlFilter';
import { parseAuditErrorResponse, summarizeAuditError } from '@/lib/audits/error-humanizer';
import { auditSectorForBusiness, deriveAuditStatus } from '@/lib/audits/kind';
import type { CatalogTemplateRow, OwnerAuditTemplateRow } from '@/lib/audits/queries';
import { useActiveBusinessSelection } from './useActiveBusinessSelection';
import ReadyTemplatesTab, { ReadyTemplatesFilters, useReadyTemplatesFilter } from './ReadyTemplatesTab';
import ShareLinksModal from './ShareLinksModal';
import Disclosure from './Disclosure';
import {
  SEARCH_MIN_AUDITS,
  deleteConfirmCopy,
  kindBadgeKind,
  kindLabel,
  lastResponseLine,
  matchesAuditQuery,
  metaLine,
  pauseConfirmCopy,
  responsesCount,
  statusBadgeKind,
  statusLabel,
} from './audit-ui';

interface RestaurantOption {
  id: string;
  name: string;
  category: string | null;
}

interface Props {
  locale: Locale;
  restaurants: RestaurantOption[];
  /** Sunucunun çözdüğü işletme (URL `?restaurantId` ya da ilk işletme). */
  hydratedRestaurantId: string | null;
  initialTemplates: OwnerAuditTemplateRow[];
  catalog: CatalogTemplateRow[];
  /** Salt-okunur (viewer) ekip üyesi false → yazma düğmeleri yok. */
  canWrite: boolean;
  appUrl: string;
}

type TabId = 'mine' | 'ready';

// How many times this list has mounted in this browser session. The first mount
// carries a fresh server render; a later one (Back from a detail/builder page)
// is restored from the router cache and its list can be older than the server.
let listMountCount = 0;

interface ShareTarget {
  row: OwnerAuditTemplateRow;
  restaurantId: string;
  autoPublish: boolean;
}

export default function AuditListClient({
  locale,
  restaurants,
  hydratedRestaurantId,
  initialTemplates,
  catalog,
  canWrite,
  appUrl,
}: Props) {
  const isTr = locale === 'tr';
  const t = getTranslations(locale);
  const router = useRouter();

  const business = useActiveBusinessSelection(restaurants, hydratedRestaurantId);
  const activeId = business.activeId;
  const activeRestaurant = restaurants.find((r) => r.id === activeId) ?? null;

  // İşletme id'sine göre önbellek. İlk değer sunucunun getirdiği işletmeye aittir.
  const [byBusiness, setByBusiness] = useState<Record<string, OwnerAuditTemplateRow[]>>(
    () => (hydratedRestaurantId ? { [hydratedRestaurantId]: initialTemplates } : {}),
  );
  // Kabuk `?restaurantId`'yi güncelleyip sayfa yeniden render olunca yeni sunucu
  // verisi prop olarak gelir; istemci isteği olmadan önbelleğe yaz.
  useEffect(() => {
    if (!hydratedRestaurantId) return;
    setByBusiness((prev) => ({ ...prev, [hydratedRestaurantId]: initialTemplates }));
  }, [hydratedRestaurantId, initialTemplates]);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const requestedRef = useRef<Set<string>>(new Set());

  const rows = activeId ? byBusiness[activeId] : undefined;

  // Önbellekte olmayan işletme: yalnız o işletmenin listesini çek.
  const hasCache = rows !== undefined;
  useEffect(() => {
    if (!business.ready || !activeId || hasCache) return;
    if (requestedRef.current.has(activeId)) return;
    requestedRef.current.add(activeId);
    setLoadError(null);
    const target = activeId;
    (async () => {
      try {
        const res = await fetch(`/api/restaurants/${target}/audits/templates`);
        if (!res.ok) {
          requestedRef.current.delete(target);
          const parsed = await parseAuditErrorResponse(res, locale);
          setLoadError(summarizeAuditError(parsed));
          return;
        }
        const json = (await res.json()) as { data?: OwnerAuditTemplateRow[] };
        setByBusiness((prev) => ({ ...prev, [target]: Array.isArray(json.data) ? json.data : [] }));
      } catch {
        requestedRef.current.delete(target);
        setLoadError(isTr ? 'Bağlantı hatası' : 'Connection error');
      }
    })();
  }, [business.ready, activeId, hasCache, retryTick, locale, isTr]);

  // Back from an audit/builder page restores this page from the router cache, so
  // a just-created or just-renamed audit can be missing. On a repeat mount, quietly
  // re-read the active business's list and swap it in (no skeleton, no flash).
  const isRepeatMountRef = useRef(false);
  useEffect(() => {
    isRepeatMountRef.current = listMountCount > 0;
    listMountCount += 1;
  }, []);
  useEffect(() => {
    if (!isRepeatMountRef.current || !business.ready || !activeId) return;
    const target = activeId;
    isRepeatMountRef.current = false;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/restaurants/${target}/audits/templates`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!res.ok) return;
        const json = (await res.json()) as { data?: OwnerAuditTemplateRow[] };
        if (Array.isArray(json.data)) {
          setByBusiness((prev) => ({ ...prev, [target]: json.data as OwnerAuditTemplateRow[] }));
        }
      } catch {
        // Keep showing the list we have; the next visit tries again.
      }
    })();
    return () => controller.abort();
  }, [business.ready, activeId]);

  const loadingRows = Boolean(activeId) && rows === undefined;
  const nonArchived = useMemo(() => (rows ?? []).filter((r) => r.status !== 'archived'), [rows]);
  const archived = useMemo(() => (rows ?? []).filter((r) => r.status === 'archived'), [rows]);

  // Sekme: `?tab=mine|ready` açık seçimdir; yoksa denetimi (arşivlenmiş olsa bile) varsa
  // "Denetimlerim", hiç yoksa ve katalogda şablon varsa "Hazır şablonlar". Son
  // denetimi arşivleyince sayfa başka sekmeye sıçramasın: arşiv bölümü
  // "Denetimlerim"in içinde. Katalog boşsa boş bir sekmeye açılmaz.
  const filters = useUrlFilter({ tab: '', q: '' });
  const tabParam = filters.values.tab;
  const hasCatalog = catalog.length > 0;
  const effectiveTab: TabId =
    tabParam === 'mine' || tabParam === 'ready'
      ? tabParam
      : loadingRows || (rows ?? []).length > 0 || !hasCatalog
        ? 'mine'
        : 'ready';

  const search = useDebouncedUrlInput(filters.values.q, (v) => filters.set('q', v));
  const showSearch = nonArchived.length >= SEARCH_MIN_AUDITS;
  const query = showSearch ? filters.values.q : '';
  const visible = useMemo(
    () => nonArchived.filter((r) => matchesAuditQuery(r.title, query)),
    [nonArchived, query],
  );

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [usingId, setUsingId] = useState<string | null>(null);
  const [shareFor, setShareFor] = useState<ShareTarget | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [confirmEl, askConfirm] = useConfirmDialog();
  // "Kullan" çift tıklamasına / geri tuşuna karşı eşzamanlı kilit: yönlendirme
  // bitene kadar ikinci bir canlı kopya oluşmasın.
  const useGuardRef = useRef(false);

  const businessQuery = activeId ? `?restaurantId=${encodeURIComponent(activeId)}` : '';
  const base = `/${locale}/dashboard/audits`;
  const newHref = `${base}/new${businessQuery}`;
  const detailHref = (id: string) => `${base}/${id}`;
  const copyEditHref = (id: string) =>
    `${base}/new?from=${encodeURIComponent(id)}${activeId ? `&restaurantId=${encodeURIComponent(activeId)}` : ''}`;

  const updateRow = useCallback(
    (id: string, fn: (r: OwnerAuditTemplateRow) => OwnerAuditTemplateRow) => {
      if (!activeId) return;
      setByBusiness((prev) => ({
        ...prev,
        [activeId]: (prev[activeId] ?? []).map((r) => (r.id === id ? fn(r) : r)),
      }));
    },
    [activeId],
  );
  const removeRow = useCallback(
    (id: string) => {
      if (!activeId) return;
      setByBusiness((prev) => ({
        ...prev,
        [activeId]: (prev[activeId] ?? []).filter((r) => r.id !== id),
      }));
    },
    [activeId],
  );

  const failFrom = useCallback(
    async (res: Response) => {
      const parsed = await parseAuditErrorResponse(res, locale);
      setError(summarizeAuditError(parsed));
    },
    [locale],
  );

  async function handleUse(templateId: string) {
    if (!activeId || useGuardRef.current) return;
    useGuardRef.current = true;
    setUsingId(templateId);
    setError(null);
    try {
      const res = await fetch(`/api/restaurants/${activeId}/audits/templates/${templateId}/fork`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ publish: true, shareLink: true }),
      });
      if (!res.ok) {
        await failFrom(res);
        useGuardRef.current = false;
        setUsingId(null);
        return;
      }
      const json = (await res.json()) as { data?: { id?: string } };
      if (json.data?.id) {
        // Kilit yönlendirme bitene kadar açık kalır.
        router.push(`${base}/${json.data.id}?share=1`);
        return;
      }
      useGuardRef.current = false;
      setUsingId(null);
      router.refresh();
    } catch {
      setError(isTr ? 'Bağlantı hatası' : 'Connection error');
      useGuardRef.current = false;
      setUsingId(null);
    }
  }

  async function handleDuplicate(row: OwnerAuditTemplateRow) {
    if (!activeId || busyId) return;
    setBusyId(row.id);
    setError(null);
    try {
      const res = await fetch(`/api/restaurants/${activeId}/audits/templates/${row.id}/duplicate`, {
        method: 'POST',
      });
      if (!res.ok) {
        await failFrom(res);
        return;
      }
      const json = (await res.json()) as { data?: { id?: string } };
      if (json.data?.id) router.push(detailHref(json.data.id));
      else router.refresh();
    } catch {
      setError(isTr ? 'Bağlantı hatası' : 'Connection error');
    } finally {
      setBusyId(null);
    }
  }

  function askPause(row: OwnerAuditTemplateRow) {
    const copy = pauseConfirmCopy(locale, row.title);
    askConfirm({
      title: copy.title,
      body: copy.body,
      confirmLabel: copy.confirm,
      cancelLabel: isTr ? 'Vazgeç' : 'Cancel',
      onConfirm: async () => {
        if (!activeId) return;
        setBusyId(row.id);
        setError(null);
        try {
          const res = await fetch(`/api/restaurants/${activeId}/audits/templates/${row.id}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ publish: false }),
          });
          if (!res.ok) {
            await failFrom(res);
            return;
          }
          updateRow(row.id, (r) => ({
            ...r,
            isPublished: false,
            status: deriveAuditStatus({
              isActive: r.isActive,
              isPublished: false,
              assignmentCount: r._count.assignments,
              responseCount: r._count.responses,
            }),
          }));
          setNotice(isTr ? 'Denetim duraklatıldı.' : 'Audit paused.');
          router.refresh();
        } catch {
          setError(isTr ? 'Bağlantı hatası' : 'Connection error');
        } finally {
          setBusyId(null);
        }
      },
    });
  }

  function askDelete(row: OwnerAuditTemplateRow) {
    const hasResponses = row._count.responses > 0;
    const copy = deleteConfirmCopy(hasResponses, locale, row.title);
    askConfirm({
      title: copy.title,
      body: copy.body,
      variant: 'danger',
      confirmLabel: copy.confirm,
      cancelLabel: isTr ? 'Vazgeç' : 'Cancel',
      onConfirm: async () => {
        if (!activeId) return;
        setBusyId(row.id);
        setError(null);
        try {
          const res = await fetch(`/api/restaurants/${activeId}/audits/templates/${row.id}`, {
            method: 'DELETE',
          });
          if (!res.ok) {
            await failFrom(res);
            return;
          }
          const json = (await res.json().catch(() => ({}))) as { mode?: string };
          if (json.mode === 'soft-disabled') {
            updateRow(row.id, (r) => ({ ...r, isActive: false, status: 'archived' }));
            setArchivedOpen(true);
            setNotice(isTr ? 'Denetim arşivlendi. Yanıtlar korunuyor.' : 'Audit archived. Responses are kept.');
          } else {
            removeRow(row.id);
            setNotice(isTr ? 'Denetim silindi.' : 'Audit deleted.');
          }
          router.refresh();
        } catch {
          setError(isTr ? 'Bağlantı hatası' : 'Connection error');
        } finally {
          setBusyId(null);
        }
      },
    });
  }

  // Kaynak şablon → etkin işletmede kullanılan (arşivlenmemiş) denetim sayısı.
  const inUse = useMemo(() => {
    const out: Record<string, number> = {};
    for (const r of nonArchived) {
      if (r.forkedFromId) out[r.forkedFromId] = (out[r.forkedFromId] ?? 0) + 1;
    }
    return out;
  }, [nonArchived]);

  const businessSector = auditSectorForBusiness(activeRestaurant?.category);
  const readyFilter = useReadyTemplatesFilter(catalog, locale, businessSector);

  function setTab(id: string) {
    filters.set('tab', id === 'mine' || id === 'ready' ? id : '');
  }

  // ─── İşletme yok ──────────────────────────────────────────────────────
  if (restaurants.length === 0) {
    return (
      <div className="mx-auto max-w-[1440px] space-y-4 px-4 py-6 sm:px-7 lg:py-8">
        <PageHeader
          eyebrow={isTr ? 'DENETİM MERKEZİ' : 'AUDIT CENTER'}
          title={t.audits_title}
          description={t.audits_subtitle}
        />
        <EmptyState
          icon={<ClipboardCheck size={20} />}
          title={isTr ? 'Önce bir işletme ekle' : 'Add a business first'}
          body={
            isTr
              ? 'Denetimler bir işletmeye bağlıdır.'
              : 'Audits belong to a business.'
          }
          action={
            <Link href={`/${locale}/dashboard/restaurants`} className="bz-btn-primary">
              {isTr ? 'İşletmelerime git' : 'Go to my businesses'}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 px-4 py-6 sm:px-7 lg:py-8">
      <PageHeader
        eyebrow={(activeRestaurant?.name ?? (isTr ? 'DENETİM MERKEZİ' : 'AUDIT CENTER')).toLocaleUpperCase(
          isTr ? 'tr-TR' : 'en-US',
        )}
        title={t.audits_title}
        description={
          isTr
            ? 'Ekibin için kontrol listeleri ve testler. Linki paylaş, yanıtları burada gör.'
            : 'Checklists and tests for your team. Share a link, see the answers here.'
        }
        actions={
          canWrite ? (
            <Link href={newHref} className="bz-btn-primary min-h-11 sm:min-h-9">
              <Plus size={14} aria-hidden="true" /> {isTr ? 'Yeni denetim' : 'New audit'}
            </Link>
          ) : undefined
        }
      />

      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}
      {notice && (
        <AlertBanner kind="success" onDismiss={() => setNotice(null)}>
          {notice}
        </AlertBanner>
      )}

      {/* Tek araç çubuğu: sekmeler + (Denetimlerim) arama / (Hazır şablonlar) süzgeçler. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <Tabs
          className="shrink-0 [&_[role=tab]]:min-h-11 sm:[&_[role=tab]]:min-h-0"
          ariaLabel={isTr ? 'Denetim Merkezi bölümleri' : 'Audit Center sections'}
          active={effectiveTab}
          onChange={setTab}
          items={[
            {
              id: 'mine',
              label: isTr ? 'Denetimlerim' : 'My audits',
              count: loadingRows ? undefined : nonArchived.length,
            },
            { id: 'ready', label: isTr ? 'Hazır şablonlar' : 'Ready-made templates' },
          ]}
        />
        {effectiveTab === 'ready' ? (
          <ReadyTemplatesFilters filter={readyFilter} locale={locale} />
        ) : (
          showSearch &&
          !loadingRows && (
            <div className="relative w-full min-w-0 sm:max-w-[360px] sm:flex-1">
              <Search
                size={14}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]"
              />
              <input
                type="search"
                className="bz-input pl-9"
                value={search.input}
                onChange={(e) => search.setInput(e.target.value)}
                placeholder={isTr ? 'Denetim ara…' : 'Search audits…'}
                aria-label={isTr ? 'Denetim ara' : 'Search audits'}
                enterKeyHint="search"
              />
            </div>
          )
        )}
      </div>

      {effectiveTab === 'ready' ? (
        <div role="tabpanel" aria-label={isTr ? 'Hazır şablonlar' : 'Ready-made templates'}>
          <ReadyTemplatesTab
            locale={locale}
            filter={readyFilter}
            inUse={inUse}
            canWrite={canWrite}
            usingId={usingId}
            onUse={(id) => void handleUse(id)}
            copyEditHref={copyEditHref}
            hasBusiness={Boolean(activeId)}
          />
        </div>
      ) : (
        <div role="tabpanel" aria-label={isTr ? 'Denetimlerim' : 'My audits'} className="space-y-4">
          {loadError && rows === undefined && (
            <AlertBanner
              kind="danger"
              onDismiss={() => {
                setLoadError(null);
              }}
            >
              <span>{loadError} </span>
              <button
                type="button"
                className="font-medium underline"
                onClick={() => {
                  setLoadError(null);
                  setRetryTick((n) => n + 1);
                }}
              >
                {isTr ? 'Tekrar dene' : 'Try again'}
              </button>
            </AlertBanner>
          )}

          {loadingRows && !loadError ? (
            <SkCardGrid count={3} cols={3} />
          ) : nonArchived.length === 0 ? (
            <EmptyState
              icon={<ClipboardCheck size={20} />}
              title={
                archived.length > 0
                  ? isTr
                    ? 'Etkin denetimin yok'
                    : 'No active audits'
                  : isTr
                    ? 'Henüz denetimin yok'
                    : 'No audits yet'
              }
              body={
                !canWrite
                  ? isTr
                    ? 'Bu işletmede henüz denetim yok.'
                    : 'This business has no audits yet.'
                  : hasCatalog
                    ? isTr
                      ? 'Hazır şablonlardan birini seç; linkini tek tıkla alırsın. Ya da "Yeni denetim" ile kendin oluştur.'
                      : 'Pick a ready-made template; you get its link in one click. Or create your own with "New audit".'
                    : isTr
                      ? 'İlk kontrol listeni ya da testini "Yeni denetim" ile oluştur, linkini ekibinle paylaş.'
                      : 'Create your first checklist or test with "New audit" and share its link with your team.'
              }
              action={
                canWrite && hasCatalog ? (
                  <button type="button" className="bz-btn-ghost min-h-11 sm:min-h-9" onClick={() => setTab('ready')}>
                    {isTr ? 'Hazır şablonlara bak' : 'Browse ready-made templates'}
                  </button>
                ) : undefined
              }
            />
          ) : (
            <>
              {visible.length === 0 ? (
                <EmptyState
                  icon={<Search size={20} />}
                  title={isTr ? 'Eşleşen denetim yok' : 'No matching audits'}
                  body={isTr ? 'Başka bir sözcük dene.' : 'Try another word.'}
                  action={
                    <button
                      type="button"
                      className="bz-btn-ghost"
                      onClick={() => {
                        search.replaceInput('');
                        filters.set('q', '');
                      }}
                    >
                      <X size={12} aria-hidden="true" /> {isTr ? 'Aramayı temizle' : 'Clear search'}
                    </button>
                  }
                />
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visible.map((row) => (
                    <li key={row.id}>
                      <AuditCard
                        row={row}
                        locale={locale}
                        canWrite={canWrite}
                        busy={busyId === row.id}
                        detailHref={detailHref(row.id)}
                        resultsHref={`${detailHref(row.id)}/results`}
                        onShare={(autoPublish) =>
                          activeId && setShareFor({ row, restaurantId: activeId, autoPublish })
                        }
                        onResults={() => router.push(`${detailHref(row.id)}/results`)}
                        onEdit={() => router.push(`${detailHref(row.id)}/edit`)}
                        onDuplicate={() => void handleDuplicate(row)}
                        onPause={() => askPause(row)}
                        onDelete={() => askDelete(row)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {!loadingRows && archived.length > 0 && (
            <section className="border-t border-pn-line pt-1">
              <Disclosure
                open={archivedOpen}
                onToggle={() => setArchivedOpen((v) => !v)}
                controls="audit-archived-list"
              >
                {isTr ? `Arşivlenenler (${archived.length})` : `Archived (${archived.length})`}
              </Disclosure>
              {archivedOpen && (
                <ul id="audit-archived-list" className="mt-2 space-y-2">
                  {archived.map((row) => (
                    <li key={row.id} className="bz-card flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={detailHref(row.id)}
                          className="block truncate text-[14px] font-medium text-pn-ink hover:underline"
                        >
                          {row.title}
                        </Link>
                        <p className="mt-0.5 text-[12px] text-[#737373]">
                          {responsesCount(row._count.responses, locale)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`${detailHref(row.id)}/results`}
                          className="bz-btn-ghost min-h-11 sm:min-h-9"
                        >
                          {isTr ? 'Sonuçlar' : 'Results'}
                        </Link>
                        {canWrite && (
                          <PulseMenu
                            trigger={
                              <button
                                type="button"
                                className="bz-btn-icon h-11 w-11 sm:h-9 sm:w-9"
                                aria-label={isTr ? `${row.title}: diğer işlemler` : `${row.title}: more actions`}
                                disabled={busyId === row.id}
                              >
                                <MoreHorizontal size={16} aria-hidden="true" />
                              </button>
                            }
                          >
                            <PulseMenuItem icon={<CopyIcon size={14} />} onSelect={() => void handleDuplicate(row)}>
                              {isTr ? 'Kopyala' : 'Duplicate'}
                            </PulseMenuItem>
                          </PulseMenu>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}

      {shareFor && (
        <ShareLinksModal
          key={shareFor.row.id}
          locale={locale}
          restaurantId={shareFor.restaurantId}
          templateId={shareFor.row.id}
          title={shareFor.row.title}
          kind={shareFor.row.kind}
          isPublished={shareFor.row.isPublished}
          questionCount={shareFor.row._count.questions}
          appUrl={appUrl}
          autoPublish={shareFor.autoPublish}
          onClose={() => setShareFor(null)}
          onPublished={() => {
            updateRow(shareFor.row.id, (r) => ({ ...r, isPublished: true, status: 'live' }));
            router.refresh();
          }}
        />
      )}

      {confirmEl}
    </div>
  );
}

// ─── Kart ───────────────────────────────────────────────────────────────

function AuditCard({
  row,
  locale,
  canWrite,
  busy,
  detailHref,
  resultsHref,
  onShare,
  onResults,
  onEdit,
  onDuplicate,
  onPause,
  onDelete,
}: {
  row: OwnerAuditTemplateRow;
  locale: Locale;
  canWrite: boolean;
  busy: boolean;
  detailHref: string;
  resultsHref: string;
  onShare: (autoPublish: boolean) => void;
  onResults: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onPause: () => void;
  onDelete: () => void;
}) {
  const isTr = locale === 'tr';
  const noQuestions = row._count.questions === 0;

  let primary: { label: string; autoPublish: boolean; disabled: boolean; hint?: string } | null = null;
  if (canWrite) {
    if (row.status === 'live') {
      primary = { label: isTr ? 'Linki paylaş' : 'Share link', autoPublish: false, disabled: false };
    } else if (row.status === 'paused') {
      primary = {
        label: isTr ? 'Yeniden başlat' : 'Restart',
        autoPublish: true,
        disabled: noQuestions,
        hint: noQuestions ? (isTr ? 'Önce madde ekle' : 'Add an item first') : undefined,
      };
    } else if (row.status === 'draft') {
      primary = {
        label: isTr ? 'Yayınla ve linki al' : 'Publish and get link',
        autoPublish: true,
        disabled: noQuestions,
        hint: noQuestions ? (isTr ? 'Önce madde ekle' : 'Add an item first') : undefined,
      };
    }
  }

  return (
    <article className="bz-card relative flex h-full flex-col gap-3 p-4 transition-shadow hover:shadow-md">
      <div className="min-w-0">
        <h3 className="bz-h-tight text-[16px] leading-snug">
          {/* Tüm kart bu bağlantıya tıklar (uzatılmış bağlantı); eylemler z-10 ile üstte. */}
          <Link
            href={detailHref}
            className="break-words after:absolute after:inset-0 after:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pn-accent"
          >
            {row.title}
          </Link>
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge kind={kindBadgeKind(row.kind)} dot={false}>
            {kindLabel(row.kind, locale)}
          </Badge>
          <Badge kind={statusBadgeKind(row.status)}>{statusLabel(row.status, locale)}</Badge>
        </div>
      </div>

      <div className="space-y-0.5">
        <p className="text-[13px] text-[#525252]">
          {metaLine(row._count.questions, row._count.responses, locale)}
        </p>
        <p className="text-[12px] text-[#737373]">{lastResponseLine(row.lastResponseAt, locale)}</p>
      </div>

      <div className="relative z-10 mt-auto flex flex-wrap items-center gap-2 pt-1">
        {primary ? (
          <button
            type="button"
            className="bz-btn-primary min-h-11 sm:min-h-9"
            onClick={() => onShare(primary.autoPublish)}
            disabled={primary.disabled || busy}
            title={primary.hint}
          >
            <Link2 size={14} aria-hidden="true" /> {primary.label}
          </button>
        ) : (
          <Link href={resultsHref} className="bz-btn-ghost min-h-11 sm:min-h-9">
            {isTr ? 'Sonuçlar' : 'Results'}
          </Link>
        )}
        {primary?.hint && <span className="text-[12px] text-[#737373]">{primary.hint}</span>}

        {canWrite && (
          <span className="ml-auto">
            <PulseMenu
              trigger={
                <button
                  type="button"
                  className="bz-btn-icon h-11 w-11 sm:h-9 sm:w-9"
                  aria-label={isTr ? `${row.title}: diğer işlemler` : `${row.title}: more actions`}
                  disabled={busy}
                >
                  <MoreHorizontal size={16} aria-hidden="true" />
                </button>
              }
            >
              <PulseMenuItem icon={<BarChart3 size={14} />} onSelect={onResults}>
                {isTr ? `Sonuçlar (${row._count.responses})` : `Results (${row._count.responses})`}
              </PulseMenuItem>
              <PulseMenuItem icon={<Pencil size={14} />} onSelect={onEdit}>
                {isTr ? 'Düzenle' : 'Edit'}
              </PulseMenuItem>
              <PulseMenuItem icon={<CopyIcon size={14} />} onSelect={onDuplicate}>
                {isTr ? 'Kopyala' : 'Duplicate'}
              </PulseMenuItem>
              {row.status === 'live' && (
                <PulseMenuItem icon={<Pause size={14} />} onSelect={onPause}>
                  {isTr ? 'Duraklat' : 'Pause'}
                </PulseMenuItem>
              )}
              <PulseMenuDivider />
              <PulseMenuItem icon={<Trash2 size={14} />} danger onSelect={onDelete}>
                {isTr ? 'Sil' : 'Delete'}
              </PulseMenuItem>
            </PulseMenu>
          </span>
        )}
      </div>
    </article>
  );
}
