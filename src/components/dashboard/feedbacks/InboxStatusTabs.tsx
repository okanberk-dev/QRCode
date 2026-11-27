'use client';

import { useRef, type KeyboardEvent } from 'react';

/**
 * Pill tablist for the review inboxes (owner + admin). Each tab can carry a
 * count pill; pass `count: null`/`undefined` to omit it (the owner inbox only
 * shows counts it knows to be exact, and none while loading — never a 0
 * placeholder).
 *
 * Fintora pills on the canvas: white idle pills (grey on phones, where the
 * page is white), the active one black with white text. 44px tall below sm
 * (touch target), 40px from sm.
 *
 * Keyboard: ArrowLeft/Right/Home/End move AND select (same contract as the
 * `<Tabs>` primitive), roving `tabIndex`. If `active` matches no tab (e.g. a
 * legacy deep-link tab), the first tab stays in the tab order.
 */

export interface InboxTab {
  id: string;
  label: string;
  /** Exact count, or null/undefined to hide the pill. */
  count?: number | null;
  /** Tooltip, e.g. "1–3 yıldız" on the low-rating tab. */
  title?: string;
  /** `danger` tints the count pill red when it is > 0 and the tab is not selected. */
  tone?: 'default' | 'danger';
}

interface InboxStatusTabsProps {
  tabs: InboxTab[];
  active: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  /** id of the element the tabs filter (`aria-controls`). */
  controlsId?: string;
  /**
   * `solid` (default): white idle pills, black active pill. `soft`: quiet
   * tabs under a stronger control (owner inbox, under the source switch) —
   * grey idle text, white active pill.
   */
  variant?: 'solid' | 'soft';
  className?: string;
}

export function InboxStatusTabs({
  tabs,
  active,
  onChange,
  ariaLabel,
  controlsId,
  variant = 'solid',
  className = '',
}: InboxStatusTabsProps) {
  const soft = variant === 'soft';
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const activeIndex = tabs.findIndex((t) => t.id === active);
  const focusableIndex = activeIndex === -1 ? 0 : activeIndex;

  const move = (index: number) => {
    const next = tabs[index];
    if (!next) return;
    onChange(next.id);
    refs.current[next.id]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      move((index + 1) % tabs.length);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      move((index - 1 + tabs.length) % tabs.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      move(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      move(tabs.length - 1);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      className={`-mx-4 flex gap-1.5 overflow-x-auto px-4 no-scrollbar [mask-image:linear-gradient(to_right,#000_88%,transparent)] sm:mx-0 sm:px-0 sm:[mask-image:none] ${className}`}
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === active;
        const showCount = typeof tab.count === 'number';
        const countTone = selected
          ? soft
            ? 'bg-pn-canvas text-pn-ink max-sm:bg-white'
            : 'bg-white/20 text-white'
          : tab.tone === 'danger' && (tab.count ?? 0) > 0
            ? 'bg-[#FDECEC] text-[#D92D20]'
            : 'bg-black/[0.06] text-[#525252]';
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[tab.id] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={controlsId}
            tabIndex={index === focusableIndex ? 0 : -1}
            title={tab.title}
            data-tone={soft ? 'soft' : undefined}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2 active:scale-[.97] sm:h-10 ${
              soft
                ? selected
                  ? 'bg-white text-pn-ink max-sm:bg-[#F1F1F1]'
                  : 'bg-transparent text-[#737373] hover:bg-white/70 hover:text-pn-ink max-sm:hover:bg-[#F6F6F6]'
                : selected
                  ? 'bg-pn-accent text-white'
                  : 'bg-white text-pn-ink hover:bg-[#EDEDED] max-sm:bg-[#F6F6F6]'
            }`}
          >
            <span>{tab.label}</span>
            {showCount && (
              <span
                className={`min-w-[22px] rounded-full px-1.5 text-center text-[12px] font-medium leading-[22px] tabular-nums ${countTone}`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default InboxStatusTabs;
