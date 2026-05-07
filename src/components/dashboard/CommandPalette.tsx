'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search as SearchIcon,
  X,
  Loader2,
  Store,
  MessageSquareText,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { Locale } from '@/lib/translations';

interface RestaurantHit {
  kind: 'restaurant';
  id: string;
  name: string;
  category?: string | null;
  slug?: string | null;
}

interface FeedbackHit {
  kind: 'feedback';
  id: string;
  rating: number;
  comment: string | null;
  name: string | null;
  createdAt: string;
  restaurantName?: string | null;
}

interface NavItem {
  href: string;
  label: string;
  keywords: string[];
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  locale: Locale;
  /** Locale-prefixed dashboard root, e.g. `/tr/dashboard`. */
  base: string;
  /** Static nav items so users can quickly jump to top-level pages by name. */
  navItems: NavItem[];
}

/**
 * Spotlight-style search palette for the owner panel. Replaces the
 * "Yakında: komut paleti" disabled pill that lived in the topbar.
 *
 * Sources:
 *  - **Pages** — passed in from the shell (Dashboard / Yorumlar / QR / …).
 *    Filtered client-side by label + keyword match. Always visible
 *    when no query is typed so the palette doubles as a launcher.
 *  - **Restaurants** — single fetch of `/api/restaurants` on first open
 *    (cached for the session). Filtered client-side because the list
 *    is already small (typical owner has 1–5 locations).
 *  - **Feedbacks** — server-side search via `/api/feedback?search=&limit=8`
 *    fired on every debounced keystroke. The endpoint already supports
 *    a `search` param (matches comment + name + email).
 *
 * Keyboard:
 *  - ↑ / ↓        → move selection (wraps around).
 *  - Enter        → activate selected hit.
 *  - Esc          → close.
 *  - Backdrop     → close.
 */
