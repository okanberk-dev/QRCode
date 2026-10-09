'use client';

/**
 * Admin Cmd+K command palette (§38.219 Stage 139).
 *
 * Owner CommandPalette paterninin admin variant'ı (CLAUDE.md §38.B Stage
 * 110 + §38.D Custom Event broadcast paterni).
 *
 * Trigger paths:
 *   • Cmd+K (Mac) / Ctrl+K (Win) — global keyboard listener
 *   • `buaze:admin-search-open` CustomEvent — dispatched by topbar/sidebar
 *     buttons. Single palette instance handles both desktop + mobile entry.
 *
 * Search sources:
 *   1. Static nav (Dashboard, İşletmeler, Aboneliklier, vb.) — instant filter
 *   2. Recent restaurants (top 8 by createdAt desc) — lazy fetch on open
 *   3. Recent customers (top 8) — lazy fetch on open
 *
 * Modal a11y baseline: focus trap (input auto-focus), ESC + outside click
 * close, ↑↓ navigate, Enter select. Reduced-motion respects globals.css
 * blanket.
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

interface NavItem {
  href: string;
  label: string;
  keywords: string[];
}

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

// Static admin route catalog — synced with AdminSidebar entries.
const ADMIN_NAV: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', keywords: ['ana sayfa', 'home', 'genel görünüm'] },
  { href: '/admin/restaurants', label: 'İşletmeler', keywords: ['restoran', 'restaurant', 'business', 'list'] },
  { href: '/admin/reviews', label: 'Yorumlar', keywords: ['feedback', 'review', 'puan'] },
  { href: '/admin/customers', label: 'Müşteriler', keywords: ['customer', 'son müşteriler'] },
  { href: '/admin/qr', label: 'QR Yönetimi', keywords: ['qr', 'code', 'kod'] },
  { href: '/admin/analytics', label: 'Analitik & Raporlar', keywords: ['analytics', 'reports', 'rapor', 'istatistik'] },
  { href: '/admin/members', label: 'İşletme Sahipleri', keywords: ['owner', 'members', 'sahip'] },
  { href: '/admin/users', label: 'Yöneticiler', keywords: ['admin users', 'staff', 'yönetici'] },
  { href: '/admin/billing', label: 'Faturalandırma', keywords: ['billing', 'fatura', 'ödeme'] },
  { href: '/admin/plans', label: 'Abonelikler / Paketler', keywords: ['plans', 'subscription', 'fiyat', 'tier'] },
  { href: '/admin/campaigns', label: 'Kampanyalar', keywords: ['campaigns', 'qr'] },
  { href: '/admin/newsletters', label: 'Bülten Aboneleri', keywords: ['newsletter', 'subscribers'] },
  { href: '/admin/newsletters/campaigns', label: 'Bülten Kampanyaları', keywords: ['newsletter campaigns'] },
  { href: '/admin/mail-templates', label: 'Mail İçerikleri', keywords: ['mail templates', 'email content'] },
  { href: '/admin/audits/templates', label: 'Denetim Şablonları', keywords: ['audit templates', 'checklist'] },
  { href: '/admin/audits/categories', label: 'Denetim Kategorileri', keywords: ['audit categories'] },
  { href: '/admin/audits/stats', label: 'Denetim İstatistikleri', keywords: ['audit stats', 'analytics'] },
  { href: '/admin/blog', label: 'Blog', keywords: ['blog', 'content', 'yazı'] },
  { href: '/admin/announcements', label: 'Duyurular', keywords: ['announcements', 'banner'] },
  { href: '/admin/legal-documents', label: 'Hukuki Metinler', keywords: ['legal', 'kvkk', 'gizlilik'] },
  { href: '/admin/site-settings', label: 'Site Ayarları', keywords: ['settings', 'site config'] },
  { href: '/admin/api', label: 'API & Webhooks', keywords: ['api', 'webhooks', 'integration'] },
  { href: '/admin/audit-logs', label: 'Audit Log', keywords: ['audit log', 'history', 'activity'] },
  { href: '/admin/profile', label: 'Profil', keywords: ['profile', 'hesap'] },
];

function normalize(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function navMatches(item: NavItem, q: string): boolean {
  if (!q) return true;
  const nq = normalize(q);
  if (normalize(item.label).includes(nq)) return true;
  return item.keywords.some((k) => normalize(k).includes(nq));
}

export default function AdminCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<{
    restaurants: RestaurantHit[];
    customers: CustomerHit[];
  }>({ restaurants: [], customers: [] });
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentLoaded, setRecentLoaded] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
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

  // Focus management — restore focus on close (a11y baseline).
  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement;
      // Focus the input after the modal mounts in DOM.
      const t = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(t);
    } else {
      const prev = previouslyFocused.current;
      if (prev && typeof prev.focus === 'function') prev.focus();
      // Reset state on close.
      setQuery('');
      setActiveIdx(0);
    }
  }, [open]);

  // Lazy load recent restaurants/customers on first open.
  useEffect(() => {
    if (!open || recentLoaded || recentLoading) return;
    let cancelled = false;
    setRecentLoading(true);
    (async () => {
      try {
        const [restRes, custRes] = await Promise.all([
          // /api/restaurants admin actor için admin liste shape döner
          // (Stage 138 §38.218 paralel — admin page'i de aynı endpoint'i
          // kullanır). limit=8 son eklenen 8 işletme.
          fetch('/api/restaurants?limit=8', { cache: 'no-store' }).catch(() => null),
          fetch('/api/admin/customers?limit=8', { cache: 'no-store' }).catch(() => null),
        ]);
        if (cancelled) return;
        const restaurants: RestaurantHit[] = [];
        if (restRes && restRes.ok) {
          const data = await restRes.json().catch(() => null);
          const items = Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : [];
          for (const r of items.slice(0, 8)) {
            if (r && typeof r.id === 'string' && typeof r.name === 'string') {
              restaurants.push({ kind: 'restaurant', id: r.id, name: r.name, category: r.category ?? null });
            }
          }
        }
        const customers: CustomerHit[] = [];
        if (custRes && custRes.ok) {
          const data = await custRes.json().catch(() => null);
          const items = Array.isArray(data?.data) ? data.data : [];
          for (const c of items.slice(0, 8)) {
            if (c && typeof c.id === 'string') {
              customers.push({
                kind: 'customer',
                id: c.id,
                name: typeof c.name === 'string' ? c.name : null,
                email: typeof c.email === 'string' ? c.email : null,
                restaurantName: c.restaurantName ?? null,
              });
            }
          }
        }
        if (!cancelled) {
          setRecent({ restaurants, customers });
          setRecentLoaded(true);
        }
      } finally {
        if (!cancelled) setRecentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, recentLoaded, recentLoading]);

  // Body scroll lock.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const filteredHits = useMemo<Hit[]>(() => {
    const q = query.trim();
    const navHits: Hit[] = ADMIN_NAV.filter((it) => navMatches(it, q)).map((it) => ({
      kind: 'nav' as const,
      href: it.href,
      label: it.label,
    }));
    if (!q) {
      // No query → just static nav items + recent (no filter on recent).
      return [
        ...navHits.slice(0, 12),
        ...recent.restaurants,
        ...recent.customers,
      ];
    }
    const nq = normalize(q);
    const restHits: Hit[] = recent.restaurants.filter((r) => normalize(r.name).includes(nq));
    const custHits: Hit[] = recent.customers.filter((c) => {
      if (c.name && normalize(c.name).includes(nq)) return true;
      if (c.email && normalize(c.email).includes(nq)) return true;
      return false;
    });
    return [...navHits, ...restHits, ...custHits];
  }, [query, recent]);

  const navigate = useCallback(
    (hit: Hit) => {
      let href: string;
      if (hit.kind === 'nav') href = hit.href;
      else if (hit.kind === 'restaurant') href = `/admin/restaurants/${hit.id}`;
      else href = `/admin/customers?focus=${hit.id}`;
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  // Keep activeIdx clamped.
  useEffect(() => {
    if (activeIdx >= filteredHits.length) setActiveIdx(Math.max(0, filteredHits.length - 1));
  }, [filteredHits, activeIdx]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(filteredHits.length - 1, i + 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const hit = filteredHits[activeIdx];
      if (hit) navigate(hit);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Admin arama"
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-[60] flex items-start justify-center bg-[#0A0A0A]/40 backdrop-blur-sm p-4 pt-[12vh] sm:pt-[18vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-[#EDEDED] bg-white shadow-[0_24px_60px_-20px_rgba(10,10,10,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[#EDEDED] px-4 py-3">
          <SearchIcon size={16} className="text-[#737373]" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            placeholder="Sayfa, işletme veya müşteri ara…"
            className="flex-1 border-0 bg-transparent text-[15px] text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:outline-none"
            aria-label="Admin arama"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#737373] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]"
            aria-label="Kapat"
          >
            <X size={14} aria-hidden />
          </button>
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
          {recentLoading && !recentLoaded && (
            <div className="flex items-center gap-2 px-3 py-3 text-[12px] text-[#737373]">
              <Loader2 size={12} className="animate-spin" aria-hidden />
              Yükleniyor…
            </div>
          )}
          {filteredHits.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-[#737373]">
              Eşleşen sonuç yok.
            </p>
          ) : (
            <PaletteList hits={filteredHits} activeIdx={activeIdx} onClick={navigate} onHover={setActiveIdx} />
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#EDEDED] bg-[#FAFAFA] px-3 py-2 text-[10px] text-[#737373]">
          <span className="inline-flex items-center gap-1">
            <KeyHint icon={<ArrowUp size={9} aria-hidden />} />
            <KeyHint icon={<ArrowDown size={9} aria-hidden />} />
            <span>Gez</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <KeyHint icon={<CornerDownLeft size={9} aria-hidden />} />
            <span>Aç</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-[#EDEDED] bg-white px-1.5 py-0.5 font-mono text-[9px] uppercase">
              Esc
            </kbd>
            <span>Kapat</span>
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
}: {
  hits: Hit[];
  activeIdx: number;
  onClick: (hit: Hit) => void;
  onHover: (idx: number) => void;
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
                hit.kind === 'restaurant'
                  ? 'bg-[#EAF9B8] text-[#0A0A0A]'
                  : hit.kind === 'customer'
                    ? 'bg-[#FAFAFA] text-[#525252]'
                    : 'bg-[#FAFAFA] text-[#525252]'
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
                    : hit.name || hit.email || `Müşteri ${hit.id.slice(0, 6)}`}
              </span>
              <span className="block truncate text-[11px] text-[#737373]">
                {hit.kind === 'nav'
                  ? hit.href
                  : hit.kind === 'restaurant'
                    ? hit.category || 'İşletme'
                    : hit.restaurantName || hit.email || 'Müşteri'}
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
