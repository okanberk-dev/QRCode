'use client';

import { useEffect, useOptimistic, useRef, useState, useTransition, type FormEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Archive, Loader2, Search, X } from 'lucide-react';
import { PulseSelect, Tabs, type PulseSelectOption } from '@/components/ui';
import type { CustomerSegment } from '@/lib/customers';
import type { Locale } from '@/lib/translations';

/**
 * Customers list toolbar (§49 — one row, filters apply immediately).
 *
 * The layout follows the toolbar's own width (container query), so it also
 * adapts when the shell sidebar is collapsed or expanded:
 *
 *   ≥ 68rem   segment tabs · search · period · archive toggle · clear
 *   ≥ 48rem   search · segment select · period select · archive · clear
 *   ≥ 40rem   search, then segment · period · archive · clear in one row
 *   < 40rem   search, then segment + period selects side by side, then
 *             archive toggle / clear
 *
 * Heights: 44px below lg (touch), 38px on lg+ (pointer). The same breakpoints
 * are used by loading.tsx (§40.10).
 *
 * The page is a server component; every change writes the URL
 * (`router.replace`) and the server re-renders the list. The active business
 * (`?restaurantId`, owned by the shell's business switcher) is carried over
 * untouched. `page` and `detail` are dropped on every filter change so the
 * list starts at page 1 and an open drawer closes.
 *
 * The URL only changes once the server render finishes, so the controls read
 * an optimistic copy of the query string (same pattern as
 * AnalyticsFilterBar): a picked tab / period shows at once, and a second
 * change made while the first is still loading builds on it instead of
 * dropping it.
 */

export type CustomersRangeKey = '7d' | '30d' | '90d' | 'all';

interface CustomersToolbarProps {
  locale: Locale;
  /** Archived customers in the current list (active business + period +
   *  search). 0 → the archive toggle is hidden (nothing to show). */
  archivedCount: number;
  segmentCounts: Record<'all' | CustomerSegment, number>;
}

const DEFAULT_RANGE: CustomersRangeKey = '30d';
const SEARCH_DEBOUNCE_MS = 350;

const SEGMENTS: Array<{ key: 'all' | CustomerSegment; tr: string; en: string }> = [
  { key: 'all', tr: 'Tümü', en: 'All' },
  { key: 'vip', tr: 'VIP', en: 'VIP' },
  { key: 'loyal', tr: 'Düzenli', en: 'Loyal' },
  { key: 'new', tr: 'Yeni', en: 'New' },
  { key: 'risk', tr: 'Risk', en: 'Risk' },
  { key: 'churned', tr: 'Kayıp', en: 'Churned' },
];

const RANGES: Array<{ key: CustomersRangeKey; tr: string; en: string }> = [
  { key: '7d', tr: 'Son 7 gün', en: 'Last 7 days' },
  { key: '30d', tr: 'Son 30 gün', en: 'Last 30 days' },
  { key: '90d', tr: 'Son 90 gün', en: 'Last 90 days' },
  { key: 'all', tr: 'Tüm zamanlar', en: 'All time' },
];

const SEGMENT_KEYS = new Set<string>(SEGMENTS.map((s) => s.key));
const RANGE_KEYS = new Set<string>(RANGES.map((r) => r.key));

