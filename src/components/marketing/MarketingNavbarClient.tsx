'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/translations';
import { RELATED_SOLUTIONS_LIST } from '@/lib/related-solutions';
import BuazeLogo from './BuazeLogo';
import LanguageLink from './footer/LanguageLink';
import { RtIcon } from './ritim/icons';
import { useMarketingAuth } from '@/hooks/useMarketingAuth';

/**
 * Marketing header — "Ritim" design (CLAUDE.md §62, docs/design/MARKETING_DESIGN.md):
 * 40 px promo strip → 72 px sticky white header → full-width mega menus
 * (featured photo cards on the left, three link columns on the right) →
 * left drawer below 1024 px. Closed panels stay in the HTML (crawlable) but
 * are `inert`, so links get `prefetch={false}` (§51).
 */

interface MarketingNavbarClientProps {
  locale: Locale;
  logoUrl?: string | null;
}

type MegaId = 'product' | 'solutions' | 'resources';

interface MegaCard {
  href: string;
  img: string;
  title: string;
  text: string;
  badge?: { label: string; tone?: 'sky' };
}
interface MegaGroup {
  title: string;
  links: { href: string; label: string }[];
}
interface Mega {
  id: MegaId;
  label: string;
  cards: MegaCard[];
  cols: MegaGroup[][];
}

const AUTH_REL = 'nofollow';
const PROMO_KEY = 'buaze:promo-closed';

