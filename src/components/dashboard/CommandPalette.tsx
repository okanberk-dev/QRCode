'use client';

import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Gift,
  History,
  LayoutDashboard,
  MessageSquareText,
  Plug,
  Plus,
  QrCode,
  Reply,
  Star,
  Store,
  UserCircle,
  UsersRound,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import type { Locale } from '@/lib/translations';
import {
  GroupAction,
  Highlight,
  PaletteAvatar,
  PaletteEmpty,
  PaletteFrame,
  PaletteGroup,
  PaletteIcon,
  PaletteOption,
  PaletteSkeletonRow,
  PaletteStars,
} from '@/components/panel/search/PaletteFrame';
import {
  OWNER_RECENT_KEY,
  clearRecent,
  formatPaletteDate,
  isPanelHref,
  matchesQuery,
  readRecent,
  rememberRecent,
  snippetAround,
  type RecentEntry,
} from '@/components/panel/search/search-utils';

interface RestaurantHit {
  kind: 'restaurant';
  id: string;
  name: string;
  category?: string | null;
  slug?: string | null;
  /** Brand colour, when the source carries it. */
  color?: string | null;
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
  /**
   * Businesses resolved by the dashboard layout (active, newest first, max
   * 20 — what `/api/restaurants` returns). When given, the palette does not
   * fetch them on open.
   */
  restaurants?: Array<{ id: string; name: string; category?: string | null; slug?: string | null }>;
  /** Shows the "add a business" quick action (team members cannot). */
  canAddBusiness?: boolean;
  /** Adds the active business to quick-action links (shell scoping). */
  scopeHref?: (href: string) => string;
}

type Item =
  | { kind: 'action'; key: string; href: string; label: string; description: string; icon: LucideIcon }
  | { kind: 'recent'; key: string; entry: RecentEntry }
  | { kind: 'nav'; key: string; href: string; label: string }
  | { kind: 'restaurant'; key: string; hit: RestaurantHit }
  | { kind: 'feedback'; key: string; hit: FeedbackHit };

interface Section {
  id: string;
  title: string;
  items: Item[];
  count?: number;
  action?: ReactNode;
  /** Shows two placeholder rows when the section is still empty. */
  pending?: boolean;
}

type Copy = { tr: string; en: string };

/** Icon + one-line description per dashboard page (path after `base`). */
const PAGE_META: Record<string, { icon: LucideIcon; description: Copy }> = {
  '': { icon: LayoutDashboard, description: { tr: 'Bugünün özeti ve bekleyen işler', en: "Today's summary and open tasks" } },
  '/feedbacks': { icon: MessageSquareText, description: { tr: 'Puanlar, geri bildirimler ve yanıtlar', en: 'Ratings, feedback and replies' } },
  '/google-reviews': { icon: Star, description: { tr: 'Google yorumlarını okuyun ve yanıtlayın', en: 'Read and reply to Google reviews' } },
  '/qr': { icon: QrCode, description: { tr: 'QR kodlarını oluşturun ve indirin', en: 'Create and download QR codes' } },
  '/analytics': { icon: BarChart3, description: { tr: 'Puan, hacim ve platform eğilimleri', en: 'Rating, volume and platform trends' } },
  '/restaurants': { icon: Store, description: { tr: 'Tüm konumları karşılaştırın ve yönetin', en: 'Compare and manage all locations' } },
  '/restaurants/new': { icon: Plus, description: { tr: 'Yeni bir konum ekleyin', en: 'Add a new location' } },
  '/menu': { icon: UtensilsCrossed, description: { tr: 'Dijital menüyü düzenleyin', en: 'Edit your digital menu' } },
  '/platforms': { icon: Plug, description: { tr: 'Google, Yemeksepeti ve diğer yorum bağlantıları', en: 'Google, Yemeksepeti and other review links' } },
  '/customers': { icon: UsersRound, description: { tr: 'Geri bildirim bırakan müşteriler', en: 'Customers who left feedback' } },
  '/loyalty': { icon: Gift, description: { tr: 'Damga ya da puan kartı ve kasa ekranı', en: 'Stamp or points card and counter' } },
  '/surveys': { icon: ClipboardList, description: { tr: 'Anket hazırlayın, yanıtları görün', en: 'Build surveys and see responses' } },
  '/audits': { icon: ClipboardCheck, description: { tr: 'Denetim listeleri ve sonuçları', en: 'Audit checklists and results' } },
  '/guide': { icon: BookOpen, description: { tr: 'Kurulum ve kullanım adımları', en: 'Setup and how-to steps' } },
  '/account': { icon: UserCircle, description: { tr: 'Profil, ekip, güvenlik ve bildirimler', en: 'Profile, team, security and notifications' } },
  '/account?section=billing': { icon: CreditCard, description: { tr: 'Paket, ödeme ve faturalar', en: 'Plan, payment and invoices' } },
};

