'use client';

// Business (franchise) switcher for the owner shell — sidebar, collapsed
// sidebar, desktop topbar and mobile topbar all use this one component.
//
// - Search box for 5+ businesses, "Son kullanılanlar" group for 6+.
// - Combobox keyboard model: focus stays in the search field (or the list
//   when there is no search), ↑/↓ move, Enter picks, Esc closes.
// - The panel is portaled to <body> with fixed positioning, so it also opens
//   from the collapsed 68px sidebar (the old in-sidebar dropdown could not).
//   Below 640px it docks as a bottom sheet (`.bz-menu--sheet`).
// - Footer links to the business list ("İşletmeleri yönet") and, for
//   owners, to "Yeni işletme".

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { readableOn } from '@/lib/audits/kind';
import Link from 'next/link';
import { Building2, Check, ChevronDown, ChevronsUpDown, Plus, Search, Store } from 'lucide-react';
import {
  groupSwitcherBusinesses,
  parseRecentBusinesses,
  pushRecentBusiness,
  RECENT_BUSINESS_STORAGE_KEY,
  SWITCHER_SEARCH_MIN,
} from '@/lib/business-switcher';

export interface SwitcherBusiness {
  id: string;
  name: string;
  slug?: string | null;
  category: string;
  primaryColor?: string | null;
  isActive?: boolean;
  feedbackCount?: number;
}

export type BusinessSwitcherVariant = 'sidebar' | 'collapsed' | 'topbar' | 'mobile';

interface BusinessSwitcherProps {
  locale: 'tr' | 'en';
  businesses: SwitcherBusiness[];
  activeId: string | null;
  onSelect: (id: string) => void;
  variant: BusinessSwitcherVariant;
  /** Small caption under the name in the sidebar trigger (sector / mode). */
  caption?: string;
  /** Label for a business's sector, shown in the list. */
  categoryLabel: (category: string) => string;
  manageHref: string;
  /** `null` hides "Yeni işletme" (team members cannot create businesses). */
  newHref: string | null;
  onNavigate?: () => void;
  className?: string;
}

const PANEL_WIDTH = 300;

function initialOf(name: string, locale: 'tr' | 'en'): string {
  return name.trim().charAt(0).toLocaleUpperCase(locale === 'tr' ? 'tr-TR' : 'en-US') || '•';
}

function readRecent(): string[] {
  try {
    return parseRecentBusinesses(window.localStorage.getItem(RECENT_BUSINESS_STORAGE_KEY));
  } catch {
    return [];
  }
}

function writeRecent(ids: string[]) {
  try {
    window.localStorage.setItem(RECENT_BUSINESS_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* storage blocked — recents are a convenience only */
  }
}

function BusinessChip({
  business,
  size = 28,
  locale,
}: {
  business: Pick<SwitcherBusiness, 'name' | 'primaryColor'> | null;
  size?: number;
  locale: 'tr' | 'en';
}) {
  // The business colour is owner data; the initial picks ink or white,
  // whichever reads better on it (white on the black fallback).
  const fill = business?.primaryColor || '#111110';
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full text-[12px] font-medium"
      style={{ width: size, height: size, background: fill, color: readableOn(fill) }}
    >
      {business ? initialOf(business.name, locale) : <Building2 size={14} strokeWidth={2} />}
    </span>
  );
}

