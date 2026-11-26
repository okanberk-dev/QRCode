'use client';

import {
  BarChart3,
  BookOpen,
  Calculator,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Compass,
  FileQuestion,
  Gift,
  Globe,
  HelpCircle,
  Inbox,
  Info,
  Layers,
  Link2,
  Menu,
  QrCode,
  Sparkles,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/translations';
import { RELATED_SOLUTIONS_LIST } from '@/lib/related-solutions';
import BuazeLogo from './BuazeLogo';
import LanguageLink from './footer/LanguageLink';
import { useMarketingAuth } from '@/hooks/useMarketingAuth';

interface MarketingNavbarClientProps {
  locale: Locale;
  logoUrl?: string | null;
}

type DropdownId = 'product' | 'solutions' | 'resources';

interface NavItem {
  href: string;
  label: string;
  sub?: string;
  icon?: ReactNode;
}

/** Most-visited sectors, shown with a short line each; the rest follow. */
const FEATURED_SECTORS = ['restaurants', 'delivery', 'hotels', 'healthcare', 'beauty-salon', 'retail'] as const;

// One concrete, true line per sector: where the QR goes or which platforms
// matter. Nothing that implies an integration or an automatic trigger.
const SECTOR_SUBLABELS: Record<(typeof FEATURED_SECTORS)[number], { tr: string; en: string }> = {
  restaurants: { tr: 'Masa ve menü QR kodları', en: 'Table and menu QR codes' },
  delivery: { tr: 'Yemeksepeti, Getir, Trendyol GO', en: 'Yemeksepeti, Getir, Trendyol GO' },
  hotels: { tr: 'Booking.com ve Tripadvisor', en: 'Booking.com and Tripadvisor' },
  healthcare: { tr: 'KVKK onayıyla geri bildirim', en: 'Feedback with KVKK consent' },
  'beauty-salon': { tr: 'Resepsiyonda ve aynada QR kodu', en: 'QR codes at the front desk and mirror' },
  retail: { tr: 'Kasada ve vitrinde QR kodu', en: 'QR codes at the till and in the window' },
};

const AUTH_REL = 'nofollow';

export default function MarketingNavbarClient({ locale, logoUrl }: MarketingNavbarClientProps) {
  const isTr = locale === 'tr';
  const base = `/${locale}`;
  const pathname = usePathname() || base;

  // Server HTML and first paint show the visitor CTAs; the shared
  // /api/auth/me probe swaps in "Panel" for signed-in users after hydration.
  const { isLoggedIn, source } = useMarketingAuth();
  const isAdmin = source === 'admin';
  const dashboardHref = isAdmin ? '/admin/dashboard' : `${base}/dashboard`;
  const dashboardLabel = isAdmin ? (isTr ? 'Admin paneli' : 'Admin panel') : isTr ? 'Panel' : 'Dashboard';

  const [open, setOpen] = useState<DropdownId | null>(null);
  const pinnedRef = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const desktopRef = useRef<HTMLDivElement>(null);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<DropdownId | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerId = useId();

  const [scrolled, setScrolled] = useState(false);
  const [floating, setFloating] = useState(false);

  const clearCloseTimer = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  const closeDropdown = useCallback(() => {
    clearCloseTimer();
    pinnedRef.current = false;
    setOpen(null);
  }, []);

  // Hover opens a panel for mouse users; a click/Enter/Space pins it open.
  const hoverOpen = (id: DropdownId) => {
    clearCloseTimer();
    if (pinnedRef.current && open !== id) pinnedRef.current = false;
    setOpen(id);
  };
  const hoverLeave = () => {
    if (pinnedRef.current) return;
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(null), 180);
  };
  const toggleDropdown = (id: DropdownId) => {
    clearCloseTimer();
    if (open === id && pinnedRef.current) {
      pinnedRef.current = false;
      setOpen(null);
      return;
    }
    pinnedRef.current = true;
    setOpen(id);
  };

  // Escape closes everything; outside pointer closes the desktop panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (open) closeDropdown();
      if (mobileOpen) {
        setMobileOpen(false);
        hamburgerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, mobileOpen, closeDropdown]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (desktopRef.current && !desktopRef.current.contains(e.target as Node)) closeDropdown();
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open, closeDropdown]);

  // Close menus on navigation.
  useEffect(() => {
    closeDropdown();
    setMobileOpen(false);
  }, [pathname, closeDropdown]);

  // Scroll state (rAF-throttled): background at >40px, floating pill at >80px (lg+).
  useEffect(() => {
    let ticking = false;
    const apply = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setFloating(y > 80);
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Drawer: lock body scroll, tell MobileBottomNav to hide, move focus in.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    window.dispatchEvent(new CustomEvent('buaze:mobile-drawer', { detail: { open: mobileOpen } }));
    if (mobileOpen) {
      const t = window.setTimeout(() => {
        drawerRef.current?.querySelector<HTMLElement>('button, a[href]')?.focus();
      }, 0);
      return () => {
        window.clearTimeout(t);
        document.body.style.overflow = '';
      };
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Drawer open: the page behind is covered and scroll-locked, so Tab and
  // Shift+Tab cycle through the top bar and the drawer only. The drawer also
  // closes when the viewport reaches the desktop layout (a tablet rotated to
  // landscape) — it is lg:hidden, and the body would otherwise stay locked.
  useEffect(() => {
    if (!mobileOpen) return;
    const desktop = window.matchMedia('(min-width: 1024px)');
    const onViewport = () => {
      if (desktop.matches) setMobileOpen(false);
    };
    onViewport();
    desktop.addEventListener?.('change', onViewport);

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const scopes = [barRef.current, drawerRef.current].filter((el): el is HTMLElement => Boolean(el));
      const items = scopes
        .flatMap((el) =>
          Array.from(
            el.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'),
          ),
        )
        .filter((el) => !el.closest('[inert]') && el.getClientRects().length > 0);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = active instanceof HTMLElement && scopes.some((el) => el.contains(active));
      if (!inside) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      desktop.removeEventListener?.('change', onViewport);
      document.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);

  const closeDrawer = () => {
    setMobileOpen(false);
    hamburgerRef.current?.focus();
  };

  const isCurrent = (href: string) => {
    const current = pathname.replace(/\/+$/, '');
    return current === href || current.startsWith(`${href}/`);
  };

  // ── Information architecture ─────────────────────────────────
  const features: NavItem[] = [
    {
      href: `${base}/features/review-management`,
      label: isTr ? 'Yorum yönetimi' : 'Review management',
      sub: isTr ? 'QR geri bildirimleri tek gelen kutusunda' : 'QR feedback in one inbox',
      icon: <Inbox size={16} />,
    },
    {
      href: `${base}/features/pulse-ai`,
      label: 'Pulse AI',
      sub: isTr ? 'Onayınızla gönderilen yanıt taslakları' : 'Reply drafts you approve',
      icon: <Sparkles size={16} />,
    },
    {
      href: `${base}/features/menu`,
      label: isTr ? 'QR Menü' : 'QR Menu',
      sub: isTr ? 'Dijital menü ve menü analitiği' : 'Digital menu with analytics',
      icon: <UtensilsCrossed size={16} />,
    },
    {
      href: `${base}/features/surveys`,
      label: isTr ? 'Anketler' : 'Surveys',
      sub: isTr ? 'QR ile açılan kısa anketler' : 'Short surveys opened by QR',
      icon: <ClipboardList size={16} />,
    },
    {
      href: `${base}/features/loyalty`,
      label: isTr ? 'Sadakat kartı' : 'Loyalty card',
      sub: isTr ? 'Damga kartı, şubelerde tek kart' : 'Stamp card, one card for all branches',
      icon: <Gift size={16} />,
    },
    {
      href: `${base}/features/audit-center`,
      label: isTr ? 'Denetim Merkezi' : 'Audit Center',
      sub: isTr ? 'Kontrol listeleri ve puanlama' : 'Checklists and scoring',
      icon: <ClipboardCheck size={16} />,
    },
    {
      href: `${base}/features/analytics-reports`,
      label: isTr ? 'Analitik ve raporlar' : 'Analytics and reports',
      sub: isTr ? 'Puan trendi ve dağılımlar' : 'Rating trends and breakdowns',
      icon: <BarChart3 size={16} />,
    },
    {
      href: `${base}/integrations`,
      label: isTr ? 'Platform bağlantıları' : 'Platform links',
      sub: isTr ? '10 yorum platformunun bağlantısı' : 'Links to 10 review platforms',
      icon: <Link2 size={16} />,
    },
  ];

  const featuredSectors: NavItem[] = FEATURED_SECTORS.map((slug) => {
    const entry = RELATED_SOLUTIONS_LIST.find((s) => s.slug === slug);
    const Icon = entry?.Icon;
    return {
      href: `${base}/solutions/${slug}`,
      label: entry ? (isTr ? entry.tr : entry.en) : slug,
      sub: isTr ? SECTOR_SUBLABELS[slug].tr : SECTOR_SUBLABELS[slug].en,
      icon: Icon ? <Icon size={16} /> : undefined,
    };
  });

  const otherSectors: NavItem[] = RELATED_SOLUTIONS_LIST.filter(
    (s) => !(FEATURED_SECTORS as readonly string[]).includes(s.slug),
  ).map((s) => ({ href: `${base}/solutions/${s.slug}`, label: isTr ? s.tr : s.en }));

  const resources: NavItem[] = [
    {
      href: `${base}/how-it-works`,
      label: isTr ? 'Nasıl çalışır' : 'How it works',
      sub: isTr ? 'QR kodundan yorum sayfasına' : 'From QR scan to review page',
      icon: <Compass size={16} />,
    },
    {
      href: `${base}/blog`,
      label: 'Blog',
      sub: isTr ? 'Yorum yönetimi rehberleri' : 'Guides on review management',
      icon: <BookOpen size={16} />,
    },
    {
      href: `${base}/help`,
      label: isTr ? 'Yardım merkezi' : 'Help center',
      sub: isTr ? 'Adım adım kurulum kılavuzları' : 'Step-by-step setup guides',
      icon: <HelpCircle size={16} />,
    },
    {
      href: `${base}/faq`,
      label: isTr ? 'SSS' : 'FAQ',
      sub: isTr ? 'Sık sorulan sorular' : 'Frequently asked questions',
      icon: <FileQuestion size={16} />,
    },
    {
      href: `${base}/solutions/qr-generator`,
      label: isTr ? 'Ücretsiz QR kod oluşturucu' : 'Free QR code generator',
      sub: isTr ? 'Hesap açmadan statik QR kod' : 'A static QR code, no account',
      icon: <QrCode size={16} />,
    },
    {
      href: `${base}/roi`,
      label: isTr ? 'ROI hesaplayıcı' : 'ROI calculator',
      sub: isTr ? 'Tahmini zaman ve maliyet etkisi' : 'Estimated time and cost impact',
      icon: <Calculator size={16} />,
    },
    {
      href: `${base}/compare`,
      label: isTr ? 'Karşılaştırma' : 'Comparisons',
      sub: isTr ? 'Diğer yöntemlerle yan yana' : 'Side by side with other ways',
      icon: <Layers size={16} />,
    },
    {
      href: `${base}/about`,
      label: isTr ? 'Hakkımızda' : 'About us',
      sub: isTr ? 'Buaze’yi tanıyın' : 'Get to know Buaze',
      icon: <Info size={16} />,
    },
  ];

  const allFeaturesLabel = isTr ? 'Tüm özellikler' : 'All features';
  const allSectorsLabel = isTr ? 'Tüm sektörler' : 'All sectors';
  const signInLabel = isTr ? 'Giriş yapın' : 'Sign in';
  const trialLabel = isTr ? 'Ücretsiz deneyin' : 'Start free trial';

  const topLinkClass =
    'inline-flex items-center rounded-full px-3 py-2 text-[14px] font-medium text-[#1A1A1A] transition-colors hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2';

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-[#0A0A0A] focus:px-4 focus:py-2 focus:text-[13px] focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-[#C6F24E] focus:ring-offset-2"
      >
        {isTr ? 'İçeriğe atla' : 'Skip to content'}
      </a>

      {/* Mobile/tablet: inline bar (fixed while the drawer is open).
          Desktop: full-width bar, then a floating pill after 80px. */}
      <nav
        ref={barRef}
        aria-label={isTr ? 'Ana menü' : 'Main navigation'}
        className={`${mobileOpen ? 'fixed inset-x-0 top-0' : 'relative'} z-40 h-[64px] backdrop-blur-2xl transition-all duration-300 ${
          scrolled
            ? 'border-b border-[#E5E5E5] bg-white/95 shadow-[0_4px_24px_rgba(10,10,10,0.05)]'
            : 'border-b border-[#EDEDED] bg-white/90'
        } ${
          floating
            ? 'lg:fixed lg:top-[18px] lg:left-1/2 lg:-translate-x-1/2 lg:w-[94vw] lg:max-w-[1180px] lg:rounded-full lg:border-0 lg:bg-white/[0.92] lg:[backdrop-filter:blur(16px)_saturate(180%)] lg:[-webkit-backdrop-filter:blur(16px)_saturate(180%)] lg:shadow-[0_12px_40px_-16px_rgba(10,10,10,0.18)] lg:ring-1 lg:ring-black/5'
            : 'lg:fixed lg:inset-x-0 lg:top-0 lg:translate-x-0'
        }`}
      >
        <div className="mx-auto flex h-full w-full max-w-[1200px] items-center justify-between gap-3 px-5 sm:gap-4 sm:px-10 lg:px-8 xl:px-10">
          <Link
            href={base}
            aria-label={isTr ? 'Buaze ana sayfa' : 'Buaze home'}
            className="flex shrink-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2"
          >
            <span aria-hidden="true" className="inline-flex">
              <BuazeLogo size={28} variant="default" imageUrl={logoUrl} />
            </span>
            <span className="text-[18px] font-medium tracking-[-0.03em] text-[#0A0A0A]" style={{ fontFamily: 'var(--font-heading)' }}>
              buaze<span className="text-[#A8D62E]">.</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div ref={desktopRef} className="hidden items-center gap-0.5 lg:flex">
            <DesktopDropdown
              id="product"
              label={isTr ? 'Ürün' : 'Product'}
              isOpen={open === 'product'}
              onHoverEnter={() => hoverOpen('product')}
              onHoverLeave={hoverLeave}
              onToggle={() => toggleDropdown('product')}
              onClose={closeDropdown}
              widthClass="w-[700px]"
            >
              <div className="grid grid-cols-[1fr_1fr_0.95fr] gap-3 p-4">
                <div className="col-span-2">
                  <p className="pulse-eyebrow mb-2 px-3 text-[#737373]">{isTr ? 'Özellikler' : 'Features'}</p>
                  <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                    {features.map((item) => (
                      <li key={item.href}>
                        <NavLink item={item} onClick={closeDropdown} />
                      </li>
                    ))}
                    <li>
                      <Link
                        href={`${base}/features`}
                        prefetch={false}
                        onClick={closeDropdown}
                        className="flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-[13px] font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4 transition-colors hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                      >
                        {allFeaturesLabel} <span aria-hidden>→</span>
                      </Link>
                    </li>
                  </ul>
                </div>
                <div className="flex flex-col rounded-2xl bg-[#0A0A0A] p-5 text-white">
                  <p className="pulse-eyebrow text-[#C6F24E]">{isTr ? 'Akış' : 'The flow'}</p>
                  <p className="mt-2 text-[16px] font-semibold leading-snug" style={{ fontFamily: 'var(--font-heading)' }}>
                    {isTr ? 'QR kodu, puan, yorum sayfası' : 'QR code, rating, review page'}
                  </p>
                  <p className="mt-2 text-[13px] leading-[1.55] text-white/75">
                    {isTr
                      ? 'Her müşteri herkese açık yorum bağlantısını görür; eşiğin altındaki puanlarda önce size yazabilir.'
                      : 'Every customer sees the public review link; below your threshold they can write to you first.'}
                  </p>
                  <div className="mt-auto pt-4">
                    <Link
                      href={`${base}/how-it-works`}
                      prefetch={false}
                      onClick={closeDropdown}
                      className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-full bg-[#C6F24E] px-4 text-[13px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#A8D62E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
                    >
                      {isTr ? 'Nasıl çalışır' : 'How it works'} <span aria-hidden>→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </DesktopDropdown>

            <DesktopDropdown
              id="solutions"
              label={isTr ? 'Çözümler' : 'Solutions'}
              isOpen={open === 'solutions'}
              onHoverEnter={() => hoverOpen('solutions')}
              onHoverLeave={hoverLeave}
              onToggle={() => toggleDropdown('solutions')}
              onClose={closeDropdown}
              widthClass="w-[660px]"
            >
              <div className="grid grid-cols-2 gap-4 p-4">
                <div>
                  <p className="pulse-eyebrow mb-2 px-3 text-[#737373]">{isTr ? 'Öne çıkanlar' : 'Popular'}</p>
                  <ul className="space-y-0.5">
                    {featuredSectors.map((item) => (
                      <li key={item.href}>
                        <NavLink item={item} onClick={closeDropdown} />
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col">
                  <p className="pulse-eyebrow mb-2 px-3 text-[#737373]">{isTr ? 'Diğer sektörler' : 'More sectors'}</p>
                  <ul className="grid grid-cols-2 gap-0.5">
                    {otherSectors.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          prefetch={false}
                          onClick={closeDropdown}
                          className="flex min-h-[36px] items-center rounded-lg px-3 text-[13px] font-medium text-[#404040] transition-colors hover:bg-[#FAFAFA] hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`${base}/solutions`}
                    prefetch={false}
                    onClick={closeDropdown}
                    className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 self-start rounded-full bg-[#0A0A0A] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2"
                  >
                    {allSectorsLabel} <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
              <div className="border-t border-[#EDEDED] bg-[#FAFAFA] px-5 py-3 text-[13px] text-[#525252]">
                {isTr ? 'Sektörünüzü bulamadınız mı?' : "Can't find your sector?"}{' '}
                <Link
                  href={`${base}/contact`}
                  prefetch={false}
                  onClick={closeDropdown}
                  className="font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-2 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                >
                  {isTr ? 'Bize yazın' : 'Write to us'}
                </Link>
              </div>
            </DesktopDropdown>

            <DesktopDropdown
              id="resources"
              label={isTr ? 'Kaynaklar' : 'Resources'}
              isOpen={open === 'resources'}
              onHoverEnter={() => hoverOpen('resources')}
              onHoverLeave={hoverLeave}
              onToggle={() => toggleDropdown('resources')}
              onClose={closeDropdown}
              widthClass="w-[560px]"
            >
              <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 p-4">
                {resources.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} onClick={closeDropdown} />
                  </li>
                ))}
              </ul>
            </DesktopDropdown>

            <Link
              href={`${base}/pricing`}
              aria-current={isCurrent(`${base}/pricing`) ? 'page' : undefined}
              className={topLinkClass}
            >
              {isTr ? 'Fiyatlandırma' : 'Pricing'}
            </Link>
            <Link
              href={`${base}/contact`}
              aria-current={isCurrent(`${base}/contact`) ? 'page' : undefined}
              className={topLinkClass}
            >
              {isTr ? 'İletişim' : 'Contact'}
            </Link>
          </div>

          {/* Right cluster */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <LanguageLink
              locale={locale}
              icon={<Globe size={13} aria-hidden="true" />}
              className="hidden min-h-[36px] items-center gap-1.5 rounded-full border border-[#E5E5E5] px-3 text-[12px] font-semibold text-[#404040] transition-colors hover:border-[#0A0A0A] hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2 sm:inline-flex"
            />

            {isLoggedIn ? (
              <Link
                href={dashboardHref}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#0A0A0A] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2"
              >
                {dashboardLabel} <span aria-hidden>→</span>
              </Link>
            ) : (
              <>
                <Link
                  href={`${base}/auth/login`}
                  rel={AUTH_REL}
                  prefetch={false}
                  className="hidden min-h-[40px] items-center rounded-full px-2 text-[14px] font-medium text-[#404040] transition-colors hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2 sm:inline-flex"
                >
                  {signInLabel}
                </Link>
                <Link
                  href={`${base}/auth/register`}
                  rel={AUTH_REL}
                  prefetch={false}
                  className="inline-flex min-h-[40px] items-center rounded-full bg-[#0A0A0A] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2"
                >
                  {trialLabel}
                </Link>
              </>
            )}

            <button
              ref={hamburgerRef}
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-controls={mobileOpen ? drawerId : undefined}
              aria-label={mobileOpen ? (isTr ? 'Menüyü kapat' : 'Close menu') : isTr ? 'Menüyü aç' : 'Open menu'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E5E5] bg-white text-[#0A0A0A] transition-colors hover:bg-[#F5F5F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2 lg:hidden"
            >
              {mobileOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile/tablet drawer. Backdrop and panel are separate fixed siblings
          (a relative child of a fixed parent breaks touch scrolling in iOS
          Safari while the body is locked). z-[55] keeps them above the
          contact button (z-50), which would otherwise cover drawer links. */}
      {mobileOpen ? (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label={isTr ? 'Menüyü kapat' : 'Close menu'}
            onClick={closeDrawer}
            className="fixed inset-x-0 bottom-0 top-[64px] z-[55] bg-black/30 backdrop-blur-sm lg:hidden"
          />
          <div
            ref={drawerRef}
            id={drawerId}
            className="no-scrollbar fixed bottom-0 right-0 top-[64px] z-[55] w-full max-w-md overflow-y-auto overscroll-contain rounded-tl-[28px] border-l border-[#EDEDED] bg-white shadow-2xl lg:hidden"
            style={{
              paddingBottom: 'env(safe-area-inset-bottom)',
              paddingLeft: 'env(safe-area-inset-left)',
              paddingRight: 'env(safe-area-inset-right)',
            }}
          >
            <nav
              aria-label={isTr ? 'Mobil menü' : 'Mobile menu'}
              className="flex flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-3"
            >
              <MobileSection
                label={isTr ? 'Ürün' : 'Product'}
                open={mobileSection === 'product'}
                onToggle={() => setMobileSection(mobileSection === 'product' ? null : 'product')}
              >
                {features.map((item) => (
                  <NavLink key={item.href} item={item} onClick={() => setMobileOpen(false)} />
                ))}
                <MobileAllLink href={`${base}/features`} label={allFeaturesLabel} onClick={() => setMobileOpen(false)} />
              </MobileSection>

              <MobileSection
                label={isTr ? 'Çözümler' : 'Solutions'}
                open={mobileSection === 'solutions'}
                onToggle={() => setMobileSection(mobileSection === 'solutions' ? null : 'solutions')}
              >
                {featuredSectors.map((item) => (
                  <NavLink key={item.href} item={item} onClick={() => setMobileOpen(false)} />
                ))}
                <ul className="grid grid-cols-2 gap-1 pt-1">
                  {otherSectors.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        prefetch={false}
                        onClick={() => setMobileOpen(false)}
                        className="flex min-h-[44px] items-center rounded-lg px-3 text-[14px] font-medium text-[#404040] hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0A0A0A]"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <MobileAllLink href={`${base}/solutions`} label={allSectorsLabel} onClick={() => setMobileOpen(false)} />
              </MobileSection>

              <MobileSection
                label={isTr ? 'Kaynaklar' : 'Resources'}
                open={mobileSection === 'resources'}
                onToggle={() => setMobileSection(mobileSection === 'resources' ? null : 'resources')}
              >
                {resources.map((item) => (
                  <NavLink key={item.href} item={item} onClick={() => setMobileOpen(false)} />
                ))}
              </MobileSection>

              <Link
                href={`${base}/pricing`}
                onClick={() => setMobileOpen(false)}
                className="flex min-h-[56px] items-center justify-between border-b border-[#EDEDED] px-1 text-[16px] font-semibold text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {isTr ? 'Fiyatlandırma' : 'Pricing'}
                <span aria-hidden className="text-[#737373]">→</span>
              </Link>
              <Link
                href={`${base}/contact`}
                onClick={() => setMobileOpen(false)}
                className="flex min-h-[56px] items-center justify-between border-b border-[#EDEDED] px-1 text-[16px] font-semibold text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {isTr ? 'İletişim' : 'Contact'}
                <span aria-hidden className="text-[#737373]">→</span>
              </Link>

              <div className="mt-6 space-y-2">
                {isLoggedIn ? (
                  <Link
                    href={dashboardHref}
                    onClick={() => setMobileOpen(false)}
                    className="flex min-h-[48px] items-center justify-center rounded-full bg-[#0A0A0A] px-4 text-[15px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2"
                  >
                    {isAdmin ? (isTr ? 'Admin paneline git' : 'Open admin panel') : isTr ? 'Panele git' : 'Open dashboard'}
                  </Link>
                ) : (
                  <>
                    <Link
                      href={`${base}/auth/register`}
                      rel={AUTH_REL}
                      prefetch={false}
                      onClick={() => setMobileOpen(false)}
                      className="flex min-h-[48px] items-center justify-center rounded-full bg-[#C6F24E] px-4 text-[15px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#A8D62E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2"
                    >
                      {trialLabel}
                    </Link>
                    <Link
                      href={`${base}/auth/login`}
                      rel={AUTH_REL}
                      prefetch={false}
                      onClick={() => setMobileOpen(false)}
                      className="flex min-h-[48px] items-center justify-center rounded-full border border-[#E5E5E5] px-4 text-[15px] font-medium text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2"
                    >
                      {signInLabel}
                    </Link>
                  </>
                )}
                <LanguageLink
                  locale={locale}
                  icon={<Globe size={14} aria-hidden="true" />}
                  onNavigate={() => setMobileOpen(false)}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full px-4 text-[14px] font-medium text-[#404040] hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
                />
              </div>
            </nav>
          </div>
        </>
      ) : null}
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      prefetch={false}
      onClick={onClick}
      className="flex min-h-[44px] items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0A0A0A]"
    >
      {item.icon ? (
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EAF9B8] text-[#0A0A0A]"
        >
          {item.icon}
        </span>
      ) : null}
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold leading-snug text-[#0A0A0A]" style={{ fontFamily: 'var(--font-heading)' }}>
          {item.label}
        </span>
        {item.sub ? <span className="mt-0.5 block text-[12px] leading-snug text-[#525252]">{item.sub}</span> : null}
      </span>
    </Link>
  );
}

function MobileAllLink({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onClick}
      className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#0A0A0A] px-4 text-[14px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2"
    >
      {label} <span aria-hidden>→</span>
    </Link>
  );
}

/**
 * Disclosure-style dropdown (WAI-ARIA "disclosure navigation"): the trigger
 * is a button with aria-expanded/aria-controls; click, Enter or Space pins
 * the panel open, Escape closes it and returns focus to the trigger, and
 * moving focus out closes it. Hover opens it for mouse users. A closed panel
 * is `inert` + `invisible`, so its links are out of the tab order and the
 * accessibility tree — but still in the server HTML for crawlers. Panels open
 * from the trigger's start edge so they stay inside the viewport at 1024px.
 */
function DesktopDropdown({
  id,
  label,
  isOpen,
  onHoverEnter,
  onHoverLeave,
  onToggle,
  onClose,
  widthClass,
  children,
}: {
  id: string;
  label: string;
  isOpen: boolean;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  onToggle: () => void;
  onClose: () => void;
  widthClass: string;
  children: ReactNode;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = `nav-panel-${id}`;
  return (
    <div
      className="relative"
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
      onBlur={(e) => {
        if (isOpen && !e.currentTarget.contains(e.relatedTarget as Node | null)) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && isOpen) {
          e.stopPropagation();
          onClose();
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex items-center gap-1 rounded-full px-3 py-2 text-[14px] font-medium text-[#1A1A1A] transition-colors hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2"
      >
        {label}
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        id={panelId}
        inert={!isOpen}
        className={`absolute -left-3 top-full z-50 mt-2 origin-top-left overflow-hidden rounded-2xl border border-[#EDEDED] bg-white shadow-[0_24px_60px_-20px_rgba(10,10,10,0.18)] transition-[opacity,transform,visibility] duration-200 ${widthClass} ${
          isOpen ? 'visible translate-y-0 scale-100 opacity-100' : 'pointer-events-none invisible -translate-y-1 scale-95 opacity-0'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function MobileSection({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const contentId = useId();
  return (
    <div className="border-b border-[#EDEDED]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={onToggle}
        className="flex min-h-[56px] w-full items-center justify-between px-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0A0A0A]"
      >
        <span className="text-[16px] font-semibold text-[#0A0A0A]" style={{ fontFamily: 'var(--font-heading)' }}>
          {label}
        </span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`text-[#737373] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div id={contentId} inert={!open} className={`accordion-body${open ? ' open' : ''}`}>
        <div className="space-y-1 pb-3">{children}</div>
      </div>
    </div>
  );
}
