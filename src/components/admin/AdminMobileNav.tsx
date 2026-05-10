'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Store, QrCode, Inbox, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { useAdminTranslation } from './AdminTranslationProvider';

export default function AdminMobileNav({ role = 'manager' }: { role?: string }) {
  const pathname = usePathname();
  const { t } = useAdminTranslation();
  // Stage 60 §38.141 — Mobile bottom nav Yorumlar (reviews) badge.
  // NotificationBell `buaze:notification-count` custom event listener;
  // base='/admin' filter — owner tab clobber etmez. Tek source-of-truth
  // NotificationBell internal poll (mobile nav ek fetch yapmaz).
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ base: string; count: number }>).detail;
      if (detail?.base === '/admin') {
        setNotifUnreadCount(detail.count);
      }
    };
    window.addEventListener('buaze:notification-count', handler);
    return () => window.removeEventListener('buaze:notification-count', handler);
  }, []);

  const navItems = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: t('dashboard'), roles: ['superadmin', 'manager', 'restaurant_owner'] },
    { href: '/admin/restaurants', icon: Store, label: t('restaurants'), roles: ['superadmin', 'restaurant_owner'] },
    { href: '/admin/reviews', icon: Inbox, label: 'Yorumlar', roles: ['superadmin', 'manager', 'restaurant_owner'] },
    { href: '/admin/qr', icon: QrCode, label: t('qr_codes'), roles: ['superadmin', 'manager', 'restaurant_owner'] },
    { href: '/admin/analytics', icon: BarChart3, label: 'Analitik', roles: ['superadmin', 'manager', 'restaurant_owner'] },
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(role));

  return (
    <nav
      aria-label="Mobil navigasyon"
      className="lg:hidden fixed left-3 right-3 z-50 mx-auto max-w-[520px] text-[#0A0A0A]"
      style={{
        // Stage 60 §38.141 — HANDOFF floating pill paterni: 12px bottom
        // margin + safe-area (iOS home-indicator overlap önleme). Eski
        // bottom-0 full-width yerine floating pill modern UX.
        bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Floating pill container — Stage 60 §38.141 HANDOFF birebir.
          Glassmorphism backdrop-blur(20px) saturate(180%) + translucent
          white surface. 28px borderRadius + 72px height. */}
      <div
        className="rounded-[28px] border border-[rgba(10,10,10,0.06)] shadow-[0_12px_30px_-12px_rgba(10,10,10,0.25)]"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
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
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            const Icon = item.icon;
            const isReviews = item.href === '/admin/reviews';

            return (
              <li key={item.href} className="min-w-0">
                <Link
                  href={item.href}
                  aria-label={item.label}
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
                    {item.label}
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
