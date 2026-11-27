'use client';

/**
 * Admin search palette (⌘K / Ctrl K).
 *
 * Trigger paths:
 *   • Cmd+K (Mac) / Ctrl+K (Win) — global keyboard listener
 *   • `buaze:admin-search-open` CustomEvent — dispatched by the top-bar field
 *     and the mobile bar. One palette instance serves both.
 *
 * Sources:
 *   1. Quick actions + recently opened (localStorage, admin paths only) —
 *      shown before typing.
 *   2. Pages — the shared admin navigation (admin-nav.ts), already filtered
 *      by role and staff grants. Matched instantly on the client.
 *   3. Businesses and customers — the latest few when the query is empty,
 *      a server-side search once two characters are typed. Only offered
 *      when the admin can open the matching list page.
 *
 * Rendering, focus trap/restore and ARIA live in `PaletteFrame`.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, History, Network, Reply, ScrollText, type LucideIcon } from 'lucide-react';
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
} from '@/components/panel/search/PaletteFrame';
import {
  ADMIN_RECENT_KEY,
  clearRecent,
  formatPaletteDate,
  matchesQuery,
  readRecent,
  rememberRecent,
  type RecentEntry,
} from '@/components/panel/search/search-utils';
import { useAdminTranslation } from './AdminTranslationProvider';
import {
  getAdminNav,
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

interface QuickAction {
  key: string;
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  keywords: string[];
}

type Item =
  | { kind: 'action'; key: string; action: QuickAction }
  | { kind: 'recent'; key: string; entry: RecentEntry }
  | { kind: 'nav'; key: string; leaf: AdminNavLeaf; group: string | null }
  | { kind: 'restaurant'; key: string; hit: RestaurantHit }
  | { kind: 'customer'; key: string; hit: CustomerHit };

interface Section {
  id: string;
  title: string;
  items: Item[];
  count?: number;
  action?: ReactNode;
  pending?: boolean;
}

const RESULT_LIMIT = 8;
const SEARCH_DEBOUNCE_MS = 250;
const MIN_SEARCH_LENGTH = 2;
const EMPTY_PAGE_LIMIT = 12;
const ADMIN_PREFIX = '/admin';

type Copy = Record<AdminNavLocale, string>;

/** One-line description per admin page; the nav group name is the fallback. */
const PAGE_DESCRIPTIONS: Record<string, Copy> = {
  '/admin/dashboard': { tr: 'Platformun genel durumu', en: 'Platform overview' },
  '/admin/reviews': { tr: 'Tüm işletmelerin yorum kutusu', en: 'Review inbox across businesses' },
  '/admin/analytics': { tr: 'Puan, hacim ve büyüme raporları', en: 'Rating, volume and growth reports' },
  '/admin/qr': { tr: 'İşletmelerin QR kodları', en: "Businesses' QR codes" },
  '/admin/restaurants': { tr: "İşletmeler ve franchise'lar", en: 'Businesses and franchises' },
  '/admin/audits/templates': { tr: 'Hazır denetim şablonları', en: 'Ready-made audit templates' },
  '/admin/audits/categories': { tr: 'Şablon kategorileri', en: 'Template categories' },
  '/admin/audits/stats': { tr: 'Denetim sonuçlarının özeti', en: 'Summary of audit results' },
  '/admin/members': { tr: 'Hesaplar, paketler ve faturalar', en: 'Accounts, plans and billing' },
  '/admin/users': { tr: 'Buaze ekibi ve yetkiler', en: 'Buaze team and permissions' },
  '/admin/customers': { tr: 'Geri bildirim bırakan müşteriler', en: 'Customers who left feedback' },
  '/admin/plans': { tr: 'Paketler ve modüller', en: 'Plans and modules' },
  '/admin/blog': { tr: 'Blog yazıları', en: 'Blog posts' },
  '/admin/announcements': { tr: 'Panel duyuruları', en: 'Panel announcements' },
  '/admin/legal-documents': { tr: 'KVKK, koşullar ve değişkenler', en: 'Privacy, terms and variables' },
  '/admin/site-settings': { tr: 'Logo, paylaşım görseli ve site bilgileri', en: 'Logo, share image and site details' },
  '/admin/newsletters': { tr: 'Bülten aboneleri', en: 'Newsletter subscribers' },
  '/admin/newsletters/campaigns': { tr: 'Aylık bülten gönderimleri', en: 'Monthly newsletter sends' },
  '/admin/mail-templates': { tr: 'E-posta metinleri', en: 'Email copy' },
  '/admin/dev/lifecycle-emails': { tr: 'Otomatik e-posta kayıtları', en: 'Automatic email log' },
  '/admin/dev/mail-preview': { tr: 'E-posta şablonlarını önizleyin', en: 'Preview email templates' },
  '/admin/api': { tr: 'API anahtarları', en: 'API keys' },
  '/admin/audit-logs': { tr: 'Kim, ne zaman, neyi değiştirdi', en: 'Who changed what, and when' },
  '/admin/google': { tr: 'Business Profile bağlantıları', en: 'Business Profile connections' },
  '/admin/profile': { tr: 'Hesabınız, şifre ve dil', en: 'Your account, password and language' },
};

