'use client';

import type { ReactNode } from 'react';
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { PulseSelect, type PulseSelectOption } from '@/components/ui';
import { InboxStatusTabs, type InboxTab } from './InboxStatusTabs';
import { INBOX_PLATFORM_FILTER_IDS, platformLabel } from './inbox-format';

/**
 * Single compact toolbar for the review inboxes (owner + admin). Replaces the
 * owner's xl filter rail, the list-header search/tabs strip and the header
 * "Filtre" button — one place owns every filter.
 *
 *   Row 1  status tabs (InboxStatusTabs, horizontally scrollable on mobile)
 *          · [md+] "Temizle / Clear" on the right
 *   Row 2  search · [md+] platform / rating / date selects · state toggles
 *          (or a "more filters" button) · optional right slot
 *          (admin restaurant chip)
 *          [< md] search + one filter icon button (opens the full modal)
 *          + clear icon button
 *
 * The md+ "Temizle" sits in the tabs row (not after the filters) so it never
 * changes the filter row's width: showing it on the first filter click used
 * to wrap the filters to a new line at 1024–1280px and push the list down.
 *
 * Every control applies immediately — no "Apply" step. Touch targets are
 * 44px below md (tabs, search, icon buttons).
 *
 * Mobile: sticky under the 61px shell topbar. lg+: static (the panes below
 * scroll internally).
 */

export interface InboxToolbarProps {
  isTr: boolean;

  tabs: InboxTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  /** id of the list region the tabs filter (`aria-controls`). */
  listId?: string;

  search: string;
  onSearchChange: (value: string) => void;

  platform: string;
  onPlatformChange: (value: string) => void;
  rating: string;
  onRatingChange: (value: string) => void;
  days: string;
  onDaysChange: (value: string) => void;
  /** Rating select options (md+). Defaults to `ratingFilterOptions(isTr)`. */
  ratingOptions?: PulseSelectOption[];

  /**
   * md+: on/off filters shown inline next to the selects (owner:
   * "Yanıtsızlar", "Yalnız işaretliler"). When given, they replace the "more
   * filters" button — a couple of toggles don't need a modal.
   */
  toggles?: InboxToggle[];
  /** Count of the "other" filters (reply state / flagged / assigned) — md+ button badge. */
  moreFiltersCount?: number;
  /** Count of every filter — the < md icon button badge. */
  allFiltersCount: number;
  /** md+: opens the modal in compact mode (other filters only). Ignored when `toggles` is set. */
  onOpenMoreFilters?: () => void;
  /** < md: opens the full modal (date, rating, platform + other filters). */
  onOpenAllFilters: () => void;

  /** Show the "Temizle / Clear" button (any filter or a non-default tab active). */
  showClear: boolean;
  onClear: () => void;

  /** Right-aligned slot on md+ (admin: restaurant deep-link chip). */
  rightSlot?: ReactNode;
  /** Extra classes for the wrapper (e.g. `hidden lg:block` on mobile detail). */
  className?: string;
}

/** An inline on/off filter (md+ toolbar). */
export interface InboxToggle {
  id: string;
  label: string;
  /** Longer description for the tooltip, e.g. "Yalnız yanıtı olmayan yorumlar". */
  title?: string;
  icon?: ReactNode;
  pressed: boolean;
  onToggle: () => void;
  /** Pressed colour: lime (default) or red (flag). */
  tone?: 'lime' | 'danger';
}

export function platformFilterOptions(isTr: boolean): PulseSelectOption[] {
  return [
    { value: 'all', label: isTr ? 'Tüm platformlar' : 'All platforms' },
    ...INBOX_PLATFORM_FILTER_IDS.map((id) => ({ value: id, label: platformLabel(id, isTr) })),
  ];
}

export function ratingFilterOptions(isTr: boolean): PulseSelectOption[] {
  return [
    { value: 'all', label: isTr ? 'Tüm puanlar' : 'All ratings' },
    { value: 'low', label: isTr ? '1–3 ★ düşük' : '1–3 ★ low' },
    { value: 'positive', label: isTr ? '4–5 ★ yüksek' : '4–5 ★ high' },
    { value: '5', label: '5 ★' },
    { value: '4', label: '4 ★' },
    { value: '3', label: '3 ★' },
    { value: '2', label: '2 ★' },
    { value: '1', label: '1 ★' },
  ];
}

export function dateFilterOptions(isTr: boolean): PulseSelectOption[] {
  return [
    { value: 'all', label: isTr ? 'Tüm zamanlar' : 'All time' },
    { value: '1', label: isTr ? 'Bugün' : 'Today' },
    { value: '7', label: isTr ? 'Son 7 gün' : 'Last 7 days' },
    { value: '30', label: isTr ? 'Son 30 gün' : 'Last 30 days' },
  ];
}

function CountBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span
      className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-pn-accent px-1 text-[12px] font-medium leading-none text-white"
      aria-label={label}
    >
      {count}
    </span>
  );
}

