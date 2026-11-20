'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, FolderPlus, PanelRightOpen, Plus, Search, Undo2, X } from 'lucide-react';
import { PulseMenu, PulseMenuItem } from '@/components/ui';
import { useMenuCopy } from '../kit/useMenuCopy';
import type { MenuFilter } from '../menu-filter';
import { MENU_TOUCH, afterMenuCloses } from '../menu-ui';
import { FilterChips } from '../outline/FilterChips';
import { ModeSwitch } from './ModeSwitch';
import { ViewSwitch, type StudioView } from './ViewSwitch';

/**
 * The studio toolbar (spec §7.6).
 * - ≥1024: sticky under the topbar, two rows (chunk 2 has no category rail, so
 *   the category chips keep row 2 at every desktop width): search · filters ·
 *   SaveIndicator · Undo / categories · Düzenle|Servis · + Ekle.
 * - <1024: not sticky — ViewSwitch, search, filter chips (the phone chip bar
 *   with "● Canlı" is separate and sticky).
 * "Seç" and "Sırala" arrive with selection / reorder (chunk 3).
 */
export function StudioToolbar({
  query, onQuery, filter, onFilter, counts, saveIndicator, canUndo, onUndo, mode, onMode, view, onView,
  previewCollapsed, onShowPreview, categoryChips, onAdd, readOnly, showSearch,
}: {
  query: string;
  onQuery: (q: string) => void;
  filter: MenuFilter;
  onFilter: (f: MenuFilter) => void;
  counts: Record<Exclude<MenuFilter, 'all'>, number>;
  saveIndicator: ReactNode;
  canUndo: boolean;
  onUndo: () => void;
  mode: 'edit' | 'service';
  onMode: (m: 'edit' | 'service') => void;
  view: StudioView;
  onView: (v: StudioView) => void;
  previewCollapsed: boolean;
  onShowPreview: () => void;
  categoryChips: ReactNode;
  onAdd: { item: () => void; category: () => void; paste?: () => void };
  readOnly: boolean;
  /** False while the phone "Önizle" view is on. */
  showSearch: boolean;
}) {
  const copy = useMenuCopy();
  const sentinel = useRef<HTMLDivElement | null>(null);
  const [stuck, setStuck] = useState(false);
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), { rootMargin: '-57px 0px 0px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const search = (className: string, inputClass: string) => (
    <div className={`relative ${className}`}>
      <Search size={15} strokeWidth={2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]" aria-hidden="true" />
      <input
        id="menu-search"
        type="search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && query) {
            e.preventDefault();
            e.stopPropagation();
            onQuery('');
          }
        }}
        placeholder={copy.outline.searchPlaceholder}
        aria-label={copy.outline.searchLabel}
        enterKeyHint="search"
        autoComplete="off"
        className={`bz-input pl-9 pr-8 [&::-webkit-search-cancel-button]:hidden ${inputClass}`}
      />
      {query ? (
        <button
          type="button"
          onClick={() => onQuery('')}
          aria-label={copy.outline.clearSearch}
          className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#737373] hover:text-[#0A0A0A]"
        >
          <X size={14} strokeWidth={2} />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-[#E5E5E5] bg-[#FAFAFA] px-1.5 font-mono text-[12px] text-[#737373] pointer-fine:inline" aria-hidden="true">
          /
        </kbd>
      )}
    </div>
  );

  const addMenu = (
    <PulseMenu
      className={`min-w-[220px] ${MENU_TOUCH}`}
      trigger={
        <button type="button" disabled={readOnly} className="bz-btn-primary h-[34px] min-h-0 shrink-0 px-3.5">
          <Plus size={14} strokeWidth={2.25} aria-hidden="true" />
          {copy.toolbar.add}
          <ChevronDown size={13} strokeWidth={2} aria-hidden="true" />
        </button>
      }
    >
      <PulseMenuItem icon={<Plus size={13} strokeWidth={2} />} trailing="N" onSelect={() => afterMenuCloses(onAdd.item)}>
        {copy.toolbar.addItem}
      </PulseMenuItem>
      <PulseMenuItem icon={<FolderPlus size={13} strokeWidth={2} />} trailing="⇧N" onSelect={() => afterMenuCloses(onAdd.category)}>
        {copy.toolbar.addCategory}
      </PulseMenuItem>
      {onAdd.paste && (
        <PulseMenuItem onSelect={() => afterMenuCloses(onAdd.paste!)}>{copy.toolbar.pasteList}</PulseMenuItem>
      )}
    </PulseMenu>
  );

  return (
    <>
      {/* ≥1024 */}
      <div ref={sentinel} className="hidden h-px lg:block" aria-hidden="true" />
      <div
        data-stuck={stuck}
        className="-mx-4 hidden bg-[#FAFAFA]/95 px-4 backdrop-blur data-[stuck=true]:border-b data-[stuck=true]:border-[#EDEDED] sm:-mx-7 sm:px-7 lg:sticky lg:top-14 lg:z-20 lg:!mt-0 lg:block"
      >
        <div className="flex h-14 items-center gap-2">
          {search('w-[240px] shrink-0 xl:w-[300px]', 'h-9')}
          <FilterChips value={filter} onChange={onFilter} counts={counts} className="flex-1" />
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {saveIndicator}
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              aria-label={isMac ? copy.toolbar.undoTip : copy.toolbar.undoTipCtrl}
              title={isMac ? copy.toolbar.undoTip : copy.toolbar.undoTipCtrl}
              aria-keyshortcuts="Meta+Z Control+Z"
              className="bz-btn-icon h-9 w-9 disabled:opacity-30"
            >
              <Undo2 size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
        <div className="flex h-14 items-center gap-2">
          <div className="min-w-0 flex-1">{categoryChips}</div>
          <ModeSwitch value={mode} onChange={onMode} />
          {addMenu}
          {previewCollapsed && (
            <button type="button" onClick={onShowPreview} className="bz-btn-ghost h-9 min-h-0 shrink-0">
              <PanelRightOpen size={14} strokeWidth={2} aria-hidden="true" />
              {copy.toolbar.showPreview}
            </button>
          )}
        </div>
      </div>

      {/* <1024 */}
      <div id="menu-view-anchor" className="space-y-3 lg:hidden">
        <ViewSwitch value={view} onChange={onView} />
        {showSearch && (
          <>
            <div className="flex flex-wrap items-center gap-2">{search('min-w-0 flex-1 sm:w-[280px] sm:flex-none', 'h-11')}</div>
            <FilterChips value={filter} onChange={onFilter} counts={counts} />
          </>
        )}
      </div>
    </>
  );
}
