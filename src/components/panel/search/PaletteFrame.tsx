'use client';

/**
 * Shared chrome for the owner and admin search palettes: the dialog (centred
 * card on desktop, full-screen sheet on phones), the search field, the
 * result list as an ARIA combobox/listbox, grouped rows and the key-hint
 * footer. Each palette owns its data and decides what goes in the list; this
 * file only draws it and handles the keyboard.
 */

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp, CornerDownLeft, Loader2, Search as SearchIcon, SearchX, X } from 'lucide-react';
import { businessAvatarColor, findMatch, initialOf, readableOn } from './search-utils';

export function paletteOptionId(listId: string, index: number): string {
  return `${listId}-opt-${index}`;
}

interface PaletteFrameProps {
  /** Dialog name, e.g. "Panelde ara". */
  label: string;
  listId: string;
  query: string;
  onQueryChange: (value: string) => void;
  placeholder: string;
  loading?: boolean;
  /** Number of selectable rows, in render order. */
  count: number;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSubmit: (index: number) => void;
  onClose: () => void;
  /** Read out after each change, e.g. "12 sonuç". */
  status: string;
  copy: {
    clear: string;
    close: string;
    cancel: string;
    results: string;
    move: string;
    open: string;
  };
  children: ReactNode;
}

const FOCUSABLE = 'input, button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export function PaletteFrame({
  label,
  listId,
  query,
  onQueryChange,
  placeholder,
  loading = false,
  count,
  activeIndex,
  onActiveIndexChange,
  onSubmit,
  onClose,
  status,
  copy,
  children,
}: PaletteFrameProps) {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Focus the field on open, give focus back to the trigger on close, lock
  // the page scroll and play a short entrance (skipped for reduced motion).
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) {
      const phone = window.matchMedia('(max-width: 639.98px)').matches;
      const easing = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
      backdropRef.current?.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing });
      panelRef.current?.animate?.(
        [
          { opacity: 0, transform: phone ? 'translateY(16px)' : 'translateY(8px) scale(0.985)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: phone ? 280 : 240, easing },
      );
    }

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = overflow;
      if (previous && previous.isConnected) previous.focus();
    };
  }, []);

  // Keep the active row in view while moving with the arrow keys.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (count === 0) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      onActiveIndexChange((activeIndex + step + count) % count);
      return;
    }
    if (e.key === 'Enter') {
      // Ignore the Enter that confirms an IME composition.
      if (e.nativeEvent.isComposing || e.target !== inputRef.current) return;
      e.preventDefault();
      if (count > 0) onSubmit(Math.min(activeIndex, count - 1));
      return;
    }
    if (e.key === 'Tab') {
      // Keep Tab inside the dialog.
      const nodes = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (node) => node.offsetParent !== null,
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const activeId = count > 0 ? paletteOptionId(listId, Math.min(activeIndex, count - 1)) : undefined;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[60] flex justify-center bg-[rgba(17,17,16,0.32)] sm:items-start sm:px-4 sm:pt-[12vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex h-dvh w-full flex-col overflow-hidden bg-white sm:h-auto sm:max-h-[min(680px,84dvh)] sm:max-w-[640px] sm:rounded-[28px] sm:shadow-[0_32px_80px_-28px_rgba(17,17,16,0.32),0_2px_8px_rgba(17,17,16,0.04)]"
      >
        <div className="flex shrink-0 items-center gap-1 px-3 pb-2 pt-[max(12px,env(safe-area-inset-top))] sm:gap-2 sm:p-3">
          <label className="flex h-[52px] min-w-0 flex-1 items-center gap-3 rounded-full bg-pn-canvas pl-4 pr-1 transition-shadow duration-200 focus-within:shadow-[inset_0_0_0_1.5px_var(--color-pn-accent)] sm:pl-5">
            {loading ? (
              <Loader2 size={19} className="shrink-0 animate-spin text-[#737373]" aria-hidden="true" />
            ) : (
              <SearchIcon size={19} className="shrink-0 text-[#737373]" aria-hidden="true" />
            )}
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              aria-label={label}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={placeholder}
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent text-[16px] text-pn-ink outline-none placeholder:text-[#9A9A9A] sm:text-[15px]"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  onQueryChange('');
                  inputRef.current?.focus();
                }}
                aria-label={copy.clear}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#737373] outline-none hover:text-pn-ink focus-visible:shadow-[0_0_0_2px_var(--color-pn-accent)]"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#E4E4E4]">
                  <X size={13} strokeWidth={2.25} aria-hidden="true" />
                </span>
              </button>
            )}
          </label>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full px-3 text-[15px] font-medium text-pn-ink outline-none transition-colors duration-200 hover:bg-pn-canvas focus-visible:shadow-[0_0_0_2px_var(--color-pn-accent)] sm:h-[52px] sm:px-2"
          >
            {/* Phones: a "Vazgeç" text button (iOS search pattern). Desktop:
                the esc key chip, named "esc Kapat" for screen readers. */}
            <span className="sm:hidden">{copy.cancel}</span>
            <span className="hidden h-7 items-center rounded-full bg-pn-canvas px-2.5 text-[12px] font-medium text-[#737373] sm:inline-flex">
              esc
            </span>
            <span className="hidden sm:sr-only sm:inline">{copy.close}</span>
          </button>
        </div>

        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={copy.results}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(12px,env(safe-area-inset-bottom))] sm:max-h-[min(520px,62dvh)] sm:pb-2"
        >
          {children}
        </div>
        <p className="sr-only" aria-live="polite">
          {status}
        </p>

        <div className="hidden shrink-0 items-center gap-5 border-t border-pn-line px-5 py-3 text-[12px] text-[#737373] sm:flex">
          <span className="inline-flex items-center gap-1.5">
            <KeyChip>
              <ArrowUp size={11} aria-hidden="true" />
            </KeyChip>
            <KeyChip>
              <ArrowDown size={11} aria-hidden="true" />
            </KeyChip>
            {copy.move}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <KeyChip>
              <CornerDownLeft size={11} aria-hidden="true" />
            </KeyChip>
            {copy.open}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <KeyChip>esc</KeyChip>
            {copy.close}
          </span>
        </div>
      </div>
    </div>
  );
}