const COPY: Record<
  AdminNavLocale,
  {
    title: string;
    placeholder: string;
    close: string;
    cancel: string;
    clear: string;
    results: string;
    move: string;
    open: string;
    actions: string;
    recent: string;
    clearRecent: string;
    pages: string;
    businesses: string;
    newBusinesses: string;
    customers: string;
    latestCustomers: string;
    business: string;
    customer: string;
    page: string;
    searching: string;
    noResults: (q: string) => string;
    noResultsBody: string;
    count: (n: number) => string;
  }
> = {
  tr: {
    title: 'Yönetimde ara',
    placeholder: 'Sayfa, işletme ya da müşteri ara',
    close: 'Kapat',
    cancel: 'Vazgeç',
    clear: 'Aramayı temizle',
    results: 'Arama sonuçları',
    move: 'gez',
    open: 'aç',
    actions: 'Hızlı işlemler',
    recent: 'Son açılanlar',
    clearRecent: 'Temizle',
    pages: 'Sayfalar',
    businesses: 'İşletmeler',
    newBusinesses: 'Yeni işletmeler',
    customers: 'Müşteriler',
    latestCustomers: 'Son müşteriler',
    business: 'İşletme',
    customer: 'Müşteri',
    page: 'Sayfa',
    searching: 'Aranıyor',
    noResults: (q) => `“${q}” için sonuç yok`,
    noResultsBody: 'Farklı bir kelime deneyin ya da kısaltın. İşletmeler adıyla, müşteriler ad ve e-postayla aranır.',
    count: (n) => `${n} sonuç`,
  },
  en: {
    title: 'Search admin',
    placeholder: 'Search pages, businesses or customers',
    close: 'Close',
    cancel: 'Cancel',
    clear: 'Clear search',
    results: 'Search results',
    move: 'move',
    open: 'open',
    actions: 'Quick actions',
    recent: 'Recently opened',
    clearRecent: 'Clear',
    pages: 'Pages',
    businesses: 'Businesses',
    newBusinesses: 'New businesses',
    customers: 'Customers',
    latestCustomers: 'Latest customers',
    business: 'Business',
    customer: 'Customer',
    page: 'Page',
    searching: 'Searching',
    noResults: (q) => `No results for “${q}”`,
    noResultsBody: 'Try another word or a shorter one. Businesses are searched by name, customers by name and email.',
    count: (n) => `${n} results`,
  },
};

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