export function CustomersToolbar({
  locale,
  archivedCount,
  segmentCounts,
}: CustomersToolbarProps) {
  const isTr = locale === 'tr';
  const intLocale = isTr ? 'tr-TR' : 'en-US';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [urlQuery, setOptimisticUrlQuery] = useOptimistic(searchParams.toString());
  // The debounced search push runs from a timer; it must build on the latest
  // optimistic query, not the one captured when the key was pressed.
  const urlQueryRef = useRef(urlQuery);
  useEffect(() => {
    urlQueryRef.current = urlQuery;
  });

  const current = new URLSearchParams(urlQuery);
  const segmentRaw = (current.get('segment') ?? '').toLowerCase();
  const segment = SEGMENT_KEYS.has(segmentRaw) && segmentRaw !== 'all' ? segmentRaw : 'all';
  const rangeRaw = current.get('range') ?? DEFAULT_RANGE;
  const range = RANGE_KEYS.has(rangeRaw) ? rangeRaw : DEFAULT_RANGE;
  const showArchivedRaw = current.get('showArchived');
  const showArchived = showArchivedRaw === '1' || showArchivedRaw === 'true';
  // Committed search value (what the server filtered on).
  const search = (searchParams.get('search') ?? '').trim();

  // Search is typed locally and pushed to the URL after a short pause.
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [typed, setTyped] = useState(search);
  const lastSentRef = useRef(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Follow URL changes made elsewhere (back/forward, business switch). While
  // the field has focus the user's own text wins, so a slow round-trip never
  // overwrites what they are still typing.
  useEffect(() => {
    if (typeof document !== 'undefined' && document.activeElement === inputRef.current) return;
    lastSentRef.current = search;
    setTyped(search);
  }, [search]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  function navigate(changes: Record<string, string | null>) {
    const next = new URLSearchParams(urlQueryRef.current);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete('page');
    next.delete('detail');
    const qs = next.toString();
    startTransition(() => {
      urlQueryRef.current = qs;
      setOptimisticUrlQuery(qs);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function pushSearch(value: string) {
    const trimmed = value.trim().slice(0, 100);
    if (trimmed === lastSentRef.current) return;
    lastSentRef.current = trimmed;
    navigate({ search: trimmed || null });
  }

  function onQueryChange(value: string) {
    setTyped(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushSearch(value), SEARCH_DEBOUNCE_MS);
  }

  function onSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pushSearch(typed);
  }

  const setSegment = (value: string) =>
    navigate({ segment: value === 'all' ? null : value });
  const setRange = (value: string) =>
    navigate({ range: value === DEFAULT_RANGE ? null : value });
  const toggleArchived = () => navigate({ showArchived: showArchived ? null : '1' });

  const hasFilter = Boolean(
    (current.get('search') ?? '').trim() ||
      segment !== 'all' ||
      range !== DEFAULT_RANGE ||
      showArchived,
  );
  const clearFilters = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    lastSentRef.current = '';
    setTyped('');
    navigate({ search: null, segment: null, range: null, showArchived: null });
  };

  const fmt = (n: number) => n.toLocaleString(intLocale);
  const segmentOptions: PulseSelectOption[] = SEGMENTS.map((s) => ({
    value: s.key,
    label: `${isTr ? s.tr : s.en} (${fmt(segmentCounts[s.key])})`,
  }));
  const rangeOptions: PulseSelectOption[] = RANGES.map((r) => ({
    value: r.key,
    label: isTr ? r.tr : r.en,
  }));

  // The toggle is useless when nothing is archived — unless it is on.
  const showArchiveToggle = archivedCount > 0 || showArchived;

  // On narrow toolbars archive / clear share a two-column row; when only one
  // of them is shown it takes the full row instead of half of it.
  const singleExtra = showArchiveToggle !== hasFilter;
  const extraBtn = `w-full gap-1.5 text-[13px] h-11 min-h-0 lg:h-[38px] @min-[40rem]:w-auto @min-[40rem]:shrink-0 @min-[40rem]:px-3 ${
    singleExtra ? 'col-span-2 @min-[40rem]:col-auto' : ''
  }`;

  return (
    <div className="@container">
      <div
        className="flex flex-col gap-2.5 @min-[48rem]:flex-row @min-[48rem]:items-center @min-[48rem]:gap-2"
        aria-busy={isPending}
      >
        <Tabs
          items={SEGMENTS.map((s) => ({
            id: s.key,
            label: isTr ? s.tr : s.en,
            count: fmt(segmentCounts[s.key]),
          }))}
          active={segment}
          onChange={setSegment}
          ariaLabel={isTr ? 'Müşteri grubu' : 'Customer group'}
          className="hidden shrink-0 @min-[68rem]:inline-flex"
        />

        <form
          role="search"
          onSubmit={onSearchSubmit}
          className="relative min-w-0 @min-[48rem]:min-w-[200px] @min-[48rem]:flex-1"
        >
          <Search
            size={14}
            strokeWidth={2}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]"
          />
          <input
            type="search"
            ref={inputRef}
            value={typed}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={isTr ? 'Ad, e-posta veya telefon' : 'Name, email or phone'}
            aria-label={isTr ? 'Müşteri ara' : 'Search customers'}
            maxLength={100}
            enterKeyHint="search"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="bz-input h-11 w-full py-0 lg:h-[38px]"
            style={{ paddingLeft: 34, paddingRight: 34 }}
          />
          {isPending && (
            <Loader2
              size={14}
              strokeWidth={2}
              aria-label={isTr ? 'Yükleniyor' : 'Loading'}
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#737373]"
            />
          )}
        </form>

        <div className="grid grid-cols-2 gap-2 @min-[40rem]:flex @min-[40rem]:items-center @min-[48rem]:shrink-0">
          <PulseSelect
            value={segment}
            onChange={setSegment}
            options={segmentOptions}
            ariaLabel={isTr ? 'Müşteri grubu' : 'Customer group'}
            className="w-full [&>button]:h-11 lg:[&>button]:h-[38px] @min-[40rem]:w-[190px] @min-[68rem]:hidden"
          />
          <PulseSelect
            value={range}
            onChange={setRange}
            options={rangeOptions}
            ariaLabel={isTr ? 'Dönem' : 'Period'}
            className="w-full [&>button]:h-11 lg:[&>button]:h-[38px] @min-[40rem]:w-[150px]"
          />
          {showArchiveToggle && (
            <button
              type="button"
              onClick={toggleArchived}
              aria-pressed={showArchived}
              title={isTr ? 'Arşivlenen müşterileri de göster' : 'Also show archived customers'}
              className={`${showArchived ? 'bz-btn-primary' : 'bz-btn-ghost'} ${extraBtn}`}
            >
              <Archive size={13} strokeWidth={2} aria-hidden="true" />
              {isTr ? 'Arşiv' : 'Archived'}
              <span className="tabular-nums opacity-70">({fmt(archivedCount)})</span>
            </button>
          )}
          {hasFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className={`bz-btn-ghost ${extraBtn}`}
            >
              <X size={13} strokeWidth={2} aria-hidden="true" />
              {isTr ? 'Temizle' : 'Clear'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CustomersToolbar;
