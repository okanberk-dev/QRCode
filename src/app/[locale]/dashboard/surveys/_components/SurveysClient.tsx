'use client';

// Surveys list (CLAUDE.md §42, server hydration §40.10).
//
// - The server hands over the active business's surveys; the first paint has no
//   skeleton. Rows are cached per business, so a business that was NOT
//   hydrated shows a skeleton and fetches, and one business's surveys are never
//   drawn under another business's heading.
// - The shell's business switcher is the only business picker. Owners with
//   several businesses get one toolbar segment: "This business" (follows the
//   switcher) or "All businesses" (a local list filter), next to the summary.
// - One summary line replaces the four stat cards.
// - Each survey is a card with the actions owners actually need without
//   opening it: copy the customer link, publish a draft in one tap, and a
//   menu for the rest. A viewer only gets "copy link" and "open results".
// - An owner with no survey yet sees template cards instead of an empty box.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  BedDouble,
  Check,
  ClipboardList,
  Copy,
  Eye,
  EyeOff,
  Gauge,
  Link2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Smile,
  Sparkles,
  Star,
  Stethoscope,
  Store,
  Trash2,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import type { Locale } from '@/lib/translations';
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
import { SkBox } from '@/components/ui/skeletons/PageSkeleton';
import { useActiveBusinessSelection } from '@/components/audits/useActiveBusinessSelection';
import { formatStampInTimeZone } from '@/lib/timezone';
import { detectSector } from '@/lib/sector-platforms';
import { SECTORS } from '@/lib/sectors';
import { estimateSurveySeconds, formatSurveyDuration } from '@/lib/surveys';
import { templatesForSector, type SurveyTemplate, type SurveyTemplateIcon } from '@/lib/survey-templates';
import type { SurveyListRow } from '@/lib/surveys-query';
import { MENU_TOUCH } from './menu-touch';
import {
  connectionErrorMessage,
  copyText,
  readSurveyApiError,
  surveyPublicUrl,
} from './survey-owner-ui';

interface RestaurantOption {
  id: string;
  name: string;
  category: string | null;
  /** Admin master switch (feature-access). */
  surveysEnabled: boolean;
}

interface Props {
  locale: Locale;
  restaurants: RestaurantOption[];
  /** Business the server resolved (URL `?restaurantId`, else the first one). */
  initialActiveRestaurantId: string | null;
  initialSurveys: SurveyListRow[];
  /** Business `initialSurveys` belong to. */
  initialSurveysFor: string | null;
  publicBaseUrl: string;
  /** Viewer (read-only team member) = false. The API is the real gate. */
  canWrite: boolean;
}

/** Cache key for the "all businesses" list. */
const ALL_KEY = '__all__';

type Scope = 'business' | 'all';

const TEMPLATE_ICONS: Record<SurveyTemplateIcon, LucideIcon> = {
  Smile,
  Gauge,
  Star,
  UtensilsCrossed,
  BedDouble,
  Stethoscope,
  Sparkles,
  Store,
};