export default function MarketingNavbarClient({ locale, logoUrl }: MarketingNavbarClientProps) {
  const isTr = locale === 'tr';
  const base = `/${locale}`;
  const pathname = usePathname() || base;

  const { isLoggedIn, source } = useMarketingAuth();
  const isAdmin = source === 'admin';
  const dashboardHref = isAdmin ? '/admin/dashboard' : `${base}/dashboard`;
  const dashboardLabel = isAdmin ? (isTr ? 'Admin paneli' : 'Admin panel') : isTr ? 'Panel' : 'Dashboard';

  const [open, setOpen] = useState<MegaId | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [promoHidden, setPromoHidden] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const [drawerTop, setDrawerTop] = useState<number | null>(null);

  const closeMega = useCallback(() => setOpen(null), []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(PROMO_KEY) === '1') setPromoHidden(true);
    } catch {
      /* storage blocked */
    }
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(null);
      if (drawerOpen) {
        setDrawerOpen(false);
        burgerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  useEffect(() => {
    setOpen(null);
    setDrawerOpen(false);
  }, [pathname]);

  // Drawer: lock page scroll, start right under the header, close at desktop width.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('buaze:mobile-drawer', { detail: { open: drawerOpen } }));
    if (!drawerOpen) return;
    document.body.style.overflow = 'hidden';
    const desktop = window.matchMedia('(min-width: 1024px)');
    const onViewport = () => {
      if (desktop.matches) setDrawerOpen(false);
    };
    desktop.addEventListener?.('change', onViewport);
    return () => {
      document.body.style.overflow = '';
      desktop.removeEventListener?.('change', onViewport);
    };
  }, [drawerOpen]);

  const toggleDrawer = () => {
    const next = !drawerOpen;
    if (next && headerRef.current) setDrawerTop(Math.max(0, headerRef.current.getBoundingClientRect().bottom));
    setDrawerOpen(next);
  };

  const hidePromo = () => {
    setPromoHidden(true);
    try {
      sessionStorage.setItem(PROMO_KEY, '1');
    } catch {
      /* storage blocked */
    }
  };

  const isCurrent = (href: string) => {
    const current = pathname.replace(/\/+$/, '');
    return current === href || current.startsWith(`${href}/`);
  };

  const sectors = RELATED_SOLUTIONS_LIST.map((s) => ({ href: `${base}/solutions/${s.slug}`, label: isTr ? s.tr : s.en }));

  const megas: Mega[] = [
    {
      id: 'product',
      label: isTr ? 'Ürün' : 'Product',
      cards: [
        {
          href: `${base}/features/review-management`,
          img: '/images/site/restoran-aydinlik.jpg',
          title: isTr ? 'Yorum yönetimi' : 'Review management',
          text: isTr ? 'QR geri bildirimleri tek gelen kutusunda.' : 'QR feedback in one inbox.',
        },
        {
          href: `${base}/features/pulse-ai`,
          img: '/images/site/ai-panel.jpg',
          title: 'Pulse AI',
          text: isTr ? 'Siz onaylayınca gönderilen yanıt taslakları.' : 'Reply drafts sent only after you approve.',
          badge: { label: isTr ? 'ÖNE ÇIKAN' : 'FEATURED', tone: 'sky' },
        },
        {
          href: `${base}/features/loyalty`,
          img: '/images/site/kahve.jpg',
          title: isTr ? 'Sadakat kartı' : 'Loyalty card',
          text: isTr ? 'Damga ya da puan kartı, şubelerde tek kart.' : 'Stamp or points card, one card for all branches.',
          badge: { label: isTr ? 'YENİ' : 'NEW' },
        },
      ],
      cols: [
        [
          {
            title: isTr ? 'Yorumlar' : 'Reviews',
            links: [
              { href: `${base}/features/review-management`, label: isTr ? 'Yorum yönetimi' : 'Review management' },
              { href: `${base}/features/pulse-ai`, label: 'Pulse AI' },
              { href: `${base}/integrations`, label: isTr ? 'Platform bağlantıları' : 'Platform links' },
              { href: `${base}/features/analytics-reports`, label: isTr ? 'Analitik ve raporlar' : 'Analytics and reports' },
            ],
          },
        ],
        [
          {
            title: isTr ? 'İşletme araçları' : 'Business tools',
            links: [
              { href: `${base}/features/menu`, label: isTr ? 'QR Menü' : 'QR Menu' },
              { href: `${base}/features/surveys`, label: isTr ? 'Anketler' : 'Surveys' },
              { href: `${base}/features/loyalty`, label: isTr ? 'Sadakat kartı' : 'Loyalty card' },
              { href: `${base}/features/audit-center`, label: isTr ? 'Denetim Merkezi' : 'Audit Center' },
            ],
          },
        ],
        [
          {
            title: isTr ? 'Başlangıç' : 'Get started',
            links: [
              { href: `${base}/how-it-works`, label: isTr ? 'Nasıl çalışır' : 'How it works' },
              { href: `${base}/features`, label: isTr ? 'Tüm özellikler' : 'All features' },
              { href: `${base}/pricing`, label: isTr ? 'Fiyatlandırma' : 'Pricing' },
              { href: `${base}/solutions/qr-generator`, label: isTr ? 'Ücretsiz QR kod oluşturucu' : 'Free QR code generator' },
            ],
          },
        ],
      ],
    },
    {
      id: 'solutions',
      label: isTr ? 'Çözümler' : 'Solutions',
      cards: [
        {
          href: `${base}/solutions/restaurants`,
          img: '/images/site/restoran-masalar.jpg',
          title: isTr ? 'Restoranlar ve kafeler' : 'Restaurants and cafés',
          text: isTr ? 'Masa ve menü QR kodları.' : 'Table and menu QR codes.',
        },
        {
          href: `${base}/solutions/delivery`,
          img: '/images/site/online-siparis.jpg',
          title: isTr ? 'Paket servis' : 'Delivery',
          text: 'Yemeksepeti, Getir, Trendyol GO.',
        },
        {
          href: `${base}/solutions/retail`,
          img: '/images/site/market.jpg',
          title: isTr ? 'Mağazalar' : 'Retail',
          text: isTr ? 'Kasada ve vitrinde QR kodu.' : 'QR codes at the till and in the window.',
        },
      ],
      cols: [
        [{ title: isTr ? 'Sektöre göre' : 'By industry', links: sectors }],
        [
          {
            title: isTr ? 'Platformlar' : 'Platforms',
            links: [
              { href: `${base}/integrations`, label: 'Google' },
              { href: `${base}/integrations`, label: 'Yemeksepeti, Getir, Trendyol GO' },
              { href: `${base}/integrations`, label: 'Booking.com, Tripadvisor, Airbnb' },
              { href: `${base}/integrations`, label: isTr ? 'Tüm platformlar' : 'All platforms' },
            ],
          },
        ],
        [
          {
            title: isTr ? 'Araçlar' : 'Tools',
            links: [
              { href: `${base}/solutions`, label: isTr ? 'Tüm sektörler' : 'All industries' },
              { href: `${base}/solutions/qr-generator`, label: isTr ? 'Ücretsiz QR kod oluşturucu' : 'Free QR code generator' },
              { href: `${base}/roi`, label: isTr ? 'ROI hesaplayıcı' : 'ROI calculator' },
              { href: `${base}/compare`, label: isTr ? 'Karşılaştırma' : 'Comparisons' },
            ],
          },
        ],
      ],
    },
    {
      id: 'resources',
      label: isTr ? 'Kaynaklar' : 'Resources',
      cards: [
        {
          href: `${base}/blog`,
          img: '/images/site/kahve-tost.jpg',
          title: 'Blog',
          text: isTr ? 'Yorum yönetimi rehberleri.' : 'Guides on review management.',
        },
        {
          href: `${base}/help`,
          img: '/images/site/destek-ekip.jpg',
          title: isTr ? 'Yardım merkezi' : 'Help center',
          text: isTr ? 'Adım adım kurulum kılavuzları.' : 'Step-by-step setup guides.',
        },
      ],
      cols: [
        [
          {
            title: isTr ? 'Öğren' : 'Learn',
            links: [
              { href: `${base}/blog`, label: 'Blog' },
              { href: `${base}/how-it-works`, label: isTr ? 'Nasıl çalışır' : 'How it works' },
              { href: `${base}/faq`, label: isTr ? 'Sık sorulan sorular' : 'FAQ' },
              { href: `${base}/google-compliance`, label: isTr ? 'Google yorum kuralları' : 'Google review rules' },
            ],
          },
        ],
        [
          {
            title: isTr ? 'Destek' : 'Support',
            links: [
              { href: `${base}/help`, label: isTr ? 'Yardım merkezi' : 'Help center' },
              { href: `${base}/contact`, label: isTr ? 'İletişim' : 'Contact' },
              { href: `${base}/compare`, label: isTr ? 'Karşılaştırma' : 'Comparisons' },
            ],
          },
        ],
        [
          {
            title: isTr ? 'Şirket' : 'Company',
            links: [
              { href: `${base}/about`, label: isTr ? 'Hakkımızda' : 'About us' },
              { href: `${base}/press`, label: isTr ? 'Basın' : 'Press' },
              { href: `${base}/pricing`, label: isTr ? 'Fiyatlandırma' : 'Pricing' },
            ],
          },
        ],
      ],
    },
  ];

  const pricingHref = `${base}/pricing`;
  const contactHref = `${base}/contact`;
  const signInLabel = isTr ? 'Giriş Yap' : 'Sign in';
  const trialLabel = isTr ? 'Ücretsiz Dene' : 'Start free trial';

  const ctas = isLoggedIn ? (
    <Link href={dashboardHref} className="rt-btn rt-btn--solid rt-btn--sm">
      {dashboardLabel}
    </Link>
  ) : (
    <>
      <Link href={`${base}/auth/login`} rel={AUTH_REL} className="rt-btn rt-btn--outline rt-btn--sm">
        {signInLabel}
      </Link>
      <Link href={`${base}/auth/register`} rel={AUTH_REL} className="rt-btn rt-btn--solid rt-btn--sm">
        {trialLabel}
      </Link>
    </>
  );

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-[var(--rt-ink-900)] focus:px-4 focus:py-2 focus:text-white">
        {isTr ? 'İçeriğe geç' : 'Skip to content'}
      </a>

      {!promoHidden && (
        <div className="rt-promo" role="region" aria-label={isTr ? 'Duyuru' : 'Announcement'}>
          <div className="rt-container">
            <p>
              <strong>{isTr ? '14 gün ücretsiz deneyin.' : 'Try it free for 14 days.'}</strong>{' '}
              {isTr ? 'QR kodunuzu bugün basın · ' : 'Print your QR code today · '}
              <Link href={pricingHref} prefetch={false}>
                {isTr ? 'Fiyatlandırma' : 'Pricing'}
              </Link>
            </p>
            <button type="button" className="rt-promo__close" onClick={hidePromo} aria-label={isTr ? 'Duyuruyu kapat' : 'Close announcement'}>
              ×
            </button>
          </div>
        </div>
      )}

      <header ref={headerRef} className={`rt-site-header rt-header${scrolled ? ' rt-is-scrolled' : ''}`}>
        <nav className="rt-container rt-nav" aria-label={isTr ? 'Ana menü' : 'Main menu'}>
          <Link href={base} className="rt-nav__logo" aria-label={isTr ? 'Buaze ana sayfa' : 'Buaze home'}>
            <BuazeLogo size={28} imageUrl={logoUrl} />
            <span aria-hidden="true">Buaze</span>
          </Link>

          <ul className="rt-nav__menu">
            {megas.map((m) => (
              <li key={m.id} className="rt-nav__item">
                <button
                  type="button"
                  className="rt-nav__link"
                  aria-expanded={open === m.id}
                  aria-controls={`mega-${m.id}`}
                  onClick={() => setOpen((cur) => (cur === m.id ? null : m.id))}
                >
                  {m.label}
                  <i className="rt-nav__chev" aria-hidden="true" />
                </button>
              </li>
            ))}
            <li className="rt-nav__item">
              <Link href={pricingHref} className={`rt-nav__link${isCurrent(pricingHref) ? ' rt-is-current' : ''}`} aria-current={isCurrent(pricingHref) ? 'page' : undefined}>
                {isTr ? 'Fiyatlandırma' : 'Pricing'}
              </Link>
            </li>
            <li className="rt-nav__item">
              <Link href={contactHref} className={`rt-nav__link${isCurrent(contactHref) ? ' rt-is-current' : ''}`} aria-current={isCurrent(contactHref) ? 'page' : undefined}>
                {isTr ? 'İletişim' : 'Contact'}
              </Link>
            </li>
          </ul>

          <div className="rt-nav__actions">
            <LanguageLink locale={locale} icon={RtIcon.globe} className="rt-nav__meta" />
            {ctas}
          </div>

          <button
            ref={burgerRef}
            type="button"
            className="rt-nav__burger"
            aria-label={drawerOpen ? (isTr ? 'Menüyü kapat' : 'Close menu') : isTr ? 'Menüyü aç' : 'Open menu'}
            aria-expanded={drawerOpen}
            aria-controls="rt-drawer"
            onClick={toggleDrawer}
          >
            <span />
          </button>
        </nav>

        {megas.map((m) => (
          <div key={m.id} id={`mega-${m.id}`} className={`rt-mega${open === m.id ? ' rt-is-open' : ''}`} inert={open !== m.id}>
            <div className="rt-container rt-mega__inner">
              <div className="rt-mega__features">
                {m.cards.map((c) => (
                  <Link key={c.title} href={c.href} prefetch={false} className="rt-mega-card" onClick={closeMega}>
                    <Image src={c.img} alt="" width={100} height={100} sizes="100px" />
                    <div>
                      {c.badge && <span className={`rt-badge${c.badge.tone === 'sky' ? ' rt-badge--sky' : ''}`}>{c.badge.label}</span>}
                      <p className="rt-mega-card__title">{c.title}</p>
                      <p className="rt-mega-card__text">{c.text}</p>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="rt-mega__cols">
                {m.cols.map((col, i) => (
                  <div key={i}>
                    {col.map((g) => (
                      <div key={g.title} className="rt-mega__group">
                        <p className="rt-mega__group-title">{g.title}</p>
                        {g.links.map((l) => (
                          <Link key={l.label} href={l.href} prefetch={false} onClick={closeMega}>
                            {l.label}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </header>

      <div className={`rt-mega-scrim${open ? ' rt-is-open' : ''}`} aria-hidden="true" onClick={closeMega} />

      <div
        id="rt-drawer"
        className={`rt-drawer${drawerOpen ? ' rt-is-open' : ''}`}
        style={drawerTop !== null ? { top: drawerTop } : undefined}
        inert={!drawerOpen}
        aria-label={isTr ? 'Mobil menü' : 'Mobile menu'}
      >
        {megas.map((m) => (
          <details key={m.id}>
            <summary>{m.label}</summary>
            {m.cols.flat().flatMap((g) => g.links).slice(0, 10).map((l) => (
              <Link key={`${m.id}-${l.label}`} href={l.href} prefetch={false} className="rt-drawer__sub">
                {l.label}
              </Link>
            ))}
          </details>
        ))}
        <Link href={pricingHref} prefetch={false} className="rt-drawer__link">
          {isTr ? 'Fiyatlandırma' : 'Pricing'}
        </Link>
        <Link href={contactHref} prefetch={false} className="rt-drawer__link">
          {isTr ? 'İletişim' : 'Contact'}
        </Link>
        <LanguageLink locale={locale} icon={RtIcon.globe} className="rt-drawer__link" />
        <div className="rt-drawer__cta">
          {isLoggedIn ? (
            <Link href={dashboardHref} className="rt-btn rt-btn--solid rt-btn--block">
              {dashboardLabel}
            </Link>
          ) : (
            <>
              <Link href={`${base}/auth/register`} rel={AUTH_REL} prefetch={false} className="rt-btn rt-btn--solid rt-btn--block">
                {trialLabel}
              </Link>
              <Link href={`${base}/auth/login`} rel={AUTH_REL} prefetch={false} className="rt-btn rt-btn--outline rt-btn--block">
                {signInLabel}
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
