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
      href: `${base}/solutions/qr-generator`,
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
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#EDEDED]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <ul className="flex items-stretch justify-around h-[68px] max-w-[520px] mx-auto px-2">
          {items.map((item) => {
            const active = isActive(item.href);

            if ('center' in item && item.center) {
              // Prominent center CTA — flat Pulse circle with lime glow.
              // 52x52 + -20mt + shadow blur 16 mirrors design buaze-mobil
              // bundle (layout.jsx:534) so the FAB lifts above the bar.
              return (
                <li key={item.href} className="flex-1 flex items-start justify-center -mt-5">
                  <Link
                    href={item.href}
                    className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#C6F24E] shadow-[0_4px_16px_rgba(198,242,78,0.5)] hover:bg-[#A8D62E] transition-colors"
                    aria-label={item.label}
                  >
                    <item.Icon size={22} className="text-[#0A0A0A]" strokeWidth={2} />
                  </Link>
                </li>
              );
            }

            return (
              <li key={item.href} className="flex-1 relative">
                <Link
                  href={item.href}
                  className={`relative h-full flex flex-col items-center justify-center gap-1 px-1 py-2 transition-colors ${
                    active ? 'text-[#0A0A0A]' : 'text-[#737373]'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <item.Icon
                    size={20}
                    strokeWidth={active ? 2.25 : 2}
                    className={active ? 'text-[#0A0A0A]' : 'text-[#737373]'}
                  />
                  <span
                    className={`text-[10px] leading-none tracking-tight ${
                      active ? 'font-medium text-[#0A0A0A]' : 'font-medium text-[#737373]'
                    }`}
                  >
                    {item.label}
                  </span>
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute top-0 w-8 h-[2px] bg-[#0A0A0A] rounded-b-full"
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
