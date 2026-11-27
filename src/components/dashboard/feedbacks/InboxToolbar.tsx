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
 * Fintora layout: the toolbar sits on the grey canvas — white pills
 * (status tabs, search, icon buttons; grey on phones where the page is
 * white), the active tab black with white text. No borders.
 *
 * Mobile: sticky under the 72px shell bar. lg+: static (the panes below
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
  /**
   * `inline` (default): md+ shows the selects and toggles in the toolbar.
   * `button`: every width shows one "Filtreler" button with a count that
   * opens the filter sheet (`onOpenAllFilters`) — the toolbar stays two
   * rows: [leading · search · Filtreler] then the status tabs.
   */
  filtersMode?: 'inline' | 'button';
  /** `button` mode: left of the search row (owner: review source switch). */
  leading?: ReactNode;
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
      className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-pn-accent px-1.5 text-[12px] font-medium leading-none text-white"
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
  filtersMode = 'inline',
  leading,
  className = '',
}: InboxToolbarProps) {
  const activeLabel = (n: number) =>
    isTr ? `${n} aktif filtre` : `${n} active ${n === 1 ? 'filter' : 'filters'}`;

  if (filtersMode === 'button') {
    return (
      <div
        className={`sticky top-[72px] z-20 bg-pn-canvas/95 px-4 py-3 backdrop-blur max-sm:bg-white/95 sm:px-6 lg:static lg:bg-transparent lg:px-4 lg:pb-3 lg:pt-1 lg:backdrop-blur-none ${className}`}
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          {leading && <div className="flex min-w-0 items-center">{leading}</div>}
          <div className="flex min-w-0 items-center gap-2 md:ml-auto md:w-[min(460px,52%)]">
            <div className="relative min-w-0 flex-1">
              <Search
                size={16}
                strokeWidth={2}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9A9A9A]"
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
                className="h-11 w-full rounded-full border-0 bg-white pl-11 pr-4 text-[16px] text-pn-ink outline-none transition-shadow duration-200 placeholder:text-[#9A9A9A] focus:shadow-[0_0_0_2px_#111110] max-sm:bg-[#F6F6F6] sm:text-[14px] md:h-12"
              />
            </div>
            <button
              type="button"
              onClick={onOpenAllFilters}
              className="relative inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-3 text-[14px] font-medium text-pn-ink transition-colors duration-200 hover:bg-[#EDEDED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-ink active:scale-[.97] max-sm:w-11 max-sm:bg-[#F6F6F6] max-sm:px-0 md:h-12 md:px-4"
              aria-label={
                allFiltersCount > 0
                  ? `${isTr ? 'Filtreler' : 'Filters'} · ${activeLabel(allFiltersCount)}`
                  : isTr
                    ? 'Filtreler'
                    : 'Filters'
              }
            >
              <SlidersHorizontal size={16} strokeWidth={2} aria-hidden="true" />
              <span className="max-sm:hidden">{isTr ? 'Filtreler' : 'Filters'}</span>
              {allFiltersCount > 0 && (
                <span
                  aria-hidden="true"
                  className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-pn-ink px-1.5 text-[12px] font-medium leading-none text-white max-sm:absolute max-sm:-right-0.5 max-sm:-top-0.5 max-sm:ring-2 max-sm:ring-white"
                >
                  {allFiltersCount}
                </span>
              )}
            </button>
            {showClear && (
              <button
                type="button"
                onClick={onClear}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#525252] transition-colors duration-200 hover:text-pn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-ink active:scale-[.97] max-sm:bg-[#F6F6F6] md:h-12 md:w-12"
                aria-label={isTr ? 'Filtreleri temizle' : 'Clear filters'}
                title={isTr ? 'Filtreleri temizle' : 'Clear filters'}
              >
                <RotateCcw size={15} strokeWidth={2} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        <InboxStatusTabs
          tabs={tabs}
          active={activeTab}
          onChange={onTabChange}
          ariaLabel={isTr ? 'Yorum durumu' : 'Review status'}
          controlsId={listId}
          variant="soft"
          className="mt-2"
        />
      </div>
    );
  }

  return (
    <div
      className={`sticky top-[72px] z-20 bg-pn-canvas/95 px-4 py-3 backdrop-blur sm:px-6 lg:static lg:bg-transparent lg:px-4 lg:pb-3 lg:pt-1 lg:backdrop-blur-none ${className}`}
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
            className="hidden h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium text-[#525252] transition-colors duration-200 hover:bg-white hover:text-pn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent active:scale-[.97] md:inline-flex"
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
              size={16}
              strokeWidth={2}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9A9A9A]"
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
              className="h-11 w-full rounded-full border-0 bg-white pl-11 pr-4 text-[16px] text-pn-ink outline-none transition-shadow duration-200 placeholder:text-[#9A9A9A] focus:shadow-[0_0_0_2px_#111110] max-sm:bg-[#F6F6F6] sm:text-[14px] md:h-[46px]"
            />
          </div>

          {/* < md: a single icon button opens the full filter modal. */}
          <button
            type="button"
            onClick={onOpenAllFilters}
            className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-pn-ink transition-colors duration-200 hover:bg-[#EDEDED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent active:scale-[.97] max-sm:bg-[#F6F6F6] md:hidden"
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
                className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-pn-accent px-1 text-[12px] font-medium leading-none text-white ring-2 ring-white"
              >
                {allFiltersCount}
              </span>
            )}
          </button>
          {showClear && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#525252] transition-colors duration-200 hover:text-pn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent active:scale-[.97] max-sm:bg-[#F6F6F6] md:hidden"
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
                  } h-[46px] text-[14px]`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))
            : onOpenMoreFilters && (
                <button
                  type="button"
                  onClick={onOpenMoreFilters}
                  className="bz-btn h-[46px] text-[14px]"
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
