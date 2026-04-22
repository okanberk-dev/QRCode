'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Tag, Sparkles, LayoutDashboard, QrCode, Mail } from 'lucide-react';
import type { Locale } from '@/lib/translations';

interface MobileBottomNavProps {
  locale: Locale;
  isLoggedIn?: boolean;
}

/**
 * Mobile-only sticky bottom navigation.
 * Always fixed at the bottom of the viewport on screens < md.
 * Does not move on scroll (up OR down) — pure fixed positioning.
 * Respects iOS safe-area insets.
 */
export default function MobileBottomNav({ locale, isLoggedIn }: MobileBottomNavProps) {
  const pathname = usePathname();
  const base = `/${locale}`;

  // Normalize the current path so that trailing slashes don't break matching.
  const current = pathname.replace(/\/+$/, '') || '/';

  const isActive = (href: string) => {
    const target = href.replace(/\/+$/, '') || '/';
    if (target === base) return current === base;
    return current === target || current.startsWith(`${target}/`);
  };

  const items = [
    {
      href: base,
      label: locale === 'tr' ? 'Ana Sayfa' : 'Home',
      Icon: Home,
    },
    {
      href: `${base}/pricing`,
      label: locale === 'tr' ? 'Fiyatlar' : 'Pricing',
      Icon: Tag,
    },
    // Center prominent CTA (either "Try Free" or "Dashboard")
    {
      center: true as const,
      href: isLoggedIn ? `${base}/dashboard` : `${base}/auth/register`,
      label: isLoggedIn
        ? locale === 'tr'
          ? 'Panel'
          : 'Panel'
        : locale === 'tr'
        ? 'Ücretsiz'
        : 'Try Free',
      Icon: isLoggedIn ? LayoutDashboard : Sparkles,
    },
    {
      href: `${base}/#qr-generator`,
      label: locale === 'tr' ? 'QR Kod' : 'QR Code',
      Icon: QrCode,
    },
    {
      href: `${base}/contact`,
      label: locale === 'tr' ? 'İletişim' : 'Contact',
      Icon: Mail,
    },
  ];

  return (
    <>
      {/* Spacer so page content never hides behind the fixed nav */}
      <div
        aria-hidden="true"
        className="md:hidden w-full"
        style={{ height: 'calc(68px + env(safe-area-inset-bottom, 0px))' }}
      />

      <nav
        aria-label={locale === 'tr' ? 'Mobil alt menü' : 'Mobile bottom navigation'}
        className="md:hidden fixed bottom-0 left-0 right-0 z-[95] bg-white border-t-[2.5px] border-[#1A2332] shadow-[0_-4px_0_0_rgba(14, 21, 37,0.04)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <ul className="flex items-stretch justify-around h-[68px] max-w-[520px] mx-auto px-2">
          {items.map((item) => {
            const active = isActive(item.href);

            if ('center' in item && item.center) {
              // Prominent raised center CTA
              return (
                <li key={item.href} className="flex-1 flex items-start justify-center -mt-5">
                  <Link
                    href={item.href}
                    className="flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-full bg-[#F4B400] border-[2.5px] border-[#1A2332] shadow-sm active:translate-y-[3px] active:shadow-none transition-all"
                    aria-label={item.label}
                  >
                    <item.Icon size={22} className="text-[#1A2332]" strokeWidth={2} />
                  </Link>
                </li>
              );
            }

            return (
              <li key={item.href} className="flex-1 relative">
                <Link
                  href={item.href}
                  className={`relative h-full flex flex-col items-center justify-center gap-1 px-1 py-2 transition-colors ${
                    active ? 'text-[#1A2332]' : 'text-[#2A3444]'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <item.Icon
                    size={20}
                    strokeWidth={active ? 2.5 : 2}
                    className={active ? 'text-[#F4B400]' : 'text-[#2A3444]'}
                  />
                  <span
                    className={`text-[10px] leading-none tracking-tight ${
                      active ? 'font-extrabold text-[#1A2332]' : 'font-semibold text-[#2A3444]'
                    }`}
                  >
                    {item.label}
                  </span>
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute top-0 w-8 h-[3px] bg-[#F4B400] rounded-b-full"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