export function InboxToolbar({
  isTr,
  tabs,
  activeTab,
  onTabChange,
  listId,
  search,
  onSearchChange,
  platform,
  onPlatformChange,
  rating,
  onRatingChange,
  days,
  onDaysChange,
  ratingOptions,
  toggles,
  moreFiltersCount = 0,
  allFiltersCount,
  onOpenMoreFilters,
  onOpenAllFilters,
  showClear,
  onClear,
  rightSlot,
  className = '',
}: InboxToolbarProps) {
  const activeLabel = (n: number) =>
    isTr ? `${n} aktif filtre` : `${n} active ${n === 1 ? 'filter' : 'filters'}`;

  return (
    <div
      className={`sticky top-[72px] z-20 border-y border-pn-line bg-white/95 px-4 py-3 backdrop-blur sm:px-7 lg:static lg:bg-white lg:backdrop-blur-none ${className}`}
    >
      <div className="flex items-center gap-2">
        <InboxStatusTabs
          tabs={tabs}
          active={activeTab}
          onChange={onTabChange}
          ariaLabel={isTr ? 'Yorum durumu' : 'Review status'}
          controlsId={listId}
          className="min-w-0 flex-1"
        />
        {showClear && (
          <button
            type="button"
            onClick={onClear}
            className="hidden h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-[#525252] transition-colors hover:bg-pn-canvas hover:text-pn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent md:inline-flex"
          >
            <RotateCcw size={13} strokeWidth={2} aria-hidden="true" />
            {isTr ? 'Temizle' : 'Clear'}
          </button>
        )}
      </div>

      <div className="mt-2.5 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <div className="flex items-center gap-2 md:contents">
          {/* md+: the search keeps a 240px basis; when the selects no longer
              fit beside it (md, lg, narrow xl) they wrap to their own line and
              the search takes the full row. Capped at 340px from xl. */}
          <div className="relative min-w-0 flex-1 md:flex-[1_1_240px] xl:max-w-[340px]">
            <Search
              size={15}
              strokeWidth={2}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              enterKeyHint="search"
              autoComplete="off"
              aria-label={isTr ? 'Yorum veya müşteri ara' : 'Search reviews or customers'}
              placeholder={isTr ? 'Yorum veya müşteri ara…' : 'Search reviews or customers…'}
              // Explicit classes, not `bz-input`: the bz-* rules are unlayered,
              // so they would beat `pl-9` / `rounded-full` and the text would
              // run under the search icon.
              className="h-11 w-full rounded-full border border-pn-line bg-white pl-9 pr-3 text-[16px] text-pn-ink outline-none transition-[border-color,box-shadow] placeholder:text-[#A3A3A3] hover:border-pn-line-strong focus:border-pn-ink focus:shadow-[0_0_0_3px_rgba(93,62,188,0.35)] sm:text-[13px] md:h-[34px]"
            />
          </div>

          {/* < md: a single icon button opens the full filter modal. */}
          <button
            type="button"
            onClick={onOpenAllFilters}
            className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-pn-line bg-white text-pn-ink transition-colors hover:border-pn-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent md:hidden"
            aria-label={
              allFiltersCount > 0
                ? `${isTr ? 'Filtreler' : 'Filters'} · ${activeLabel(allFiltersCount)}`
                : isTr
                  ? 'Filtreler'
                  : 'Filters'
            }
          >
            <SlidersHorizontal size={16} strokeWidth={2} aria-hidden="true" />
            {allFiltersCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-pn-accent px-1 text-[12px] font-medium leading-none text-white"
              >
                {allFiltersCount}
              </span>
            )}
          </button>
          {showClear && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#525252] transition-colors hover:bg-pn-canvas hover:text-pn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent md:hidden"
              aria-label={isTr ? 'Filtreleri temizle' : 'Clear filters'}
              title={isTr ? 'Filtreleri temizle' : 'Clear filters'}
            >
              <RotateCcw size={15} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* md+: inline selects. */}
        <div className="hidden md:flex md:flex-wrap md:items-center md:gap-2">
          <PulseSelect
            value={platform}
            onChange={onPlatformChange}
            options={platformFilterOptions(isTr)}
            ariaLabel="Platform"
            className="min-w-[150px]"
          />
          <PulseSelect
            value={rating}
            onChange={onRatingChange}
            options={ratingOptions ?? ratingFilterOptions(isTr)}
            ariaLabel={isTr ? 'Puan' : 'Rating'}
            className="min-w-[150px]"
          />
          <PulseSelect
            value={days}
            onChange={onDaysChange}
            options={dateFilterOptions(isTr)}
            ariaLabel={isTr ? 'Tarih' : 'Date'}
            className="min-w-[150px]"
          />
          {toggles && toggles.length > 0
            ? toggles.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={t.onToggle}
                  aria-pressed={t.pressed}
                  title={t.title}
                  className={`${
                    t.pressed ? (t.tone === 'danger' ? 'bz-btn-danger' : 'bz-btn-lime') : 'bz-btn'
                  } bz-btn-sm h-[34px]`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))
            : onOpenMoreFilters && (
                <button
                  type="button"
                  onClick={onOpenMoreFilters}
                  className="bz-btn bz-btn-sm h-[34px]"
                  aria-label={
                    moreFiltersCount > 0
                      ? `${isTr ? 'Diğer filtreler' : 'More filters'} · ${activeLabel(moreFiltersCount)}`
                      : undefined
                  }
                >
                  <SlidersHorizontal size={13} strokeWidth={2} aria-hidden="true" />
                  {isTr ? 'Diğer filtreler' : 'More filters'}
                  <CountBadge count={moreFiltersCount} label={activeLabel(moreFiltersCount)} />
                </button>
              )}
        </div>

        {rightSlot && <div className="md:ml-auto">{rightSlot}</div>}
      </div>
    </div>
  );
}

export default InboxToolbar;