export default function CommandPalette({ open, onClose, locale, base, navItems }: CommandPaletteProps) {
  const router = useRouter();
  const isTr = locale === 'tr';

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [restaurants, setRestaurants] = useState<RestaurantHit[]>([]);
  const [restaurantsLoaded, setRestaurantsLoaded] = useState(false);
  const [feedbacks, setFeedbacks] = useState<FeedbackHit[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Reset query whenever we reopen — feels less surprising than
  // remembering the previous search across sessions.
  useEffect(() => {
    if (open) {
      setQuery('');
      setDebounced('');
      setActiveIndex(0);
      // Defer focus so the dialog is mounted first.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Lazy-load restaurants the first time the palette opens.
  useEffect(() => {
    if (!open || restaurantsLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/restaurants');
        if (!res.ok) return;
        const json = await res.json();
        const list = Array.isArray(json) ? json : json?.data ?? [];
        if (cancelled) return;
        setRestaurants(
          list.map((r: { id: string; name: string; category?: string | null; slug?: string | null }) => ({
            kind: 'restaurant' as const,
            id: r.id,
            name: r.name,
            category: r.category ?? null,
            slug: r.slug ?? null,
          })),
        );
        setRestaurantsLoaded(true);
      } catch {
        /* silent — palette still works without restaurants */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, restaurantsLoaded]);

  // Debounce the query — 250ms. Avoids feedback API hammering.
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(id);
  }, [query, open]);

  // Feedback search — only fires when there's a query (>= 2 chars).
  useEffect(() => {
    if (!open) return;
    if (debounced.length < 2) {
      setFeedbacks([]);
      setFeedbackLoading(false);
      return;
    }
    let cancelled = false;
    setFeedbackLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/feedback?search=${encodeURIComponent(debounced)}&limit=8`,
        );
        if (!res.ok) {
          if (!cancelled) setFeedbacks([]);
          return;
        }
        const json = await res.json();
        const list = Array.isArray(json) ? json : json?.data ?? [];
        if (cancelled) return;
        setFeedbacks(
          list.map((f: {
            id: string;
            rating: number;
            comment: string | null;
            name: string | null;
            createdAt: string;
            restaurant?: { name?: string | null } | null;
          }) => ({
            kind: 'feedback' as const,
            id: f.id,
            rating: f.rating,
            comment: f.comment,
            name: f.name,
            createdAt: f.createdAt,
            restaurantName: f.restaurant?.name ?? null,
          })),
        );
      } catch {
        if (!cancelled) setFeedbacks([]);
      } finally {
        if (!cancelled) setFeedbackLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, open]);

  // Filtered nav items — match label OR any keyword.
  const filteredNavItems = useMemo<NavItem[]>(() => {
    const q = debounced.toLocaleLowerCase('tr-TR');
    if (!q) return navItems;
    return navItems.filter((item) => {
      const hay = [item.label, ...item.keywords].join(' ').toLocaleLowerCase('tr-TR');
      return hay.includes(q);
    });
  }, [debounced, navItems]);

  // Filtered restaurants.
  const filteredRestaurants = useMemo(() => {
    const q = debounced.toLocaleLowerCase('tr-TR');
    if (!q) return restaurants.slice(0, 5);
    return restaurants
      .filter((r) =>
        `${r.name} ${r.category ?? ''}`.toLocaleLowerCase('tr-TR').includes(q),
      )
      .slice(0, 8);
  }, [debounced, restaurants]);

  // Build a flat ordered hit list for keyboard nav (nav → restaurants → feedbacks).
  type FlatHit =
    | { kind: 'nav'; href: string; label: string }
    | RestaurantHit
    | FeedbackHit;

  const flat: FlatHit[] = useMemo(() => {
    const arr: FlatHit[] = [];
    filteredNavItems.forEach((n) => arr.push({ kind: 'nav', href: n.href, label: n.label }));
    filteredRestaurants.forEach((r) => arr.push(r));
    feedbacks.forEach((f) => arr.push(f));
    return arr;
  }, [filteredNavItems, filteredRestaurants, feedbacks]);

  // Keep activeIndex in bounds whenever the list changes.
  useEffect(() => {
    if (activeIndex >= flat.length) setActiveIndex(0);
  }, [flat.length, activeIndex]);

  const navigate = useCallback(
    (hit: FlatHit) => {
      let href = '';
      if (hit.kind === 'nav') href = hit.href;
      else if (hit.kind === 'restaurant') href = `${base}/restaurants/${hit.id}`;
      else if (hit.kind === 'feedback') href = `${base}/feedbacks?focus=${hit.id}`;
      if (href) {
        router.push(href);
        onClose();
      }
    },
    [base, router, onClose],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (flat.length === 0 ? 0 : (i + 1) % flat.length));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (flat.length === 0 ? 0 : (i - 1 + flat.length) % flat.length));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const hit = flat[activeIndex];
      if (hit) navigate(hit);
    }
  };

  // Scroll active item into view as user navigates.
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  let runningIndex = -1;
  const indexFor = () => {
    runningIndex += 1;
    return runningIndex;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isTr ? 'Komut paleti' : 'Command palette'}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-sm sm:pt-[14vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* §38.67 — Modal floating tier: heavy shadow-[0_30px_80px] → bz-elev-3
          (0_12px_32px Apple-soft). Floating modal için en heavy tier doğru. */}
      <div className="w-full max-w-[640px] overflow-hidden rounded-2xl border border-[#EDEDED] bg-white bz-elev-3 animate-slide-in">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-[#EDEDED] px-4">
          <SearchIcon size={16} strokeWidth={2} className="shrink-0 text-[#737373]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder={
              isTr
                ? 'Yorum, konum, sayfa ara…'
                : 'Search reviews, locations, pages…'
            }
            className="flex-1 bg-transparent py-4 text-[15px] text-[#0A0A0A] placeholder:text-[#A3A3A3] outline-none"
            aria-label={isTr ? 'Arama' : 'Search'}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label={isTr ? 'Kapat' : 'Close'}
            className="bz-btn-icon"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {/* Pages */}
          {filteredNavItems.length > 0 && (
            <Section title={isTr ? 'SAYFALAR' : 'PAGES'}>
              {filteredNavItems.map((n) => {
                const i = indexFor();
                return (
                  <Row
                    key={`nav-${n.href}`}
                    index={i}
                    active={i === activeIndex}
                    icon={<CornerDownLeft size={14} className="text-[#0A0A0A]" />}
                    primary={n.label}
                    secondary={n.href}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => navigate({ kind: 'nav', href: n.href, label: n.label })}
                  />
                );
              })}
            </Section>
          )}

          {/* Restaurants */}
          {filteredRestaurants.length > 0 && (
            <Section title={isTr ? 'İŞLETMELER' : 'LOCATIONS'}>
              {filteredRestaurants.map((r) => {
                const i = indexFor();
                return (
                  <Row
                    key={`rest-${r.id}`}
                    index={i}
                    active={i === activeIndex}
                    icon={<Store size={14} className="text-[#0A0A0A]" />}
                    primary={r.name}
                    secondary={r.category ?? undefined}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => navigate(r)}
                  />
                );
              })}
            </Section>
          )}

          {/* Feedbacks */}
          {(feedbackLoading || feedbacks.length > 0) && (
            <Section
              title={isTr ? 'YORUMLAR' : 'REVIEWS'}
              right={feedbackLoading ? <Loader2 size={11} className="animate-spin text-[#737373]" /> : null}
            >
              {feedbacks.map((f) => {
                const i = indexFor();
                const stars = '★'.repeat(f.rating) + '☆'.repeat(5 - f.rating);
                const who = f.name || (isTr ? 'Anonim' : 'Anonymous');
                const where = f.restaurantName ? ` · ${f.restaurantName}` : '';
                return (
                  <Row
                    key={`fb-${f.id}`}
                    index={i}
                    active={i === activeIndex}
                    icon={<MessageSquareText size={14} className="text-[#0A0A0A]" />}
                    primary={`${stars} · ${who}${where}`}
                    secondary={f.comment?.trim() || (isTr ? '(yorumsuz)' : '(no comment)')}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => navigate(f)}
                  />
                );
              })}
            </Section>
          )}

          {/* Empty state when query is real and nothing matched */}
          {flat.length === 0 && debounced.length > 0 && !feedbackLoading && (
            <div className="px-6 py-10 text-center">
              <p className="text-[14px] font-medium text-[#0A0A0A]">
                {isTr ? 'Sonuç bulunamadı' : 'No results'}
              </p>
              <p className="mt-1 text-[12px] text-[#737373]">
                {isTr
                  ? 'Farklı bir kelime deneyin veya kısaltın.'
                  : 'Try a different keyword or shorten the query.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer hint bar */}
        <div className="flex items-center justify-between gap-2 border-t border-[#EDEDED] bg-[#FAFAFA] px-4 py-2 text-[11px] text-[#737373]">
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <Kbd>
                <ArrowUp size={9} />
              </Kbd>
              <Kbd>
                <ArrowDown size={9} />
              </Kbd>
              {isTr ? 'gez' : 'navigate'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>
                <CornerDownLeft size={9} />
              </Kbd>
              {isTr ? 'aç' : 'open'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>esc</Kbd>
              {isTr ? 'kapat' : 'close'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <div className="px-4 pb-1 pt-2 flex items-center justify-between">
        <span className="pulse-eyebrow text-[#737373]">{title}</span>
        {right}
      </div>
      <div className="px-2">{children}</div>
    </div>
  );
}

function Row({
  index,
  active,
  icon,
  primary,
  secondary,
  onClick,
  onMouseEnter,
}: {
  index: number;
  active: boolean;
  icon: React.ReactNode;
  primary: string;
  secondary?: string;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  return (
    <button
      type="button"
      data-index={index}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`w-full flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
        active ? 'bg-[#EAF9B8]' : 'hover:bg-[#FAFAFA]'
      }`}
    >
      <span className="shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-[#EDEDED]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-[#0A0A0A]">{primary}</span>
        {secondary && (
          <span className="block truncate text-[11px] text-[#737373] mt-0.5">{secondary}</span>
        )}
      </span>
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded border border-[#EDEDED] bg-white text-[#525252] font-mono text-[10px]"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {children}
    </kbd>
  );
}