export function KeyChip({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-pn-canvas px-1.5 [font-family:inherit] text-[12px] font-medium text-[#525252]">
      {children}
    </kbd>
  );
}

export function PaletteGroup({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  const headId = useId();
  return (
    <div role="group" aria-labelledby={headId} className="pt-2 first:pt-1">
      <div className="flex min-h-8 items-center justify-between gap-3 px-3 pb-1">
        <span id={headId} className="text-[13px] font-medium text-[#737373]">
          {title}
          {count !== undefined && <span className="ml-1.5 tabular-nums text-[#9A9A9A]">{count}</span>}
        </span>
        {action}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function PaletteOption({
  listId,
  index,
  active,
  onHover,
  onSelect,
  leading,
  primary,
  secondary,
  trailing,
}: {
  listId: string;
  index: number;
  active: boolean;
  onHover: (index: number) => void;
  onSelect: () => void;
  leading: ReactNode;
  primary: ReactNode;
  secondary?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div
      id={paletteOptionId(listId, index)}
      role="option"
      aria-selected={active}
      data-index={index}
      // mousemove (not mouseenter) so a list scrolling under a still pointer
      // does not steal the keyboard selection.
      onMouseMove={() => {
        if (!active) onHover(index);
      }}
      onClick={onSelect}
      className="group flex min-h-[56px] cursor-pointer select-none items-center gap-3 rounded-[18px] px-2.5 py-2 transition-colors duration-150 aria-selected:bg-pn-canvas"
    >
      {leading}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium leading-5 text-pn-ink">{primary}</div>
        {secondary && <div className="mt-0.5 truncate text-[13px] leading-[18px] text-[#737373]">{secondary}</div>}
      </div>
      {trailing && <div className="shrink-0 text-[12px] tabular-nums text-[#9A9A9A]">{trailing}</div>}
      <span
        aria-hidden="true"
        className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[#737373] sm:group-aria-selected:inline-flex"
      >
        <CornerDownLeft size={12} />
      </span>
    </div>
  );
}

/** Round icon that turns purple with a white glyph on the active row. */
export function PaletteIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pn-canvas text-pn-ink transition-colors duration-200 group-aria-selected:bg-pn-accent group-aria-selected:text-white">
      <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
    </span>
  );
}

/**
 * Initial avatar. A business colour the owner chose is kept as is (readable
 * text picked automatically); without one it behaves like PaletteIcon.
 */
export function PaletteAvatar({ name, color }: { name: string | null | undefined; color?: string | null }) {
  const fill = businessAvatarColor(color);
  if (fill) {
    return (
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-medium transition-shadow duration-200 group-aria-selected:shadow-[0_0_0_2px_#FFFFFF,0_0_0_4px_var(--color-pn-accent)]"
        style={{ backgroundColor: fill, color: readableOn(fill) }}
      >
        {initialOf(name)}
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EFEAFB] text-[15px] font-medium text-pn-ink transition-colors duration-200 group-aria-selected:bg-pn-accent group-aria-selected:text-white"
    >
      {initialOf(name)}
    </span>
  );
}

/** Text with the matched part marked in a soft lavender. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const match = findMatch(text, query);
  if (!match) return <>{text}</>;
  return (
    <>
      {text.slice(0, match[0])}
      <mark className="rounded-[4px] bg-[#EFEAFB] text-inherit shadow-[0_0_0_1.5px_#EFEAFB] group-aria-selected:bg-[#DCD3F6] group-aria-selected:shadow-[0_0_0_1.5px_#DCD3F6]">
        {text.slice(match[0], match[1])}
      </mark>
      {text.slice(match[1])}
    </>
  );
}

export function PaletteStars({ rating, label }: { rating: number; label: string }) {
  const value = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span role="img" aria-label={label} className="inline-flex shrink-0 items-center gap-px align-[-1px]">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
          <path
            d="M6 .9l1.55 3.2 3.5.48-2.55 2.43.63 3.48L6 8.83 2.87 10.5l.63-3.48L.95 4.58l3.5-.48z"
            fill={n <= value ? 'var(--color-pn-accent)' : '#DCD3F6'}
          />
        </svg>
      ))}
    </span>
  );
}

export function PaletteSkeletonRow() {
  return (
    <div aria-hidden="true" className="flex min-h-[56px] items-center gap-3 px-2.5 py-2">
      <span className="h-10 w-10 shrink-0 rounded-full bg-pn-canvas motion-safe:animate-pulse" />
      <span className="flex-1 space-y-2">
        <span className="block h-3 w-2/5 rounded-full bg-pn-canvas motion-safe:animate-pulse" />
        <span className="block h-3 w-4/5 rounded-full bg-pn-canvas motion-safe:animate-pulse" />
      </span>
    </div>
  );
}

export function PaletteEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#EFEAFB] text-pn-accent">
        <SearchX size={20} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <p className="text-[15px] font-medium text-pn-ink">{title}</p>
      <p className="mt-1 max-w-[320px] text-[13px] leading-5 text-[#737373]">{body}</p>
    </div>
  );
}

/** Small text button used in a group header ("Temizle"). */
export function GroupAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mr-1 inline-flex min-h-8 items-center rounded-full px-2.5 text-[13px] font-medium text-[#737373] outline-none transition-colors duration-150 hover:bg-pn-canvas hover:text-pn-ink focus-visible:shadow-[0_0_0_2px_var(--color-pn-accent)]"
    >
      {label}
    </button>
  );
}