export function BusinessSwitcher({
  locale,
  businesses,
  activeId,
  onSelect,
  variant,
  caption,
  categoryLabel,
  manageHref,
  newHref,
  onNavigate,
  className = '',
}: BusinessSwitcherProps) {
  const isTr = locale === 'tr';
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [position, setPosition] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const active = businesses.find((business) => business.id === activeId) ?? null;
  const showSearch = businesses.length >= SWITCHER_SEARCH_MIN;
  const groups = useMemo(() => groupSwitcherBusinesses(businesses, query, recent), [businesses, query, recent]);
  const flat = useMemo(() => [...groups.recent, ...groups.all], [groups]);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const width = Math.min(PANEL_WIDTH, vw - 16);
    if (variant === 'collapsed') {
      setPosition({ position: 'fixed', top: rect.top, left: rect.right + 8, width });
    } else if (variant === 'sidebar') {
      setPosition({ position: 'fixed', top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, width) });
    } else {
      setPosition({ position: 'fixed', top: rect.bottom + 6, left: Math.max(8, rect.right - width), width });
    }
  }, [variant]);

  const openPanel = () => {
    setRecent(readRecent());
    setQuery('');
    place();
    setOpen(true);
  };

  const closePanel = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  // Highlight the active business when the panel opens / the list changes.
  useLayoutEffect(() => {
    if (!open) return;
    const index = flat.findIndex((business) => business.id === activeId);
    setHighlight(query ? 0 : Math.max(0, index));
  }, [open, flat, activeId, query]);

  // Focus the search field (desktop) or the list on open.
  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      const wide = window.matchMedia('(min-width: 640px)').matches;
      if (showSearch && wide) searchRef.current?.focus();
      else listRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, showSearch]);

  // Outside click + resize close the panel.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      closePanel(false);
    };
    const onResize = () => closePanel(false);
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('resize', onResize);
    };
  }, [open, closePanel]);

  // Keep the highlighted option in view.
  useEffect(() => {
    if (!open) return;
    const node = document.getElementById(`${listId}-opt-${highlight}`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [open, highlight, listId]);

  const choose = (id: string) => {
    const next = pushRecentBusiness(readRecent(), id);
    writeRecent(next);
    setRecent(next);
    closePanel();
    if (id !== activeId) onSelect(id);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePanel();
      return;
    }
    if (flat.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((value) => (value + 1) % flat.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((value) => (value - 1 + flat.length) % flat.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setHighlight(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setHighlight(flat.length - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const business = flat[highlight];
      if (business) choose(business.id);
    }
  };

  const label = isTr ? 'İşletme değiştir' : 'Switch business';
  const activeName = active?.name ?? (isTr ? 'İşletme seç' : 'Choose business');

  let trigger: React.ReactNode;
  if (variant === 'collapsed') {
    trigger = (
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? closePanel(false) : openPanel())}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${activeName}`}
        title={activeName}
        className={`pn-icon-btn mx-auto ${className}`}
      >
        <BusinessChip business={active} size={26} locale={locale} />
      </button>
    );
  } else if (variant === 'sidebar') {
    trigger = (
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? closePanel(false) : openPanel())}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${activeName}`}
        className={`flex w-full items-center gap-3 rounded-[24px] border border-pn-line bg-white py-2.5 pl-2.5 pr-4 text-left transition-colors hover:bg-pn-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-ink ${className}`}
      >
        <BusinessChip business={active} size={40} locale={locale} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium leading-tight text-pn-ink">{activeName}</span>
          {caption && <span className="mt-0.5 block truncate text-[13px] text-[#9A9A9A]">{caption}</span>}
        </span>
        <ChevronsUpDown size={16} className="shrink-0 text-[#737373]" aria-hidden="true" />
      </button>
    );
  } else {
    trigger = (
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? closePanel(false) : openPanel())}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${activeName}`}
        className={`pn-select-pill !pl-2 ${
          variant === 'mobile' ? 'max-w-[150px]' : 'max-w-[150px] xl:max-w-[240px]'
        } ${className}`}
      >
        <BusinessChip business={active} size={30} locale={locale} />
        <span className="min-w-0 truncate">{activeName}</span>
        <ChevronDown size={16} className="shrink-0 text-[#737373]" aria-hidden="true" />
      </button>
    );
  }

  const renderOption = (business: SwitcherBusiness, index: number) => {
    const selected = business.id === activeId;
    const highlighted = index === highlight;
    const meta = [
      categoryLabel(business.category),
      typeof business.feedbackCount === 'number'
        ? `${business.feedbackCount.toLocaleString(isTr ? 'tr-TR' : 'en-US')} ${isTr ? 'yorum' : 'reviews'}`
        : null,
    ]
      .filter(Boolean)
      .join(' · ');
    return (
      <div
        key={business.id}
        id={`${listId}-opt-${index}`}
        role="option"
        aria-selected={selected}
        onPointerMove={() => setHighlight(index)}
        onClick={() => choose(business.id)}
        className={`bz-menu-item cursor-pointer ${selected ? 'is-selected' : ''} ${highlighted ? 'bg-pn-canvas' : ''}`}
      >
        <BusinessChip business={business} locale={locale} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-pn-ink">{business.name}</span>
          <span className="mt-0.5 block truncate text-[12px] text-[#737373]">{meta}</span>
        </span>
        {business.isActive === false && (
          <span className="shrink-0 rounded-[10px] bg-[#FEF2F2] px-1.5 py-0.5 text-[12px] font-medium text-[#991B1B]">
            {isTr ? 'Duraklatıldı' : 'Paused'}
          </span>
        )}
        {selected && <Check size={14} strokeWidth={2.4} className="shrink-0 !text-pn-ink" aria-hidden="true" />}
      </div>
    );
  };

  const panel = open ? (
    <>
      <div className="bz-menu-backdrop" aria-hidden="true" onClick={() => closePanel(false)} />
      <div
        ref={panelRef}
        className="bz-menu bz-menu--sheet z-[80] flex flex-col !overflow-hidden !p-0"
        style={position}
        onKeyDown={onKeyDown}
      >
        {showSearch && (
          <div className="flex items-center gap-2 border-b border-pn-line px-3 py-2">
            <Search size={14} className="shrink-0 text-[#737373]" aria-hidden="true" />
            <input
              ref={searchRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={flat.length ? `${listId}-opt-${highlight}` : undefined}
              aria-label={isTr ? 'İşletme ara' : 'Search businesses'}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={isTr ? 'İşletme ara…' : 'Search businesses…'}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              className="h-8 min-w-0 flex-1 bg-transparent text-[16px] text-pn-ink outline-none placeholder:text-[#A3A3A3] sm:text-[13px]"
            />
            <span className="shrink-0 rounded border border-pn-line-strong px-1.5 py-px text-[12px] text-[#737373]">
              {businesses.length}
            </span>
          </div>
        )}
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={showSearch ? -1 : 0}
          aria-label={label}
          aria-activedescendant={!showSearch && flat.length ? `${listId}-opt-${highlight}` : undefined}
          className="min-h-0 flex-1 overflow-y-auto p-1 outline-none"
          style={{ maxHeight: 'min(360px, 60vh)' }}
        >
          {flat.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-[#737373]">
              {isTr ? 'Bu aramayla eşleşen işletme yok.' : 'No business matches this search.'}
            </p>
          ) : (
            <>
              {groups.recent.length > 0 && (
                <div role="group" aria-label={isTr ? 'Son kullanılanlar' : 'Recently used'}>
                  <span className="bz-menu-label" aria-hidden="true">
                    {isTr ? 'Son kullanılanlar' : 'Recently used'}
                  </span>
                  {groups.recent.map((business, index) => renderOption(business, index))}
                </div>
              )}
              <div role="group" aria-label={isTr ? 'Tüm işletmeler' : 'All businesses'}>
                {groups.recent.length > 0 && (
                  <span className="bz-menu-label" aria-hidden="true">
                    {isTr ? 'Tüm işletmeler' : 'All businesses'}
                  </span>
                )}
                {groups.all.map((business, index) => renderOption(business, groups.recent.length + index))}
              </div>
            </>
          )}
        </div>
        <div className="border-t border-pn-line p-1">
          <Link
            href={manageHref}
            onClick={() => {
              closePanel(false);
              onNavigate?.();
            }}
            className="bz-menu-item"
          >
            <Store size={15} aria-hidden="true" />
            {isTr ? 'İşletmeleri yönet' : 'Manage businesses'}
          </Link>
          {newHref && (
            <Link
              href={newHref}
              onClick={() => {
                closePanel(false);
                onNavigate?.();
              }}
              className="bz-menu-item"
            >
              <Plus size={15} aria-hidden="true" />
              {isTr ? 'Yeni işletme ekle' : 'Add a business'}
            </Link>
          )}
        </div>
      </div>
    </>
  ) : null;

  return (
    <>
      {trigger}
      {mounted && panel ? createPortal(panel, document.body) : null}
    </>
  );
}

export default BusinessSwitcher;