const pathOf = (href: string) => href.split('?')[0];

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
  const listId = useId();

  // Visible pages (role + staff grants applied) with their nav group name.
  const navLeaves = useMemo(() => {
    const out: Array<{ leaf: AdminNavLeaf; group: string | null }> = [];
    for (const entry of getAdminNav(toAdminNavRole(role), new Set(permissions))) {
      if (entry.type === 'item') out.push({ leaf: entry, group: null });
      else for (const child of entry.children) out.push({ leaf: child, group: entry.label[navLocale] });
    }
    return out;
  }, [role, permissions, navLocale]);
  const leafByPath = useMemo(() => new Map(navLeaves.map((n) => [n.leaf.href, n.leaf])), [navLeaves]);
  const canSeeRestaurants = leafByPath.has('/admin/restaurants');
  const canSeeCustomers = leafByPath.has('/admin/customers');

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [latest, setLatest] = useState<{ restaurants: RestaurantHit[]; customers: CustomerHit[] }>({
    restaurants: [],
    customers: [],
  });
  const [found, setFound] = useState<{ restaurants: RestaurantHit[]; customers: CustomerHit[] }>({
    restaurants: [],
    customers: [],
  });
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [now, setNow] = useState(() => Date.now());

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

  // Fresh start on every open; recents re-read from storage.
  useEffect(() => {
    if (open) {
      setRecent(readRecent(ADMIN_RECENT_KEY, ADMIN_PREFIX));
      setNow(Date.now());
      return;
    }
    setQuery('');
    setDebounced('');
    setActiveIdx(0);
  }, [open]);

  // Latest businesses / customers, loaded once on first open.
  const latestStartedRef = useRef(false);
  useEffect(() => {
    if (!open || latestStartedRef.current) return;
    if (!canSeeRestaurants && !canSeeCustomers) return;
    latestStartedRef.current = true;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [restData, custData] = await Promise.all([
        canSeeRestaurants ? fetchJson(`/api/restaurants?status=all&limit=${RESULT_LIMIT}&fields=options`) : null,
        canSeeCustomers ? fetchJson(`/api/admin/customers?limit=${RESULT_LIMIT}`) : null,
      ]);
      if (cancelled) return;
      setLatest({ restaurants: parseRestaurants(restData), customers: parseCustomers(custData) });
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

  // Server-side search — the latest lists only hold a handful of rows, so
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

  // Quick actions, only for pages this admin can open.
  const actions = useMemo<QuickAction[]>(() => {
    const isTr = navLocale === 'tr';
    const list: Array<QuickAction & { requires: string }> = [
      {
        key: 'action-unanswered',
        requires: '/admin/reviews',
        href: '/admin/reviews?hasReply=pending',
        label: isTr ? 'Yanıtsız yorumlar' : 'Unanswered reviews',
        description: isTr ? 'Tüm işletmelerde yanıt bekleyenler' : 'Waiting for a reply, all businesses',
        icon: Reply,
        keywords: ['yanıt', 'yanıtsız', 'reply', 'unanswered', 'yorum', 'review'],
      },
      {
        key: 'action-franchise',
        requires: '/admin/restaurants',
        href: '/admin/restaurants?view=franchise',
        label: isTr ? "Franchise'ları gör" : 'View franchises',
        description: isTr ? 'Birden çok işletmesi olan sahipler' : 'Owners with more than one business',
        icon: Network,
        keywords: ['franchise', 'zincir', 'chain', 'şube', 'branch', 'sahip', 'owner'],
      },
      {
        key: 'action-analytics',
        requires: '/admin/analytics',
        href: '/admin/analytics',
        label: isTr ? 'Analitik raporu' : 'Analytics report',
        description: isTr ? 'Puan, hacim ve büyüme raporları' : 'Rating, volume and growth reports',
        icon: BarChart3,
        keywords: ['analitik', 'rapor', 'analytics', 'report'],
      },
      {
        key: 'action-audit-log',
        requires: '/admin/audit-logs',
        href: '/admin/audit-logs',
        label: isTr ? 'Son değişiklikler' : 'Recent changes',
        description: isTr ? 'Denetim kaydında kim, neyi değiştirdi' : 'Who changed what, from the audit log',
        icon: ScrollText,
        keywords: ['denetim', 'kayıt', 'audit', 'log', 'değişiklik', 'changes'],
      },
    ];
    return list.filter((a) => leafByPath.has(a.requires));
  }, [leafByPath, navLocale]);

  const q = query.trim();

  const visibleRecent = useMemo(
    () =>
      recent.filter((entry) =>
        entry.kind === 'business' ? canSeeRestaurants : leafByPath.has(pathOf(entry.href)),
      ),
    [recent, canSeeRestaurants, leafByPath],
  );

  const sections = useMemo<Section[]>(() => {
    const out: Section[] = [];
    const pages: Item[] = navLeaves
      .filter(({ leaf }) => matchesQuery([leaf.label.tr, leaf.label.en, ...(leaf.keywords ?? [])], q))
      .map(({ leaf, group }) => ({ kind: 'nav', key: `nav-${leaf.href}`, leaf, group }));
    const toRestaurantItems = (list: RestaurantHit[]): Item[] =>
      list.map((hit) => ({ kind: 'restaurant', key: `restaurant-${hit.id}`, hit }));
    const toCustomerItems = (list: CustomerHit[]): Item[] =>
      list.map((hit) => ({ kind: 'customer', key: `customer-${hit.id}`, hit }));

    if (!q) {
      if (actions.length > 0) {
        out.push({ id: 'actions', title: copy.actions, items: actions.map((action) => ({ kind: 'action', key: action.key, action })) });
      }
      if (visibleRecent.length > 0) {
        out.push({
          id: 'recent',
          title: copy.recent,
          items: visibleRecent.map((entry) => ({ kind: 'recent', key: `recent-${entry.href}`, entry })),
          action: (
            <GroupAction
              label={copy.clearRecent}
              onClick={() => {
                clearRecent(ADMIN_RECENT_KEY);
                setRecent([]);
                setActiveIdx(0);
              }}
            />
          ),
        });
      }
      out.push({ id: 'pages', title: copy.pages, items: pages.slice(0, EMPTY_PAGE_LIMIT) });
      if (latest.restaurants.length > 0) {
        out.push({ id: 'restaurants', title: copy.newBusinesses, items: toRestaurantItems(latest.restaurants) });
      }
      if (latest.customers.length > 0) {
        out.push({ id: 'customers', title: copy.latestCustomers, items: toCustomerItems(latest.customers) });
      }
      return out;
    }

    const matchingActions = actions.filter((a) => matchesQuery([a.label, ...a.keywords], q));
    if (matchingActions.length > 0) {
      out.push({ id: 'actions', title: copy.actions, items: matchingActions.map((action) => ({ kind: 'action', key: action.key, action })) });
    }
    if (pages.length > 0) out.push({ id: 'pages', title: copy.pages, items: pages, count: pages.length });

    // One character: narrow the latest lists locally; two or more: server results.
    const server = q.length >= MIN_SEARCH_LENGTH;
    const searching = server && (debounced !== q || loading);
    const restaurants = server
      ? found.restaurants
      : latest.restaurants.filter((r) => matchesQuery([r.name, r.category], q));
    const customers = server
      ? found.customers
      : latest.customers.filter((c) => matchesQuery([c.name, c.email, c.restaurantName], q));
    if (canSeeRestaurants && (restaurants.length > 0 || searching)) {
      out.push({
        id: 'restaurants',
        title: copy.businesses,
        items: toRestaurantItems(restaurants),
        count: restaurants.length > 0 && !searching ? restaurants.length : undefined,
        pending: searching,
      });
    }
    if (canSeeCustomers && (customers.length > 0 || searching)) {
      out.push({
        id: 'customers',
        title: copy.customers,
        items: toCustomerItems(customers),
        count: customers.length > 0 && !searching ? customers.length : undefined,
        pending: searching,
      });
    }
    return out;
  }, [actions, canSeeCustomers, canSeeRestaurants, copy, debounced, found, latest, loading, navLeaves, q, visibleRecent]);

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  // Keep the selection inside the list as results change.
  useEffect(() => {
    if (activeIdx >= flat.length) setActiveIdx(Math.max(0, flat.length - 1));
  }, [flat.length, activeIdx]);

  const navigate = useCallback(
    (item: Item) => {
      let href: string;
      if (item.kind === 'action') {
        href = item.action.href;
        rememberRecent(ADMIN_RECENT_KEY, ADMIN_PREFIX, { href, label: item.action.label, kind: 'page' });
      } else if (item.kind === 'recent') {
        href = item.entry.href;
        rememberRecent(ADMIN_RECENT_KEY, ADMIN_PREFIX, {
          href,
          label: item.entry.label,
          kind: item.entry.kind,
          sub: item.entry.sub,
        });
      } else if (item.kind === 'nav') {
        href = item.leaf.href;
        rememberRecent(ADMIN_RECENT_KEY, ADMIN_PREFIX, { href, label: item.leaf.label[navLocale], kind: 'page' });
      } else if (item.kind === 'restaurant') {
        href = `/admin/restaurants/${item.hit.id}`;
        rememberRecent(ADMIN_RECENT_KEY, ADMIN_PREFIX, {
          href,
          label: item.hit.name,
          kind: 'business',
          sub: item.hit.category ?? undefined,
        });
      } else {
        // Customers are not kept in "recently opened" (personal data).
        // The customers page opens its detail drawer from `?detail=<row key>`.
        href = `/admin/customers?detail=${encodeURIComponent(item.hit.id)}`;
      }
      setOpen(false);
      router.push(href);
    },
    [navLocale, router],
  );

  if (!open) return null;

  const pending = sections.some((s) => s.pending);
  const showEmpty = q.length > 0 && flat.length === 0 && !pending;
  const status = pending ? copy.searching : showEmpty ? copy.noResults(q) : copy.count(flat.length);

  let running = -1;
  const renderItem = (item: Item) => {
    running += 1;
    const index = running;
    const common = {
      listId,
      index,
      active: index === activeIdx,
      onHover: setActiveIdx,
      onSelect: () => navigate(item),
    };

    if (item.kind === 'action') {
      return (
        <PaletteOption
          key={item.key}
          {...common}
          leading={<PaletteIcon icon={item.action.icon} />}
          primary={<Highlight text={item.action.label} query={q} />}
          secondary={item.action.description}
        />
      );
    }
    if (item.kind === 'recent') {
      const { entry } = item;
      const leaf = entry.kind === 'page' ? leafByPath.get(pathOf(entry.href)) : undefined;
      return (
        <PaletteOption
          key={item.key}
          {...common}
          leading={entry.kind === 'business' ? <PaletteAvatar name={entry.label} /> : <PaletteIcon icon={leaf?.icon ?? History} />}
          primary={entry.label}
          secondary={
            entry.kind === 'business'
              ? entry.sub || copy.business
              : (leaf && PAGE_DESCRIPTIONS[leaf.href]?.[navLocale]) || copy.page
          }
          trailing={formatPaletteDate(entry.at, navLocale, now)}
        />
      );
    }
    if (item.kind === 'nav') {
      return (
        <PaletteOption
          key={item.key}
          {...common}
          leading={<PaletteIcon icon={item.leaf.icon} />}
          primary={<Highlight text={item.leaf.label[navLocale]} query={q} />}
          secondary={PAGE_DESCRIPTIONS[item.leaf.href]?.[navLocale] ?? item.group ?? undefined}
        />
      );
    }
    if (item.kind === 'restaurant') {
      return (
        <PaletteOption
          key={item.key}
          {...common}
          leading={<PaletteAvatar name={item.hit.name} />}
          primary={<Highlight text={item.hit.name} query={q} />}
          secondary={item.hit.category ? <Highlight text={item.hit.category} query={q} /> : copy.business}
        />
      );
    }
    const c = item.hit;
    const name = c.name?.trim() || c.email || copy.customer;
    const detail = [c.restaurantName, c.name ? c.email : null].filter(Boolean).join(' · ');
    return (
      <PaletteOption
        key={item.key}
        {...common}
        leading={<PaletteAvatar name={name} />}
        primary={<Highlight text={name} query={q} />}
        secondary={detail ? <Highlight text={detail} query={q} /> : copy.customer}
      />
    );
  };

  return (
    <PaletteFrame
      label={copy.title}
      listId={listId}
      query={query}
      onQueryChange={(value) => {
        setQuery(value);
        setActiveIdx(0);
      }}
      placeholder={copy.placeholder}
      loading={loading}
      count={flat.length}
      activeIndex={activeIdx}
      onActiveIndexChange={setActiveIdx}
      onSubmit={(index) => {
        const item = flat[index];
        if (item) navigate(item);
      }}
      onClose={() => setOpen(false)}
      status={status}
      copy={{
        clear: copy.clear,
        close: copy.close,
        cancel: copy.cancel,
        results: copy.results,
        move: copy.move,
        open: copy.open,
      }}
    >
      {showEmpty ? (
        <PaletteEmpty title={copy.noResults(q)} body={copy.noResultsBody} />
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