export default function SurveysClient({
  locale,
  restaurants,
  initialActiveRestaurantId,
  initialSurveys,
  initialSurveysFor,
  publicBaseUrl,
  canWrite,
}: Props) {
  const isTr = locale === 'tr';
  const router = useRouter();

  // Follows the shell's business switcher (the only business picker).
  const { activeId: activeRestaurantId, ready: businessReady } = useActiveBusinessSelection(
    restaurants,
    initialActiveRestaurantId,
  );
  // "All businesses" is a local list filter; picking a business in the shell
  // switcher brings the list back to that business.
  const multiBusiness = restaurants.length > 1;
  const [scope, setScope] = useState<Scope>('business');
  useEffect(() => {
    const back = () => setScope('business');
    window.addEventListener('buaze:active-restaurant-change', back);
    return () => window.removeEventListener('buaze:active-restaurant-change', back);
  }, []);
  // `null` = every business the owner may see.
  const listRestaurantId = scope === 'all' && multiBusiness ? null : activeRestaurantId;

  const [cache, setCache] = useState<Record<string, SurveyListRow[]>>(() =>
    initialSurveysFor ? { [initialSurveysFor]: initialSurveys } : {},
  );
  // The shell rewrites `?restaurantId` and the server page renders again with
  // that business's rows: take them without a client request.
  useEffect(() => {
    if (!initialSurveysFor) return;
    setCache((prev) => ({ ...prev, [initialSurveysFor]: initialSurveys }));
  }, [initialSurveysFor, initialSurveys]);

  const key = listRestaurantId ?? ALL_KEY;
  const rows = cache[key];
  const requestedRef = useRef<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  // A business the server did not hydrate: fetch just that business's list.
  useEffect(() => {
    if (!businessReady || rows !== undefined) return;
    const requested = requestedRef.current;
    if (requested.has(key)) return;
    requested.add(key);
    setLoadError(null);
    let cancelled = false;
    const url = listRestaurantId
      ? `/api/surveys?restaurantId=${encodeURIComponent(listRestaurantId)}`
      : '/api/surveys';
    (async () => {
      try {
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error('fetch_failed');
        const json = (await res.json()) as { surveys?: SurveyListRow[] };
        if (!cancelled) {
          setCache((prev) => ({
            ...prev,
            [key]: Array.isArray(json.surveys) ? json.surveys : [],
          }));
        }
      } catch {
        requested.delete(key);
        if (!cancelled) {
          setLoadError(
            isTr ? 'Anketler yüklenemedi.' : 'Could not load surveys.',
          );
        }
      }
    })();
    return () => {
      // Allow a later effect run (retry) to request again.
      cancelled = true;
      requested.delete(key);
    };
  }, [businessReady, rows, key, listRestaurantId, retryTick, isTr]);

  const loadingRows = rows === undefined;
  const surveys = useMemo(() => rows ?? [], [rows]);

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmEl, askConfirm] = useConfirmDialog();
  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const moduleOffIds = useMemo(
    () => new Set(restaurants.filter((r) => !r.surveysEnabled).map((r) => r.id)),
    [restaurants],
  );
  const activeRestaurant = restaurants.find((r) => r.id === activeRestaurantId) ?? null;
  // The business the "new survey" links and the template suggestions refer to:
  // always the switcher's business, also while "All businesses" is shown.
  const targetRestaurant = activeRestaurant ?? restaurants[0] ?? null;
  // "New survey" is blocked when the target business has the module off.
  const moduleOff = targetRestaurant ? !targetRestaurant.surveysEnabled : false;
  const moduleOffMessage = (names: string) =>
    isTr
      ? `Anket modülü ${names} için Buaze yönetimi tarafından kapatıldı. Mevcut anketlerin korunur; yeni anket yayınlanamaz ve yayındaki linkler yanıt toplamaz.`
      : `The Surveys module is turned off by Buaze for ${names}. Your existing surveys are kept, but new surveys can't be published and live links stop collecting answers.`;
  // Banner: the shown business, or every business with the module off.
  const disabledNames = restaurants
    .filter((r) => !r.surveysEnabled && (!listRestaurantId || r.id === listRestaurantId))
    .map((r) => r.name)
    .join(', ');
  const targetOffMessage = moduleOffMessage(targetRestaurant?.name ?? '');

  const newBase = `/${locale}/dashboard/surveys/new`;
  const businessQuery = targetRestaurant
    ? `restaurantId=${encodeURIComponent(targetRestaurant.id)}`
    : '';
  const newSurveyHref = businessQuery ? `${newBase}?${businessQuery}` : newBase;
  const detailHref = (id: string, tab?: string) =>
    `/${locale}/dashboard/surveys/${id}${tab ? `?tab=${tab}` : ''}`;

  // A survey can sit in two cached lists (its business and "All businesses"):
  // a change is applied to every list that holds it.
  const patchRow = useCallback((id: string, fn: (r: SurveyListRow) => SurveyListRow) => {
    setCache((prev) => {
      const next: Record<string, SurveyListRow[]> = {};
      for (const [k, list] of Object.entries(prev)) {
        next[k] = list.map((r) => (r.id === id ? fn(r) : r));
      }
      return next;
    });
  }, []);

  async function handleCopy(row: SurveyListRow) {
    const ok = await copyText(surveyPublicUrl(publicBaseUrl, row.slug));
    if (!ok) {
      setError(
        isTr
          ? 'Link kopyalanamadı. Tarayıcın panoya erişime izin vermiyor olabilir.'
          : "Couldn't copy the link. Your browser may be blocking clipboard access.",
      );
      return;
    }
    setCopiedId(row.id);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopiedId(null), 1500);
  }

  async function setPublished(row: SurveyListRow, publish: boolean) {
    if (busyId) return;
    setBusyId(row.id);
    setError(null);
    setNotice(null);
    const before = { isPublished: row.isPublished, publishedAt: row.publishedAt };
    // Optimistic: the card flips at once; a failure puts it back.
    patchRow(row.id, (r) => ({
      ...r,
      isPublished: publish,
      publishedAt: publish ? (r.publishedAt ?? new Date().toISOString()) : null,
    }));
    try {
      const res = await fetch(`/api/surveys/${row.id}/publish`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish }),
      });
      if (!res.ok) {
        patchRow(row.id, (r) => ({ ...r, ...before }));
        setError(await readSurveyApiError(res, locale));
        return;
      }
      const json = (await res.json().catch(() => null)) as {
        survey?: { isPublished?: boolean; publishedAt?: string | null };
      } | null;
      if (json?.survey) {
        patchRow(row.id, (r) => ({
          ...r,
          isPublished: json.survey?.isPublished ?? publish,
          publishedAt: json.survey?.publishedAt ?? null,
        }));
      }
      setNotice(
        publish
          ? isTr
            ? 'Anket yayında. Linki kopyalayıp paylaşabilirsin.'
            : 'The survey is live. Copy the link and share it.'
          : isTr
            ? 'Anket yayından kaldırıldı. Müşteriler linki açınca "şu anda yanıt almıyor" mesajını görür.'
            : 'The survey is no longer live. Customers who open the link will see "not accepting responses right now".',
      );
    } catch {
      patchRow(row.id, (r) => ({ ...r, ...before }));
      setError(connectionErrorMessage(locale));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDuplicate(row: SurveyListRow) {
    if (busyId) return;
    setBusyId(row.id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/surveys/${row.id}/duplicate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        setError(await readSurveyApiError(res, locale));
        return;
      }
      const json = (await res.json().catch(() => null)) as { survey?: { id?: string } } | null;
      if (json?.survey?.id) {
        router.push(`/${locale}/dashboard/surveys/${json.survey.id}/edit`);
        return;
      }
      setNotice(isTr ? 'Kopya oluşturuldu.' : 'Copy created.');
      // The copy belongs in several lists: drop them all and reload this one.
      setCache({});
      requestedRef.current.clear();
      setRetryTick((n) => n + 1);
    } catch {
      setError(connectionErrorMessage(locale));
    } finally {
      setBusyId(null);
    }
  }

  function askDelete(row: SurveyListRow) {
    askConfirm({
      title: isTr ? 'Bu anket silinsin mi?' : 'Delete this survey?',
      body: isTr
        ? `Anket ve ${row._count.responses} yanıtı kalıcı olarak silinecek. Müşteri linki ve QR kod çalışmayı bırakır.`
        : `The survey and its ${row._count.responses} ${row._count.responses === 1 ? 'response' : 'responses'} will be permanently deleted. The customer link and QR code will stop working.`,
      variant: 'danger',
      confirmLabel: isTr ? 'Sil' : 'Delete',
      cancelLabel: isTr ? 'Vazgeç' : 'Cancel',
      onConfirm: async () => {
        setBusyId(row.id);
        setError(null);
        setNotice(null);
        try {
          const res = await fetch(`/api/surveys/${row.id}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          if (!res.ok) {
            setError(await readSurveyApiError(res, locale));
            return;
          }
          setCache((prev) => {
            const next: Record<string, SurveyListRow[]> = {};
            for (const [k, list] of Object.entries(prev)) {
              next[k] = list.filter((r) => r.id !== row.id);
            }
            return next;
          });
          setNotice(isTr ? 'Anket silindi.' : 'Survey deleted.');
        } catch {
          setError(connectionErrorMessage(locale));
        } finally {
          setBusyId(null);
        }
      },
    });
  }

  const totals = useMemo(
    () => ({
      total: surveys.length,
      live: surveys.filter((s) => s.isPublished).length,
      responses: surveys.reduce((sum, s) => sum + s._count.responses, 0),
    }),
    [surveys],
  );

  const summaryLine = isTr
    ? `${totals.total} anket · ${totals.live} yayında · ${totals.responses} yanıt`
    : `${totals.total} ${totals.total === 1 ? 'survey' : 'surveys'} · ${totals.live} live · ${totals.responses} ${totals.responses === 1 ? 'response' : 'responses'}`;

  const newSurveyLabel = isTr ? 'Yeni anket' : 'New survey';
  const pageDescription = isTr
    ? 'Müşterilerinden kısa, hedefli geri bildirim topla. QR ile paylaş, sonuçları burada oku.'
    : 'Collect short, targeted feedback. Share by QR and read the results here.';

  // ─── No business at all ──────────────────────────────────────────────
  if (restaurants.length === 0) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-7 lg:py-8">
        <PageHeader title={isTr ? 'Anketler' : 'Surveys'} description={pageDescription} />
        <EmptyState
          icon={<ClipboardList size={20} />}
          title={isTr ? 'Önce bir işletme ekle' : 'Add a business first'}
          body={isTr ? 'Anketler bir işletmeye bağlıdır.' : 'Surveys belong to a business.'}
          action={
            <Link href={`/${locale}/dashboard/restaurants`} className="bz-btn-primary min-h-11 sm:min-h-9">
              {isTr ? 'İşletmelerime git' : 'Go to my businesses'}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-7 lg:py-8">
      <PageHeader
        title={isTr ? 'Anketler' : 'Surveys'}
        description={pageDescription}
        actions={
          canWrite ? (
            moduleOff ? (
              <button
                type="button"
                disabled
                title={targetOffMessage}
                className="bz-btn-primary min-h-11 gap-2 sm:min-h-9"
              >
                <Plus size={16} aria-hidden="true" />
                {newSurveyLabel}
              </button>
            ) : (
              <Link href={newSurveyHref} className="bz-btn-primary min-h-11 gap-2 sm:min-h-9">
                <Plus size={16} aria-hidden="true" />
                {newSurveyLabel}
              </Link>
            )
          ) : undefined
        }
      />

      {disabledNames ? (
        <div className="mb-4">
          <AlertBanner kind="warn">{moduleOffMessage(disabledNames)}</AlertBanner>
        </div>
      ) : null}

      {/* One toolbar: which businesses are shown · summary. Hidden while
          there is nothing to sum up for a single-business owner. */}
      {(multiBusiness || (!loadingRows && surveys.length > 0)) && (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          {multiBusiness && (
            <Tabs
              items={[
                { id: 'business', label: isTr ? 'Bu işletme' : 'This business' },
                { id: 'all', label: isTr ? 'Tüm işletmeler' : 'All businesses' },
              ]}
              active={scope}
              onChange={(id) => setScope(id === 'all' ? 'all' : 'business')}
              ariaLabel={isTr ? 'Gösterilen işletmeler' : 'Businesses shown'}
              className="shrink-0 [&_.bz-tab]:min-h-[44px] sm:[&_.bz-tab]:min-h-0"
            />
          )}
          {!loadingRows && surveys.length > 0 && (
            <p className="text-sm text-[#525252]">{summaryLine}</p>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4">
          <AlertBanner kind="danger" onDismiss={() => setError(null)}>
            {error}
          </AlertBanner>
        </div>
      )}
      {notice && (
        <div className="mb-4">
          <AlertBanner kind="success" onDismiss={() => setNotice(null)}>
            {notice}
          </AlertBanner>
        </div>
      )}
      {loadError && loadingRows && (
        <div className="mb-4">
          <AlertBanner kind="danger">
            <span>{loadError} </span>
            <button
              type="button"
              className="min-h-[44px] font-medium underline"
              onClick={() => {
                setLoadError(null);
                setRetryTick((n) => n + 1);
              }}
            >
              {isTr ? 'Tekrar dene' : 'Try again'}
            </button>
          </AlertBanner>
        </div>
      )}

      {loadingRows ? (
        loadError ? null : <SurveyCardsSkeleton />
      ) : surveys.length === 0 ? (
        <EmptyStart
          locale={locale}
          canWrite={canWrite}
          moduleOff={moduleOff}
          targetRestaurant={targetRestaurant}
          businessQuery={businessQuery}
          newBase={newBase}
        />
      ) : (
        <>
          <ul className="space-y-3">
            {surveys.map((row) => {
              const rowOff = moduleOffIds.has(row.restaurantId);
              const busy = busyId === row.id;
              const copied = copiedId === row.id;
              const stamp = row.latestResponseAt
                ? formatStampInTimeZone(row.latestResponseAt, locale)
                : '';
              const questionWord = isTr
                ? 'soru'
                : row._count.questions === 1
                  ? 'question'
                  : 'questions';
              const responseWord = isTr
                ? 'yanıt'
                : row._count.responses === 1
                  ? 'response'
                  : 'responses';
              const meta =
                row._count.responses > 0
                  ? `${row._count.questions} ${questionWord} · ${row._count.responses} ${responseWord}${stamp ? ` · ${isTr ? 'Son yanıt' : 'Last response'}: ${stamp}` : ''}`
                  : `${row._count.questions} ${questionWord} · ${isTr ? 'Henüz yanıt yok' : 'No responses yet'}`;
              return (
                <li
                  key={row.id}
                  className="bz-card relative flex flex-col gap-3 p-4 transition-shadow sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: row.accentColor || '#5D3EBC' }}
                        aria-hidden="true"
                      />
                      {/* The title link is stretched over the whole card; the
                          action buttons sit above it (relative z-10). */}
                      <Link
                        href={detailHref(row.id)}
                        className="bz-h-tight inline-flex min-h-[44px] max-w-full items-center truncate text-[16px] after:absolute after:inset-0 after:rounded-full after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-pn-ink"
                      >
                        {row.title}
                      </Link>
                      {row.isPublished ? (
                        <Badge kind="lime">{isTr ? 'Yayında' : 'Live'}</Badge>
                      ) : (
                        <Badge kind="ghost" dot={false}>{isTr ? 'Taslak' : 'Draft'}</Badge>
                      )}
                      {!row.isActive && <Badge kind="warn">{isTr ? 'Pasif' : 'Inactive'}</Badge>}
                    </div>
                    <p className="mt-1.5 text-[13px] text-[#737373]">
                      {!listRestaurantId && multiBusiness && (
                        <span className="font-medium text-[#525252]">
                          {row.restaurant.name} ·{' '}
                        </span>
                      )}
                      {meta}
                    </p>
                  </div>

                  <div className="relative z-10 flex shrink-0 items-center gap-2">
                    {row.isPublished ? (
                      <button
                        type="button"
                        onClick={() => void handleCopy(row)}
                        className="bz-btn-ghost min-h-11 gap-2 sm:min-h-9"
                      >
                        {copied ? (
                          <Check size={14} aria-hidden="true" />
                        ) : (
                          <Link2 size={14} aria-hidden="true" />
                        )}
                        {copied
                          ? isTr
                            ? 'Kopyalandı'
                            : 'Copied'
                          : isTr
                            ? 'Linki kopyala'
                            : 'Copy link'}
                      </button>
                    ) : canWrite ? (
                      <button
                        type="button"
                        onClick={() => void setPublished(row, true)}
                        disabled={busy || rowOff}
                        title={rowOff ? moduleOffMessage(row.restaurant.name) : undefined}
                        className="bz-btn-primary min-h-11 gap-2 sm:min-h-9"
                      >
                        {busy ? (
                          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                        ) : (
                          <Eye size={14} aria-hidden="true" />
                        )}
                        {isTr ? 'Yayınla' : 'Publish'}
                      </button>
                    ) : null}

                    <PulseMenu
                      trigger={
                        <button
                          type="button"
                          aria-label={
                            isTr
                              ? `${row.title} için diğer işlemler`
                              : `More actions for ${row.title}`
                          }
                          className="bz-btn-icon h-11 w-11 border border-pn-line sm:h-9 sm:w-9"
                        >
                          <MoreHorizontal size={18} aria-hidden="true" />
                        </button>
                      }
                      className={`min-w-[220px] ${MENU_TOUCH}`}
                    >
                      <PulseMenuItem
                        icon={<BarChart3 size={14} />}
                        onSelect={() => router.push(detailHref(row.id, 'results'))}
                      >
                        {isTr ? 'Sonuçları aç' : 'Open results'}
                      </PulseMenuItem>
                      {canWrite && (
                        <>
                          <PulseMenuItem
                            icon={<Pencil size={14} />}
                            onSelect={() =>
                              router.push(`/${locale}/dashboard/surveys/${row.id}/edit`)
                            }
                          >
                            {isTr ? 'Düzenle' : 'Edit'}
                          </PulseMenuItem>
                          <PulseMenuItem
                            icon={<Copy size={14} />}
                            disabled={rowOff || busy}
                            onSelect={() => void handleDuplicate(row)}
                          >
                            {isTr ? 'Kopyasını oluştur' : 'Duplicate'}
                          </PulseMenuItem>
                          {/* A draft's "Publish" is the card's own button. */}
                          {row.isPublished && (
                            <PulseMenuItem
                              icon={<EyeOff size={14} />}
                              disabled={busy}
                              onSelect={() => void setPublished(row, false)}
                            >
                              {isTr ? 'Yayından kaldır' : 'Unpublish'}
                            </PulseMenuItem>
                          )}
                          <PulseMenuDivider />
                          <PulseMenuItem
                            icon={<Trash2 size={14} />}
                            danger
                            disabled={busy}
                            onSelect={() => askDelete(row)}
                          >
                            {isTr ? 'Sil' : 'Delete'}
                          </PulseMenuItem>
                        </>
                      )}
                    </PulseMenu>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Screen-reader announcement for "link copied". */}
      <span className="sr-only" role="status" aria-live="polite">
        {copiedId ? (isTr ? 'Link kopyalandı' : 'Link copied') : ''}
      </span>
      {confirmEl}
    </div>
  );
}

/** Three stacked card placeholders; the card chrome matches the real list. */
function SurveyCardsSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bz-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5"
        >
          <div className="min-w-0 flex-1 space-y-2.5">
            <SkBox className="h-5 w-64 max-w-full" />
            <SkBox className="h-3.5 w-72 max-w-full" />
          </div>
          <div className="flex items-center gap-2">
            <SkBox className="h-11 w-36 sm:h-9" />
            <SkBox className="h-11 w-11 sm:h-9 sm:w-9" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Nothing created yet. An owner gets three ready-made templates for the
 * business's sector (one tap opens the editor with the questions filled in);
 * a viewer just sees that there is nothing yet.
 */
function EmptyStart({
  locale,
  canWrite,
  moduleOff,
  targetRestaurant,
  businessQuery,
  newBase,
}: {
  locale: Locale;
  canWrite: boolean;
  moduleOff: boolean;
  targetRestaurant: RestaurantOption | null;
  businessQuery: string;
  newBase: string;
}) {
  const isTr = locale === 'tr';

  if (!canWrite || moduleOff) {
    return (
      <EmptyState
        icon={<ClipboardList size={20} />}
        title={isTr ? 'Henüz anket yok' : 'No surveys yet'}
        body={
          canWrite
            ? isTr
              ? 'Anket modülü açıldığında şablonlardan birini seçip başlayabilirsin.'
              : 'Once the Surveys module is turned on you can start from a template.'
            : isTr
              ? 'Bu işletmede henüz anket yok.'
              : 'This business has no surveys yet.'
        }
      />
    );
  }

  const sector = detectSector(targetRestaurant?.category);
  // "Other" says nothing useful, so only a recognised sector is named.
  const sectorLabel =
    sector === 'other' ? undefined : SECTORS.find((s) => s.sectorKey === sector)?.display[locale];
  const suggested = templatesForSector(sector).slice(0, 3);
  const withTemplate = (id: SurveyTemplate['id'] | 'blank') =>
    `${newBase}?template=${id}${businessQuery ? `&${businessQuery}` : ''}`;

  return (
    <section className="bz-card p-5 sm:p-7">
      <div className="max-w-[640px]">
        <h2 className="bz-h-tight text-[22px]">
          {isTr ? 'İlk anketini birkaç tıkla kur' : 'Set up your first survey in a few clicks'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#525252]">
          {isTr
            ? 'Hazır bir şablon seç, istersen sorularını düzenle; QR kodunu indirip masana koy.'
            : 'Pick a ready-made template, tweak the questions if you like, then download the QR code and place it where customers will see it.'}
        </p>
        {sectorLabel && (
          <p className="mt-3 inline-flex items-center rounded-full border border-pn-line bg-pn-canvas px-3 py-1 text-xs font-medium text-[#525252]">
            {isTr ? 'Senin için önerilenler' : 'Recommended for you'} · {sectorLabel}
          </p>
        )}
      </div>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {suggested.map((template) => {
          const Icon = TEMPLATE_ICONS[template.icon] ?? Sparkles;
          const count = template.questions.length;
          return (
            <li key={template.id}>
              <Link
                href={withTemplate(template.id)}
                className="group flex h-full min-h-[44px] flex-col gap-2 rounded-[20px] border border-pn-line bg-white p-4 transition-colors hover:border-pn-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pn-ink"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-pn-accent-soft text-pn-ink"
                >
                  <Icon size={18} />
                </span>
                <span className="bz-h-tight text-[15px]">{template.title[locale]}</span>
                <span className="text-[13px] leading-snug text-[#525252]">
                  {template.description[locale]}
                </span>
                <span className="mt-auto pt-1 text-xs text-[#737373]">
                  {isTr ? `${count} soru` : `${count} ${count === 1 ? 'question' : 'questions'}`} ·{' '}
                  {formatSurveyDuration(estimateSurveySeconds(count), locale)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-4">
        {/* Opens the editor with no questions; "New survey" above opens
            every template. */}
        <Link
          href={withTemplate('blank')}
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-[#525252] underline underline-offset-4 hover:text-pn-ink"
        >
          {isTr ? 'Boş anketle başla' : 'Start from blank'}
        </Link>
      </p>
    </section>
  );
}
