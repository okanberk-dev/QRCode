'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAdminTranslation } from './AdminTranslationProvider';
import { getActiveAdminHref, getAdminMobileNav, toAdminNavRole } from './admin-nav';

export default function AdminMobileNav({
  role = 'manager',
  permissions = [],
}: {
  role?: string;
  /** Staff grants (`resource:action`) from the admin profile. */
  permissions?: string[];
}) {
  const pathname = usePathname();
  const { locale } = useAdminTranslation();
  const navLocale = locale === 'en' ? 'en' : 'tr';
  // Stage 60 §38.141 — Mobile bottom nav Yorumlar (reviews) badge.
  // NotificationBell `buaze:notification-count` custom event listener;
  // base='/admin' filter — owner tab clobber etmez. Tek source-of-truth
  // NotificationBell internal poll (mobile nav ek fetch yapmaz).
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);
  // Drawer state via custom event broadcast from AdminSidebar
  // (CLAUDE.md §40.D Custom Event paterni — marketing
  // MarketingNavbarClient ile aynı event ismi). Drawer açıkken bottom
  // nav gizlenir — aksi halde DOM order itibariyle floating pill
  // hamburger drawer'ın üzerine çıkıyor (bug raporu: "sidebar açılınca
  // bottom nav hâlâ gözüküyor"). aria-hidden + pointer-events-none ile
  // a11y intact; reduced-motion blanket (globals.css §40.3) altında
  // transition kapanır.
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ base: string; count: number }>).detail;
      if (detail?.base === '/admin') {
        setNotifUnreadCount(detail.count);
      }
    };
    const onDrawer = (event: Event) => {
      const detail = (event as CustomEvent<{ open: boolean }>).detail;
      setDrawerOpen(Boolean(detail?.open));
    };
    window.addEventListener('buaze:notification-count', handler);
    window.addEventListener('buaze:mobile-drawer', onDrawer);
    return () => {
      window.removeEventListener('buaze:notification-count', handler);
      window.removeEventListener('buaze:mobile-drawer', onDrawer);
    };
  }, []);

  // Same catalogue as the sidebar (admin-nav.ts): role gate + staff grants,
  // labels in the admin's language. The bar used to keep its own list, which
  // had no entry for `staff` (empty bar) and Turkish-only labels.
  const filteredItems = getAdminMobileNav(toAdminNavRole(role), new Set(permissions));
  const activeHref = getActiveAdminHref(
    pathname,
    filteredItems.map((item) => item.href),
  );

  if (filteredItems.length === 0) return null;

  return (
    <nav
      aria-label={navLocale === 'en' ? 'Mobile navigation' : 'Mobil menü'}
      aria-hidden={drawerOpen ? 'true' : undefined}
      // z-40 (eski z-50) — CLAUDE.md §40.3 hierarchy: z-30 desktop
      // sticky topbar < z-40 mobile sticky/bottom nav < z-50 modals/
      // drawers. Marketing MobileBottomNav + owner UserDashboardShell
      // bottom nav ile parity. Drawer (z-50) artık üstte kalır + bu
      // component drawer açıkken event ile gizlenir (defensive iki
      // katman).
      // §49 — full-width bottom band in the page colour behind the floating
      // pill: content scrolling under the bar fades out instead of peeking
      // out around and below the pill. The band itself ignores taps; only
      // the pill is interactive. Bottom-anchored padding (§38.169).
      className={`lg:hidden fixed inset-x-0 bottom-0 z-40 px-3 pt-3 pointer-events-none text-[#0A0A0A] transition-[opacity,transform] duration-200 ease-out ${
        drawerOpen
          ? 'translate-y-full opacity-0'
          : 'translate-y-0 opacity-100'
      }`}
      style={{
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        background: 'linear-gradient(to top, #FAFAFA 0%, #FAFAFA 60%, rgba(250,250,250,0) 100%)',
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
      }}
    >
      {/* Floating pill container — Stage 60 §38.141 HANDOFF birebir.
          Glassmorphism backdrop-blur(20px) saturate(180%) + translucent
          white surface. 28px borderRadius + 72px height. */}
      <div
        className={`mx-auto max-w-[520px] rounded-[28px] border border-[rgba(10,10,10,0.06)] shadow-[0_12px_30px_-12px_rgba(10,10,10,0.25)] ${drawerOpen ? 'pointer-events-none' : 'pointer-events-auto'}`}
        style={{
          // §49 — solid surface. The translucent "glass" pill let the
          // page text behind it show through the nav labels (reported as
          // overlapping text on phones).
          background: '#FFFFFF',
        }}
      >
        {/* §38.77 — Dynamic grid: role-filtered item sayısına göre eşit
            dağıtım. Eski `grid-cols-5` hardcoded'du; manager için 4 item
            görünüyordu ama 5 col grid → 1 empty cell + content sola
            kayıyordu. Inline gridTemplateColumns ile filteredItems.length
            eşit-genişlik dağıtım (Tailwind safelist ihtiyacı yok). */}
        <ul
          className="grid h-[72px] items-center px-2"
          style={{ gridTemplateColumns: `repeat(${filteredItems.length}, minmax(0, 1fr))` }}
        >
          {filteredItems.map((item) => {
            const isActive = item.href === activeHref;
            const Icon = item.icon;
            const label = item.label[navLocale];
            const isReviews = item.href === '/admin/reviews';

            return (
              <li key={item.href} className="min-w-0">
                <Link
                  href={item.href}
                  aria-label={label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex h-full flex-col items-center justify-center gap-1 rounded-md px-1 transition-all duration-150 active:scale-95 ${
                    isActive
                      ? 'text-[#0A0A0A]'
                      : 'text-[rgba(10,10,10,0.42)] hover:text-[#0A0A0A]'
                  }`}
                >
                  <span className="relative">
                    <Icon
                      size={20}
                      strokeWidth={isActive ? 2 : 1.6}
                      className="transition-colors duration-150"
                    />
                    {/* Stage 60 §38.141 — Yorumlar badge (NotificationBell
                        unreadCount custom event). 14×14 lime pill, 99+
                        overflow. Visible only when count > 0. */}
                    {isReviews && notifUnreadCount > 0 && (
                      <span
                        aria-hidden="true"
                        className="absolute -right-2 -top-1 inline-flex h-[14px] min-w-[14px] items-center justify-center rounded-[7px] border-2 border-white bg-[#C6F24E] px-[3px] font-mono text-[8px] font-bold text-[#0A0A0A]"
                      >
                        {notifUnreadCount > 99 ? '99+' : notifUnreadCount}
                      </span>
                    )}
                  </span>
                  <span
                    className={`max-w-full truncate text-[10px] leading-none tracking-tight transition-colors duration-150 ${
                      isActive ? 'font-bold text-[#0A0A0A]' : 'font-medium text-[rgba(10,10,10,0.42)]'
                    }`}
                  >
                    {label}
                  </span>
                  {/* Stage 60 §38.141 — Active dot indicator (4×4 lime,
                      top translateY -100%). */}
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute top-1 left-1/2 h-1 w-1 -translate-x-1/2 -translate-y-full rounded-full bg-[#C6F24E] transition-opacity duration-200 ${
                      isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{
                      boxShadow: isActive ? '0 0 8px rgba(198,242,78,0.8)' : 'none',
                    }}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
