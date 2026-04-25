'use client';

import {
  BarChart3,
  BookOpen,
  Briefcase,
  ChevronDown,
  Compass,
  FileQuestion,
  Globe,
  HelpCircle,
  Inbox,
  KeyRound,
  Layers,
  Mail,
  Menu,
  Plug,
  QrCode,
  Scale,
  ShoppingBag,
  Sparkles,
  Star,
  Stethoscope,
  Truck,
  Utensils,
  Wand2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Locale } from '@/lib/translations';
import BuazeLogo from './BuazeLogo';
import WatchDemoButton from './WatchDemoButton';

interface MarketingNavbarProps {
  locale: Locale;
  // The server wrapper passes the entire `t` object; we keep the signature
  // permissive and only use a few keys via locale ternaries (mirrors the
  // pattern in MarketingFooter).
  t: any;
  isLoggedIn?: boolean;
  logoUrl?: string | null;
}

type DropdownId = 'product' | 'solutions' | 'customers' | 'resources' | null;

interface NavItem {
  href: string;
  label: string;
  sub?: string;
  icon?: React.ReactNode;
}

export default function MarketingNavbarClient({
  locale,
  t,
  isLoggedIn,
  logoUrl,
}: MarketingNavbarProps) {
  const isTr = locale === 'tr';
  const base = `/${locale}`;

  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [open, setOpen] = useState<DropdownId>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<DropdownId>(null);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enter = (id: DropdownId) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(id);
  };
  const leave = () => {
    closeTimer.current = setTimeout(() => setOpen(null), 180);
  };

  // Esc closes everything
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(null);
        setMobileOpen(false);
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const otherLocale: Locale = isTr ? 'en' : 'tr';
  const switchLocale = () => {
    const newPath = pathname.replace(`/${locale}`, `/${otherLocale}`);
    document.cookie = `NEXT_LOCALE=${otherLocale};path=/;max-age=${
      60 * 60 * 24 * 365
    };samesite=lax`;
    startTransition(() => router.push(newPath));
    setLangMenuOpen(false);
  };

  // ── IA Data ─────────────────────────────────────────────────
  const productCol1: NavItem[] = [
    {
      href: `${base}/solutions/qr-generator`,
      label: isTr ? 'QR Stüdyosu' : 'QR Studio',
      sub: isTr ? 'Markana özel QR tasarla' : 'Branded QR design',
      icon: <QrCode size={16} />,
    },
    {
      href: `${base}/features/ai-copilot`,
      label: 'AI Co-Pilot',
      sub: isTr ? 'Yanıtı saniyede yaz' : 'Drafts in seconds',
      icon: <Sparkles size={16} />,
    },
    {
      href: `${base}/features`,
      label: isTr ? 'Yorum Yönetimi' : 'Review Management',
      sub: isTr ? 'Tek panelde her platform' : 'All platforms in one inbox',
      icon: <Inbox size={16} />,
    },
    {
      href: `${base}/features`,
      label: isTr ? 'Analitik & Raporlar' : 'Analytics & Reports',
      sub: isTr ? 'NPS, trend, konum kırılımı' : 'NPS, trends, breakdowns',
      icon: <BarChart3 size={16} />,
    },
    {
      href: `${base}/integrations`,
      label: isTr ? 'Entegrasyonlar' : 'Integrations',
      sub: isTr ? 'Google · Yemeksepeti · Getir' : 'Google · Yelp · Tripadvisor',
      icon: <Plug size={16} />,
    },
    {
      href: '/admin/api',
      label: 'API & Webhook',
      sub: isTr ? 'Geliştiriciler için' : 'For developers',
      icon: <KeyRound size={16} />,
    },
  ];

  const productCol2: NavItem[] = [
    {
      href: `${base}/how-it-works`,
      label: isTr ? 'Nasıl Çalışır?' : 'How It Works',
      sub: isTr ? 'Kurulum rehberi' : 'Setup guide',
      icon: <Compass size={16} />,
    },
    {
      href: `${base}/compare`,
      label: isTr ? 'Karşılaştır' : 'Compare',
      sub: isTr ? 'Diğer çözümlerle yan yana' : 'Side-by-side comparisons',
      icon: <Layers size={16} />,
    },
    {
      href: `${base}/roi`,
      label: isTr ? 'ROI Hesaplayıcı' : 'ROI Calculator',
      sub: isTr ? 'Yatırım dönüşünü hesapla' : 'See your projected return',
      icon: <Wand2 size={16} />,
    },
  ];

  const solutionsTop: NavItem[] = [
    {
      href: `${base}/solutions/restaurants`,
      label: isTr ? 'Restoran & Kafe' : 'Restaurant & Café',
      sub: isTr ? 'Masa, fatura, paket QR' : 'Table, receipt, pack QR',
      icon: <Utensils size={16} />,
    },
    {
      href: `${base}/solutions/delivery`,
      label: isTr ? 'Paket Servis' : 'Delivery',
      sub: 'Yemeksepeti · Getir · Trendyol',
      icon: <Truck size={16} />,
    },
    {
      href: `${base}/solutions/hotels`,
      label: isTr ? 'Otel' : 'Hotel',
      sub: isTr ? 'Booking + Tripadvisor' : 'Booking + Tripadvisor',
      icon: <BookOpen size={16} />,
    },
    {
      href: `${base}/solutions/healthcare`,
      label: isTr ? 'Klinik & Sağlık' : 'Clinic & Health',
      sub: isTr ? 'KVKK uyumlu akış' : 'KVKK compliant flow',
      icon: <Stethoscope size={16} />,
    },
    {
      href: `${base}/solutions/law-firms`,
      label: isTr ? 'Hukuk Ofisi' : 'Legal',
      sub: isTr ? 'Danışmanlık sonrası' : 'Post-consultation',
      icon: <Scale size={16} />,
    },
    {
      href: `${base}/solutions/beauty-salon`,
      label: isTr ? 'Güzellik & Spa' : 'Beauty & Spa',
      sub: isTr ? 'Randevu sonrası' : 'Post-appointment',
      icon: <Sparkles size={16} />,
    },
  ];

  const solutionsRest: NavItem[] = [
    { href: `${base}/solutions/retail`, label: isTr ? 'Perakende' : 'Retail' },
    { href: `${base}/solutions/gym`, label: isTr ? 'Spor & Fitness' : 'Sports & Fitness' },
    { href: `${base}/solutions/dentists`, label: isTr ? 'Diş Hekimi' : 'Dentists' },
    { href: `${base}/solutions/aesthetic`, label: isTr ? 'Estetik' : 'Aesthetic' },
    { href: `${base}/solutions/veterinary`, label: isTr ? 'Veteriner' : 'Veterinary' },
    { href: `${base}/solutions/real-estate`, label: isTr ? 'Emlak' : 'Real Estate' },
    { href: `${base}/solutions/auto-service`, label: isTr ? 'Oto Servis' : 'Auto Service' },
    { href: `${base}/solutions/schools`, label: isTr ? 'Eğitim' : 'Education' },
  ];

  const customersItems: NavItem[] = [
    {
      href: `${base}/customer-stories`,
      label: isTr ? 'Müşteri Hikayeleri' : 'Customer Stories',
      sub: isTr ? 'Buaze ile büyüyen markalar' : 'Brands growing with Buaze',
      icon: <Star size={16} />,
    },
    {
      href: `${base}/customer-stories`,
      label: isTr ? 'Vaka Çalışmaları' : 'Case Studies',
      sub: isTr ? '+184% yorum, 3 sektör' : '+184% reviews, 3 sectors',
      icon: <ShoppingBag size={16} />,
    },
    {
      href: `${base}/roi`,
      label: isTr ? 'ROI Hesapla' : 'Calculate ROI',
      sub: isTr ? 'Senin için ne kazandırır?' : 'What it would earn you',
      icon: <Wand2 size={16} />,
    },
  ];

  const resourcesLearn: NavItem[] = [
    {
      href: `${base}/blog`,
      label: 'Blog',
      sub: isTr ? 'İtibar rehberleri' : 'Reputation playbooks',
      icon: <BookOpen size={16} />,
    },
    {
      href: `${base}/about`,
      label: isTr ? 'Hakkımızda' : 'About',
      sub: isTr ? 'Buaze ekibi' : 'The Buaze team',
      icon: <Briefcase size={16} />,
    },
    {
      href: `${base}/careers`,
      label: isTr ? 'Kariyer' : 'Careers',
      sub: isTr ? 'Açık 5 pozisyon' : '5 open roles',
      icon: <Sparkles size={16} />,
    },
  ];

  const resourcesHelp: NavItem[] = [
    {
      href: `${base}/help`,
      label: isTr ? 'Yardım Merkezi' : 'Help Center',
      sub: isTr ? 'Adım adım kılavuzlar' : 'Step-by-step guides',
      icon: <HelpCircle size={16} />,
    },
    {
      href: `${base}/faq`,
      label: 'SSS / FAQ',
      sub: isTr ? 'Sık sorulan sorular' : 'Frequent questions',
      icon: <FileQuestion size={16} />,
    },
    {
      href: `${base}/contact`,
      label: isTr ? 'İletişim' : 'Contact',
      sub: isTr ? 'Satış + destek' : 'Sales + support',
      icon: <Mail size={16} />,
    },
  ];

  // ── Render helpers ─────────────────────────────────────────
  const NavLink = ({ item, onClick }: { item: NavItem; onClick?: () => void }) => (
    <Link
      href={item.href}
      onClick={onClick}
      className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[#FAFAFA]"
    >
      {item.icon && (
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EAF9B8] text-[#0A0A0A]">
          {item.icon}
        </span>
      )}
      <span className="min-w-0">
        <span
          className="block text-[13px] font-semibold text-[#0A0A0A]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {item.label}
        </span>
        {item.sub && <span className="mt-0.5 block text-[11px] text-[#737373]">{item.sub}</span>}
      </span>
    </Link>
  );

  return (
    <>
      <nav
        className={`fixed inset-x-0 top-0 z-40 h-[64px] border-b backdrop-blur-2xl transition-all duration-300 ${
          scrolled
            ? 'border-[#E5E5E5] bg-white/95 shadow-[0_4px_24px_rgba(10,10,10,0.05)]'
            : 'border-[#EDEDED] bg-white/88'
        }`}
      >
        <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between gap-3 px-4 sm:gap-4 sm:px-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href={base} className="flex items-center gap-2 group">
              <BuazeLogo size={28} variant="default" imageUrl={logoUrl} />
              <span
                className="text-[18px] font-medium tracking-[-0.03em] text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                buaze<span className="text-[#C6F24E]">.</span>
              </span>
            </Link>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {/* Product */}
            <DesktopDropdown
              label={isTr ? 'Ürün' : 'Product'}
              isOpen={open === 'product'}
              onEnter={() => enter('product')}
              onLeave={leave}
              widthClass="w-[680px]"
            >
              <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-4 p-4">
                <div>
                  <p className="pulse-eyebrow mb-2 px-3 text-[#737373]">
                    {isTr ? 'ÖZELLİKLER' : 'FEATURES'}
                  </p>
                  <div className="space-y-0.5">
                    {productCol1.map((it) => (
                      <NavLink key={it.label} item={it} onClick={() => setOpen(null)} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="pulse-eyebrow mb-2 px-3 text-[#737373]">
                    {isTr ? 'ARAÇLAR' : 'TOOLS'}
                  </p>
                  <div className="space-y-0.5">
                    {productCol2.map((it) => (
                      <NavLink key={it.label} item={it} onClick={() => setOpen(null)} />
                    ))}
                  </div>
                </div>
                {/* Featured rail */}
                <div className="rounded-2xl bg-[#0A0A0A] p-4 text-white flex flex-col">
                  <span className="pulse-eyebrow text-[#C6F24E]">{isTr ? 'ÖNE ÇIKAN' : 'FEATURED'}</span>
                  <p
                    className="mt-2 text-[16px] font-semibold leading-snug"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {isTr ? 'AI Co-Pilot' : 'AI Co-Pilot'}
                  </p>
                  <p className="mt-1 text-[12px] text-white/70">
                    {isTr
                      ? 'Her yorum için OpenAI destekli yanıt taslağı.'
                      : 'OpenAI-backed reply drafts for every review.'}
                  </p>
                  <Link
                    href={`${base}/features/ai-copilot`}
                    onClick={() => setOpen(null)}
                    className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#C6F24E] px-3 py-1.5 text-[12px] font-semibold text-[#0A0A0A] hover:bg-[#A8D62E]"
                  >
                    {isTr ? 'Keşfet →' : 'Explore →'}
                  </Link>
                  <div className="mt-3" onClick={() => setOpen(null)}>
                    <WatchDemoButton
                      locale={locale}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-white/20 bg-transparent px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-white/5"
                    />
                  </div>
                </div>
              </div>
            </DesktopDropdown>

            {/* Solutions */}
            <DesktopDropdown
              label={isTr ? 'Çözümler' : 'Solutions'}
              isOpen={open === 'solutions'}
              onEnter={() => enter('solutions')}
              onLeave={leave}
              widthClass="w-[640px]"
            >
              <div className="grid grid-cols-2 gap-4 p-4">
                <div>
                  <p className="pulse-eyebrow mb-2 px-3 text-[#737373]">
                    {isTr ? 'EN ÇOK KULLANILAN' : 'MOST POPULAR'}
                  </p>
                  <div className="space-y-0.5">
                    {solutionsTop.map((it) => (
                      <NavLink key={it.label} item={it} onClick={() => setOpen(null)} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="pulse-eyebrow mb-2 px-3 text-[#737373]">
                    {isTr ? 'TÜM SEKTÖRLER' : 'ALL SECTORS'}
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {solutionsRest.map((it) => (
                      <Link
                        key={it.label}
                        href={it.href}
                        onClick={() => setOpen(null)}
                        className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]"
                      >
                        {it.label}
                      </Link>
                    ))}
                  </div>
                  <Link
                    href={`${base}/solutions`}
                    onClick={() => setOpen(null)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#1A1A1A]"
                  >
                    {isTr ? 'Tüm 14 sektörü gör' : 'See all 14 sectors'} →
                  </Link>
                </div>
              </div>
              <div className="border-t border-[#EDEDED] bg-[#FAFAFA] px-4 py-3 text-[12px] text-[#525252]">
                {isTr ? 'Sektörünü göremiyor musun?' : "Don't see your sector?"}{' '}
                <Link
                  href={`${base}/contact`}
                  onClick={() => setOpen(null)}
                  className="font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-2"
                >
                  {isTr ? 'Bize yaz →' : 'Talk to us →'}
                </Link>
              </div>
            </DesktopDropdown>

            <Link
              href={`${base}/pricing`}
              className="rounded-full px-3 py-1.5 text-[13px] font-medium text-[#1A1A1A] transition-colors hover:text-[#0A0A0A]"
            >
              {isTr ? 'Fiyatlar' : 'Pricing'}
            </Link>

            {/* Customers */}
            <DesktopDropdown
              label={isTr ? 'Müşteriler' : 'Customers'}
              isOpen={open === 'customers'}
              onEnter={() => enter('customers')}
              onLeave={leave}
              widthClass="w-[300px]"
            >
              <div className="p-3 space-y-0.5">
                {customersItems.map((it) => (
                  <NavLink key={it.label} item={it} onClick={() => setOpen(null)} />
                ))}
              </div>
            </DesktopDropdown>

            <Link
              href={`${base}/blog`}
              className="rounded-full px-3 py-1.5 text-[13px] font-medium text-[#1A1A1A] transition-colors hover:text-[#0A0A0A]"
            >
              Blog
            </Link>
            <Link
              href={`${base}/contact`}
              className="rounded-full px-3 py-1.5 text-[13px] font-medium text-[#1A1A1A] transition-colors hover:text-[#0A0A0A]"
            >
              {isTr ? 'İletişim' : 'Contact'}
            </Link>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Locale toggle */}
            <button
              onClick={switchLocale}
              aria-label="Toggle language"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#EDEDED] px-2.5 py-1 text-[11px] font-semibold text-[#525252] hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
            >
              <Globe size={12} />
              <span>{otherLocale.toUpperCase()}</span>
            </button>

            {isLoggedIn ? (
              <Link
                href={`${base}/dashboard`}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1A1A1A]"
              >
                {isTr ? 'Panel' : 'Dashboard'} →
              </Link>
            ) : (
              <>
                <Link
                  href={`${base}/auth/login`}
                  className="hidden sm:inline-flex text-[13px] font-medium text-[#525252] hover:text-[#0A0A0A]"
                >
                  {isTr ? 'Giriş yap' : 'Sign in'}
                </Link>
                <Link
                  href={`${base}/auth/register`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#1A1A1A]"
                >
                  {isTr ? 'Ücretsiz başla' : 'Start free'} →
                </Link>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#EDEDED] bg-white text-[#0A0A0A] shadow-[0_8px_24px_-20px_rgba(10,10,10,0.28)] hover:bg-[#F5F5F5]"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 top-[64px] z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          />
          <div
            className="relative ml-auto h-[calc(100dvh-64px)] w-full max-w-md overflow-y-auto rounded-tl-[28px] border-l border-[#EDEDED] bg-white shadow-2xl"
            style={{
              paddingBottom: 'env(safe-area-inset-bottom)',
              paddingLeft: 'env(safe-area-inset-left)',
              paddingRight: 'env(safe-area-inset-right)',
            }}
          >
            <nav className="flex flex-col p-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
              <MobileSection
                id="product"
                label={isTr ? 'Ürün' : 'Product'}
                tagline={isTr ? 'Özellikler + araçlar' : 'Features + tools'}
                open={mobileSection === 'product'}
                onToggle={() =>
                  setMobileSection(mobileSection === 'product' ? null : 'product')
                }
              >
                {[...productCol1, ...productCol2].map((it) => (
                  <NavLink key={it.label} item={it} onClick={() => setMobileOpen(false)} />
                ))}
              </MobileSection>

              <MobileSection
                id="solutions"
                label={isTr ? 'Çözümler' : 'Solutions'}
                tagline={isTr ? '14 sektör' : '14 sectors'}
                open={mobileSection === 'solutions'}
                onToggle={() =>
                  setMobileSection(mobileSection === 'solutions' ? null : 'solutions')
                }
              >
                {solutionsTop.map((it) => (
                  <NavLink key={it.label} item={it} onClick={() => setMobileOpen(false)} />
                ))}
                <div className="grid grid-cols-2 gap-1 pt-2">
                  {solutionsRest.map((it) => (
                    <Link
                      key={it.label}
                      href={it.href}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-lg px-3 py-2 text-[13px] font-medium text-[#525252] hover:bg-[#FAFAFA]"
                    >
                      {it.label}
                    </Link>
                  ))}
                </div>
                <Link
                  href={`${base}/solutions`}
                  onClick={() => setMobileOpen(false)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-3 py-2 text-[12px] font-semibold text-white"
                >
                  {isTr ? 'Tüm sektörler' : 'All sectors'} →
                </Link>
              </MobileSection>

              <MobileSection
                id="customers"
                label={isTr ? 'Müşteriler' : 'Customers'}
                tagline={isTr ? 'Kanıt + ROI' : 'Proof + ROI'}
                open={mobileSection === 'customers'}
                onToggle={() =>
                  setMobileSection(mobileSection === 'customers' ? null : 'customers')
                }
              >
                {customersItems.map((it) => (
                  <NavLink key={it.label} item={it} onClick={() => setMobileOpen(false)} />
                ))}
              </MobileSection>

              <MobileSection
                id="resources"
                label={isTr ? 'Kaynaklar' : 'Resources'}
                tagline={isTr ? 'Blog · Yardım · İletişim' : 'Blog · Help · Contact'}
                open={mobileSection === 'resources'}
                onToggle={() =>
                  setMobileSection(mobileSection === 'resources' ? null : 'resources')
                }
              >
                {[...resourcesLearn, ...resourcesHelp].map((it) => (
                  <NavLink key={it.label} item={it} onClick={() => setMobileOpen(false)} />
                ))}
              </MobileSection>

              <Link
                href={`${base}/pricing`}
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between border-b border-[#EDEDED] px-1 py-4 text-[15px] font-semibold text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {isTr ? 'Fiyatlandırma' : 'Pricing'}
                <span className="text-[#737373]">→</span>
              </Link>

              <Link
                href={`${base}/contact`}
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between border-b border-[#EDEDED] px-1 py-4 text-[15px] font-semibold text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {isTr ? 'İletişim' : 'Contact'}
                <span className="text-[#737373]">→</span>
              </Link>

              {/* Mobile bottom CTAs */}
              <div className="mt-6 space-y-2">
                {isLoggedIn ? (
                  <Link
                    href={`${base}/dashboard`}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-full bg-[#0A0A0A] px-4 py-3 text-center text-[14px] font-semibold text-white"
                  >
                    {isTr ? 'Panele git' : 'Open dashboard'} →
                  </Link>
                ) : (
                  <>
                    <Link
                      href={`${base}/auth/register`}
                      onClick={() => setMobileOpen(false)}
                      className="block min-h-[48px] rounded-full bg-[#C6F24E] px-4 py-3 text-center text-[14px] font-semibold text-[#0A0A0A] shadow-[0_14px_30px_-20px_rgba(198,242,78,0.7)]"
                    >
                      {isTr ? 'Ücretsiz başla' : 'Start free'} →
                    </Link>
                    <Link
                      href={`${base}/auth/login`}
                      onClick={() => setMobileOpen(false)}
                      className="block min-h-[48px] rounded-full border border-[#EDEDED] px-4 py-3 text-center text-[14px] font-medium text-[#0A0A0A]"
                    >
                      {isTr ? 'Giriş yap' : 'Sign in'}
                    </Link>
                  </>
                )}
                <button
                  onClick={() => {
                    switchLocale();
                    setMobileOpen(false);
                  }}
                  className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full border border-[#EDEDED] px-4 py-2.5 text-[12px] font-medium text-[#525252]"
                >
                  <Globe size={12} />
                  {isTr ? 'Switch to English' : 'Türkçe\'ye geç'}
                </button>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <span className="pulse-eyebrow rounded-full border border-[#EDEDED] bg-[#FAFAFA] px-3 py-2 text-[#525252]">
                    {isTr ? '5 DAKİKADA KURULUM' : '5-MIN SETUP'}
                  </span>
                  <span className="pulse-eyebrow rounded-full border border-[#C6F24E]/50 bg-[#F6FCD9] px-3 py-2 text-[#0A0A0A]">
                    KVKK · GDPR
                  </span>
                </div>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function DesktopDropdown({
  label,
  isOpen,
  onEnter,
  onLeave,
  widthClass,
  children,
}: {
  label: string;
  isOpen: boolean;
  onEnter: () => void;
  onLeave: () => void;
  widthClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium text-[#1A1A1A] transition-colors hover:text-[#0A0A0A]"
      >
        {label}
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 origin-top overflow-hidden rounded-2xl border border-[#EDEDED] bg-white shadow-[0_24px_60px_-20px_rgba(10,10,10,0.18)] transition-all duration-200 ${widthClass} ${
          isOpen
            ? 'pointer-events-auto opacity-100 scale-100 translate-y-0'
            : 'pointer-events-none opacity-0 scale-95 -translate-y-1'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function MobileSection({
  id,
  label,
  tagline,
  open,
  onToggle,
  children,
}: {
  id: string;
  label: string;
  tagline: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[#EDEDED]">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between px-1 py-4 text-left"
      >
        <span>
          <span
            className="block text-[15px] font-semibold text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {label}
          </span>
          <span className="pulse-eyebrow text-[#A8D62E]">{tagline}</span>
        </span>
        <ChevronDown
          size={16}
          className={`text-[#737373] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="space-y-1 pb-3">{children}</div>}
    </div>
  );
}
