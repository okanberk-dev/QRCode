'use client';

import { useSyncExternalStore } from 'react';
import { Search as SearchIcon } from 'lucide-react';

/**
 * Where the search field opens in the top bar:
 *  - `icon`        — the 46px round button only (mobile bar).
 *  - `pill`        — always the search field (top bars with room to spare).
 *  - `pill-xl`     — round button below 1280px, field from there up.
 *  - `pill-1600`   — round button below 1600px; for a top bar that also
 *                    carries the business switcher and "Create QR".
 */
export type SearchTriggerVariant = 'icon' | 'pill' | 'pill-xl' | 'pill-1600';

const ICON_HIDE: Record<SearchTriggerVariant, string> = {
  icon: '',
  pill: 'hidden',
  'pill-xl': 'xl:hidden',
  'pill-1600': 'min-[1600px]:hidden',
};

const PILL_SHOW: Record<SearchTriggerVariant, string> = {
  icon: 'hidden',
  pill: 'inline-flex w-[280px]',
  'pill-xl': 'hidden xl:inline-flex w-[260px]',
  'pill-1600': 'hidden min-[1600px]:inline-flex w-[clamp(220px,calc(100vw_-_1360px),260px)]',
};

const noopSubscribe = () => () => {};

/** "⌘K" on Apple devices, "Ctrl K" elsewhere. */
function readShortcut(): string {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent || '';
  return /mac|iphone|ipad|ipod/i.test(platform) ? '⌘K' : 'Ctrl K';
}

interface SearchTriggerProps {
  locale: 'tr' | 'en';
  onOpen: () => void;
  variant: SearchTriggerVariant;
}

/**
 * Top-bar entry to the search palette. On wide screens it reads as a real
 * search field (white pill, hint text, shortcut chip) but stays a button:
 * the palette holds the actual input.
 */
export function SearchTrigger({ locale, onOpen, variant }: SearchTriggerProps) {
  const isTr = locale === 'tr';
  // Server render has no platform, so the chip appears after hydration
  // instead of flipping from "⌘K" to "Ctrl K" (no hydration mismatch).
  const shortcut = useSyncExternalStore(noopSubscribe, readShortcut, () => null);
  const label = isTr ? 'Ara' : 'Search';
  const title = `${label} (${shortcut ?? '⌘K'})`;
  const hint = isTr ? 'Yorum, işletme ya da sayfa ara' : 'Search reviews, businesses, pages';

  return (
    <>
      {variant !== 'pill' && (
        <button
          type="button"
          onClick={onOpen}
          className={`pn-icon-btn ${ICON_HIDE[variant]}`}
          aria-label={label}
          aria-haspopup="dialog"
          aria-keyshortcuts="Meta+K Control+K"
          title={title}
        >
          <SearchIcon size={19} aria-hidden="true" />
        </button>
      )}
      {variant !== 'icon' && (
        <button
          type="button"
          onClick={onOpen}
          aria-haspopup="dialog"
          aria-keyshortcuts="Meta+K Control+K"
          title={title}
          className={`${PILL_SHOW[variant]} group h-[46px] shrink-0 items-center gap-2.5 rounded-full border border-transparent bg-white pl-4 pr-1.5 text-left outline-none transition-[background-color,box-shadow] duration-200 hover:bg-[#FBFBFB] hover:shadow-[0_0_0_1px_#EBEBEB] focus-visible:border-pn-ink focus-visible:shadow-[0_0_0_3px_var(--color-pn-accent-soft)] active:scale-[0.99] motion-reduce:active:scale-100`}
        >
          <SearchIcon size={18} className="shrink-0 text-pn-ink" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-[14px] text-[#737373] transition-colors duration-200 group-hover:text-[#525252]">
            {hint}
          </span>
          <span
            aria-hidden="true"
            className={`inline-flex h-[34px] min-w-[46px] shrink-0 items-center justify-center rounded-full bg-pn-canvas px-2.5 text-[12px] font-medium text-[#737373] transition-opacity duration-200 ${shortcut ? 'opacity-100' : 'opacity-0'}`}
          >
            {shortcut ?? '⌘K'}
          </span>
        </button>
      )}
    </>
  );
}
