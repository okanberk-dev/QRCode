'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Home, Tag, Sparkles, LayoutDashboard, QrCode, Mail } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { useMarketingAuth } from '@/hooks/useMarketingAuth';

interface MobileBottomNavProps {
  locale: Locale;
  /** Deprecated and ignored — the auth state comes from useMarketingAuth. */
  isLoggedIn?: boolean;
}

/** Tiny haptic tick where supported (Android); iOS ignores it. */
function tapHaptic() {
  if (typeof navigator === 'undefined') return;
  try {
    navigator.vibrate?.(8);
  } catch {
    /* ignore */
  }
}

/**
 * Floating bottom navigation for phones and tablets (below `lg`), mounted
 * by MarketingFooter so every marketing page has it.
 *
 * - The footer reserves the space under the pill (its bottom padding), so
 *   pages end cleanly above it; this component adds no spacer of its own.
 * - Server HTML shows the visitor state (free-trial button); after the
 *   `/api/auth/me` probe a signed-in user sees "Panel" instead.
 * - Solid white surface and #525252 labels keep text at ≥ 4.5:1 over any
 *   page content; every item has a visible focus ring.
 * - Hidden while the mobile menu drawer is open (`buaze:mobile-drawer`).
 */
export default function MobileBottomNav({ locale }: MobileBottomNavProps) {
  const pathname = usePathname();
  const base = `/${locale}`;
  const isTr = locale === 'tr';
  const { isLoggedIn, source } = useMarketingAuth();
  const isAdmin = source === 'admin';

  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => {
    const onDrawer = (e: Event) => {
      setDrawerOpen(Boolean((e as CustomEvent<{ open: boolean }>).detail?.open));
    };
    window.addEventListener('buaze:mobile-drawer', onDrawer);
    return () => window.removeEventListener('buaze:mobile-drawer', onDrawer);
  }, []);

  const current = (pathname || '').replace(/\/+$/, '') || '/';
  const isActive = (href: string) => {
    const target = href.replace(/\/+$/, '') || '/';
    if (target === base) return current === base;
    return current === target || current.startsWith(`${target}/`);
  };

  const center = isLoggedIn
    ? {
        href: isAdmin ? '/admin/dashboard' : `${base}/dashboard`,
        label: isAdmin ? (isTr ? 'Admin paneli' : 'Admin panel') : 'Panel',
        Icon: LayoutDashboard,
        rel: undefined,
      }
    : {
        href: `${base}/auth/register`,
        label: isTr ? 'Ücretsiz deneme' : 'Free trial',
        Icon: Sparkles,
        rel: 'nofollow',
      };

  const items = [
    { href: base, label: isTr ? 'Ana sayfa' : 'Home', Icon: Home },
    { href: `${base}/pricing`, label: isTr ? 'Fiyatlandırma' : 'Pricing', Icon: Tag },
    null, // centre action
    { href: `${base}/solutions/qr-generator`, label: isTr ? 'QR oluştur' : 'QR generator', Icon: QrCode },
    { href: `${base}/contact`, label: isTr ? 'İletişim' : 'Contact', Icon: Mail },
  ];

  return (
    <nav
      aria-label={isTr ? 'Mobil alt menü' : 'Mobile bottom navigation'}
      aria-hidden={drawerOpen ? 'true' : undefined}
      inert={drawerOpen}
      className={`fixed bottom-0 left-3 right-3 z-40 mx-auto max-w-[520px] transition-[opacity,transform] duration-200 ease-out lg:hidden ${
        drawerOpen ? 'pointer-events-none translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      }`}
      // Wrapper anchored at bottom: 0; only the padding follows the iOS
      // safe area, so the pill never jumps when the toolbar shows/hides.
      style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="rounded-[28px] border border-[#E5E5E5] bg-white shadow-[0_12px_30px_-12px_rgba(10,10,10,0.28)]">
        <ul className="flex h-[72px] items-stretch justify-around px-1.5">
          {items.map((item) => {
            if (!item) {
              const active = isActive(center.href);
              return (
                <li key="center" className="relative flex flex-1 items-end justify-center pb-2">
                  <Link
                    href={center.href}
                    rel={center.rel}
                    onClick={tapHaptic}
                    aria-current={active ? 'page' : undefined}
                    className="group flex flex-col items-center gap-1 rounded-2xl px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2"
                  >
                    <span
                      aria-hidden="true"
                      className="-mt-7 flex h-[52px] w-[52px] items-center justify-center rounded-full border-4 border-white bg-[#C6F24E] shadow-[0_10px_22px_-8px_rgba(120,160,20,0.7)] transition-transform duration-200 group-hover:bg-[#A8D62E] group-active:scale-90"
                    >
                      <center.Icon size={22} strokeWidth={2} className="text-[#0A0A0A]" />
                    </span>
                    <span className="text-center text-[10px] font-semibold leading-[1.15] text-[#0A0A0A]">
                      {center.label}
                    </span>
                  </Link>
                </li>
              );
            }

            const active = isActive(item.href);
            return (
              <li key={item.href} className="relative flex flex-1">
                <Link
                  href={item.href}
                  onClick={tapHaptic}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex w-full flex-col items-center justify-center gap-1 rounded-2xl px-0.5 transition-colors duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0A0A0A] ${
                    active ? 'text-[#0A0A0A]' : 'text-[#525252] hover:text-[#0A0A0A]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute top-1.5 h-1 w-1 rounded-full bg-[#A8D62E] transition-opacity duration-200 ${
                      active ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  <item.Icon size={20} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                  <span
                    className={`whitespace-nowrap text-[10px] leading-none tracking-[-0.01em] ${
                      active ? 'font-semibold' : 'font-medium'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
