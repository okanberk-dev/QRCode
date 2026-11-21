'use client';

/**
 * Admin Cmd+K command palette.
 *
 * Trigger paths:
 *   • Cmd+K (Mac) / Ctrl+K (Win) — global keyboard listener
 *   • `buaze:admin-search-open` CustomEvent — dispatched by the topbar and
 *     the mobile top bar. One palette instance serves both.
 *
 * Sources:
 *   1. Pages — the shared admin navigation (admin-nav.ts), already filtered
 *      by role and staff grants. Matched instantly on the client.
 *   2. Businesses and customers — the latest few when the query is empty,
 *      a server-side search once two characters are typed (same behaviour as
 *      the owner palette). Only offered when the admin can open the
 *      matching list page.
 *
 * a11y: input auto-focus, focus restored on close, ESC + backdrop close,
 * ↑↓ move, Enter opens.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  CornerDownLeft,
  Loader2,
  Search as SearchIcon,
  Store,
  Users,
  X,
} from 'lucide-react';
import { useAdminTranslation } from './AdminTranslationProvider';
import {
  getAdminNavLeaves,
  toAdminNavRole,
  type AdminNavLeaf,
  type AdminNavLocale,
} from './admin-nav';

interface RestaurantHit {
  kind: 'restaurant';
  id: string;
  name: string;
  category?: string | null;
}

interface CustomerHit {
  kind: 'customer';
  id: string;
  name: string | null;
  email: string | null;
  restaurantName?: string | null;
}

type Hit =
  | { kind: 'nav'; href: string; label: string }
  | RestaurantHit
  | CustomerHit;

const RESULT_LIMIT = 8;
const SEARCH_DEBOUNCE_MS = 250;
const MIN_SEARCH_LENGTH = 2;

const COPY: Record<
  AdminNavLocale,
  {
    title: string;
    placeholder: string;
    close: string;
    loading: string;
    empty: string;
    move: string;
    open: string;
    business: string;
    customer: string;
  }
> = {
  tr: {
    title: 'Yönetim araması',
    placeholder: 'Sayfa, işletme veya müşteri ara…',
    close: 'Kapat',
    loading: 'Yükleniyor…',
    empty: 'Eşleşen sonuç yok.',
    move: 'Gez',
    open: 'Aç',
    business: 'İşletme',
    customer: 'Müşteri',
  },
  en: {
    title: 'Admin search',
    placeholder: 'Search pages, businesses or customers…',
    close: 'Close',
    loading: 'Loading…',
    empty: 'No matching results.',
    move: 'Move',
    open: 'Open',
    business: 'Business',
    customer: 'Customer',
  },
};

function normalize(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function navMatches(item: AdminNavLeaf, q: string): boolean {
  if (!q) return true;
  const nq = normalize(q);
  if (normalize(item.label.tr).includes(nq) || normalize(item.label.en).includes(nq)) return true;
  return (item.keywords ?? []).some((k) => normalize(k).includes(nq));
}

function parseRestaurants(data: unknown): RestaurantHit[] {
  const body = data as { data?: unknown; items?: unknown } | null;
  const items = Array.isArray(body?.data) ? body.data : Array.isArray(body?.items) ? body.items : [];
  const out: RestaurantHit[] = [];
  for (const r of items.slice(0, RESULT_LIMIT) as Array<Record<string, unknown>>) {
    if (r && typeof r.id === 'string' && typeof r.name === 'string') {
      out.push({
        kind: 'restaurant',
        id: r.id,
        name: r.name,
        category: typeof r.category === 'string' ? r.category : null,
      });
    }
  }
  return out;
}

function parseCustomers(data: unknown): CustomerHit[] {
  const body = data as { data?: unknown } | null;
  const items = Array.isArray(body?.data) ? body.data : [];
  const out: CustomerHit[] = [];
  for (const c of items.slice(0, RESULT_LIMIT) as Array<Record<string, unknown>>) {
    // Rows are keyed by `key` (restaurant + contact); older payloads used `id`.
    const id = typeof c?.key === 'string' ? c.key : typeof c?.id === 'string' ? c.id : null;
    if (!id) continue;
    out.push({
      kind: 'customer',
      id,
      name: typeof c.name === 'string' ? c.name : null,
      email: typeof c.email === 'string' ? c.email : null,
      restaurantName: typeof c.restaurantName === 'string' ? c.restaurantName : null,
    });
  }
  return out;
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  try {
    const res = await fetch(url, { cache: 'no-store', signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const NO_PERMISSIONS: string[] = [];

interface AdminCommandPaletteProps {
  /** Admin role resolved by the layout (no extra /api/admin/me round-trip). */
  role: string;
  /** Staff grants in `resource:action` form. */
  permissions?: string[];
}