function pageMeta(href: string, base: string): { icon: LucideIcon; description: Copy } | null {
  if (!isPanelHref(href, base)) return null;
  const rest = href.slice(base.length);
  return PAGE_META[rest] ?? PAGE_META[rest.split('?')[0]] ?? null;
}

const RESTAURANT_PREVIEW = 5;
const RESTAURANT_LIMIT = 8;

/**
 * Search palette for the owner panel (⌘K / Ctrl K, or the top-bar field).
 *
 * Sources:
 *  - **Quick actions + recently opened** — shown before typing. Recents are
 *    the last pages / businesses picked here (localStorage, panel paths only).
 *  - **Pages** — passed in from the shell, filtered on the client.
 *  - **Businesses** — from the layout (or one `/api/restaurants` fetch).
 *  - **Reviews** — `/api/feedback?search=&limit=8` after a 250ms debounce,
 *    from two characters (matches comment, name and email).
 *
 * Keyboard: ↑ ↓ move (wraps), Enter opens, Esc closes. Rendering, focus and
 * ARIA live in `PaletteFrame`.
 */
export default function CommandPalette({
  open,
  onClose,
  locale,
  base,
  navItems,
  restaurants: providedRestaurants,
  canAddBusiness = false,
  scopeHref,
}: CommandPaletteProps) {
  const router = useRouter();
  const isTr = locale === 'tr';
  const listId = useId();

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [fetchedRestaurants, setRestaurants] = useState<RestaurantHit[]>([]);
  const [restaurantsLoaded, setRestaurantsLoaded] = useState(false);
  const restaurants = useMemo<RestaurantHit[]>(
    () =>
      providedRestaurants
        ? providedRestaurants.map((r) => ({
            kind: 'restaurant' as const,
            id: r.id,
            name: r.name,
            category: r.category ?? null,
            slug: r.slug ?? null,
          }))
        : fetchedRestaurants,
    [providedRestaurants, fetchedRestaurants],
  );
  const [feedbacks, setFeedbacks] = useState<FeedbackHit[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [now, setNow] = useState(() => Date.now());

  // Fresh start on every open: empty query, recents re-read from storage.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setDebounced('');
    setActiveIndex(0);
    setRecent(readRecent(OWNER_RECENT_KEY, base));
    setNow(Date.now());
  }, [open, base]);

  // Lazy-load restaurants the first time the palette opens (only when the
  // shell did not pass them in).
  useEffect(() => {
    if (!open || restaurantsLoaded || providedRestaurants) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/restaurants');
        if (!res.ok) return;
        const json = await res.json();
        const list = Array.isArray(json) ? json : json?.data ?? [];
        if (cancelled) return;
        setRestaurants(
          list.map((r: { id: string; name: string; category?: string | null; slug?: string | null; primaryColor?: string | null }) => ({
            kind: 'restaurant' as const,
            id: r.id,
            name: r.name,
            category: r.category ?? null,
            slug: r.slug ?? null,
            color: r.primaryColor ?? null,
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
  }, [open, restaurantsLoaded, providedRestaurants]);

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
        const res = await fetch(`/api/feedback?search=${encodeURIComponent(debounced)}&limit=8`);
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

  const q = query.trim();
  const scope = useCallback((href: string) => (scopeHref ? scopeHref(href) : href), [scopeHref]);

  const actions = useMemo(() => {
    const list: Array<Extract<Item, { kind: 'action' }> & { keywords: string[] }> = [
      {
        kind: 'action',
        key: 'action-qr',
        href: scope(`${base}/qr?new=1`),
        label: isTr ? 'Yeni QR oluştur' : 'Create a QR code',
        description: isTr ? 'Masa, tezgâh ya da paket için' : 'For a table, counter or delivery bag',
        icon: QrCode,
        keywords: ['qr', 'kod', 'code', 'yeni', 'new'],
      },
      {
        kind: 'action',
        key: 'action-unanswered',
        href: scope(`${base}/feedbacks?hasReply=pending`),
        label: isTr ? 'Yanıtsız yorumlar' : 'Unanswered reviews',
        description: isTr ? 'Yanıt bekleyen geri bildirimler' : 'Feedback waiting for a reply',
        icon: Reply,
        keywords: ['yanıt', 'yanıtsız', 'reply', 'unanswered', 'yorum', 'review'],
      },
      {
        kind: 'action',
        key: 'action-analytics',
        href: scope(`${base}/analytics`),
        label: isTr ? 'Analitik raporu' : 'Analytics report',
        description: isTr ? 'Puan, hacim ve platform eğilimleri' : 'Rating, volume and platform trends',
        icon: BarChart3,
        keywords: ['analitik', 'rapor', 'analytics', 'report'],
      },
    ];
    if (canAddBusiness) {
      list.push({
        kind: 'action',
        key: 'action-new-business',
        href: `${base}/restaurants/new`,
        label: isTr ? 'İşletme ekle' : 'Add a business',
        description: isTr ? 'Yeni bir konum oluşturun' : 'Create a new location',
        icon: Plus,
        keywords: ['işletme', 'konum', 'şube', 'business', 'location', 'yeni', 'new'],
      });
    }
    return list;
  }, [base, canAddBusiness, isTr, scope]);

  const sections = useMemo<Section[]>(() => {
    const out: Section[] = [];
    const pages: Item[] = navItems
      .filter((n) => matchesQuery([n.label, ...n.keywords], q))
      .map((n) => ({ kind: 'nav', key: `nav-${n.href}`, href: n.href, label: n.label }));
    const businesses: Item[] = restaurants
      .filter((r) => matchesQuery([r.name, r.category], q))
      .slice(0, q ? RESTAURANT_LIMIT : RESTAURANT_PREVIEW)
      .map((r) => ({ kind: 'restaurant', key: `rest-${r.id}`, hit: r }));

    if (!q) {
      out.push({ id: 'actions', title: isTr ? 'Hızlı işlemler' : 'Quick actions', items: actions });
      if (recent.length > 0) {
        out.push({
          id: 'recent',
          title: isTr ? 'Son açılanlar' : 'Recently opened',
          items: recent.map((entry) => ({ kind: 'recent', key: `recent-${entry.href}`, entry })),
          action: (
            <GroupAction
              label={isTr ? 'Temizle' : 'Clear'}
              onClick={() => {
                clearRecent(OWNER_RECENT_KEY);
                setRecent([]);
                setActiveIndex(0);
              }}
            />
          ),
        });
      }
      if (businesses.length > 1) {
        out.push({ id: 'businesses', title: isTr ? 'İşletmeler' : 'Businesses', items: businesses });
      }
      out.push({ id: 'pages', title: isTr ? 'Sayfalar' : 'Pages', items: pages });
      return out;
    }

    const matchingActions = actions.filter((a) => matchesQuery([a.label, ...a.keywords], q));
    if (matchingActions.length > 0) {
      out.push({ id: 'actions', title: isTr ? 'Hızlı işlemler' : 'Quick actions', items: matchingActions });
    }
    if (pages.length > 0) {
      out.push({ id: 'pages', title: isTr ? 'Sayfalar' : 'Pages', items: pages, count: pages.length });
    }
    if (businesses.length > 0) {
      out.push({ id: 'businesses', title: isTr ? 'İşletmeler' : 'Businesses', items: businesses, count: businesses.length });
    }
    const searching = q.length >= 2 && (debounced !== q || feedbackLoading);
    if (feedbacks.length > 0 || searching) {
      out.push({
        id: 'reviews',
        title: isTr ? 'Yorumlar' : 'Reviews',
        items: feedbacks.map((f) => ({ kind: 'feedback', key: `fb-${f.id}`, hit: f })),
        count: feedbacks.length > 0 && !searching ? feedbacks.length : undefined,
        pending: searching,
      });
    }
    return out;
  }, [actions, debounced, feedbackLoading, feedbacks, isTr, navItems, q, recent, restaurants]);

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  // Keep activeIndex in bounds whenever the list changes.
  useEffect(() => {
    if (activeIndex >= flat.length) setActiveIndex(0);
  }, [flat.length, activeIndex]);

  const remember = useCallback(
    (entry: Omit<RecentEntry, 'at'>) => {
      rememberRecent(OWNER_RECENT_KEY, base, entry);
    },
    [base],
  );

  const navigate = useCallback(
    (item: Item) => {
      let href = '';
      if (item.kind === 'action') {
        href = item.href;
        remember({ href, label: item.label, kind: 'page' });
      } else if (item.kind === 'recent') {
        href = item.entry.href;
        remember({ href, label: item.entry.label, kind: item.entry.kind, sub: item.entry.sub });
      } else if (item.kind === 'nav') {
        href = item.href;
        remember({ href, label: item.label, kind: 'page' });
      } else if (item.kind === 'restaurant') {
        href = `${base}/restaurants/${item.hit.id}`;
        remember({ href, label: item.hit.name, kind: 'business', sub: item.hit.category ?? undefined });
      } else {
        // Reviews are not kept in "recently opened" (customer content).
        href = `${base}/feedbacks?focus=${item.hit.id}`;
      }
      if (href) {
        router.push(href);
        onClose();
      }
    },
    [base, onClose, remember, router],
  );

  if (!open) return null;

  const pending = sections.some((s) => s.pending);
  const showEmpty = q.length > 0 && flat.length === 0 && !pending;
  const status = pending
    ? isTr ? 'Aranıyor' : 'Searching'
    : showEmpty
      ? isTr ? 'Sonuç yok' : 'No results'
      : isTr ? `${flat.length} sonuç` : `${flat.length} results`;

  let running = -1;
  const renderItem = (item: Item) => {
    running += 1;
    const index = running;
    const common = {
      listId,
      index,
      active: index === activeIndex,
      onHover: setActiveIndex,
      onSelect: () => navigate(item),
    };

    if (item.kind === 'action') {
      return (
        <PaletteOption
          key={item.key}
          {...common}
          leading={<PaletteIcon icon={item.icon} />}
          primary={<Highlight text={item.label} query={q} />}
          secondary={item.description}
        />
      );
    }
    if (item.kind === 'recent') {
      const { entry } = item;
      const meta = entry.kind === 'page' ? pageMeta(entry.href, base) : null;
      return (
        <PaletteOption
          key={item.key}
          {...common}
          leading={entry.kind === 'business' ? <PaletteAvatar name={entry.label} /> : <PaletteIcon icon={meta?.icon ?? History} />}
          primary={entry.label}
          secondary={
            entry.kind === 'business'
              ? entry.sub || (isTr ? 'İşletme' : 'Business')
              : meta?.description[locale] ?? (isTr ? 'Sayfa' : 'Page')
          }
          trailing={formatPaletteDate(entry.at, locale, now)}
        />
      );
    }
    if (item.kind === 'nav') {
      const meta = pageMeta(item.href, base);
      return (
        <PaletteOption
          key={item.key}
          {...common}
          leading={<PaletteIcon icon={meta?.icon ?? History} />}
          primary={<Highlight text={item.label} query={q} />}
          secondary={meta?.description[locale]}
        />
      );
    }
    if (item.kind === 'restaurant') {
      return (
        <PaletteOption
          key={item.key}
          {...common}
          leading={<PaletteAvatar name={item.hit.name} color={item.hit.color} />}
          primary={<Highlight text={item.hit.name} query={q} />}
          secondary={item.hit.category ? <Highlight text={item.hit.category} query={q} /> : isTr ? 'İşletme' : 'Business'}
        />
      );
    }
    const f = item.hit;
    const who = f.name?.trim() || (isTr ? 'İsimsiz' : 'Anonymous');
    const comment = f.comment?.trim();
    return (
      <PaletteOption
        key={item.key}
        {...common}
        leading={<PaletteIcon icon={MessageSquareText} />}
        primary={
          <span className="flex min-w-0 items-center gap-2">
            <PaletteStars rating={f.rating} label={isTr ? `5 üzerinden ${f.rating} yıldız` : `${f.rating} of 5 stars`} />
            <span className="truncate">
              <Highlight text={who} query={q} />
              {f.restaurantName && <span className="font-normal text-[#9A9A9A]"> · {f.restaurantName}</span>}
            </span>
          </span>
        }
        secondary={
          comment ? (
            <Highlight text={snippetAround(comment, q)} query={q} />
          ) : (
            <span className="text-[#9A9A9A]">{isTr ? 'Yorum yazılmamış' : 'No comment written'}</span>
          )
        }
        trailing={formatPaletteDate(f.createdAt, locale, now)}
      />
    );
  };

  return (
    <PaletteFrame
      label={isTr ? 'Panelde ara' : 'Search the panel'}
      listId={listId}
      query={query}
      onQueryChange={(value) => {
        setQuery(value);
        setActiveIndex(0);
      }}
      placeholder={isTr ? 'Yorum, işletme ya da sayfa ara' : 'Search reviews, businesses, pages'}
      loading={feedbackLoading}
      count={flat.length}
      activeIndex={activeIndex}
      onActiveIndexChange={setActiveIndex}
      onSubmit={(index) => {
        const item = flat[index];
        if (item) navigate(item);
      }}
      onClose={onClose}
      status={status}
      copy={{
        clear: isTr ? 'Aramayı temizle' : 'Clear search',
        close: isTr ? 'Kapat' : 'Close',
        cancel: isTr ? 'Vazgeç' : 'Cancel',
        results: isTr ? 'Arama sonuçları' : 'Search results',
        move: isTr ? 'gez' : 'move',
        open: isTr ? 'aç' : 'open',
      }}
    >
      {showEmpty ? (
        <PaletteEmpty
          title={isTr ? `“${q}” için sonuç yok` : `No results for “${q}”`}
          body={
            isTr
              ? 'Farklı bir kelime deneyin ya da kısaltın. Yorumlarda yorum metni, müşteri adı ve e-posta aranır.'
              : 'Try another word or a shorter one. Reviews are searched by comment, customer name and email.'
          }
        />
      ) : (
        sections.map((section) => (
          <PaletteGroup key={section.id} title={section.title} count={section.count} action={section.action}>
            {section.items.map(renderItem)}
            {section.pending && section.items.length === 0 && (
              <>
                <PaletteSkeletonRow />
                <PaletteSkeletonRow />
              </>
            )}
          </PaletteGroup>
        ))
      )}
    </PaletteFrame>
  );
}
