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
 * Fire a tiny haptic tick on tap when the device supports it. iOS Safari
 * ignores the API but Android Chrome / most PWAs honour it. Wrapped in a
 * try/catch so a stray browser quirk never blocks navigation.
 */
function tapHaptic() {
  if (typeof navigator === 'undefined') return;
  try {
    navigator.vibrate?.(8);
  } catch {
    /* swallow */
  }
}

/**
 * Mobile-only sticky bottom navigation.
 * Always fixed at the bottom of the viewport on screens < md.
 * Does not move on scroll (up OR down) — pure fixed positioning.
 * Respects iOS safe-area insets, design parity with `buaze-mobil/layout.jsx`.
 *
 * UX hardening:
 *  - Scale-on-tap (active:scale-95 on items, scale-90 on FAB) for haptic feel
 *  - navigator.vibrate(8) tick where supported
 *  - focus-visible lime ring for keyboard navigation
 *  - prefers-reduced-motion auto-disables transitions via globals.css blanket
 *  - Active indicator uses CSS transition so route changes ease in
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
      {/* Spacer so page content never hides behind the fixed nav.
          Stage 60 §38.141 — HANDOFF floating pill paterni: 72px height +
          12px lateral margin + 12px bottom-margin → spacer ~96px + safe-area
          (eski 72px + safe-area). Content kayma önleme. */}
      <div
        aria-hidden="true"
        className="lg:hidden w-full"
        style={{ height: 'calc(72px + 24px + env(safe-area-inset-bottom, 0px))' }}
      />

      <nav
        aria-label={locale === 'tr' ? 'Mobil alt menü' : 'Mobile bottom navigation'}
        className="lg:hidden fixed left-3 right-3 z-40 mx-auto max-w-[520px]"
        style={{
          // Stage 60 §38.141 — HANDOFF floating pill paterni: 12px bottom
          // margin + safe-area inset (iOS home-indicator overlap önleme).
          bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          // iOS Safari fix: dinamik bottom-toolbar transition'ında fixed
          // element'in viewport ile re-position'ı titreşime yol açıyor.
          // GPU compositing layer'a taşımak nav'ı sayfa render'ından izole
          // eder, scroll esnasındaki "bir üste çıkma" glitch'ini önler.
          transform: 'translate3d(0, 0, 0)',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* Floating pill container — Stage 60 §38.141 HANDOFF birebir.
            Glassmorphism: backdrop-blur(20px) saturate(180%) + translucent
            white surface (rgba 0.85). Border subtle + shadow drop floating
            depth. 28px borderRadius + 72px height. */}
        <div
          className="rounded-[28px] border border-[rgba(10,10,10,0.06)] shadow-[0_12px_30px_-12px_rgba(10,10,10,0.25)]"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}
        >
          <ul className="flex h-[72px] items-center justify-around px-2">
            {items.map((item) => {
              const active = isActive(item.href);

              if ('center' in item && item.center) {
                // Stage 60 §38.141 — HANDOFF center FAB: 56×56 (eski 52×52)
                // + `-mt-7` (eski -mt-5) agresif elevation + 4px solid white
                // border (pill bg ile harmanı kesen lime hot spot) + lime
                // drop shadow `0 12px 24px -6px lime`. Active state scale 1.06
                // sticky press feedback.
                return (
                  <li key={item.href} className="relative flex flex-1 items-center justify-center">
                    <Link
                      href={item.href}
                      onClick={tapHaptic}
                      className={`-mt-7 flex h-[56px] w-[56px] items-center justify-center rounded-full bg-[#C6F24E] shadow-[0_12px_24px_-6px_rgba(198,242,78,0.7)] transition-transform duration-200 hover:bg-[#A8D62E] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                        active ? 'scale-[1.06]' : ''
                      }`}
                      style={{ border: '4px solid #FAFAFA' }}
                      aria-label={item.label}
                    >
                      <item.Icon size={22} className="text-[#0A0A0A]" strokeWidth={2} />
                    </Link>
                  </li>
                );
              }

              return (
                <li key={item.href} className="relative flex-1">
                  <Link
                    href={item.href}
                    onClick={tapHaptic}
                    className={`relative flex h-full flex-col items-center justify-center gap-1 rounded-md px-1 py-2 transition-all duration-150 active:scale-95 focus-visible:outline-none ${
                      active ? 'text-[#0A0A0A]' : 'text-[rgba(10,10,10,0.42)]'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <item.Icon
                      size={20}
                      strokeWidth={active ? 2 : 1.6}
                      className={`transition-colors duration-150 ${
                        active ? 'text-[#0A0A0A]' : 'text-[rgba(10,10,10,0.42)]'
                      }`}
                    />
                    <span
                      className={`text-[10px] leading-none tracking-tight transition-colors duration-150 ${
                        active ? 'font-bold text-[#0A0A0A]' : 'font-medium text-[rgba(10,10,10,0.42)]'
                      }`}
                    >
                      {item.label}
                    </span>
                    {/* Stage 60 §38.141 — HANDOFF active dot indicator (4×4
                        lime, top-aligned with translateY -100%). Opacity fade
                        on route change. Eski 32×2 graphite bar yerine subtle
                        lime dot pulse — modern minimal accent. */}
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute top-1 left-1/2 h-1 w-1 -translate-x-1/2 -translate-y-full rounded-full bg-[#C6F24E] transition-opacity duration-200 ${
                        active ? 'opacity-100' : 'opacity-0'
                      }`}
                      style={{
                        boxShadow: active ? '0 0 8px rgba(198,242,78,0.8)' : 'none',
                      }}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </>
  );
}