export default function AdminCommandPalette({ role, permissions = NO_PERMISSIONS }: AdminCommandPaletteProps) {
  const router = useRouter();
  const { locale } = useAdminTranslation();
  const navLocale: AdminNavLocale = locale === 'en' ? 'en' : 'tr';
  const copy = COPY[navLocale];

  const navLeaves = useMemo(
    () => getAdminNavLeaves(toAdminNavRole(role), new Set(permissions)),
    [role, permissions],
  );
  const canSeeRestaurants = navLeaves.some((leaf) => leaf.href === '/admin/restaurants');
  const canSeeCustomers = navLeaves.some((leaf) => leaf.href === '/admin/customers');

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [recent, setRecent] = useState<{ restaurants: RestaurantHit[]; customers: CustomerHit[] }>({
    restaurants: [],
    customers: [],
  });
  const [found, setFound] = useState<{ restaurants: RestaurantHit[]; customers: CustomerHit[] }>({
    restaurants: [],
    customers: [],
  });
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Keyboard shortcut + custom event listener.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onCustom = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('buaze:admin-search-open', onCustom);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('buaze:admin-search-open', onCustom);
    };
  }, []);

  // Focus management — restore focus on close.
  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement;
      const t = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(t);
    }
    const prev = previouslyFocused.current;
    if (prev && typeof prev.focus === 'function') prev.focus();
    setQuery('');
    setDebounced('');
    setActiveIdx(0);
  }, [open]);

  // Latest businesses / customers, loaded once on first open.
  const recentStartedRef = useRef(false);
  useEffect(() => {
    if (!open || recentStartedRef.current) return;
    if (!canSeeRestaurants && !canSeeCustomers) return;
    recentStartedRef.current = true;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [restData, custData] = await Promise.all([
        canSeeRestaurants ? fetchJson(`/api/restaurants?status=all&limit=${RESULT_LIMIT}&fields=options`) : null,
        canSeeCustomers ? fetchJson(`/api/admin/customers?limit=${RESULT_LIMIT}`) : null,
      ]);
      if (cancelled) return;
      setRecent({ restaurants: parseRestaurants(restData), customers: parseCustomers(custData) });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, canSeeRestaurants, canSeeCustomers]);

  // Debounce the query so typing does not fire a request per keystroke.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => setDebounced(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [query, open]);

  // Server-side search — the recent lists only hold a handful of rows, so
  // filtering them locally could never find an older business or customer.
  useEffect(() => {
    if (!open) return;
    if (debounced.length < MIN_SEARCH_LENGTH || (!canSeeRestaurants && !canSeeCustomers)) {
      setFound({ restaurants: [], customers: [] });
      return;
    }
    const controller = new AbortController();
    const q = encodeURIComponent(debounced);
    setLoading(true);
    (async () => {
      const [restData, custData] = await Promise.all([
        canSeeRestaurants
          ? fetchJson(`/api/restaurants?status=all&limit=${RESULT_LIMIT}&search=${q}&fields=options`, controller.signal)
          : null,
        canSeeCustomers
          ? fetchJson(`/api/admin/customers?range=all&limit=${RESULT_LIMIT}&search=${q}`, controller.signal)
          : null,
      ]);
      if (controller.signal.aborted) return;
      setFound({ restaurants: parseRestaurants(restData), customers: parseCustomers(custData) });
      setLoading(false);
    })();
    return () => controller.abort();
  }, [debounced, open, canSeeRestaurants, canSeeCustomers]);

  // Body scroll lock.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const q = query.trim();
    const navHits: Hit[] = navLeaves
      .filter((leaf) => navMatches(leaf, q))
      .map((leaf) => ({ kind: 'nav' as const, href: leaf.href, label: leaf.label[navLocale] }));
    if (q.length < MIN_SEARCH_LENGTH) {
      return [...navHits.slice(0, 12), ...recent.restaurants, ...recent.customers];
    }
    return [...navHits, ...found.restaurants, ...found.customers];
  }, [query, navLeaves, navLocale, recent, found]);

  const navigate = useCallback(
    (hit: Hit) => {
      let href: string;
      if (hit.kind === 'nav') href = hit.href;
      else if (hit.kind === 'restaurant') href = `/admin/restaurants/${hit.id}`;
      // The customers page opens its detail drawer from `?detail=<row key>`.
      else href = `/admin/customers?detail=${encodeURIComponent(hit.id)}`;
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  // Keep the selection inside the list as results change.
  useEffect(() => {
    if (activeIdx >= hits.length) setActiveIdx(Math.max(0, hits.length - 1));
  }, [hits, activeIdx]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(hits.length - 1, i + 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const hit = hits[activeIdx];
      if (hit) navigate(hit);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-[60] flex items-start justify-center bg-[#0A0A0A]/40 backdrop-blur-sm p-4 pt-[12vh] sm:pt-[18vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-[#EDEDED] bg-white shadow-[0_24px_60px_-20px_rgba(10,10,10,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[#EDEDED] px-4 py-3">
          {loading ? (
            <Loader2 size={16} className="animate-spin text-[#737373]" aria-hidden />
          ) : (
            <SearchIcon size={16} className="text-[#737373]" aria-hidden />
          )}
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            placeholder={copy.placeholder}
            className="flex-1 border-0 bg-transparent text-[16px] text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:outline-none sm:text-[15px]"
            aria-label={copy.title}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#737373] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]"
            aria-label={copy.close}
          >
            <X size={14} aria-hidden />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {hits.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-[#737373]" aria-live="polite">
              {loading ? copy.loading : copy.empty}
            </p>
          ) : (
            <PaletteList
              hits={hits}
              activeIdx={activeIdx}
              onClick={navigate}
              onHover={setActiveIdx}
              businessLabel={copy.business}
              customerLabel={copy.customer}
            />
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#EDEDED] bg-[#FAFAFA] px-3 py-2 text-[10px] text-[#737373]">
          <span className="inline-flex items-center gap-1">
            <KeyHint icon={<ArrowUp size={9} aria-hidden />} />
            <KeyHint icon={<ArrowDown size={9} aria-hidden />} />
            <span>{copy.move}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <KeyHint icon={<CornerDownLeft size={9} aria-hidden />} />
            <span>{copy.open}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-[#EDEDED] bg-white px-1.5 py-0.5 font-mono text-[9px] uppercase">
              Esc
            </kbd>
            <span>{copy.close}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function PaletteList({
  hits,
  activeIdx,
  onClick,
  onHover,
  businessLabel,
  customerLabel,
}: {
  hits: Hit[];
  activeIdx: number;
  onClick: (hit: Hit) => void;
  onHover: (idx: number) => void;
  businessLabel: string;
  customerLabel: string;
}) {
  return (
    <div role="listbox" className="space-y-0.5">
      {hits.map((hit, i) => {
        const active = i === activeIdx;
        const key = hit.kind === 'nav' ? `nav-${hit.href}` : `${hit.kind}-${hit.id}`;
        return (
          <button
            key={key}
            type="button"
            role="option"
            aria-selected={active}
            onMouseEnter={() => onHover(i)}
            onClick={() => onClick(hit)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors ${
              active ? 'bg-[#EAF9B8]/50' : 'hover:bg-[#FAFAFA]'
            }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                hit.kind === 'restaurant' ? 'bg-[#EAF9B8] text-[#0A0A0A]' : 'bg-[#FAFAFA] text-[#525252]'
              }`}
              aria-hidden
            >
              {hit.kind === 'restaurant' ? (
                <Store size={13} />
              ) : hit.kind === 'customer' ? (
                <Users size={13} />
              ) : (
                <SearchIcon size={13} />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-[#0A0A0A]">
                {hit.kind === 'nav'
                  ? hit.label
                  : hit.kind === 'restaurant'
                    ? hit.name
                    : hit.name || hit.email || customerLabel}
              </span>
              <span className="block truncate text-[11px] text-[#737373]">
                {hit.kind === 'nav'
                  ? hit.href
                  : hit.kind === 'restaurant'
                    ? hit.category || businessLabel
                    : hit.restaurantName || hit.email || customerLabel}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function KeyHint({ icon }: { icon: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-4 w-4 items-center justify-center rounded border border-[#EDEDED] bg-white">
      {icon}
    </kbd>
  );
}
